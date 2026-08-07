import { parseCFB } from '../core/cfb.js';
import { cleanTextControlChars, pushWarning, shallowEqual, uniqueId } from '../core/utils.js';
import { parseClx, buildPieceTextCache, getTextByCp, splitParagraphRanges } from './clx.js';
import { DOC_CONTROL } from './constants.js';
import { parseFib } from './fib.js';
import { readChpxRuns, readPapxRuns, type ChpxRun } from './fkp.js';
import { parseFonts } from './fonts.js';
import { extractObjectPool, extractPictureAsset } from './objects.js';
import {
  applyTableStateToCells,
  charPropsToState,
  getTableDepth,
  paraPropsToState,
  tablePropsToState,
} from './properties.js';
import { mergePropertyArrays, parseStyles, splitPropertiesByKind } from './styles.js';
import type {
  AttachmentAsset,
  CharSegment,
  CharState,
  DecodedProperty,
  FieldInstruction,
  FontInfo,
  FontsCollection,
  InlineNode,
  MsDocAsset,
  MsDocParseOptions,
  MsDocParseResult,
  ObjectPoolInfo,
  ParagraphBlock,
  ParagraphModel,
  ParagraphRange,
  ParsedFib,
  ResolvedStyle,
  StyleCollection,
  TableBlock,
  TableCellBlock,
  TableRowBlock,
} from '../types.js';

function getOverlappingRuns<T extends { cpStart: number; cpEnd: number }>(
  runs: T[],
  cpStart: number,
  cpEnd: number,
  cursorRef?: { index: number },
): T[] {
  let cursor = cursorRef?.index || 0;
  while (cursor < runs.length && runs[cursor]!.cpEnd <= cpStart) cursor += 1;
  if (cursorRef) cursorRef.index = cursor;
  const list: T[] = [];
  let i = cursor;
  while (i < runs.length && runs[i]!.cpStart < cpEnd) {
    if (runs[i]!.cpEnd > cpStart) list.push(runs[i] as T);
    i += 1;
  }
  return list;
}

function normalizeTextStyleName(name: unknown): string {
  return String(name || '').trim();
}

function decodeFieldInstruction(instruction: unknown): FieldInstruction | null {
  const normalized = String(instruction || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  const upper = normalized.toUpperCase();
  if (upper.startsWith('HYPERLINK')) {
    const body = normalized.slice(9).trim();
    const quoted = body.match(/"([^"]+)"/);
    const href = quoted?.[1] || body.split(/\s+/)[0] || '';
    return href ? { type: 'hyperlink', href } : null;
  }
  if (upper.startsWith('INCLUDEPICTURE')) {
    const body = normalized.slice('INCLUDEPICTURE'.length).trim();
    const quoted = body.match(/"([^"]+)"/);
    return { type: 'includePicture', target: quoted?.[1] || body.split(/\s+/)[0] || '' };
  }
  if (upper.startsWith('EMBED')) {
    return { type: 'embed', raw: normalized };
  }
  if (upper.startsWith('LINK')) {
    return { type: 'link', raw: normalized };
  }
  return { type: 'unknown', raw: normalized };
}

function mergeTextNode(target: InlineNode[], node: Extract<InlineNode, { type: 'text' }>): void {
  if (!node.text) return;
  const last = target[target.length - 1];
  if (last && last.type === 'text' && last.href === node.href && shallowEqual(last.style, node.style)) {
    last.text += node.text;
    return;
  }
  target.push(node);
}

interface FieldFrame {
  instruction: string;
  parsed: FieldInstruction | null;
  readingInstruction: boolean;
  nodes: InlineNode[];
}

function emitInline(targetStack: FieldFrame[], output: InlineNode[], node: InlineNode | null | undefined): void {
  if (!node) return;
  const target = targetStack.length ? targetStack[targetStack.length - 1]!.nodes : output;
  if (node.type === 'text') mergeTextNode(target, node);
  else target.push(node);
}

function getObjectPoolInfo(objectPool: Map<string, ObjectPoolInfo>, pictureOffset: number): ObjectPoolInfo | null {
  const candidates = [
    `_${pictureOffset}`,
    `_${String(pictureOffset)}`,
    `_${pictureOffset.toString(16)}`,
    `_${pictureOffset.toString(16).toUpperCase()}`,
  ];
  for (const key of candidates) {
    if (objectPool.has(key)) return objectPool.get(key) || null;
  }
  return null;
}

