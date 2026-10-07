import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import { correctDocxVmlTextAnchorOrigins } from '../dist/docxAnchors.js'
import { normalizeDocxVmlTextViewports } from '../dist/docxVml.js'

function fixture(scale = 1) {
  const dom = new JSDOM(`<section style="width:600px;box-sizing:border-box"><article style="padding-left:8px;border-left:1px solid"><p data-docx-anchor-context="paragraph" style="position:relative;margin-left:80px;border-left:2px solid"><span><div><svg xmlns="http://www.w3.org/2000/svg" data-docx-float="true" data-docx-anchor-horizontal="text" data-docx-anchor-vertical="text" style="position:absolute;margin-left:24pt;margin-top:6pt;width:100pt;height:30pt" viewBox="0 0 100 30"><g><foreignObject x="0" y="0" width="100" height="30"><div xmlns="http://www.w3.org/1999/xhtml"><span>ABC</span></div></foreignObject></g></svg></div></span></p></article></section>`)
  const { document } = dom.window, section = document.querySelector('section'), story = section.querySelector('article'), p = section.querySelector('p'), svg = section.querySelector('svg'), fo = section.querySelector('foreignObject')
  // Build DOM programmatically: HTML parsing auto-closes p before the div wrapper.
  p.append(svg.parentElement);story.replaceChildren(p)
  const rect=(left,width)=>({left,top:0,width,height:30,right:left+width,bottom:30})
  section.getBoundingClientRect=()=>rect(10,600*scale)
  story.getBoundingClientRect=()=>rect(10,600*scale)
  p.getBoundingClientRect=()=>rect(10+89*scale,400*scale)
  svg.getScreenCTM=()=>({a:scale*4/3,b:0,c:0,d:scale*4/3,e:0,f:0})
  return {dom,section,story,p,svg,fo}
}
const close=f=>f.dom.window.close()
for(const scale of [.5,1,2]) {
  test(`VML text offsets do not include indented CSS static position at ${scale}`,()=>{
    const f=fixture(scale);try{assert.equal(correctDocxVmlTextAnchorOrigins(f.section),1);assert.equal(f.svg.style.left,'calc(-82px)');assert.equal(f.svg.style.top,'0px');assert.equal(f.svg.style.marginLeft,'24pt');assert.equal(f.svg.style.marginTop,'6pt')}finally{close(f)}
  })
  test(`VML foreignObject gets CSS-pixel units without changing its outer extent at ${scale}`,()=>{
    const f=fixture(scale);try{assert.equal(normalizeDocxVmlTextViewports(f.section),1);assert.ok(Math.abs(Number(f.fo.getAttribute('width'))-400/3)<1e-7);assert.match(f.fo.getAttribute('transform'),/0\.750000000000/);assert.equal(f.fo.textContent,'ABC')}finally{close(f)}
  })
}
test('VML origin is recomputed from authored insets without drift',()=>{
  const f=fixture();try{f.svg.style.left='3pt';f.svg.style.top='5pt';for(let i=0;i<30;i++)correctDocxVmlTextAnchorOrigins(f.section);assert.equal(f.svg.style.left,'calc(-78px)');assert.equal(f.svg.style.top,'5pt');f.p.getBoundingClientRect=()=>({left:159,width:400});correctDocxVmlTextAnchorOrigins(f.section);assert.equal(f.svg.style.left,'calc(-138px)')}finally{close(f)}
})
test('VML viewport normalization and export-style cloned viewports are idempotent',()=>{
  const f=fixture();try{normalizeDocxVmlTextViewports(f.section);const attributes=f.fo.outerHTML;for(let i=0;i<30;i++)normalizeDocxVmlTextViewports(f.section);assert.equal(f.fo.outerHTML,attributes);const clone=f.fo.cloneNode(true);f.fo.replaceWith(clone);assert.equal(normalizeDocxVmlTextViewports(f.section),0);assert.equal(clone.outerHTML,attributes)}finally{close(f)}
})
test('hidden pages defer work without consuming original geometry',()=>{
  const f=fixture();try{f.section.getBoundingClientRect=()=>({width:0});const html=f.svg.outerHTML;assert.equal(correctDocxVmlTextAnchorOrigins(f.section),0);assert.equal(normalizeDocxVmlTextViewports(f.section),0);assert.equal(f.svg.outerHTML,html);f.section.getBoundingClientRect=()=>({width:600});assert.equal(correctDocxVmlTextAnchorOrigins(f.section),1)}finally{close(f)}
})
test('only text-relative axes are changed; explicit opposite insets stay authoritative',()=>{
  for(const mode of ['horizontal','vertical','opposite']){const f=fixture();try{if(mode==='horizontal')f.svg.dataset.docxAnchorVertical='page';else if(mode==='vertical')f.svg.dataset.docxAnchorHorizontal='char';else{f.svg.style.right='1pt';f.svg.style.bottom='2pt'}correctDocxVmlTextAnchorOrigins(f.section);assert.equal(f.svg.style.left,mode==='horizontal'?'calc(-82px)':'');assert.equal(f.svg.style.top,mode==='vertical'?'0px':'')}finally{close(f)}}
})
test('RTL, vertical, percentage and intermediate containing blocks are not guessed',()=>{
  for(const setup of [f=>f.p.style.direction='rtl',f=>f.p.style.writingMode='vertical-rl',f=>f.svg.style.marginLeft='10%',f=>f.svg.parentElement.style.transform='translateX(2px)',f=>f.story.style.contain='layout']){
    const f=fixture();try{setup(f);const html=f.svg.outerHTML;const expect=f.story.style.contain?1:0;assert.equal(correctDocxVmlTextAnchorOrigins(f.section),expect);if(!expect)assert.equal(f.svg.outerHTML,html)}finally{close(f)}
  }
})
test('cell and drawing-subtree policies remain untouched',()=>{
  for(const tag of ['td','div']){const f=fixture();try{const wrapper=f.dom.window.document.createElement(tag);if(tag==='div')wrapper.className='docx-shape-textbox';f.p.replaceWith(wrapper);wrapper.append(f.p);assert.equal(correctDocxVmlTextAnchorOrigins(f.section),0)}finally{close(f)}}
})
test('nested SVG, authored transforms, percentages and singular viewport matrices are not normalized',()=>{
  for(const setup of [f=>f.fo.parentElement.setAttribute('transform','scale(2)'),f=>f.fo.setAttribute('transform','rotate(2)'),f=>f.fo.setAttribute('width','100%'),f=>f.svg.getScreenCTM=()=>({a:0,b:0,c:0,d:0}),f=>f.svg.getScreenCTM=()=>({a:1,b:0,c:.5,d:1})]){
    const f=fixture();try{setup(f);const html=f.fo.outerHTML;assert.equal(normalizeDocxVmlTextViewports(f.section),0);assert.equal(f.fo.outerHTML,html)}finally{close(f)}
  }
})
test('a rotated root retains authored rotation while fixing physical text units',()=>{
  const f=fixture();try{f.svg.getScreenCTM=()=>({a:0,b:4/3,c:-4/3,d:0});assert.equal(normalizeDocxVmlTextViewports(f.section),1);assert.match(f.fo.getAttribute('transform'),/scale\(0\.75/)}finally{close(f)}
})
test('a static anchor paragraph uses the story containing block rather than its CSS static position',()=>{
  const f=fixture();try{
    f.p.style.position='static';f.story.style.position='relative';f.story.style.borderTop='3px solid';f.p.style.borderTop='1px solid'
    f.story.getBoundingClientRect=()=>({left:10,top:20,width:600})
    f.p.getBoundingClientRect=()=>({left:99,top:90,width:400})
    assert.equal(correctDocxVmlTextAnchorOrigins(f.section),1)
    assert.equal(f.svg.style.left,'calc(8px)');assert.equal(f.svg.style.top,'calc(68px)')
  }finally{close(f)}
})
test('column-relative VML origins follow the current column, and nonzero text viewport insets stay aligned',()=>{
  const f=fixture();try{
    f.story.style.columnCount='2';f.story.style.columnGap='20px';Object.defineProperty(f.story,'clientWidth',{value:608})
    f.p.getBoundingClientRect=()=>({left:10+9+310+80,top:0,width:200})
    assert.equal(correctDocxVmlTextAnchorOrigins(f.section),1);assert.equal(f.svg.style.left,'calc(-82px)')
    f.fo.setAttribute('x','6');f.fo.setAttribute('y','3')
    assert.equal(normalizeDocxVmlTextViewports(f.section),1);assert.equal(Number(f.fo.getAttribute('x')),8);assert.equal(Number(f.fo.getAttribute('y')),4)
  }finally{close(f)}
})
