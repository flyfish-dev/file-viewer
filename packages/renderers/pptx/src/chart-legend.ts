import type { PptxChartFont, PptxChartOptions } from './chart-types';
import { applyPptxChartFont } from './chart-text';

/** Billboard only provides outside bottom/right legends. Preserve the other
 * DrawingML placements without changing the authored outer chart frame. */
export const createPptxChartLegend = (
  surface: HTMLElement, chart: any, legend?: PptxChartOptions['legend'], font?: PptxChartFont,
) => {
  const document = surface.ownerDocument;
  const view = document?.defaultView;
  if (!view || legend?.show === false || !(legend?.overlay || ['t', 'tr', 'l'].includes(legend?.position || ''))) return;
  const left = legend?.position === 'l' || legend?.position === 'r';
  const layout = document.createElement('div');
  layout.className = 'pptx-chart-layout';
  layout.style.cssText = `display:flex;flex-direction:${left ? 'row' : 'column'};width:100%;height:100%;min-width:0;min-height:0;position:relative`;
  surface.replaceWith(layout);
  const list = document.createElement('div');
  list.className = 'pptx-chart-legend';
  list.setAttribute('role', 'group');
  list.setAttribute('aria-label', 'Chart legend');
  list.style.cssText = `display:flex;flex:${left ? '0 1 auto' : '0 0 auto'};flex-direction:${left ? 'column' : 'row'};flex-wrap:${left ? 'nowrap' : 'wrap'};gap:4px 12px;align-items:${left ? 'stretch' : 'center'};justify-content:${legend?.position === 'tr' ? 'flex-end' : 'center'};box-sizing:border-box;padding:4px;overflow:auto;${left ? 'max-width:50%' : 'max-height:50%'};font:12px sans-serif`;
  applyPptxChartFont(list.style, font);
  if (legend?.overlay) {
    list.style.position = 'absolute';
    list.style.zIndex = '1';
    list.style[legend.position === 'b' ? 'bottom' : 'top'] = '0';
    list.style[legend.position === 'tr' || legend.position === 'r' ? 'right' : 'left'] = '0';
    if (left) list.style.height = '100%';
    else list.style.width = '100%';
  }
  // Prevent the surface's 100% basis from pushing a non-overlay legend outside
  // the frame. Flex assigns only the remaining logical area to the plot.
  surface.style.width = left ? '0' : '100%';
  surface.style.height = left ? '100%' : '0';
  surface.style.alignSelf = 'stretch';
  if (legend?.overlay) surface.style.width = surface.style.height = '100%';
  layout.append(list, surface);
  const xs = new Set(Object.values(chart.data?.xs || {}).map(String));
  const entries = (chart.data?.columns || []).filter((column: unknown[]) => !xs.has(String(column[0])))
    .map((column: unknown[]) => {
      const id = String(column[0]);
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-pressed', 'true');
      button.style.cssText = 'display:inline-flex;flex:0 0 auto;align-items:center;gap:4px;min-width:0;max-width:100%;border:0;padding:2px;background:none;color:inherit;font:inherit;text-align:start;cursor:pointer';
      const swatch = document.createElement('span');
      swatch.setAttribute('aria-hidden', 'true');
      swatch.style.cssText = 'display:inline-block;flex:0 0 10px;width:10px;height:10px';
      const text = document.createElement('span');
      text.className = 'pptx-chart-legend-label';
      text.style.cssText = 'min-width:0;overflow-wrap:anywhere';
      text.textContent = String(chart.data?.names?.[id] ?? id) || '\u200b';
      button.append(swatch, text);
      list.append(button);
      return { id, button, swatch };
    });
  chart.legend = { ...chart.legend, show: false };
  let observer: ResizeObserver | undefined;
  let instance: any;
  let width = 0, height = 0;
  return {
    size() {
      return { width: surface.clientWidth, height: surface.clientHeight };
    },
    bind(api: any) {
      instance = api;
      for (const { id, button, swatch } of entries) {
        swatch.style.backgroundColor = api.color?.(id) || 'currentColor';
        button.onclick = () => {
          api.toggle?.(id);
          const visible = button.getAttribute('aria-pressed') !== 'true';
          button.setAttribute('aria-pressed', String(visible));
          button.style.opacity = visible ? '1' : '.45';
        };
        button.onmouseenter = () => api.focus?.(id);
        button.onmouseleave = () => api.revert?.();
      }
      if (view.ResizeObserver) {
        observer = new view.ResizeObserver(([entry]) => {
          const { width: nextWidth, height: nextHeight } = entry.contentRect;
          if (nextWidth > 0 && nextHeight > 0 && (Math.abs(nextWidth - width) > .5 || Math.abs(nextHeight - height) > .5)) {
            width = nextWidth; height = nextHeight;
            instance?.resize?.({ width, height });
          }
        });
        observer.observe(surface);
      }
    },
    destroy() {
      observer?.disconnect();
      instance = undefined;
      for (const { button } of entries) button.onclick = button.onmouseenter = button.onmouseleave = null;
      layout.remove();
    },
  };
};