function createAssetResolver(
  dataBytes: Uint8Array,
  objectPool: Map<string, ObjectPoolInfo>,
  assets: MsDocAsset[],
  usedAttachmentNames: Set<string>,
  assetCache: Map<number, MsDocAsset | null>,
  options: MsDocParseOptions = {},
): (charState: CharState) => MsDocAsset | null {
  return function resolveAsset(charState: CharState): MsDocAsset | null {
    const pictureOffset = charState?.pictureOffset;
    if (pictureOffset == null) return null;
    if (assetCache.has(pictureOffset)) return assetCache.get(pictureOffset) || null;

    let asset: MsDocAsset | null = null;
    const objectInfo = getObjectPoolInfo(objectPool, pictureOffset);

    if ((charState.ole2 || charState.object || charState.data) && objectInfo?.attachment) {
      asset = objectInfo.attachment;
      usedAttachmentNames.add(objectInfo.entry.name);
    }

    if (!asset && dataBytes?.length) {
      const extracted = extractPictureAsset(dataBytes, pictureOffset, options);
      if (extracted && extracted.mime !== 'application/octet-stream') {
        asset = extracted;
      } else if (!asset && objectInfo?.attachment) {
        asset = objectInfo.attachment;
        usedAttachmentNames.add(objectInfo.entry.name);
      } else if (extracted) {
        asset = extracted;
      }
    }

    if (!asset && objectInfo?.attachment) {
      asset = objectInfo.attachment;
      usedAttachmentNames.add(objectInfo.entry.name);
    }

    if (asset) assets.push(asset);
    assetCache.set(pictureOffset, asset);
    return asset;
  };
}

function normalizePlainTextChar(ch: string): string {
  switch (ch) {
    case DOC_CONTROL.nonBreakingHyphen:
      return '-';
    case DOC_CONTROL.nonRequiredHyphen:
    case DOC_CONTROL.annotationRef:
    case DOC_CONTROL.textBoxPlaceholder:
      return '';
    default:
      return ch;
  }
}

function normalizeParagraphText(text: string): string {
  return text.replaceAll(DOC_CONTROL.textBoxPlaceholder, '');
}

interface StoryRange {
  kind: 'main' | 'footnote' | 'header' | 'macro' | 'annotation' | 'endnote' | 'textbox' | 'header-textbox';
  cpStart: number;
  cpEnd: number;
}

function getDocumentStoryRanges(fib: ParsedFib, documentLength: number): StoryRange[] {
  const storyLengths: Array<[StoryRange['kind'], number]> = [
    ['main', fib.fibRgLw.ccpText],
    ['footnote', fib.fibRgLw.ccpFtn],
    ['header', fib.fibRgLw.ccpHdd],
    ['macro', fib.fibRgLw.ccpMcr],
    ['annotation', fib.fibRgLw.ccpAtn],
    ['endnote', fib.fibRgLw.ccpEdn],
    ['textbox', fib.fibRgLw.ccpTxbx],
    ['header-textbox', fib.fibRgLw.ccpHdrTxbx],
  ];
  const hasDeclaredStories = storyLengths.some(([, length]) => length > 0);
  if (!hasDeclaredStories) return [{ kind: 'main', cpStart: 0, cpEnd: documentLength }];

  const ranges: StoryRange[] = [];
  let cp = 0;
  for (const [kind, rawLength] of storyLengths) {
    const length = Math.max(0, rawLength || 0);
    const cpStart = Math.min(cp, documentLength);
    cp += length;
    const cpEnd = Math.min(cp, documentLength);
    ranges.push({ kind, cpStart, cpEnd });
  }
  return ranges;
}

function buildStoryParagraphRanges(
  story: StoryRange,
  documentText: string,
  papxRuns: Array<{ cpStart: number; cpEnd: number; styleId: number; properties: DecodedProperty[] }>,
): Array<ParagraphRange & { storyKind: StoryRange['kind'] }> {
  if (story.cpEnd <= story.cpStart) return [];
  const runs = papxRuns.filter((run) => run.cpStart < story.cpEnd && run.cpEnd > story.cpStart);
  if (runs.length) {
    return runs.map((run) => {
      const cpStart = Math.max(story.cpStart, run.cpStart);
      const cpEnd = Math.min(story.cpEnd, run.cpEnd);
      return {
        cpStart,
        cpEnd,
        terminator: documentText[cpEnd - 1] || '',
        styleId: run.styleId,
        properties: run.properties,
        storyKind: story.kind,
      };
    }).filter((range) => range.cpEnd > range.cpStart);
  }

  return splitParagraphRanges(documentText.slice(story.cpStart, story.cpEnd)).map((range) => ({
    ...range,
    cpStart: range.cpStart + story.cpStart,
    cpEnd: range.cpEnd + story.cpStart,
    styleId: 0,
    properties: [],
    storyKind: story.kind,
  }));
}

