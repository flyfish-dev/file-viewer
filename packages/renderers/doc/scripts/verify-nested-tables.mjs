import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { buildBlocks, normalizeRowEndOnlyTables } from '../dist/msdoc/parser.js';
import { paraPropsToState, charPropsToState, tablePropsToState } from '../dist/msdoc/properties.js';
import { parseMsDoc, renderMsDoc } from '../dist/index.js';

const root = path.resolve(import.meta.dirname, '../../../..');
const { build } = createRequire(path.join(root, 'packages/renderers/pptx/package.json'))('esbuild');
const { chromium } = createRequire(path.join(root, 'package.json'))('playwright');
const output = path.resolve(process.env.NATIVE_TABLE_OUTPUT || path.join(root, 'output/native-tables'));
await mkdir(output, { recursive: true });
const checks = [], originals = [];
const sha = value => createHash('sha256').update(value).digest('hex');
let nextId = 0;
let completed = false;
function tableState(widths = [1800, 2400]) {
  let offset = 0;
  const centers = [0, ...widths.map(width => (offset += width))];
  return { ...tablePropsToState([]), defTable: { cb: 0, numberOfColumns: widths.length, rgdxaCenter: centers,
    cells: widths.map(width => ({ tcgrf: {}, wWidth: width, borders: {} })) },
    borders: Object.fromEntries(['top','left','right','bottom','horizontalInside','verticalInside'].map(k => [k, { borderType: 1, lineWidth: 8, color: 1 }])) };
}
function paragraph(text, depth = 0, ending = '', state = tableState(depth > 1 ? [800,1000] : [1800,2400])) {
  return { id: `paragraph-${++nextId}`, cpStart: nextId, cpEnd: nextId + 1, text,
    terminator: depth === 1 && ending ? '\x07' : '\r', styleId: 0, styleName: '',
    rawProperties: [], paraProps: [], tableProps: [], segments: [], tableState: state,
    paraState: { ...paraPropsToState([]), inTable: depth > 0, itap: depth,
      tableRowEnd: depth === 1 && ending === 'row', innerTableRowEnd: depth > 1 && ending === 'row', innerTableCell: depth > 1 && ending === 'cell' },
    inlines: text ? [{ type: 'text', text, style: charPropsToState([]) }] : [] };
}
function flatten(blocks) {
  const result = { tables: [], paragraphs: [], images: [] };
  const visit = values => { for (const b of values) {
    if (b.type === 'paragraph') { result.paragraphs.push(b); result.images.push(...b.inlines.filter(n => n.type === 'image')); }
    else if (b.type === 'table') { result.tables.push(b); for (const r of b.rows) for (const c of r.cells) visit(c.blocks ?? c.paragraphs); }
  }};
  visit(blocks);
  return { ...result, text: result.paragraphs.map(p => p.text).join(''), rows: result.tables.reduce((n,t) => n+t.rows.length,0) };
}
function document(blocks) { return { blocks, assets: [], warnings: [], meta: {} }; }
async function check(name, fn) { try { await fn(); checks.push({name,status:'pass'}); console.log('PASS '+name); }
  catch (error) { checks.push({name,status:'fail',error:String(error)}); throw error; } }
const sequence = [paragraph('BEFORE'), paragraph('OUTER A',1,'cell'), paragraph('PREFIX',1),
  paragraph('NESTED A',2,'cell'),paragraph('NESTED B',2,'cell'),paragraph('',2,'row'),
  paragraph('NESTED C',2,'cell'),paragraph('NESTED D',2,'cell'),paragraph('',2,'row'),
  paragraph('SUFFIX',1,'cell'),paragraph('',1,'row'),paragraph('AFTER')];
