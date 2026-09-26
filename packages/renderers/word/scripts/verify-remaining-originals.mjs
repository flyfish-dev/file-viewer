/** Read-only, hash-pinned original acceptance. No source text, images or URLs enter reports. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const root = path.resolve(import.meta.dirname, '../../../..');
const wordRequire = createRequire(path.join(root, 'packages/renderers/word/package.json'));
const { build } = createRequire(path.join(root, 'packages/renderers/pptx/package.json'))('esbuild');
const { PDFDocument } = createRequire(path.join(root, 'packages/renderers/pdf/package.json'))('pdf-lib');
const JSZip = wordRequire('jszip');
const { JSDOM } = wordRequire('jsdom');
const corpus = process.env.WORD_ORIGINAL_CORPUS_DIR;
assert.ok(corpus, 'WORD_ORIGINAL_CORPUS_DIR is required; missing originals cannot pass.');
const output = path.resolve(process.env.WORD_ORIGINAL_OUTPUT || path.join(root, 'output/word-remaining-originals'));
await mkdir(output, { recursive: true });
const selected = new Set(['C007', 'C011', 'C042', 'C052', 'C055', 'C064', 'C066', 'C071']);
const pins = JSON.parse(await readFile(path.join(root, 'test/remaining-originals/identities.json'), 'utf8')).filter(p => selected.has(p.id));
assert.equal(pins.length, selected.size);
const hash = value => createHash('sha256').update(value).digest('hex');
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const C = 'http://schemas.openxmlformats.org/drawingml/2006/chart';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const WP = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing';
const MC = 'http://schemas.openxmlformats.org/markup-compatibility/2006';
const SVG = 'http://schemas.microsoft.com/office/drawing/2016/SVG/main';
const nodes = (element, ns, local) => [...element.getElementsByTagNameNS(ns, local)];
const xml = text => new JSDOM(text, { contentType: 'application/xml' });
const near = (a, b, label, tolerance = 0.6) => assert.ok(Number.isFinite(a) && Math.abs(a - b) < tolerance, `${label}: ${a} versus ${b}`);

async function reference(bytes) {
  const zip = await JSZip.loadAsync(bytes);
  const source = xml(await zip.file('word/document.xml').async('string'));
  const doc = source.window.document;
  // Resolve one branch, never count compatibility fallback text a second time.
  for (const alternate of nodes(doc, MC, 'AlternateContent')) {
    const choice = [...alternate.children].find(e => e.localName === 'Choice') || [...alternate.children].find(e => e.localName === 'Fallback');
    alternate.replaceWith(...(choice ? [...choice.childNodes] : []));
  }
  const relDocument = xml(await zip.file('word/_rels/document.xml.rels').async('string'));
  const relationships = new Map([...relDocument.window.document.documentElement.children].map(e => [e.getAttribute('Id'), e]));
  const resolve = id => {
    const relationship = relationships.get(id);
    assert.ok(relationship && relationship.getAttribute('TargetMode') !== 'External', 'Original must use an embedded resource.');
    const target = path.posix.normalize('word/' + relationship.getAttribute('Target'));
    assert.ok(!target.startsWith('../') && zip.file(target));
    return target;
  };
  const images = [];
  for (const drawing of nodes(doc, W, 'drawing')) {
    const picture = nodes(drawing, SVG, 'svgBlip')[0] || nodes(drawing, A, 'blip')[0];
    if (!picture) continue;
    const extent = nodes(drawing, WP, 'extent')[0];
    images.push({ sha256: hash(await zip.file(resolve(picture.getAttributeNS(R, 'embed'))).async('nodebuffer')), width: Number(extent?.getAttribute('cx')) / 9525, height: Number(extent?.getAttribute('cy')) / 9525 });
  }
  const charts = [];
  for (const item of nodes(doc, C, 'chart')) {
    const chartDocument = xml(await zip.file(resolve(item.getAttributeNS(R, 'id'))).async('string'));
    const plot = nodes(chartDocument.window.document, C, 'plotArea')[0];
    const families = [...plot.children].filter(e => e.localName.endsWith('Chart'));
    assert.equal(families.length, 1, 'This acceptance group covers the original single-family charts.');
    const type = families[0].localName;
    const series = nodes(families[0], C, 'ser').map(s => {
      const values = nodes(s, C, 'val')[0];
      assert.ok(values);
      return nodes(values, C, 'pt').map(p => ({ index: Number(p.getAttribute('idx')), value: Number(nodes(p, C, 'v')[0]?.textContent) }));
    });
    assert.ok(series.length && series.flat().every(p => Number.isFinite(p.value)));
    charts.push({ type, series });
    chartDocument.window.close();
  }
  const paper = nodes(doc, W, 'pgSz').map(e => ({ width: Number(e.getAttributeNS(W, 'w')) / 20, height: Number(e.getAttributeNS(W, 'h')) / 20 }));
  const margins = nodes(doc, W, 'pgMar').map(e => ['top', 'right', 'bottom', 'left'].map(n => Number(e.getAttributeNS(W, n)) / 15));
  const expected = { text: nodes(doc, W, 't').map(e => e.textContent).join(''), rows: nodes(doc, W, 'tr').length, cells: nodes(doc, W, 'tc').length, images, charts, paper, margins };
  source.window.close();
  relDocument.window.close();
  return expected;
}
const bundle = await build({ stdin: { resolveDir: root, loader: 'ts', contents: `
import {renderFileViewerWordDoc} from './packages/renderers/word/src/index.ts';
import {findFileViewerZoomProvider} from './packages/core/src/index.ts';
import {buildFileViewerRenderedHtmlDocument} from './packages/core/src/export.ts';
window.review={renderFileViewerWordDoc,findFileViewerZoomProvider,buildFileViewerRenderedHtmlDocument};
` }, bundle: true, format: 'iife', platform: 'browser', write: false, logLevel: 'warning' });
const engine = path.dirname(wordRequire.resolve('@file-viewer/docx/package.json'));
const worker = await readFile(path.join(engine, 'dist/docx-preview.worker.js'), 'utf8');
const jszip = await readFile(wordRequire.resolve('jszip/dist/jszip.min.js'), 'utf8');
const checks = [], originals = [], errors = [], network = [];
let completed = false;
async function check(name, fn) {
  try { await fn(); checks.push({ name, status: 'pass' }); console.log('PASS', name); }
  catch (error) { checks.push({ name, status: 'fail', error: error.message }); throw error; }
}
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
try {
  for (const pin of pins) {
    const bytes = await readFile(path.join(corpus, pin.id + pin.extension));
    assert.equal(bytes.length, pin.bytes, pin.id + ' byte length');
    assert.equal(hash(bytes), pin.sha256, pin.id + ' source identity');
    const expected = await reference(bytes);
    for (const dpr of [1, 2]) {
      const page = await browser.newPage({ viewport: { width: 1200, height: 1000 }, deviceScaleFactor: dpr });
      page.on('pageerror', e => errors.push(e.message));
      await page.route(/^https?:/, route => { network.push(route.request().url()); return route.abort(); });
      try {
        await page.setContent('<!doctype html><meta charset="utf-8"><style>body{margin:0}#host{width:1000px;height:920px}</style><div id="host"></div>');
        await page.addScriptTag({ content: bundle.outputFiles[0].text });
        await page.evaluate(({ worker, jszip }) => {
          window.workerUrl = URL.createObjectURL(new Blob([worker], { type: 'application/javascript' }));
          window.zipUrl = URL.createObjectURL(new Blob([jszip], { type: 'application/javascript' }));
          const NativeWorker = Worker;
          window.messages = [];
          window.activeWorkers = 0;
          window.Worker = class extends NativeWorker {
            constructor(...args) { super(...args); activeWorkers++; this.addEventListener('message', e => messages.push(e.data?.type)); }
            terminate() { if (!this.stopped) { this.stopped = true; activeWorkers--; } super.terminate(); }
          };
          window.bodyText = () => {
            const copy = host.cloneNode(true);
            copy.querySelectorAll('.docx-chart').forEach(e => e.remove());
            return [...copy.querySelectorAll('section.docx>article')].map(e => e.textContent).join('');
          };
        }, { worker, jszip });
        await page.evaluate(async ({ base64, extension }) => {
          window.handle = await review.renderFileViewerWordDoc(Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer, host, extension.slice(1), {
            filename: 'document' + extension,
            options: { docx: { worker: true, workerUrl, workerJsZipUrl: zipUrl, visualPagination: true } },
            registerExportAdapter: adapter => { window.exportAdapter = adapter; },
          });
        }, { base64: bytes.toString('base64'), extension: pin.extension });
        await page.waitForFunction(() => document.querySelector('.docx-wrapper')?.dataset.docxPaginated === 'true', null, { timeout: 90000 });
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all([...host.querySelectorAll('img')].map(image => image.decode()));
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        });
        const observed = await page.evaluate(async () => ({
          text: bodyText(), rows: host.querySelectorAll('article tr').length, cells: host.querySelectorAll('article td').length,
          pages: host.querySelectorAll('section.docx').length, messages,
          images: await Promise.all([...host.querySelectorAll('article img')].map(async image => ({ bytes: [...new Uint8Array(await (await fetch(image.src)).arrayBuffer())], width: image.naturalWidth, height: image.naturalHeight }))),
          charts: [...host.querySelectorAll('article .docx-chart>svg')].map(svg => ({
            width: svg.getBoundingClientRect().width, height: svg.getBoundingClientRect().height,
            points: [...svg.querySelectorAll('[data-docx-chart-point-index]')].map(e => ({ type: e.localName, index: +e.getAttribute('data-docx-chart-point-index'), x: +(e.getAttribute('x') || e.getAttribute('cx')), y: +(e.getAttribute('y') || e.getAttribute('cy')), height: +e.getAttribute('height'), d: e.getAttribute('d') })),
          })),
        }));
        const prefix = `${pin.id} DPR ${dpr}`;
        await check(prefix + ': original body text and table grid survive the actual Worker', () => {
          assert.ok(observed.messages.includes('parsed'), 'Worker fallback is not acceptance.');
          assert.equal(hash(observed.text), hash(expected.text), 'Every original character must be preserved in order.');
          assert.equal(observed.text.length, expected.text.length);
          assert.equal(observed.rows, expected.rows); assert.equal(observed.cells, expected.cells);
          assert.ok(observed.pages > 0);
        });
        await check(prefix + ': every authored embedded picture decodes from the exact package bytes', () => {
          assert.equal(observed.images.length, expected.images.length);
          assert.deepEqual(observed.images.map(i => hash(Buffer.from(i.bytes))).sort(), expected.images.map(i => i.sha256).sort());
          assert.ok(observed.images.every(i => i.width > 0 && i.height > 0));
        });
        await check(prefix + ': chart types, source indexes and values are not missing or substituted', () => {
          assert.equal(observed.charts.length, expected.charts.length);
          expected.charts.forEach((chart, i) => {
            const actual = observed.charts[i], values = chart.series.flat();
            assert.ok(actual.width > 0 && actual.height > 0);
            assert.deepEqual(actual.points.map(p => p.index), values.map(p => p.index));
            if (chart.type === 'barChart') {
              assert.ok(actual.points.every(p => p.type === 'rect'));
              const multiplier = actual.points[0].height / values[0].value;
              assert.ok(multiplier > 0); actual.points.forEach((p, j) => near(p.height, multiplier * values[j].value, 'Source bar proportion', 0.0001));
            } else if (chart.type === 'pieChart') {
              assert.ok(actual.points.every(p => p.type === 'path' && / A/.test(p.d) && / Z$/.test(p.d)));
            } else if (chart.type === 'lineChart') {
              assert.ok(actual.points.every(p => p.type === 'circle'));
              const zero = actual.points[values.findIndex(p => p.value === 0)].y;
              const peakIndex = values.findIndex(p => p.value > 0);
              assert.ok(peakIndex >= 0 && actual.points[peakIndex].y < zero);
              values.forEach((p, j) => { if (p.value === 0) near(actual.points[j].y, zero, 'Zero baseline', 0.0001); });
            } else throw Error('Add an explicit original chart family assertion.');
          });
        });
        await check(prefix + ': fitted pages stay centered through narrow-host and zoom round trips', async () => {
          const positions = await page.evaluate(async () => {
            const states = [], zoom = review.findFileViewerZoomProvider(host);
            for (const width of [1000, 420, 1000]) {
              host.style.width = width + 'px';
              await new Promise(r => setTimeout(r, 100));
              for (const scale of [1, 0.5, 2, 0.88, 1]) {
                await zoom.setZoom(scale);
                await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
                const frames = [...host.querySelectorAll('.docx-page-frame')].map(frame => {
                  const section = frame.querySelector('section.docx'), f = frame.getBoundingClientRect(), s = section.getBoundingClientRect();
                  return { center: s.x + s.width / 2, frameCenter: f.x + f.width / 2, rawWidth: section.offsetWidth, width: s.width, height: s.height, bottom: s.bottom, frameBottom: f.bottom };
                });
                states.push({ width, zoom: zoom.getState().scale, pages: frames, text: bodyText() });
              }
            }
            return states;
          });
          for (const state of positions) {
            assert.equal(hash(state.text), hash(expected.text)); assert.equal(state.pages.length, observed.pages);
            for (const paper of state.pages) {
              near(paper.center, paper.frameCenter, 'Page centering');
              assert.ok(paper.width > 0 && paper.height > 0);
              assert.ok(paper.bottom <= paper.frameBottom + 1);
            }
          }
          for (let i = 0; i < observed.pages; i++) near(positions[0].pages[i].width, positions.at(-1).pages[i].width, 'Round-trip page width');
        });
        let printed = null;
        if (pin.id === 'C052') {
          await check(prefix + ': actual print PDF keeps original paper, margins and chart boundaries', async () => {
            const before = await page.evaluate(async () => {
              await review.findFileViewerZoomProvider(host).setZoom(1);
              await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
              const s = host.querySelector('section.docx'), b = s.getBoundingClientRect();
              return [...s.querySelectorAll('.docx-chart')].map(c => { const r = c.getBoundingClientRect(); return { x: r.x - b.x, y: r.y - b.y, w: r.width, h: r.height }; });
            });
            await page.evaluate(() => review.findFileViewerZoomProvider(host).setZoom(0.5));
            const html = await page.evaluate(() => review.buildFileViewerRenderedHtmlDocument({ source: host, adapter: exportAdapter, mode: 'print', title: 'Original paper acceptance' }));
            const printPage = await browser.newPage({ viewport: { width: 1200, height: 1000 }, deviceScaleFactor: dpr });
            try {
              printPage.on('pageerror', e => errors.push(e.message));
              await printPage.route(/^https?:/, route => { network.push(route.request().url()); return route.abort(); });
              await printPage.setContent(html); await printPage.emulateMedia({ media: 'print' });
              await printPage.evaluate(() => document.fonts.ready);
              const printState = await printPage.evaluate(() => {
                const papers = [...document.querySelectorAll('section.docx')], s = papers[0], b = s.getBoundingClientRect(), css = getComputedStyle(s);
                const copy = s.cloneNode(true); copy.querySelectorAll('.docx-chart').forEach(n => n.remove());
                return { pages: papers.length, nested: !!s.querySelector('section.docx'), text: copy.querySelector('article').textContent, padding: [css.paddingTop, css.paddingRight, css.paddingBottom, css.paddingLeft].map(parseFloat),
                  charts: [...s.querySelectorAll('.docx-chart')].map(c => { const r = c.getBoundingClientRect(); return { x: r.x - b.x, y: r.y - b.y, w: r.width, h: r.height }; }),
                };
              });
              assert.equal(printState.pages, observed.pages); assert.equal(printState.nested, false);
              assert.equal(hash(printState.text), hash(expected.text));
              assert.equal(expected.paper.length, 1); assert.equal(observed.pages, 1);
              printState.padding.forEach((v, i) => near(v, expected.margins[0][i], 'Authored page margin', 0.02));
              assert.equal(printState.charts.length, before.length);
              before.forEach((c, i) => Object.keys(c).forEach(k => near(printState.charts[i][k], c[k], 'Unscaled print chart ' + k)));
              const pdfBytes = await printPage.pdf({ preferCSSPageSize: true, printBackground: true });
              const pdf = await PDFDocument.load(pdfBytes);
              assert.equal(pdf.getPageCount(), 1, 'Printing must not create a second blank page.');
              const size = pdf.getPage(0).getSize(); near(size.width, expected.paper[0].width, 'PDF MediaBox width', 1); near(size.height, expected.paper[0].height, 'PDF MediaBox height', 1);
              printed = { pages: 1, size, sha256: hash(pdfBytes), margins: printState.padding, chartGeometry: printState.charts };
              // Do not retain the original document's printed contents in the report.
            } finally { await printPage.close(); }
          });
        }
        originals.push({ id: pin.id, sha256: pin.sha256, dpr, bodyCharacters: expected.text.length, bodySha256: hash(expected.text), tableRows: expected.rows, tableCells: expected.cells, pages: observed.pages, embeddedPictures: observed.images.length, chartFamilies: expected.charts.map(c => c.type), chartPoints: expected.charts.map(c => c.series.flat().length), actualWorkerParsed: true, printed });
        await check(prefix + ': unmount releases its Worker and viewer DOM', async () => {
          const state = await page.evaluate(() => { handle.unmount(); URL.revokeObjectURL(workerUrl); URL.revokeObjectURL(zipUrl); return { children: host.children.length, activeWorkers }; });
          assert.equal(state.children, 0); assert.equal(state.activeWorkers, 0);
        });
      } finally { await page.close(); }
    }
  }
  await check('No external requests or unhandled browser errors', () => { assert.deepEqual(network, []); assert.deepEqual(errors, []); });
  completed = true;
} finally {
  await browser.close();
  await writeFile(path.join(output, 'report.json'), JSON.stringify({ completed, passed: checks.filter(c => c.status === 'pass').length, failed: checks.filter(c => c.status === 'fail').length, checks, originals, errors, externalRequestCount: network.length, scope: 'Original body/resource integrity, reported centering and missing charts, zoom, and original PDF print geometry; not complete desktop typography or physical driver validation.' }, null, 2) + '\n');
}
