import type {
  FileRenderContext,
  FileViewerBinaryInspectorOptions,
  FileViewerRenderedInstance,
} from '@file-viewer/core';
import { formatBinaryByte } from './parser.js';
import {
  normalizeBinaryInspectorLimits,
  type BinaryInspectorAnalysis,
  type BinaryInspectorNode,
  type BinaryInspectorWorkerResponse,
} from './types.js';

const bytesPerRow = 16;
const rowHeight = 26;
const rowOverscan = 6;
let workerSequence = 0;
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

const styles = `
.fv-binary{height:100%;min-height:300px;display:flex;flex-direction:column;overflow:hidden;background:#f1f5f9;color:#172033;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}
.fv-binary *{box-sizing:border-box}.fv-binary-header{display:flex;gap:14px;align-items:baseline;flex-wrap:wrap;padding:12px 16px;border-bottom:1px solid #d8e0e8;background:#fff;font-family:ui-sans-serif,system-ui,sans-serif}.fv-binary-header h2{margin:0;font-size:15px}.fv-binary-summary{color:#526174}.fv-binary-layout{display:grid;grid-template-columns:minmax(190px,24%) minmax(440px,1fr) minmax(210px,26%);min-height:0;flex:1;overflow:hidden}.fv-binary-panel{min-width:0;overflow:auto;border-right:1px solid #d8e0e8;background:#fff}.fv-binary-panel:last-child{border-right:0;border-left:1px solid #d8e0e8}.fv-binary-panel h3{position:sticky;top:0;z-index:2;margin:0;padding:10px 12px;border-bottom:1px solid #e1e7ee;background:#f8fafc;font:600 11px/1.3 ui-sans-serif,system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase}.fv-binary-tree{padding:6px}.fv-binary-tree-node{display:flex;width:100%;gap:7px;align-items:baseline;padding:5px 7px;border:0;border-radius:4px;background:transparent;color:inherit;text-align:left;font:inherit;cursor:pointer}.fv-binary-tree-node:hover,.fv-binary-tree-node.is-selected{background:#dbeafe}.fv-binary-tree-node:focus-visible,.fv-binary-byte:focus-visible{outline:2px solid #2563eb;outline-offset:1px}.fv-binary-tree-range{margin-left:auto;color:#64748b;font-size:10px;white-space:nowrap}.fv-binary-tree-type{color:#0f766e;font-size:10px}.fv-binary-hex-panel{display:flex;min-height:0;flex-direction:column;min-width:0;overflow:hidden}.fv-binary-column-head{display:grid;grid-template-columns:86px minmax(360px,1fr) 130px;gap:8px;padding:8px 12px;border-bottom:1px solid #d8e0e8;background:#f8fafc;color:#64748b;font-size:10px;text-transform:uppercase}.fv-binary-scroll{position:relative;min-height:0;flex:1;overflow:auto;background:#fff}.fv-binary-spacer{position:relative;min-width:620px}.fv-binary-rows{position:absolute;inset:0}.fv-binary-row{position:absolute;left:0;right:0;display:grid;grid-template-columns:86px minmax(360px,1fr) 130px;gap:8px;align-items:center;height:${rowHeight}px;padding:0 12px;border-bottom:1px solid #f0f3f6}.fv-binary-offset{color:#64748b}.fv-binary-hex{display:grid;grid-template-columns:repeat(16,minmax(18px,1fr));gap:2px}.fv-binary-byte{min-width:0;padding:1px 2px;border:0;border-radius:2px;background:transparent;color:#0f172a;font:inherit;cursor:pointer}.fv-binary-byte:hover,.fv-binary-byte.is-selected{background:#bfdbfe;color:#172554}.fv-binary-byte.is-range{background:#dbeafe}.fv-binary-ascii{overflow:hidden;color:#475569;letter-spacing:.06em;text-overflow:clip;white-space:pre}.fv-binary-inspector{padding:10px 12px}.fv-binary-inspector dl{margin:0}.fv-binary-inspector div{display:grid;grid-template-columns:minmax(76px,40%) 1fr;gap:8px;padding:6px 0;border-bottom:1px solid #edf1f5}.fv-binary-inspector dt{color:#64748b}.fv-binary-inspector dd{margin:0;overflow-wrap:anywhere}.fv-binary-empty{padding:14px;color:#64748b;font-family:ui-sans-serif,system-ui,sans-serif}@media(max-width:860px){.fv-binary-layout{grid-template-columns:minmax(0,1fr);grid-template-rows:150px minmax(280px,1fr) 180px}.fv-binary-panel{border-right:0;border-bottom:1px solid #d8e0e8}.fv-binary-panel:last-child{border-top:0;border-left:0}.fv-binary-column-head,.fv-binary-row{grid-template-columns:72px minmax(300px,1fr) 112px}.fv-binary-spacer{min-width:500px}}
[data-viewer-theme='dark'] .fv-binary{background:#101720;color:#e5edf7}[data-viewer-theme='dark'] .fv-binary-header,[data-viewer-theme='dark'] .fv-binary-panel,[data-viewer-theme='dark'] .fv-binary-scroll{background:#111b27}[data-viewer-theme='dark'] .fv-binary-header,[data-viewer-theme='dark'] .fv-binary-panel,[data-viewer-theme='dark'] .fv-binary-panel:last-child,[data-viewer-theme='dark'] .fv-binary-column-head{border-color:#29394c}[data-viewer-theme='dark'] .fv-binary-column-head,[data-viewer-theme='dark'] .fv-binary-panel h3{background:#162231;color:#9bb0c8}[data-viewer-theme='dark'] .fv-binary-row,[data-viewer-theme='dark'] .fv-binary-inspector div{border-color:#1d2a39}[data-viewer-theme='dark'] .fv-binary-byte{color:#dbeafe}[data-viewer-theme='dark'] .fv-binary-byte:hover,[data-viewer-theme='dark'] .fv-binary-byte.is-selected,[data-viewer-theme='dark'] .fv-binary-tree-node:hover,[data-viewer-theme='dark'] .fv-binary-tree-node.is-selected{background:#1e3a5f;color:#eff6ff}
`;

