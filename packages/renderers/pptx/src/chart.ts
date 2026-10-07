type ChartOptions = {
  grouping?: 'standard' | 'clustered' | 'stacked' | 'percentStacked';
  holeSize?: number;
  firstSliceAngle?: number;
  legend?: { show?: boolean; position?: string };
  series?: Array<{ color?: string; points?: Record<string, string> }>;
};

type ChartMessage = {
  type?: string;
  data?: {
    chartID?: string;
    chartType?: string;
    barDirection?: string;
    chartData?: any;
    chartOptions?: ChartOptions;
  };
};

type BillboardChart = {
  destroy?: () => void;
};

export type PptxChartLibraries = {
  billboard: any;
  d3Format: typeof import('d3-format');
};

export type PptxChartLibraryLoader = () => Promise<PptxChartLibraries>;

let chartLibraryLoader: PptxChartLibraryLoader | null = null;

export const registerPptxChartLibraryLoader = (
  loader: PptxChartLibraryLoader | null
) => {
  chartLibraryLoader = loader;
};

export type PptxPostProcessingHandle = {
  destroy: () => void;
};

const asChartQueue = (charts: any): ChartMessage[] => {
  return Array.isArray(charts?.MsgQueue) ? charts.MsgQueue : [];
};

export const findPptxChartTarget = (root: ParentNode, chartID: string) => {
  const rootElement = root as ParentNode & { id?: string };
  if (rootElement.id === chartID) {
    return rootElement as unknown as HTMLElement;
  }

  return Array.from(root.querySelectorAll<HTMLElement>('[id]'))
    .find(element => element.id === chartID) || null;
};

