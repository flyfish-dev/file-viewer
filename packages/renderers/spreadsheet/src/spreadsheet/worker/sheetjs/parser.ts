import { assertSheetRegion, createSheetRegion, sourceToRegion, getSheetMaterialization, EXCEL_SOURCE_EXTENT, REGION_LIMIT, ORDINARY_GRID_BUDGET, OCCUPIED_INDEX_BUDGET } from '../../sourceRegion.js';
import { readImageSourceProvenance, unknownSourceAnchor } from './sourceAnchor.js';
import { parseSpreadsheetComments, readWorkbookNotes } from './commentParser.js';
import type { CellObject, WorkBook, WorkSheet } from 'styled-exceljs';
import { read, utils } from 'styled-exceljs';
import SheetJsModel, { formatCellValue } from './SheetJsModel.js';
import { parseSpreadsheetCharts } from './chartParser.js';
import {
  prepareSpreadsheetReadInput,
  type SpreadsheetTextSource,
} from './textEncoding.js';
import type { SheetCellImage, SheetChartDefinition, SheetComment, SheetDefinition, SheetRegion, SheetOccupiedRegion, SheetSourceDiscovery, SheetSourceObjectEntry } from '../type.js';
import { parseSpreadsheetCellImages } from './richDataParser.js';
import { recoverUncachedFormulaValues } from './formulaValues.js';
import { readWorkbookDefaultFont } from './workbookFont.js';

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
  comments: Record<string, SheetComment[]>;
  commentsError: boolean;
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
  comments: {},
  commentsError: false,
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

const legalSourcePoint = (point: DrawingMarkerLike | undefined) => Number.isSafeInteger(point?.row)
  && Number.isSafeInteger(point?.col) && point!.row! >= 0 && point!.col! >= 0
  && point!.row! < EXCEL_SOURCE_EXTENT.rows && point!.col! < EXCEL_SOURCE_EXTENT.cols;

const getDrawingBounds = (worksheet: WorksheetWithDrawings | undefined) => {
  const bounds = { rowCount: 0, colCount: 0 };
  for (const image of worksheet?.['!drawings']?.images || []) {
    for (const point of [image.anchor?.from, image.anchor?.to]) if (legalSourcePoint(point)) {
      bounds.rowCount = Math.max(bounds.rowCount, point!.row! + 1);
      bounds.colCount = Math.max(bounds.colCount, point!.col! + 1);
    }
  }
  return bounds;
};

