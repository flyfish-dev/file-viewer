import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';

/** Real renderer/Worker harness. Originals remain outside Git and are served by neutral ID. */
export async function createPdfReviewHarness({ output, fixtures = new Map() } = {}) {
  const root = path.resolve(import.meta.dirname, '../../../..');
  const packageRoot = path.resolve(import.meta.dirname, '..');
  const require = createRequire(import.meta.url);
  const { build } = require('esbuild');
  const { chromium } = require('playwright');
  await mkdir(output, { recursive: true });
  const temporary = await mkdtemp(path.join(output, 'runtime-'));
  const bundle = path.join(temporary, 'browser.mjs');
  const inMemory = process.env.PDF_REVIEW_IN_MEMORY === '1';
  await build({ stdin: { contents: `
    import renderPdf from './src/pdf.ts';
    import { findFileViewerViewStateProvider, findFileViewerZoomProvider } from '@file-viewer/core';
    import { getDocument, PixelsPerInch } from 'pdfjs-dist/legacy/build/pdf.mjs';
    import { buildFileViewerRenderedHtmlDocument } from '../../core/src/exportDocument.ts';
    window.pdfReview = { renderPdf, findFileViewerViewStateProvider, findFileViewerZoomProvider,
      getDocument, PixelsPerInch, buildFileViewerRenderedHtmlDocument };
  `, resolveDir: packageRoot, loader: 'ts' }, outfile: bundle, bundle: true, platform: 'browser', format: inMemory ? 'iife' : 'esm', logLevel: 'warning',
    plugins: inMemory ? [] : [{ name: 'local-pdf-runtime', setup(b) { b.onResolve({ filter: /^pdfjs-dist\// }, args => ({ path: '/pdfjs/' + args.path.slice('pdfjs-dist/'.length), external: true })); } }] });
  const runtime = path.join(root, 'packages/renderers/pdf/dist/vendor/pdfjs');
  const cjkFonts = path.dirname(require.resolve('@fontsource-variable/noto-sans-sc/package.json'));
  const requests = [], errors = [], external = [], workers = [];
  let origin;
  const server = createServer(async (req, res) => {
    const u = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(u.pathname);
    const entry = { path: pathname, status: 200, referer: req.headers.referer || '', range: req.headers.range || '' };
    requests.push(entry);
    try {
      if (pathname === '/' || pathname === '/no-referrer') {
        if (pathname === '/no-referrer') res.setHeader('Referrer-Policy', 'no-referrer');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end('<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:100%;height:100%}#host{width:100%;height:100%;overflow:auto}</style><div id="host"></div><script type="module" src="/browser.mjs"></script>');
        return;
      }
      if (pathname.startsWith('/fixtures/')) {
        const id = pathname.slice('/fixtures/'.length);
        const fixture = fixtures.get(id);
        if (!fixture) throw Error('Unknown fixture');
        if (u.searchParams.has('protected') && req.headers.referer !== origin + '/') {
          entry.status = 403; res.writeHead(403).end('Referrer rejected by controlled test server'); return;
        }
        const data = typeof fixture === 'string' ? await readFile(fixture) : fixture;
        res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Accept-Ranges', 'bytes');
        const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
        if (range) {
          const start = Number(range[1]), end = Math.min(Number(range[2] || data.length - 1), data.length - 1);
          if (start > end) { entry.status=416; res.writeHead(416).end(); return; }
          entry.status=206; res.statusCode=206;
          res.setHeader('Content-Range', `bytes ${start}-${end}/${data.length}`);
          res.setHeader('Content-Length', end-start+1);res.end(data.subarray(start,end+1));return;
        }
        res.setHeader('Content-Length', data.length);res.end(data);return;
      }
      let file;
      if (pathname === '/browser.mjs') file = bundle;
      else if (pathname.startsWith('/pdfjs/')) {
        file = path.resolve(runtime, pathname.slice(7));
        if (!file.startsWith(runtime + path.sep)) throw Error('Invalid asset path');
      } else if (pathname.startsWith('/pdf-cjk/')) {
        const relative=pathname.slice('/pdf-cjk/'.length);
        file=path.resolve(cjkFonts,relative==='noto-sans-sc.css'?'index.css':relative);
        if(!file.startsWith(cjkFonts+path.sep))throw Error('Invalid font path');
      } else if (pathname === '/favicon.ico') { entry.status = 204; res.writeHead(204).end(); return; }
      else throw Error('Unknown route');
      res.setHeader('Content-Type', /\.m?js$/.test(file) ? 'text/javascript' : file.endsWith('.wasm') ? 'application/wasm' : file.endsWith('.css') ? 'text/css' : 'application/octet-stream');
      res.end(await readFile(file));
    } catch (e) { entry.status = 404; res.writeHead(404).end(String(e)); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try { browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined, headless: true, args: ['--no-sandbox'] }); }
  catch (error) { server.closeAllConnections();await new Promise(resolve => server.close(resolve));await rm(temporary,{recursive:true,force:true});throw error; }
  const assets = { workerUrl: '/pdfjs/legacy/build/pdf.worker.mjs', cMapUrl: '/pdfjs/cmaps/', wasmUrl: '/pdfjs/wasm/', standardFontDataUrl: '/pdfjs/standard_fonts/', cjkFontFallbackPath: '/pdf-cjk/' };
  async function newPage({width=1100,height=800,dpr=1,route='/'}={}) {
    const p = await browser.newPage({ viewport:{width,height}, deviceScaleFactor:dpr });
    p.on('pageerror',e => errors.push(e.message));
    if(process.env.PDF_REVIEW_DEBUG)p.on('console',m=>console.log('BROWSER',m.type(),m.text()));
    p.on('worker',w => workers.push(w.url()));
    p.on('request',r => {if(/^https?:/.test(r.url())&&!r.url().startsWith(origin+'/'))external.push(r.url());});
    if (inMemory) {
      // Transport-free local verification; HTTP/referrer assertions require server mode.
      await p.setContent('<!doctype html><base href="https://pdf-review.invalid/"><style>html,body{margin:0;width:100%;height:100%}#host{overflow:auto}</style><div id="host"></div>');
      const workerCode = await readFile(path.join(runtime,'legacy/build/pdf.worker.mjs'),'utf8');
      await p.evaluate(code => { window.reviewWorkerUrl=URL.createObjectURL(new Blob([code],{type:'text/javascript'})); },workerCode);
      await p.addScriptTag({content:await readFile(bundle,'utf8')});
    } else { await p.goto(origin+route); }
    await p.waitForFunction(()=>!!window.pdfReview);
    return p;
  }
  async function mount(p,{id='synthetic.pdf',hidden=false,width=620,height=520,stream=false,options={}}={}) {
    await p.evaluate(async config=>{
      window.instance?.unmount(); window.adapter=null;
      const host=document.getElementById('host');
      host.style.width=config.width+'px';host.style.height=config.height+'px';host.style.display=config.hidden?'none':'block';
      const url='/fixtures/'+config.id;
      const bytes=config.bytes ? Uint8Array.from(atob(config.bytes),c=>c.charCodeAt(0)).buffer : config.stream?new ArrayBuffer(0):await(await fetch(url)).arrayBuffer();
      window.provider=null;
      window.instance=await pdfReview.renderPdf(bytes,host,{filename:config.id,streamUrl:config.stream?url:undefined,
        options:{locale:'en-US',pdf:{...config.assets,...(window.reviewWorkerUrl?{workerUrl:window.reviewWorkerUrl}:{}),navigation:false,...config.options}},
        registerExportAdapter:a=>{window.adapter=a;}});
      window.provider=pdfReview.findFileViewerViewStateProvider(host);
    },{id,hidden,width,height,stream,options,assets,bytes: inMemory ? Buffer.from(typeof fixtures.get(id)==='string' ? await readFile(fixtures.get(id)):fixtures.get(id)).toString('base64'):undefined});
    try { await p.waitForFunction(()=>window.adapter&&window.provider?.getState().pageCount>0,null,{timeout:10000}); }
    catch(e) { console.error(await p.evaluate(()=>({text:document.body.textContent?.slice(-1500),state:window.provider?.getState()})));throw e; }
    await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  }
  async function close() {
    await browser.close(); server.closeAllConnections(); await new Promise(resolve=>server.close(resolve));
    await rm(temporary,{recursive:true,force:true});
  }
  return {root,browser,origin,assets,requests,errors,external,workers,newPage,mount,close};
}
