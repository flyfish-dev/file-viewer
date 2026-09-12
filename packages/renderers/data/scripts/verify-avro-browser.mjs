import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const require = createRequire(new URL('../package.json', import.meta.url));
const avsc = require('avsc');
const bundlePath = process.argv[2] ? resolve(process.argv[2]) : fileURLToPath(new URL('../dist/vendor/avsc.cjs', import.meta.url));
const bundle = await readFile(bundlePath, 'utf8');
const schema = { type: 'record', name: 'BrowserFixture', fields: [
  { name: 'id', type: 'long' }, { name: 'label', type: 'string' },
  { name: 'payload', type: 'bytes' }, { name: 'score', type: 'double' },
  { name: 'enabled', type: 'boolean' }, { name: 'tags', type: { type: 'array', items: 'string' } },
  { name: 'optional', type: ['null', 'string'], default: null }
] };
const values = Array.from({ length: 37 }, (_, index) => ({
  id: index - 12, label: `档案_日本語_😀_${index}_${'text'.repeat(index % 7)}`,
  payload: Buffer.from([0, 255, index, 128, 13, 10]), score: index * 0.125,
  enabled: index % 2 === 0, tags: ['文档', '', '😀'], optional: index % 2 ? '可选' : null
}));
const expected = values.map(value => ({ ...value, payload: [...value.payload] }));
async function encode(codec, records) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const encoder = new avsc.streams.BlockEncoder(schema, { codec, blockSize: 96 });
    encoder.on('data', chunk => chunks.push(chunk));
    encoder.on('error', reject);
    encoder.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
    records.forEach(value => encoder.write(value));
    encoder.end();
  });
}
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [], requests = [], cases = [];
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
try {
  await page.setContent('<!doctype html><meta charset="utf-8"><title>Avro browser regression</title>');
  assert.deepEqual(await page.evaluate(() => [typeof Buffer, typeof process, typeof require]), ['undefined', 'undefined', 'undefined']);
  await page.addScriptTag({ content: `(()=>{const module={exports:{}};const exports=module.exports;\n${bundle}\nwindow.fixtureAvro=module.exports;})();` });
  async function decode(base64) {
    return page.evaluate(async base64 => {
      const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
      return new Promise((resolve, reject) => {
        const rows = [];
        let metadata = false;
        const decoder = window.fixtureAvro.createBlobDecoder(new Blob([bytes]));
        const timer = setTimeout(() => { decoder.destroy(); reject(new Error('Avro decoder failed to terminate')); }, 8000);
        decoder.on('metadata', () => { metadata = true; });
        decoder.on('data', value => rows.push({ ...value, payload: [...value.payload] }));
        decoder.on('end', () => { clearTimeout(timer); resolve({ rows, metadata }); });
        decoder.on('error', error => { clearTimeout(timer); decoder.destroy(); resolve({ error: error.message }); });
      });
    }, base64);
  }
  for (const codec of ['null', 'deflate']) {
    const result = await decode(await encode(codec, values));
    assert.equal(result.error, undefined, `${codec}: ${result.error}`);
    assert.equal(result.metadata, true);
    assert.deepEqual(result.rows, expected, `${codec} rows changed through the browser Blob decoder`);
    const empty = await decode(await encode(codec, []));
    assert.deepEqual(empty.rows, []);
    cases.push({ codec, records: result.rows.length, unicode: true, binary: true, empty: true });
  }
  const invalid = Buffer.from(await encode('null', values), 'base64');
  invalid.write('FAIL', 0, 'ascii');
  const malformed = await decode(invalid.toString('base64'));
  assert.ok(malformed.error, 'Invalid container magic must not be accepted as data');
  assert.deepEqual(errors, []);
  assert.deepEqual(requests, []);
  // No Node globals are leaked into the consumer page by the self-contained bundle.
  assert.deepEqual(await page.evaluate(() => [typeof Buffer, typeof process, typeof require]), ['undefined', 'undefined', 'undefined']);
  const report = { bundle: bundlePath, cases, malformedRejected: true, pageErrors: errors, httpRequests: requests };
  if (process.env.AVRO_EVIDENCE_DIR) {
    await mkdir(process.env.AVRO_EVIDENCE_DIR, { recursive: true });
    await writeFile(resolve(process.env.AVRO_EVIDENCE_DIR, 'avro-browser.json'), JSON.stringify(report, null, 2));
  }
  console.log('Actual browser Avro bundle passed:', JSON.stringify(report));
} finally { await browser.close(); }
