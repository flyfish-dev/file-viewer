import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createPdfReviewHarness } from './pdf-review-harness.mjs';

const root = resolve(import.meta.dirname, '../../../..');
const output = resolve(process.env.PDF_CID_EVIDENCE_DIR || join(root, 'output/pdf-cid-fonts'));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

// Generated independently of support attachments. Character codes deliberately
// differ from Unicode in GBK, Big5 and Identity-H, so byte-wise/Unicode guesses fail.
function fixture({ encoding = 'UniGB-UCS2-H', family = 'STSong-Light', hex, text,
  descriptor = 'missing', simple = false }) {
  const objects = ['', '', '', ''];
  const add = value => (objects.push(value), objects.length);
  const ref = id => `${id} 0 R`;
  const identity = encoding === 'Identity-H';
  const descriptorId = descriptor === 'missing' ? null : add(descriptor === 'empty'
    ? '<< /Type /FontDescriptor >>'
    : `<< /Type /FontDescriptor /FontName /${family} /Flags 6 /FontBBox [0 -200 1000 900] /ItalicAngle 0 /Ascent 900 /Descent -200 /CapHeight 800 /StemV 80 >>`);
  const stream = data => `<< /Length ${Buffer.byteLength(data)} >>\nstream\n${data}\nendstream`;
  const toUnicodeId = identity ? add(stream([
    '/CIDInit /ProcSet findresource begin 12 dict begin begincmap',
    '/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def',
    '/CMapName /ExplicitUnicode def /CMapType 2 def',
    '1 begincodespacerange <0000> <ffff> endcodespacerange',
    '2 beginbfchar <014a> <4e2d> <026b> <6587> endbfchar',
    'endcmap CMapName currentdict /CMap defineresource pop end end'
  ].join('\n'))) : null;
  objects[2] = simple
    ? '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
    : `<< /Type /Font /Subtype /Type0 /BaseFont /${family} /Encoding /${encoding} /DescendantFonts [4 0 R] ${toUnicodeId ? `/ToUnicode ${ref(toUnicodeId)}` : ''} >>`;
  objects[3] = simple ? 'null'
    : `<< /Type /Font /Subtype /${identity ? 'CIDFontType2' : 'CIDFontType0'} /BaseFont /${family} /CIDSystemInfo << /Registry (Adobe) /Ordering (${identity ? 'Identity' : encoding.startsWith('ETen') ? 'CNS1' : 'GB1'}) /Supplement 4 >> /DW 1000 ${descriptorId ? `/FontDescriptor ${ref(descriptorId)}` : ''} >>`;
  const bytes = hex || Buffer.from(text, simple ? 'ascii' : 'utf16le');
  const encoded = typeof bytes === 'string' ? bytes : (simple ? bytes : bytes.swap16()).toString('hex');
  const contentId = add(stream(`BT /F1 28 Tf 60 270 Td <${encoded}> Tj ET`));
  const pageId = add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 500 360] /Resources << /Font << /F1 3 0 R >> >> /Contents ${ref(contentId)} >>`);
  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[1] = `<< /Type /Pages /Kids [${ref(pageId)}] /Count 1 >>`;
  let pdf = '%PDF-1.7\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  return Buffer.from(pdf + `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
}