function buildInlineNodes(segments: CharSegment[], resolveAsset: (charState: CharState) => MsDocAsset | null): InlineNode[] {
  const output: InlineNode[] = [];
  const fieldStack: FieldFrame[] = [];

  for (const segment of segments) {
    if (!segment.text || segment.state.hidden) continue;
    for (const rawCh of segment.text) {
      const ch = normalizePlainTextChar(rawCh);

      if (ch === DOC_CONTROL.fieldStart) {
        fieldStack.push({ instruction: '', parsed: null, readingInstruction: true, nodes: [] });
        continue;
      }
      if (ch === DOC_CONTROL.fieldSeparator) {
        const current = fieldStack[fieldStack.length - 1];
        if (current) {
          current.parsed = decodeFieldInstruction(current.instruction);
          current.readingInstruction = false;
        }
        continue;
      }
      if (ch === DOC_CONTROL.fieldEnd) {
        const current = fieldStack.pop();
        if (!current) continue;
        let nodes = current.nodes;
        if (current.readingInstruction) {
          current.parsed = decodeFieldInstruction(current.instruction);
        }
        if (current.parsed?.type === 'hyperlink') {
          const href = current.parsed.href;
          nodes = nodes.map((node) => {
            if (node.type === 'lineBreak' || node.type === 'pageBreak') return node;
            return { ...node, href } as InlineNode;
          });
        }
        for (const node of nodes) emitInline(fieldStack, output, node);
        continue;
      }

      const currentField = fieldStack[fieldStack.length - 1];
      if (currentField?.readingInstruction) {
        currentField.instruction += ch;
        continue;
      }

      if (ch === DOC_CONTROL.hardLineBreak) {
        emitInline(fieldStack, output, { type: 'lineBreak' });
        continue;
      }
      if (ch === DOC_CONTROL.pageBreak) {
        emitInline(fieldStack, output, { type: 'pageBreak' });
        continue;
      }
      if (ch === DOC_CONTROL.picture) {
        const asset = resolveAsset(segment.state);
        if (asset?.type === 'image') {
          emitInline(fieldStack, output, { type: 'image', asset, style: segment.state });
        } else if (asset?.type === 'attachment') {
          emitInline(fieldStack, output, { type: 'attachment', asset, style: segment.state });
        }
        continue;
      }

      emitInline(fieldStack, output, {
        type: 'text',
        text: cleanTextControlChars(ch),
        style: segment.state,
      });
    }
  }

  while (fieldStack.length) {
    const current = fieldStack.pop()!;
    for (const node of current.nodes) emitInline(fieldStack, output, node);
  }

  return output;
}

function buildCharSegments(
  range: ParagraphRange,
  paragraphText: string,
  chpxRuns: ChpxRun[],
  styles: StyleCollection,
  baseCharProps: DecodedProperty[],
  resolveFont: (fontId: number | undefined) => FontInfo | null,
  cursorRef: { index: number },
  forceReadableColors = false,
): CharSegment[] {
  const overlaps = getOverlappingRuns(chpxRuns, range.cpStart, range.cpEnd, cursorRef);
  const boundaries = new Set<number>([range.cpStart, range.cpEnd]);
  for (const run of overlaps) {
    boundaries.add(Math.max(range.cpStart, run.cpStart));
    boundaries.add(Math.min(range.cpEnd, run.cpEnd));
  }
  const points = Array.from(boundaries).sort((a, b) => a - b);
  const segments: CharSegment[] = [];

  for (let i = 0; i < points.length - 1; i += 1) {
    const cpStart = points[i]!;
    const cpEnd = points[i + 1]!;
    if (cpEnd <= cpStart) continue;
    const coveringRun = overlaps.find((run) => run.cpStart <= cpStart && run.cpEnd >= cpEnd);
    const directProps = coveringRun?.properties || [];
    const directState = charPropsToState(directProps);
    const charStyleProps = directState.charStyleId != null ? styles.resolveStyle(directState.charStyleId).charProps : [];
    const finalProps = mergePropertyArrays(baseCharProps, charStyleProps, directProps);
    const state = charPropsToState(finalProps);
    if (forceReadableColors && state.colorIndex === 8) state.colorIndex = 1;
    const font = resolveFont(state.fontFamilyId);
    if (font) state.fontFamily = font.name || font.altName || undefined;
    const localStart = cpStart - range.cpStart;
    const localEnd = cpEnd - range.cpStart;
    const text = paragraphText.slice(localStart, localEnd);
    if (!text) continue;
    const last = segments[segments.length - 1];
    if (last && shallowEqual(last.state, state)) {
      last.text += text;
      last.cpEnd = cpEnd;
      continue;
    }
    segments.push({ cpStart, cpEnd, text, state });
  }

  if (!segments.length && paragraphText) {
    const state = charPropsToState(baseCharProps);
    if (forceReadableColors && state.colorIndex === 8) state.colorIndex = 1;
    const font = resolveFont(state.fontFamilyId);
    if (font) state.fontFamily = font.name || font.altName || undefined;
    segments.push({ cpStart: range.cpStart, cpEnd: range.cpEnd, text: paragraphText, state });
  }

  return segments;
}

