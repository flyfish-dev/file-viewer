// Synthetic, repository-only regression for scaled/reparented PPTX charts.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium, webkit } from 'playwright';

const root = path.resolve(import.meta.dirname, '../../../..');
const packageDir = path.join(root, 'packages/renderers/pptx');
const output = path.resolve(process.env.PPTX_CHART_OUTPUT || path.join(root, 'output/pptx-chart-axis-layout'));
const baseline = '7e5e131c5340dbd421e47725c895554ecc75ff11';
const changedSources = ['chart.ts', 'chart-text.ts'];
const labels = ['First quarter', 'Second quarter', 'Third quarter'];
const axis = (id, kind, position, extra = {}) => ({
  id, kind, position, deleted: false, reversed: false, majorGridlines: false, ...extra,
});
// Original synthetic data in the public Worker model format. No document input.
const model = {
  schemaVersion: 1,
  font: { family: 'serif', sizePt: 18 },
  axes: [axis('category', 'category', 'b', { labelRotation: 0 }),
    axis('value', 'value', 'l')],
  groups: [{
    chartType: 'barChart', barDirection: 'col', axisIds: ['category', 'value'],
    options: { legend: { show: false } },
    series: [{ key: 'Synthetic values', xlabels: Object.fromEntries(labels.map((label, i) => [i, label])),
      values: [10, 20, 30].map((y, x) => ({ x, y })) }],
  }],
};

async function bundle(useBaseline) {
  const result = await build({
    stdin: { resolveDir: packageDir, contents: `
      import { registerPptxChartLibraryLoader, renderPptxPostProcessing } from './src/chart.ts';
      import * as billboard from 'billboard.js';
      import * as d3Format from 'd3-format';
      import css from 'billboard.js/dist/billboard.css';
      const style = document.createElement('style'); style.textContent = css; document.head.append(style);
      registerPptxChartLibraryLoader(async () => ({ billboard: { ...billboard, default: {
        generate(options) { const chart = billboard.default.generate(options); window.chart = chart; return chart; }
      } }, d3Format }));
      window.renderChart = renderPptxPostProcessing;
    ` },
    bundle: true, format: 'iife', platform: 'browser', write: false, logLevel: 'warning',
    loader: { '.css': 'text' },
    alias: { '@file-viewer/core': path.join(root, 'packages/core/src/index.ts') },
    plugins: useBaseline ? [{ name: 'repository-baseline', setup(builder) {
      builder.onLoad({ filter: /[\\/]pptx[\\/]src[\\/]chart(?:-text)?\.ts$/ }, args => {
        const file = path.basename(args.path);
        assert.ok(changedSources.includes(file));
        return { loader: 'ts', resolveDir: path.dirname(args.path), contents: execFileSync('git',
          ['show', `${baseline}:packages/renderers/pptx/src/${file}`], { cwd: root, encoding: 'utf8' }) };
      });
    } }] : [],
  });
  return result.outputFiles[0].text;
}

async function mount(page, hidden = false) {
  await page.evaluate(async ({ model, hidden }) => {
    await window.handle?.destroy();
    document.querySelector('#host').replaceChildren();
    const slide = document.createElement('div');
    slide.id = 'slide';
    slide.style.cssText = 'position:relative;width:960px;height:540px;transform-origin:0 0;transform:scale(.35)';
    if (hidden) slide.style.display = 'none';
    const frame = document.createElement('div');
    frame.id = 'chart';
    frame.style.cssText = 'position:absolute;left:40px;top:40px;width:640px;height:340px;overflow:hidden;background:white';
    slide.append(frame);
    document.querySelector('#host').append(slide);
    window.handle = await window.renderChart({ MsgQueue: [{ type: 'createChart', data: {
      chartID: 'chart', chartType: 'barChart', chartModel: model,
      chartData: model.groups[0].series, chartOptions: model.groups[0].options,
    } }] }, slide);
    await document.fonts.ready;
    if (hidden) { slide.style.display = ''; window.chart.flush(); }
  }, { model, hidden });
}