const cases = [
  { id: 'ucs2-h', text: '中文阅读测试', codes: [0x4e2d, 0x6587] },
  { id: 'ucs2-v', text: '中文阅读测试', encoding: 'UniGB-UCS2-V', codes: [0x4e2d, 0x6587] },
  { id: 'gbk', text: '中文阅读测试', encoding: 'GBK-EUC-H', hex: 'd6d0cec4d4c4b6c1b2e2cad4', codes: [0xd6d0, 0xcec4] },
  { id: 'big5', text: '中文', encoding: 'ETen-B5-H', family: 'MSung-Light', hex: 'a4a4a4e5', codes: [0xa4a4, 0xa4e5] },
  { id: 'ucs2-h-empty', text: '中文阅读测试', descriptor: 'empty', codes: [0x4e2d, 0x6587], sameRasterAs: 'ucs2-h' },
  { id: 'ucs2-h-descriptor', text: '中文阅读测试', descriptor: 'complete', codes: [0x4e2d, 0x6587] },
  { id: 'identity', text: '中文', encoding: 'Identity-H', hex: '014a026b', codes: [0x014a, 0x026b] },
  { id: 'identity-empty', text: '中文', encoding: 'Identity-H', hex: '014a026b', descriptor: 'empty', codes: [0x014a, 0x026b], sameRasterAs: 'identity' },
  { id: 'simple', text: 'Simple font 123', simple: true, codes: [0x53, 0x31] }
];
const fixtures = new Map(cases.map(item => [item.id + '.pdf', fixture(item)]));
const report = { status: 'running', fixtures: Object.fromEntries([...fixtures].map(([id, bytes]) => [id, sha256(bytes)])), results: [], engines: [] };
try {
  for (const browserName of ['chromium', 'webkit']) {
    const h = await createPdfReviewHarness({ output: join(output, browserName), fixtures, browserName });
    const engine = { browser: browserName, version: h.browser.version(), workers: h.workers, errors: h.errors, external: h.external, requests: h.requests };
    report.engines.push(engine);
    try {
      for (const mode of ['worker', 'main-thread']) {
        const p = await h.newPage({ width: 1100, height: 800 });
        const warnings = [];
        p.on('console', message => { if (['warning', 'error'].includes(message.type())) warnings.push(message.text()); });
        if (mode === 'main-thread') await p.evaluate(() => { window.Worker = undefined; });
        const rasters = new Map();
        try {
          for (const item of cases) {
            await p.evaluate(() => { document.getElementById('host').dataset.viewerTheme = 'light'; });
            await h.mount(p, { id: item.id + '.pdf', width: 1000, height: 740 });
            await p.waitForFunction(() => document.querySelector('.pdfViewer .page')?.dataset.loaded === 'true');
            const actual = await p.evaluate(async ({ id, assets }) => {
              const api = await import('/pdfjs/legacy/build/pdf.mjs');
              api.GlobalWorkerOptions.workerSrc = assets.workerUrl;
              const data = await fetch('/fixtures/' + id + '.pdf').then(response => response.arrayBuffer());
              const task = pdfReview.getDocument({ data, ...assets, cMapPacked: true, fontExtraProperties: true });
              try {
                const doc = await task.promise;
                const nativePage = await doc.getPage(1);
                const text = await nativePage.getTextContent();
                const ops = await nativePage.getOperatorList();
                const glyphs = [];
                for (const args of ops.argsArray) for (const value of args || []) if (Array.isArray(value))
                  for (const glyph of value) if (glyph && typeof glyph === 'object' && 'unicode' in glyph)
                    glyphs.push({ code: glyph.originalCharCode, unicode: glyph.unicode });
                const canvas = document.querySelector('.pdfViewer .page canvas');
                const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
                let ink = 0;
                for (let i = 0; i < pixels.length; i += 4) if (Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) < 180) ink++;
                return { nativeText: text.items.map(item => item.str || '').join(''),
                  viewerText: document.querySelector('.pdfViewer .textLayer').textContent,
                  glyphs, ink, raster: canvas.toDataURL(),
                  worker: Boolean(window.Worker && task._worker?.port instanceof window.Worker) };
              } finally { await task.destroy(); }
            }, { id: item.id, assets: h.assets });
            const compact = value => value.replace(/\s+/g, '');
            assert.equal(compact(actual.nativeText), compact(item.text), `${item.id}: native CMap decoding`);
            assert.equal(compact(actual.viewerText), compact(item.text), `${item.id}: renderer text layer`);
            for (const code of item.codes) assert.ok(actual.glyphs.some(glyph => glyph.code === code), `${item.id}: preserve character code ${code}`);
            assert.equal(actual.worker, mode === 'worker', `${item.id}: actual Worker mode`);
            assert.ok(actual.ink > 100, `${item.id}: rendered page must contain text ink`);
            const rasterSha256 = sha256(actual.raster);
            rasters.set(item.id, rasterSha256);
            if (item.sameRasterAs) assert.equal(rasterSha256, rasters.get(item.sameRasterAs), `${item.id}: missing and empty descriptors render identically`);
            if (mode === 'worker') await p.locator('.pdfViewer .page canvas').screenshot({ path: join(output, browserName, item.id + '-light.png') });
            await p.evaluate(() => { window.savedCanvas = document.querySelector('.pdfViewer .page canvas'); document.getElementById('host').dataset.viewerTheme = 'dark'; });
            await p.waitForFunction(() => getComputedStyle(window.savedCanvas).filter.includes('invert('));
            const dark = await p.evaluate(() => ({ sameCanvas: savedCanvas === document.querySelector('.pdfViewer .page canvas'), raster: savedCanvas.toDataURL(), filter: getComputedStyle(savedCanvas).filter }));
            assert.ok(dark.sameCanvas, `${item.id}: live dark theme must retain the rendered page`);
            assert.equal(sha256(dark.raster), rasterSha256, `${item.id}: dark presentation must not change original pixels`);
            if (mode === 'worker' && item.id === 'ucs2-h') await p.locator('.pdfViewer .page canvas').screenshot({ path: join(output, browserName, item.id + '-dark.png') });
            report.results.push({ browser: browserName, mode, id: item.id, status: 'pass', text: actual.viewerText, glyphs: actual.glyphs, ink: actual.ink, rasterSha256, darkFilter: dark.filter });
            console.log(`PASS ${browserName} ${mode} ${item.id}: text, glyph codes, canvas and dark theme`);
          }
          assert.ok(!warnings.some(value => /Identity-font repair|Error:|Exception:/.test(value)), `Unexpected font warning: ${warnings.join('\n')}`);
        } finally { await p.close(); }
      }
      assert.ok(h.workers.some(url => url.endsWith('/pdf.worker.mjs')), 'Real Worker must execute');
      for (const cmap of ['UniGB-UCS2-H', 'UniGB-UCS2-V', 'GBK-EUC-H', 'ETen-B5-H'])
        assert.ok(h.requests.some(request => request.path.endsWith('/' + cmap + '.bcmap') && request.status === 200), `${cmap}: local CMap must load`);
      assert.ok(h.requests.every(request => request.status < 400), 'All local assets must load');
      assert.deepEqual(h.external, [], 'No external requests');
      assert.deepEqual(h.errors, [], 'No unhandled browser errors');
    } finally { await h.close(); }
  }
  report.status = 'pass';
} catch (error) {
  report.status = 'fail';
  report.error = String(error.stack || error);
  throw error;
} finally {
  report.workerSha256 = sha256(await readFile(join(root, 'packages/renderers/pdf/dist/vendor/pdfjs/legacy/build/pdf.worker.mjs')));
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
