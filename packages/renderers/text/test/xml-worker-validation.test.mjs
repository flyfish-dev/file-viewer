import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const source = readFileSync(new URL('../src/xmlEngines.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
}).outputText
const bootstrap = compiled.slice(compiled.indexOf('function runXsdWorker()'), compiled.indexOf('async function runWorker('))

async function run(wasm) {
  const messages = []
  let initializations = 0
  const scope = {
    WebAssembly,
    Error,
    postMessage: (message) => messages.push(message),
    Module: async (options) => { initializations++; options.onExit(0) }
  }
  runInNewContext(`${bootstrap};runXsdWorker()`, scope)
  await scope.onmessage({ data: { xml: '<root/>', resource: '<schema/>', wasm } })
  return { messages, initializations }
}

for (const [name, wasm] of [
  ['missing', undefined],
  ['HTML response', new TextEncoder().encode('<!doctype html>Missing asset')],
  ['truncated WASM', new Uint8Array([0, 97, 115, 109, 1])]
]) {
  test(`XML Schema rejects ${name} bytes before starting the module factory`, async () => {
    const result = await run(wasm)
    assert.equal(result.initializations, 0)
    assert.equal(result.messages.length, 1)
    assert.equal(result.messages[0].error, 'Invalid XML Schema WASM binary.')
  })
}

test('XML Schema structural validation preserves initialization for valid WASM', async () => {
  const result = await run(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]))
  assert.equal(result.initializations, 1)
  assert.equal(result.messages.length, 1)
  assert.equal(result.messages[0].valid, true)
})
