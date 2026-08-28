type ChartMessage = {
  type?: string;
  data?: {
    chartID?: string;
    chartType?: string;
    chartData?: any;
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

const getNumericBulletText = (type: string, index: number) => {
  switch (type) {
    case 'arabicPeriod':
      return `${index}. `;
    case 'arabicParenR':
      return `${index}) `;
    case 'alphaLcParenR':
      return `${String.fromCharCode(index + 96)}) `;
    case 'alphaLcPeriod':
      return `${String.fromCharCode(index + 96)}. `;
    case 'alphaUcParenR':
      return `${String.fromCharCode(index + 64)}) `;
    case 'alphaUcPeriod':
      return `${String.fromCharCode(index + 64)}. `;
    default:
      return String(index);
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
      const nextIndex = (counters.get(key) || 0) + 1;
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
  const { area, bar, line, pie, scatter } = billboard;
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
          return chartData[0]?.xlabels?.[index] || index;
        },
      },
    },
  };

  switch (payload.chartType) {
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
          x: {
            tick: {
              multiline: true,
              format(index: number) {
                return chartData[0]?.xlabels?.[index] || index;
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
    return bb.generate(chart) as BillboardChart;
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
