import type { CellObject, WorkBook, WorkSheet } from 'styled-exceljs';
import { read, utils } from 'styled-exceljs';
import SheetJsModel, { formatCellValue } from './SheetJsModel.js';
import { parseSpreadsheetCharts } from './chartParser.js';
import {
  prepareSpreadsheetReadInput,
  type SpreadsheetTextSource,
} from './textEncoding.js';
import type { SheetCellImage, SheetChartDefinition, SheetDefinition } from '../type.js';
import { parseSpreadsheetCellImages } from './richDataParser.js';
import { recoverUncachedFormulaValues } from './formulaValues.js';

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

export interface SpreadsheetWorkbookSource extends SpreadsheetTextSource {
  /** Retain truly empty sheets only for the opt-in Excel viewport grid. */
  includeEmptySheets?: boolean;
}

export interface SpreadsheetWorkerRequest {
  type: string;
  payload?: Record<string, any>;
}

export interface SpreadsheetWorkerResponse {
  type: string;
  payload?: Record<string, any>;
}

export interface SpreadsheetSearchOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
  maxMatches?: number;
}

export interface SpreadsheetSearchMatch {
  sheet: number;
  sheetName: string;
  row: number;
  col: number;
  text: string;
  matchText: string;
}

const readOptions = {
  type: 'array' as const,
  dense: true,
  cellDates: true,
  cellStyles: true,
  browserPixels: true,
  drawings: true,
};

interface SpreadsheetMergePoint {
  r?: number;
  c?: number;
}

interface SpreadsheetMergeRange {
  s?: SpreadsheetMergePoint;
  e?: SpreadsheetMergePoint;
}

interface SpreadsheetMergeError {
  code?: string;
  index?: number;
}

interface WorksheetWithMergeDiagnostics {
  '!ref'?: string;
  '!merges'?: SpreadsheetMergeRange[];
  '!mergeErrors'?: SpreadsheetMergeError[];
}

// HTML/XML 文件必须传入 type: 'string' 保持原有的 HTML 单元格解析结果
const prefersSheetJsTextSniff = (text: string) => /^[\s\uFEFF]*</.test(text);

const isMergeValidationError = (error: unknown): error is Error & { code: string } => (
  error instanceof Error
  && typeof (error as Error & { code?: unknown }).code === 'string'
  && /^E_MERGE_/.test((error as Error & { code: string }).code)
);

const sanitizeToleratedMerges = (workbook: WorkBook) => {
  for (const name of workbook.SheetNames || []) {
    const worksheet = workbook.Sheets[name] as WorksheetWithMergeDiagnostics | undefined;
    const merges = worksheet?.['!merges'];
    const errors = worksheet?.['!mergeErrors'];
    if (!worksheet || !merges?.length || !errors?.length) continue;

    let worksheetRange: ReturnType<typeof utils.decode_range> | undefined;
    try {
      worksheetRange = worksheet['!ref'] ? utils.decode_range(worksheet['!ref']) : undefined;
    } catch {
      worksheetRange = undefined;
    }

    const errorsByIndex = new Map<number, Set<string>>();
    for (const error of errors) {
      const index = error.index;
      if (!Number.isInteger(index) || typeof index !== 'number' || typeof error.code !== 'string') continue;
      const codes = errorsByIndex.get(index) || new Set<string>();
      codes.add(error.code);
      errorsByIndex.set(index, codes);
    }

    worksheet['!merges'] = merges.flatMap((merge, index) => {
      const codes = errorsByIndex.get(index);
      const startRow = Number(merge.s?.r);
      const startCol = Number(merge.s?.c);
      let endRow = Number(merge.e?.r);
      let endCol = Number(merge.e?.c);
      if (
        !Number.isInteger(startRow)
        || !Number.isInteger(startCol)
        || !Number.isInteger(endRow)
        || !Number.isInteger(endCol)
        || startRow < 0
        || startCol < 0
        || endRow < startRow
        || endCol < startCol
        || codes?.has('E_MERGE_RANGE')
        || codes?.has('E_MERGE_DUP')
        || codes?.has('E_MERGE_OVERLAP')
      ) {
        return [];
      }

      if (codes?.has('E_MERGE_BOUNDS')) {
        if (
          !worksheetRange
          || startRow < worksheetRange.s.r
          || startCol < worksheetRange.s.c
          || startRow > worksheetRange.e.r
          || startCol > worksheetRange.e.c
        ) {
          return [];
        }
        endRow = Math.min(endRow, worksheetRange.e.r);
        endCol = Math.min(endCol, worksheetRange.e.c);
      }

      return [{
        ...merge,
        s: { ...merge.s, r: startRow, c: startCol },
        e: { ...merge.e, r: endRow, c: endCol },
      }];
    });
  }
};