function buildParagraphModel(
  range: ParagraphRange & { storyKind?: StoryRange['kind'] },
  paragraphText: string,
  styles: StyleCollection,
  fonts: FontsCollection,
  chpxRuns: ChpxRun[],
  resolveAsset: (charState: CharState) => MsDocAsset | null,
  chpxCursor: { index: number },
): ParagraphModel {
  const directSplit = splitPropertiesByKind(range.properties || []);
  const paraStyleId = range.styleId || (directSplit.para.find((item) => item.name === 'styleId')?.value as number | undefined) || 0;
  const paraStyle: ResolvedStyle = styles.resolveStyle(paraStyleId);
  const paraProps = mergePropertyArrays(paraStyle.paraProps, directSplit.para);
  const paraState = paraPropsToState(paraProps);

  const directTableState = tablePropsToState(directSplit.table);
  const tableStyleProps = directTableState.styleId != null ? styles.resolveStyle(directTableState.styleId).tableProps : [];
  const tableProps = mergePropertyArrays(tableStyleProps, directSplit.table);
  const tableState = tablePropsToState(tableProps);

  const baseCharProps = paraStyle.charProps;
  const resolveFont = (fontId: number | undefined) => fonts.byIndex(fontId);
  const segments = buildCharSegments(
    range,
    paragraphText,
    chpxRuns,
    styles,
    baseCharProps,
    resolveFont,
    chpxCursor,
    range.storyKind === 'textbox' || range.storyKind === 'header-textbox',
  );
  const inlines = buildInlineNodes(segments, resolveAsset);

  return {
    id: uniqueId('para'),
    cpStart: range.cpStart,
    cpEnd: range.cpEnd,
    terminator: range.terminator || '',
    text: paragraphText,
    rawProperties: range.properties || [],
    styleId: paraStyleId,
    styleName: normalizeTextStyleName(styles.styles.get(paraStyleId)?.name),
    paraProps,
    paraState,
    tableProps,
    tableState,
    segments,
    inlines,
  };
}

