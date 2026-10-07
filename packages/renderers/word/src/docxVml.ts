/** Original SVG attributes, retained weakly so a disposed document can be collected. */
type Viewport = { x: string, y: string, width: string, height: string, transform: string | null }
const authoredViewports = new WeakMap<SVGForeignObjectElement, Viewport>()
const coordinate = /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/
const finitePositive = (value: number) => Number.isFinite(value) && value > 0 && value < 1e6

/**
 * The VML renderer uses point-sized SVG user units; foreignObject lays out HTML
 * physical lengths as CSS pixels. Without a compensating viewport the SVG's
 * point-to-pixel scale is applied to every HTML font size a second time. Expand
 * the foreign viewport and inversely scale its coordinate system, preserving
 * the same outer box, original font declarations, clipping and text nodes.
 *
 * Limit the correction to the engine's anchored VML root and its untransformed
 * text boxes. Nested/group-transformed SVG has separate text scaling semantics.
 */
export function normalizeDocxVmlTextViewports(section: HTMLElement): number {
  const view = section.ownerDocument.defaultView
  if (!view) return 0
  const style = view.getComputedStyle(section)
  const px = (value: string) => Number.parseFloat(value) || 0
  const width = px(style.width) + (style.boxSizing === 'border-box' ? 0 :
    px(style.borderLeftWidth) + px(style.borderRightWidth) + px(style.paddingLeft) + px(style.paddingRight))
  const zoom = width > 0 ? section.getBoundingClientRect().width / width : 0
  if (!finitePositive(zoom)) return 0
  let count = 0
  for (const root of section.querySelectorAll<SVGSVGElement>('svg[data-docx-float="true"]')) {
    if (root.ownerSVGElement) continue
    for (const box of root.querySelectorAll<SVGForeignObjectElement>('foreignObject')) {
      if (box.ownerSVGElement !== root || box.firstElementChild?.namespaceURI !== 'http://www.w3.org/1999/xhtml') continue
      let transformed = false
      for (let p = box.parentElement; p && p !== (root as Element); p = p.parentElement) {
        if (p.hasAttribute('transform') || (view.getComputedStyle(p).transform &&
          view.getComputedStyle(p).transform !== 'none')) { transformed = true; break }
      }
      if (transformed) continue
      const original = authoredViewports.get(box) ?? {
        x: box.getAttribute('x') ?? '0', y: box.getAttribute('y') ?? '0',
        width: box.getAttribute('width') ?? '', height: box.getAttribute('height') ?? '',
        transform: box.getAttribute('transform')
      }
      if (original.transform || ![original.x, original.y, original.width, original.height].every(v => coordinate.test(v)) ||
        !finitePositive(Number(original.width)) || !finitePositive(Number(original.height))) continue
      const matrix = root.getScreenCTM()
      if (!matrix) continue
      const sx = Math.hypot(matrix.a, matrix.b) / zoom, sy = Math.hypot(matrix.c, matrix.d) / zoom
      if (!finitePositive(sx) || !finitePositive(sy)) continue
      // Rotation is harmless; skew would require a separate layout policy.
      if (Math.abs(matrix.a * matrix.c + matrix.b * matrix.d) > 1e-5 * zoom * zoom * sx * sy) continue
      const dimensions = [Number(original.x) * sx, Number(original.y) * sy, Number(original.width) * sx, Number(original.height) * sy]
      if (dimensions.some(v => !Number.isFinite(v) || Math.abs(v) >= 1e6)) continue
      authoredViewports.set(box, original)
      for (const [i, name] of ['x', 'y', 'width', 'height'].entries()) box.setAttribute(name, dimensions[i].toFixed(8))
      box.setAttribute('transform', `scale(${(1 / sx).toFixed(12)} ${(1 / sy).toFixed(12)})`)
      count++
    }
  }
  return count
}