const readPreparedWorkbook = (
  input: ReturnType<typeof prepareSpreadsheetReadInput>,
  validateMerges: boolean
) => (
  /***
   * 对于二进制格式，直接透传 ArrayBuffer
   * 对于文本格式用 prefersSheetJsTextSniff 选 type:
   *   - 普通文本 -> 'binary'，绕过 SheetJS 内部 utf8write 的大数组崩溃
   *   - HTML/XML -> 'string'，保持原有的 HTML 单元格解析结果
   */
  input.kind === 'text'
    ? read(input.data, { ...readOptions, type: prefersSheetJsTextSniff(input.data) ? 'string' : 'binary', validateMerges })
    : read(input.data, { ...readOptions, validateMerges })
);

const readWorkbookWithMergeRecovery = (
  input: ReturnType<typeof prepareSpreadsheetReadInput>
) => {
  try {
    return readPreparedWorkbook(input, true);
  } catch (error) {
    if (!isMergeValidationError(error)) throw error;
    const workbook = readPreparedWorkbook(input, false);
    sanitizeToleratedMerges(workbook);
    console.warn(
      `[file-viewer] Recovered a workbook with invalid merge metadata: ${error.message}`
    );
    return workbook;
  }
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
/** Drop sparse far outliers once the gap dwarfs the dense cluster near A1. */
const CONTENT_GAP_ROW_MULTIPLIER = 4;
const CONTENT_GAP_COL_MULTIPLIER = 4;

/**
 * Keep the dense cell cluster that starts nearest A1.
 * Nearby style-only stubs still count (needed for formatted empty tables, see #175),
 * but a huge gap before far ghost cells near Excel max is treated as an outlier (#405).
 */
const compactSparseExtent = (indices: number[], slack: number, gapMultiplier: number, contentExtent: number): number => {
  if (indices.length === 0) return 0;
  const sorted = [...new Set(indices)].sort((a, b) => a - b);
  const originThreshold = Math.max(slack * gapMultiplier, RANGE_GROWTH_FACTOR);
  // A workbook whose only sheet entries sit absurdly far from A1 has no usable near cluster.
  if (!contentExtent && sorted[0]! > originThreshold) return 0;

  // All meaningful cells are mandatory, even across gaps or far from A1.
  // Only blank formatting beyond the last content cell may be compacted.
  let end = Math.max(sorted[0]!, contentExtent - 1);
  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i]!;
    if (current <= end) continue;
    const currentExtent = end + 1;
    const gap = current - end;
    const threshold = Math.max(slack * gapMultiplier, currentExtent * RANGE_GROWTH_FACTOR);
    if (gap > threshold) break;
    end = current;
  }
  return end + 1;
};

