import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const repoRoot = path.resolve(import.meta.dirname, '..')
const tempDir = await mkdtemp(path.join(tmpdir(), 'pptxjs-github-176-'))
const bundlePath = path.join(tempDir, 'vendor.mjs')

function connectorNode(adjustments = {}) {
  const guides = Object.entries(adjustments).map(([ name, value ]) => ({
    attrs: { name, fmla: `val ${value}` }
  }))
  return {
    'p:spPr': {
      'a:prstGeom': {
        'a:avLst': guides.length ? { 'a:gd': guides } : {}
      }
    }
  }
}

try {
  await build({
    entryPoints: [ path.join(repoRoot, 'src/engine/support/vendor.js') ],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: bundlePath,
    logLevel: 'silent'
  })

  globalThis.self = { postMessage() {} }
  const {
    getBentConnectorPoints,
    getConnectorViewportStyle
  } = await import(`${pathToFileURL(bundlePath).href}?run=${Date.now()}`)

  assert.deepEqual(
    getBentConnectorPoints('bentConnector2', connectorNode(), 200, 100),
    [ [ 0, 0 ], [ 200, 0 ], [ 200, 100 ] ]
  )
  assert.deepEqual(
    getBentConnectorPoints('bentConnector3', connectorNode(), 200, 100),
    [ [ 0, 0 ], [ 100, 0 ], [ 100, 100 ], [ 200, 100 ] ]
  )
  assert.deepEqual(
    getBentConnectorPoints('bentConnector3', connectorNode({ adj1: 0 }), 460, 78),
    [ [ 0, 0 ], [ 0, 78 ], [ 460, 78 ] ]
  )
  assert.deepEqual(
    getBentConnectorPoints('bentConnector4', connectorNode({ adj1: 0, adj2: 50000 }), 290, 160),
    [ [ 0, 0 ], [ 0, 80 ], [ 290, 80 ], [ 290, 160 ] ]
  )
  assert.deepEqual(
    getBentConnectorPoints(
      'bentConnector5',
      connectorNode({ adj1: -25000, adj2: 125000, adj3: 75000 }),
      200,
      100
    ),
    [ [ 0, 0 ], [ -50, 0 ], [ -50, 125 ], [ 150, 125 ], [ 150, 100 ], [ 200, 100 ] ]
  )

  const verticalStyle = getConnectorViewportStyle('straightConnector1', 0, 160)
  assert.match(verticalStyle, /min-width:1px/)
  assert.match(verticalStyle, /min-height:1px/)
  assert.match(verticalStyle, /overflow:visible/)
  assert.match(verticalStyle, /transform-origin:0px 80px/)
  assert.equal(getConnectorViewportStyle('rect', 200, 100), '')

  console.log('[pptx] GitHub #176 connector geometry and zero-extent viewport checks passed.')
} finally {
  await rm(tempDir, { recursive: true, force: true })
}
