import type { WorkBook } from 'styled-exceljs';
import { read, utils } from 'styled-exceljs';
import SheetJsModel from './SheetJsModel.js';
import { parseSpreadsheetCharts } from './chartParser.js';
import {
  prepareSpreadsheetReadInput,
  type SpreadsheetTextSource,
} from './textEncoding.js';
import type { SheetCellImage, SheetChartDefinition, SheetDefinition } from '../type.js';
import { parseSpreadsheetCellImages } from './richDataParser.js';

interface DrawingMarkerLike {
  row?: number;
  col?: number;
}

interface DrawingImageLike {
  anchor?: {
    from?: DrawingMarkerLike;
    to?: DrawingMarkerLike;
  };
}

interface WorksheetWithDrawings {
  '!drawings'?: {
    images?: DrawingImageLike[];
  };
}

export interface SpreadsheetParserContext {
  workbook: WorkBook | null;
  sheets: SheetDefinition[];
  charts: Record<string, SheetChartDefinition[]>;
  cellImages: Record<string, SheetCellImage[]>;
}

export interface SpreadsheetWorkerRequest {
  type: string;
  payload?: Record<string, any>;
}

export interface SpreadsheetWorkerResponse {
  type: string;
  payload?: Record<string, any>;
}

const readOptions = {
  type: 'array' as const,
  dense: true,
  cellDates: true,
  cellStyles: true,
  browserPixels: true,
  drawings: true,
  validateMerges: true,
};

export const createSpreadsheetParserContext = (): SpreadsheetParserContext => ({
  workbook: null,
  sheets: [],
  charts: {},
  cellImages: {},
});

const toErrorResponse = (
  error: unknown,
  payload: Record<string, any> = {}
): SpreadsheetWorkerResponse => ({
  type: 'parseError',
  payload: {
    ...payload,
    message: error instanceof Error ? error.message : String(error),
  },
});

const getDrawingBounds = (worksheet: WorksheetWithDrawings | undefined) => {
  const images = worksheet?.['!drawings']?.images || [];
  return images.reduce((bounds, image) => {
    const anchor = image.anchor;
    const row = Number(anchor?.to?.row ?? anchor?.from?.row);
    const col = Number(anchor?.to?.col ?? anchor?.from?.col);
    return {
      rowCount: Number.isFinite(row) ? Math.max(bounds.rowCount, row + 1) : bounds.rowCount,
      colCount: Number.isFinite(col) ? Math.max(bounds.colCount, col + 1) : bounds.colCount,
    };
  }, {
    rowCount: 0,
    colCount: 0,
  });
};

const getChartBounds = (charts: SheetChartDefinition[] | undefined) => {
  return (charts || []).reduce((bounds, chart) => {
    const estimatedRows = chart.ext?.height
      ? Math.ceil(chart.ext.height / 9525 / 20)
      : 0;
    const estimatedCols = chart.ext?.width
      ? Math.ceil(chart.ext.width / 9525 / 64)
      : 0;
    const row = chart.to?.row ?? chart.from.row + estimatedRows;
    const col = chart.to?.col ?? chart.from.col + estimatedCols;
    return {
      rowCount: Math.max(bounds.rowCount, row + 1),
      colCount: Math.max(bounds.colCount, col + 1),
    };
  }, {
    rowCount: 0,
    colCount: 0,
  });
};

interface WorksheetRangeLike extends WorksheetWithDrawings {
  '!ref'?: string;
  '!data'?: Array<Array<unknown> | undefined>;
  '!merges'?: Array<{ e?: DrawingMarkerLike }>;
  [key: string]: unknown;
}

export interface WorksheetDisplayBounds {
  rowCount: number;
  colCount: number;
  declaredRowCount: number;
  declaredColCount: number;
  observedRowCount: number;
  observedColCount: number;
  trimmed: boolean;
}

const EMPTY_RANGE_ROW_LIMIT = 1000;
const EMPTY_RANGE_COLUMN_LIMIT = 256;
const RANGE_ROW_SLACK = 256;
const RANGE_COLUMN_SLACK = 64;
const RANGE_GROWTH_FACTOR = 4;

