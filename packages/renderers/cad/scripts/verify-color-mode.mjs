import assert from 'node:assert/strict';

import {
  applyCadViewerColorMode,
  normalizeFileViewerCadColorMode,
  resolveFileViewerCadMonochromeColor,
  supportsCadViewerColorMode,
} from '../dist/colorMode.js';

assert.equal(normalizeFileViewerCadColorMode('monochrome'), 'monochrome');
assert.equal(normalizeFileViewerCadColorMode('source'), 'source');
assert.equal(normalizeFileViewerCadColorMode('unexpected'), 'source');
assert.equal(resolveFileViewerCadMonochromeColor('  #101820  '), '#101820');
assert.equal(resolveFileViewerCadMonochromeColor(undefined), '#0f172a');

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

console.log('CAD color mode integration checks passed.');