const getCellBounds = (worksheet: WorksheetRangeLike | undefined) => {
  const bounds = { rowCount: 0, colCount: 0 };
  if (!worksheet) return bounds;

  const rowIndices: number[] = [];
  const colIndices: number[] = [];
  let contentRows = 0;
  let contentCols = 0;
  const observe = (row: number, col: number, value: unknown) => {
    rowIndices.push(row);
    colIndices.push(col);
    const cell = value as Record<string, unknown>;
    // Do not test truthiness: zero, false and an explicitly stored empty string
    // are content too. Uncached formulas have no v but must remain reachable.
    const meaningful = typeof value !== 'object' || cell.v != null || cell.f != null
      || cell.F != null || !!cell.w || !!cell.r || !!cell.h || !!cell.l
      || (Array.isArray(cell.c) && cell.c.length > 0);
    if (meaningful) {
      contentRows = Math.max(contentRows, row + 1);
      contentCols = Math.max(contentCols, col + 1);
    }
  };

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
        observe(rowIndex, colIndex, row[colIndex]);
      }
    }
  } else {
    for (const key of Object.keys(worksheet)) {
      if (key.startsWith('!') || !/^[A-Z]+[1-9][0-9]*$/i.test(key) || worksheet[key] == null) continue;
      try {
        const cell = utils.decode_cell(key);
        observe(cell.r, cell.c, worksheet[key]);
      } catch {
        // Ignore non-cell extension keys exposed by third-party workbook producers.
      }
    }
  }

  bounds.rowCount = compactSparseExtent(rowIndices, RANGE_ROW_SLACK, CONTENT_GAP_ROW_MULTIPLIER, contentRows);
  bounds.colCount = compactSparseExtent(colIndices, RANGE_COLUMN_SLACK, CONTENT_GAP_COL_MULTIPLIER, contentCols);
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
  const reconciledRowCount = reconcileDeclaredRange(
    declaredRowCount,
    observedRowCount,
    RANGE_ROW_SLACK,
    EMPTY_RANGE_ROW_LIMIT
  );
  const reconciledColCount = reconcileDeclaredRange(
    declaredColCount,
    observedColCount,
    RANGE_COLUMN_SLACK,
    EMPTY_RANGE_COLUMN_LIMIT
  );
  const rowCount = reconciledRowCount;
  const colCount = reconciledColCount;
  const trimmed = (
    rowCount < declaredRowCount
    || colCount < declaredColCount
    || rowCount < reconciledRowCount
    || colCount < reconciledColCount
  );

  return {
    rowCount,
    colCount,
    declaredRowCount,
    declaredColCount,
    observedRowCount,
    observedColCount,
    trimmed,
  };
};

const parseSheets = (context: SpreadsheetParserContext, includeEmptySheets = false): SpreadsheetWorkerResponse[] => {
  const workbook = context.workbook;
  if (!workbook?.SheetNames) {
    return [];
  }

  const workbookSheets = workbook.Workbook?.Sheets || [];
  context.sheets = workbook.SheetNames.reduce<SheetDefinition[]>((result, name, sourceIndex) => {
    const worksheet = workbook.Sheets[name] as WorksheetRangeLike | undefined;
    const bounds = getWorksheetDisplayBounds(worksheet, context.charts[name]);
    const empty = !worksheet?.['!ref'] && !bounds.observedRowCount && !bounds.observedColCount;
    if (!worksheet || (empty && !includeEmptySheets)) {
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
      rowCount: empty ? 0 : bounds.rowCount,
      colCount: empty ? 0 : bounds.colCount,
    });
    return result;
  }, []);

  return [{ type: 'sheets', payload: { sheets: context.sheets } }];
};

