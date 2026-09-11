import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { build } from 'esbuild'
import { chromium } from 'playwright'

// The reporter's public/sanitized attachment is deliberately not vendored.
// node scripts/verify-github-268-browser.mjs /path/to/default.pptx [--baseline]
const input = process.argv[2]
assert.ok(input && !input.startsWith('--'), 'Pass the public #268 PPTX sample path')
const baseline = process.argv.includes('--baseline')
const packageDir = path.resolve(import.meta.dirname, '..')
const output = path.resolve(process.env.ISSUE_EVIDENCE_DIR || path.join(packageDir, '../../../output/issue-268'))
const temporary = await mkdtemp(path.join(tmpdir(), 'pptx-268-browser-'))
const bytes = await readFile(input)
const sha256 = createHash('sha256').update(bytes).digest('hex')
assert.equal(sha256, '4b0dfef0400a6194f86c3deb1234fdf84828f696f2f3915fe940cbb43f5ed30c', 'The original public sample changed; review before updating its hash')
await mkdir(output, { recursive: true })
let browser
try {
  await build({
    stdin: { resolveDir: packageDir, contents: `
      import process from './src/engine/process.js';
      import { registerPptxChartLibraryLoader, renderPptxPostProcessing } from './src/chart.ts';
      import * as billboard from 'billboard.js';
      import * as d3Format from 'd3-format';
      import './src/styles/pptxjs.css';
      import 'billboard.js/dist/billboard.css';
      registerPptxChartLibraryLoader(async () => ({ billboard, d3Format }));
      window.renderSample = async data => {
        let receive; const messages = [];
        process(callback => receive = callback, message => messages.push(structuredClone(message)));
        await receive({ type: 'processPPTX', data, options: { themeProcess: true, mediaProcess: true, slidesScale: '', slideMode: false, incSlide: { width: 0, height: 0 } } });
        const style = document.createElement('style');
        style.textContent = messages.find(message => message.type === 'globalCSS')?.data || '';
        document.head.appendChild(style);
        const root = document.getElementById('root');
        root.innerHTML = messages.filter(message => message.type === 'slide').map(message => message.data).join('');
        const charts = messages.find(message => message.type === 'ExecutionTime')?.charts;
        window.handle = await renderPptxPostProcessing(charts, root);
        await document.fonts.ready;
        return { messages: messages.filter(message => /error/i.test(message.type)), charts };
      };
    ` },
    bundle: true, platform: 'browser', format: 'iife', outfile: path.join(temporary, 'entry.js'), logLevel: 'silent',
  })
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined, headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 740 } })
  const errors = []
  const requests = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (['warning', 'error'].includes(message.type())) errors.push(message.text()) })
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()) })
  await page.setContent('<!doctype html><meta charset="utf-8"><style>body{margin:0}.slide{margin:0!important;box-shadow:none!important}</style><div id="root" class="pptx-wrapper"></div>')
  await page.addStyleTag({ content: await readFile(path.join(temporary, 'entry.css'), 'utf8') })
  await page.addScriptTag({ content: await readFile(path.join(temporary, 'entry.js'), 'utf8') })
  const report = await page.evaluate(base64 => window.renderSample(Uint8Array.from(atob(base64), char => char.charCodeAt(0)).buffer), bytes.toString('base64'))
  await page.waitForTimeout(800)
  report.sha256 = sha256
  report.baseline = baseline
  report.slides = await page.locator('.slide').count()
  report.barPaths = await page.locator('.bb-bar').count()
  report.piePaths = await page.locator('.bb-arc').count()
  report.linePoints = await page.locator('.bb-chart-line .bb-circle').count()
  report.errors = errors
  report.networkRequests = requests
  const stage = baseline ? 'before' : 'after'
  for (const slide of [2, 3, 6]) await page.locator('.slide').nth(slide - 1).screenshot({ path: path.join(output, `${stage}-slide-${slide}.png`) })
  await writeFile(path.join(output, `${stage}.json`), JSON.stringify(report, null, 2))
  assert.equal(report.slides, 8)
  assert.deepEqual(report.messages, [])
  assert.deepEqual(errors, [])
  assert.deepEqual(requests, [], 'Rendering an in-memory file must not require external network requests')
  assert.deepEqual(report.charts.MsgQueue.map(message => message.data.chartData[0].values.length), baseline ? [0, 0, 0, 0, 0] : [8, 10, 8, 8, 5])
  assert.equal(report.barPaths, baseline ? 0 : 26)
  assert.equal(report.piePaths, baseline ? 0 : 8)
  if (!baseline) assert.equal(report.linePoints, 5)
  await page.evaluate(() => { window.handle.destroy(); window.handle.destroy() })
  console.log(`[pptx] #268 ${stage}: ${report.slides} slides, ${report.barPaths} bars, ${report.piePaths} arcs, ${report.linePoints} line points; no render errors or HTTP requests.`)
} finally {
  await browser?.close()
  await rm(temporary, { recursive: true, force: true })
}
