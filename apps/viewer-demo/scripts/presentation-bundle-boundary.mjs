import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'

// Shared asset URL constants are not engine imports. Check the production
// module graph together with emitted files, including Vite worker bundles.
export function presentationModuleGraph(fileName = 'pptx-module-graph.json') {
  return {
    name: 'file-viewer-presentation-module-graph',
    generateBundle(_options, bundle) {
      const modules = new Set()
      for (const output of Object.values(bundle)) {
        if (output.type === 'chunk') {
          for (const id of Object.keys(output.modules)) modules.add(id)
        }
      }
      this.emitFile({
        type: 'asset',
        fileName,
        source: JSON.stringify([...modules].sort(), null, 2)
      })
    }
  }
}

export function assertPptxOnlyBundle(outputRecords, expectedWorker) {
  const files = outputRecords.map(({ file }) => file)
  const legacyAssets = files.filter((file) =>
    /(?:ppt-font-cjk|ppt-native|file-viewer-presentation-ppt\b)/i.test(file)
  )
  assert.deepEqual(legacyAssets, [], `PPTX-only build emitted PPT assets: ${legacyAssets}`)
  const workers = outputRecords.filter(({ file }) => /pptx\.worker/i.test(file))
  assert.ok(workers.length > 0, 'PPTX worker was not emitted')
  // Asset tooling copies an already-built parser Worker, so it has no Rollup
  // graph. Prove its identity against the installed PPTX engine instead.
  assert.ok(expectedWorker?.length > 0, 'Installed PPTX worker bytes are required')
  const workerHash = bytes => createHash('sha256').update(bytes).digest('hex')
  for (const { body } of workers) assert.equal(workerHash(body), workerHash(expectedWorker),
    'Emitted PPTX worker differs from the installed PPTX engine')

  const graphs = outputRecords.filter(({ file }) => /pptx(?:-worker)?-module-graph\.json$/.test(file))
  assert.ok(graphs.length > 0, 'PPTX entry module graph was not emitted')
  const modules = graphs.flatMap(({ body }) => JSON.parse(body.toString('utf8')))
  assert.ok(modules.length > 0, 'PPTX production module graph is empty')
  const legacyModules = modules.filter((id) =>
    /\/(?:packages\/renderers\/ppt|renderer-ppt|@file-viewer\/(?:renderer-ppt|ppt))\/|\/@file-viewer\+(?:renderer-ppt|ppt)@/.test(id.replaceAll('\\', '/'))
  )
  assert.deepEqual(legacyModules, [], `PPTX-only build bundled the PPT runtime: ${legacyModules}`)
}
