import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { browserCorePlugin } from '../../../build-support/browser-runtime-options.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const dependencyRoot = resolve(process.env.EPUB_488_DEPENDENCY_ROOT || root);
const require = createRequire(join(dependencyRoot, 'packages/renderers/ebook/package.json'));
const prebuilt = process.env.EPUB_488_PREBUILT_DIR;
const { build } = prebuilt ? {} : require('esbuild');
const JSZip = require(prebuilt ? join(prebuilt, 'jszip.cjs') : 'jszip');
const engines = await import(process.env.EPUB_488_PLAYWRIGHT_MODULE || 'playwright');
const output = resolve(process.env.EPUB_488_OUTPUT || join(root, '.release/issue-488'));
const baseline = process.argv.includes('--baseline');
const enginePath = join(dependencyRoot, 'packages/renderers/ebook/dist/vendor/epubjs.js');
const digest = data => createHash('sha256').update(data).digest('hex');
await mkdir(output, { recursive: true });
// Valid IDAT CRC: Firefox checks it rather than accepting a damaged test image.
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=', 'base64');
const font = await readFile(prebuilt ? join(prebuilt, 'font.woff2') : join(root, 'test/fixtures/chart-font/noto-sans-sc-latin-wght-normal.woff2'));
const requests = [];
const trap = createServer((request, response) => {
  requests.push(request.url);
  response.setHeader('Access-Control-Allow-Origin', '*');
  if (request.url.includes('.css')) response.writeHead(200, { 'Content-Type': 'text/css' }).end('body{--remote-css:loaded}');
  else if (request.url.includes('.woff2')) response.writeHead(200, { 'Content-Type': 'font/woff2' }).end(font);
  else if (request.url.includes('.png')) response.writeHead(200, { 'Content-Type': 'image/png' }).end(png);
  else response.writeHead(200, { 'Content-Type': 'text/html' }).end('<!doctype html><p>External frame</p>');
});
await new Promise(resolve => trap.listen(0, '127.0.0.1', resolve));
const external = `http://127.0.0.1:${trap.address().port}`;
const makeBook = async (refresh = false, remoteCover = false, mixedCase = false, parserBoundary = false, smil = false) => {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OPS/book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  zip.file('OPS/book.opf', `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">synthetic-offline-policy</dc:identifier><dc:title>Offline resource policy</dc:title><dc:language>en</dc:language><meta name="cover" content="cover"/></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="one" href="text/one.xhtml" media-type="application/xhtml+xml"/><item id="two" href="text/two.xhtml" media-type="application/xhtml+xml"/><item id="css" href="style.css" media-type="text/css"/><item id="font" href="font.woff2" media-type="font/woff2"/><item id="image" href="local.png" media-type="image/png"/><item id="cover" href="${remoteCover ? external + '/cover.png' : 'cover.png'}" media-type="image/png" properties="cover-image"/></manifest><spine><itemref idref="one"/><itemref idref="two"/></spine></package>`);
  zip.file('OPS/nav.xhtml', '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><ol><li><a href="text/one.xhtml">One</a></li><li><a href="text/two.xhtml">Two</a></li></ol></nav></body></html>');
  zip.file('OPS/style.css', '@font-face{font-family:LocalBook;src:url(font.woff2)} .local{color:rgb(23,105,45);font-family:LocalBook}');
  zip.file('OPS/font.woff2', font);
  zip.file('OPS/local.png', png);
  zip.file('OPS/cover.png', png);
  const body = `<h1>Chapter one</h1><p class="local" id="local">Local readable content</p><img id="local-image" src="../local.png"/><img id="data-image" src="data:image/png;base64,${png.toString('base64')}"/><a id="fragment" href="#notes">Notes</a><a id="cross-chapter" href="two.xhtml#second">Second chapter</a><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="300" height="40"><a id="svg-cross" xlink:href="two.xhtml#second"><text x="5" y="25">SVG book navigation</text></a></svg><img src="${external}/image.png"/><iframe src="${external}/frame"></iframe><object data="${external}/object"></object><div style="background-image:url('${external}/inline.png')">background</div><p class="remote-font">Remote font</p>${'<p>Readable archive paragraph.</p>'.repeat(60)}<p id="notes">Notes within the first chapter</p>`;
  const mixedMarkup = `<IMG SRC="${external}/mixed-image.png" SRCSET="${external}/mixed-srcset.png 2x"/><IFRAME SrC="${external}/mixed-frame"/><a id="mixed-anchor" HrEf="${external}/mixed-navigation">External</a><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><a xlink:href="${external}/svg-navigation"><text>External SVG link</text></a><foreignObject><meta xmlns="http://www.w3.org/1999/xhtml" HTTP-EQUIV="Refresh" CONTENT="0;url=${external}/foreign-refresh"/></foreignObject></svg>`;
  const parserMarkup = `<textarea><![CDATA[</textarea><meta HTTP-EQUIV="refresh" content="0;url=${external}/cdata-refresh">]]></textarea><?offline test ><meta http-equiv="refresh" content="0;url=${external}/pi-refresh"/>?><style><![CDATA[body > .cdata-style{color:rgb(71,29,103)}]]></style><p class="cdata-style">CDATA stylesheet remains usable</p>`;
  const smilMarkup = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="40"><a id="smil-link" href="two.xhtml#second"><text x="5" y="25">Animated book link</text><set attributeName="href" to="${external}/smil-navigation" begin="0.05s" dur="indefinite"/><animate xmlns="urn:foreign" attributeName="href" to="${external}/foreign-smil-navigation" begin="0.05s" dur="indefinite"/></a></svg>`;
  zip.file('OPS/text/one.xhtml', `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>One</title>${refresh ? `<base href="${external}/base/"/><meta http-equiv="ReFrEsH" content="0;url=${external}/refresh"/>` : ''}${mixedCase ? `<BASE HREF="${external}/mixed-base/"/><META HTTP-EQUIV="ReFrEsH" CONTENT="0;url=${external}/mixed-refresh"/><link ReL="stylesheet" HrEf="${external}/mixed.css"/>` : ''}<link rel="stylesheet" href="../style.css"/><link rel="stylesheet" href="${external}/remote.css"/><style>@import url('${external}/import.css');@font-face{font-family:RemoteBook;src:url('${external}/remote.woff2')} .remote-font{font-family:RemoteBook}</style></head><body>${body}${mixedCase ? mixedMarkup : ''}${parserBoundary ? parserMarkup : ''}${smil ? smilMarkup : ''}</body></html>`);
  zip.file('OPS/text/two.xhtml', '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Two</title></head><body><h1 id="second">Chapter two</h1><p>Second readable archive chapter</p><a id="back" href="one.xhtml#notes">Back to notes</a></body></html>');
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
};
const samples = { resources: await makeBook(), refresh: await makeBook(true), cover: await makeBook(false, true), mixed: await makeBook(false, false, true), parser: await makeBook(false, false, false, true), smil: await makeBook(false, false, false, false, true) };
for (const [name, bytes] of Object.entries(samples)) await writeFile(join(output, `${name}.epub`), bytes);
const bundle = prebuilt ? { outputFiles: [{ contents: await readFile(join(prebuilt, 'entry.js')) }] } : await build({
  stdin: { contents: `import renderEpub from './packages/renderers/ebook/src/epub.ts';
    window.mountBook = async (name, policy) => {
      window.instance?.unmount(); window.adapter = null;
      window.instance = await renderEpub(await (await fetch('/' + name + '.epub')).arrayBuffer(), document.querySelector('#viewer'), {
        options: policy === undefined ? {} : {epub:{externalResources:policy}},
        registerThumbnailAdapter: value => window.adapter = value,
      });
    };`, resolveDir: root, sourcefile: 'issue-488-entry.js' },
  bundle: true, format: 'esm', platform: 'browser', target: 'es2022', write: false,
  nodePaths: [join(dependencyRoot, 'node_modules'), join(dependencyRoot, 'packages/core/node_modules')],
  plugins: [browserCorePlugin(root), {
    name: 'observe-real-archive-engine', setup(context) {
      context.onResolve({ filter: /^\.\/vendor\/epubjs\.js$/ }, () => ({ path: 'observed-engine', namespace: 'issue-488' }));
      context.onLoad({ filter: /.*/, namespace: 'issue-488' }, () => ({ resolveDir: root, contents: `import ePub from ${JSON.stringify(enginePath)};
        const observed = new Proxy(ePub, { apply(factory, receiver, args) {const book=Reflect.apply(factory,receiver,args);window.epubBook=book;window.engineOptions=args[1];
          const original=book.renderTo.bind(book);book.renderTo=(...args)=>{const rendition=original(...args);window.epubRendition=rendition;window.displayCalls=[];window.displayed=[];
            const display=rendition.display.bind(rendition);rendition.display=(href)=>{window.displayCalls.push(href);return display(href)};
            rendition.on('displayed',section=>window.displayed.push(section.href));return rendition};return book;} });
        const keys = Reflect.ownKeys(ePub);
        const protocol = {
          ownKeys: keys.length === Reflect.ownKeys(observed).length && keys.every(key => Reflect.ownKeys(observed).includes(key)),
          staticDescriptors: keys.every(key => {const expected=Object.getOwnPropertyDescriptor(ePub,key), actual=Object.getOwnPropertyDescriptor(observed,key);return Reflect.ownKeys(expected).every(field=>expected[field]===actual[field]);}),
          renditionIdentity: observed.Rendition === ePub.Rendition,
          continuousManagerIdentity: observed.Rendition.prototype.requireManager('continuous') === ePub.Rendition.prototype.requireManager('continuous'),
        };
        if (!Object.values(protocol).every(Boolean)) throw new Error('Observed EPUB factory must preserve the real factory protocol');
        window.epubFactoryProtocol = protocol;
        export default observed;` }));
    },
  }],
});
const inputManifest = prebuilt ? JSON.parse(await readFile(join(prebuilt, 'input-manifest.json'), 'utf8')) : {
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  engineSha256: digest(await readFile(enginePath)),
  sourceSha256: digest(await readFile(join(root, 'packages/renderers/ebook/src/epub.ts'))),
  policySha256: digest(await readFile(join(root, 'packages/renderers/ebook/src/epub-resource-policy.ts')).catch(() => Buffer.from('absent'))),
  bundleSha256: digest(bundle.outputFiles[0].contents),
};
assert.equal(digest(bundle.outputFiles[0].contents), inputManifest.bundleSha256, 'browser bundle must match the input manifest');
if (process.env.EPUB_488_EXPORT_DIR && !prebuilt) {
  const exported = resolve(process.env.EPUB_488_EXPORT_DIR);
  await mkdir(exported, { recursive: true });
  await writeFile(join(exported, 'entry.js'), bundle.outputFiles[0].contents);
  await writeFile(join(exported, 'font.woff2'), font);
  await writeFile(join(exported, 'input-manifest.json'), JSON.stringify(inputManifest, null, 2) + '\n');
  await build({ entryPoints: [require.resolve('jszip')], bundle: true, platform: 'node', format: 'cjs', outfile: join(exported, 'jszip.cjs') });
  await build({ entryPoints: [fileURLToPath(import.meta.url)], bundle: true, packages: 'external', platform: 'node', format: 'esm', outfile: join(exported, 'runner.mjs') });
}
const unexpectedViewerRequests = [];
const server = createServer((request, response) => {
  const name = request.url.slice(1).replace(/\.epub$/, '');
  if (samples[name]) response.writeHead(200, { 'Content-Type': 'application/epub+zip' }).end(samples[name]);
  else if (request.url === '/entry.js') response.writeHead(200, { 'Content-Type': 'text/javascript' }).end(bundle.outputFiles[0].contents);
  else if (request.url === '/') response.writeHead(200, { 'Content-Type': 'text/html' }).end('<!doctype html><html><head><style>html,body,#viewer{margin:0;width:100%;height:100%;overflow:hidden}</style></head><body><div id="viewer"></div><script type="module" src="/entry.js"></script></body></html>');
  else { if (request.url !== '/favicon.ico') unexpectedViewerRequests.push(request.url); response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const report = { ...inputManifest, baseline, samples: Object.fromEntries(Object.entries(samples).map(([name, bytes]) => [name, digest(bytes)])), cases: [], errors: [] };
let browser;
let page;
try {
  const engine = process.env.EPUB_488_BROWSER || 'chromium';
  assert.ok(['chromium', 'firefox', 'webkit'].includes(engine));
  browser = await engines[engine].launch({ ...(process.env.EPUB_488_BROWSER ? {} : { channel: 'chrome' }), headless: true });
  report.engine = engine;
  report.browser = browser.version();
  page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => typeof window.mountBook === 'function');
  const run = async (name, policy) => {
    console.log('Starting', name, policy ?? 'default');
    requests.length = 0;
    unexpectedViewerRequests.length = 0;
    await page.evaluate(([name, policy]) => window.mountBook(name, policy), [name, policy]);
    await page.waitForSelector('.epub-state[hidden]', { state: 'attached', timeout: 15000 });
    await page.waitForTimeout(700);
    const facts = await page.evaluate(async () => {
      const frame = document.querySelector('.epub-stage iframe');
      const doc = frame.contentDocument;
      const local = doc.querySelector('#local');
      const image = doc.querySelector('#local-image');
      const dataImage = doc.querySelector('#data-image');
      const fonts = local ? await Promise.race([doc.fonts.load('16px LocalBook'), new Promise((_, reject) => setTimeout(() => reject(new Error('Local font timed out')), 3000))]) : [];
      let cover = null, coverError = null;
      try { cover = await window.adapter.capture({}); } catch (error) { coverError = error.message; }
      const cdataStyle = doc.querySelector('.cdata-style');
      return { text: doc.body.textContent, cspFirst: doc.head.firstElementChild?.getAttribute('http-equiv'), baseCount: doc.querySelectorAll('base').length, refreshCount: [...doc.querySelectorAll('meta')].filter(el => el.httpEquiv.toLowerCase() === 'refresh').length, localImage: Boolean(image?.complete && image.naturalWidth), dataImage: Boolean(dataImage?.complete && dataImage.naturalWidth), localColor: local && frame.contentWindow.getComputedStyle(local).color, cdataColor: cdataStyle && frame.contentWindow.getComputedStyle(cdataStyle).color, localFont: fonts.length > 0 && fonts.every(font => font.status === 'loaded'), cover: cover && { size: cover.size, type: cover.type }, coverError, fragmentHref: doc.querySelector('#fragment')?.getAttribute('href'), crossHref: doc.querySelector('#cross-chapter')?.getAttribute('href'), requestMethod: typeof window.engineOptions.requestMethod };
    });
    const result = { name, policy: policy ?? 'default', facts, requests: [...requests], unexpectedViewerRequests: [...unexpectedViewerRequests] };
    if (policy === 'block') assert.equal(unexpectedViewerRequests.length, 0, 'archive resources must not fall back to viewer HTTP paths');
    report.cases.push(result);
    console.log('Observed', name, policy ?? 'default', JSON.stringify(result));
    return result;
  };
  const blocked = await run('resources', 'block');
  report.factoryProtocol = await page.evaluate(() => window.epubFactoryProtocol);
  assert.deepEqual(report.factoryProtocol, { ownKeys: true, staticDescriptors: true, renditionIdentity: true, continuousManagerIdentity: true });
  assert.equal(blocked.requests.length, 0, 'blocked archive must never request external resources');
  assert.equal(blocked.facts.cspFirst?.toLowerCase(), 'content-security-policy');
  assert.equal(blocked.facts.localImage, true);
  assert.equal(blocked.facts.dataImage, true);
  assert.equal(blocked.facts.localColor, 'rgb(23, 105, 45)');
  assert.equal(blocked.facts.localFont, true);
  assert.ok(blocked.facts.cover.size > 0);
  await page.frameLocator('.epub-stage iframe').first().locator('#cross-chapter').click();
  await page.waitForFunction(() => window.displayCalls.includes('text/two.xhtml#second') && window.displayed.includes('text/two.xhtml'));
  await page.evaluate(() => window.epubRendition.display('text/one.xhtml'));
  await page.evaluate(() => { window.displayed.length = 0; });
  await page.frameLocator('.epub-stage iframe').first().locator('#svg-cross').click();
  await page.waitForFunction(() => window.displayed.includes('text/two.xhtml'));
  await page.evaluate(() => window.epubRendition.display('text/one.xhtml'));
  await page.evaluate(() => { window.displayed.length = 0; });
  await page.frameLocator('.epub-stage iframe').first().locator('#cross-chapter').focus();
  await page.frameLocator('.epub-stage iframe').first().locator('#cross-chapter').press('Enter');
  await page.waitForFunction(() => window.displayed.includes('text/two.xhtml'));
  await page.evaluate(() => window.epubRendition.display('text/one.xhtml'));
  await page.evaluate(() => { window.displayed.length = 0; });
  await page.frameLocator('.epub-stage iframe').first().locator('#fragment').click();
  await page.waitForFunction(() => window.displayCalls.includes('text/one.xhtml#notes') && window.displayed.includes('text/one.xhtml'));
  await page.waitForFunction(() => {
    const viewport = document.querySelector('.epub-container').getBoundingClientRect();
    return [...document.querySelectorAll('.epub-stage iframe')].some(frame => {
      const notes = frame.contentDocument?.querySelector('#notes');
      if (!notes) return false;
      const top = frame.getBoundingClientRect().top + notes.getBoundingClientRect().top;
      return top >= viewport.top - 2 && top < viewport.bottom;
    });
  });
  await page.evaluate(() => { window.displayed.length = 0; });
  await page.locator('.epub-toc-item').nth(1).click();
  await page.waitForFunction(() => window.displayed.includes('text/two.xhtml'));
  await page.evaluate(() => window.epubRendition.prev());
  await page.waitForTimeout(150);
  const previousScroll = await page.locator('.epub-container').evaluate(el => el.scrollTop);
  await page.evaluate(() => window.epubRendition.next());
  await page.waitForTimeout(150);
  const nextScroll = await page.locator('.epub-container').evaluate(el => el.scrollTop);
  assert.notEqual(previousScroll, nextScroll, 'previous/next must move the reading viewport');
  assert.equal(requests.length, 0, 'navigation must remain inside the archive');
  assert.equal(unexpectedViewerRequests.length, 0, 'navigation must not request viewer-origin archive paths');
  report.navigation = { actions: 'HTML/SVG mouse links, focus+Enter link, visible fragment target, TOC, previous and next', previousScroll, nextScroll, calls: await page.evaluate(() => window.displayCalls) };
  const refresh = await run('refresh', 'block');
  assert.equal(refresh.requests.length, 0);
  assert.equal(refresh.facts.baseCount, 0);
  assert.equal(refresh.facts.refreshCount, 0);
  const mixed = await run('mixed', 'block');
  assert.equal(mixed.requests.length, 0);
  assert.equal(mixed.facts.baseCount, 0);
  assert.equal(mixed.facts.refreshCount, 0);
  assert.equal(await page.evaluate(() => document.querySelector('.epub-stage iframe').contentDocument.querySelector('#mixed-anchor').hasAttribute('href')), false);
  const parser = await run('parser', 'block');
  assert.equal(parser.requests.length, 0);
  assert.equal(parser.facts.refreshCount, 0, 'XML-only constructs must not introduce refresh elements after HTML parsing');
  assert.equal(parser.facts.cdataColor, 'rgb(71, 29, 103)');
  const smil = await run('smil', 'block');
  assert.equal(smil.requests.length, 0);
  assert.equal(await page.frameLocator('.epub-stage iframe').first().locator('set,animate,animateMotion,animateTransform,discard').count(), 0);
  await page.evaluate(() => { window.displayed.length = 0; });
  await page.frameLocator('.epub-stage iframe').first().locator('#smil-link').click();
  await page.waitForFunction(() => window.displayed.includes('text/two.xhtml'));
  assert.equal(requests.length, 0, 'SVG declarative animation must not mutate a link into an external request');
  assert.equal(unexpectedViewerRequests.length, 0);
  report.smilNavigation = 'removed actions; ordinary SVG text/link retained; original zero-request guards passed';
  report.coverDefense = await page.evaluate(async url => {
    window.epubBook.coverUrl = async () => url;
    try { await window.adapter.capture(); return 'unexpected success'; } catch (error) { return error.message; }
  }, external + '/defensive-cover.png');
  assert.match(report.coverDefense, /blocked/);
  assert.equal(requests.length, 0);
  report.dataCover = await page.evaluate(async url => {
    window.epubBook.coverUrl = async () => url;
    const blob = await window.adapter.capture(); return { size: blob.size, type: blob.type };
  }, 'data:image/png;base64,' + png.toString('base64'));
  assert.ok(report.dataCover.size > 0);
  const cover = await run('cover', 'block');
  assert.equal(cover.requests.length, 0);
  assert.equal(cover.facts.cover, null);
  assert.match(cover.facts.coverError, /local EPUB cover/);
  const compatible = await run('resources', undefined);
  assert.ok(compatible.requests.includes('/image.png'), 'default retains authored resource compatibility');
  const allowed = await run('resources', 'allow');
  assert.ok(allowed.requests.includes('/image.png'));
  await page.screenshot({ path: join(output, 'reading.png') });
  await page.evaluate(() => window.instance.unmount());
  assert.equal(await page.locator('.epub-viewer').count(), 0);
  assert.deepEqual(report.errors, [], 'The EPUB resource policy must not leave unhandled page errors');
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL'; report.failure = error.stack;
  report.failureRequests = [...requests];
  report.failureViewerRequests = [...unexpectedViewerRequests];
  report.debug = await page?.evaluate(() => ({ calls: window.displayCalls, displayed: window.displayed, toc: [...document.querySelectorAll('.epub-toc-item')].map(el => ({ text: el.textContent, href: el.dataset.href, disabled: el.disabled })), state: document.querySelector('.epub-state')?.outerHTML, location: window.epubRendition?.currentLocation(), frames: [...document.querySelectorAll('.epub-stage iframe')].map(frame => frame.contentDocument?.querySelector('h1')?.textContent) })).catch(() => undefined);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await Promise.all([new Promise(resolve => server.close(resolve)), new Promise(resolve => trap.close(resolve))]);
  await writeFile(join(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
