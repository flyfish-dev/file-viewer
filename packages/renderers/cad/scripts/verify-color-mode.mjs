import assert from 'node:assert/strict';

import cadRenderer from '../dist/index.js';

import {
  applyCadViewerColorMode,
  normalizeFileViewerCadColorMode,
  resolveCadViewerSourceDocument,
  resolveFileViewerCadMonochromeColor,
  supportsCadViewerColorMode,
} from '../dist/colorMode.js';

assert.equal(cadRenderer.id, 'file-viewer-renderer-cad');
assert.ok(cadRenderer.definitions.some(definition => definition.id === 'cad'));

assert.equal(normalizeFileViewerCadColorMode('monochrome'), 'monochrome');
assert.equal(normalizeFileViewerCadColorMode('source'), 'source');
assert.equal(normalizeFileViewerCadColorMode('unexpected'), 'source');
assert.equal(resolveFileViewerCadMonochromeColor('  #101820  '), '#101820');
assert.equal(resolveFileViewerCadMonochromeColor(undefined), '#000000');

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
