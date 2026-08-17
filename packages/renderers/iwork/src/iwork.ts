import {
  registerFileViewerZoomProvider,
  resolveFileViewerFitScale,
  unregisterFileViewerZoomProvider,
  type FileRenderContext,
  type FileViewerFitRequest,
  type FileViewerFitResult,
  type FileViewerRenderedInstance,
  type FileViewerZoomState,
} from '@file-viewer/core';
import type { IworkDocument, IworkScene, IworkVisualObject } from './model.js';
import { parseIworkWithWorker } from './workerClient.js';

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const ZOOM_STEP = 0.1;

const styleText = `
.iwork-viewer{width:100%;height:100%;display:grid;grid-template-columns:minmax(190px,250px) minmax(0,1fr);overflow:hidden;background:var(--file-viewer-render-surface-background,#e8edf2);color:#172033;font-family:Aptos,'Helvetica Neue','PingFang SC',sans-serif}.iwork-nav{min-height:0;overflow:auto;padding:14px 10px;border-right:1px solid rgba(15,23,42,.1);background:rgba(255,255,255,.96)}.iwork-nav button{display:block;width:100%;margin:0 0 5px;padding:9px 10px;border:0;border-radius:8px;background:transparent;color:#475569;text-align:left;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.iwork-nav button.active,.iwork-nav button:hover{background:#e8f4ff;color:#0369a1}.iwork-stage{min-width:0;min-height:0;overflow:auto;padding:24px;box-sizing:border-box}.iwork-scene-wrap{position:relative;margin:0 auto 24px}.iwork-scene{position:absolute;top:0;left:0;overflow:hidden;background:#fff;box-shadow:0 18px 48px rgba(15,23,42,.15);transform-origin:top left;color:#172033}.iwork-preview{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#fff}.iwork-object{position:absolute;box-sizing:border-box}.iwork-object-shape{border-radius:14px;background:#111827;color:#fff;display:grid;place-items:center}.iwork-object-chart{overflow:visible}.iwork-object-image{object-fit:fill}.iwork-text-layer{position:absolute;inset:0;pointer-events:none}.iwork-text{position:absolute;overflow:hidden;white-space:pre-wrap;word-break:break-word;line-height:1.15;box-sizing:border-box;pointer-events:auto}.iwork-table{position:absolute;border-collapse:collapse;table-layout:fixed;background:#fff;font-size:14px}.iwork-table td{min-width:0;padding:0 6px;border:1px solid #aaa;overflow:hidden;white-space:pre-wrap;vertical-align:middle}.iwork-table .iwork-table-header-row{font-weight:700;border-bottom-color:#333}.iwork-table .iwork-table-header-column{font-weight:700;border-right-color:#333}.iwork-table .iwork-table-number{text-align:right}.iwork-notes{position:absolute;z-index:1000000;left:40px;right:40px;bottom:20px;padding:10px 14px;border-radius:7px;background:rgba(248,250,252,.95);color:#475569;font-size:12px}.iwork-empty{padding:48px;color:#64748b;text-align:center}
[data-viewer-theme='dark'] .iwork-viewer{background:var(--file-viewer-render-surface-background,#0d1117)}[data-viewer-theme='dark'] .iwork-nav{background:#161b22;border-color:#30363d;color:#e6edf3}.iwork-scene{color-scheme:light}
@media(max-width:720px){.iwork-viewer{grid-template-columns:1fr}.iwork-nav{display:flex;min-height:auto;max-height:96px;overflow:auto;border-right:0;border-bottom:1px solid #d8dee6}.iwork-nav button{flex:0 0 auto;width:auto}.iwork-stage{padding:10px}}
@media print{.iwork-nav{display:none}.iwork-viewer{display:block;height:auto}.iwork-stage{overflow:visible;padding:0}.iwork-scene-wrap{break-after:page;margin:0}.iwork-scene{box-shadow:none}}
`;

const clamp = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(value * 100) / 100));

const createPreviewUrl = (model: IworkDocument) => model.preview
  ? URL.createObjectURL(new Blob([Uint8Array.from(model.preview.bytes)], { type: model.preview.mimeType }))
  : '';

