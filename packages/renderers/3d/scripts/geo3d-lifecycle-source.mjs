import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

// Extract the actual lifecycle declarations without depending on formatting.
// Tests execute these declarations, including reentrant host cleanup callbacks.
export async function readRuntimeLifecycleSource(includeAbort = false) {
  const source = await readFile(new URL('../src/geo3dRuntime.ts', import.meta.url), 'utf8')
  const require = createRequire(import.meta.url)
  const ts = require(process.env.GEO3D_TYPESCRIPT_PATH || 'typescript')
  const parsed = ts.createSourceFile('geo3dRuntime.ts', source, ts.ScriptTarget.Latest, true)
  const runtime = parsed.statements.find(
    (statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === 'renderGeo3d'
  )
  const declaration = (name) =>
    runtime?.body?.statements.find(
      (statement) =>
        ts.isVariableStatement(statement) &&
        statement.declarationList.declarations.some(
          (item) => ts.isIdentifier(item.name) && item.name.text === name
        )
    )
  const cleanup = declaration('cleanup')
  const end = includeAbort ? declaration('abort') : cleanup
  assert.ok(cleanup && end && end.end >= cleanup.end, 'Runtime lifecycle declarations must exist')
  return source.slice(cleanup.getStart(parsed), end.end)
}