const create = <K extends keyof HTMLElementTagNameMap>(
  documentRef: Document,
  tag: K,
  className?: string,
  text?: string
) => {
  const element = documentRef.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

const formatBytes = (value: number) => value < 1024
  ? `${value} B`
  : value < 1024 * 1024
    ? `${(value / 1024).toFixed(1)} KiB`
    : `${(value / 1024 / 1024).toFixed(1)} MiB`;

const abortError = () => new DOMException('Binary inspection was cancelled.', 'AbortError');

const parseInWorker = (
  buffer: ArrayBuffer,
  options: FileViewerBinaryInspectorOptions,
  signal?: AbortSignal
): Promise<BinaryInspectorAnalysis> => {
  if (typeof Worker === 'undefined') {
    return Promise.reject(new Error('Binary inspection requires a module Worker.'));
  }
  const worker = new Worker(new URL('./binary.worker.js', import.meta.url), {
    type: 'module',
    name: 'file-viewer-binary-inspector',
  });
  const id = ++workerSequence;
  const timeoutMs = normalizeBinaryInspectorLimits(options).maxParseMilliseconds;
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      worker.terminate();
      callback();
    };
    const onAbort = () => finish(() => reject(abortError()));
    const timer = setTimeout(() => finish(() => reject(new Error(`Binary structure parsing exceeded ${timeoutMs}ms.`))), timeoutMs + 100);
    worker.addEventListener('message', (event: MessageEvent<BinaryInspectorWorkerResponse>) => {
      if (event.data.id !== id) return;
      finish(() => event.data.ok && event.data.analysis
        ? resolve(event.data.analysis)
        : reject(new Error(event.data.error || 'Binary inspector Worker failed.')));
    });
    worker.addEventListener('error', event => finish(() => reject(new Error(event.message || 'Binary inspector Worker failed.'))));
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) return onAbort();
    const transferable = buffer.slice(0);
    worker.postMessage({ id, buffer: transferable, options }, [transferable]);
  });
};

const printable = (value: number) => value >= 32 && value <= 126 ? String.fromCharCode(value) : '.';
const rangeText = (start: number, end: number) => `${start.toString(16).padStart(8, '0').toUpperCase()}-${Math.max(start, end - 1).toString(16).padStart(8, '0').toUpperCase()}`;

const guid = (bytes: Uint8Array, offset: number, littleEndian: boolean) => {
  if (offset + 16 > bytes.byteLength) return '-';
  const order = littleEndian
    ? [3, 2, 1, 0, 5, 4, 7, 6, 8, 9, 10, 11, 12, 13, 14, 15]
    : Array.from({ length: 16 }, (_, index) => index);
  const value = order.map(index => formatBinaryByte(bytes[offset + index])).join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
};

const timestamp = (seconds: number | undefined) => {
  if (seconds === undefined || seconds < 946684800 || seconds > 4102444800) return 'outside 2000-2100';
  return new Date(seconds * 1000).toISOString();
};

