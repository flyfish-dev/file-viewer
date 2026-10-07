import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {parseLrc, parseLrcTimestamp, formatLrcTimestamp} from '../dist/lrcParser.js';

test('LRC timestamps accept 1/2/3-digit fractions and colon milliseconds', () => {
  assert.deepEqual(['01:02.1','01:02.12','01:02.123','01:02:123','01:02','-00:01.2'].map(parseLrcTimestamp),[62100,62120,62123,62123,62000,-1200]);
  for(const s of ['01:60','00:1','1.2','00:00.1234','Infinity','000000000:00']) assert.equal(parseLrcTimestamp(s),null);
  assert.equal(formatLrcTimestamp(-120),' -00:00.120'.trim());
});
test('preserves source, metadata, blank and untimed lines', () => {
  const source='\ufeff[ti:Neutral test]\r\n\r\nuntimed\r\n[00:00.0]';
  const m=parseLrc(source);assert.equal(m.source,source);assert.deepEqual(m.metadata,[{key:'ti',value:'Neutral test'}]);assert.equal(m.cues.length,3);assert.equal(m.cues[0].text,'');assert.equal(m.cues[1].timeMs,null);assert.equal(m.cues[2].text,'');
});
test('multiple line stamps shift repeated inline words without collapsing spaces', () => {
  const m=parseLrc('[00:01.00][01:01.00]<00:01.00> A <00:01.50>B');
  assert.deepEqual(m.cues.map(x=>x.timeMs),[1000,61000]);assert.equal(m.cues[0].text,' A B');assert.deepEqual(m.cues[1].words.map(x=>x.timeMs),[61000,61500]);
});
test('offset is applied once to line and inline word clocks', () => {
  for(const offset of [120,-120]) {
    const m=parseLrc(`[00:01.00]<00:01.25>word\n[offset:${offset}]`);
    assert.equal(m.cues[0].timeMs,1000-offset);assert.equal(m.cues[0].words[0].timeMs,1250-offset);
  }
  assert.equal(parseLrc('[offset:99999999999999999]\n[00:00]a').offsetMs,0);
});
test('role inheritance does not attach roles to untimed text', () => {
  const m=parseLrc('[00:01]M:a\n[00:02]b\n\n[00:03]F:c\n[00:04]d\n[00:05]D:e');
  assert.deepEqual(m.cues.map(x=>x.role),['M','M',null,'F','F','D']);
});
test('invalid timestamps and markup remain literal source text', () => {
  const m=parseLrc('[99:99]bad\n[00:01]<not-a-timestamp><script>alert(1)</script>');
  assert.equal(m.cues[0].text,'[99:99]bad');assert.equal(m.cues[1].text,'<not-a-timestamp><script>alert(1)</script>');
});
test('expansion and input bounds fail rather than silently drop content', () => {
  assert.throws(()=>parseLrc('x'.repeat(2000001)),RangeError);
  assert.throws(()=>parseLrc('[00:01]'.repeat(10001)),RangeError);
  assert.throws(()=>parseLrc('\n'.repeat(10001)),RangeError);
});
test('LRC canonical catalog, runtime routing and capability manifest agree', async () => {
  const {DEFAULT_RENDERER_DEFINITIONS}=await import('@file-viewer/core');
  const catalog=JSON.parse(await readFile(new URL('../../../../ecosystem/format-catalog.json',import.meta.url)));
  const manifest=JSON.parse(await readFile(new URL('../file-viewer.capability.json',import.meta.url)));
  assert.ok(catalog.renderers.find(x=>x.id==='code').extensions.includes('lrc'));
  assert.ok(DEFAULT_RENDERER_DEFINITIONS.find(x=>x.id==='code').extensions.includes('lrc'));
  assert.ok(manifest.formats.includes('lrc'));
});
