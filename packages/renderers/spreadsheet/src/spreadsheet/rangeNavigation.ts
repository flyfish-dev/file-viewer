import type {
  FileViewerSpreadsheetRange, FileViewerSpreadsheetNavigationStatus,
  FileViewerViewState, FileViewerViewStateProvider,
} from '@file-viewer/core';

type Options = {
  ready: Promise<void>;
  isVisibleSheet: (sheetId: number) => boolean;
  getScale: () => number;
  jump: (range: FileViewerSpreadsheetRange) => void;
  clearJump: () => void;
};

const validRange = (range: FileViewerSpreadsheetRange) =>
  ['sheetId', 'startRow', 'startCol', 'endRow', 'endCol'].every(key => {
    const value = range[key as keyof FileViewerSpreadsheetRange];
    return Number.isSafeInteger(value) && value >= 0;
  }) && range.startRow <= range.endRow && range.startCol <= range.endCol &&
  range.endRow < 1048576 && range.endCol < 16384;

/** Coordinate request lifetime, independent of the grid and workbook parser. */
export const createSpreadsheetRangeNavigation = (options: Options) => {
  let sequence = 0;
  let stopped: 'failed' | 'disposed' | undefined;
  let status: FileViewerSpreadsheetNavigationStatus = 'idle';
  let highlighted: FileViewerSpreadsheetRange | undefined;
  let pending: { range: FileViewerSpreadsheetRange; resolve: (state: FileViewerViewState) => void } | undefined;
  const snapshot = (result = status): FileViewerViewState => ({
    renderer: 'spreadsheet-openxml', scale: options.getScale(),
    spreadsheet: { range: highlighted ? { ...highlighted } : undefined, status: result },
  });
  const settle = (result: FileViewerSpreadsheetNavigationStatus) => {
    status = result;
    const request = pending;
    pending = undefined;
    request?.resolve(snapshot());
  };
  const cancel = (result: 'cancelled' | 'failed' | 'disposed' = 'cancelled') => {
    sequence += 1;
    if (result !== 'cancelled') stopped = result;
    highlighted = undefined;
    options.clearJump();
    settle(result);
  };
  const provider: FileViewerViewStateProvider = {
    getState: snapshot,
    async applyState(state) {
      const input = state.spreadsheet?.range;
      if (!input) return snapshot();
      const range = { ...input };
      cancel();
      if (!validRange(range)) { settle('rejected'); return snapshot(); }
      const requestSequence = sequence;
      await options.ready;
      if (stopped) return snapshot(stopped);
      if (requestSequence !== sequence) return snapshot('cancelled');
      if (!options.isVisibleSheet(range.sheetId)) { settle('rejected'); return snapshot(); }
      status = 'pending';
      return new Promise<FileViewerViewState>(resolve => {
        pending = { range, resolve };
        options.jump(range);
      });
    },
  };
  return {
    provider, cancel,
    isPending: () => !!pending,
    /** Called after the target virtual window loads, before drawing the highlight. */
    prepare(totalRows: number, totalCols: number) {
      const request = pending;
      if (!request) return null;
      if (request.range.endRow >= totalRows || request.range.endCol >= totalCols) {
        highlighted = undefined;
        options.clearJump();
        settle('rejected');
        return null;
      }
      highlighted = { ...request.range };
      return () => { if (pending === request) settle('applied'); };
    },
    contains(sheetId: number, row: number, col: number) {
      return !!highlighted && highlighted.sheetId === sheetId &&
        row >= highlighted.startRow && row <= highlighted.endRow &&
        col >= highlighted.startCol && col <= highlighted.endCol;
    },
  };
};
