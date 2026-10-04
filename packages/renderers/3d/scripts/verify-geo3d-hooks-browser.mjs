// Both suites are reached through the concurrent runner in the workspace and
// the isolated installed-tarball consumer. A failure prevents acceptance.
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { engineFile } from './geo3d-browser-package.mjs'

// Diagnose the exact installed engine rather than inferring implementation
// details from online documentation that can describe a different release.
for (const [path, pattern] of [
  ['entities/PointCloud.js', /get pointBudget|set pointBudget|updateDecimation\(|getActiveAttributes\(|getAttributeClassifications\(|getAttributeColorMap\(|setActiveAttribute\(/],
  ['controls/FirstPersonControls.js', /onMouseDown|onMouseMove|onPointerDown|onPointerMove|mousedown|pointerdown/],
]) {
  const source = await readFile(engineFile(path), 'utf8'), lines = source.split('\n')
  const excerpts = []
  for (let index = 0; index < lines.length; index++) {
    if (pattern.test(lines[index])) excerpts.push({ line: index + 1, source: lines.slice(Math.max(0, index - 2), index + 24).join('\n') })
  }
  console.log('GEO3D_PUBLIC_ENGINE_SOURCE', JSON.stringify({ path, sha256: createHash('sha256').update(source).digest('hex'), excerpts }))
}
await import('./verify-geo3d-hooks-browser-cases.mjs')
await import('./verify-geo3d-advanced-browser.mjs')
await import('./verify-geo3d-residual-browser.mjs')
