/** Hash-pinned original subcases. No network fetch, source-body logging or runtime changes. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import JSZip from 'jszip';
import { chromium } from 'playwright';
const root = path.resolve(import.meta.dirname, '../../../..');
const { build } = createRequire(path.join(root, 'packages/renderers/pptx/package.json'))('esbuild');
const corpus = process.env.WORD_LAYOUT_CORPUS_DIR;
assert.ok(corpus, 'Set WORD_LAYOUT_CORPUS_DIR to the local original corpus; missing originals cannot pass.');
const pins = {
  C018: '95d88af68bde958c0825c575731a2cf81c716b736f4f9c06bf15e427ab4bf4cb', C031: '19a5b398b8037bd2cc3bbab4a5d39c2b889873aa181091829a0fd7429f0a5418', C033: '66eaea32fac0ee6cd8fc359fa01a7273263cb53b4f630cf92ba590f4c3bd73dc',
};
const output = path.resolve(process.env.WORD_LAYOUT_OUTPUT || path.join(root, 'output/word-layout-subcases'));
await mkdir(output, { recursive: true });
const bundle = await build({ stdin: { contents: `import {renderFileViewerWordDoc} from './packages/renderers/word/src/index.ts';import {findFileViewerZoomProvider} from './packages/core/src/index.ts';window.review={renderFileViewerWordDoc,findFileViewerZoomProvider};`, resolveDir: root, loader: 'ts' }, bundle: true, platform: 'browser', format: 'iife', write: false, logLevel: 'silent' });
const checks = [], originals = [], errors = [], requests = [];
let completed = false;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function check(name, fn) { await fn(); checks.push({ name, status: 'pass' }); console.log('PASS ' + name); }
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
try {
  for (const dpr of [1,2]) for (const [id, digest] of Object.entries(pins)) {
    const data = await readFile(path.join(corpus, id + '.docx'));
    assert.equal(sha(data), digest, id + ' original identity');
    const zip = await JSZip.loadAsync(data);
    const xml = await zip.file('word/document.xml').async('string');
    const numbering = await zip.file('word/numbering.xml')?.async('string');
    const rels = await zip.file('word/_rels/document.xml.rels')?.async('string');
    const page = await browser.newPage({ viewport: { width:1150,height:1000 }, deviceScaleFactor: dpr });
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/^https?:/, route => { requests.push(route.request().url()); return route.abort(); });
    try {
      await page.setContent('<!doctype html><style>body{margin:0}</style><div id="host" style="width:1050px;height:950px"></div>');
      await page.addScriptTag({ content: bundle.outputFiles[0].text });
      const expected = await page.evaluate(({xml,numbering,rels}) => {
        const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main', A='http://schemas.openxmlformats.org/drawingml/2006/main';
        const R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
        const WP='http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing';
        const doc=new DOMParser().parseFromString(xml,'application/xml');
        const nodes=(el,ns,name)=>[...el.getElementsByTagNameNS(ns,name)];
        const nums=new DOMParser().parseFromString(numbering||'<none/>','application/xml');
        const markers=nodes(doc,W,'numPr').map(n=>{
          const numId=nodes(n,W,'numId')[0]?.getAttributeNS(W,'val'),level=nodes(n,W,'ilvl')[0]?.getAttributeNS(W,'val')||'0';
          const num=nodes(nums,W,'num').find(x=>x.getAttributeNS(W,'numId')===numId);
          const abs=nodes(num,W,'abstractNumId')[0].getAttributeNS(W,'val');
          const levels=nodes(nums,W,'abstractNum').find(x=>x.getAttributeNS(W,'abstractNumId')===abs);
          const lvl=nodes(levels,W,'lvl').find(x=>x.getAttributeNS(W,'ilvl')===level);
          return nodes(lvl,W,'lvlText')[0].getAttributeNS(W,'val');
        });
        const relDoc=new DOMParser().parseFromString(rels||'<none/>','application/xml');
        const images=nodes(doc,WP,'inline').map(n=>{
          // The authored SVG extension supersedes its PNG fallback when present.
          const blip=nodes(n,'http://schemas.microsoft.com/office/drawing/2016/SVG/main','svgBlip')[0]||nodes(n,A,'blip')[0],extent=nodes(n,WP,'extent')[0];
          const relationship=[...relDoc.documentElement.children].find(x=>x.getAttribute('Id')===blip.getAttributeNS(R,'embed'));
          return {target:relationship.getAttribute('Target'),width:Number(extent.getAttribute('cx'))/9525,height:Number(extent.getAttribute('cy'))/9525};
        });
        return {text:nodes(doc,W,'t').map(n=>n.textContent).join(''),rows:nodes(doc,W,'tr').length,cells:nodes(doc,W,'tc').length,tables:nodes(doc,W,'tbl').length,directions:nodes(doc,W,'textDirection').map(x=>x.getAttributeNS(W,'val')),markers,images};
      },{xml,numbering,rels});
      await page.evaluate(async base => { const bytes=Uint8Array.from(atob(base),c=>c.charCodeAt(0));window.handle=await review.renderFileViewerWordDoc(bytes.buffer,host,'docx',{filename:'document.docx',options:{docx:{worker:false,visualPagination:true}}}); },data.toString('base64'));
      await page.waitForFunction(()=>document.querySelector('.docx-wrapper')?.dataset.docxPaginated==='true',null,{timeout:60000});
      await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...host.querySelectorAll('img')].map(i=>i.decode()));});
      const observed=await page.evaluate(()=>({
        text:[...host.querySelectorAll('section.docx>article')].map(n=>n.textContent).join(''),
        rows:host.querySelectorAll('article tr').length,cells:host.querySelectorAll('article td').length,tables:host.querySelectorAll('article table').length,pages:host.querySelectorAll('section.docx').length,
        markers:[...host.querySelectorAll('article p')].map(n=>getComputedStyle(n,'::before').content).filter(t=>t!=='none'&&t!=='normal'),
        directions:[...host.querySelectorAll('article td')].map(n=>getComputedStyle(n).writingMode),
        images:[...host.querySelectorAll('article img')].map(i=>({width:parseFloat(getComputedStyle(i).width),height:parseFloat(getComputedStyle(i).height),naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,src:i.src})),
      }));
      await check(`${id} DPR ${dpr}: every original body character and table row/cell is retained`,()=>{
        assert.equal(observed.text,expected.text);assert.equal(observed.rows,expected.rows);assert.equal(observed.cells,expected.cells);
      });
      if(id==='C018')await check(`${id} DPR ${dpr}: authored list marks remain visible inside the original cell`,async()=>{
        assert.deepEqual(expected.markers,['-','-']);assert.equal(observed.tables,expected.tables);assert.equal(observed.markers.length,2);
        for(const marker of observed.markers)assert.ok(/^"-/.test(marker),marker);
        const styles=await page.locator('article p').evaluateAll(ps=>ps.filter(p=>getComputedStyle(p,'::before').content!=='none').map(p=>{const c=getComputedStyle(p,'::before');return{size:parseFloat(c.fontSize),visibility:c.visibility,opacity:Number(c.opacity)};}));
        assert.ok(styles.every(c=>c.size>0&&c.visibility==='visible'&&c.opacity>0));
      });
      if(id==='C031')await check(`${id} DPR ${dpr}: 100%, 88%, 50%, 200% and reset preserve one page and scale both dimensions`,async()=>{
        const states=await page.evaluate(async()=>{
          const provider=review.findFileViewerZoomProvider(host),states=[];
          for(const scale of [1,.88,.5,2,1]) {await provider.setZoom(scale);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const section=host.querySelector('section.docx'),b=section.getBoundingClientRect();states.push({scale:provider.getState().scale,pages:host.querySelectorAll('section.docx').length,w:b.width,h:b.height,text:section.querySelector('article').textContent,footer:section.querySelector('footer')?.textContent});}
          return states;
        });
        assert.deepEqual(states.map(x=>x.scale),[1,.88,.5,2,1]);
        for(const state of states){assert.equal(state.pages,1);assert.equal(state.text,expected.text);assert.equal(state.footer,states[0].footer);assert.ok(Math.abs(state.w/states[0].w-state.scale)<.0001);assert.ok(Math.abs(state.h/states[0].h-state.scale)<.0001);}
      });
      if(id==='C033') {
        await check(`${id} DPR ${dpr}: table writing direction matches the original rather than forcing vertical text`,()=>{assert.deepEqual(expected.directions,[]);assert.ok(observed.directions.every(d=>d==='horizontal-tb'));assert.equal(expected.rows,48);assert.equal(expected.cells,192);});
        await check(`${id} DPR ${dpr}: flowchart image uses exact embedded bytes and authored display ratio`,async()=>{
          assert.equal(expected.images.length,1);assert.equal(observed.images.length,1);
          const image=expected.images[0],target=path.posix.normalize('word/'+image.target),original=await zip.file(target).async('nodebuffer');
          const rendered=await page.evaluate(async src=>Array.from(new Uint8Array(await (await fetch(src)).arrayBuffer())),observed.images[0].src);
          assert.equal(sha(Buffer.from(rendered)),sha(original));assert.ok(Math.abs(observed.images[0].width-image.width)<.02);assert.ok(Math.abs(observed.images[0].height-image.height)<.02);
          assert.equal(observed.images[0].naturalWidth,550);assert.equal(observed.images[0].naturalHeight,517);
        });
      }
      originals.push({id,sha256:digest,dpr,characters:expected.text.length,bodySha256:sha(expected.text),rows:expected.rows,cells:expected.cells,pages:observed.pages,images:observed.images.length});
      await page.evaluate(()=>handle.unmount());assert.equal(await page.locator('#host > *').count(),0);
    } finally {await page.close();}
  }
  await check('No browser exceptions or external requests while checking the original subcases',()=>{assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);});
  completed=true;
} finally {
  await browser.close();await writeFile(path.join(output,'report.json'),JSON.stringify({completed,passed:checks.length,checks,originals,errors,requests,scope:'C018 markers, C031 zoom and C033 writing direction/embedded flowchart; existing behavior confirmed, not new product fixes or complete Word fidelity.'},null,2)+'\n');
}
