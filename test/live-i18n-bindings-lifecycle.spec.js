// @vitest-environment jsdom
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createFileViewerI18nBindings as create } from '../packages/core/src/i18n/bindings';
import { createFileViewerI18n } from '../packages/core/src';

for (const kind of ['text','attr']) {
 const bind=(b,n,v)=>kind==='text'?b.text(n,v):b.attr(n,'title',v);
 const read=n=>kind==='text'?n.textContent:n.getAttribute('title');
 test(`${kind}: initial destroy suppresses commit and subscribe`,()=>{let subs=0;const b=create({subscribe(){subs++}}),n=document.createElement('span');bind(b,n,()=>{b.destroy();return 'stale'});assert.notEqual(read(n),'stale');assert.equal(subs,0)});
 test(`${kind}: immediate destroy/throw releases late handle once`,()=>{let cb,reads=0,releases=0;const error={};const b=create({subscribe(fn){cb=fn;try{fn()}catch(e){assert.equal(e,error)}return ()=>releases++}}),n=document.createElement('span');bind(b,n,()=>{if(++reads===2){b.destroy();throw error}return 'ok'});cb();b.destroy();assert.equal(reads,2);assert.equal(releases,1)});
 test(`${kind}: replacement during value wins`,()=>{const b=create(),n=document.createElement('span');bind(b,n,()=>{bind(b,n,()=> 'new');return 'old'});assert.equal(read(n),'new');b.destroy()});
 test(`${kind}: ordinary update and double release`,()=>{let cb,reads=0,releases=0;const b=create({subscribe(fn){cb=fn;return ()=>{releases++;cb()}}}),n=document.createElement('span');const release=bind(b,n,()=>String(++reads));cb();release();release();cb();assert.equal(reads,2);assert.equal(releases,1)});
}
test('throwing cleanup disposes all and preserves first identity',()=>{let count=0;const first={},second={};const b=create({subscribe(){const e=count++?second:first;return ()=>{throw e}}});b.text(document.createTextNode(''),()=> 'a');b.text(document.createTextNode(''),()=> 'b');assert.throws(()=>b.destroy(),e=>e===first);b.destroy();assert.equal(count,2)});
test('replacement in old cleanup supersedes outer bind',()=>{let b,once=true;const n=document.createTextNode('');b=create({subscribe(){return ()=>{if(once){once=false;b.text(n,()=> 'newest')}}}});b.text(n,()=> 'first');b.text(n,()=> 'outer');assert.equal(n.data,'newest');b.destroy()});
test('protections remain',()=>{const b=create(),n=document.createElement('span');n.append(document.createElement('button'));assert.throws(()=>b.text(n,()=> 'bad'),TypeError);assert.throws(()=>b.attr(n,'src',()=> 'bad'),TypeError)});

const thrown=(fn,expected)=>{let caught=false;try{fn()}catch(e){caught=true;assert.equal(e,expected)}assert.equal(caught,true)};
test('builtin controller drives source helper',()=>{const c=createFileViewerI18n({locale:'en-US'}),b=create(c),n=document.createTextNode('');let reads=0; b.text(n,()=>{reads++;return c.t('toolbar.print')});assert.equal(reads,1);c.update({locale:'ja-JP'});assert.equal(reads,2);assert.equal(n.data,c.t('toolbar.print'));b.destroy();c.update({locale:'de-DE'});assert.equal(reads,2);c.destroy()});
for(const first of [{},undefined]) {
 test(`subscribe failure preserves ${first===undefined?'undefined':'object'} and retires callback`,()=>{let cb,reads=0;const b=create({subscribe(fn){cb=fn;throw first}});thrown(()=>b.text(document.createTextNode(''),()=>String(++reads)),first);cb();assert.equal(reads,1);b.destroy()});
 test(`late cleanup failure preserves ${first===undefined?'undefined':'object'} and runs once`,()=>{let cb,count=0;const b=create({subscribe(fn){cb=fn;b.destroy();return ()=>{count++;throw first}}});thrown(()=>b.text(document.createTextNode(''),()=> 'a'),first);cb();b.destroy();assert.equal(count,1)});
 test(`replacement cleanup throws ${first===undefined?'undefined':'object'} without retaining outer slot`,()=>{let count=0;const n=document.createTextNode('');const b=create({subscribe(){return ()=>{count++;throw first}}});b.text(n,()=> 'old');thrown(()=>b.text(n,()=> 'new'),first);assert.equal(n.data,'old');b.destroy();assert.equal(count,1)});
}
test('release root reentry preserves new slot; stale disposer cannot remove it',()=>{const root=document.createElement('span'),n=document.createTextNode('');root.append(n);let once=true,newReads=0;const b=create({subscribe(){return ()=>{if(once){once=false;b.release(root);b.text(n,()=>String(++newReads))}}}});const old=b.text(n,()=> 'old');b.release(root);assert.equal(n.data,'1');old();b.release(root);assert.equal(newReads,1);b.destroy()});
test('destroy reentry cannot establish replacement or read value',()=>{const n=document.createTextNode('');let reads=0;const b=create({subscribe(){return ()=>{b.destroy();b.release(n);b.text(n,()=>{reads++;return 'bad'})}}});b.text(n,()=> 'old');b.destroy();assert.equal(reads,0);assert.equal(n.data,'old')});
test('all throwing releases attempted including undefined first error',()=>{let count=0,sub=0;const b=create({subscribe(){const i=sub++;return ()=>{count++;throw i?{}:undefined}}});b.text(document.createTextNode(''),()=> 'a');b.text(document.createTextNode(''),()=> 'b');thrown(()=>b.destroy(),undefined);assert.equal(count,2);b.destroy()});
test('subscribe callback destroys then provider throws: first subscribe error identity',()=>{let cb,reads=0;const error={};const b=create({subscribe(fn){cb=fn;fn();throw error}});thrown(()=>b.text(document.createTextNode(''),()=>{if(++reads===2)b.destroy();return 'a'}),error);cb();assert.equal(reads,2)});
