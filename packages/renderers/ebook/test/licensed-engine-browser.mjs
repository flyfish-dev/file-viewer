import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '../../../..');
const require = createRequire(join(root, 'packages/renderers/ebook/package.json'));
const engineRequire = createRequire(require.resolve('epubjs/package.json'));
const JSZip = engineRequire('jszip');
const { build } = require('esbuild');
const output = resolve(process.env.EPUB_LICENSE_OUTPUT || join(root, '.release/licensed-epub-browser'));
await mkdir(output, { recursive: true });
const zip = new JSZip();
const files = {
  mimetype: 'application/epub+zip',
  'META-INF/container.xml': '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
  'OPS/content.opf': '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">licensed-engine-generated-fixture</dc:identifier><dc:title>Path and resource fixture</dc:title><dc:language>en</dc:language><meta property="dcterms:modified">2026-10-12T00:00:00Z</meta></metadata><manifest><item id="nav" href="Navigation/nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="one" href="Text/one.xhtml" media-type="application/xhtml+xml"/><item id="two" href="Text/two.xhtml" media-type="application/xhtml+xml"/><item id="css" href="Styles/main.css" media-type="text/css"/><item id="cover" href="Images/cover.png" media-type="image/png" properties="cover-image"/></manifest><spine><itemref idref="one"/><itemref idref="two"/></spine></package>',
  'OPS/Navigation/nav.xhtml': '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc" id="toc"><ol><li><a href="../Text/one.xhtml#start">First chapter</a></li><li><a href="../Text/two.xhtml#end">Second chapter</a></li></ol></nav></body></html>',
  'OPS/Styles/main.css': '.fixture { border-left: 7px solid rgb(17, 83, 119); background-image:url("../Images/cover.png"); } img { width:32px; height:32px; }',
};
for (const [name, data] of Object.entries(files)) zip.file(name, data, { date: new Date('2026-10-12T00:00:00Z') });
for (const [file, heading, anchor] of [['one', 'First chapter', 'start'], ['two', 'Second chapter', 'end']]) {
  zip.file(`OPS/Text/${file}.xhtml`, `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>${heading}</title><link rel="stylesheet" href="../Styles/main.css"/></head><body><h1 id="${anchor}">${heading}</h1><p class="fixture">Generated local fixture for relative CSS and paths.</p>${Array.from({ length: 45 }, (_, i) => `<p>Local paragraph ${i + 1}: reading navigation remains available across multiple pages in this generated fixture.</p>`).join('')}<img id="relative-image" src="../Images/cover.png" alt="Generated cover"/></body></html>`, { date: new Date('2026-10-12T00:00:00Z') });
}
zip.file('OPS/Images/cover.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jEuoAAAAASUVORK5CYII=', 'base64'), { date: new Date('2026-10-12T00:00:00Z') });
zip.forEach((_name, file) => { file.date = new Date('2026-10-12T00:00:00Z'); });
const sample = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
await writeFile(join(output, 'generated-fixture.epub'), sample);
const bundle = await build({
  stdin: {
    contents: `import renderEpub from './packages/renderers/ebook/src/epub.ts';
      import { extractEpubCover } from './packages/thumbnail/src/embedded/epub.ts';
      const originalCreate = URL.createObjectURL.bind(URL), originalRevoke = URL.revokeObjectURL.bind(URL);
      window.liveUrls = new Map(); window.revokedUrls = [];
      URL.createObjectURL = blob => { const url = originalCreate(blob); window.liveUrls.set(url, { type: blob.type, bytes: blob.size }); return url; };
      URL.revokeObjectURL = url => { window.revokedUrls.push(url); window.liveUrls.delete(url); originalRevoke(url); };
      const buffer = await (await fetch('/sample.epub')).arrayBuffer();
      const cover = await extractEpubCover({ buffer });
      window.coverResult = { type: cover?.type, bytes: cover?.size, liveUrls: window.liveUrls.size, remainingUrls: [...window.liveUrls], revokedUrls: window.revokedUrls.slice() };
      const controller = new AbortController();
      const cancelled = extractEpubCover({ buffer }, controller.signal).then(() => 'completed', error => error.name);
      setTimeout(() => controller.abort(), 0);
      window.abortResult = await cancelled;
      await new Promise(resolve => setTimeout(resolve, 200));
      window.abortLiveUrls = window.liveUrls.size;
      window.instance = await renderEpub(buffer, document.querySelector('#viewer'));
      window.loaded = true;`,
    resolveDir: root, sourcefile: 'licensed-engine-fixture.js',
  },
  bundle: true, format: 'esm', platform: 'browser', target: 'es2022', write: false,
  plugins: [{ name: 'normal-local-epub-engine', setup(context) {
    context.onResolve({ filter: /^(?:\.\/|\.\.\/)vendor\/epubjs\.js$/ }, args => args.importer.includes('/thumbnail/')
      ? { path: join(root, 'packages/thumbnail/dist/vendor/epubjs.js') }
      : { path: 'reader-engine-observer', namespace: 'license-browser' });
    context.onLoad({ filter: /.*/, namespace: 'license-browser' }, () => ({
      loader: 'js', resolveDir: root,
      contents: `import ePub from ${JSON.stringify(join(root, 'packages/renderers/ebook/dist/vendor/epubjs.js'))};
        const observed = new Proxy(ePub, { apply(factory, receiver, args) {
          const book = Reflect.apply(factory, receiver, args), render = book.renderTo.bind(book);
          window.compareCfi = (a, b) => new ePub.CFI().compare(a, b);
          book.renderTo = (...options) => {
            const rendition = render(...options);
            rendition.on('relocated', location => { window.lastLocation = location.start; });
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
  } }],
});
const server = createServer((request, response) => {
  if (request.url === '/sample.epub') response.writeHead(200, { 'Content-Type': 'application/epub+zip' }).end(sample);
  else if (request.url === '/entry.js') response.writeHead(200, { 'Content-Type': 'text/javascript' }).end(bundle.outputFiles[0].contents);
  else if (request.url === '/') response.writeHead(200, { 'Content-Type': 'text/html' }).end('<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:100%;height:100%}#viewer{width:100%;height:100%}</style></head><body><div id="viewer"></div><script type="module" src="/entry.js"></script></body></html>');
  else response.writeHead(404).end();
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const report = {
  generatedFixtureSha256: createHash('sha256').update(sample).digest('hex'),
  engineSha256: createHash('sha256').update(await readFile(join(root, 'packages/renderers/ebook/dist/vendor/epubjs.js'))).digest('hex'),
  thumbnailEngineSha256: createHash('sha256').update(await readFile(join(root, 'packages/thumbnail/dist/vendor/epubjs.js'))).digest('hex'),
  errors: [], externalRequests: [], checks: [], knownLifecycleObservations: [],
};
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  report.browser = browser.version();
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  page.on('pageerror', error => report.errors.push(error.message));
  await page.route('**/*', route => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    report.externalRequests.push(route.request().url()); return route.abort();
  });
  await page.goto(origin);
  await page.waitForFunction(() => window.loaded);
  await page.waitForSelector('.epub-state[hidden]', { state: 'attached' });
  report.factoryProtocol = await page.evaluate(() => window.epubFactoryProtocol);
  assert.deepEqual(report.factoryProtocol, { ownKeys: true, staticDescriptors: true, renditionIdentity: true, continuousManagerIdentity: true });
  report.cover = await page.evaluate(() => window.coverResult);
  assert.equal(report.cover.type, 'image/png'); assert.ok(report.cover.bytes > 0);
  report.knownLifecycleObservations.push({ operation: 'thumbnail', liveUrls: report.cover.liveUrls, scope: 'Existing upstream URL lifecycle; functionality restored from 43c71de3 as requested' });
  report.checks.push('cover-thumbnail');
  assert.equal(await page.evaluate(() => window.abortResult), 'AbortError');
  report.knownLifecycleObservations.push({ operation: 'abort', liveUrls: await page.evaluate(() => window.abortLiveUrls) });
  report.checks.push('abort-cover-opening');
  const heading = () => page.locator('.epub-stage iframe').evaluateAll(frames => frames.map(f => f.contentDocument?.querySelector('h1')?.textContent));
  assert.ok((await heading()).includes('First chapter'));
  const resources = await page.locator('.epub-stage iframe').first().evaluate(frame => ({
    imageWidth: frame.contentDocument.querySelector('#relative-image').naturalWidth,
    border: frame.contentWindow.getComputedStyle(frame.contentDocument.querySelector('.fixture')).borderLeftWidth,
    background: frame.contentWindow.getComputedStyle(frame.contentDocument.querySelector('.fixture')).backgroundImage,
  }));
  assert.equal(resources.imageWidth, 1); assert.equal(resources.border, '7px'); assert.match(resources.background, /blob:/);
  report.resources = resources; report.checks.push('nested-relative-image-CSS-and-CSS-url');
  if (await page.locator('.epub-toc').isHidden()) await page.locator('.epub-icon-button').click();
  assert.deepEqual(await page.locator('.epub-toc-item').allTextContents(), ['First chapter', 'Second chapter']);
  await page.locator('.epub-toc-item').filter({ hasText: 'Second chapter' }).click();
  await page.waitForFunction(() => [...document.querySelectorAll('.epub-stage iframe')].some(f => f.contentDocument?.querySelector('h1')?.textContent === 'Second chapter'));
  report.checks.push('nested-TOC-relative-fragment-target');
  await page.waitForFunction(() => window.lastLocation?.href === 'Text/two.xhtml' && !document.querySelector('.epub-button').disabled);
  const tocLocation = await page.evaluate(() => window.lastLocation);
  await page.locator('.epub-button').first().click();
  await page.waitForFunction(previous => window.lastLocation?.cfi && window.compareCfi(window.lastLocation.cfi, previous) < 0, tocLocation.cfi);
  const previousLocation = await page.evaluate(() => window.lastLocation);
  await page.locator('.epub-button').last().click();
  await page.waitForFunction(previous => window.lastLocation?.cfi && window.compareCfi(window.lastLocation.cfi, previous) > 0, previousLocation.cfi);
  report.pageLocations = { tocLocation, previousLocation, nextLocation: await page.evaluate(() => window.lastLocation) };
  report.checks.push('previous-and-next-page');
  await page.screenshot({ path: join(output, 'reader.png') });
  await page.evaluate(() => window.instance.unmount());
  assert.equal(await page.locator('.epub-stage iframe').count(), 0);
  report.knownLifecycleObservations.push({ operation: 'reader-destroy', liveUrls: await page.evaluate(() => window.liveUrls.size) });
  report.checks.push('destroy-iframe');
  assert.deepEqual(report.errors, []); assert.deepEqual(report.externalRequests, []);
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.failure = error.stack; throw error;
} finally {
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close(); await new Promise(resolve => server.close(resolve));
}
console.log(JSON.stringify(report));
