import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {preserveGridInlineMetrics} from '../../scripts/lib/docx-grid-metrics.mjs';
const {JSDOM}=createRequire(new URL('../../packages/renderers/word/package.json',import.meta.url))('jsdom');
const fixture=html=>new JSDOM(`<p id="p">${html}</p>`).window.document.getElementById('p');
test('grid inline metrics use the font engine for ordinary, subscript and superscript runs',()=>{
 const p=fixture('<span>A<sub>j</sub><sup>2</sup><a>link</a></span>');const text=p.textContent;
 preserveGridInlineMetrics(p);for(const e of p.querySelectorAll('span,sub,sup,a'))assert.equal(e.style.lineHeight,'normal');assert.equal(p.textContent,text);
});
test('authored inline line heights and their descendant inheritance remain intact',()=>{
 const p=fixture('<span style="line-height:8pt"><sub>x</sub></span>');const before=p.innerHTML;preserveGridInlineMetrics(p);assert.equal(p.innerHTML,before);
});
test('independent text boxes, tabs, positioned shapes and hidden runs are not touched',()=>{
 const p=fixture('<span style="display:inline-block"><span>tab</span></span><span style="position:absolute"><sub>a</sub></span><span style="float:left"><span>f</span></span><span style="display:none"><span>h</span></span>');const before=p.innerHTML;preserveGridInlineMetrics(p);assert.equal(p.innerHTML,before);
});
test('drawing namespaces do not receive paragraph text styles',()=>{
 const p=fixture('<svg xmlns="http://www.w3.org/2000/svg"><text>drawing</text><foreignObject><span xmlns="http://www.w3.org/1999/xhtml">independent</span></foreignObject></svg>');const before=p.innerHTML;preserveGridInlineMetrics(p);assert.equal(p.innerHTML,before);
});
test('custom element factories and empty paragraphs remain supported',()=>{
 assert.doesNotThrow(()=>preserveGridInlineMetrics({}));assert.doesNotThrow(()=>preserveGridInlineMetrics({children:[{}]}));const p=fixture('');preserveGridInlineMetrics(p);assert.equal(p.innerHTML,'');
});
test('repeat handling is idempotent and never changes fonts, positions or authored text',()=>{
 const p=fixture('<span style="font-size:22pt;vertical-align:sub"> text  <i>終</i></span>');preserveGridInlineMetrics(p);const before=p.innerHTML;preserveGridInlineMetrics(p);assert.equal(p.innerHTML,before);assert.equal(p.firstElementChild.style.fontSize,'22pt');assert.equal(p.firstElementChild.style.verticalAlign,'sub');assert.equal(p.textContent,' text  終');
});
