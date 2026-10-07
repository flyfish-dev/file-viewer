import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const entry = fileURLToPath(new URL('../test/types/geo3d-consumer.mts', import.meta.url))
const host = { getCanonicalFileName: file => file, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n' }
const failures = []
for (const [name, module, moduleResolution] of [
  ['NodeNext', ts.ModuleKind.NodeNext, ts.ModuleResolutionKind.NodeNext],
  ['Bundler', ts.ModuleKind.ESNext, ts.ModuleResolutionKind.Bundler],
]) {
  const program = ts.createProgram([entry], {
    target: ts.ScriptTarget.ES2022, module, moduleResolution,
    strict: true, noEmit: true, skipLibCheck: true, types: [],
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
  })
  const diagnostics = ts.getPreEmitDiagnostics(program)
  console.log(`Geo3D public declarations (${name}): ${diagnostics.length} diagnostics`)
  if (diagnostics.length) failures.push(`${name}:\n${ts.formatDiagnosticsWithColorAndContext(diagnostics, host)}`)
}
assert.equal(failures.length, 0, failures.join('\n'))
console.log('Geo3D public declarations passed: real Instance, format-narrowed entities, required AbortSignal and rejected unsafe options.')
