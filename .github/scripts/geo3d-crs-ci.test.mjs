import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('both Geo3D CI entrypoints execute CRS browsers and retain nested evidence', () => {
  for (const file of ['geo3d-focused-validation.yml', 'geo3d-branch-validation.yml']) {
    const source = readFileSync(new URL(`../workflows/${file}`, import.meta.url), 'utf8')
    assert.match(source, /node packages\/renderers\/3d\/scripts\/verify-github-406-browser\.mjs/)
    for (const evidence of ['las-crs/report.json', 'las-crs/*.png', 'las-crs-module-graph.json']) {
      assert.ok(source.includes(`output/geo3d-browser/${evidence}`), `${file} omits ${evidence}`)
    }
  }
})
