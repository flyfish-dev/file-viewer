import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.env.FILE_VIEWER_TEST_ROOT || path.resolve(import.meta.dirname, '..');
const require = createRequire(path.join(root, 'package.json'));
const { build } = require('esbuild');
const browsers = require('playwright');
const appRequire = createRequire(path.join(root, 'apps/component-demo/package.json'));
const vueRequire = createRequire(path.join(root, 'packages/components/vue3/package.json'));
const output = path.resolve(process.env.FILE_VIEWER_PDF_STREAM_EVIDENCE || path.join(root, 'output/pdf-url-streaming'));
const bundleDir = path.join(output, 'browser');
const runtime = path.join(root, 'packages/renderers/pdf/dist/vendor/pdfjs');
await mkdir(bundleDir, { recursive: true });
const file = value => JSON.stringify(path.join(root, value));
const result = await build({
  absWorkingDir: root,
  stdin: { contents: `
import { mountViewer as mountCore } from ${file('packages/core/dist/browser.js')};
import standard from ${file('packages/presets/standard/dist/index.js')};
import { pdfRenderer } from ${file('packages/renderers/pdf/dist/index.js')};
import { mountViewer as mountWeb, defineFileViewerElement } from ${file('packages/components/web/dist/index.js')};
import FileViewerReact from ${file('packages/components/react/dist/index.js')};
import { fileViewer as svelteAction } from ${file('packages/components/svelte/dist/index.js')};
import { installJQueryFileViewer, getFileViewerController } from ${file('packages/components/jquery/dist/index.js')};
import React from ${JSON.stringify(appRequire.resolve('react'))};
import { createRoot } from ${JSON.stringify(appRequire.resolve('react-dom/client'))};
import jquery from ${JSON.stringify(appRequire.resolve('jquery'))};
import { createApp, h, reactive, shallowRef, nextTick } from ${JSON.stringify(vueRequire.resolve('vue'))};
import { FileViewer as FileViewerVue } from ${file('packages/components/vue3/dist/index.mjs')};
const observedPdf = { ...pdfRenderer, handlers: pdfRenderer.handlers.map(entry => ({ ...entry, handler: (bytes, target, type, context) => {
  window.pdfLoads.push({ bytes: bytes.byteLength, streamUrl: context?.streamUrl, pdf: context?.options?.pdf });
  return entry.handler(bytes, target, type, context);
}})) };
const preset = { ...standard, renderers: standard.renderers.map(plugin => plugin.id === pdfRenderer.id ? observedPdf : plugin) };
installJQueryFileViewer(jquery);
defineFileViewerElement();
window.pdfLoads = [];
window.fixture = {
  async mount(wrapper, source, pdf) {
    window.dispose?.(); window.pdfLoads = [];
    const host = document.getElementById('host'); host.replaceChildren();
    const options = { toolbar: false, autoRenderers: false, rendererMode: 'replace', preset, pdf: {
      workerUrl: '/pdfjs/legacy/build/pdf.worker.mjs', cMapUrl: '/pdfjs/cmaps/', wasmUrl: '/pdfjs/wasm/', standardFontDataUrl: '/pdfjs/standard_fonts/',
      cjkFontFallback: false, navigation: false, ...pdf
    }};
    const props = { ...source, options };
    let controller;
    if (wrapper === 'full') {
      await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/full/flyfish-file-viewer-web-full.iife.js';script.onload=resolve;script.onerror=reject;document.head.append(script);});
      const full=window.FlyfishFileViewerWebFull;
      const fullPreset={...full.fileViewerFullPreset,renderers:full.fileViewerFullPreset.renderers.map(plugin=>plugin.definitions?.some(definition=>definition.id==='pdf')?{
        ...plugin,handlers:plugin.handlers.map(entry=>({...entry,handler:(bytes,target,type,context)=>{
          window.pdfLoads.push({bytes:bytes.byteLength,streamUrl:context?.streamUrl,pdf:context?.options?.pdf});return entry.handler(bytes,target,type,context);
        }}))
      }:plugin)};
      controller=full.mountViewer(host,{...props,options:{...options,preset:fullPreset}});
      window.dispose=()=>controller.destroy();window.updateFixture=next=>controller.update(next);
    } else if (wrapper === 'react') {
      const ref = React.createRef(); const app = createRoot(host);
      const render = next => app.render(React.createElement(FileViewerReact, { ...next, ref }));
      render(props); window.dispose = () => app.unmount();
      window.updateFixture = next => render({ ...props, ...next, options: { ...options, ...(next.options || {}) } });
      for (let i=0; i<100 && !ref.current; i++) await new Promise(r=>setTimeout(r,10));
      controller = ref.current;
    } else if (wrapper === 'vue') {
      const data = reactive(props); const ref = shallowRef();
      const app = createApp({ render: () => h(FileViewerVue, { ...data, ref }) });
      app.mount(host); await nextTick(); controller = ref.value;
      window.dispose = () => app.unmount();
      window.updateFixture = async next => { Object.assign(data, next); await nextTick(); };
    } else if (wrapper === 'svelte') {
      const action = svelteAction(host, props); controller = action;
      window.dispose = () => action.destroy(); window.updateFixture = next => action.update({ ...props, ...next });
    } else if (wrapper === 'jquery') {
      jquery(host).fileViewer(props); controller = getFileViewerController(host);
      window.dispose = () => jquery(host).fileViewer('destroy'); window.updateFixture = next => controller.update(next);
    } else if (wrapper === 'element') {
      const element = document.createElement('flyfish-file-viewer');
      element.style.cssText = 'display:block;height:100%'; element.source = props; host.append(element);
      window.dispose = () => element.remove(); window.updateFixture = next => { element.source = { ...props, ...next }; };
      controller = element;
    } else {
      controller = (wrapper === 'web' ? mountWeb : mountCore)(host, props);
      window.dispose = () => controller.destroy(); window.updateFixture = next => controller.update(next);
    }
    const update = window.updateFixture;
    window.updateFixture = next => update({ ...next, ...(next.options ? { options: {
      ...options, ...next.options, pdf: { ...options.pdf, ...(next.options.pdf || {}) }
    }} : {}) });
    window.viewer = controller;
  },
  visible() {
    const visit = root => [...root.querySelectorAll('.pdfViewer .page canvas')].some(canvas => canvas.width > 20 && canvas.height > 20 &&
      canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.some((n,i,all) => i % 4 === 0 && n < 150 && all[i+3] > 0)) ||
      (root.shadowRoot && visit(root.shadowRoot)) || [...root.querySelectorAll('*')].some(el => el.shadowRoot && visit(el.shadowRoot));
    return visit(document.getElementById('host'));
  },
  text() {
    const visit = root => (root.textContent || '') + (root.shadowRoot ? visit(root.shadowRoot) : '') + [...root.querySelectorAll('*')].filter(el => el.shadowRoot).map(el => visit(el.shadowRoot)).join('');
    return visit(document.getElementById('host'));
  }
};
`, resolveDir: root, loader: 'ts' },
  outdir: bundleDir, entryNames: 'entry', chunkNames: 'chunks/[name]-[hash]', bundle: true, splitting: true, format: 'esm', platform: 'browser',
  target: ['chrome120', 'safari18'], logLevel: 'warning',
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'local-pdfjs', setup(b) {
    b.onResolve({ filter: /^(?:@file-viewer\/core)(?:\/(.*))?$/ }, args => ({ path: path.join(root, 'packages/core/dist', (args.path.split('/').slice(2).join('/') || 'index') + '.js') }));
    b.onResolve({ filter: /(?:^pdfjs-dist\/|[\\/]vendor[\\/]pdfjs[\\/])/ }, args => {
      const value = args.path.replaceAll('\\', '/');
      const asset = value.startsWith('pdfjs-dist/') ? value.slice(11) : value.split('/vendor/pdfjs/')[1];
      return { path: '/pdfjs/' + asset, external: true };
    });
  }}]
});