export function finalizeTableGrid(rows: TableRowBlock[]): void {
  for (const row of rows) {
    row.cells.forEach((cell, index) => {
      cell.colIndex = index;
      cell.colspan = 1;
      cell.rowspan = 1;
      cell.hidden = false;
    });
    for (let i = 0; i < row.cells.length; i += 1) {
      const cell = row.cells[i]!;
      const merge = cell.meta?.merge || 0;
      if (merge === 1) {
        continue;
      }
      if (merge > 1) {
        let j = i + 1;
        while (j < row.cells.length && (row.cells[j]!.meta?.merge || 0) === 1) {
          row.cells[j]!.hidden = true;
          cell.colspan = (cell.colspan || 1) + 1;
          j += 1;
        }
        const lastCell = row.cells[j - 1];
        if (cell.meta && lastCell?.meta && lastCell !== cell) {
          cell.meta.rightBoundary = lastCell.meta.rightBoundary;
          if (cell.meta.leftBoundary != null && cell.meta.rightBoundary != null) {
            cell.meta.width = Math.max(0, cell.meta.rightBoundary - cell.meta.leftBoundary);
          }
          const rightBorder = lastCell.meta.borders?.right;
          if (rightBorder) {
            cell.meta.borders = {
              ...(cell.meta.borders || {}),
              right: rightBorder,
            };
          }
        }
      }
    }
  }

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex]!;
    for (const cell of row.cells) {
      if (cell.hidden) continue;
      const vertMerge = cell.meta?.vertMerge || 0;
      if (vertMerge === 1) {
        continue;
      }
      if (vertMerge > 1) {
        let nextIndex = rowIndex + 1;
        while (nextIndex < rows.length) {
          let canMerge = true;
          for (let col = cell.colIndex || 0; col < (cell.colIndex || 0) + (cell.colspan || 1); col += 1) {
            const nextCell = rows[nextIndex]!.cells[col];
            if (!nextCell || (nextCell.meta?.vertMerge || 0) !== 1) {
              canMerge = false;
              break;
            }
          }
          if (!canMerge) break;
          for (let col = cell.colIndex || 0; col < (cell.colIndex || 0) + (cell.colspan || 1); col += 1) {
            rows[nextIndex]!.cells[col]!.hidden = true;
          }
          cell.rowspan = (cell.rowspan || 1) + 1;
          nextIndex += 1;
        }
        const bottomCell = rows[nextIndex - 1]?.cells[cell.colIndex || 0];
        const bottomBorder = bottomCell?.meta?.borders?.bottom;
        if (cell.meta && bottomCell?.meta && bottomCell !== cell && bottomBorder) {
          cell.meta.borders = {
            ...(cell.meta.borders || {}),
            bottom: bottomBorder,
          };
        }
      }
    }
  }

  // HTML tables need one shared column grid even when Word stores a different
  // TDefTable boundary list per row (usually because cells are merged). Map
  // every visible cell back onto the union of physical boundaries so colspan
  // preserves the original geometry instead of squeezing later row cells.
  const boundaries = Array.from(new Set(rows.flatMap((row) => row.cells.flatMap((cell) => {
    const left = cell.meta?.leftBoundary;
    const right = cell.meta?.rightBoundary;
    return [left, right].filter((value): value is number => value != null);
  })))).sort((left, right) => left - right);
  if (boundaries.length > 1) {
    for (const row of rows) {
      for (const cell of row.cells) {
        if (!cell.meta) continue;
        const leftIndex = boundaries.indexOf(cell.meta.leftBoundary ?? Number.NaN);
        const rightIndex = boundaries.indexOf(cell.meta.rightBoundary ?? Number.NaN);
        if (leftIndex >= 0) cell.colIndex = leftIndex;
        if (!cell.hidden && leftIndex >= 0 && rightIndex > leftIndex) {
          cell.colspan = rightIndex - leftIndex;
        }
      }
    }
  }
}

function resolveTableGridBorders(rows: TableRowBlock[]): void {
  const hasOwnBorder = (borders: Record<string, unknown>, side: string) => (
    Object.prototype.hasOwnProperty.call(borders, side) && (() => {
      const border = borders[side] as { borderType?: number; nil?: boolean } | undefined;
      // An all-zero BRC is an empty cell-level value and still inherits the
      // table edge/inside border. NilBrc is the explicit "no border" value.
      return Boolean(border?.nil || border?.borderType);
    })()
  );
  rows.forEach((row, rowIndex) => {
    row.cells.forEach((cell) => {
      if (cell.hidden || !cell.meta) return;
      const explicit = { ...(cell.meta.borders || {}) };
      const table = row.state.borders || {};
      const startColumn = cell.colIndex || 0;
      const endColumn = startColumn + (cell.colspan || 1);
      const endRow = rowIndex + (cell.rowspan || 1);
      const assignFallback = (side: string, border: typeof table.top) => {
        if (!hasOwnBorder(explicit, side) && border) explicit[side] = border;
      };
      assignFallback('top', rowIndex === 0 ? table.top : table.horizontalInside);
      assignFallback('bottom', endRow >= rows.length ? table.bottom : table.horizontalInside);
      assignFallback('left', startColumn === 0 ? table.left : table.verticalInside);
      assignFallback('right', endColumn >= row.cells.length ? table.right : table.verticalInside);
      cell.meta.borders = explicit;
    });
  });
}