const typedValues = (bytes: Uint8Array, offset: number, maxStringBytes: number): Array<[string, string]> => {
  if (offset >= bytes.byteLength) return [['Selection', 'No byte selected']];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const values: Array<[string, string]> = [['u8', String(bytes[offset])], ['i8', String(view.getInt8(offset))]];
  if (offset + 2 <= bytes.byteLength) {
    values.push(['u16 LE', String(view.getUint16(offset, true))], ['u16 BE', String(view.getUint16(offset, false))]);
  }
  if (offset + 4 <= bytes.byteLength) {
    const little = view.getUint32(offset, true);
    const big = view.getUint32(offset, false);
    values.push(['u32 LE', String(little)], ['u32 BE', String(big)], ['i32 LE', String(view.getInt32(offset, true))], ['f32 LE', String(view.getFloat32(offset, true))], ['f32 BE', String(view.getFloat32(offset, false))], ['Unix LE', timestamp(little)], ['Unix BE', timestamp(big)]);
  }
  if (offset + 8 <= bytes.byteLength) {
    values.push(['u64 LE', view.getBigUint64(offset, true).toString()], ['u64 BE', view.getBigUint64(offset, false).toString()], ['f64 LE', String(view.getFloat64(offset, true))], ['f64 BE', String(view.getFloat64(offset, false))]);
  }
  const text = new TextDecoder('utf-8', { fatal: false })
    .decode(bytes.slice(offset, Math.min(bytes.byteLength, offset + Math.min(maxStringBytes, 64))))
    .replace(/[\u0000-\u001f\u007f]/g, '.');
  values.push(['UTF-8', text || '-'], ['GUID LE', guid(bytes, offset, true)], ['GUID BE', guid(bytes, offset, false)]);
  return values;
};