type IworkObjectUrlAsset = { bytes: Uint8Array; mimeType: string };

const bytesToDataUrl = ({ bytes, mimeType }: IworkObjectUrlAsset) => {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const appendSvg = <K extends keyof SVGElementTagNameMap>(parent: SVGElement, tag: K, attributes: Record<string, string | number>) => {
  const element = document.createElementNS(SVG_NS, tag);
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, String(value)));
  parent.appendChild(element);
  return element;
};

const renderChart = (object: IworkVisualObject, kind: IworkDocument['kind']) => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${object.width} ${object.height}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', object.chart ? 'Static Apple chart' : 'Chart preview unavailable');
  if (!object.chart?.series.length || !object.chart.categories.length) return svg;
  const values = object.chart.series.flatMap(series => series.values).filter(Number.isFinite);
  const maximum = Math.max(25, Math.ceil(Math.max(...values, 0) / 25) * 25);
  const plotHeight = object.height;
  const colors = ['#0b9fe8', '#58d52f', '#f5a623', '#9b59b6', '#ef4444', '#14b8a6'];
  for (let tick = 0; tick <= 4; tick += 1) {
    const y = plotHeight - plotHeight * tick / 4;
    appendSvg(svg, 'line', { x1: 0, y1: y, x2: object.width, y2: y, stroke: tick === 0 ? '#111' : '#b7b7b7', 'stroke-width': tick === 0 ? 1.2 : 0.6 });
    const label = appendSvg(svg, 'text', { x: -12, y: y + 4, fill: '#111', 'font-size': 10, 'text-anchor': 'end', 'font-family': 'Helvetica Neue, sans-serif' });
    label.textContent = String(Math.round(maximum * tick / 4));
  }
  const groupWidth = object.width / object.chart.categories.length;
  const usableWidth = groupWidth * 0.82;
  const barWidth = usableWidth / object.chart.series.length;
  object.chart.categories.forEach((category, categoryIndex) => {
    if (object.chart!.type === 'bar') {
      object.chart!.series.forEach((series, seriesIndex) => {
        const value = Number(series.values[categoryIndex] || 0);
        const height = Math.max(0, Math.min(plotHeight, value / maximum * plotHeight));
        appendSvg(svg, 'rect', {
          x: categoryIndex * groupWidth + (groupWidth - usableWidth) / 2 + seriesIndex * barWidth,
          y: plotHeight - height,
          width: Math.max(1, barWidth - 2),
          height,
          fill: colors[seriesIndex % colors.length]!,
        });
      });
    }
    if (object.chart!.type === 'line') {
      const label = appendSvg(svg, 'text', { x: categoryIndex * groupWidth + groupWidth / 2, y: plotHeight + 22, fill: '#111', 'font-size': 10, 'text-anchor': 'middle', 'font-family': 'Helvetica Neue, sans-serif' });
      label.textContent = category;
    }
  });
  if (object.chart.type === 'line') {
    object.chart.series.forEach((series, seriesIndex) => {
      const points = series.values.map((value, index) => `${index * groupWidth + groupWidth / 2},${plotHeight - Math.max(0, Math.min(plotHeight, Number(value || 0) / maximum * plotHeight))}`).join(' ');
      appendSvg(svg, 'polyline', { points, fill: 'none', stroke: colors[seriesIndex % colors.length]!, 'stroke-width': 3 });
    });
  }
  if (kind === 'pages') {
    const legendY = -39;
    object.chart.series.forEach((series, index) => {
      const x = object.width / 2 - 100 + index * 130;
      appendSvg(svg, 'line', { x1: x, y1: legendY, x2: x + 12, y2: legendY, stroke: colors[index % colors.length]!, 'stroke-width': 2 });
      const label = appendSvg(svg, 'text', { x: x + 20, y: legendY + 4, fill: '#111', 'font-size': 10, 'font-family': 'Helvetica Neue, sans-serif' });
      label.textContent = series.name;
    });
  }
  return svg;
};

