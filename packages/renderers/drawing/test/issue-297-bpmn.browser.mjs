import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, resolve, join, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../../..');
const require = createRequire(join(root, 'package.json'));
const { chromium, webkit } = require('playwright');
const { build } = createRequire(join(root, 'apps/viewer-demo/package.json'))('esbuild');
const drawingRequire = createRequire(join(here, '../package.json'));
const bpmnPackage = JSON.parse(await readFile(drawingRequire.resolve('bpmn-js/package.json'), 'utf8'));
const drawingPackage = JSON.parse(await readFile(join(here, '../package.json'), 'utf8'));
assert.equal(bpmnPackage.version, drawingPackage.devDependencies['bpmn-js'], 'BPMN evidence must identify the declared installed engine');
const output = resolve(process.env.BPMN_EVIDENCE_DIR || join(root, '.release/issue-297-bpmn'));
await mkdir(output, { recursive: true });
const simple = await readFile(join(here, 'fixtures/simple-process.bpmn'), 'utf8');
const pizzaPath = process.env.BPMN_PIZZA_FILE || process.argv[2];
const pizza = pizzaPath ? await readFile(resolve(pizzaPath), 'utf8') : null;
if (pizza) assert.equal(createHash('sha256').update(pizza).digest('hex'), '0f2dde4a3698328d1f0be91fd40d2db1c6f18397f56909171a636d1991b4dd2b');

const regular = await build({
  entryPoints: [join(here, '../dist/index.js')], bundle: true, format: 'esm',
  packages: 'external', write: false, metafile: true, logLevel: 'silent',
});
assert.ok(!Object.keys(regular.metafile.inputs).some(path => /bpmn/i.test(path)), 'Default drawing must not load BPMN');

