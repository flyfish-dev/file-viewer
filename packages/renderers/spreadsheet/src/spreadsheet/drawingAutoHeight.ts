import type { SheetRowAnchor } from './worker/type.js'
import type { VirtualSheetState } from './state.js'

const offsets = new WeakMap<
  VirtualSheetState,
  { revision: number; rows: number[]; sums: number[] }
>()
const offsetBefore = (state: VirtualSheetState, row: number) => {
  let cache = offsets.get(state)
  if (!cache || cache.revision !== state.autoHeightRevision) {
    const entries = [...state.autoRowHeights]
      .filter(
        ([index]) =>
          !state.rowHeightOverrides.has(index) &&
          !state.fixedHeightRows.has(index),
      )
      .map(([index, height]) => [
        index,
        Math.max(
          0,
          height -
            (state.sourceRowHeights.get(index) ?? state.defaults.rowHeight),
        ),
      ])
      .filter(([, delta]) => delta > 0)
      .sort((a, b) => a[0] - b[0])
    let sum = 0
    cache = {
      revision: state.autoHeightRevision,
      rows: entries.map(([index]) => index),
      sums: entries.map(([, delta]) => (sum += delta)),
    }
    offsets.set(state, cache)
  }
  let left = 0,
    right = cache.rows.length
  while (left < right) {
    const middle = (left + right) >>> 1
    if (cache.rows[middle] < row) left = middle + 1
    else right = middle
  }
  return left ? cache.sums[left - 1] : 0
}

/** Derived from immutable source geometry and auto-only deltas; zoom never accumulates. */
export const applyAutoRowDrawingGeometry = <
  T extends { top: number; height: number; rowAnchor?: SheetRowAnchor },
>(
  item: T,
  state: VirtualSheetState,
): T => {
  const anchor = item.rowAnchor
  if (!anchor || anchor.mode === 'absolute') return item
  const topDelta = offsetBefore(state, anchor.fromRow)
  const bottomDelta =
    anchor.mode === 'cell'
      ? offsetBefore(state, anchor.fromRow + 1)
      : anchor.mode === 'twoCell' && anchor.toRow !== undefined
        ? offsetBefore(state, anchor.toRow)
        : topDelta
  return {
    ...item,
    top: item.top + topDelta,
    height: Math.max(0.1, item.height + bottomDelta - topDelta),
  }
}
