interface RenderedCell {
  drawY: number
  visibleHeight: number
  getOverlayerViewsStyle(): Record<string, string>
  isInside(x: number, y: number): boolean
  isInsideVisible(x: number, y: number): boolean
}

interface RenderedRow {
  rowIndex: number
  y: number
  height: number
  cells: RenderedCell[]
}

interface TableContext {
  body: {
    y: number
    visibleHeight: number
    visibleWidth: number
    data: unknown[]
    renderRows: RenderedRow[]
  }
  canvasElement: HTMLCanvasElement
  database: { getPositionForRowIndex(index: number): { top: number; bottom: number; height: number } }
  header: { width: number }
  scrollY: number
}

interface TableBody {
  renderRows: RenderedRow[]
  update(): void
  draw(): void
}

function clipCell(cell: RenderedCell, minY: number, maxY: number) {
  const top = Math.max(0, minY - cell.drawY)
  const bottom = Math.max(0, cell.drawY + cell.visibleHeight - maxY)
  if (!top && !bottom) return

  for (const hitTest of ['isInside', 'isInsideVisible'] as const) {
    const original = cell[hitTest].bind(cell)
    cell[hitTest] = (x, y) => y >= minY && y < maxY && original(x, y)
  }
  const originalStyle = cell.getOverlayerViewsStyle.bind(cell)
  cell.getOverlayerViewsStyle = () => ({
    ...originalStyle(),
    clipPath: `inset(${top}px 0 ${bottom}px 0)`,
  })
}

/** Bridge the pinned e-virt-table canvas and DOM renderer without remapping sheet indexes. */
export function installFrozenRows(table: unknown, getRequestedCount: () => number) {
  const { body, ctx } = table as { body?: TableBody; ctx: TableContext }
  const layout = { count: 0, height: 0 }
  if (!body || typeof body.update !== 'function' || typeof body.draw !== 'function') return layout

  const update = body.update.bind(body)
  const draw = body.draw.bind(body)
  let frozen: RenderedRow[] = []
  let scrolling: RenderedRow[] = []

  body.update = () => {
    update()
    layout.count = 0
    layout.height = 0
    frozen = []
    scrolling = []
    const requestedCount = Math.min(getRequestedCount(), ctx.body.data.length)
    const sample = body.renderRows[0]
    if (!requestedCount || !sample || ctx.body.visibleHeight <= 0) return

    const positions = ctx.database
    // Leave room to scroll on layouts where the saved pane is larger than the viewport.
    const limit = ctx.body.visibleHeight - Math.min(24, ctx.body.visibleHeight / 4)
    let low = 0
    let high = requestedCount
    while (low < high) {
      const mid = Math.ceil((low + high) / 2)
      if (positions.getPositionForRowIndex(mid - 1).bottom <= limit) low = mid
      else high = mid - 1
    }
    if (!low) return

    layout.count = low
    layout.height = positions.getPositionForRowIndex(low - 1).bottom
    const cut = ctx.body.y + layout.height
    const end = ctx.body.y + ctx.body.visibleHeight
    scrolling = body.renderRows.filter(row => row.rowIndex >= low)
    for (let index = 0; index < low; index += 1) {
      const { top, height } = positions.getPositionForRowIndex(index)
      if (height <= 0.1) continue
      const row = Reflect.construct(sample.constructor, [
        ctx, index, 0, ctx.body.y + top + ctx.scrollY, ctx.header.width, height, ctx.body.data[index],
      ]) as RenderedRow
      row.cells.forEach(cell => clipCell(cell, ctx.body.y, cut))
      frozen.push(row)
    }
    for (const row of scrolling) {
      row.cells.forEach(cell => clipCell(cell, cut, end))
    }
    // The event dispatcher searches these rows in order. Pinned cells win at the cut.
    body.renderRows = [...frozen, ...scrolling]
    ctx.body.renderRows = body.renderRows
  }

  body.draw = () => {
    if (!layout.height) {
      draw()
      return
    }
    const canvas = ctx.canvasElement.getContext('2d')
    if (!canvas) return
    const allRows = body.renderRows
    const top = ctx.body.y
    try {
      for (const [rows, y, height] of [
        [scrolling, top + layout.height, ctx.body.visibleHeight - layout.height],
        [frozen, top, layout.height],
      ] as const) {
        body.renderRows = rows
        canvas.save()
        try {
          canvas.beginPath()
          canvas.rect(0, y, ctx.body.visibleWidth, height)
          canvas.clip()
          draw()
        } finally {
          canvas.restore()
        }
      }
    } finally {
      body.renderRows = allRows
    }
  }

  return layout
}