const generated = document(buildBlocks(sequence));
try {
  await check('Nested paragraph-mark rows retain independent grids and ordered cell blocks', () => {
    const flat=flatten(generated.blocks);assert.equal(flat.tables.length,2);assert.equal(flat.rows,3);
    assert.deepEqual(flat.tables.map(t=>t.depth),[1,2]);assert.equal(flat.tables[0].rows[0].cells.length,2);
    const cell=flat.tables[0].rows[0].cells[1];assert.deepEqual(cell.blocks.map(b=>b.type),['paragraph','table','paragraph']);
    assert.deepEqual(cell.paragraphs.map(p=>p.text),['PREFIX','SUFFIX']);
    assert.equal(flat.text,'BEFOREOUTER APREFIXNESTED ANESTED BNESTED CNESTED DSUFFIXAFTER');
    assert.deepEqual(flat.tables.map(t=>t.gridWidthTwips),[4200,1800]);
  });
  await check('Row marks do not create phantom cells and authored empty cells survive',()=>{
    const r=buildBlocks([paragraph('',1,'cell'),paragraph('B',1,'cell'),paragraph('',1,'row')]);
    assert.equal(r[0].rows[0].cells.length,2);assert.equal(r[0].rows[0].cells[0].paragraphs.length,1);
  });
  await check('Interrupted and malformed rows retain text instead of dropping pending content',()=>{
    const r=buildBlocks([paragraph('P',1),paragraph('N',2),paragraph('Q',1),paragraph('TAIL')]);
    assert.equal(flatten(r).text,'PNQTAIL');assert.equal(flatten(r).tables.length,2);
    assert.equal(flatten(buildBlocks([paragraph('sentinel text',1,'row')])).text,'sentinel text');
  });
  await check('Adjacent inner tables separated by parent paragraphs remain separate',()=>{
    const r=buildBlocks([paragraph('A',1),paragraph('B',2,'cell'),paragraph('',2,'row'),paragraph('C',1),paragraph('D',2,'cell'),paragraph('',2,'row'),paragraph('E',1,'cell'),paragraph('',1,'row')]);
    assert.equal(flatten(r).tables.length,3);assert.equal(flatten(r).text,'ABCDE');
  });
  await check('Three nesting levels close only their own row and cell state',()=>{
    const r=buildBlocks([paragraph('A',1),paragraph('B',2),paragraph('C',3,'cell'),paragraph('',3,'row'),paragraph('D',2,'cell'),paragraph('',2,'row'),paragraph('E',1,'cell'),paragraph('',1,'row')]);
    assert.deepEqual(flatten(r).tables.map(t=>t.depth),[1,2,3]);assert.equal(flatten(r).text,'ABCDE');
  });
  await check('Depth jumps do not allocate synthetic intermediate tables or recurse during parsing',()=>{
    const r=buildBlocks([paragraph('A',1),paragraph('B',2147483647,'cell'),paragraph('',2147483647,'row'),paragraph('C',1,'cell'),paragraph('',1,'row')]);
    assert.equal(flatten(r).tables.length,2);assert.equal(flatten(r).text,'ABC');
  });
  await check('Supplemental story boundaries do not join unrelated tables',()=>{
    const a=paragraph('A',1), b=paragraph('B',1);a.storyKind='main';b.storyKind='textbox';
    const r=buildBlocks([a,b]);assert.equal(r.length,2);assert.equal(flatten(r).text,'AB');
  });
  await check('Row-end-only recovery never promotes inner table paragraphs to the outer grid',()=>{
    const ps=structuredClone(sequence);normalizeRowEndOnlyTables(ps);
    assert.deepEqual(ps.map(p=>p.paraState.itap),sequence.map(p=>p.paraState.itap));
  });
  await check('Legacy paragraph-only cells still render and nested content remains escaped',()=>{
    const d=structuredClone(generated);delete d.blocks[1].rows[0].cells[0].blocks;
    assert.match(renderMsDoc(d).html,/OUTER A/);
    const malicious=paragraph('<script>not markup</script>',2,'cell');
    const html=renderMsDoc(document(buildBlocks([paragraph('P',1),malicious,paragraph('',2,'row'),paragraph('',1,'cell'),paragraph('',1,'row')]))).html;
    assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));
  });
  await check('Vertical parent text does not rotate or absorb a nested table grid',()=>{
    const d=structuredClone(generated);d.blocks[1].rows[0].cells[1].meta.textFlow=5;
    const html=renderMsDoc(d).html;
    assert.match(html,/msdoc-cell-vertical[\s\S]*PREFIX[\s\S]*<\/div><\/div><table/);
    assert.match(html,/<\/table><div class="msdoc-cell-vertical"/);
  });
  const compiled = await build({ stdin: {contents: `import * as native from './packages/renderers/doc/src/index.ts';import {renderFileViewerWordDoc} from './packages/renderers/word/src/index.ts';import {findFileViewerZoomProvider} from './packages/core/src/index.ts';window.nativeReview={...native,renderFileViewerWordDoc,findFileViewerZoomProvider};`, resolveDir:root, loader:'ts'}, bundle:true, write:false, format:'iife', platform:'browser',logLevel:'silent' });
  const worker = await build({entryPoints:[path.join(root,'packages/renderers/doc/src/worker.ts')],bundle:true,write:false,format:'iife',platform:'browser',logLevel:'silent'});
  const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
  try {
    for(const dpr of [1,2]) {
      const page=await browser.newPage({viewport:{width:1100,height:1000},deviceScaleFactor:dpr});const errors=[],requests=[];
      page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>{requests.push(r.request().url());return r.abort();});
      await page.setContent('<div id="host" style="height:950px;width:1000px"></div>');await page.addScriptTag({content:compiled.outputFiles[0].text});
      await check(`Actual HTML renderer and sanitizer preserve nested tables at DPR ${dpr}`,async()=>{
        const metrics=await page.evaluate(d=>{
          const {html,css}=nativeReview.renderMsDoc(d);const host=document.getElementById('host');host.innerHTML='';
          const style=document.createElement('style');style.textContent=css;host.append(style);
          const body=document.createElement('div');body.className='msdoc-root';body.append(nativeReview.sanitizeMsDocHtml(html,window));host.append(body);
          return {tables:host.querySelectorAll('table').length,nested:host.querySelectorAll('td table').length,rows:host.querySelectorAll('tr').length,text:body.textContent};
        },generated);
        assert.equal(metrics.tables,2);assert.equal(metrics.nested,1);assert.equal(metrics.rows,3);assert.equal(metrics.text,flatten(generated.blocks).text);
        await page.screenshot({path:path.join(output,`generated-${dpr}.png`)});
      });
      const corpus=process.env.NATIVE_TABLE_CORPUS_DIR;
      if(corpus)for(const entry of [
        {id:'C001',bodyHash:'24b3168da086ae9f8f3dce893780b60cae22cfbaa87b2cad4caeb7a53bb048b4',hash:'275fcd589ec2cafe1e96fd2634d1b001b7ce055434a5618459179408ee8dda98',tables:16,rows:82,images:12},
        {id:'C056',bodyHash:'4bf5122f344554c53bde2ebb8cd2b7e3d1600ad631c385a5d7cce23c7785459a',hash:'c61860b68b3b04e4ee2d00516dba1102fda84a51c559f1217ccb285940b5697c',tables:0,rows:0,images:1}, {id:'C057',bodyHash:'fc094568b3095da48fba8e34cdd2d7c77be54a2f3832c8864910ffa95fd7ea66',hash:'55e95c66c431ce7ca0fffc4fb296ad5d9beaefd9caf40ce9c1f648ff8849c7b6',tables:0,rows:0,images:1}, {id:'C069',bodyHash:'783a4d6d123d3bb9636a96f3bb4920c10c253a07b19dc385e5996bd25308235e',hash:'20d54c7246abc43147c6145abdef283cac113fdbf684387bfdc69b9df9887e94',tables:2,rows:39,images:0},
      ]) {
        const bytes=await readFile(path.join(corpus,entry.id+'.doc'));assert.equal(sha(bytes),entry.hash);
        const parsed=parseMsDoc(bytes);const flat=flatten(parsed.blocks);assert.equal(flat.tables.length,entry.tables);assert.equal(flat.rows,entry.rows);assert.equal(sha(flat.text),entry.bodyHash);
        await check(`${entry.id}: actual Worker and public Word renderer retain tables and embedded pictures at DPR ${dpr}`,async()=>{
          const measured=await page.evaluate(async({data,code})=>{
            window.handle?.unmount();const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0));
            const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));const worker=new Worker(url);const client=new nativeReview.MsDocWorkerClient(worker);
            let result,timer;try{result=await Promise.race([client.parseToHtml(bytes),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Worker timeout')),15000);})]);}finally{clearTimeout(timer);client.destroy();URL.revokeObjectURL(url);}
            const host=document.getElementById('host');window.handle=await nativeReview.renderFileViewerWordDoc(bytes.buffer,host,'doc');
            await Promise.all([...host.querySelectorAll('img')].map(i=>i.decode()));await document.fonts.ready;
            const images=[...host.querySelectorAll('img')].map(i=>({loaded:i.complete&&i.naturalWidth>0,width:i.naturalWidth,height:i.naturalHeight}));
            const doc=new DOMParser().parseFromString(result.html,'text/html');
            const info={tables:host.querySelectorAll('table').length,rows:host.querySelectorAll('tr').length,images,workerTables:doc.querySelectorAll('table').length,workerRows:doc.querySelectorAll('tr').length,text:host.querySelector('.msdoc-stage')?.textContent||'',workerText:doc.body.textContent};
            const provider=nativeReview.findFileViewerZoomProvider(host);info.zoom=[];
            for(const scale of [.5,1,2]){await provider.setZoom(scale);info.zoom.push({scale:provider.getState().scale,tables:host.querySelectorAll('table').length,rows:host.querySelectorAll('tr').length});}
            await provider.setZoom(1);return info;
          },{data:bytes.toString('base64'),code:worker.outputFiles[0].text});
          assert.equal(measured.tables,entry.tables);assert.equal(measured.rows,entry.rows);assert.equal(measured.workerTables,entry.tables);assert.equal(measured.workerRows,entry.rows);
          assert.equal(measured.images.length,entry.images);assert.ok(measured.images.every(i=>i.loaded));
          assert.equal(measured.text,measured.workerText);assert.ok(measured.zoom.every(v=>v.tables===entry.tables&&v.rows===entry.rows));assert.deepEqual(measured.zoom.map(v=>v.scale),[.5,1,2]);
          originals.push({id:entry.id,sha256:sha(bytes),dpr,tables:entry.tables,rows:entry.rows,images:entry.images,bodyTextSha256:sha(measured.text),zoom:measured.zoom});
          if(entry.id==='C001'){await page.locator('.msdoc-table-depth-2').first().screenshot({path:path.join(output,`C001-nested-${dpr}.png`)});}
          await page.evaluate(()=>handle.unmount());assert.equal(await page.locator('#host>*').count(),0);
        });
      }
      await check(`No uncaught exceptions or external requests at DPR ${dpr}`,()=>{assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);});await page.close();
    }
  } finally {await browser.close();}
  completed = true;
} finally {
  await writeFile(path.join(output,'report.json'),JSON.stringify({completed,passed:checks.filter(c=>c.status==='pass').length,failed:checks.filter(c=>c.status==='fail').length,checks,originals,scope:'Nested-table structure, content order, embedded picture decoding and public entry/Worker parity; not whole-document desktop visual equivalence.'},null,2)+'\n');
}
