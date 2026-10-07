import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const root = path.resolve(import.meta.dirname, '../../../..');
const require = createRequire(path.join(root, 'package.json'));
const { build } = require('esbuild');
const { chromium } = require('playwright');
const output = path.join(root, 'output/archive-original');
await fs.mkdir(output, { recursive: true });
if (!process.env.ARCHIVE_ORIGINAL_SAMPLE) throw Error('Set ARCHIVE_ORIGINAL_SAMPLE to the hash-identified original ZIP.');
const bytes = await fs.readFile(process.env.ARCHIVE_ORIGINAL_SAMPLE);
const hash = createHash('sha256').update(bytes).digest('hex');
assert.equal(hash, 'dbbb2ba181355380d245d43fa768f4500485c57a34a61522e129d597038e0f52');

// Independent reference: this bounded original uses stored entries. Read each
// local header directly; do not use JSZip or the viewer to create expectations.
const expected = [];
for (let at = 0; at + 30 <= bytes.length && bytes.readUInt32LE(at) === 0x04034b50;) {
  assert.equal(bytes.readUInt16LE(at + 6) & 0x809, 0);
  assert.equal(bytes.readUInt16LE(at + 8), 0, 'Original must use stored entries');
  const length = bytes.readUInt32LE(at + 18), n = bytes.readUInt16LE(at + 26), extra = bytes.readUInt16LE(at + 28);
  const start = at + 30 + n + extra;
  assert.ok(start + length <= bytes.length);
  const raw = bytes.subarray(start, start + length);
  expected.push({
    name: new TextDecoder('gbk', { fatal: true }).decode(bytes.subarray(at + 30, at + 30 + n)),
    text: new TextDecoder('gbk', { fatal: true }).decode(raw),
    data: raw.toString('base64'), size: length,
    sha256: createHash('sha256').update(raw).digest('hex'),
  });
  at = start + length;
}
assert.equal(expected.length, 3);
assert.ok(expected.some(e => e.name.includes('①②③')));

const bundle = await build({stdin:{contents:`
import render from './packages/renderers/archive/src/archive.ts';
import word from './packages/renderers/word/src/index.ts';
import text from './packages/renderers/text/src/index.ts';
import {loadArchiveEntriesWithoutWorker} from './packages/renderers/archive/src/archiveFallback.ts';
globalThis.originalArchive = {render,word,text,loadArchiveEntriesWithoutWorker};
`,resolveDir:root},bundle:true,format:'iife',write:false,logLevel:'warning'});
const browser = await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
const page = await browser.newPage({viewport:{width:1200,height:900}});
const errors=[], requests=[], checks=[];
let browserDownloadName;let completed=false;
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});
await page.route('**/*',r=>/^https?:/.test(r.request().url())?r.abort():r.continue());
const check=async(name,fn)=>{await fn();checks.push({name,status:'pass'});console.log('PASS',name)};
try {
  await page.setContent('<!doctype html><meta charset="utf-8"><div id="host" style="width:1100px;height:760px"></div>');
  await page.addScriptTag({content:bundle.outputFiles[0].text});
  await check('Original ZIP names and extracted bytes match independent stored headers',async()=>{
    const actual=await page.evaluate(async bytes=>{
      const data=Uint8Array.from(atob(bytes),c=>c.charCodeAt(0));
      const entries=await originalArchive.loadArchiveEntriesWithoutWorker(data.buffer,'C009.zip');
      return Promise.all(entries.map(async e=>{const file=await e.compressedFile.extract();const raw=new Uint8Array(await file.arrayBuffer());return {name:e.name,fileName:file.name,data:btoa(String.fromCharCode(...raw)),previewable:e.previewable}}));
    },bytes.toString('base64'));
    assert.deepEqual(actual.map(e=>e.name).sort(),expected.map(e=>e.name).sort());
    for(const e of actual){assert.equal(e.fileName,e.name);assert.equal(e.data,expected.find(x=>x.name===e.name).data);assert.equal(e.previewable,true)}
  });
  await check('Actual archive renderer lists all three decoded names',async()=>{
    await page.evaluate(async bytes=>{
      const data=Uint8Array.from(atob(bytes),c=>c.charCodeAt(0));
      window.archiveHandle=await originalArchive.render(data.buffer,document.querySelector('#host'),'zip',{filename:'C009.zip',options:{locale:'en-US',rendererMode:'replace',autoRenderers:false,preset:[originalArchive.word,originalArchive.text],archive:{cache:false}}});
    },bytes.toString('base64'));
    await page.waitForFunction(()=>document.querySelectorAll('.archive-entry').length===3);
    assert.deepEqual((await page.locator('.entry-copy strong').allTextContents()).sort(),expected.map(e=>e.name).sort());
  });
  await check('Chinese/circled filename search selects the intended entry',async()=>{
    await page.locator('.archive-search').fill('①②③');
    assert.equal(await page.locator('.archive-entry').count(),1);
    assert.equal(await page.locator('.entry-copy strong').textContent(),expected.find(e=>e.name.includes('①②③')).name);
    await page.locator('.archive-search').fill('');
  });
  for(const [i,e] of expected.entries()){
    await check(`Original child ${i+1}: actual nested renderer displays GBK text without replacement characters`,async()=>{
      await page.locator('.archive-entry').filter({has:page.locator('strong',{hasText:e.name})}).click();
      await page.waitForFunction(text=>document.querySelector('.archive-nested-content')?.textContent?.includes(text),e.text,{timeout:20000});
      const content=await page.locator('.archive-nested-content').innerText();assert.ok(!content.includes('\uFFFD'));assert.ok(content.includes(e.text));
    });
  }
  await check('Child download link preserves decoded filename and downloaded bytes',async()=>{
    await page.evaluate(()=>document.addEventListener('click',e=>{const a=e.target;if(a instanceof HTMLAnchorElement && a.hasAttribute('download'))window.__originalDownloadName=a.download},true));
    const downloadEvent=page.waitForEvent('download');await page.locator('.archive-download-button').click();const download=await downloadEvent;
    assert.equal(await page.evaluate(()=>window.__originalDownloadName),expected.at(-1).name);
    browserDownloadName=download.suggestedFilename();
    const saved=await download.path();assert.equal(createHash('sha256').update(await fs.readFile(saved)).digest('hex'),expected.at(-1).sha256);
  });
  await page.screenshot({path:path.join(output,'nested-preview.png')});
  await check('Cleanup completes with no browser errors or external requests',async()=>{
    await page.evaluate(()=>archiveHandle.unmount());assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),hash);
  });
  completed=true;
} finally {
  await browser.close();
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify({sample:'C009',sha256:hash,completed,checks,passed:checks.length,downloadFilenameAccepted:browserDownloadName===expected.at(-1).name,childBytes:expected.map(e=>({size:e.size,sha256:e.sha256})),scope:'Actual archive UI, fallback extraction, preset-driven child text/Word rendering and download; original stored entries. Download link attribute and saved bytes are checked; browser-suggested filename acceptance is reported separately, not inferred. No encrypted/RAR or arbitrary code-page guarantee.'},null,2)+'\n');
}