function paragraphToBlock(paragraph: ParagraphModel): ParagraphBlock {
  return {
    type: 'paragraph',
    id: paragraph.id,
    styleId: paragraph.styleId,
    styleName: paragraph.styleName,
    paraState: paragraph.paraState,
    inlines: paragraph.inlines,
    text: paragraph.text,
  };
}

function tableGridSignature(paragraph: ParagraphModel): string {
  const cells = applyTableStateToCells(paragraph.tableState);
  if (!cells.length) return '';
  const state = paragraph.tableState;
  const border = (side: keyof typeof state.borders) => {
    const value = state.borders?.[side];
    return `${value?.borderType ?? ''}:${value?.lineWidth ?? ''}:${value?.nil ? 1 : 0}`;
  };
  return [
    cells[0]?.leftBoundary ?? '',
    cells[cells.length - 1]?.rightBoundary ?? '',
    state.alignment ?? '',
    state.leftIndent ?? '',
    state.gapHalf ?? '',
    state.rtl ? 1 : 0,
    border('top'),
    border('left'),
    border('bottom'),
    border('right'),
    border('horizontalInside'),
    border('verticalInside'),
  ].join('|');
}

function inheritRowEndTableState(paragraph: ParagraphModel, rowEnd: ParagraphModel): void {
  paragraph.paraState.inTable = true;
  paragraph.paraState.itap = Math.max(rowEnd.paraState.itap || 1, paragraph.paraState.itap || 0);
  paragraph.tableState = rowEnd.tableState;
  paragraph.tableProps = rowEnd.tableProps;
}

export function normalizeRowEndOnlyTables(paragraphs: ParagraphModel[]): void {
  for (let index = 0; index < paragraphs.length; index += 1) {
    const rowEnd = paragraphs[index]!;
    const cellCount = applyTableStateToCells(rowEnd.tableState).length;
    if (!rowEnd.paraState.tableRowEnd || !cellCount) continue;

    rowEnd.paraState.inTable = true;
    rowEnd.paraState.itap = Math.max(1, rowEnd.paraState.itap || 0);

    let remainingCells = cellCount;
    let cursor = index - 1;
    const rowParagraphs: ParagraphModel[] = [];
    for (; cursor >= 0 && remainingCells > 0; cursor -= 1) {
      const paragraph = paragraphs[cursor]!;
      if (paragraph.paraState.tableRowEnd || paragraph.paraState.innerTableRowEnd) break;
      rowParagraphs.push(paragraph);
      if (paragraph.terminator === DOC_CONTROL.cellMark) remainingCells -= 1;
    }

    if (remainingCells > 0) continue;

    // Some Word/WPS producers store all table properties only on the row-end
    // PAPX. Paragraph marks inside a cell then look like ordinary paragraphs.
    // When the immediately preceding row has the same outer grid and table
    // border identity, everything between the two row terminators belongs to
    // the current row, including leading paragraphs in its first cell.
    let previousRowEndIndex = cursor;
    while (
      previousRowEndIndex >= 0
      && !paragraphs[previousRowEndIndex]!.paraState.tableRowEnd
      && !paragraphs[previousRowEndIndex]!.paraState.innerTableRowEnd
      && paragraphs[previousRowEndIndex]!.terminator !== DOC_CONTROL.cellMark
    ) {
      previousRowEndIndex -= 1;
    }
    const previousRowEnd = paragraphs[previousRowEndIndex];
    if (
      previousRowEnd?.paraState.tableRowEnd
      && tableGridSignature(previousRowEnd) === tableGridSignature(rowEnd)
    ) {
      for (let leading = previousRowEndIndex + 1; leading < index; leading += 1) {
        const paragraph = paragraphs[leading]!;
        if (!rowParagraphs.includes(paragraph)) rowParagraphs.push(paragraph);
      }
    }

    rowParagraphs.forEach((paragraph) => inheritRowEndTableState(paragraph, rowEnd));
  }
}

