import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createSpreadsheetParserContext, parseSpreadsheetWorkbook } from '../dist/spreadsheet/worker/sheetjs/parser.js';
import { prepareSpreadsheetReadInput } from '../dist/spreadsheet/worker/sheetjs/textEncoding.js';

const root = path.resolve(import.meta.dirname, '../../../..');
const require = createRequire(path.join(root, 'package.json'));
const { build } = createRequire(path.join(root, 'packages/renderers/spreadsheet/package.json'))('esbuild');
const { chromium } = require('playwright');
const output = path.join(root, 'output/spreadsheet-text-containers');
await mkdir(output, { recursive: true });
const checks = [];
const bytes = value => Uint8Array.from(value).buffer;
const utf8 = value => bytes(Buffer.from(value, 'utf8'));
const utf16 = (value, big = false) => {
  const b = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(value, 'utf16le')]);
  if (big) b.swap16();
  return bytes(b);
};
async function check(name, fn) {
  await fn(); checks.push({ name, status: 'pass' }); console.log(`PASS ${name}`);
}
async function firstValue(data, source) {
  const ctx = createSpreadsheetParserContext();
  const messages = await parseSpreadsheetWorkbook(ctx, data, source);
  assert.ok(messages.some(m => m.type === 'sheets'), JSON.stringify(messages));
  return ctx.workbook.Sheets[ctx.workbook.SheetNames[0]]['!data'][0][0].v;
}
const label = '中文价格';
for (const type of ['xls', 'xlt', 'xla', 'application/vnd.ms-excel']) {
  await check(`UTF-8 text values under legacy type ${type}`, async () => {
    assert.equal(await firstValue(utf8(label), { fileType: type }), label);
  });
}
await check('Filename-only legacy hint and uppercase MIME parameters', async () => {
  assert.equal(await firstValue(utf8(label), { filename: 'report.XLS?version=1' }), label);
  assert.equal(await firstValue(utf8(label), { fileType: 'APPLICATION/VND.MS-EXCEL; charset=UTF-8' }), label);
});
for (const big of [false, true]) {
  await check(`UTF-16 ${big ? 'BE' : 'LE'} BOM text under XLS`, async () => {
    assert.equal(await firstValue(utf16(label, big), { fileType: 'xls' }), label);
  });
}
const gbk = bytes([0xd6,0xd0,0xce,0xc4]);
await check('GBK legacy text uses shared automatic decoding', async () => {
  assert.equal(await firstValue(gbk, { fileType: 'xls' }), '中文');
});
await check('UTF-8 BOM and delimited text keep independent cells', async () => {
  const ctx = createSpreadsheetParserContext();
  await parseSpreadsheetWorkbook(ctx, utf8('\uFEFF名称,数值\n中文,42'), { fileType: 'xls' });
  const table = ctx.workbook.Sheets.Sheet1['!data'];
  assert.equal(table[0][0].v, '名称'); assert.equal(table[1][0].v, '中文'); assert.equal(table[1][1].v, 42);
});
await check('Existing CSV decoding remains unchanged', async () => {
  assert.equal(await firstValue(gbk, { fileType: 'csv' }), '中文');
});
await check('HTML-in-XLS preserves Unicode cell values', async () => {
  assert.equal(await firstValue(utf8('<html><body><table><tr><td>中文</td></tr></table></body></html>'), { fileType: 'xls' }), '中文');
});
await check('Real OLE workbook bypasses text decoding', async () => {
  const original = bytes(await readFile(path.join(root,'packages/renderers/spreadsheet/test/fixtures/github-178-embedded-image.xls')));
  const before = createHash('sha256').update(new Uint8Array(original)).digest('hex');
  assert.equal(prepareSpreadsheetReadInput(original, { fileType: 'xls' }).kind, 'binary');
  const ctx = createSpreadsheetParserContext(); await parseSpreadsheetWorkbook(ctx, original, { fileType: 'xls' });
  assert.ok(ctx.workbook?.SheetNames.length); assert.equal(createHash('sha256').update(new Uint8Array(original)).digest('hex'), before);
});
await check('ZIP workbooks, raw BIFF, controls and odd UTF-16 remain binary', async () => {
  const cases = [bytes([0x50,0x4b,3,4]), bytes([0x09,0x08,0x10,0]), bytes([0x09,0x04,0x10,0]), bytes([0,0,0,4]), bytes([0xff,0xfe,65]), utf8('%PDF-1.7\n'), utf8('{\\rtf1 abc}')];
  for (const original of cases) assert.equal(prepareSpreadsheetReadInput(original,{fileType:'xls'}).kind,'binary');
  const original = bytes(await readFile(path.join(root,'packages/renderers/spreadsheet/test/fixtures/github-178-embedded-image.xlsx')));
  assert.equal(prepareSpreadsheetReadInput(original,{fileType:'xls'}).kind,'binary');
});
await check('Modern workbook hints and unknown types are not forced into text', async () => {
  for(const fileType of ['xlsx','xlsb','dbf','ods','unknown']) assert.equal(prepareSpreadsheetReadInput(utf8(label),{fileType}).kind,'binary');
});
await check('Text probing is bounded and whole-file decoding keeps a split UTF-8 character', async () => {
  const text = 'A'.repeat(65535)+'中文';
  assert.equal(prepareSpreadsheetReadInput(utf8(text), {fileType:'xls'}).data,text);
});