export default async function renderBinary(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  _type?: string,
  context?: FileRenderContext,
  overrides: FileViewerBinaryInspectorOptions = {}
): Promise<FileViewerRenderedInstance> {
  const options = { ...context?.options?.binary, ...overrides };
  const limits = normalizeBinaryInspectorLimits(options);
  if (buffer.byteLength > limits.maxFileBytes) {
    throw new Error(`Binary input exceeds the configured ${limits.maxFileBytes} byte limit.`);
  }
  const analysis = await parseInWorker(buffer, options, context?.signal);
  if (context?.signal?.aborted) throw abortError();

  const bytes = new Uint8Array(buffer);
  const documentRef = target.ownerDocument;
  const style = create(documentRef, 'style');
  style.textContent = styles;
  const root = create(documentRef, 'section', 'fv-binary');
  root.dataset.binaryInspectorReady = 'true';
  root.dataset.binaryTemplate = analysis.template;
  const header = create(documentRef, 'header', 'fv-binary-header');
  const title = create(documentRef, 'h2', undefined, 'Binary inspector');
  const summary = create(documentRef, 'span', 'fv-binary-summary', `${analysis.label} | ${formatBytes(bytes.byteLength)} | Worker parsed`);
  header.append(title, summary);
  const layout = create(documentRef, 'div', 'fv-binary-layout');
  const treePanel = create(documentRef, 'aside', 'fv-binary-panel');
  treePanel.append(create(documentRef, 'h3', undefined, 'Structure'));
  const tree = create(documentRef, 'div', 'fv-binary-tree');
  treePanel.append(tree);
  const hexPanel = create(documentRef, 'section', 'fv-binary-hex-panel');
  const columnHead = create(documentRef, 'div', 'fv-binary-column-head');
  columnHead.append(create(documentRef, 'span', undefined, 'Offset'), create(documentRef, 'span', undefined, 'Hexadecimal'), create(documentRef, 'span', undefined, 'ASCII'));
  const scroll = create(documentRef, 'div', 'fv-binary-scroll');
  const spacer = create(documentRef, 'div', 'fv-binary-spacer');
  const rows = create(documentRef, 'div', 'fv-binary-rows');
  spacer.append(rows);
  scroll.append(spacer);
  hexPanel.append(columnHead, scroll);
  const inspectorPanel = create(documentRef, 'aside', 'fv-binary-panel');
  inspectorPanel.append(create(documentRef, 'h3', undefined, 'Typed values'));
  const inspector = create(documentRef, 'div', 'fv-binary-inspector');
  inspectorPanel.append(inspector);
  layout.append(treePanel, hexPanel, inspectorPanel);
  root.append(header, layout);
  target.replaceChildren(style, root);

  const rowCount = Math.ceil(bytes.byteLength / bytesPerRow);
  spacer.style.height = `${Math.max(1, rowCount) * rowHeight}px`;
  let selection = { start: 0, end: Math.min(1, bytes.byteLength) };
  let disposed = false;

  const isSelected = (offset: number) => offset >= selection.start && offset < selection.end;
  const renderRows = () => {
    if (disposed) return;
    const first = Math.max(0, Math.floor(scroll.scrollTop / rowHeight) - rowOverscan);
    const visible = Math.ceil(scroll.clientHeight / rowHeight) + rowOverscan * 2;
    const last = Math.min(rowCount, first + Math.max(1, visible));
    const fragment = documentRef.createDocumentFragment();
    for (let rowIndex = first; rowIndex < last; rowIndex += 1) {
      const row = create(documentRef, 'div', 'fv-binary-row');
      row.dataset.binaryRow = String(rowIndex);
      row.style.transform = `translateY(${rowIndex * rowHeight}px)`;
      const offset = rowIndex * bytesPerRow;
      row.append(create(documentRef, 'span', 'fv-binary-offset', offset.toString(16).padStart(8, '0').toUpperCase()));
      const hexValues = create(documentRef, 'div', 'fv-binary-hex');
      let ascii = '';
      for (let index = 0; index < bytesPerRow; index += 1) {
        const byteOffset = offset + index;
        if (byteOffset >= bytes.byteLength) {
          hexValues.append(create(documentRef, 'span'));
          ascii += ' ';
          continue;
        }
        const byte = create(documentRef, 'button', `fv-binary-byte${isSelected(byteOffset) ? (selection.end - selection.start === 1 ? ' is-selected' : ' is-range') : ''}`, formatBinaryByte(bytes[byteOffset]));
        byte.type = 'button';
        byte.dataset.binaryByteOffset = String(byteOffset);
        byte.setAttribute('aria-label', `Byte ${byteOffset}: ${formatBinaryByte(bytes[byteOffset])}`);
        byte.addEventListener('click', () => selectRange(byteOffset, byteOffset + 1, false));
        hexValues.append(byte);
        ascii += printable(bytes[byteOffset]);
      }
      row.append(hexValues, create(documentRef, 'span', 'fv-binary-ascii', ascii));
      fragment.append(row);
    }
    rows.replaceChildren(fragment);
  };

  const renderTreeNode = (parent: HTMLElement, item: BinaryInspectorNode, depth: number) => {
    const button = create(documentRef, 'button', `fv-binary-tree-node${selection.start < item.end && selection.end > item.start ? ' is-selected' : ''}`);
    button.type = 'button';
    button.style.paddingLeft = `${7 + depth * 12}px`;
    button.dataset.binaryTreeNode = item.name;
    button.append(create(documentRef, 'span', undefined, item.name), create(documentRef, 'span', 'fv-binary-tree-type', item.type), create(documentRef, 'span', 'fv-binary-tree-range', rangeText(item.start, item.end)));
    button.title = item.value ? `${item.name}: ${item.value}` : item.name;
    button.addEventListener('click', () => selectRange(item.start, item.end, true));
    parent.append(button);
    item.children?.forEach(child => renderTreeNode(parent, child, depth + 1));
  };

  const renderTree = () => {
    const fragment = documentRef.createDocumentFragment();
    renderTreeNode(fragment as unknown as HTMLElement, analysis.root, 0);
    tree.replaceChildren(fragment);
  };

  const renderInspector = () => {
    const description = create(documentRef, 'div');
    const selected = create(documentRef, 'div');
    selected.append(create(documentRef, 'dt', undefined, 'Selection'), create(documentRef, 'dd', undefined, selection.end > selection.start ? rangeText(selection.start, selection.end) : 'none'));
    description.append(selected);
    for (const [label, value] of typedValues(bytes, selection.start, limits.maxStringBytes)) {
      const row = create(documentRef, 'div');
      row.append(create(documentRef, 'dt', undefined, label), create(documentRef, 'dd', undefined, value));
      description.append(row);
    }
    inspector.replaceChildren(description);
  };

  const selectRange = (start: number, finish: number, reveal: boolean) => {
    if (!bytes.byteLength) return;
    const nextStart = clamp(Math.min(start, finish), 0, bytes.byteLength - 1);
    const nextEnd = clamp(Math.max(start, finish), nextStart + 1, bytes.byteLength);
    selection = { start: nextStart, end: nextEnd };
    root.dataset.binarySelectedStart = String(nextStart);
    root.dataset.binarySelectedEnd = String(nextEnd);
    if (reveal) {
      scroll.scrollTop = Math.max(0, Math.floor(nextStart / bytesPerRow) * rowHeight - rowHeight * 3);
    }
    renderRows();
    renderTree();
    renderInspector();
  };

  const onScroll = () => renderRows();
  scroll.addEventListener('scroll', onScroll, { passive: true });
  selectRange(0, Math.min(1, bytes.byteLength), false);

  return {
    $el: root,
    unmount() {
      if (disposed) return;
      disposed = true;
      scroll.removeEventListener('scroll', onScroll);
      target.replaceChildren();
    },
  };
}
