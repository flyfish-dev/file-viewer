import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(packageRoot, '../../..');
const packageRequire = createRequire(join(packageRoot, 'package.json'));
const { build } = packageRequire('esbuild');
const samplePath = resolve(process.env.EPUB_300_SAMPLE || join(root, '.release/issue-300/moby-dick.epub'));
const output = resolve(process.env.EPUB_300_OUTPUT || join(root, '.release/issue-300/current'));
const recordOnly = process.argv.includes('--record-only');
const useDemo = process.argv.includes('--demo');
await mkdir(output, { recursive: true });
const sample = await readFile(samplePath);

const bundle = await build({
  stdin: {
    contents: `import renderEpub from './packages/renderers/ebook/src/epub.ts';
      window.mountBook = async () => {
        window.instance?.unmount();
        window.epubEvents = [];
        window.instance = await renderEpub(await (await fetch('/sample.epub')).arrayBuffer(), document.querySelector('#viewer'));
      };
      await window.mountBook();`,
    resolveDir: root,
    sourcefile: 'issue-300-entry.js',
  },
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  write: false,
  plugins: [{
    name: 'observe-epub-engine',
    setup(context) {
      context.onResolve({ filter: /^\.\/vendor\/epubjs\.js$/ }, () => ({
        path: 'epub-engine-observer', namespace: 'issue-300',
      }));
      context.onLoad({ filter: /.*/, namespace: 'issue-300' }, () => ({
        resolveDir: root,
        contents: `import ePub from ${JSON.stringify(join(packageRoot, 'dist/vendor/epubjs.js'))};
          const observed = new Proxy(ePub, { apply(factory, receiver, args) {
            const book = Reflect.apply(factory, receiver, args);
            window.epubBook = book;
            const renderTo = book.renderTo.bind(book);
            book.renderTo = (...renderArgs) => {
              const rendition = renderTo(...renderArgs);
              window.epubRendition = rendition;
              for (const name of ['relocated', 'rendered', 'resized']) {
                rendition.on(name, value => window.epubEvents.push({
                  time: performance.now(), name,
                  href: value?.start?.href || value?.href,
                  width: value?.width, height: value?.height,
                }));
              }
              return rendition;
            };
            return book;
          } });
          const keys = Reflect.ownKeys(ePub);
          const protocol = {
            ownKeys: keys.length === Reflect.ownKeys(observed).length && keys.every(key => Reflect.ownKeys(observed).includes(key)),
            staticDescriptors: keys.every(key => {const expected=Object.getOwnPropertyDescriptor(ePub,key), actual=Object.getOwnPropertyDescriptor(observed,key);return Reflect.ownKeys(expected).every(field=>expected[field]===actual[field]);}),
            renditionIdentity: observed.Rendition === ePub.Rendition,
            continuousManagerIdentity: observed.Rendition.prototype.requireManager('continuous') === ePub.Rendition.prototype.requireManager('continuous'),
          };
          if (!Object.values(protocol).every(Boolean)) throw new Error('Observed EPUB factory must preserve the real factory protocol');
          window.epubFactoryProtocol = protocol;
          export default observed;`,
      }));
    },
  }],
});