const renderScene = (
  scene: IworkScene,
  model: IworkDocument,
  scale: number,
  previewUrl: string,
  showPreview: boolean,
  objectUrls: Map<string, IworkObjectUrlAsset>
) => {
  const wrap = document.createElement('section');
  wrap.className = 'iwork-scene-wrap';
  wrap.dataset.viewerAnchorId = scene.id;
  wrap.dataset.sceneId = scene.id;
  Object.assign(wrap.style, { width: `${scene.width * scale}px`, height: `${scene.height * scale}px` });
  const surface = document.createElement('article');
  surface.className = 'iwork-scene';
  surface.dataset.pageIndex = scene.id.replace(/\D+/g, '') || '0';
  Object.assign(surface.style, { width: `${scene.width}px`, height: `${scene.height}px`, transform: `scale(${scale})` });
  if (showPreview && previewUrl) {
    const image = document.createElement('img');
    image.className = 'iwork-preview';
    image.src = previewUrl;
    image.alt = `${scene.name} embedded preview`;
    surface.appendChild(image);
  }
  scene.objects.filter(object => object.kind !== 'table').forEach(object => {
    const element = object.kind === 'image' && object.bytes && object.mimeType
      ? document.createElement('img')
      : object.kind === 'chart'
        ? renderChart(object, model.kind)
        : document.createElement('div');
    element.setAttribute('class', `iwork-object iwork-object-${object.kind}`);
    Object.assign(element.style, { left: `${object.x}px`, top: `${object.y}px`, width: `${object.width}px`, height: `${object.height}px`, transform: object.angle ? `rotate(${object.angle}rad)` : '', zIndex: String(object.zIndex ?? 1) });
    if (element instanceof HTMLImageElement) {
      const objectUrl = URL.createObjectURL(new Blob([Uint8Array.from(object.bytes!)], { type: object.mimeType }));
      objectUrls.set(objectUrl, { bytes: object.bytes!, mimeType: object.mimeType! });
      element.src = objectUrl;
      element.alt = object.text || 'Embedded Keynote image';
    } else if (object.text) element.textContent = object.text;
    surface.appendChild(element);
  });
  const textLayer = document.createElement('div');
  textLayer.className = 'iwork-text-layer';
  scene.blocks.forEach(block => {
    const element = document.createElement('div');
    element.className = 'iwork-text';
    Object.assign(element.style, {
      left: `${block.x}px`, top: `${block.y}px`, width: `${block.width}px`, height: `${block.height}px`,
      fontSize: `${block.fontSize || 16}px`, fontFamily: block.fontFamily || 'inherit', color: block.color || 'inherit',
      fontWeight: block.bold ? '700' : '400', fontStyle: block.italic ? 'italic' : 'normal', textAlign: block.align || 'left',
      letterSpacing: block.letterSpacing == null ? 'normal' : `${block.letterSpacing}em`,
      lineHeight: block.lineHeight == null ? '1.15' : String(block.lineHeight),
      display: block.verticalAlign ? 'flex' : 'block',
      flexDirection: block.verticalAlign ? 'column' : '',
      justifyContent: block.verticalAlign === 'middle' ? 'center' : block.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start',
      padding: block.padding ? `${block.padding.top}px ${block.padding.right}px ${block.padding.bottom}px ${block.padding.left}px` : '0',
      zIndex: String(block.zIndex ?? 2),
    });
    if (block.paragraphs?.length) {
      block.paragraphs.forEach(paragraph => {
        const paragraphElement = document.createElement('div');
        Object.assign(paragraphElement.style, {
          display: paragraph.bullet ? 'grid' : 'block',
          gridTemplateColumns: paragraph.bullet ? '42px minmax(0, 1fr)' : '',
          marginTop: `${paragraph.spaceBefore || 0}px`,
          marginBottom: `${paragraph.spaceAfter || 0}px`,
          color: paragraph.color || 'inherit',
          fontWeight: paragraph.bold ? '700' : 'inherit',
          fontStyle: paragraph.italic ? 'italic' : 'inherit',
        });
        if (paragraph.bullet) {
          const bullet = document.createElement('span');
          bullet.textContent = '•';
          paragraphElement.appendChild(bullet);
        }
        const content = document.createElement('span');
        paragraph.runs.forEach(run => {
          const span = document.createElement('span');
          span.textContent = run.text;
          if (run.color) span.style.color = run.color;
          if (run.bold) span.style.fontWeight = '700';
          if (run.italic) span.style.fontStyle = 'italic';
          content.appendChild(span);
        });
        paragraphElement.appendChild(content);
        element.appendChild(paragraphElement);
      });
    } else {
      element.textContent = block.text;
    }
    textLayer.appendChild(element);
  });
  surface.appendChild(textLayer);
  scene.tables.forEach(table => {
    const element = document.createElement('table');
    element.className = 'iwork-table';
    Object.assign(element.style, { left: `${table.x}px`, top: `${table.y}px`, width: table.width ? `${table.width}px` : '', height: table.height ? `${table.height}px` : '', zIndex: String(table.zIndex ?? 3) });
    if (table.fontSize) element.style.fontSize = `${table.fontSize}px`;
    if (table.fontFamily) element.style.fontFamily = table.fontFamily;
    if (table.columnWidths?.length) {
      const columns = document.createElement('colgroup');
      table.columnWidths.forEach(width => {
        const column = document.createElement('col');
        column.style.width = `${width}px`;
        columns.appendChild(column);
      });
      element.appendChild(columns);
    }
    const mergeOrigins = new Map((table.merges || []).map(merge => [`${merge.row}:${merge.col}`, merge]));
    const covered = new Set<string>();
    for (const merge of table.merges || []) {
      for (let row = merge.row; row < merge.row + merge.rowspan; row += 1) {
        for (let col = merge.col; col < merge.col + merge.colspan; col += 1) {
          if (row !== merge.row || col !== merge.col) covered.add(`${row}:${col}`);
        }
      }
    }
    table.rows.forEach((row, rowIndex) => {
      const tr = document.createElement('tr');
      if (table.rowHeights?.[rowIndex]) tr.style.height = `${table.rowHeights[rowIndex]}px`;
      row.forEach((value, colIndex) => {
        if (covered.has(`${rowIndex}:${colIndex}`)) return;
        const cell = document.createElement('td');
        cell.textContent = value;
        if (table.borderColor) cell.style.borderColor = table.borderColor;
        if (rowIndex < (table.headerRows || 0)) {
          cell.classList.add('iwork-table-header-row');
          if (table.headerRowBackground) cell.style.background = table.headerRowBackground;
        }
        if (colIndex < (table.headerColumns || 0) && rowIndex >= (table.headerRows || 0)) {
          cell.classList.add('iwork-table-header-column');
          if (table.headerColumnBackground) cell.style.background = table.headerColumnBackground;
        }
        if (value !== '' && Number.isFinite(Number(value)) && rowIndex >= (table.headerRows || 0)) cell.classList.add('iwork-table-number');
        const merge = mergeOrigins.get(`${rowIndex}:${colIndex}`);
        if (merge) {
          cell.rowSpan = merge.rowspan;
          cell.colSpan = merge.colspan;
        }
        tr.appendChild(cell);
      });
      element.appendChild(tr);
    });
    surface.appendChild(element);
  });
  if (scene.notes.length) {
    const notes = document.createElement('aside');
    notes.className = 'iwork-notes';
    notes.textContent = scene.notes.join('\n');
    surface.appendChild(notes);
  }
  wrap.appendChild(surface);
  return wrap;
};

