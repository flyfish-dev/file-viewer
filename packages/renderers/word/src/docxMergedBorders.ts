/** A rendered vertical merge retains hidden continuation cells in the source grid.
 * HTML paints the rowspan origin, not the final continuation. Transfer only the
 * resolved bottom edge of a complete, unambiguous chain to that visible origin.
 * This does not change the AST, text, span attributes, or other three edges.
 */
interface MergeChain {
  origin: HTMLTableCellElement
  group: Element | null
  endRow: number
  columns: number
}

export function normalizeDocxMergedCellBorders(root: HTMLElement): number {
  const tables = Array.from(root.querySelectorAll<HTMLTableElement>('table'))
  if (root.localName === 'table') tables.unshift(root as HTMLTableElement)
  let changed = 0
  for (const table of tables) {
    const rows = Array.from(table.rows)
    const active = new Map<number, MergeChain>()
    rows.forEach((row, index) => {
      // A hidden row is not proof of a vertical-merge continuation.
      if (row.style.display === 'none') { active.clear(); return }
      const continued = new Set<number>()
      let column = 0
      // row.cells contains direct cells only; nested tables have their own grid.
      for (const cell of Array.from(row.cells)) {
        const columns = cell.colSpan
        const hidden = cell.style.display === 'none'
        const chain = active.get(column)
        if (chain) {
          if (hidden && cell.rowSpan === 1 && columns === chain.columns && row.parentElement === chain.group) {
            continued.add(column)
            if (index === chain.endRow) {
              // Preserve original physical units and explicit `none`/nil. An
              // absent resolved edge is not permission to invent a border.
              const bottom = cell.style.getPropertyValue('border-bottom')
              const priority = cell.style.getPropertyPriority('border-bottom')
              if (bottom && (chain.origin.style.getPropertyValue('border-bottom') !== bottom ||
                chain.origin.style.getPropertyPriority('border-bottom') !== priority)) {
                chain.origin.style.setProperty('border-bottom', bottom, priority)
                changed++
              }
              active.delete(column)
            }
          } else {
            active.delete(column)
          }
        }
        if (!hidden && cell.rowSpan > 1 && index + cell.rowSpan <= rows.length) {
          active.set(column, { origin: cell, group: row.parentElement, endRow: index + cell.rowSpan - 1, columns })
          continued.add(column)
        }
        // Hidden continuation cells still occupy a logical source-grid slot.
        column += columns
      }
      for (const [start, chain] of active) {
        if (!continued.has(start) || chain.endRow <= index) active.delete(start)
      }
    })
  }
  return changed
}
