import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseMsDoc, renderMsDoc } from '../dist/index.js';
import { buildTextboxRenderPlan, wordTextboxOrigins } from '../dist/render/textbox-layout.js';
import { makeTextboxDoc } from './helpers/textbox-fixture.mjs';

const pageDoc = options => parseMsDoc(makeTextboxDoc({ properties: [[912, 1], [914, 1]], ...options }));
const occurrences = (html, text) => html.split(text).length - 1;
test('original public DOC displays the valid frame at its authored page origin without moving canonical text', () => {
  const bytes = readFileSync(new URL('./fixtures/github-461-floating-textbox.doc', import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '8b872772d353fbea03d92e3c785d8e8249b04e9d4d0df49391ee8bfc83f5aab3');
  const parsed = parseMsDoc(bytes), canonical = structuredClone(parsed);
  const result = renderMsDoc(parsed), plan = buildTextboxRenderPlan(parsed);
  assert.deepEqual(parsed, canonical);
  assert.equal(plan.placements.length, 1);
  const placement = plan.placements[0];
  assert.equal(placement.frame.mapping, 'mapped');
  assert.equal(placement.x, placement.frame.raw.rectTwips.left / 15);
  assert.equal(placement.y, placement.frame.raw.rectTwips.top / 15);
  assert.equal(result.layoutPages.length, 1);
  assert.equal(result.layoutPages[0].width, parsed.textboxLayout.sections[0].pageWidthTwips / 15);
  assert.equal(occurrences(result.html, 'FLOATING BOX CONTROL'), 1);
  assert(result.html.indexOf('FLOATING BOX CONTROL') < result.html.indexOf('MAIN BODY LAST'));
  assert(parsed.warnings.some(row => row.code === 'MSDOC_TEXTBOX_STORY_LINEARIZED'));
  assert(!result.warnings.some(row => row.code === 'MSDOC_TEXTBOX_STORY_LINEARIZED'));
  assert(result.warnings.some(row => row.code === 'MSDOC_TEXTBOX_MAPPING_INVALID' && row.textboxIndex === 0));
  assert(!result.warnings.some(row => row.code === 'MSDOC_TEXTBOX_POSITION_AMBIGUOUS' && row.textboxIndex === placement.frame.textboxIndex));
});

test('independent real CFB fixtures place repeated Unicode instances once, with varied signed coordinates and CPs', () => {
  for (const ids of [[7991], [9007, 6031], [6123, 8257, 4091]]) {
    const parsed = pageDoc({ ids, texts: ids.map(() => 'Independent γ 中文\r') });
    const before = structuredClone(parsed.blocks), result = renderMsDoc(parsed), plan = buildTextboxRenderPlan(parsed);
    assert.equal(plan.placements.length, ids.length);
    assert.equal(occurrences(result.html, 'Independent γ 中文'), ids.length);
    assert.deepEqual(parsed.blocks, before);
    for (const placement of plan.placements) {
      assert.equal(placement.x, placement.frame.raw.rectTwips.left / 15);
      assert.equal(placement.width, (placement.frame.raw.rectTwips.right - placement.frame.raw.rectTwips.left) / 15);
    }
    assert.equal(result.html, result.layoutPages[0].html);
  }
});

test('Word-host relative origins are explicit, override conflicting SPA, and retain raw metadata', () => {
  for (const origin of [0, 1, 2]) {
    const parsed = pageDoc({ properties: [[912, origin], [914, origin]] }), frame = parsed.textboxLayout.frames[0];
    const original = structuredClone(frame);
    assert.deepEqual(wordTextboxOrigins(frame), { horizontal: origin, vertical: origin });
    assert.deepEqual(frame, original);
  }
  const parsed = pageDoc(), frame = parsed.textboxLayout.frames[0];
  frame.raw.drawing.properties = frame.raw.drawing.properties.filter(row => ![912, 914].includes(row.id));
  assert.deepEqual(wordTextboxOrigins(frame), { horizontal: frame.raw.bx, vertical: frame.raw.by });
  frame.raw.drawing.properties.push({ id: 912, value: 4, complex: false, blip: false });
  assert.equal(wordTextboxOrigins(frame), null);
});

test('margin positioning adds the actual asymmetric margins; explicit page positioning does not', () => {
  const page = pageDoc(), margin = pageDoc({ properties: [[912, 0], [914, 0]] });
  const p = buildTextboxRenderPlan(page), m = buildTextboxRenderPlan(margin);
  for (let i = 0; i < p.placements.length; i++) {
    assert(Math.abs(m.placements[i].x - p.placements[i].x - margin.textboxLayout.sections[0].marginsTwips.left / 15) < 1e-10);
    assert(Math.abs(m.placements[i].y - p.placements[i].y - margin.textboxLayout.sections[0].marginsTwips.top / 15) < 1e-10);
  }
});

test('unsupported transform, linked, wrap, missing anchor and unsafe page retain every readable instance', () => {
  const alterations = [
    frame => { frame.mapping = 'invalid'; },
    frame => { delete frame.anchor; },
    frame => { frame.raw.wrap = 2; },
    frame => { frame.chainCount = 2; },
    frame => { frame.raw.drawing.flags |= 0x40; },
    frame => { frame.raw.drawing.parentShapeId = 9012; },
    frame => { frame.anchor.paragraphRange.start += 10; },
    frame => { frame.raw.drawing.properties.find(row => row.id === 4).value = 65536; },
    frame => { frame.raw.drawing.properties.find(row => row.id === 4).complex = true; },
    frame => { frame.raw.drawing.properties.find(row => row.id === 912).value = 9; },
  ];
  for (const alter of alterations) {
    const parsed = pageDoc();
    for (const frame of parsed.textboxLayout.frames) alter(frame);
    const result = renderMsDoc(parsed);
    assert.equal(result.layoutPages, undefined);
    assert.equal(occurrences(result.html, 'Duplicate β 中文'), 2);
    assert(result.warnings.some(row => row.code === 'MSDOC_TEXTBOX_STORY_LINEARIZED'));
  }
});

test('paragraph-relative positioning requires the actual main paragraph and exact CP range', () => {
  const parsed = pageDoc({ properties: [[912, 2], [914, 2]] });
  const paragraph = parsed.blocks.find(block => block.type === 'paragraph' && block.storyKind === 'main');
  for (const frame of parsed.textboxLayout.frames) Object.assign(frame.anchor, {
    globalCp: paragraph.sourceRange.global.start, paragraphRange: { ...paragraph.sourceRange.global }, paragraphBlockId: paragraph.id,
  });
  assert.equal(buildTextboxRenderPlan(parsed).placements.length, 2);
  const valid = structuredClone(parsed);
  for (const alter of [
    frame => { frame.anchor.paragraphBlockId = frame.contentBlockIds[0]; },
    frame => { frame.anchor.globalCp = frame.anchor.paragraphRange.end; },
    frame => { frame.anchor.paragraphRange.end += 1; },
  ]) {
    const copy = structuredClone(valid); copy.textboxLayout.frames.forEach(alter);
    assert.equal(buildTextboxRenderPlan(copy), null);
    assert.equal(occurrences(renderMsDoc(copy).html, 'Duplicate β 中文'), 2);
  }
  const paged = structuredClone(valid);
  paged.blocks.find(block => block.id === paragraph.id).paraState.pageBreakBefore = true;
  assert.equal(buildTextboxRenderPlan(paged), null);
});

test('partial placement keeps the unowned frame readable and preserves the partial-layout diagnostic', () => {
  const parsed = pageDoc();
  parsed.textboxLayout.frames[1].mapping = 'invalid';
  const result = renderMsDoc(parsed);
  assert.equal(occurrences(result.html, 'Duplicate β 中文'), 2);
  assert.equal(occurrences(result.html, 'data-msdoc-textbox='), 1);
  assert(result.warnings.some(row => row.code === 'MSDOC_TEXTBOX_STORY_LINEARIZED'));
  const fallback = parsed.blocks.find(block => block.id === parsed.textboxLayout.frames[1].contentBlockIds[0]);
  const table = { type: 'table', id: 'independent-fallback-table', depth: 1, rows: [{ cells: [{ paragraphs: [fallback] }] }] };
  parsed.blocks[parsed.blocks.indexOf(fallback)] = table;
  parsed.textboxLayout.frames[1].contentBlockIds = [table.id];
  const nested = renderMsDoc(parsed);
  assert.equal(occurrences(nested.html, 'Duplicate β 中文'), 2);
  assert(nested.warnings.some(row => row.code === 'MSDOC_TEXTBOX_STORY_LINEARIZED'));
});

test('duplicate ownership, missing content or missing authored geometry never hides textbox text', () => {
  const mutations = [
    model => { model.textboxLayout.frames[1].contentBlockIds = model.textboxLayout.frames[0].contentBlockIds; },
    model => { for (const frame of model.textboxLayout.frames) frame.contentBlockIds.push('not-a-real-block'); },
    model => { delete model.textboxLayout.sections[0].pageWidthTwips; },
    model => { model.textboxLayout.sections[0].budgetExceeded = 'sprms'; },
    model => { Object.assign(model.textboxLayout.sections[0], { columnsMinusOne: 1, columnSpaceTwips: model.textboxLayout.sections[0].pageWidthTwips }); },
  ];
  for (const mutate of mutations) {
    const parsed = pageDoc(); mutate(parsed);
    assert.equal(occurrences(renderMsDoc(parsed).html, 'Duplicate β 中文'), 2);
  }
});

test('render-only box formatting binds true dimensions, EMU insets and frame layer without clipping text', () => {
  const parsed = pageDoc({ properties: [[912, 1], [914, 1], [129, 38100], [130, 28575], [131, 19050], [132, 9525]] });
  const frame = parsed.textboxLayout.frames[0]; frame.raw.belowText = true;
  const plan = buildTextboxRenderPlan(parsed), html = renderMsDoc(parsed).html;
  assert.deepEqual(plan.placements[0].insets, { left: 4, top: 3, right: 2, bottom: 1 });
  assert.match(html, /padding:3px 2px 1px 4px/);
  assert.match(html, /data-msdoc-origin="page"/);
  assert.doesNotMatch(html, /overflow:hidden|text-overflow:ellipsis/);
  assert.equal(plan.placements[0].belowText, true);
});

test('reviewed main-story paragraph merges retain their existing readable flow instead of guessing anchor geometry', () => {
  const parsed = pageDoc(), main = parsed.blocks.filter(block => block.type === 'paragraph' && block.storyKind === 'main');
  main[0].paragraphMark = { revisionDeleted: true };
  const result = renderMsDoc(parsed, { reviewMode: 'final' });
  assert.equal(result.layoutPages, undefined);
  assert.equal(occurrences(result.html, 'Duplicate β 中文'), 2);
  assert.match(result.html, /Main 583.*Last 694<\/span><\/p>/);
  assert(result.warnings.some(w => w.code === 'MSDOC_TEXTBOX_STORY_LINEARIZED'));
  assert.equal(renderMsDoc(parsed, { reviewMode: 'all' }).layoutPages.length, 1);
});