const getChartBounds = (charts: SheetChartDefinition[] | undefined) => {
  const bounds = { rowCount: 0, colCount: 0 };
  for (const chart of charts || []) {
    const estimated = { row: chart.from.row + Math.ceil((chart.ext?.height || 0) / 9525 / 20),
      col: chart.from.col + Math.ceil((chart.ext?.width || 0) / 9525 / 64) };
    for (const point of [chart.from, chart.to ?? estimated]) if (legalSourcePoint(point)) {
      bounds.rowCount = Math.max(bounds.rowCount, point!.row + 1);
      bounds.colCount = Math.max(bounds.colCount, point!.col + 1);
    }
  }
  return bounds;
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

/** A default-looking comment stub must not erase authored or unrecognized formatting. */
export const classifySpreadsheetCell = (value: unknown, defaultFont?: object) => {
  if (value == null) return { value: false, style: 'default' as const, visual: false };
  if (typeof value !== 'object') return { value: true, style: 'default' as const, visual: true };
  const cell = value as Record<string, any>;
  const content = cell.v != null || cell.f != null || cell.F != null || !!cell.w || !!cell.r || !!cell.h || !!cell.l;
  const raw = cell.s;
  const sameFont = (left: any, right: any, depth = 0): boolean => {
    if (left === right) return true;
    if (depth > 4 || !left || !right || typeof left !== 'object' || typeof right !== 'object'
      || Array.isArray(left) || Array.isArray(right)) return false;
    const keys = Object.keys(left), other = Object.keys(right);
    return keys.length <= 32 && keys.length === other.length
      && keys.every(key => Object.prototype.hasOwnProperty.call(right, key) && sameFont(left[key], right[key], depth + 1));
  };
  const provenNoteDefaultFont = !content && Array.isArray(cell.c) && cell.c.length > 0
    && raw?.id === 0 && defaultFont !== undefined && sameFont(raw.font, defaultFont);
  let style: 'default' | 'authored' | 'unknown' = 'default';
  if (raw != null) {
    if (typeof raw !== 'object' || Array.isArray(raw)) style = 'unknown';
    else {
      // These are the only reader-exposed no-op forms we can prove without guessing
      // a workbook's default font, custom number format or inherited XF identity.
      const isEmpty = (item: unknown) => item != null && typeof item === 'object' && Object.keys(item).length === 0;
      for (const [key, item] of Object.entries(raw)) {
        if (item == null || (key === 'font' && provenNoteDefaultFont) || (key === 'patternType' && item === 'none')
          || (key === 'numFmtId' && item === 0)
          || (key === 'id' && item === 0 && Object.keys(raw).some(k => ['font', 'fill', 'border', 'alignment', 'patternType', 'numFmt'].includes(k)))
          || (key === 'numFmt' && item === 'General')
          || (['font', 'border', 'alignment', 'fill', 'protection', 'xf'].includes(key) && isEmpty(item))
          || (key === 'fill' && typeof item === 'object' && item !== null
            && Object.keys(item).every(k => k === 'patternType') && (item as any).patternType === 'none')) continue;
        if (['font', 'border', 'alignment', 'fill', 'numFmt', 'numFmtId', 'patternType', 'fgColor', 'bgColor', 'protection'].includes(key)) {
          if (style !== 'unknown') style = 'authored';
        } else if (key === 'id' && typeof item === 'number' && item > 0) {
          // Positive style identity is retained even if the vendor omitted its definition.
          if (style !== 'unknown') style = 'authored';
        } else if (key === 'xf') {
          // XF provenance accompanies resolved style records. An unresolved XF alone
          // remains unknown; resolved visual properties are sufficient to retain it.
          if (!['font', 'fill', 'border', 'alignment', 'numFmt'].some(k => raw[k] && !isEmpty(raw[k]))) style = 'unknown';
        } else style = 'unknown';
      }
    }
  }
  return { value: content, style, visual: content || style !== 'default' };
};

const getCellBounds = (worksheet: WorksheetRangeLike | undefined, defaultFont?: object) => {
  const bounds = { rowCount: 0, colCount: 0 };
  if (!worksheet) return bounds;

  const rowIndices: number[] = [];
  const colIndices: number[] = [];
  let contentRows = 0;
  let contentCols = 0;
  const observe = (row: number, col: number, value: unknown) => {
    const cell = value as Record<string, unknown>;
    // Do not test truthiness: zero, false and an explicitly stored empty string
    // are content too. Uncached formulas have no v but must remain reachable.
    const classification = classifySpreadsheetCell(value, defaultFont);
    const meaningful = classification.value;
    if (!meaningful && Array.isArray(cell.c) && cell.c.length && classification.style === 'default') return;
    rowIndices.push(row);
    colIndices.push(col);
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
  charts: SheetChartDefinition[] | undefined,
  _comments: SheetComment[] = [],
  options: { defaultFont?: object } = {}
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

  const cellBounds = getCellBounds(worksheet, options.defaultFont);
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
    const bounds = getWorksheetDisplayBounds(worksheet, context.charts[name], context.comments[name], { defaultFont: readWorkbookDefaultFont(workbook) });
    const comments = context.comments[name] || [];
    const discovered = worksheet ? discoverSpreadsheetSource(workbook.Sheets[name], { charts: context.charts[name], cellImages: context.cellImages[name], defaultFont: readWorkbookDefaultFont(workbook) }) : undefined;
    const hasVisualSource = !!discovered && (discovered.extent.rows > 0 || discovered.sourceDiscovery.objects.length > 0 || discovered.sourceDiscovery.status === 'partial');
    const empty = (!worksheet?.['!ref'] || comments.length > 0) && !bounds.observedRowCount && !bounds.observedColCount;
    if (!worksheet || (empty && !includeEmptySheets && !comments.length && !hasVisualSource)) {
      return result;
    }
    const dataExtent = { rows: empty ? 0 : bounds.rowCount, cols: empty ? 0 : bounds.colCount };
    const visualExtent = { rows: Math.max(dataExtent.rows, discovered?.extent.rows || 0), cols: Math.max(dataExtent.cols, discovered?.extent.cols || 0) };
    const logicalExtent = comments.reduce((extent, comment) => ({
      rows: Math.max(extent.rows, comment.row + 1), cols: Math.max(extent.cols, comment.col + 1),
    }), { ...visualExtent });
    const materialization = getSheetMaterialization(dataExtent);
    const occupied = materialization.kind === 'region-required' ? indexOccupiedRegions(workbook.Sheets[name]) : undefined;
    const occupiedRegions = occupied?.regions;
    const needsSourceRegion = materialization.kind === 'region-required' || visualExtent.rows > dataExtent.rows || visualExtent.cols > dataExtent.cols || empty;
    const firstTarget = needsSourceRegion ? (occupiedRegions?.[0]?.firstCell || discovered?.sourceDiscovery.cellRegions[0]?.firstCell
      || discovered?.sourceDiscovery.objects.find(object => object.from)?.from || (empty ? comments[0] : undefined)) : undefined;
    if (bounds.trimmed) {
      console.warn(
        `[file-viewer] Ignored pathological worksheet dimensions for ${name}: `
        + `${bounds.declaredRowCount}x${bounds.declaredColCount} -> ${dataExtent.rows}x${dataExtent.cols}.`
      );
    }
    result.push({
      dataExtent,
      visualExtent,
      visualMaterialization: getSheetMaterialization(visualExtent),
      sourceDiscovery: discovered?.sourceDiscovery,
      logicalExtent,
      materialization,
      ...(occupied ? { occupiedRegions, occupiedIndex: occupied.index } : {}),
      ...(firstTarget ? { initialRegion: createSheetRegion(firstTarget, 0,
        logicalExtent.rows <= EXCEL_SOURCE_EXTENT.rows && logicalExtent.cols <= EXCEL_SOURCE_EXTENT.cols
          ? logicalExtent : EXCEL_SOURCE_EXTENT) } : {}),
      id: result.length,
      name,
      hidden: !!workbookSheets[sourceIndex]?.Hidden,
      comments: context.comments[name] || [],
      rowCount: empty ? 0 : bounds.rowCount,
      colCount: empty ? 0 : bounds.colCount,
    });
    return result;
  }, []);

  return [{ type: 'sheets', payload: { sheets: context.sheets, commentsError: context.commentsError } }];
};

