import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import { normalizeDocxMergedCellBorders } from '../dist/docxMergedBorders.js'
const cell = (style='', attrs='', text='') => `<td ${attrs} style="${style}">${text}</td>`
function run(rows, fn) {
 const dom=new JSDOM(`<div id="root"><table>${rows.map(r=>'<tr>'+r+'</tr>').join('')}</table></div>`)
 try { const root=dom.window.document.querySelector('#root');fn(root,root.querySelector('table')) } finally {dom.window.close()}
}
test('the last continuation, not an intermediate edge, owns the visible bottom',()=>run([
 cell('border-bottom:none;border-top:2pt solid red','rowspan="3"','A')+cell('','','B'),
 cell('display:none;border-bottom:4pt double green')+cell(),
 cell('display:none;border-bottom:0.5pt solid black')+cell()
],(root,t)=>{const original=t.textContent;assert.equal(normalizeDocxMergedCellBorders(root),1);assert.equal(t.rows[0].cells[0].style.borderBottom,'0.5pt solid black');assert.equal(t.rows[0].cells[0].style.borderTop,'2pt solid red');assert.equal(t.textContent,original);assert.equal(t.rows[0].cells[0].rowSpan,3)}))
test('logical grid positions include hidden placeholders and colSpan',()=>run([
 cell('border-bottom:none','rowspan="2" colspan="2"')+cell('border-bottom:none','rowspan="2"'),
 cell('display:none;border-bottom:1pt solid red','colspan="2"')+cell('display:none;border-bottom:2pt solid blue')
],(root,t)=>{assert.equal(normalizeDocxMergedCellBorders(root),2);assert.equal(t.rows[0].cells[0].style.borderBottom,'1pt solid red');assert.equal(t.rows[0].cells[1].style.borderBottom,'2pt solid blue')}))
test('a final explicit nil/none edge is preserved, not replaced by a top-cell edge',()=>run([cell('border:1pt solid red','rowspan="2"'),cell('display:none;border-bottom:none')],(root,t)=>{assert.equal(normalizeDocxMergedCellBorders(root),1);assert.equal(t.rows[0].cells[0].style.borderBottomStyle,'none');assert.equal(t.rows[0].cells[0].style.borderLeft,'1pt solid red')}))
test('missing bottom declarations are not guessed',()=>run([cell('border-bottom:2px solid red','rowspan="2"'),cell('display:none')],(root,t)=>{assert.equal(normalizeDocxMergedCellBorders(root),0);assert.equal(t.rows[0].cells[0].style.borderBottom,'2px solid red')}))
test('normal HTML rowspan without continuation placeholders is left unchanged',()=>run([cell('border-bottom:none','rowspan="2"')+cell(),cell('border-bottom:9px solid blue')],root=>assert.equal(normalizeDocxMergedCellBorders(root),0)))
test('mismatched continuation grid widths cannot steal a neighboring edge',()=>run([cell('border-bottom:none','rowspan="2" colspan="2"'),cell('display:none;border-bottom:1pt solid red')+cell('display:none;border-bottom:1pt solid blue')],root=>assert.equal(normalizeDocxMergedCellBorders(root),0)))
test('a missing intermediate continuation invalidates the whole chain',()=>run([cell('border-bottom:none','rowspan="3"'),cell('display:none','colspan="2"'),cell('display:none;border-bottom:1px solid red')],root=>assert.equal(normalizeDocxMergedCellBorders(root),0)))
test('out-of-range and rowspan zero remain untouched',()=>{for(const n of ['3','0'])run([cell('border-bottom:none',`rowspan="${n}"`),cell('display:none;border-bottom:1pt solid')],root=>assert.equal(normalizeDocxMergedCellBorders(root),0))})
test('independent row groups and hidden rows are not traversed as merges',()=>run([cell('border-bottom:none','rowspan="2"'),cell('display:none;border-bottom:1pt solid')],(root,t)=>{t.rows[1].style.display='none';assert.equal(normalizeDocxMergedCellBorders(root),0);t.rows[1].style.display='';const group=root.ownerDocument.createElement('tbody');group.append(t.rows[1]);t.append(group);assert.equal(normalizeDocxMergedCellBorders(root),0)}))
test('nested tables are handled independently without consuming the outer grid',()=>run([cell('', '', '<table><tr>'+cell('border-bottom:none','rowspan="2"')+'</tr><tr>'+cell('display:none;border-bottom:1pt solid blue')+'</tr></table>')],(root,t)=>{assert.equal(normalizeDocxMergedCellBorders(root),1);assert.equal(t.rows.length,1);assert.equal(t.rows[0].cells[0].style.borderBottom,'')}))
test('repeat normalization and export clones preserve units, priority and content',()=>run([cell('border-bottom:none','rowspan="2"','content'),cell('display:none;border-bottom:0.5pt dashed blue!important')],(root,t)=>{assert.equal(normalizeDocxMergedCellBorders(t),1);const before=root.innerHTML;assert.equal(normalizeDocxMergedCellBorders(root),0);assert.equal(root.innerHTML,before);assert.equal(t.rows[0].cells[0].style.getPropertyPriority('border-bottom'),'important');const clone=root.cloneNode(true);assert.equal(normalizeDocxMergedCellBorders(clone),0);assert.equal(clone.innerHTML,before)}))
