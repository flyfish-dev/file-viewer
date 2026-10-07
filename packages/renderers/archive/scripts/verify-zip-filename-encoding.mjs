import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { decodeZipFilename, hasLikelyGbkZipFilenames, loadArchiveEntriesWithoutWorker } from '../dist/archiveFallback.js';

// A minimal stored ZIP without Unicode extra fields exercises legacy filename bytes.
// This fixture has no external file dependencies or embedded third-party content.
function storedZip(name, content, flags = 0) {
  let crc = 0xffffffff;
  for (const byte of content) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  crc = (crc ^ 0xffffffff) >>> 0;
  const local = new Uint8Array(30 + name.length + content.length);
  const central = new Uint8Array(46 + name.length);
  const end = new Uint8Array(22);
  for (const [buffer, centralHeader] of [[local, false], [central, true]]) {
    const view = new DataView(buffer.buffer);
    view.setUint32(0, centralHeader ? 0x02014b50 : 0x04034b50, true);
    view.setUint16(centralHeader ? 6 : 4, 20, true);
    view.setUint16(centralHeader ? 8 : 6, flags, true);
    view.setUint32(centralHeader ? 16 : 14, crc, true);
    view.setUint32(centralHeader ? 20 : 18, content.length, true);
    view.setUint32(centralHeader ? 24 : 22, content.length, true);
    view.setUint16(centralHeader ? 28 : 26, name.length, true);
    buffer.set(name, centralHeader ? 46 : 30);
  }
  local.set(content, 30 + name.length);
  const e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(8, 1, true); e.setUint16(10, 1, true);
  e.setUint32(12, central.length, true); e.setUint32(16, local.length, true);
  const zip = new Uint8Array(local.length + central.length + end.length);
  zip.set(local); zip.set(central, local.length); zip.set(end, local.length + central.length);
  return zip.buffer;
}
const utf8 = new TextEncoder();
const rawName = Uint8Array.from([0xa2, 0xd9, 0xa2, 0xda, 0xa2, 0xdb, 46, 116, 120, 116]);
const data = utf8.encode('neutral archive payload');
const zip = storedZip(rawName, data);
let passed = 0;
const check = async (name, fn) => { await fn(); passed++; console.log(`PASS ${name}`); };
await check('symbol-only GBK names decode without Han characters', () => assert.equal(decodeZipFilename(rawName), '①②③.txt'));
await check('symbol-only legacy bytes select ZIP fallback', () => assert.equal(hasLikelyGbkZipFilenames(zip, 'sample.zip'), true));
await check('real ZIP extraction preserves filename and content bytes', async () => {
  const entries = await loadArchiveEntriesWithoutWorker(zip, 'sample.zip');
  assert.equal(entries.length, 1); assert.equal(entries[0].name, '①②③.txt');
  assert.deepEqual(new Uint8Array(await (await entries[0].compressedFile.extract()).arrayBuffer()), data);
});
await check('unflagged valid UTF-8 is not misclassified as GBK', () => {
  assert.equal(hasLikelyGbkZipFilenames(storedZip(utf8.encode('中文①.txt'), data), 'sample.zip'), false);
});
await check('flagged UTF-8 keeps its direct filename', async () => {
  const entries = await loadArchiveEntriesWithoutWorker(storedZip(utf8.encode('中文😀.txt'), data, 0x800), 'sample.zip');
  assert.equal(entries[0].name, '中文😀.txt');
});
await check('malformed GBK is not accepted because of a valid Han prefix', () => {
  const broken = Uint8Array.from([0xd6, 0xd0, 0x81]);
  assert.equal(decodeZipFilename(broken), new TextDecoder().decode(broken));
  assert.equal(hasLikelyGbkZipFilenames(storedZip(broken, data), 'sample.zip'), false);
});
await check('ASCII and empty names remain unchanged', () => {
  assert.equal(decodeZipFilename(utf8.encode('plain.txt')), 'plain.txt'); assert.equal(decodeZipFilename([]), '');
});
await check('non-ZIP extensions do not activate ZIP name detection', () => assert.equal(hasLikelyGbkZipFilenames(zip, 'sample.rar'), false));
await check('encrypted ZIP never falls through to unencrypted extraction', async () => {
  assert.equal(await loadArchiveEntriesWithoutWorker(storedZip(rawName, data, 1), 'sample.zip'), null);
});
await check('Unicode extra field remains authoritative', async () => {
  const source = new JSZip(); source.file('中文😀.txt', data);
  const bytes = await source.generateAsync({type:'arraybuffer', encodeFileName: () => rawName});
  const entries = await loadArchiveEntriesWithoutWorker(bytes, 'sample.zip');
  assert.equal(entries[0].name, '中文😀.txt');
});
console.log(JSON.stringify({passed}));
