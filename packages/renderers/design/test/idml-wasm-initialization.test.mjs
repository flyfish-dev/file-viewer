import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {createRequire} from 'node:module'
import test from 'node:test'
import {IdmlDocumentSession} from '../dist/idmlEngine.js'
import {resolveIdmlSafetyLimits} from '../dist/idmlLimits.js'

test('IDML buffers its runtime, retries HTTP failures and renders without streaming compilation', async t=>{
  const require=createRequire(new URL('../package.json',import.meta.url))
  const wasm=await readFile(require.resolve('@paged-media/introspect-wasm/paged_introspect_wasm_bg.wasm'))
  const document=await readFile(new URL('../../../../apps/viewer-demo/public/example/indesign-layout.idml',import.meta.url))
  const fetch=globalThis.fetch
  const streaming=WebAssembly.instantiateStreaming
  let requests=0,streamingCalls=0
  const url='https://assets.example.test/design/idml.wasm'
  globalThis.fetch=async input=>{
    assert.equal(input,url)
    requests++
    return requests===1?new Response('Temporarily unavailable',{status:503}):new Response(wasm,{headers:{'Content-Type':'application/wasm'}})
  }
  WebAssembly.instantiateStreaming=async()=>{
    streamingCalls++
    throw Error('Simulated compressed-response streaming failure')
  }
  t.after(()=>{globalThis.fetch=fetch;WebAssembly.instantiateStreaming=streaming})
  const limits=resolveIdmlSafetyLimits()
  await assert.rejects(IdmlDocumentSession.open(document,limits,{wasmUrl:url}),error=>error.code==='IDML_WASM_FETCH'&&error.message.includes('503'))
  const session=await IdmlDocumentSession.open(document,limits,{wasmUrl:url})
  try{
    assert.ok(session.opened.tree.pageCount>0)
    const rendered=await session.renderPage(0,72)
    let ink=0
    for(let i=0;i<rendered.rgba.length;i+=4)if(rendered.rgba[i+3]&&Math.min(rendered.rgba[i],rendered.rgba[i+1],rendered.rgba[i+2])<200)ink++
    assert.ok(rendered.width>100&&rendered.height>100&&ink>100,'The actual SDK must produce document pixels')
    assert.equal(requests,2)
    assert.equal(streamingCalls,0)
    await assert.rejects(IdmlDocumentSession.open(document,limits,{wasmUrl:url+'?different'}),error=>error.code==='IDML_WASM_URL_CHANGED')
    assert.equal(requests,2)
    const controller=new AbortController()
    controller.abort()
    await assert.rejects(IdmlDocumentSession.open(document,limits,{wasmUrl:url,signal:controller.signal}),{name:'AbortError'})
  }finally{session.destroy()}
})