await build({entryPoints:[path.join(root,'test/spreadsheet-text-containers/browser.ts')],outfile:path.join(output,'browser.js'),bundle:true,format:'iife',platform:'browser',logLevel:'warning'});
const browser = await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
const errors = [], requests = [];
try {
  const page = await browser.newPage({viewport:{width:1000,height:700}});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});
  await page.route('**/*',route=>/^https?:/.test(route.request().url())?route.abort():route.continue());
  await page.setContent('<!doctype html><meta charset="utf-8"><div id="host" style="width:950px;height:650px"></div>');
  await page.addScriptTag({content:await readFile(path.join(output,'browser.js'),'utf8')});
  await check('Actual renderer searches the decoded Unicode cell',async()=>{
    const value=await page.evaluate(async(label)=>{
      const host=document.getElementById('host');
      window.handle=await spreadsheetTextCheck.renderFileViewerSpreadsheet(new TextEncoder().encode(label).buffer,host,'xls',{filename:'generated.xls',options:{spreadsheet:{worker:false}}});
      window.search=spreadsheetTextCheck.createFileViewerDomSearchController({root:()=>host});
      const state=await window.search.search(label);return {total:state.total, text:state.current?.text};
    },label);
    assert.equal(value.total,1);assert.equal(value.text,label);
    await page.screenshot({path:path.join(output,'unicode-cell.png')});
  });
  await check('Bundled real classic Worker returns correctly decoded search values',async()=>{
    // The self-contained bundle also supports classic Workers. An about:blank
    // test document has an opaque origin unsuitable for module Worker loading.
    const worker=await readFile(path.join(root,'packages/renderers/spreadsheet/dist/worker/sheet.worker.js'),'utf8');
    const result=await page.evaluate(async({worker,label})=>{
      const url=URL.createObjectURL(new Blob([worker],{type:'application/javascript'}));const w=new Worker(url,{type:'classic'});
      try {return await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error('Worker did not return search result')),10000);
        w.onerror=e=>{clearTimeout(timer);reject(new Error(e.message))};
        w.onmessage=e=>{
          if(e.data.type==='sheets')w.postMessage({type:'searchWorkbook',payload:{query:label,requestId:1}});
          else if(e.data.type==='searchWorkbook'){clearTimeout(timer);resolve(e.data.payload.matches)}
          else if(e.data.type==='error'){clearTimeout(timer);reject(new Error(JSON.stringify(e.data)))}
        };
        w.postMessage({type:'parseWorkbook',payload:{workbook:new TextEncoder().encode(label).buffer,fileType:'xls',filename:'generated.xls'}});
      })}finally{w.terminate();URL.revokeObjectURL(url)}
    },{worker,label});
    assert.equal(result.length,1);assert.equal(result[0].text,label);
  });
  await check('Disposal clears renderer and has no browser errors or external requests',async()=>{
    await page.evaluate(()=>{window.search.destroy();window.handle.unmount()});
    assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  });
} finally {
  await browser.close();
  await writeFile(path.join(output,'report.json'),JSON.stringify({checks,passed:checks.length},null,2)+'\n');
}