const getCellBounds = (worksheet: WorksheetRangeLike | undefined) => {
  const bounds = { rowCount: 0, colCount: 0 };
  if (!worksheet) return bounds;

  const denseRows = Array.isArray(worksheet)
    ? worksheet as Array<Array<unknown> | undefined>
    : worksheet['!data'];
  if (Array.isArray(denseRows)) {
    for (const rowKey of Object.keys(denseRows)) {
      const rowIndex = Number(rowKey);
      const row = denseRows[rowIndex];
      if (!Number.isInteger(rowIndex) || rowIndex < 0 || !Array.isArray(row)) continue;
      for (const colKey of Object.keys(row)) {
        const colIndex = Number(colKey);
        if (!Number.isInteger(colIndex) || colIndex < 0 || row[colIndex] == null) continue;
        bounds.rowCount = Math.max(bounds.rowCount, rowIndex + 1);
        bounds.colCount = Math.max(bounds.colCount, colIndex + 1);
      }
    }
    return bounds;
  }

  for (const key of Object.keys(worksheet)) {
    if (key.startsWith('!') || !/^[A-Z]+[1-9][0-9]*$/i.test(key) || worksheet[key] == null) continue;
    try {
      const cell = utils.decode_cell(key);
      bounds.rowCount = Math.max(bounds.rowCount, cell.r + 1);
      bounds.colCount = Math.max(bounds.colCount, cell.c + 1);
    } catch {
      // Ignore non-cell extension keys exposed by third-party workbook producers.
    }
  }
  return bounds;
};

const getMergeBounds = (worksheet: WorksheetRangeLike | undefined) => {
  return (worksheet?.['!merges'] || []).reduce((bounds, merge) => {
    const row = Number(merge.e?.row ?? (merge.e as { r?: number } | undefined)?.r);
    const col = Number(merge.e?.col ?? (merge.e as { c?: number } | undefined)?.c);
    return {
      rowCount: Number.isFinite(row) ? Math.max(bounds.rowCount, row + 1) : bounds.rowCount,
      colCount: Number.isFinite(col) ? Math.max(bounds.colCount, col + 1) : bounds.colCount,
    };
  }, { rowCount: 0, colCount: 0 });
};

const reconcileDeclaredRange = (
  declaredCount: number,
  observedCount: number,
  slack: number,
  emptyLimit: number
) => {
  if (observedCount <= 0) {
    return Math.min(Math.max(declaredCount, 1), emptyLimit);
  }
  const plausibleLimit = Math.max(observedCount + slack, observedCount * RANGE_GROWTH_FACTOR);
  return declaredCount <= plausibleLimit
    ? Math.max(declaredCount, observedCount)
    : observedCount;
};

export const getWorksheetDisplayBounds = (
  worksheet: WorksheetRangeLike | undefined,
  charts: SheetChartDefinition[] | undefined
): WorksheetDisplayBounds => {
  let declaredRowCount = 0;
  let declaredColCount = 0;
  const ref = worksheet?.['!ref'];
  if (ref) {
    try {
      const range = utils.decode_range(ref);
      declaredRowCount = range.e.r + 1;
      declaredColCount = range.e.c + 1;
    } catch {
      // Invalid producer dimensions must not block content-based recovery.
    }
  }

  const cellBounds = getCellBounds(worksheet);
  const mergeBounds = getMergeBounds(worksheet);
  const drawingBounds = getDrawingBounds(worksheet);
  const chartBounds = getChartBounds(charts);
  const observedRowCount = Math.max(
    cellBounds.rowCount,
    mergeBounds.rowCount,
    drawingBounds.rowCount,
    chartBounds.rowCount
  );
  const observedColCount = Math.max(
    cellBounds.colCount,
    mergeBounds.colCount,
    drawingBounds.colCount,
    chartBounds.colCount
  );
  const rowCount = reconcileDeclaredRange(
    declaredRowCount,
    observedRowCount,
    RANGE_ROW_SLACK,
    EMPTY_RANGE_ROW_LIMIT
  );
  const colCount = reconcileDeclaredRange(
    declaredColCount,
    observedColCount,
    RANGE_COLUMN_SLACK,
    EMPTY_RANGE_COLUMN_LIMIT
  );

  return {
    rowCount,
    colCount,
    declaredRowCount,
    declaredColCount,
    observedRowCount,
    observedColCount,
    trimmed: rowCount < declaredRowCount || colCount < declaredColCount,
  };
};

