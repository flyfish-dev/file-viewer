import test from 'node:test';
import assert from 'node:assert/strict';
const {parseMsDoc}=await import(process.env.DOC_TEST_PACKAGE || '../dist/index.js');
import {makeTextboxDoc} from './helpers/textbox-fixture.mjs';
// Synthetic CFB, not a native Word layout oracle. Each UTF16 unit gets a
// CHPX run: anchor 24 half-points, every other unit 22 half-points.
function fixture(content, anchorFlag) {
 return makeTextboxDoc({mutate({word,table,fields}) {
  const n=word.readUInt32LE(76);
  assert.ok(content.length<n);
  const raw=content+' '.repeat(n-content.length-1)+'\r';
  Buffer.from(raw,'utf16le').copy(word,1024);
  const f=word.subarray(1536,2048); f.fill(0);
  for(let i=0;i<=raw.length;i++) f.writeUInt32LE(1024+i*2,i*4);
  for(let i=0;i<raw.length;i++) {
   const offset=180+i*10; f[(raw.length+1)*4+i]=offset/2;
   f[offset]=4; f.writeUInt16LE(0x4a43,offset+1);
   f.writeUInt16LE(raw[i]==='\b'?24:22,offset+3);
   if(anchorFlag && raw[i]==='\b') {f[offset]=7; f.writeUInt16LE(anchorFlag,offset+5); f[offset+7]=1;}
  }
  f[511]=raw.length;
  table.writeUInt32LE(1024+raw.length*2,fields.fcPlcfBteChpx+4);
 }});
}
for(const content of ['\bABC','A\bBC','ABC\b','\b\bABC','A\b\bBC','\b','ABC','\b😀中é','😀\b中','\ud800\bX','A\t\bB']) {
 test('raw UTF16 CHPX mapping '+JSON.stringify(content),()=>{
  const m=parseMsDoc(fixture(content));
  const p=m.blocks.find(b=>b.type==='paragraph');
  if(content==='\b') { assert.ok(!p || !p.inlines.some(n=>n.text?.includes('\b'))); return; }
  const nodes=p.inlines.filter(n=>n.type==='text');
  assert.ok(nodes.length);
  for(const n of nodes) {assert.equal(n.style.fontSizeHalfPoints,22);assert.ok(!n.text.includes('\b'));}
 });
}

for(const opcode of [0x083c,0x0800,0x0801,0x0806,0x080a]) {
 test('anchor flags do not shift to visible body '+opcode,()=>{
  const m=parseMsDoc(fixture('\bBODY',opcode));
  const p=m.blocks.find(b=>b.type==='paragraph');
  const nodes=p.inlines.filter(n=>n.type==='text');
  assert.ok(nodes.map(n=>n.text).join('').startsWith('BODY'));
  for(const n of nodes) for(const key of ['hidden','revisionDeleted','revisionInserted','data','ole2']) assert.ok(!n.style[key]);
  assert.deepEqual(m.assets,[]);
 });
}
for(const content of ['\b\x13X\x14RESULT\x15','\x13X\b\x14RESULT\x15','\x13X\x14\bRESULT\x15','\x13X\x14RESULT\b\x15']) {
 test('field instruction stays hidden across anchor '+JSON.stringify(content),()=>{
  const m=parseMsDoc(fixture(content));
  const p=m.blocks.find(b=>b.type==='paragraph');
  assert.equal(p.inlines.filter(n=>n.type==='text').map(n=>n.text).join('').trim(),'RESULT');
 });
}