async function phase(page, scale, reparent, flush = true) {
  return page.evaluate(async ({ scale, reparent, flush }) => {
    const slide = document.querySelector('#slide');
    slide.style.transform = `scale(${scale})`;
    if (reparent) { slide.remove(); document.querySelector('#host').append(slide); }
    if (flush) window.chart.flush();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    // Axis transitions can start on the next animation frame after a public
    // resize/flush. Wait for the configured duration, without changing it.
    await new Promise(resolve => setTimeout(resolve, Number(window.chart.config('transition.duration')) || 0));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const frame = document.querySelector('#chart').getBoundingClientRect();
    const labels = [...document.querySelectorAll('#chart .bb-axis .tick text')].map(node => {
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return { text: node.textContent, font: style.fontFamily, fontSize: parseFloat(style.fontSize),
        left: (box.left - frame.left) / scale, top: (box.top - frame.top) / scale,
        right: (box.right - frame.left) / scale, bottom: (box.bottom - frame.top) / scale };
    });
    const failures = labels.flatMap(label => [
      ...(Math.abs(label.fontSize - 24) > .01 || !label.font.includes('serif') ? [`font: ${label.text}`] : []),
      ...(label.left < -1 || label.top < -1 || label.right > frame.width / scale + 1 || label.bottom > frame.height / scale + 1 ? [`clipped: ${label.text}`] : []),
    ]);
    return { scale, reparent, labels, failures };
  }, { scale, reparent, flush });
}

await mkdir(output, { recursive: true });
const report = { baseline, results: [], errors: [], externalRequests: [] };
try {
 for (const browserName of ['chromium', 'webkit']) for (const dpr of [1, 2]) {
  const browser = await ({ chromium, webkit })[browserName].launch({ headless: true,
    executablePath: browserName === 'chromium' ? process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined : undefined });
  try {
  for (const mode of ['before', 'after']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: dpr });
    page.on('pageerror', error => report.errors.push(error.message));
    await page.route(/^https?:/, route => { report.externalRequests.push(route.request().url()); return route.abort(); });
    await page.setContent('<!doctype html><style>body{margin:0;background:#eee}#host{padding:20px}</style><div id="host"></div>');
    await page.addScriptTag({ content: await bundle(mode === 'before') });
    await mount(page);
    const phases = [];
    for (const [index, scale] of [.35, 1.25, .5].entries()) {
      const result = await phase(page, scale, index > 0);
      assert.ok(result.labels.length > 0, 'The real renderer must produce axis labels');
      phases.push(result);
      if (index === 1) await page.locator('#chart').screenshot({ path: path.join(output, `${browserName}-dpr${dpr}-${mode}.png`) });
    }
    const result = { mode, browserName, browser: browser.version(), dpr, phases, failures: phases.flatMap(value => value.failures).length };
    report.results.push(result);
    if (mode === 'before') assert.ok(result.failures > 0, 'The unchanged baseline must reproduce the regression');
    else {
      assert.equal(result.failures, 0, JSON.stringify(result));
      await mount(page, true);
      const hidden = await phase(page, .35, false);
      report.results.push({ mode: 'hidden-after', browserName, dpr, ...hidden });
      assert.equal(hidden.labels.length, 10);
      assert.deepEqual(hidden.failures, []);
      // A redraw after font readiness and a real resize must converge without
      // retaining stale local bounds or recursively flushing the chart.
      await page.evaluate(() => {
        document.fonts.dispatchEvent(new Event('loadingdone'));
        const frame = document.querySelector('#chart');
        frame.style.width = '740px'; frame.style.height = '420px';
        window.chart.resize({ width: 740, height: 420 });
      });
      await page.waitForFunction(() => [...document.querySelectorAll('#chart *')].every(node => !node.__transition));
      const resized = await phase(page, .5, true, false);
      report.results.push({ mode: 'resized-after-font-ready', browserName, dpr, ...resized });
      assert.ok(resized.labels.length >= 10);
      assert.deepEqual(resized.failures, []);
      const stable = await phase(page, .5, false, false);
      assert.deepEqual(stable.labels, resized.labels, 'Repeated observation without a helper flush retains the same geometry');
    }
    await page.evaluate(() => window.handle.destroy());
    assert.equal(await page.locator('.pptx-chart-surface,style[data-pptx-chart-fonts]').count(), 0);
    await page.close();
  }
  } finally { await browser.close(); }
 }
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.externalRequests, []);
  console.log('PASS: baseline reproduced; Chromium/WebKit DPR 1/2, scaled/reparented, hidden, font-ready and resize chart checks passed.');
} finally {
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