function buildTableBlock(tableParagraphs: ParagraphModel[]): TableBlock {
  const rows: TableRowBlock[] = [];
  let pendingRow: { cells: TableCellBlock[] } = { cells: [] };
  let pendingCellParagraphs: ParagraphModel[] = [];

  for (const paragraph of tableParagraphs) {
    pendingCellParagraphs.push(paragraph);
    if (paragraph.terminator === DOC_CONTROL.cellMark) {
      pendingRow.cells.push({
        id: uniqueId('cell'),
        paragraphs: pendingCellParagraphs.map(paragraphToBlock),
        meta: null,
      });
      pendingCellParagraphs = [];

      if (paragraph.paraState.tableRowEnd || paragraph.paraState.innerTableRowEnd) {
        const cellDefs = applyTableStateToCells(paragraph.tableState);
        while (
          cellDefs.length &&
          pendingRow.cells.length > cellDefs.length &&
          pendingRow.cells[pendingRow.cells.length - 1]!.paragraphs.every((block) => !block.text && !(block.inlines || []).length)
        ) {
          pendingRow.cells.pop();
        }
        pendingRow.cells.forEach((cell, index) => {
          cell.meta = cellDefs[index] || { index };
        });
        const gridWidthTwips = cellDefs.length
          ? ((cellDefs[cellDefs.length - 1]!.rightBoundary || 0) - (cellDefs[0]!.leftBoundary || 0))
          : 0;
        rows.push({
          id: uniqueId('row'),
          cells: pendingRow.cells,
          state: paragraph.tableState,
          gridWidthTwips,
        });
        pendingRow = { cells: [] };
      }
    }
  }

  if (pendingCellParagraphs.length) {
    pendingRow.cells.push({ id: uniqueId('cell'), paragraphs: pendingCellParagraphs.map(paragraphToBlock), meta: null });
  }
  if (pendingRow.cells.length) {
    rows.push({ id: uniqueId('row'), cells: pendingRow.cells, state: tableParagraphs[0]?.tableState || tablePropsToState([]), gridWidthTwips: 0 });
  }

  finalizeTableGrid(rows);
  resolveTableGridBorders(rows);

  const gridWidthTwips = rows.find((row) => row.gridWidthTwips)?.gridWidthTwips || 0;
  const depth = Math.max(...tableParagraphs.map((paragraph) => getTableDepth(paragraph.paraState)), 1);

  return {
    type: 'table',
    id: uniqueId('table'),
    depth,
    rows,
    state: rows[0]?.state || tablePropsToState([]),
    gridWidthTwips,
  };
}

function buildBlocks(paragraphs: ParagraphModel[]): MsDocParseResult['blocks'] {
  const blocks: MsDocParseResult['blocks'] = [];
  let index = 0;
  while (index < paragraphs.length) {
    const paragraph = paragraphs[index]!;
    const depth = getTableDepth(paragraph.paraState);
    if (depth <= 0) {
      blocks.push(paragraphToBlock(paragraph));
      index += 1;
      continue;
    }
    const tableParagraphs: ParagraphModel[] = [];
    while (index < paragraphs.length && getTableDepth(paragraphs[index]!.paraState) > 0) {
      tableParagraphs.push(paragraphs[index]!);
      index += 1;
    }
    blocks.push(buildTableBlock(tableParagraphs));
  }
  return blocks;
}

/**
 * Main MS-DOC entry point.
 * It parses the OLE container, restores text through the piece table, resolves
 * paragraph/character/table properties, and finally produces a normalized AST
 * that the HTML renderer can consume.
 */