export const parseSpreadsheetWorkbook = async (
  context: SpreadsheetParserContext,
  data: ArrayBuffer,
  source: SpreadsheetWorkbookSource = {}
): Promise<SpreadsheetWorkerResponse[]> => {
  try {
    const input = prepareSpreadsheetReadInput(data, source);
    context.workbook = readWorkbookWithMergeRecovery(input);
    recoverUncachedFormulaValues(context.workbook);
    const signature = data.byteLength >= 2 ? new DataView(data).getUint16(0, false) : 0;
    if (signature === 0x504b) {
      const [charts, cellImages] = await Promise.all([
        parseSpreadsheetCharts(data, context.workbook).catch((error) => {
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
    return parseSheets(context, source.includeEmptySheets);
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

const escapeSearchRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const createSpreadsheetSearchRegExp = (query: string, options: SpreadsheetSearchOptions) => {
  const source = options.wholeWord
    ? `\\b${escapeSearchRegExp(query)}\\b`
    : escapeSearchRegExp(query);
  return new RegExp(source, options.caseSensitive ? 'g' : 'gi');
};

type DenseWorksheet = Array<Array<CellObject | undefined> | undefined>;

const visitWorksheetCells = (
  worksheet: WorkSheet,
  visit: (cell: CellObject, row: number, col: number) => boolean
) => {
  const candidate = worksheet as WorkSheet & { '!data'?: DenseWorksheet };
  const rows = Array.isArray(worksheet)
    ? worksheet as unknown as DenseWorksheet
    : candidate['!data'];

  if (rows) {
    for (const rowKey of Object.keys(rows)) {
      const row = rows[Number(rowKey)];
      const rowIndex = Number(rowKey);
      if (!Number.isInteger(rowIndex) || rowIndex < 0 || !Array.isArray(row)) {
        continue;
      }
      for (const colKey of Object.keys(row)) {
        const colIndex = Number(colKey);
        const cell = row[colIndex];
        if (!Number.isInteger(colIndex) || colIndex < 0 || !cell) {
          continue;
        }
        if (!visit(cell, rowIndex, colIndex)) {
          return false;
        }
      }
    }
    return true;
  }

  for (const key of Object.keys(worksheet)) {
    if (key.startsWith('!') || !/^[A-Z]+[1-9][0-9]*$/i.test(key)) {
      continue;
    }
    const cell = worksheet[key] as CellObject | undefined;
    if (!cell) {
      continue;
    }
    let position;
    try {
      position = utils.decode_cell(key);
    } catch {
      continue;
    }
    if (!visit(cell, position.r, position.c)) {
      return false;
    }
  }
  return true;
};

export const searchSpreadsheetWorkbook = (
  context: SpreadsheetParserContext,
  query: string,
  options: SpreadsheetSearchOptions = {}
): SpreadsheetSearchMatch[] => {
  const normalizedQuery = query.replace(/\s+/g, ' ').trim();
  if (!normalizedQuery || !context.workbook?.Sheets) {
    return [];
  }

  const maxMatches = Math.max(1, Math.floor(options.maxMatches || 1000));
  const expression = createSpreadsheetSearchRegExp(normalizedQuery, options);
  const matches: SpreadsheetSearchMatch[] = [];

  for (const sheet of context.sheets) {
    const worksheet = context.workbook.Sheets[sheet.name] as WorkSheet | undefined;
    if (!worksheet) {
      continue;
    }

    const completed = visitWorksheetCells(worksheet, (cell, row, col) => {
      const text = formatCellValue(cell);
      if (!text) {
        return true;
      }

      expression.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = expression.exec(text)) && matches.length < maxMatches) {
        if (!match[0]) {
          expression.lastIndex += 1;
          continue;
        }
        matches.push({
          sheet: sheet.id,
          sheetName: sheet.name,
          row,
          col,
          text,
          matchText: match[0],
        });
      }
      return matches.length < maxMatches;
    });

    if (!completed || matches.length >= maxMatches) {
      break;
    }
  }

  return matches;
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
        includeEmptySheets: request.payload?.includeEmptySheets,
      });
    case 'parseSheet':
      return parseSpreadsheetSheet(context, request.payload);
    case 'searchWorkbook':
      return [{
        type: 'searchWorkbook',
        payload: {
          requestId: request.payload?.requestId,
          query: request.payload?.query || '',
          matches: searchSpreadsheetWorkbook(context, request.payload?.query || '', request.payload),
        },
      }];
    default:
      return [];
  }
};