export const parseSpreadsheetWorkbook = async (
  context: SpreadsheetParserContext,
  data: ArrayBuffer,
  source: SpreadsheetWorkbookSource = {}
): Promise<SpreadsheetWorkerResponse[]> => {
  try {
    const input = prepareSpreadsheetReadInput(data, source);
    context.workbook = readWorkbookWithMergeRecovery(input);
    const workbook = context.workbook;
    recoverUncachedFormulaValues(workbook);
    const commentResult = await parseSpreadsheetComments(data, workbook).catch(error => {
      console.warn('[file-viewer] Spreadsheet comment parsing failed; continuing with notes.', error);
      return { comments: readWorkbookNotes(workbook), hasError: true };
    });
    context.comments = commentResult.comments;
    context.commentsError = commentResult.hasError;
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
    if (!Number.isSafeInteger(startRow) || startRow < 0 || !Number.isSafeInteger(pageSize) || pageSize < 1) {
      return [toErrorResponse(new RangeError('A spreadsheet window requires a nonnegative integer start and a positive integer size.'), {
        code: 'INVALID_WINDOW', operation: 'parseSheet', sheet, sessionId, startRow,
      })];
    }
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
    // Explicit data-only reads preserve bounded public access without whole-sheet layout.
    // Older noninitial windows already omit layout and retain that behavior.
    const includeLayout = startRow === 0 && payload.includeLayout !== false;
    const materialization = sheetMeta?.materialization || getSheetMaterialization({
      rows: sheetMeta?.rowCount || 0, cols: sheetMeta?.colCount || 0,
    });
    if (payload.requireOrdinaryGrid === true && (materialization.kind === 'region-required' || sheetMeta?.initialRegion && !sheetMeta.rowCount)) {
      return [toErrorResponse(new Error('This worksheet requires bounded source-region navigation.'), {
        code: 'REGION_REQUIRED', operation: 'parseSheet', sheet, sessionId, startRow,
        materialization, initialRegion: sheetMeta?.initialRegion,
        migration: {
          operation: 'parseRegion', regionLimits: { ...REGION_LIMIT },
          requiredIdentity: ['sheet', 'sessionId', 'requestId', 'region.id'],
          dataWindow: { operation: 'parseSheet', payload: { sheet, sessionId, startRow,
            pageSize: Math.min(pageSize, Math.max(1, Math.floor(ORDINARY_GRID_BUDGET.windowCells / Math.max(1, sheetMeta?.colCount || 1)))),
            includeLayout: false } },
        },
      })];
    }
    const rowCount = sheetMeta?.rowCount || 0, colCount = sheetMeta?.colCount || 0;
    const effectiveStart = Math.min(startRow, Math.max(rowCount - 1, 0));
    const effectiveRows = Math.min(pageSize, Math.max(0, rowCount - effectiveStart));
    const requestedCells = effectiveRows * colCount;
    if (requestedCells > ORDINARY_GRID_BUDGET.windowCells) {
      return [toErrorResponse(new RangeError('This requested window exceeds the ordinary cell budget.'), {
        code: 'WINDOW_BUDGET_EXCEEDED', operation: 'parseSheet', sheet, sessionId, startRow,
        requestedRows: effectiveRows, requestedCells, maxWindowCells: ORDINARY_GRID_BUDGET.windowCells,
        suggestedPageSize: Math.max(1, Math.floor(ORDINARY_GRID_BUDGET.windowCells / Math.max(1, colCount))),
      })];
    }
    const sheetModel = SheetJsModel.create(worksheet, {
      startRow,
      pageSize,
      totalRows: sheetMeta?.rowCount,
      totalCols: sheetMeta?.colCount,
      charts: context.charts[sheetName],
      cellImages: context.cellImages[sheetName],
      defaultFont: readWorkbookDefaultFont(context.workbook),
    });
    // Keep the first response backward-compatible; later virtual windows only need rows and cells.
    // Avoid recalculating auto-fit column widths for every 500-row request.
    const windowData = sheetModel.toObject({ includeLayout });
    const structure = includeLayout ? sheetModel.structure : undefined;

    return [{
      type: 'parseSheet',
      payload: {
        sessionId,
        sheet,
        materialization,
        sheetData: structure ? {
          ...windowData,
          structure,
        } : windowData,
      },
    }];
  } catch (error) {
    const layoutError = (error as { code?: string; limit?: number })?.code === 'LAYOUT_BUDGET_EXCEEDED';
    return [toErrorResponse(error, { sheet, sessionId, startRow,
      ...(layoutError ? { code: 'LAYOUT_BUDGET_EXCEEDED', operation: 'parseSheet',
        maxLayoutEntries: (error as { limit?: number }).limit,
        migration: { operation: 'parseSheet', payload: { sheet, sessionId, startRow, pageSize, includeLayout: false } },
      } : {}),
    })];
  }
};