export function parseMsDoc(input: ArrayBuffer | Uint8Array | ArrayBufferView, options: MsDocParseOptions = {}): MsDocParseResult {
  const warnings = [] as MsDocParseResult['warnings'];
  const cfb = parseCFB(input, options);
  warnings.push(...(cfb.warnings || []));

  const wordBytes = cfb.getStream('/WordDocument');
  if (!wordBytes) throw new Error('Missing WordDocument stream');

  const fib = parseFib(wordBytes);
  if (fib.base.wIdent !== 0xA5EC) {
    pushWarning(warnings, `Unexpected FIB identifier: 0x${fib.base.wIdent.toString(16)}`);
  }
  if (fib.base.fEncrypted) {
    throw new Error('Encrypted .doc files are not supported yet');
  }

  const tableBytes = cfb.getStream(fib.base.fWhichTblStm ? '/1Table' : '/0Table');
  if (!tableBytes) throw new Error('Missing table stream');

  const dataBytes = cfb.getStream('/Data') || new Uint8Array(0);
  const clx = parseClx(tableBytes, fib.fibRgFcLcb);
  const pieceTexts = buildPieceTextCache(wordBytes, clx);
  const documentText = pieceTexts.join('');
  const stories = getDocumentStoryRanges(fib, documentText.length);
  const mainStory = stories.find((story) => story.kind === 'main') || { kind: 'main' as const, cpStart: 0, cpEnd: documentText.length };
  const supplementalTextStories = stories.filter((story) => (
    (story.kind === 'textbox' || story.kind === 'header-textbox')
    && normalizeParagraphText(documentText.slice(story.cpStart, story.cpEnd)).replace(/[\r\u0007]/g, '').trim().length > 0
  ));

  const styles = parseStyles(tableBytes, fib.fibRgFcLcb);
  const fonts = parseFonts(tableBytes, fib.fibRgFcLcb);
  const relevantStoryEnd = Math.max(mainStory.cpEnd, ...supplementalTextStories.map((story) => story.cpEnd));
  const chpxRuns = readChpxRuns(wordBytes, tableBytes, fib, clx)
    .filter((run) => run.cpStart < relevantStoryEnd)
    .map((run) => ({ ...run, cpEnd: Math.min(run.cpEnd, relevantStoryEnd) }));
  const papxRuns = readPapxRuns(wordBytes, tableBytes, fib, clx, dataBytes)
    .filter((run) => run.cpStart < relevantStoryEnd)
    .map((run) => ({ ...run, cpEnd: Math.min(run.cpEnd, relevantStoryEnd) }));

  const ranges: Array<ParagraphRange & { storyKind: StoryRange['kind'] }> = [mainStory, ...supplementalTextStories]
    .flatMap((story) => buildStoryParagraphRanges(story, documentText, papxRuns));
  if (supplementalTextStories.length) {
    pushWarning(
      warnings,
      'Recovered text from a legacy Word text-box story; text-box positioning is unavailable, so the content was linearized after the main story.',
      { code: 'MSDOC_TEXTBOX_STORY_LINEARIZED', storyCount: supplementalTextStories.length },
    );
  }

  const objectPool = extractObjectPool(cfb);
  const assets: MsDocAsset[] = [];
  const usedAttachmentNames = new Set<string>();
  const assetCache = new Map<number, MsDocAsset | null>();
  const resolveAsset = createAssetResolver(dataBytes, objectPool, assets, usedAttachmentNames, assetCache, options);
  const chpxCursor = { index: 0 };

  const paragraphs = ranges.flatMap((range) => {
    const rawParagraphText = getTextByCp(wordBytes, clx, pieceTexts, range.cpStart, range.cpEnd);
    const terminator = range.terminator === DOC_CONTROL.paragraph || range.terminator === DOC_CONTROL.cellMark ? range.terminator : '';
    const rawContent = terminator && rawParagraphText.endsWith(terminator)
      ? rawParagraphText.slice(0, -1)
      : rawParagraphText;
    const paragraphText = normalizeParagraphText(rawContent);
    const isTextBoxStory = range.storyKind === 'textbox' || range.storyKind === 'header-textbox';
    if ((rawContent.includes(DOC_CONTROL.textBoxPlaceholder) || isTextBoxStory) && !paragraphText.trim()) return [];
    return [buildParagraphModel({ ...range, terminator }, paragraphText, styles, fonts, chpxRuns, resolveAsset, chpxCursor)];
  });

  normalizeRowEndOnlyTables(paragraphs);
  const blocks = buildBlocks(paragraphs);
  const trailingAttachments = Array.from(objectPool.values())
    .filter((item) => item?.attachment && !usedAttachmentNames.has(item.entry.name))
    .map((item) => item.attachment as AttachmentAsset);

  for (const attachment of trailingAttachments) assets.push(attachment);
  if (trailingAttachments.length) {
    blocks.push({ type: 'attachments', id: uniqueId('attachments'), items: trailingAttachments });
  }

  return {
    kind: 'msdoc',
    version: 1,
    warnings,
    meta: {
      fib: {
        wIdent: fib.base.wIdent,
        nFib: fib.base.nFib,
        fWhichTblStm: fib.base.fWhichTblStm,
        fComplex: fib.base.fComplex,
        fEncrypted: fib.base.fEncrypted,
        ccpText: fib.fibRgLw.ccpText,
      },
      counts: {
        paragraphs: paragraphs.length,
        blocks: blocks.length,
        assets: assets.length,
        styles: styles.styles.size,
        fonts: fonts.fonts.length,
      },
    },
    fonts: fonts.fonts,
    styles: Array.from(styles.styles.values()).map((style) => ({
      istd: style.istd,
      name: style.name,
      type: style.stdfBase?.stk,
      basedOn: style.stdfBase?.istdBase,
      next: style.stdfBase?.istdNext,
    })),
    blocks,
    assets,
  };
}