const entrySource = `
import * as bpmn from ${JSON.stringify(join(here, '../dist/bpmn.js'))};
import { findFileViewerZoomProvider } from ${JSON.stringify(join(root, 'packages/core/dist/index.js'))};
window.bpmn = bpmn;
window.instances = new Map();
window.provider = (id='one') => findFileViewerZoomProvider(document.getElementById(id));
window.openXml = async (text, options={}, id='one', context={}) => {
  await window.instances.get(id)?.unmount();
  const bytes = typeof text === 'string' ? new TextEncoder().encode(text).buffer : new Uint8Array(text).buffer;
  const instance = await bpmn.renderFileViewerBpmn(bytes, document.getElementById(id), { options: {locale:'en-US'}, ...context }, options);
  window.instances.set(id, instance);
  await instance.ready;
  return {status: instance.$el.dataset.bpmnStatus, warnings: instance.$el.dataset.bpmnWarnings, source:instance.getSource()};
};
window.entryReady = true;
`;
const built = await build({
  stdin: { contents: entrySource, resolveDir: root, sourcefile: 'entry.js' },
  outdir: join(output, 'app'), entryNames: 'entry', bundle: true, splitting: true,
  format: 'esm', platform: 'browser', target: 'es2022', metafile: true,
  minify: true, logLevel: 'silent',
});
const entry = Object.entries(built.metafile.outputs).find(([, value]) => value.entryPoint === 'entry.js');
assert.ok(entry);
assert.ok(!Object.keys(entry[1].inputs).some(path => /bpmn-js|bpmnRuntime/.test(path)), 'Engine must remain lazy');
await build({
  stdin: { contents: entrySource, resolveDir: root, sourcefile: 'entry.js' },
  outfile: join(output, 'app/iife.js'), bundle: true, format: 'iife', platform: 'browser',
  target: 'es2022', minify: true, logLevel: 'silent',
});
await writeFile(join(output, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
html,body{margin:0;padding:0}#one,#two{width:960px;height:650px;max-width:100vw}#two{margin-top:12px}
</style></head><body><div id="one"></div><div id="two"></div><script type="module" src="/app/entry.js"></script></body></html>`);
await writeFile(join(output, 'iife.html'), (await readFile(join(output, 'index.html'), 'utf8')).replace('type="module" src="/app/entry.js"', 'src="/app/iife.js"'));
const server = createServer(async (req, res) => {
  try {
    if (req.url === '/favicon.ico') { res.writeHead(204).end(); return; }
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const path = resolve(output, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!path.startsWith(output + sep)) { res.writeHead(403).end(); return; }
    res.writeHead(200, {
      'Content-Type': { '.js': 'text/javascript', '.html': 'text/html' }[extname(path)] || 'application/octet-stream',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; object-src 'none'; connect-src 'self'",
    }).end(await readFile(path));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const report = {
  sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  verifiedAt: new Date().toISOString(),
  fixture: { simple: createHash('sha256').update(simple).digest('hex'), pizza: pizza ? createHash('sha256').update(pizza).digest('hex') : null },
  engine: `bpmn-js@${bpmnPackage.version}`, entryBytes: entry[1].bytes, engines: [],
  artifacts: Object.fromEntries(await Promise.all(Object.keys(built.metafile.outputs).map(async path => [
    path, createHash('sha256').update(await readFile(resolve(root, path))).digest('hex'),
  ]))),
};
const noDi = simple.replace(/\s*<bpmndi:BPMNDiagram\b[\s\S]*<\/bpmndi:BPMNDiagram>/, '');
const empty = simple.replace(/(<bpmndi:BPMNPlane\b[^>]*>)[\s\S]*(<\/bpmndi:BPMNPlane>)/, '$1$2');
const secondDiagram = simple.match(/<bpmndi:BPMNDiagram\b[\s\S]*<\/bpmndi:BPMNDiagram>/)[0]
  .replace(/id="([^"]+)"/g, (_, id) => `id="${id}_Second"`).replace('name="Order review"', 'name="Second diagram"');
const multi = simple.replace('</bpmn:definitions>', `${secondDiagram}\n</bpmn:definitions>`);
const hostile = simple
  .replace('xmlns:bpmn=', 'xmlns:bioc="http://bpmn.io/schema/bpmn/biocolor/1.0" xmlns:bpmn=')
  .replace('<bpmn:userTask id="Review" name="Review order" />', '<bpmn:scriptTask id="Review" name="&lt;img src=x onerror=alert(1)&gt;" scriptFormat="javascript"><bpmn:script><![CDATA[const template = "<!DOCTYPE html>"; window.__bpmnExecuted = true; fetch("https://invalid.example/bpmn-script");]]></bpmn:script></bpmn:scriptTask>')
  .replace('id="Review_di"', 'id="Review_di" bioc:fill="url(https://invalid.example/paint.svg#red)" bioc:stroke="var(--external-paint)"');
const expectedIds = xml => [...xml.matchAll(/<bpmndi:BPMN(?:Shape|Edge)\b[^>]*bpmnElement="([^"]+)"/g)].map(match => match[1]);

try {
  for (const [name, browserType] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await browserType.launch({ headless: true });
    try {
      const context = await browser.newContext({ viewport: { width: 1000, height: 800 } });
      const page = await context.newPage();
      const errors = [];
      const external = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => {
        if (!route.request().url().startsWith(origin + '/')) { external.push(route.request().url()); return route.abort(); }
        return route.continue();
      });
      await page.addInitScript(() => {
        window.__activeObservers = 0;
        const Native = window.ResizeObserver;
        window.ResizeObserver = class extends Native {
          active = false;
          observe(...args) { if (!this.active) { this.active = true; window.__activeObservers++; } return super.observe(...args); }
          disconnect() { if (this.active) { this.active = false; window.__activeObservers--; } return super.disconnect(); }
        };
        const globalListeners = [];
        const add = EventTarget.prototype.addEventListener;
        const remove = EventTarget.prototype.removeEventListener;
        const capture = options => typeof options === 'boolean' ? options : !!options?.capture;
        EventTarget.prototype.addEventListener = function(type, listener, options) {
          if ((this === document || this === window) && !globalListeners.some(item => item.target === this && item.type === type && item.listener === listener && item.capture === capture(options))) {
            globalListeners.push({target:this,type,listener,capture:capture(options)});
          }
          return add.call(this, type, listener, options);
        };
        EventTarget.prototype.removeEventListener = function(type, listener, options) {
          const index = globalListeners.findIndex(item => item.target === this && item.type === type && item.listener === listener && item.capture === capture(options));
          if (index >= 0) globalListeners.splice(index, 1);
          return remove.call(this, type, listener, options);
        };
        window.__globalListeners = () => globalListeners.map(item => item.type).sort();
      });
      await page.goto(origin);
      await page.waitForFunction(() => window.entryReady);
      const initialListeners = await page.evaluate(() => window.__globalListeners());
      const checks = [];
      const open = (xml, options = {}, id = 'one') => page.evaluate(({ xml, options, id }) => openXml(xml, options, id), { xml, options, id });
      const state = () => page.evaluate(() => provider().getState());
      const matrix = () => page.locator('#one .djs-container .viewport').getAttribute('transform');

      assert.deepEqual(await page.evaluate(() => ({ id: bpmn.bpmnRendererDefinition.id, presets: bpmn.bpmnRendererDefinition.presets, extensions: bpmn.bpmnRendererDefinition.extensions })), { id: 'bpmn', presets: [], extensions: ['bpmn'] });
      for (const [label, xml] of [['simple', simple], ...(pizza ? [['pizza', pizza]] : [])]) {
        const result = await open(xml);
        assert.equal(result.status, 'ready', `${name} ${label}: ${await page.locator('#one .fv-bpmn-notice').textContent()}`);
        for (const id of expectedIds(xml)) assert.equal(await page.locator(`#one .djs-element[data-element-id="${id}"]`).count(), 1, `${label}: ${id}`);
        assert.equal(result.source, xml);
        const watermark = page.locator('#one .bjs-powered-by');
        assert.ok(await watermark.isVisible());
        assert.ok(await watermark.evaluate(el => {
          const b = el.getBoundingClientRect();
          return el.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2));
        }), 'Watermark must not be overlapped');
        await page.locator('#one').screenshot({ path: join(output, `${name}-${label}.png`) });
        checks.push(`${label}: ${expectedIds(xml).length} semantic shapes/connections, source and watermark`);
      }

      await page.evaluate(() => provider().setZoom(1.6));
      assert.equal((await state()).scale, 1.6);
      const beforeSource = await matrix();
      await page.locator('#one [data-bpmn-action=source]').click();
      assert.equal(await page.locator('#one .fv-bpmn-source').textContent(), pizza || simple);
      await page.evaluate(() => provider().setZoom(1.5));
      assert.equal(await page.locator('#one .fv-bpmn-source').evaluate(el => el.style.fontSize), '19.5px');
      await page.locator('#one [data-bpmn-action=diagram]').click();
      assert.equal((await state()).scale, 1.6);
      assert.equal(await matrix(), beforeSource, 'View switching must preserve diagram pan/zoom');
      await page.locator('#one [data-bpmn-action=zoom-in]').click();
      assert.ok((await state()).scale > 1.6);
      await page.locator('#one .fv-bpmn-diagram').dispatchEvent('wheel', { deltaY: -50, ctrlKey: true, clientX: 300, clientY: 250 });
      assert.ok((await state()).scale > 1.92);
      const badZoom = await state();
      await page.evaluate(() => { provider().setZoom(NaN); provider().setZoom(Infinity); });
      assert.deepEqual(await state(), badZoom);
      await page.evaluate(() => provider().setZoom(100));
      assert.equal((await state()).canZoomIn, false);
      await page.evaluate(() => provider().setZoom(-1));
      assert.equal((await state()).canZoomOut, false);
      await page.locator('#one [data-bpmn-action=actual]').click();
      assert.equal((await state()).scale, 1);
      const beforePan = await matrix();
      await page.mouse.move(300, 240);
      await page.mouse.down();
      await page.mouse.move(360, 280, { steps: 5 });
      await page.mouse.up();
      assert.notEqual(await matrix(), beforePan);
      await page.locator('#one [data-bpmn-action=fit]').click();
      const fitResult = await page.evaluate(() => provider().fit({mode:'width',resize:'until-interaction',padding:24,source:'api',reason:'api',viewportWidth:960,viewportHeight:650}));
      assert.equal(fitResult.applied, true);
      checks.push('Provider, source font zoom, toolbar, wheel, drag, clamp, fit and view preservation');

      assert.equal((await open(multi)).status, 'ready');
      assert.equal(await page.locator('#one select option').count(), 2);
      await page.locator('#one select').selectOption('Diagram_Order_Second');
      await page.waitForFunction(() => instances.get('one').$el.dataset.bpmnStatus === 'ready');
      assert.equal(await page.locator('#one select').inputValue(), 'Diagram_Order_Second');
      await page.evaluate(() => Promise.all([instances.get('one').selectDiagram('Diagram_Order'), instances.get('one').selectDiagram('Diagram_Order_Second')]));
      assert.equal(await page.locator('#one select').inputValue(), 'Diagram_Order_Second');
      checks.push('Multiple diagrams and queued switching');

      for (const [label, xml, status] of [
        ['no-DI', noDi, 'source-only'], ['malformed', '<broken><xml>', 'error'], ['non-BPMN', '<root/>', 'error'],
        ['malformed-BPMN', simple.replace('</bpmn:process>', ''), 'error'], ['empty-plane', empty, 'source-only'],
        ['DOCTYPE', noDi.replace('<bpmn:definitions', '<!DOCTYPE definitions SYSTEM "https://invalid.example/external.dtd"><bpmn:definitions'), 'error'],
      ]) {
        assert.equal((await open(xml)).status, status, label);
      assert.equal(await page.locator('#one .fv-bpmn-source').textContent(), xml);
        assert.ok(await page.locator('#one .fv-bpmn-source').isVisible());
        assert.ok(await page.locator('#one .fv-bpmn-notice').isVisible());
        assert.ok(await page.locator('#one [data-bpmn-action=diagram]').isDisabled());
      }
      assert.equal((await open(simple, {maxFileBytes:1})).status, 'error');
      const unicode = simple.replace('Review order', '审阅订单 &amp; café').replace(/\n/g, '\r\n');
      const utf16 = [...Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(unicode.replace('UTF-8', 'UTF-16'), 'utf16le')])];
      assert.equal((await open(utf16)).status, 'ready', await page.locator('#one .fv-bpmn-notice').textContent());
      assert.equal(await page.evaluate(() => instances.get('one').getSource()), '\uFEFF' + unicode.replace('UTF-8', 'UTF-16'));
      checks.push('No DI, malformed/non-BPMN XML, DTD, size limit, UTF-16/BOM/Unicode/CRLF');

      const partial = await open(simple.replace('sourceRef="Start"', 'sourceRef="Missing"'));
      assert.equal(partial.status, 'ready');
      assert.ok(Number(partial.warnings) > 0);
      assert.ok(await page.locator('#one .fv-bpmn-notice').isVisible());
      const recoverable = multi.replace(/(<bpmndi:BPMNPlane\b[^>]*>)[\s\S]*?(<\/bpmndi:BPMNPlane>)/, '$1$2');
      assert.equal((await open(recoverable)).status, 'source-only');
      await page.locator('#one select').selectOption('Diagram_Order_Second');
      await page.waitForFunction(() => instances.get('one').$el.dataset.bpmnStatus === 'ready');
      checks.push('Partial-import warnings and recovery from an empty first diagram');

      const attack = await open(hostile);
      assert.equal(attack.status, 'ready');
      assert.ok(Number(attack.warnings) >= 2);
      assert.equal(await page.evaluate(() => window.__bpmnExecuted || false), false);
      assert.equal(await page.locator('#one script,#one img,#one iframe,#one foreignObject').count(), 0);
      assert.equal(await page.locator('#one [fill*="invalid.example"],#one [stroke*="external-paint"]').count(), 0);
      assert.equal(attack.source, hostile);
      assert.deepEqual(external, []);
      const hostileMulti = hostile.replace('</bpmn:definitions>', `${secondDiagram}\n</bpmn:definitions>`);
      assert.equal((await open(hostileMulti)).status, 'ready');
      await page.evaluate(() => instances.get('one').selectDiagram('Diagram_Order_Second'));
      assert.ok(Number(await page.locator('#one .fv-bpmn').getAttribute('data-bpmn-warnings')) >= 2);
      const transparent = simple.replace('xmlns:bpmn=', 'xmlns:bioc="http://bpmn.io/schema/bpmn/biocolor/1.0" xmlns:bpmn=')
        .replace('id="Review_di"', 'id="Review_di" bioc:fill="none" bioc:stroke="#0f766e"');
      const colors = await open(transparent);
      assert.equal(colors.status, 'ready');
      assert.equal(colors.warnings, '0');
      assert.equal(await page.locator('#one [data-element-id=Review] .djs-visual > rect').evaluate(el => getComputedStyle(el).fill), 'none');
      checks.push('Script tasks and labels stay data; external/variable color paints removed only from render copy');

      await open(simple, {initialView:'source'});
      await page.locator('#one [data-bpmn-action=diagram]').click();
      assert.ok(await page.locator('#one .djs-element[data-element-id=Review]').isVisible());
      await context.setOffline(true);
      assert.equal((await open(simple)).status, 'ready');
      await context.setOffline(false);
      await page.evaluate(simple => openXml(simple, {}, 'one', {options:{locale:'en-US',theme:'dark'}}), simple);
      assert.equal(await page.locator('#one .fv-bpmn-diagram').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)');
      assert.equal(await page.locator('#one .fv-bpmn').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(23, 32, 51)');
      checks.push('Source-first import and offline re-render');

      await page.evaluate(() => { document.getElementById('one').style.display = 'none'; });
      assert.equal((await open(simple)).status, 'ready');
      await page.evaluate(() => { document.getElementById('one').style.display = ''; });
      await page.waitForFunction(() => provider().getState().scale > 1.1);
      await page.evaluate(() => { provider().setZoom(1.2); document.getElementById('one').style.width = '640px'; });
      await page.waitForFunction(() => document.querySelector('#one .fv-bpmn-diagram').clientWidth === 640);
      assert.equal((await state()).scale, 1.2, 'Manual zoom must survive resize');
      const offset = simple.replace(/\bx="([0-9.]+)"/g, (_, value) => `x="${Number(value) - 2000}"`);
      assert.equal((await open(offset)).status, 'ready');
      assert.ok(await page.locator('#one [data-element-id=Start]').isVisible());
      await page.evaluate(() => { document.getElementById('one').style.width = ''; });
      checks.push('Initially hidden host, manual zoom during resize, and negative DI coordinates');

      await open(simple, {}, 'two');
      await page.evaluate(() => { provider('one').setZoom(2); provider('two').setZoom(0.5); });
      assert.equal(await page.evaluate(() => provider('two').getState().scale), 0.5);
      const retained = await page.evaluate(async simple => {
        const old = instances.get('one');
        const current = await bpmn.renderFileViewerBpmn(new TextEncoder().encode(simple).buffer, document.getElementById('one'));
        instances.set('one', current);
        await current.ready;
        const p = old.unmount();
        const same = p === old.unmount();
        await p;
        return {same, current: current.$el.isConnected, other: instances.get('two').$el.isConnected};
      }, simple);
      assert.deepEqual(retained, {same:true,current:true,other:true});
      await page.mouse.move(300, 240);
      await page.mouse.down();
      await page.mouse.move(350, 275, {steps:3});
      await page.evaluate(async () => { await Promise.all([...instances.values()].map(instance => instance.unmount())); instances.clear(); });
      await page.mouse.up();
      const cancelled = await page.evaluate(async simple => {
        for (let index = 0; index < 8; index++) {
          const controller = new AbortController();
          const instance = await bpmn.renderFileViewerBpmn(new TextEncoder().encode(simple).buffer, document.getElementById('one'), {signal:controller.signal});
          controller.abort();
          await instance.unmount();
          await instance.ready;
        }
        return {nodes:document.querySelectorAll('.fv-bpmn,.bjs-container').length, provider:!!provider(), observers:window.__activeObservers};
      }, simple);
      assert.deepEqual(cancelled, {nodes:0,provider:false,observers:0});
      assert.deepEqual(await page.evaluate(() => window.__globalListeners()), initialListeners, 'No leaked global input listeners');
      checks.push('Two independent instances, replacement-safe/idempotent teardown and repeated import cancellation');

      const shadow = await page.evaluate(async simple => {
        const host = document.getElementById('one').attachShadow({mode:'open'});
        const target = document.createElement('div'); target.style.height='650px'; host.append(target);
        const instance = await bpmn.renderFileViewerBpmn(new TextEncoder().encode(simple).buffer, target);
        await instance.ready;
        const hit = target.querySelector('.djs-hit');
        const result = {status:instance.$el.dataset.bpmnStatus, hit:hit ? getComputedStyle(hit).fill : null,
          logo:!!target.querySelector('.bjs-powered-by'), notice:target.querySelector('.fv-bpmn-notice').textContent};
        await instance.unmount();
        return result;
      }, simple);
      assert.deepEqual(shadow, {status:'ready',hit:'none',logo:true,notice:''});
      checks.push('Shadow DOM receives upstream CSS without global imports');

      await page.goto(`${origin}/iife.html`);
      await page.waitForFunction(() => window.entryReady);
      assert.equal((await open(simple)).status, 'ready');
      await page.setViewportSize({width:390,height:740});
      await page.locator('#one [data-bpmn-action=fit]').click();
      assert.ok(await page.locator('#one .bjs-powered-by').isVisible());
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.locator('#one').screenshot({path:join(output, `${name}-narrow.png`)});
      checks.push('Standalone IIFE and 390px layout (desktop engine, not an iOS device claim)');
      assert.deepEqual(errors, []);
      assert.deepEqual(external, []);
      report.engines.push({name,version:browser.version(),checks,errors,external});
      console.log(`${name}: ${checks.length} groups passed`);
    } finally { await browser.close(); }
  }
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.error = error.stack || String(error);
  throw error;
} finally {
  await writeFile(join(output, 'CURRENT.json'), JSON.stringify(report, null, 2) + '\n');
  await new Promise(resolve => server.close(resolve));
}
console.log(`BPMN evidence: ${output}`);
