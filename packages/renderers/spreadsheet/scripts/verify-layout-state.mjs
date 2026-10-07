import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const root = path.resolve(import.meta.dirname, '../../../..');
const require = createRequire(path.join(root, 'package.json'));
const { build } = require('esbuild');
const { chromium } = require('playwright');
const JSZip = require('jszip');
const output = path.join(root, 'output/spreadsheet-layout-state');
await fs.mkdir(output, { recursive: true });
const checks = [];
const check = async (name, fn) => { await fn(); checks.push({ name, status: 'pass' }); console.log(`PASS ${name}`); };

async function fixture() {
  const zip = new JSZip();
  const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  zip.file('[Content_Types].xml', `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${[1,2].map(i=>`<Override PartName="/xl/worksheets/sheet${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`);
  zip.file('_rels/.rels', `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  zip.file('xl/workbook.xml', `<workbook xmlns="${ns}" xmlns:r="${rel}"><sheets><sheet name="First" sheetId="1" r:id="r1"/><sheet name="Second" sheetId="2" r:id="r2"/></sheets></workbook>`);
  zip.file('xl/_rels/workbook.xml.rels', `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${[1,2].map(i=>`<Relationship Id="r${i}" Type="${rel}/worksheet" Target="worksheets/sheet${i}.xml"/>`).join('')}</Relationships>`);
  for (const i of [1,2]) {
    zip.file(`xl/worksheets/sheet${i}.xml`, `<worksheet xmlns="${ns}"><dimension ref="A1:C12"/><sheetFormatPr defaultRowHeight="18"/><cols><col min="1" max="1" width="18" customWidth="1"/><col min="2" max="3" width="22" customWidth="1"/></cols><sheetData>${Array.from({length:12},(_,r)=>`<row r="${r+1}" ht="${27+r+i*3}" customHeight="1"><c r="A${r+1}" t="inlineStr"><is><t>Sheet ${i} row ${r+1}</t></is></c><c r="B${r+1}" t="n"><v>${r+i}</v></c></row>`).join('')}</sheetData></worksheet>`);
  }
  return zip.generateAsync({type:'nodebuffer'});
}

// Observe the actual renderer state without replacing its parser, table, events,
// or geometry. The test-only hook also replays a delayed window after a real drag.
const entry = path.join(root, 'packages/renderers/spreadsheet/src/spreadsheet.ts');
const bundle = await build({stdin:{contents:`import render from ${JSON.stringify(entry)};globalThis.layoutTestRender=render;`,resolveDir:root},bundle:true,format:'iife',write:false,logLevel:'warning',plugins:[{
  name:'observe-layout-state', setup(builder) {
    builder.onLoad({filter:/\/spreadsheet\/src\/spreadsheet\.ts$/},async({path:sourcePath})=>{
      let source = await fs.readFile(sourcePath,'utf8');
      const marker = '  emitParseWorkbook();\n\n  return {';
      assert.equal(source.split(marker).length,2,'test observation point must remain unique');
      source = source.replace(marker, `  globalThis.__layoutSubject = {getTable:()=>table, getState:()=>virtualState, applyWindowRows, applyStructureRowHeights};\n${marker}`);
      return {contents:source,loader:'ts'};
    });
  }
}]});
const browser = await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
const errors = [], requests = [];
const page = await browser.newPage({viewport:{width:1100,height:800}});
page.on('pageerror', e=>errors.push(e.message));
page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});
await page.route('**/*', route=>/^https?:/.test(route.request().url())?route.abort():route.continue());
async function paint() { await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))); }
await page.setContent('<!doctype html><meta charset="utf-8"><div id="host" style="width:1000px;height:700px"></div>');
await page.addScriptTag({content:bundle.outputFiles[0].text});
async function load(bytes, resizing=true) {
  await page.evaluate(()=>{window.layoutHandle?.unmount();document.querySelector('#host').replaceChildren()});
  await page.evaluate(async({bytes,resizing})=>{
    window.layoutHandle=await layoutTestRender(Uint8Array.from(atob(bytes),c=>c.charCodeAt(0)).buffer,document.querySelector('#host'),'xlsx',{filename:'layout.xlsx',options:{spreadsheet:{worker:false,...(resizing?{resizableColumns:true,resizableRows:true}:{})}}});
  },{bytes:bytes.toString('base64'),resizing});
  await page.waitForFunction(()=>__layoutSubject.getState().active && __layoutSubject.getState().rows.some(r=>r.__s===2));
  // Wait beyond the renderer's final 700 ms first-paint stabilization pass.
  await page.waitForTimeout(750);
  await zoom(1);
}
async function zoom(value) {
  await page.evaluate(value=>document.querySelector('.excel-wrapper').__flyfishViewerZoomProvider.setZoom(value),value); await paint();
}
async function select(name) { await page.getByRole('button',{name,exact:true}).click(); await paint(); }
async function state() {
  return page.evaluate(()=>{
    const table=__layoutSubject.getTable();const s=__layoutSubject.getState();
    return {rows:s.rows.slice(0,4).map((r,i)=>({base:r.__baseHeight,display:r._height,position:table.getPositionForRowIndex(i).height})),columns:table.ctx.header.leafCellHeaders.map(c=>({key:c.key,width:c.width})),value:s.rows[0]?.c0,zoom:document.querySelector('.excel-wrapper').__flyfishViewerZoomProvider.getState().zoom};
  });
}
async function drag(kind, index, delta) {
  const point = await page.evaluate(({kind,index})=>{
    const t=__layoutSubject.getTable(), rect=t.ctx.stageElement.getBoundingClientRect();
    if(kind==='column') {const c=t.ctx.header.leafCellHeaders[index+1];return {x:rect.x+c.drawX+c.width,y:rect.y+c.drawY+c.height/2};}
    const r=t.ctx.body.renderRows.find(r=>r.rowIndex===index);if(!r)throw Error('Target row not visible');
    const c=r.cells.find(c=>c.rowspan===1 && c.width>24);if(!c)throw Error('No resizable row boundary');
    return {x:rect.x+c.drawX+c.width/2,y:rect.y+r.y-t.ctx.scrollY+r.height};
  },{kind,index});
  await page.mouse.move(point.x-10,point.y-5);await page.mouse.move(point.x,point.y);await paint();
  assert.equal(await page.evaluate(()=>__layoutSubject.getTable().ctx.stageElement.style.cursor),kind==='row'?'row-resize':'col-resize');
  await page.mouse.down();await page.mouse.move(point.x+(kind==='column'?delta:0),point.y+(kind==='row'?delta:0),{steps:5});await page.mouse.up();await paint();
}
try {
  await load(await fixture());
  let first,second,resized;
  await check('Authored row metrics survive initial layout and explicit 100% zoom',async()=>{
    first=await state();assert.deepEqual(first.rows.map(r=>r.base),[30,31,32,33]);assert.ok(first.rows.every(r=>r.base===r.position));
  });
  await check('Real pointer column drag updates displayed width',async()=>{
    const before=await state();await drag('column',0,48);const after=await state();assert.equal(after.columns[1].width,before.columns[1].width+48);
  });
  await check('Real pointer row drag stores unscaled user height',async()=>{
    const before=await state();await drag('row',1,24);resized=await state();assert.equal(resized.rows[1].base,before.rows[1].base+24);assert.equal(resized.rows[1].position,resized.rows[1].base);
  });
  await check('Separate sheets retain independent row and column sizes',async()=>{
    await select('Second');second=await state();assert.notEqual(second.rows[1].base,resized.rows[1].base);assert.notEqual(second.columns[1].width,resized.columns[1].width);
  });
  await check('Cached sheet heights follow the current global zoom after switching',async()=>{
    await zoom(.5);await select('First');const s=await state();assert.ok(s.rows.every(r=>r.display===Math.round(r.base*.5) && r.position===r.display),JSON.stringify(s));assert.equal(s.columns[1].width,Math.round(resized.columns[1].width*.5));
  });
  await check('Drag at 50% remains proportional through 88%, 200% and cached switches',async()=>{
    await drag('row',1,12);await drag('column',0,20);resized=await state();
    for(const scale of [.88,2,1,.5]) {
      await select('Second');await zoom(scale);await select('First');const s=await state();
      assert.ok(s.rows.every(r=>r.position===Math.round(r.base*scale)),JSON.stringify(s));assert.equal(s.rows[1].base,resized.rows[1].base);assert.equal(s.columns[1].width,Math.round(resized.columns[1].width/.5*scale));
    }
  });
  await check('Delayed window/structure hydration does not overwrite resized row metrics',async()=>{
    const before=await state();
    await page.evaluate(()=>{
      const s=__layoutSubject.getState();const data=s.rows.slice(0,4).map(r=>s.dataKeys.map(k=>r[k]??''));
      const window={meta:{startRow:0,endRow:4},data,rowHeights:[30,31,32,33],structure:{rowHeights:[30,31,32,33]}};
      __layoutSubject.applyWindowRows(window);__layoutSubject.applyStructureRowHeights(window.structure.rowHeights);
    });
    const after=await state();assert.equal(after.rows[1].base,before.rows[1].base);assert.equal(after.rows[1].display,before.rows[1].display);
  });
  await check('Rapid cached tab changes display only the final selected sheet',async()=>{
    await page.evaluate(()=>{for(const name of ['Second','First','Second'])Array.from(document.querySelectorAll('button')).find(b=>b.textContent===name).click()});await paint();
    assert.equal((await state()).rows[0].base,second.rows[0].base);
    const value=await page.evaluate(()=>__layoutSubject.getTable().ctx.database.getAllRowsData()[0]);assert.ok(Object.values(value).includes('Sheet 2 row 1'));
  });
  await page.screenshot({path:path.join(output,'sheet-layout.png')});
  await check('Resizing remains opt-in',async()=>{
    await load(await fixture(),false);const flags=await page.evaluate(()=>{const c=__layoutSubject.getTable().ctx.config;return [c.ENABLE_RESIZE_COLUMN,c.ENABLE_RESIZE_ROW]});assert.deepEqual(flags,[false,false]);
  });
  // Optional private original-file acceptance; no source names or cell values are
  // written to reports. The original has one sheet; switching uses fixture().
  if(process.env.SPREADSHEET_LAYOUT_SAMPLE) {
    await check('C036 original bytes: pointer resize and repeated zoom preserve source/user metrics',async()=>{
      const original=await fs.readFile(process.env.SPREADSHEET_LAYOUT_SAMPLE);
      assert.equal(createHash('sha256').update(original).digest('hex'),'0d49c0e5cdd0e4254b88bcef7b8e89f423b4924252604ae70dd8201e436437a9');
      await load(original);const before=await state();assert.deepEqual(before.rows.map(r=>r.base),[36,39,23,23]);
      await drag('row',1,22);await drag('column',1,32);const after=await state();
      assert.equal(after.rows[1].base,61);
      for(const z of [.5,.88,2,1]){await zoom(z);const s=await state();assert.equal(s.rows[1].position,Math.round(61*z));assert.equal(s.columns[2].width,Math.round(after.columns[2].width*z));}
      assert.equal(createHash('sha256').update(original).digest('hex'),'0d49c0e5cdd0e4254b88bcef7b8e89f423b4924252604ae70dd8201e436437a9');
    });
  }
  await check('Disposal clears rendering listeners with no external requests or browser errors',async()=>{
    await page.evaluate(()=>window.layoutHandle.unmount());await page.mouse.move(800,600);await page.mouse.up();await paint();assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  });
} finally {
  await browser.close();
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify({checks,passed:checks.length,originalChecked:!!process.env.SPREADSHEET_LAYOUT_SAMPLE},null,2)+'\n');
}
