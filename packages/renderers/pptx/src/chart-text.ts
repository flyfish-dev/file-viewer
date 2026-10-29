import type { PptxChartFont, PptxChartModel } from './chart-types';
import { resolvePptxChartAxes } from './chart-config';

export const mergePptxChartFonts = (...fonts: Array<PptxChartFont | undefined>): PptxChartFont =>
  Object.assign({}, ...fonts.map(font => Object.fromEntries(
    Object.entries(font || {}).filter(([, value]) => value !== undefined),
  )));

/** CSSOM property assignment keeps document font names out of stylesheet source. */
export const applyPptxChartFont = (style: CSSStyleDeclaration, font?: PptxChartFont) => {
  if (!font) return;
  const families = [...new Set([font.family, font.eastAsianFamily, font.complexScriptFamily]
    .filter((value): value is string => typeof value === 'string' && !!value.trim())
    .filter(value => !/^\+(?:mj|mn)-(?:lt|ea|cs)$/.test(value))
    .map(value => /^(?:serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|emoji|math|fangsong)$/i.test(value.trim())
      ? value.trim().toLowerCase() : JSON.stringify(value.slice(0, 512))))];
  if (families.length) style.fontFamily = [...families, 'sans-serif'].join(',');
  if (typeof font.sizePt === 'number' && Number.isFinite(font.sizePt) && font.sizePt > 0 && font.sizePt <= 4000) {
    style.fontSize = `${font.sizePt * 96 / 72}px`;
  }
  if (font.bold !== undefined) style.fontWeight = font.bold ? 'bold' : 'normal';
  if (font.italic !== undefined) style.fontStyle = font.italic ? 'italic' : 'normal';
  if (typeof font.color === 'string' && /^(?:#[\da-f]{6}(?:[\da-f]{2})?|transparent)$/i.test(font.color)) {
    style.color = font.color;
    style.fill = font.color;
  }
};

/** Apply authored fonts before Billboard measures labels, including Shadow DOM. */
export const stylePptxChartText = (surface: HTMLElement, model?: PptxChartModel, chart?: any, legendFont?: PptxChartFont) => {
  const view = surface.ownerDocument?.defaultView;
  if (!view || typeof surface.appendChild !== 'function') return;
  const scope = `chart-${Math.random().toString(36).slice(2)}`;
  surface.dataset.pptxChartText = scope;
  surface.classList.add('pptx-chart-typed');
  const selector = `.pptx-chart-surface.pptx-chart-typed[data-pptx-chart-text="${scope}"]`;
  const element = surface.ownerDocument.createElement('style');
  element.dataset.pptxChartFonts = '';
  // Billboard replaces the bind target's children during initialization.
  // Keep scoped rules beside that target so they also apply during measurement.
  surface.parentNode?.appendChild(element);
  const sheet = element.sheet;
  if (!sheet) return element;
  const rule = (suffix: string, font?: PptxChartFont) => {
    if (!font || !Object.values(font).some(value => value !== undefined)) return;
    const index = sheet.insertRule(suffix.split(',').map(value => `${selector} ${value.trim()}`).join(',') + '{}', sheet.cssRules.length);
    applyPptxChartFont((sheet.cssRules[index] as CSSStyleRule).style, font);
  };
  rule('svg', model?.font);
  rule('.bb-legend-item,.bb-legend-item text', mergePptxChartFonts(model?.font, legendFont));
  if (!model) return element;
  const { category, primary, secondary } = resolvePptxChartAxes(model);
  for (const [axis, font] of [['x', category?.font], ['y', primary?.font], ['y2', secondary?.font]] as const) {
    rule(`.bb-axis-${axis},.bb-axis-${axis} text`, mergePptxChartFonts(model.font, font));
  }
  let column = 0;
  const escape = view.CSS?.escape;
  if (!escape) return element;
  for (const group of model.groups) for (let index = 0; index < group.series.length; index++, column++) {
    const id = String(chart?.data?.columns?.[column]?.[0] ?? '');
    if (!id) continue;
    const labels = group.options.series?.[index]?.labels;
    const font = mergePptxChartFonts(model.font, group.options.labels?.font, labels?.font);
    const texts = `.bb-texts-${escape(id)}`;
    rule(`${texts},${texts} text`, font);
    const points = { ...group.options.labels?.points, ...labels?.points };
    for (const [position, point] of Object.entries(points)) {
      if (!/^\d+$/.test(position) || !point.font) continue;
      rule(`${texts} .bb-text-${escape(position)}`, mergePptxChartFonts(font, point.font));
    }
  }
  return element;
};

/**
 * Billboard's plugin hooks are per-chart. Its screen-space text rectangles and
 * punctuation-normalized cache keys cannot represent DrawingML coordinates or
 * distinct CJK labels. Measure fresh SVG glyph geometry in local coordinates.
 */
export const createPptxChartTextPlugin = (surface: HTMLElement) => {
  const document = surface.ownerDocument;
  const view = document?.defaultView;
  if (!view || typeof surface.appendChild !== 'function') return undefined;
  let original: any;
  let wrapped: any;
  let stopped = false;
  let context: CanvasRenderingContext2D | null | undefined;
  const plugin = {
    $$: undefined as any,
    $beforeInit() {
      const internal = this.$$;
      if (typeof internal?.getTextRect !== 'function') return;
      original = internal.getTextRect;
      wrapped = (source: any, className?: string) => {
        const svg = internal.$el?.svg?.node?.() || surface.querySelector('svg');
        if (!svg) return original.call(internal, source, className);
        let base = source?.node?.() || source;
        if (!Array.isArray(source) && !/text/i.test(base?.tagName || '')) base = base?.querySelector?.('text');
        if (!Array.isArray(source) && !base) return original.call(internal, source, className);
        const values = Array.isArray(source) ? source : [base.textContent || ''];
        const rectangles = values.map((value: unknown) => {
          const text = String(value ?? '');
          const node = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          if (className) node.setAttribute('class', className);
          node.style.visibility = 'hidden';
          if (base && !Array.isArray(source)) node.style.font = view.getComputedStyle(base).font;
          node.textContent = text;
          svg.appendChild(node);
          try {
            const box = node.getBBox();
            if (box.height > 0 && (box.width > 0 || !text)) {
              return { x: box.x, y: box.y, left: box.x, top: box.y, right: box.x + box.width,
                bottom: box.y + box.height, width: box.width, height: box.height };
            }
            // Hidden slides still need logical font metrics before they become visible.
            const style = view.getComputedStyle(node);
            context ??= document.createElement('canvas').getContext('2d');
            const size = Number.parseFloat(style.fontSize) || 10;
            if (context) context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
            const metrics = context?.measureText(text);
            const width = metrics?.width ?? 0;
            const height = (metrics?.fontBoundingBoxAscent || 0) + (metrics?.fontBoundingBoxDescent || 0) || size * 1.2;
            return { x: 0, y: 0, left: 0, top: 0, right: width, bottom: height, width, height };
          } finally { node.remove(); }
        });
        return rectangles.length > 1 ? rectangles : rectangles[0];
      };
      internal.getTextRect = wrapped;
    },
    $init() {},
    $afterInit() { document.fonts?.addEventListener('loadingdone', refresh); },
    $redraw() {},
    $willDestroy() {
      stopped = true;
      document.fonts?.removeEventListener('loadingdone', refresh);
      if (this.$$?.getTextRect === wrapped) this.$$.getTextRect = original;
      original = wrapped = context = undefined;
      this.$$ = undefined;
    },
  };
  const refresh = () => { if (!stopped) plugin.$$?.api?.flush?.(); };
  return plugin;
};
