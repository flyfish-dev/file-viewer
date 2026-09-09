import assert from 'node:assert/strict';

import cadRenderer from '../dist/index.js';

import {
  applyCadViewerColorMode,
  normalizeFileViewerCadColorMode,
  resolveCadViewerSourceDocument,
  resolveFileViewerCadMonochromeColor,
  resolveFileViewerCadCanvasOptions,
  supportsCadViewerColorMode,
} from '../dist/colorMode.js';

assert.equal(cadRenderer.id, 'file-viewer-renderer-cad');
assert.ok(cadRenderer.definitions.some(definition => definition.id === 'cad'));

assert.equal(normalizeFileViewerCadColorMode('monochrome'), 'monochrome');
assert.equal(normalizeFileViewerCadColorMode('source'), 'source');
assert.equal(normalizeFileViewerCadColorMode('unexpected'), 'source');
assert.equal(resolveFileViewerCadMonochromeColor('  #101820  '), '#101820');
assert.equal(resolveFileViewerCadMonochromeColor(undefined), '#000000');
assert.equal(resolveFileViewerCadCanvasOptions({}, 'source').background, '#05070d');
assert.equal(resolveFileViewerCadCanvasOptions({}, 'monochrome').background, '#ffffff');
const custom = Object.freeze({ canvasOptions: Object.freeze({ background: '#123456', foreground: '#654321' }) });
for (const mode of ['source', 'monochrome']) {
  assert.equal(resolveFileViewerCadCanvasOptions(custom, mode).background, '#123456');
  assert.equal(resolveFileViewerCadCanvasOptions(custom, mode).foreground, '#654321');
}

const calls = [];
const viewer = {
  setColorMode(mode, color) {
    calls.push([mode, color]);
  },
};

assert.equal(supportsCadViewerColorMode(viewer), true);
assert.equal(applyCadViewerColorMode(viewer, 'monochrome', '#000000'), true);
assert.deepEqual(calls, [['monochrome', '#000000']]);
assert.equal(applyCadViewerColorMode({}, 'source', '#000000'), false);
const nativeCalls = [];
const nativeViewer = {
  setColorMode: (mode, color) => nativeCalls.push({ mode, color }),
  isNativeRendererActive: () => true,
  setCanvasOptions: options => nativeCalls.push({ background: options.background }),
};
for (const mode of ['monochrome', 'source']) {
  applyCadViewerColorMode(nativeViewer, mode, '#000000', {});
}
assert.deepEqual(nativeCalls, [
  { mode: 'monochrome', color: '#000000' }, { background: '#ffffff' },
  { mode: 'source', color: '#000000' }, { background: '#05070d' },
]);
applyCadViewerColorMode(nativeViewer, 'monochrome', '#000000', { dwfBackground: '#abcdef' });
assert.deepEqual(nativeCalls.at(-1), { background: '#abcdef' });

const parserDocument = { metadata: { parserOwned: true } };
const renderDocument = { metadata: { renderOnly: true } };
assert.equal(resolveCadViewerSourceDocument({
  getSourceDocument: () => parserDocument,
  getDocument: () => renderDocument,
}), parserDocument);
assert.equal(resolveCadViewerSourceDocument({
  getDocument: () => renderDocument,
}), renderDocument);
assert.equal(resolveCadViewerSourceDocument(undefined), undefined);

console.log('CAD color mode integration checks passed.');
