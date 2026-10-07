/** Generated real-Worker regression for invalid block-in-paragraph HTML serialization. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { makeEngineDocument } from '../../../../test/docx-engine-compatibility/fixtures.mjs';

const root = path.resolve(import.meta.dirname, '../../../..');
const require = createRequire(path.join(root, 'packages/renderers/word/package.json'));
const { build } = createRequire(path.join(root, 'packages/renderers/pptx/package.json'))('esbuild');
const { PDFDocument } = createRequire(path.join(root, 'packages/renderers/pdf/package.json'))('pdf-lib');
const JSZip = require('jszip');
const out = path.resolve(process.env.WORD_EXPORT_OUTPUT || path.join(root, 'output/word-paragraph-export'));
await mkdir(out, { recursive: true });
const zip = await JSZip.loadAsync(await makeEngineDocument(JSZip));
let documentXml = await zip.file('word/document.xml').async('string');
const start = documentXml.slice(0, documentXml.indexOf('<w:body>'));
const drawing = id => `<w:p><w:pPr><w:spacing w:line="300" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/></w:rPr><w:drawing><wp:inline><wp:extent cx="3048000" cy="1524000"/><wp:docPr id="${id}" name="Generated chart"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart r:id="chart${id}"/></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
const text = value => `<w:p><w:pPr><w:spacing w:line="300" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/></w:rPr><w:t>${value}</w:t></w:r></w:p>`;
zip.file('word/document.xml', start + '<w:body>' + text('Generated paragraph export regression') + drawing(1) + text('Text between two charts') + drawing(4) + text('Text after both charts') + '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr></w:body></w:document>');
const bytes = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
await writeFile(path.join(out, 'generated.docx'), bytes);
const bundle = await build({ stdin: { resolveDir: root, loader: 'ts', contents: `
import {renderFileViewerWordDoc} from './packages/renderers/word/src/index.ts';
import {findFileViewerZoomProvider} from './packages/core/src/index.ts';
import {buildFileViewerRenderedHtmlDocument} from './packages/core/src/export.ts';
window.review={renderFileViewerWordDoc,findFileViewerZoomProvider,buildFileViewerRenderedHtmlDocument};
` }, bundle: true, format: 'iife', platform: 'browser', write: false, logLevel: 'warning' });
const worker = await readFile(path.join(path.dirname(require.resolve('@file-viewer/docx/package.json')), 'dist/docx-preview.worker.js'), 'utf8');
const jszip = await readFile(require.resolve('jszip/dist/jszip.min.js'), 'utf8');
const checks = [], errors = [], externalRequests = [], geometry = [];
let completed = false;
const check = async (name, f) => { try { await f(); checks.push({ name, status: 'pass' }); console.log('PASS', name); } catch (e) { checks.push({ name, status: 'fail', error: e.message }); throw e; } };
const near = (a, b) => assert.ok(Number.isFinite(a) && Math.abs(a - b) < 0.3, `Geometry ${a} != ${b}`);
const measure = () => {
  const section = document.querySelector('section.docx'), origin = section.getBoundingClientRect();
  return [...section.querySelectorAll('article>p, article .docx-chart')].map(e => {
    const rect = e.getBoundingClientRect(), css = getComputedStyle(e);
    return { type: e.classList.contains('docx-chart') ? 'chart' : 'paragraph', text: e.textContent, x: rect.x - origin.x, y: rect.y - origin.y, width: rect.width, height: rect.height, fontSize: css.fontSize, lineHeight: css.lineHeight };
  });
};
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
try {
  for (const dpr of [1, 2]) for (const paged of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 1100, height: 920 }, deviceScaleFactor: dpr });
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:/, r => { externalRequests.push(r.request().url()); return r.abort(); });
    try {
      await page.setContent('<!doctype html><meta charset="utf-8"><style>body{margin:0}</style><div id="host" style="width:1000px;height:900px"></div>');
      await page.addScriptTag({ content: bundle.outputFiles[0].text });
      await page.evaluate(async ({ worker, jszip, bytes, paged }) => {
        window.workerUrl = URL.createObjectURL(new Blob([worker], { type: 'application/javascript' }));
        window.zipUrl = URL.createObjectURL(new Blob([jszip], { type: 'application/javascript' }));
        const NativeWorker = Worker; window.messages = [];
        window.Worker = class extends NativeWorker { constructor(...args) { super(...args); this.addEventListener('message', e => messages.push(e.data?.type)); } };
        window.handle = await review.renderFileViewerWordDoc(Uint8Array.from(bytes).buffer, host, 'docx', { filename: 'generated.docx', options: { docx: { worker: true, workerUrl, workerJsZipUrl: zipUrl, visualPagination: paged } }, registerExportAdapter: adapter => { window.adapter = adapter; } });
      }, { worker, jszip, bytes: [...bytes], paged });
      if (paged) await page.waitForFunction(() => document.querySelector('.docx-wrapper')?.dataset.docxPaginated === 'true');
      await page.evaluate(async () => { await document.fonts.ready; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); });
      await check(`DPR ${dpr} ${paged ? 'paged' : 'flow'}: actual Worker creates both chart paragraphs`, async () => {
        assert.ok((await page.evaluate(() => messages)).includes('parsed'));
        assert.equal(await page.locator('p .docx-chart').count(), 2);
        assert.equal(await page.locator('section.docx').count(), 1);
      });
      const before = await page.evaluate(measure);
      const liveBefore = await page.locator('section.docx article').innerHTML();
      for (const scale of [0.5, 1, 2]) {
        await page.evaluate(scale => review.findFileViewerZoomProvider(host).setZoom(scale), scale);
        const html = await page.evaluate(() => review.buildFileViewerRenderedHtmlDocument({ source: host, adapter, mode: 'print', title: 'Generated paragraph export' }));
        const printed = await browser.newPage({ viewport: { width: 1100, height: 920 }, deviceScaleFactor: dpr });
        printed.on('pageerror', e => errors.push(e.message));
        await printed.route(/^https?:/, r => { externalRequests.push(r.request().url()); return r.abort(); });
        try {
          await printed.setContent(html); await printed.emulateMedia({ media: 'print' });
          await printed.evaluate(() => document.fonts.ready);
          const after = await printed.evaluate(measure);
          await check(`DPR ${dpr} ${paged ? 'paged' : 'flow'} zoom ${scale}: serialized paragraphs and chart bounds exactly match preview`, () => {
            assert.equal(after.length, before.length, 'Reparsing must not add empty paragraphs.');
            before.forEach((e, i) => { assert.equal(after[i].text, e.text); assert.equal(after[i].type, e.type); for (const key of ['x', 'y', 'width', 'height']) near(after[i][key], e[key]); });
          });
          await check(`DPR ${dpr} ${paged ? 'paged' : 'flow'} zoom ${scale}: second HTML parse remains stable`, async () => {
            const next = await printed.content(); await printed.setContent(next); await printed.evaluate(() => document.fonts.ready);
            const again = await printed.evaluate(measure); assert.deepEqual(again, after);
          });
          if (scale === 1) {
            const pdf = await PDFDocument.load(await printed.pdf({ preferCSSPageSize: true, printBackground: true }));
            await check(`DPR ${dpr} ${paged ? 'paged' : 'flow'}: actual PDF has one authored Letter page`, () => {
              assert.equal(pdf.getPageCount(), 1); near(pdf.getPage(0).getWidth(), 612); near(pdf.getPage(0).getHeight(), 792);
            });
            geometry.push({ dpr, paged, before, after });
            if (dpr === 1 && paged) await printed.screenshot({ path: path.join(out, 'generated.png') });
          }
        } finally { await printed.close(); }
      }
      await check(`DPR ${dpr} ${paged ? 'paged' : 'flow'}: exporting never changes the live paragraph/chart subtree`, async () => {
        assert.equal(await page.locator('section.docx article').innerHTML(), liveBefore);
        assert.equal(await page.locator('p div.docx-chart').count(), 2);
      });
      await page.evaluate(() => { handle.unmount(); URL.revokeObjectURL(workerUrl); URL.revokeObjectURL(zipUrl); });
    } finally { await page.close(); }
  }
  await check('No external loads or unhandled browser errors', () => { assert.deepEqual(externalRequests, []); assert.deepEqual(errors, []); });
  completed = true;
} finally {
  await browser.close();
  await writeFile(path.join(out, 'report.json'), JSON.stringify({ completed, passed: checks.filter(c => c.status === 'pass').length, failed: checks.filter(c => c.status === 'fail').length, checks, geometry, errors, externalRequestCount: externalRequests.length }, null, 2) + '\n');
}