const parseSheets = (context: SpreadsheetParserContext): SpreadsheetWorkerResponse[] => {
  const workbook = context.workbook;
  if (!workbook?.SheetNames) {
    return [];
  }

  const workbookSheets = workbook.Workbook?.Sheets || [];
  context.sheets = workbook.SheetNames.reduce<SheetDefinition[]>((result, name, sourceIndex) => {
    const worksheet = workbook.Sheets[name] as WorksheetRangeLike | undefined;
    const bounds = getWorksheetDisplayBounds(worksheet, context.charts[name]);
    if (!worksheet?.['!ref'] && !bounds.observedRowCount && !bounds.observedColCount) {
      return result;
    }
    if (bounds.trimmed) {
      console.warn(
        `[file-viewer] Ignored pathological worksheet dimensions for ${name}: `
        + `${bounds.declaredRowCount}x${bounds.declaredColCount} -> ${bounds.rowCount}x${bounds.colCount}.`
      );
    }
    result.push({
      id: result.length,
      name,
      hidden: !!workbookSheets[sourceIndex]?.Hidden,
      rowCount: bounds.rowCount,
      colCount: bounds.colCount,
    });
    return result;
  }, []);

  return [{ type: 'sheets', payload: { sheets: context.sheets } }];
};

export const parseSpreadsheetWorkbook = async (
  context: SpreadsheetParserContext,
  data: ArrayBuffer,
  source: SpreadsheetTextSource = {}
): Promise<SpreadsheetWorkerResponse[]> => {
  try {
    const input = prepareSpreadsheetReadInput(data, source);
    context.workbook = input.kind === 'text'
      ? read(input.data, { ...readOptions, type: 'string' })
      : read(input.data, readOptions);
    const signature = data.byteLength >= 2 ? new DataView(data).getUint16(0, false) : 0;
    if (signature === 0x504b) {
      const [charts, cellImages] = await Promise.all([
        parseSpreadsheetCharts(data).catch((error) => {
          console.warn('[file-viewer] Spreadsheet chart parsing failed; continuing with cell content.', error);
          return {};
        }),
        parseSpreadsheetCellImages(data).catch((error) => {
          console.warn('[file-viewer] Spreadsheet cell image parsing failed; continuing with cell content.', error);
          return {};
        }),
      ]);
      context.charts = charts;
      context.cellImages = cellImages;
    } else {
      context.charts = {};
      context.cellImages = {};
    }
    return parseSheets(context);
  } catch (error) {
    return [toErrorResponse(error)];
  }
};

export const parseSpreadsheetSheet = (
  context: SpreadsheetParserContext,
  payload: Record<string, any> = {}
): SpreadsheetWorkerResponse[] => {
  const {
    sheet,
    startRow = 0,
    pageSize = 500,
    sessionId = 0,
  } = payload;

  try {
    const workbook = context.workbook;
    const sheetName = context.sheets.find(item => item.id === sheet)?.name;
    if (!workbook?.Sheets || !sheetName) {
      return [];
    }

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      return [];
    }

    const sheetMeta = context.sheets.find(item => item.id === sheet);
    const sheetModel = SheetJsModel.create(worksheet, {
      startRow,
      pageSize,
      totalRows: sheetMeta?.rowCount,
      totalCols: sheetMeta?.colCount,
      charts: context.charts[sheetName],
      cellImages: context.cellImages[sheetName],
    });
    // Keep the first response backward-compatible; later virtual windows only need rows and cells.
    // Avoid recalculating auto-fit column widths for every 500-row request.
    const windowData = sheetModel.toObject({ includeLayout: startRow === 0 });
    const structure = startRow === 0 ? sheetModel.structure : undefined;

    return [{
      type: 'parseSheet',
      payload: {
        sessionId,
        sheet,
        sheetData: structure ? {
          ...windowData,
          structure,
        } : windowData,
      },
    }];
  } catch (error) {
    return [toErrorResponse(error, { sessionId, startRow })];
  }
};

export const handleSpreadsheetWorkerRequest = (
  context: SpreadsheetParserContext,
  request: SpreadsheetWorkerRequest
): SpreadsheetWorkerResponse[] | Promise<SpreadsheetWorkerResponse[]> => {
  switch (request.type) {
    case 'parseWorkbook':
      return parseSpreadsheetWorkbook(context, request.payload?.workbook, {
        fileType: request.payload?.fileType,
        filename: request.payload?.filename,
        textEncoding: request.payload?.textEncoding,
      });
    case 'parseSheet':
      return parseSpreadsheetSheet(context, request.payload);
    default:
      return [];
  }
};
