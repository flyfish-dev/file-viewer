import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import { limitXmlWasmMemory } from '../dist/xmlWasmMemory.js'

const require = createRequire(import.meta.url)
test('the pinned libxslt WASM factory really has a VM-enforced 64 MiB ceiling', async () => {
  const source = await readFile(require.resolve('xslt-polyfill/dist/xslt-wasm.js'), 'utf8')
  const context = vm.createContext({
    console, TextEncoder, TextDecoder, setTimeout, clearTimeout,
    WebAssembly: {
      ...WebAssembly,
      Instance: WebAssembly.Instance, RuntimeError: WebAssembly.RuntimeError,
      Module: class extends WebAssembly.Module {
        constructor(bytes) { super(limitXmlWasmMemory(bytes)) }
      }
    }
  })
  vm.runInContext(source, context)
  const engine = await context.createXSLTTransformModule()
  assert.equal(typeof engine._transform, 'function')
  const currentPages = engine.wasmMemory.buffer.byteLength / 65536
  assert.throws(() => engine.wasmMemory.grow(1025 - currentPages), RangeError)
  assert.equal(engine.wasmMemory.buffer.byteLength, currentPages * 65536)
  const pointer = engine._malloc(1024)
  assert.ok(pointer)
  engine._free(pointer)
})

// Execute the compiled worker bootstrap with the real locked WASM factory,
// including recoverable upstream failures that still return nonzero output.
async function transformInWorker(resource, withWindow = false) {
  const [source, workerSource, xml] = await Promise.all([
    readFile(require.resolve('xslt-polyfill/dist/xslt-wasm.js'), 'utf8'),
    readFile(new URL('../dist/xmlEngines.js', import.meta.url), 'utf8'),
    readFile(new URL('./fixtures/issue-305/invoice-valid.xml', import.meta.url), 'utf8')
  ])
  const parsed = ts.createSourceFile('xmlEngines.js', workerSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  const bootstrap = parsed.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === 'runXsltWorker')
  assert.ok(bootstrap, 'the actual compiled worker bootstrap must be exercised')
  let networkCalls = 0
  let resolveResult
  const result = new Promise(resolve => { resolveResult = resolve })
  const context = vm.createContext({
    console: { log() {}, debug() {}, warn() {}, error() {} },
    URL, TextEncoder, TextDecoder, setTimeout, clearTimeout,
    WebAssembly: Object.create(WebAssembly),
    fetch: async () => { networkCalls++; throw new Error('Network must remain blocked') },
    __fileViewerLimitXmlWasmMemory: limitXmlWasmMemory,
    postMessage: resolveResult,
    ...(withWindow ? { window: { location: new URL('https://blocked.test/') } } : {})
  })
  vm.runInContext(source, context)
  vm.runInContext(`(${bootstrap.getText(parsed)})();`, context)
  await context.onmessage({ data: { xml, resource, maxOutputBytes: 1024 * 1024 } })
  return { result: await result, networkCalls }
}

test('the real XSLT worker accepts successful HTML output', async () => {
  const stylesheet = await readFile(new URL('./fixtures/issue-305/invoice.xsl', import.meta.url), 'utf8')
  const { result, networkCalls } = await transformInWorker(stylesheet)
  assert.equal(result.error, undefined)
  assert.match(result.html, /Invoice INV-1001/)
  assert.equal(networkCalls, 0)
})

for (const withWindow of [false, true]) {
  test(`the real XSLT worker rejects dynamic reads ${withWindow ? 'at the fetch guard' : 'before fetch is reached'}`, async () => {
    const stylesheet = `<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:dyn="http://exslt.org/dynamic"><xsl:output method="html"/><xsl:template match="/"><p><xsl:value-of select="dyn:evaluate(concat('docu','ment(&quot;https://blocked.test/secret&quot;)'))"/></p></xsl:template></xsl:stylesheet>`
    const { result, networkCalls } = await transformInWorker(stylesheet, withWindow)
    assert.equal(result.html, undefined, 'partial HTML must never be accepted after a resource-loader error')
    assert.match(result.error, withWindow ? /blocked external resource/ : /reported an error/)
    assert.equal(networkCalls, 0)
  })
}

test('the real XSLT worker rejects recoverable evaluation errors', async () => {
  const stylesheet = `<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:output method="html"/><xsl:template match="/"><p><xsl:value-of select="unavailable-function()"/></p></xsl:template></xsl:stylesheet>`
  const { result, networkCalls } = await transformInWorker(stylesheet)
  assert.equal(result.html, undefined)
  assert.equal(typeof result.error, 'string')
  assert.equal(networkCalls, 0)
})
