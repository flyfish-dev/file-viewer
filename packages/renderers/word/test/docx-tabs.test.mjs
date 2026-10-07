import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import { layoutDocxExplicitTabs } from '../dist/docxTabs.js'

function fixture({ scale = 1, align = 'right', pos = '300pt', extra = '', contentWidth = 80, current = 120, visible = true } = {}) {
  const dom = new JSDOM(`<div id="root"><p style="width:600px;padding:0 12px;border:2px solid;box-sizing:content-box;${extra}"><span>Left</span><span data-docx-tab="true" data-docx-tab-align="${align}" data-docx-tab-leader="none" data-docx-tab-pos="${pos}">&nbsp;</span><span>Right</span></p></div>`)
  const { document } = dom.window, root = document.querySelector('#root'), p = root.querySelector('p'), tab = p.querySelector('[data-docx-tab]')
  p.getBoundingClientRect = () => ({ left:20, width:visible ? 628*scale : 0, top:0, bottom:20*scale })
  tab.getBoundingClientRect = () => ({ left:20+(14+current)*scale, top:0, bottom:20*scale })
  const create = document.createRange.bind(document)
  document.createRange = () => { const range = create(); range.getClientRects = () => [{left:20+(14+current)*scale,right:20+(14+current+contentWidth)*scale,top:0,bottom:20*scale,width:contentWidth*scale}]; return range }
  return { dom, root, p, tab }
}

for (const scale of [.5,1,2]) for (const [align, width] of [['right',200],['center',240],['left',280]]) {
  test(`explicit ${align} tabs use unscaled content-origin coordinates at ${scale}`, () => {
    const f=fixture({scale,align})
    try { assert.equal(layoutDocxExplicitTabs(f.root),1);assert.equal(parseFloat(f.tab.style.width),width);assert.equal(f.tab.style.minWidth,'0px');assert.equal(f.tab.textContent,'\u00a0') }
    finally { f.dom.window.close() }
  })
}
test('tab remeasurement is idempotent and preserves markup/content', () => {
  const f=fixture()
  try { const text=f.root.textContent;for(let n=0;n<50;n++){assert.equal(layoutDocxExplicitTabs(f.root),1);assert.equal(parseFloat(f.tab.style.width),200)}assert.equal(f.root.textContent,text) }
  finally { f.dom.window.close() }
})
test('past stops clamp to zero; empty segments and point units remain valid', () => {
  for(const options of [{pos:'10pt',expected:0},{pos:'3in',contentWidth:0,expected:168},{pos:'30pc',expected:280},{pos:'4.0e2px',expected:null}]){
    const f=fixture(options)
    try { assert.equal(layoutDocxExplicitTabs(f.root),options.expected===null?0:1);assert.equal(options.expected===null?null:parseFloat(f.tab.style.width),options.expected) }
    finally { f.dom.window.close() }
  }
})
test('hidden, RTL, vertical, aligned paragraphs, decimal and malformed tabs are not guessed', () => {
  for(const opts of [{visible:false},{extra:'direction:rtl'},{extra:'writing-mode:vertical-rl'},{extra:'text-align:center'},{extra:'text-align:right'},{align:'decimal'},{pos:'Infinitypt'},{pos:'90%'},{pos:'calc(2px)'}]){
    const f=fixture(opts)
    try { f.tab.style.width='19px';assert.equal(layoutDocxExplicitTabs(f.root),0);assert.equal(f.tab.style.width,'19px') }
    finally { f.dom.window.close() }
  }
})
test('leader and TOC tabs remain owned by the existing layout',()=>{
  const f=fixture()
  try{f.tab.dataset.docxTabLeader='dot';assert.equal(layoutDocxExplicitTabs(f.root),0);f.tab.dataset.docxTabLeader='none';f.p.className='docx-toc-paragraph';assert.equal(layoutDocxExplicitTabs(f.root),0)}
  finally{f.dom.window.close()}
})
