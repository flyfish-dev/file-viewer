import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeBinary } from '../dist/parser.js';
import { normalizeBinaryInspectorLimits } from '../dist/types.js';

const packageRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const limits = normalizeBinaryInspectorLimits();
const countNodes = node => 1 + (node.children || []).reduce((total, child) => total + countNodes(child), 0);
const find = (node, name) => node.name === name || (node.children || []).some(child => find(child, name));
const pe = new Uint8Array(await readFile(resolve(packageRoot, 'fixtures/pe32.bin')));

const makePng = () => {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52], 0);
  new DataView(bytes.buffer).setUint32(16, 640, false);
  new DataView(bytes.buffer).setUint32(20, 480, false);
  bytes[24] = 8;
  bytes[25] = 6;
  return bytes;
};
const makeWasm = () => new Uint8Array([0, 0x61, 0x73, 0x6d, 1, 0, 0, 0]);
const makeElf = () => {
  const bytes = new Uint8Array(64);
  bytes.set([0x7f, 0x45, 0x4c, 0x46, 2, 1], 0);
  const view = new DataView(bytes.buffer);
  view.setUint16(16, 2, true);
  view.setUint16(18, 0x3e, true);
  view.setBigUint64(24, 0x401000n, true);
  return bytes;
};
const makeMachO = () => {
  const bytes = new Uint8Array(32);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0xfeedfacf, false);
  view.setUint32(4, 0x01000007, false);
  view.setUint32(12, 2, false);
  view.setUint32(16, 4, false);
  return bytes;
};
const makeZip = () => {
  const bytes = new Uint8Array(30);
  const view = new DataView(bytes.buffer);
  bytes.set([0x50, 0x4b, 3, 4], 0);
  view.setUint16(4, 20, true);
  view.setUint16(8, 8, true);
  view.setUint32(18, 12, true);
  view.setUint16(26, 4, true);
  return bytes;
};
const makeClass = () => new Uint8Array([0xca, 0xfe, 0xba, 0xbe, 0, 0, 0, 0x3d, 0, 2]);

const cases = [
  ['png', makePng(), 'IHDR'],
  ['wasm', makeWasm(), 'Version'],
  ['elf', makeElf(), 'Entry point'],
  ['pe', pe, 'PE signature'],
  ['macho', makeMachO(), 'CPU type'],
  ['zip', makeZip(), 'Local file header'],
  ['java-class', makeClass(), 'Constant pool count'],
  ['raw', new Uint8Array([0x52, 0x41, 0x57, 0x21]), 'Raw bytes'],
];
for (const [template, bytes, expectedNode] of cases) {
  const analysis = analyzeBinary(bytes, limits);
  assert.equal(analysis.template, template);
  assert.ok(find(analysis.root, expectedNode), `${template} did not expose ${expectedNode}`);
  assert.ok(countNodes(analysis.root) <= limits.maxStructureNodes);
}
assert.throws(
  () => analyzeBinary(new Uint8Array(9), { ...limits, maxFileBytes: 8 }),
  /exceeds the configured 8 byte limit/u
);
const capped = analyzeBinary(pe, { ...limits, maxStructureNodes: 2 });
assert.ok(countNodes(capped.root) <= 2, 'The node ceiling must be enforced before returning Worker data.');
console.log(JSON.stringify({ status: 'passed', templates: cases.map(([template]) => template), peBytes: pe.byteLength }, null, 2));