/** DrawingML alphabetic and Roman numbering, without losing suffix punctuation. */
export const getNumericBulletText = (type: string, index: number) => {
  if (!Number.isInteger(index) || index < 1 || index > 32767) {
    return String(index);
  }
  const match = /^(arabic|alphaLc|alphaUc|romanLc|romanUc)(Period|ParenR|ParenBoth|Plain)$/.exec(type);
  if (!match) {
    return String(index);
  }
  let label = String(index);
  if (match[1].startsWith('alpha')) {
    label = '';
    for (let remaining = index; remaining > 0; remaining = Math.floor((remaining - 1) / 26)) {
      label = String.fromCharCode(65 + (remaining - 1) % 26) + label;
    }
  } else if (match[1].startsWith('roman')) {
    label = '';
    let remaining = index;
    const digits: readonly (readonly [number, string])[] = [
      [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
      [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
    ];
    for (const [value, symbol] of digits) {
      label += symbol.repeat(Math.floor(remaining / value));
      remaining %= value;
    }
  }
  if (match[1].endsWith('Lc')) label = label.toLowerCase();
  switch (match[2]) {
    case 'Period': return `${label}. `;
    case 'ParenR': return `${label}) `;
    case 'ParenBoth': return `(${label}) `;
    default: return label;
  }
};

const restoreNumericBullets = (root: ParentNode) => {
  const scopes = [
    ...Array.from(root.querySelectorAll('.block')),
    ...Array.from(root.querySelectorAll('table td')),
  ];

  for (const scope of scopes) {
    const bullets = Array.from(scope.querySelectorAll<HTMLElement>('.numeric-bullet-style'));
    const counters = new Map<string, number>();

    for (const bullet of bullets) {
      const type = String(bullet.dataset.bulltname || 'arabicPeriod');
      const level = String(bullet.dataset.bulltlvl || '0');
      const key = `${level}:${type}`;
      const startAt = Number(bullet.dataset.bulltstartat);
      const nextIndex = Number.isInteger(startAt) && startAt >= 1 && startAt <= 32767
        ? startAt
        : (counters.get(key) || 0) + 1;
      counters.set(key, nextIndex);
      bullet.textContent = getNumericBulletText(type, nextIndex);
    }
  }
};

const TEXT_FIT_MIN_SCALE = 0.7;
const TEXT_FIT_MAX_PASSES = 8;
const TEXT_FIT_TOLERANCE = 1;

type ScalableStyleProperty =
  | 'fontSize'
  | 'lineHeight'
  | 'marginTop'
  | 'marginBottom'
  | 'marginLeft'
  | 'marginRight'
  | 'paddingTop'
  | 'paddingBottom'
  | 'paddingLeft'
  | 'paddingRight';

const getFitDataKey = (property: ScalableStyleProperty) =>
  `pptxFit${property.charAt(0).toUpperCase()}${property.slice(1)}`;

const readOriginalPx = (
  element: HTMLElement,
  property: ScalableStyleProperty,
  computed = getComputedStyle(element),
) => {
  const key = getFitDataKey(property);
  const existing = Number(element.dataset[key]);
  if (Number.isFinite(existing) && existing > 0) {
    return existing;
  }

  const value = parseFloat(computed[property]);
  if (!Number.isFinite(value) || value <= 0) {
    return undefined;
  }

  element.dataset[key] = String(value);
  return value;
};

const setScaledPx = (
  element: HTMLElement,
  property: ScalableStyleProperty,
  scale: number,
  computed = getComputedStyle(element),
) => {
  const original = readOriginalPx(element, property, computed);
  if (original === undefined) {
    return;
  }

  element.style[property] = `${original * scale}px`;
};

const collectTextFitElements = (block: HTMLElement) => {
  const elements = new Set<HTMLElement>();

  block.querySelectorAll<HTMLElement>('.text-block, .numeric-bullet-style').forEach(element => {
    elements.add(element);
  });

  block.querySelectorAll<HTMLElement>('.slide-prgrph').forEach(paragraph => {
    Array.from(paragraph.children).forEach(child => {
      if (!(child instanceof HTMLElement) || child.querySelector('.text-block')) {
        return;
      }

      const computed = getComputedStyle(child);
      const fontSize = parseFloat(computed.fontSize);
      if (Number.isFinite(fontSize) && fontSize > 0) {
        elements.add(child);
      }
    });
  });

  return elements;
};

const applyTextFitScale = (block: HTMLElement, scale: number) => {
  block.dataset.pptxTextFitScale = String(scale);

  for (const element of collectTextFitElements(block)) {
    const computed = getComputedStyle(element);
    setScaledPx(element, 'fontSize', scale, computed);
    setScaledPx(element, 'lineHeight', scale, computed);
    setScaledPx(element, 'paddingLeft', scale, computed);
    setScaledPx(element, 'paddingRight', scale, computed);
  }

  block.querySelectorAll<HTMLElement>('.slide-prgrph').forEach(paragraph => {
    const computed = getComputedStyle(paragraph);
    setScaledPx(paragraph, 'lineHeight', scale, computed);
    setScaledPx(paragraph, 'marginTop', scale, computed);
    setScaledPx(paragraph, 'marginBottom', scale, computed);
    setScaledPx(paragraph, 'paddingTop', scale, computed);
    setScaledPx(paragraph, 'paddingBottom', scale, computed);
  });

  block.querySelectorAll<HTMLElement>('.slide-prgrph > *').forEach(child => {
    const computed = getComputedStyle(child);
    setScaledPx(child, 'marginLeft', scale, computed);
    setScaledPx(child, 'marginRight', scale, computed);
    setScaledPx(child, 'paddingLeft', scale, computed);
    setScaledPx(child, 'paddingRight', scale, computed);
  });
};

const hasTextOverflow = (block: HTMLElement, fitWidth = true) =>
  block.scrollHeight > block.clientHeight + TEXT_FIT_TOLERANCE ||
  (fitWidth && block.scrollWidth > block.clientWidth + TEXT_FIT_TOLERANCE);

const fitOverflowingTextBlock = (block: HTMLElement, fitWidth = true) => {
  // noAutofit/spAutoFit preserve authored typography. Only normal AutoFit may
  // shrink text; unmarked legacy/table content retains its existing policy.
  const mode = block.dataset.pptxAutofit;
  if (mode && mode !== 'normal') return;
  if (block.dataset.pptxWrap === 'none') fitWidth = false;
  if (!block.querySelector('.text-block') || block.clientWidth <= 0 || block.clientHeight <= 0) {
    return;
  }

  let scale = Number(block.dataset.pptxTextFitScale) || 1;
  if (!hasTextOverflow(block, fitWidth)) {
    return;
  }

  for (let pass = 0; pass < TEXT_FIT_MAX_PASSES && hasTextOverflow(block, fitWidth); pass += 1) {
    const heightRatio = block.scrollHeight > 0
      ? Math.min(1, block.clientHeight / block.scrollHeight)
      : 1;
    const widthRatio = fitWidth && block.scrollWidth > 0
      ? Math.min(1, block.clientWidth / block.scrollWidth)
      : 1;
    const ratio = Math.min(heightRatio, widthRatio, 0.98);
    const nextScale = Math.max(TEXT_FIT_MIN_SCALE, scale * Math.max(ratio, 0.95));

    if (nextScale >= scale - 0.002) {
      scale = Math.max(TEXT_FIT_MIN_SCALE, scale * 0.97);
    } else {
      scale = nextScale;
    }

    applyTextFitScale(block, scale);

    if (scale <= TEXT_FIT_MIN_SCALE && hasTextOverflow(block, fitWidth)) {
      break;
    }
  }
};

const fitOverflowingTextBlocks = (root: ParentNode) => {
  root
    .querySelectorAll<HTMLElement>('.slide div.content, .slide div.content-rtl')
    .forEach(block => fitOverflowingTextBlock(block));
  root
    .querySelectorAll<HTMLElement>('.slide .pptx-table-cell-content')
    .forEach(block => fitOverflowingTextBlock(block, false));
};

const renderChart = async (message: ChartMessage, root: ParentNode) => {
  const payload = message.data;
  if (!payload?.chartID || !payload.chartType || !payload.chartData) {
    return;
  }

  const chartTarget = findPptxChartTarget(root, payload.chartID);
  if (!chartTarget) {
    return;
  }

  if (!chartLibraryLoader) {
    chartTarget.dataset.fileViewerMissingCapability = 'pptx-charts';
    chartTarget.setAttribute(
      'title',
      'PPTX chart rendering requires @file-viewer/capability-pptx-charts. Run `npx file-viewer-cli add pptx-charts --write`, then `npx file-viewer-cli install --yes`.'
    );
    console.warn(
      '[file-viewer] PPTX chart rendering requires @file-viewer/capability-pptx-charts. Run `npx file-viewer-cli add pptx-charts --write`, then `npx file-viewer-cli install --yes`.'
    );
    return;
  }
  const { billboard, d3Format } = await chartLibraryLoader();
  const bb = billboard.default || billboard;
  const { area, bar, line, pie, donut, scatter } = billboard;
  const chart: Record<string, any> = {
    // A selector makes Billboard query the main document. That misses chart
    // placeholders inside the viewer Shadow DOM and makes it fall back to body.
    bindto: chartTarget,
  };
  const chartData = payload.chartData;
  const axis = {
    x: {
      tick: {
        format(index: number) {
          return chartData[0]?.xlabels?.[index] ?? index;
        },
      },
    },
  };

  switch (payload.chartType) {
    case 'doughnutChart': {
      const series = chartData[0];
      const columns: Array<[string, number]> = [];
      const names: Record<string, string> = {};
      const colors: Record<string, string> = {};
      for (const [index, point] of (series?.values || []).entries()) {
        // Keep one library id per indexed point, not per label. Duplicate/empty
        // labels are valid and must never merge sectors. Null is not zero.
        if (typeof point.y !== 'number' || !Number.isFinite(point.y) || point.y === 0) continue;
        const id = `point-${index}`;
        columns.push([id, Math.abs(point.y)]);
        names[id] = String(series.xlabels?.[index] ?? point.x ?? index);
        const fill = payload.chartOptions?.series?.[0]?.points?.[point.x] ?? payload.chartOptions?.series?.[0]?.color;
        if (fill && /^(?:#[\da-f]{6}(?:[\da-f]{2})?|transparent)$/i.test(fill)) colors[id] = fill;
      }
      const hole = payload.chartOptions?.holeSize;
      const holeRatio = (typeof hole === 'number' && Number.isFinite(hole) && hole >= 10 && hole <= 90 ? hole : 50) / 100;
      const angle = payload.chartOptions?.firstSliceAngle;
      let adjustingWidth = false;
      Object.assign(chart, {
        data: { columns, names, colors, type: donut(), order: null },
        donut: {
          startingAngle: typeof angle === 'number' && Number.isFinite(angle) ? angle * Math.PI / 180 : 0,
          expand: false,
          label: { show: false },
        },
        transition: { duration: 0 },
        onrendered(this: any) {
          // Billboard accepts an absolute ring width, while DrawingML specifies
          // a ratio. Read its finished SVG geometry and update through the public
          // config API. This also tracks library resize without private state or
          // assumptions about legend/font layout. The re-entrancy guard bounds
          // the corrective redraw to one pass per changed radius.
          if (adjustingWidth || typeof this.config !== 'function') return;
          let radius = 0;
          for (const arc of chartTarget.querySelectorAll<SVGPathElement>('.bb-arc')) {
            const match = /[Aa]([\d.+eE-]+)[ ,]+([\d.+eE-]+)/.exec(arc.getAttribute('d') || '');
            if (match) radius = Math.max(radius, Number(match[1]));
          }
          if (!(radius > 0) || !Number.isFinite(radius)) return;
          const width = radius * (1 - holeRatio);
          if (Math.abs(Number(this.config('donut.width')) - width) <= 0.01) return;
          adjustingWidth = true;
          try { this.config('donut.width', width, true); } finally { adjustingWidth = false; }
        },
      });
      break;
    }
    case 'lineChart':
      Object.assign(chart, {
        data: {
          columns: chartData.map((item: any) => [item.key, ...item.values.map(({ y }: any) => y)]),
          type: line(),
        },
        axis,
        interaction: { enabled: true },
      });
      break;
    case 'barChart':
      Object.assign(chart, {
        data: {
          columns: chartData.map((item: any) => [item.key, ...item.values.map(({ y }: any) => y)]),
          type: bar(),
        },
        axis: {
          rotated: payload.barDirection === 'bar',
          x: {
            tick: {
              multiline: true,
              format(index: number) {
                return chartData[0]?.xlabels?.[index] ?? index;
              },
            },
          },
        },
      });
      break;
    case 'pieChart':
    case 'pie3DChart':
      Object.assign(chart, {
        data: {
          columns: Object.values(chartData[0]?.xlabels || {}).map((value, index) => [
            value,
            chartData[0]?.values?.[index]?.y,
          ]),
          type: pie(),
        },
      });
      break;
    case 'areaChart':
      Object.assign(chart, {
        data: {
          columns: chartData.map((item: any) => [item.key, ...item.values.map(({ y }: any) => y)]),
          type: area(),
        },
        axis,
        interaction: { enabled: true },
      });
      break;
    case 'scatterChart':
      Object.assign(chart, {
        data: {
          xs: { y: 'x' },
          columns: chartData.map((item: any, index: number) => [index ? 'y' : 'x', ...item]),
          type: scatter(),
        },
        axis: {
          x: {
            label: 'X',
            showDist: true,
            tick: {
              format: d3Format.format('.02f'),
            },
          },
          y: {
            label: 'Y',
            showDist: true,
            tick: {
              format: d3Format.format('.02f'),
            },
          },
        },
      });
      break;
    default:
      return;
  }

  if (chart.data) {
    const options = payload.chartOptions;
    if (options?.legend) {
      chart.legend = {
        show: options.legend.show !== false,
        position: options.legend.position === 'b' ? 'bottom' : 'right',
        // The chart library cannot measure an empty SVG text node. Use an
        // invisible measuring character only in legend presentation; names and
        // tooltip data still retain the document's actual empty string.
        format: (label: string) => label === '' ? '\u200b' : label,
      };
    }
    if (['barChart', 'areaChart', 'lineChart'].includes(payload.chartType)) {
      // Distinct series can legitimately share a display name. Billboard groups
      // by id, so disambiguate only duplicate ids and preserve authored labels.
      const used = new Set<string>();
      const reserved = new Set<string>(chart.data.columns.map((column: any[]) => String(column[0])));
      const names: Record<string, string> = {};
      chart.data.columns.forEach((column: any[], index: number) => {
        const label = String(column[0]);
        let id = label;
        if (used.has(id)) {
          id = `pptx-series-${index}`;
          while (reserved.has(id) || used.has(id)) id += '-';
          column[0] = id;
        }
        used.add(id);
        Object.defineProperty(names, id, { value: label, enumerable: true });
      });
      chart.data.names = names;
      if (options?.grouping === 'stacked' || options?.grouping === 'percentStacked') {
        chart.data.groups = [chart.data.columns.map((column: any[]) => column[0])];
        if (options.grouping === 'percentStacked') chart.data.stack = { normalize: true };
        chart.data.order = null;
      }
      const colors: Record<string, string> = {};
      chartData.forEach((item: any, index: number) => {
        const fill = options?.series?.[index]?.color;
        if (fill && /^(?:#[\da-f]{6}(?:[\da-f]{2})?|transparent)$/i.test(fill)) Object.defineProperty(colors, String(chart.data.columns[index][0]), { value: fill, enumerable: true });
      });
      if (Object.keys(colors).length) chart.data.colors = colors;
    }
    // Billboard resets the bind target's position to relative. Keep DrawingML
    // placement on the outer frame; only let the library own its inner surface.
    const surface = chartTarget.ownerDocument.createElement('div');
    surface.className = 'pptx-chart-surface';
    surface.style.cssText = 'width:100%;height:100%;min-width:0;min-height:0;flex:1 1 auto';
    chartTarget.replaceChildren(surface);
    chart.bindto = surface;
    try {
      const instance = bb.generate(chart) as BillboardChart;
      return {
        destroy() {
          try { instance.destroy?.(); } finally { surface.remove(); }
        },
      };
    } catch (error) {
      surface.remove();
      throw error;
    }
  }
};

export const renderPptxPostProcessing = async (
  charts: unknown,
  root: ParentNode,
): Promise<PptxPostProcessingHandle> => {
  restoreNumericBullets(root);
  fitOverflowingTextBlocks(root);

  const queue = asChartQueue(charts);
  const chartInstances: BillboardChart[] = [];

  if (queue.length) {
    const results = await Promise.allSettled(
      queue.map(message => renderChart(message, root)),
    );
    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (result.value) {
          chartInstances.push(result.value);
        }
      } else {
        console.warn('PPTX chart rendering skipped:', result.reason);
      }
    }
  }

  let destroyed = false;
  return {
    destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;
      for (const chart of chartInstances) {
        try {
          chart.destroy?.();
        } catch {
          // The DOM may already be detached during framework unmount.
        }
      }
      chartInstances.length = 0;
    },
  };
};