function pdf(label) {
  const chunks = [Buffer.from('%PDF-1.7\n')], offsets=[0]; let length=chunks[0].length;
  const add = (n, body) => { offsets[n]=length; const b=Buffer.from(`${n} 0 obj\n${body}\nendobj\n`);chunks.push(b);length+=b.length; };
  add(1,'<< /Type /Catalog /Pages 2 0 R >>');
  add(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  add(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>');
  add(4,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const content=`BT /F1 22 Tf 50 700 Td (${label}) Tj ET`;
  add(5,`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
  // A valid unused stream keeps the xref at the distant end without making the
  // visible first page depend on that stream. Range should read both boundaries.
  add(6,'<< /Length 8388608 >>\nstream\n'+' '.repeat(8388608)+'\nendstream');
  const xref=length;
  chunks.push(Buffer.from(`xref\n0 7\n0000000000 65535 f \n${offsets.slice(1).map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
  return Buffer.concat(chunks);
}
const pdfs = new Map([['large',pdf('Range first page')],['new',pdf('Newest document')]]);
const requests=[], errors=[], workers=[];
// Keep the unused bulk stream pending until the first verified painted page.
// A timer-only throttle turns this into a CPU-speed benchmark on slow WebKit
// runners. Required header/xref Range responses remain unblocked, while a
// renderer that waits for a complete buffer cannot reach the paint assertion.
const firstPaintGates=new Map();
const releaseFirstPaintGate=id=>{const gate=firstPaintGates.get(id);if(!gate)return;gate.released=true;const resume=gate.resume;gate.resume=null;resume?.();};
const serve = async (req,res) => {
  const url = new URL(req.url,'http://localhost');
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Expose-Headers','Accept-Ranges, Content-Range, Content-Length');
  res.setHeader('Cache-Control','no-store');
  const id=url.searchParams.get('case');
  const data=pdfs.get(url.searchParams.get('document') || 'large');
  if (url.pathname === '/large.pdf' || url.pathname === '/signed') {
    const entry={id,range:req.headers.range||'',status:200,bytes:0,completed:false};requests.push(entry);
    res.on('finish',()=>{entry.completed=true});
    res.setHeader('Accept-Ranges','bytes');res.setHeader('Content-Type','application/pdf');
    const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
    if (match) {
      const start=+match[1],end=Math.min(match[2]?+match[2]:data.length-1,data.length-1);
      if(start>end){entry.status=416;res.writeHead(416).end();return;}
      entry.status=206;entry.bytes=end-start+1;res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':end-start+1});res.end(data.subarray(start,end+1));return;
    }
    res.setHeader('Content-Length',data.length);
    if(url.searchParams.has('delay'))await new Promise(resolve=>setTimeout(resolve,300));
    if(res.destroyed)return;res.flushHeaders();
    const gate=firstPaintGates.get(id);
    let position=0;const send=()=>{if(res.destroyed)return;if(gate&&!gate.released&&position>=131072){gate.pausedAtBytes=position;gate.resume=send;return;}const end=Math.min(position+65536,data.length);const chunk=data.subarray(position,end);entry.bytes+=chunk.length;res.write(chunk);position=end;if(position===data.length)res.end();else timer=setTimeout(send,20);};
    let timer=setTimeout(send,0);res.on('close',()=>{clearTimeout(timer);if(gate?.resume===send)gate.resume=null;});return;
  }
  try {
    if (url.pathname === '/') {res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta charset="utf-8"><style>html,body{margin:0;height:100%}#host{height:740px;width:1000px}</style><div id="host"></div><script type="module" src="/browser/entry.js"></script>');return;}
    let base,relative;
    if(url.pathname.startsWith('/browser/')){base=bundleDir;relative=url.pathname.slice(9);}
    else if(url.pathname.startsWith('/pdfjs/')){base=runtime;relative=url.pathname.slice(7);}
    else if(url.pathname.startsWith('/full/')){base=path.join(root,'packages/components/web-full/dist');relative=url.pathname.slice(6);}
    else if(url.pathname==='/favicon.ico'){res.writeHead(204).end();return;}
    else throw Error('Unknown fixture route');
    const full=path.resolve(base,relative);assert.ok(full.startsWith(base+path.sep));
    res.setHeader('Content-Type',full.endsWith('.js')||full.endsWith('.mjs')?'text/javascript':full.endsWith('.css')?'text/css':full.endsWith('.wasm')?'application/wasm':'application/octet-stream');
    res.end(await readFile(full));
  } catch(error){res.writeHead(404).end(String(error));}
};
const servers=[createServer((req,res)=>{void serve(req,res)}),createServer((req,res)=>{void serve(req,res)})];
for(const server of servers)await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origins=servers.map(server=>'http://127.0.0.1:'+server.address().port);
const assertRequest = async id => { const until=Date.now()+5000;while(!requests.some(r=>r.id===id)){assert.ok(Date.now()<until,'Real controlled transport must start: '+id);await new Promise(resolve=>setTimeout(resolve,10));} };
const provenance=JSON.parse(await readFile(path.join(runtime,'provenance.json')));
const workerResponse=await fetch(origins[0]+'/pdfjs/legacy/build/pdf.worker.mjs');
assert.equal(workerResponse.status,200);assert.match(workerResponse.headers.get('content-type'),/javascript/);
const workerBytes=Buffer.from(await workerResponse.arrayBuffer());
const workerProof=provenance.runtimeFiles.find(file=>file.path==='legacy/build/pdf.worker.mjs');
assert.equal(workerBytes.length,workerProof.size);assert.equal(createHash('sha256').update(workerBytes).digest('hex'),workerProof.sha256);
assert.equal(provenance.version,'5.4.624');
const report={runtime:{version:provenance.version,worker:workerProof,mime:workerResponse.headers.get('content-type')},fixture:{bytes:pdfs.get('large').length,sha256:createHash('sha256').update(pdfs.get('large')).digest('hex'),synthetic:true},cases:[],workers,errors};
try {
for(const browserName of (process.env.FILE_VIEWER_TEST_BROWSERS || 'chromium,webkit').split(',')){
  const browser=await browsers[browserName].launch({headless:true,executablePath:browserName==='chromium'?process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined:undefined,args:browserName==='chromium'?['--no-sandbox']:[]});
  try {
    const cases=[
      ...['core','web','element','react','svelte','jquery','vue','full'].map(wrapper=>({wrapper,mode:'same-default',stream:true})),
      {wrapper:'react',mode:'cross-signed-filename',stream:true,cross:true,signed:true,filename:'contract.pdf',pdf:{streaming:true}},
      {wrapper:'vue',mode:'cross-signed-type',stream:true,cross:true,signed:true,type:'pdf',pdf:{streaming:true}},
      {wrapper:'react',mode:'buffered-false',stream:false,pdf:{streaming:false}},
      {wrapper:'svelte',mode:'cross-default-buffered',stream:false,cross:true},
      {wrapper:'react',mode:'range-demand-only',stream:true,cross:true,pdf:{streaming:true,disableStream:true,disableAutoFetch:true}},
    ];
    for (const [index,c] of cases.entries()){
      const page=await browser.newPage({viewport:{width:1100,height:800}});const caseErrors=[];
      page.on('pageerror',e=>caseErrors.push(e.message));page.on('worker',worker=>workers.push({browserName,url:worker.url()}));
      try{
        await page.goto(origins[0]+'/');await page.waitForFunction(()=>!!window.fixture);
        const id=browserName+'-'+index+'-'+c.mode;
        if(c.stream)firstPaintGates.set(id,{released:false,resume:null,pausedAtBytes:null});
        const url=(c.cross?origins[1]:origins[0])+(c.signed?'/signed':'/large.pdf')+'?case='+id;
        await page.evaluate(async ({wrapper,source,pdf})=>window.fixture.mount(wrapper,source,pdf),{wrapper:c.wrapper,source:{url,...(c.filename?{filename:c.filename}:{}),...(c.type?{type:c.type}:{})},pdf:c.pdf||{}});
        await page.waitForFunction(()=>window.fixture.visible() && window.fixture.text().includes('Range first page'),null,{timeout:20000,polling:25});
        const firstCanvasNetwork=structuredClone(requests.filter(r=>r.id===id));
        const loads=await page.evaluate(()=>window.pdfLoads);assert.equal(loads.length,1,`${id}: real standard PDF handler ran exactly once`);
        assert.equal(loads[0].bytes,c.stream?0:pdfs.get('large').length,`${id}: correct URL/buffer source`);
        const network=firstCanvasNetwork;
        if(c.stream){assert.ok(network.some(r=>r.status===206),`${id}: actual HTTP Range`);assert.ok(network.reduce((n,r)=>n+r.bytes,0)<pdfs.get('large').length/2,`${id}: first canvas before complete download`);assert.ok(!network.some(r=>r.status===200&&r.completed),`${id}: no completed core prefetch`);}
        else{assert.equal(network.length,1,`${id}: buffered PDF fetched only once`);assert.equal(network[0].bytes,pdfs.get('large').length);assert.ok(network[0].completed);}
        // Release before the demand-only follow-up, so its auto-fetch check
        // still observes unrestricted transport after painting.
        releaseFirstPaintGate(id);
        if(c.pdf?.disableAutoFetch){await page.waitForTimeout(350);const after=requests.filter(r=>r.id===id);assert.ok(!after.some(r=>r.status===200&&r.completed));assert.ok(after.reduce((n,r)=>n+r.bytes,0)<pdfs.get('large').length/2);}
        assert.deepEqual(caseErrors,[],`${id}: no uncaught errors`);
        await page.screenshot({path:path.join(output,id+'.png')});
        report.cases.push({browser:browserName,...c,id,loads,network,status:'passed'});console.log('PASS',id);
      }catch(error){
        await writeFile(path.join(output, browserName+'-failure.json'),JSON.stringify({errors:caseErrors,requests,dom:await page.evaluate(()=>({text:window.fixture?.text(),body:document.body.innerHTML.slice(-12000),loads:window.pdfLoads}))},null,2));
        await page.screenshot({path:path.join(output,browserName+'-failure.png')});throw error;
      }finally{await page.close();}
    }
    // Same URL: a type hint and renderer-owned PDF options must reload the real
    // Vue/React entry, rather than silently retaining an obsolete source policy.
    for (const wrapper of ['vue','react']) {
      const page=await browser.newPage({viewport:{width:1100,height:800}}), localErrors=[];
      page.on('pageerror',e=>localErrors.push(e.message));
      page.on('worker',worker=>workers.push({browserName,url:worker.url()}));
      const id=browserName+'-'+wrapper+'-options';
      try {
        await page.goto(origins[0]+'/');await page.waitForFunction(()=>!!window.fixture);
        await page.evaluate(({wrapper,url})=>window.fixture.mount(wrapper,{url,filename:'same.pdf'},{}),{wrapper,url:origins[0]+'/signed?case='+id});
        await page.waitForFunction(()=>window.fixture.visible()&&window.fixture.text().includes('Range first page'));
        assert.equal((await page.evaluate(()=>window.pdfLoads))[0].bytes,0);
        await page.evaluate(()=>window.updateFixture({type:'pdf'}));
        await page.waitForFunction(()=>window.pdfLoads.length===2&&window.fixture.visible()&&window.fixture.text().includes('Range first page'));
        const before=requests.filter(r=>r.id===id).length;
        await page.evaluate(()=>window.updateFixture({options:{pdf:{streaming:false}}}));
        await page.waitForFunction(()=>window.pdfLoads.length===3&&window.fixture.visible()&&window.fixture.text().includes('Range first page'));
        assert.equal((await page.evaluate(()=>window.pdfLoads))[2].bytes,pdfs.get('large').length);
        const buffered=structuredClone(requests.filter(r=>r.id===id).slice(before));
        assert.equal(buffered.length,1,'Same-URL buffered policy must fetch exactly once');assert.ok(buffered[0].completed);
        await page.evaluate(()=>window.updateFixture({options:{pdf:{streaming:true,disableStream:true,disableAutoFetch:true}}}));
        await page.waitForFunction(()=>window.pdfLoads.length===4&&window.fixture.visible()&&window.fixture.text().includes('Range first page'));
        const loads=await page.evaluate(()=>window.pdfLoads);assert.equal(loads[3].bytes,0);assert.equal(loads[3].pdf.disableAutoFetch,true);
        assert.deepEqual(localErrors,[]);report.cases.push({browser:browserName,wrapper,mode:'same-url-type-and-streaming-options',loads,buffered,status:'passed'});console.log('PASS',id);
      }finally{await page.close();}
    }
    for(const wrapper of ['core','react','vue']) {
      const page=await browser.newPage({viewport:{width:1100,height:800}}), localErrors=[];
      page.on('pageerror',e=>localErrors.push(e.message));page.on('worker',worker=>workers.push({browserName,url:worker.url()}));
      const oldId=browserName+'-'+wrapper+'-cancel-old',newId=browserName+'-'+wrapper+'-cancel-new';
      try {
        await page.goto(origins[0]+'/');await page.waitForFunction(()=>!!window.fixture);
        await page.evaluate(({wrapper,url})=>window.fixture.mount(wrapper,{url},{streaming:true,disableStream:true,disableAutoFetch:true}),{wrapper,url:origins[0]+'/large.pdf?case='+oldId+'&delay=1'});
        await assertRequest(oldId);
        await page.evaluate(url=>window.updateFixture({url,filename:'new.pdf'}),origins[0]+'/large.pdf?case='+newId+'&document=new');
        await page.waitForFunction(()=>window.fixture.visible()&&window.fixture.text().includes('Newest document'));
        await page.waitForTimeout(450);
        assert.ok(await page.evaluate(()=>window.fixture.text().includes('Newest document')),'Old async result cannot replace the new document');
        const before=await page.evaluate(()=>window.pdfLoads.length);
        const disposeId=oldId+'-destroy';
        await page.evaluate(url=>{void window.updateFixture({url});},origins[0]+'/large.pdf?case='+disposeId+'&delay=1');
        await assertRequest(disposeId);await page.evaluate(()=>window.dispose());await page.waitForTimeout(450);
        assert.equal(await page.evaluate(()=>window.fixture.visible()),false,'Unmount clears actual PDF pages');
        assert.deepEqual(localErrors,[],`${wrapper}: cancelled transport is not an uncaught failure`);
        report.cases.push({browser:browserName,wrapper,mode:'replace-and-unmount-during-transport',before,network:structuredClone(requests.filter(r=>r.id===oldId||r.id===newId||r.id===disposeId)),status:'passed'});console.log('PASS',oldId);
      }finally{await page.close();}
    }
  }finally{await browser.close();}
}
assert.ok(workers.length>=report.cases.length,'Each real consumer creates a PDF Worker');
assert.ok(workers.every(worker=>worker.url.endsWith('/pdfjs/legacy/build/pdf.worker.mjs')),'Actual same-origin Worker URL, not a fake worker');
report.status='passed';
} catch(error){report.status='failed';report.failure=String(error.stack||error);throw error;}
finally{await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');for(const server of servers){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}}