/** Separate bounded protocol. No renderer uses it until source/local adaptation is reviewed. */
export const parseSpreadsheetRegion = (
  context: SpreadsheetParserContext,
  payload: Record<string, any> = {}
): SpreadsheetWorkerResponse[] => {
  const { sheet, sessionId, requestId } = payload;
  try {
    for (const value of [sheet, sessionId, requestId]) {
      if (!Number.isSafeInteger(value) || value < 0) throw new RangeError('Invalid region request identity');
    }
    // Copy only contract fields. Never echo arbitrary caller properties or allocate before validation.
    const input = payload.region;
    const region: SheetRegion = { id: input?.id, startRow: input?.startRow, startCol: input?.startCol,
      rowCount: input?.rowCount, colCount: input?.colCount };
    assertSheetRegion(region);
    const definition = context.sheets.find(item => item.id === sheet);
    const worksheet = definition && context.workbook?.Sheets?.[definition.name];
    if (!definition || !worksheet) throw new RangeError('Unknown source worksheet');
    const model = SheetJsModel.create(worksheet, {
      charts: context.charts[definition.name], cellImages: context.cellImages[definition.name],
      defaultFont: readWorkbookDefaultFont(context.workbook),
    });
    return [{ type: 'parseRegion', payload: {
      sheet, sessionId, requestId, region,
      logicalExtent: definition.logicalExtent || definition.dataExtent,
      regionData: model.toRegionObject(region),
      comments: (context.comments[definition.name] || []).filter(comment => sourceToRegion(region, comment) !== null),
    } }];
  } catch (error) {
    return [toErrorResponse(error, { operation: 'parseRegion', sheet, sessionId, requestId,
      regionId: Number.isSafeInteger(payload.region?.id) ? payload.region.id : undefined })];
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
    for (const rowKey in rows) {
      if (!Object.prototype.hasOwnProperty.call(rows, rowKey)) continue;
      const row = rows[Number(rowKey)];
      const rowIndex = Number(rowKey);
      if (!Number.isInteger(rowIndex) || rowIndex < 0 || !Array.isArray(row)) {
        continue;
      }
      for (const colKey in row) {
        if (!Object.prototype.hasOwnProperty.call(row, colKey)) continue;
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

  for (const key in worksheet) {
    if (!Object.prototype.hasOwnProperty.call(worksheet, key)) continue;
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

/** Visits actual populated cells only. An index entry represents every occupied source tile. */
export const indexOccupiedRegions = (
  worksheet: WorkSheet,
  budget: { tiles: number; visitedCells: number } = OCCUPIED_INDEX_BUDGET
) => {
  for (const value of [budget.tiles, budget.visitedCells]) {
    if (!Number.isSafeInteger(value) || value < 1) throw new RangeError('Invalid occupied index budget');
  }
  const limits = { tiles: Math.min(budget.tiles, OCCUPIED_INDEX_BUDGET.tiles),
    visitedCells: Math.min(budget.visitedCells, OCCUPIED_INDEX_BUDGET.visitedCells) };
  const tiles = new Map<string, SheetOccupiedRegion>();
  let visitedCells = 0, exceeded = false;
  visitWorksheetCells(worksheet, (cell, row, col) => {
    if (visitedCells >= limits.visitedCells) { exceeded = true; return false; }
    visitedCells++;
    const meaningful = classifySpreadsheetCell(cell).value;
    if (!meaningful || row < 0 || col < 0 || row >= EXCEL_SOURCE_EXTENT.rows || col >= EXCEL_SOURCE_EXTENT.cols) return true;
    const startRow = Math.floor(row / REGION_LIMIT.rows) * REGION_LIMIT.rows;
    const startCol = Math.floor(col / REGION_LIMIT.cols) * REGION_LIMIT.cols;
    const key = `${startRow}:${startCol}`, prior = tiles.get(key);
    if (prior) prior.cellCount++;
    else {
      if (tiles.size >= limits.tiles) { exceeded = true; return false; }
      tiles.set(key, { firstCell: { row, col }, cellCount: 1, region: {
        id: 0, startRow, startCol,
        rowCount: Math.min(REGION_LIMIT.rows, EXCEL_SOURCE_EXTENT.rows - startRow),
        colCount: Math.min(REGION_LIMIT.cols, EXCEL_SOURCE_EXTENT.cols - startCol),
      } });
    }
    return true;
  });
  return {
    regions: [...tiles.values()].sort((a, b) => a.region.startRow - b.region.startRow || a.region.startCol - b.region.startCol),
    index: { coverage: 'value-formula-link-rich-text-cells-only' as const, status: exceeded ? 'budget-exceeded' as const : 'complete' as const,
      visitedCells, indexedTiles: tiles.size, limits },
  };
};

/** Bounded source discovery is separate from the legacy #405 display rectangle. */
export const discoverSpreadsheetSource = (
  worksheet: WorkSheet,
  sources: { charts?: SheetChartDefinition[]; cellImages?: SheetCellImage[]; defaultFont?: object } = {},
  budget: Partial<SheetSourceDiscovery['limits']> = {}
) => {
  const defaults: SheetSourceDiscovery['limits'] = { ...OCCUPIED_INDEX_BUDGET, objects: 4096, metadata: 8192, diagnostics: 32 };
  const limits = { ...defaults };
  for (const key of Object.keys(defaults) as Array<keyof typeof defaults>) {
    const value = budget[key] ?? defaults[key];
    if (!Number.isSafeInteger(value) || value < 1) throw new RangeError('Invalid source discovery budget');
    limits[key] = Math.min(value, defaults[key]);
  }
  const sourceDiscovery: SheetSourceDiscovery = {
    scope: 'parsed-cells-and-source-object-anchors', status: 'complete',
    extentSemantics: 'source-cells-and-anchor-endpoints',
    coverage: { values: 'complete', styles: 'complete', merges: 'complete', images: 'complete',
      charts: 'complete', cellImages: 'complete', axisStyles: 'complete', tableStyles: 'complete', conditionalFormats: 'complete', otherDrawings: 'complete' },
    cellRegions: [], objects: [], visitedCells: 0, visitedMetadata: 0, limits,
    diagnostics: [], diagnosticsTruncated: false,
  };
  const extent = { rows: 0, cols: 0 };
  const tiles = new Map<string, SheetOccupiedRegion>();
  type Coverage = keyof SheetSourceDiscovery['coverage'];
  const diagnostic = (code: string, kind: Coverage, point?: { row: number; col: number }, unsupported = false) => {
    sourceDiscovery.status = 'partial';
    sourceDiscovery.coverage[kind] = unsupported ? 'unsupported' : 'partial';
    if (sourceDiscovery.diagnostics.length < limits.diagnostics) sourceDiscovery.diagnostics.push({ code, kind, ...point });
    else sourceDiscovery.diagnosticsTruncated = true;
  };
  const point = (value: any): { row: number; col: number } | undefined => {
    const row = value?.row ?? value?.r, col = value?.col ?? value?.c;
    return Number.isSafeInteger(row) && Number.isSafeInteger(col) && row >= 0 && col >= 0
      && row < EXCEL_SOURCE_EXTENT.rows && col < EXCEL_SOURCE_EXTENT.cols ? { row, col } : undefined;
  };
  const observe = (value: { row: number; col: number }) => {
    extent.rows = Math.max(extent.rows, value.row + 1); extent.cols = Math.max(extent.cols, value.col + 1);
  };
  visitWorksheetCells(worksheet, (cell, row, col) => {
    if (sourceDiscovery.visitedCells >= limits.visitedCells) {
      diagnostic('CELL_VISIT_BUDGET', 'values'); diagnostic('CELL_VISIT_BUDGET', 'styles'); return false;
    }
    sourceDiscovery.visitedCells++;
    const content = classifySpreadsheetCell(cell, sources.defaultFont);
    if (!content.visual) return true;
    const location = point({ row, col });
    if (!location) { diagnostic('INVALID_CELL_ADDRESS', content.value ? 'values' : 'styles'); return true; }
    observe(location);
    if (content.style === 'unknown') diagnostic('UNKNOWN_STYLE_PRESERVED', 'styles', location);
    const startRow = Math.floor(row / REGION_LIMIT.rows) * REGION_LIMIT.rows;
    const startCol = Math.floor(col / REGION_LIMIT.cols) * REGION_LIMIT.cols;
    const key = `${startRow}:${startCol}`, prior = tiles.get(key);
    if (prior) prior.cellCount++;
    else {
      if (tiles.size >= limits.tiles) {
        diagnostic('CELL_TILE_BUDGET', 'values'); diagnostic('CELL_TILE_BUDGET', 'styles'); return false;
      }
      tiles.set(key, { firstCell: location, cellCount: 1, region: { id: 0, startRow, startCol,
        rowCount: Math.min(REGION_LIMIT.rows, EXCEL_SOURCE_EXTENT.rows - startRow),
        colCount: Math.min(REGION_LIMIT.cols, EXCEL_SOURCE_EXTENT.cols - startCol) } });
    }
    return true;
  });
  sourceDiscovery.cellRegions = [...tiles.values()].sort((a, b) => a.region.startRow - b.region.startRow || a.region.startCol - b.region.startCol);
  const visitMetadata = (collection: any, kind: Coverage, visit: (value: any, index: number) => void) => {
    if (collection == null) return;
    if (typeof collection !== 'object') { diagnostic('UNRECOGNIZED_METADATA', kind); return; }
    for (const key in collection) {
      if (!Object.prototype.hasOwnProperty.call(collection, key)) continue;
      if (sourceDiscovery.visitedMetadata >= limits.metadata) { diagnostic('METADATA_VISIT_BUDGET', kind); break; }
      sourceDiscovery.visitedMetadata++;
      const index = Number(key);
      if (!Number.isSafeInteger(index) || index < 0) { diagnostic('UNRECOGNIZED_METADATA_KEY', kind); continue; }
      visit(collection[key], index);
    }
  };
  const appendObject = (entry: SheetSourceObjectEntry, kind: Coverage) => {
    if (entry.from) observe(entry.from);
    if (entry.to) observe(entry.to);
    if (sourceDiscovery.objects.length >= limits.objects) { diagnostic('SOURCE_OBJECT_BUDGET', kind); return; }
    sourceDiscovery.objects.push(entry);
    if (entry.coordinateSpace !== 'cell') diagnostic(entry.coordinateSpace === 'absolute' ? 'ABSOLUTE_OBJECT_NEEDS_PIXEL_NAVIGATION' : 'UNKNOWN_OBJECT_ANCHOR', kind);
  };
  const raw = worksheet as any;
  visitMetadata(raw['!merges'], 'merges', (merge, index) => {
    const from = point(merge?.s), to = point(merge?.e);
    if (!from || !to || to.row < from.row || to.col < from.col) diagnostic('INVALID_MERGE_RANGE', 'merges');
    appendObject({ kind: 'merge', sourceIndex: index, coordinateSpace: from && to ? 'cell' : 'unknown', from, to }, 'merges');
  });
  const drawingMetadata = raw['!drawings'];
  if (drawingMetadata?.shapes && (!Array.isArray(drawingMetadata.shapes) || drawingMetadata.shapes.length > 0)) {
    diagnostic('DRAWING_SHAPES_NOT_INDEXED', 'otherDrawings', undefined, true);
  }
  if (drawingMetadata?.charts != null && (!Array.isArray(drawingMetadata.charts) || drawingMetadata.charts.length > (sources.charts?.length || 0))) {
    diagnostic('UNRESOLVED_CHART_SOURCE', 'charts');
  }
  // Known raw/legacy fields are alternate representations, not extra navigation entries.
  // Stop at the first unknown key: at most five known names can precede it.
  for (const key in drawingMetadata) {
    if (!Object.prototype.hasOwnProperty.call(drawingMetadata, key)) continue;
    if (!['images', 'charts', 'shapes', 'raw', 'chart'].includes(key)) {
      diagnostic('UNKNOWN_DRAWING_CLASS', 'otherDrawings', undefined, true); break;
    }
  }
  const imageAudit = readImageSourceProvenance(drawingMetadata?.raw, Array.isArray(drawingMetadata?.images) ? drawingMetadata.images : [], drawingMetadata != null || raw['!drawel'] != null);
  const imageSources = imageAudit.anchors;
  sourceDiscovery.imageSource = imageAudit.summary;
  if (imageAudit.summary.status === 'partial') {
    for (const reason of imageAudit.summary.reasons) diagnostic('RAW_IMAGE_SOURCE:' + reason, 'images');
    if (imageAudit.summary.reasonsTruncated) sourceDiscovery.diagnosticsTruncated = true;
  }
  visitMetadata(raw['!drawings']?.images, 'images', (image, index) => {
    const anchor = imageSources.get(image) || unknownSourceAnchor('unavailable-source-provenance'), anchorType = typeof anchor?.type === 'string' ? anchor.type : undefined;
    const absolute = anchorType === 'absoluteAnchor' || anchor?.editAs === 'absolute';
    const from = point(anchor?.from), to = point(anchor?.to);
    const knownMode = ['oneCellAnchor', 'twoCellAnchor', 'absoluteAnchor'].includes(anchorType || '');
    const validEdit = anchor?.editAs == null || ['absolute', 'oneCell', 'twoCell'].includes(anchor.editAs);
    const ordered = !!from && !!to && to.row >= from.row && to.col >= from.col;
    const valid = anchor.status === 'valid' && knownMode && validEdit && !!from
      && (anchorType !== 'twoCellAnchor' || ordered) && (anchor?.to == null || ordered);
    if (anchor.status !== 'valid') diagnostic('UNVERIFIED_SOURCE_ANCHOR:' + (anchor.reason || 'unknown'), 'images');
    if (!knownMode || !validEdit) diagnostic('UNKNOWN_ANCHOR_MODE', 'images');
    else if (!absolute && !valid) diagnostic('INVALID_ANCHOR_ENDPOINTS', 'images');
    appendObject({ kind: 'image', sourceIndex: index, id: typeof image?.id === 'string' ? image.id : undefined,
      coordinateSpace: absolute ? 'absolute' : valid ? 'cell' : 'unknown', sourceAnchor: anchor, from, to, anchorType,
      editAs: typeof anchor?.editAs === 'string' ? anchor.editAs : undefined }, 'images');
  });
  visitMetadata(sources.charts, 'charts', (chart, index) => {
    const anchor = chart?.sourceAnchor || unknownSourceAnchor('missing-chart-source-provenance');
    const from = point(anchor.from), to = point(anchor.to);
    const absolute = anchor.type === 'absoluteAnchor' || anchor.editAs === 'absolute';
    const valid = anchor.status === 'valid';
    if (!valid) diagnostic('UNVERIFIED_SOURCE_ANCHOR:' + (anchor.reason || 'unknown'), 'charts');
    appendObject({ kind: 'chart', sourceIndex: index, id: typeof chart?.id === 'string' ? chart.id : undefined,
      coordinateSpace: absolute ? 'absolute' : valid ? 'cell' : 'unknown', sourceAnchor: anchor, from, to,
      anchorType: anchor.type, editAs: anchor.editAs }, 'charts');
  });
  visitMetadata(sources.cellImages, 'cellImages', (image, index) => {
    const from = point(image);
    appendObject({ kind: 'cellImage', sourceIndex: index, id: typeof image?.id === 'string' ? image.id : undefined,
      coordinateSpace: from ? 'cell' : 'unknown', from }, 'cellImages');
  });
  for (const axis of ['!rows', '!cols']) visitMetadata(raw[axis], 'axisStyles', (entry, index) => {
    if (entry?.s != null || entry?.style != null) {
      const classification = classifySpreadsheetCell({ s: entry.s ?? entry.style });
      if (classification.style !== 'default') diagnostic('AXIS_STYLE_NOT_INDEXED', 'axisStyles', undefined, true);
    }
  });
  for (const [key, kind] of [['!tables', 'tableStyles'], ['!conditionalFormatting', 'conditionalFormats'], ['!conditionalFormats', 'conditionalFormats']] as const) {
    const value = raw[key];
    if (value != null && (Array.isArray(value) ? value.length > 0 : true)) diagnostic('VISUAL_CLASS_NOT_INDEXED', kind, undefined, true);
  }
  return { extent, sourceDiscovery };
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
    case 'parseRegion':
      return parseSpreadsheetRegion(context, request.payload);
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
