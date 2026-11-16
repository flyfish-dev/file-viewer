import test from 'node:test';
import assert from 'node:assert/strict';
import * as current from '../dist/index.js';
import { makeTextboxDoc } from './helpers/anchor-style-fixture.mjs';
function fixture(main,{same=false,mark=false,table=false,insert=false}={}){return makeTextboxDoc({main,table,mutate({word,table,fields}){
 const bounds=[0];for(let i=1;i<main.length;i++)if(!same&&(main[i]==='\b'||main[i-1]==='\b'||main[i]==='\r'||main[i-1]==='\r'))bounds.push(i);bounds.push(main.length);
 const f=word.subarray(1536,2048);f.fill(0);bounds.forEach((cp,i)=>f.writeUInt32LE(1024+cp*2,i*4));
 for(let i=0;i<bounds.length-1;i++){const cp=bounds[i],offset=180+i*12;f[bounds.length*4+i]=offset/2;f[offset]=4;f.writeUInt16LE(0x4a43,offset+1);f.writeUInt16LE(!same&&main[cp]==='\b'?24:22,offset+3);if(mark&&main[cp]==='\r'&&cp<main.length-1){f[offset]=7;f.writeUInt16LE(insert?0x0801:0x0800,offset+5);f[offset+7]=1;}}
 f[511]=bounds.length-1;table.writeUInt32LE(1024+main.length*2,fields.fcPlcfBteChpx+4);
}});}
const first=m=>m.blocks.find(b=>b.type==='paragraph');const txt=p=>p.inlines.map(n=>n.text||'').join('');const cases=[];
cases.push({name:'actual PAPX cell anchor',bytes:fixture('\bAB\x07\x07',{table:true}),check(m){const t=m.blocks.find(b=>b.type==='table');assert.ok(t);const p=t.rows[0].cells[0].paragraphs[0];assert.equal(txt(p),'AB');assert.ok(p.inlines.every(n=>n.style.fontSizeHalfPoints===22));assert.equal(p.sourceRange.global.start,0);assert.equal(p.sourceRange.global.end,4);}});
cases.push({name:'inserted mark original merge',bytes:fixture('\bONE\rTWO\r',{mark:true,insert:true}),check(m,api){const p=m.blocks.filter(b=>b.type==='paragraph');assert.equal(p[0].paragraphMark.revisionInserted,true);assert.equal(p[1].sourceRange.global.start,5);const r=api.renderMsDoc(m,{reviewMode:'original'});assert.match(r.html.replace(/<\/?span[^>]*>/g,''),/<p\b[^>]*>(?:(?!<\/p>)[\s\S])*ONE(?:(?!<\/p>)[\s\S])*TWO(?:(?!<\/p>)[\s\S])*<\/p>/);}});
for(const text of ['\bONE\b\b\rTWO\r','\b😀\b\r中é\r'])cases.push({name:'cursor consecutive tail '+JSON.stringify(text),bytes:fixture(text),check(m){const p=m.blocks.filter(b=>b.type==='paragraph');assert.equal(txt(p[0]),text.split('\r')[0].replaceAll('\b',''));assert.equal(txt(p[1]),text.split('\r')[1]);assert.equal(p[1].sourceRange.global.start,text.indexOf('\r')+1);for(const b of p.slice(0,2))for(const n of b.inlines)assert.equal(n.style.fontSizeHalfPoints,22);}});

for (const c of cases) test(c.name, () => c.check(current.parseMsDoc(c.bytes), current));