export default async function renderIwork(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const model = await parseIworkWithWorker(buffer.slice(0), type, context?.options?.iwork, context?.signal);
  let scale = 1;
  let activeScene = model.scenes[0]?.id || '';
  const previewUrl = createPreviewUrl(model);
  const showEmbeddedPreview = context?.options?.iwork?.embeddedPreview === 'fallback' && model.limitedPreview;
  const style = document.createElement('style');
  style.textContent = styleText;
  const root = document.createElement('div');
  root.className = 'iwork-viewer';
  const nav = document.createElement('nav');
  nav.className = 'iwork-nav';
  const stage = document.createElement('main');
  stage.className = 'iwork-stage';
  let objectUrls = new Map<string, IworkObjectUrlAsset>();

  const render = () => {
    const showAll = model.kind === 'pages';
    const scenes = showAll ? model.scenes : model.scenes.filter(scene => scene.id === activeScene);
    const nextObjectUrls = new Map<string, IworkObjectUrlAsset>();
    const nextScenes = scenes.map(scene => renderScene(scene, model, scale, previewUrl, showEmbeddedPreview, nextObjectUrls));
    stage.replaceChildren(...nextScenes);
    objectUrls.forEach((_asset, url) => URL.revokeObjectURL(url));
    objectUrls = nextObjectUrls;
    nav.querySelectorAll('button').forEach(button => button.classList.toggle('active', button.dataset.sceneId === activeScene));
  };

  model.scenes.forEach(scene => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.sceneId = scene.id;
    button.textContent = scene.name;
    button.addEventListener('click', () => {
      activeScene = scene.id;
      if (model.kind === 'pages') stage.querySelector(`[data-scene-id="${CSS.escape(scene.id)}"]`)?.scrollIntoView({ block: 'start' });
      else render();
    });
    nav.appendChild(button);
  });
  root.append(nav, stage);
  target.replaceChildren(style, root);
  render();

  const getState = (): FileViewerZoomState => ({
    scale,
    label: `${Math.round(scale * 100)}%`,
    canZoomIn: scale < MAX_SCALE,
    canZoomOut: scale > MIN_SCALE,
    canReset: scale !== 1,
    minScale: MIN_SCALE,
    maxScale: MAX_SCALE,
  });
  const setScale = (value: number) => { scale = clamp(value); render(); return getState(); };
  const fit = (request: FileViewerFitRequest): FileViewerFitResult => {
    const scene = model.scenes.find(item => item.id === activeScene) || model.scenes[0];
    if (!scene) return { applied: false, mode: request.mode, resize: request.resize, source: request.source, reason: 'unmeasurable', provider: 'zoom' };
    const next = resolveFileViewerFitScale({
      mode: request.mode === 'auto' ? 'width' : request.mode,
      viewportWidth: request.viewportWidth || stage.clientWidth,
      viewportHeight: request.viewportHeight || stage.clientHeight,
      contentWidth: scene.width,
      contentHeight: scene.height,
      currentScale: scale,
      minScale: MIN_SCALE,
      maxScale: MAX_SCALE,
    });
    if (!next) return { applied: false, mode: request.mode, resize: request.resize, source: request.source, reason: 'unmeasurable', provider: 'zoom' };
    setScale(next);
    return { applied: true, mode: request.mode, resize: request.resize, source: request.source, scale, provider: 'zoom' };
  };
  registerFileViewerZoomProvider(target, {
    zoomIn: () => setScale(scale + ZOOM_STEP),
    zoomOut: () => setScale(scale - ZOOM_STEP),
    resetZoom: () => setScale(1),
    setZoom: setScale,
    fit,
    getState,
  });
  context?.registerExportAdapter?.({
    includeDocumentStyles: false,
    getPrintMaskPages: () => Array.from(stage.querySelectorAll<HTMLElement>('.iwork-scene')),
    printStyle: styleText,
    toHtml: () => {
      const clone = root.cloneNode(true) as HTMLElement;
      clone.querySelectorAll<HTMLImageElement>('img').forEach(image => {
        const asset = objectUrls.get(image.src)
          || (image.src === previewUrl && model.preview
            ? { bytes: model.preview.bytes, mimeType: model.preview.mimeType }
            : undefined);
        if (asset) image.src = bytesToDataUrl(asset);
      });
      return clone.outerHTML;
    },
  });
  context?.registerThumbnailAdapter?.({
    captureSource: showEmbeddedPreview ? 'embedded' : 'rendered',
    capture: showEmbeddedPreview && model.preview ? () => new Blob([Uint8Array.from(model.preview!.bytes)], { type: model.preview!.mimeType }) : undefined,
    getTarget: () => stage.querySelector('.iwork-scene') || stage,
  });
  return {
    $el: target,
    unmount() {
      unregisterFileViewerZoomProvider(target);
      context?.registerExportAdapter?.(null);
      context?.registerThumbnailAdapter?.(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      objectUrls.forEach((_asset, url) => URL.revokeObjectURL(url));
      target.replaceChildren();
    },
  };
}