const server = createServer((request, response) => {
  if (request.url === '/sample.epub') {
    response.writeHead(200, { 'Content-Type': 'application/epub+zip' }).end(sample);
  } else if (request.url === '/entry.js') {
    response.writeHead(200, { 'Content-Type': 'text/javascript' }).end(bundle.outputFiles[0].contents);
  } else if (request.url === '/') {
    response.writeHead(200, { 'Content-Type': 'text/html' }).end(`<!doctype html>
      <html><head><meta charset="utf-8"><style>
      html,body{margin:0;width:100%;height:100%;overflow:hidden}
      #viewer{width:100%;height:100%}
      </style></head><body><div id="viewer"></div><script type="module" src="/entry.js"></script></body></html>`);
  } else {
    response.writeHead(404).end();
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
let demoServer;
const report = {
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  sampleSha256: createHash('sha256').update(sample).digest('hex'),
  sourceSha256: createHash('sha256').update(await readFile(join(packageRoot, 'src/epub.ts'))).digest('hex'),
  mediaSourceSha256: createHash('sha256').update(await readFile(join(packageRoot, 'src/epub-viewport-media.ts'))).digest('hex'),
  runtime: useDemo ? 'vue3-vite-demo' : 'isolated-renderer-bundled-engine',
  engineSha256: useDemo ? undefined : createHash('sha256').update(await readFile(join(packageRoot, 'dist/vendor/epubjs.js'))).digest('hex'),
  phases: [],
  errors: [],
  externalRequests: [],
};

try {
  browser = await chromium.launch({ channel: 'chrome', headless: !process.argv.includes('--headed') });
  report.browser = browser.version();
  const viewport = { width: Number(process.env.EPUB_300_WIDTH || 1728), height: 1000 };
  report.viewport = viewport;
  const page = await browser.newPage({ viewport });
  page.on('pageerror', error => report.errors.push(error.message));
  let pageOrigin = origin;
  if (useDemo) {
    const demoRoot = join(root, 'apps/viewer-demo');
    const demoRequire = createRequire(join(demoRoot, 'package.json'));
    const { createServer: createViteServer } = await import(pathToFileURL(demoRequire.resolve('vite')).href);
    demoServer = await createViteServer({
      root: demoRoot,
      configFile: join(demoRoot, 'vite.config.ts'),
      cacheDir: join(output, 'vite-cache'),
      server: { host: '127.0.0.1', port: 0 },
      logLevel: 'warn',
    });
    await demoServer.listen();
    pageOrigin = `http://127.0.0.1:${demoServer.httpServer.address().port}`;
    report.vite = demoRequire('vite/package.json').version;
  }
  await page.route('**/*', route => {
    if (new URL(route.request().url()).origin === pageOrigin) return route.continue();
    report.externalRequests.push(route.request().url());
    return route.abort();
  });
  await page.goto(pageOrigin);
  if (useDemo) {
    await page.locator('.viewer-file-identity').hover();
    await page.locator('.rail-nav-button--upload:not([aria-hidden="true"])').click();
    await page.locator('.desktop-upload-dropzone input[type=file]').setInputFiles({
      name: 'moby-dick.epub', mimeType: 'application/epub+zip', buffer: sample,
    });
  }
  await page.waitForSelector('.epub-state[hidden]', { state: 'attached' });
  if (!useDemo) {
    report.factoryProtocol = await page.evaluate(() => window.epubFactoryProtocol);
    assert.deepEqual(report.factoryProtocol, { ownKeys: true, staticDescriptors: true, renditionIdentity: true, continuousManagerIdentity: true });
  }

  const observe = async (name, chapterNumber, expectedFont) => {
    const trace = await page.locator('.epub-stage').evaluate(async stage => {
      const start = performance.now();
      const records = [];
      let previous = '';
      await new Promise(resolve => {
        const tick = () => {
          const container = stage.querySelector('.epub-container');
          const frames = [...stage.querySelectorAll('iframe')].map(frame => {
            const doc = frame.contentDocument;
            const paragraph = doc?.querySelector('p');
            const rect = frame.getBoundingClientRect();
            return {
              ref: frame.parentElement.getAttribute('ref'),
              top: Math.round(rect.top * 100) / 100,
              width: Math.round(rect.width * 100) / 100,
              height: Math.round(rect.height * 100) / 100,
              font: paragraph ? frame.contentWindow.getComputedStyle(paragraph).fontFamily : '',
              orientation: frame.contentWindow.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape',
              heading: doc?.querySelector('h1,h2')?.textContent?.trim(),
              visibility: frame.style.visibility,
              sandbox: frame.getAttribute('sandbox'),
            };
          });
          const viewport = container?.getBoundingClientRect();
          const state = {
            viewportTop: viewport?.top,
            viewportHeight: viewport?.height,
            scrollTop: container?.scrollTop,
            frames,
          };
          const serialized = JSON.stringify(state);
          if (serialized !== previous) records.push({ elapsed: Math.round(performance.now() - start), ...state });
          previous = serialized;
          if (performance.now() - start < 3500) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });
      return records;
    });
    const phase = {
      name,
      trace,
      changesAfterSettling: trace.filter(item => item.elapsed > 1500).length,
      events: await page.evaluate(() => window.epubEvents?.splice(0) || []),
    };
    report.phases.push(phase);
    await page.screenshot({ path: join(output, `${name}.png`) });
    console.log(JSON.stringify({ name, changesAfterSettling: phase.changesAfterSettling, changes: trace.length }));
    if (!recordOnly) {
      assert.equal(phase.changesAfterSettling, 0, `${name}: EPUB keeps reflowing after settling`);
      const last = trace.at(-1);
      const visible = last.frames.filter(frame => frame.visibility === 'visible'
        && frame.height > 0 && frame.top + frame.height > last.viewportTop
        && frame.top < last.viewportTop + last.viewportHeight);
      assert.ok(visible.length, `${name}: no readable chapter in the viewport`);
      for (const frame of last.frames) assert.equal(frame.sandbox, 'allow-same-origin');
      if (chapterNumber) {
        const selected = visible.find(frame => frame.heading?.startsWith(`Chapter ${chapterNumber}.`));
        assert.ok(selected, `${name}: selected chapter is not visible`);
        assert.ok(Math.abs(selected.top - last.viewportTop) < 2, `${name}: selected chapter moved away from its start`);
      }
      if (expectedFont) {
        for (const frame of visible) assert.equal(frame.font, expectedFont, `${name}: orientation style did not follow the reader viewport`);
      }
    }
    return trace.at(-1);
  };

  const chapter = async pattern => {
    if (await page.locator('.epub-toc').isHidden()) await page.locator('.epub-icon-button').click();
    const button = page.locator('.epub-toc-item').filter({ hasText: pattern }).first();
    await button.click();
  };

  report.toc = await page.locator('.epub-toc-item').allTextContents();
  await observe('initial', 1, 'sans-serif');
  await chapter(/^Chapter 2\./);
  await observe('chapter-2', 2, 'sans-serif');
  await chapter(/^Chapter 1\./);
  await observe('chapter-1-return', 1, 'sans-serif');
  if (!useDemo) {
    await page.locator('.epub-icon-button').click();
    await observe('toc-open', 1);
    await page.locator('.epub-icon-button').click();
    await page.locator('.epub-button').last().click();
    const nextPage = await observe('next-page');
    if (!recordOnly) {
      assert.ok(nextPage.frames.some(frame => frame.heading?.startsWith('Chapter 1.') && frame.top < nextPage.viewportTop - 10));
    }
    await page.locator('.epub-button').first().click();
    await observe('previous-page', 1);
    await page.setViewportSize({ width: 900, height: 1400 });
    await observe('portrait-reader', undefined, 'serif');
    await page.setViewportSize(viewport);
    await observe('landscape-reader', undefined, 'sans-serif');
    await page.evaluate(() => window.instance.unmount());
    assert.equal(await page.locator('.epub-stage iframe').count(), 0);
    await page.setViewportSize({ width: viewport.width - 100, height: viewport.height });
    await page.evaluate(() => window.mountBook());
    await page.waitForSelector('.epub-state[hidden]', { state: 'attached' });
    await observe('remount', 1, 'sans-serif');
  }
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.externalRequests, []);
  report.passed = !recordOnly;
} catch (error) {
  report.passed = false;
  report.failure = String(error);
  throw error;
} finally {
  await writeFile(join(output, 'CURRENT.json'), `${JSON.stringify(report, null, 2)}\n`);
  await browser?.close();
  await demoServer?.close();
  await new Promise(resolve => server.close(resolve));
}
