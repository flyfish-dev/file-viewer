import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileViewerRenderers, resolveFileViewerRendererSelection } from '../dist/index.js'

const root = resolve(import.meta.dirname, '../../../..')
const text = JSON.parse(
  await readFile(resolve(root, 'packages/renderers/text/file-viewer.capability.json'))
)

test('every declared text format selects its owning renderer', () => {
  for (const format of text.formats) {
    const selected = resolveFileViewerRendererSelection(
      { formats: [format], autoPresets: false },
      root
    )
    assert.deepEqual(selected.packages, [text.packageName], format)
  }
})

test('LRC selection normalizes extension punctuation and case', () => {
  for (const format of ['lrc', 'LRC', '.lrc', ' .LrC ']) {
    const selected = resolveFileViewerRendererSelection(
      { formats: [format], autoPresets: false },
      root
    )
    assert.deepEqual(selected.packages, [text.packageName], format)
  }
})

test('Vite pre-bundles the selected preset’s installed capability dependencies', async () => {
  const project = await mkdtemp(resolve(tmpdir(), 'file-viewer-vite-preset-'))
  const preset = '@file-viewer/preset-standard'
  const required = '@file-viewer/capability-required'
  const optional = '@file-viewer/capability-optional'
  const missing = '@file-viewer/capability-missing'
  const other = '@file-viewer/capability-other-preset'
  const presetRoot = resolve(project, 'node_modules', preset)
  const requiredEntry = `${preset} > ${required}`
  const optionalEntry = `${preset} > ${optional}`
  const writePackage = async (base, name, fields = {}) => {
    const path = resolve(base, 'node_modules', name, 'package.json')
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, JSON.stringify({ name, ...fields }))
  }
  try {
    await writePackage(project, preset, {
      dependencies: { [required]: '1.0.0', 'renderer-dependency': '1.0.0' },
      optionalDependencies: { [optional]: '1.0.0', [missing]: '1.0.0' }
    })
    await writePackage(presetRoot, required)
    await writePackage(presetRoot, optional)
    await writePackage(presetRoot, 'renderer-dependency')
    await writePackage(project, '@file-viewer/preset-all', {
      dependencies: { [other]: '1.0.0' }
    })
    await writePackage(resolve(project, 'node_modules/@file-viewer/preset-all'), other)

    const config = fileViewerRenderers({ preset: 'standard' }).config
    const capabilityIncludes = (optimizeDeps) => config({ root: project, optimizeDeps })
      .optimizeDeps.include.filter(id => id.includes('capability-'))
    assert.deepEqual(capabilityIncludes(), [requiredEntry, optionalEntry])

    const manualEntry = `${preset}>${required}`
    assert.deepEqual(
      capabilityIncludes({ include: [manualEntry], exclude: [optional] }),
      [manualEntry]
    )
    assert.deepEqual(capabilityIncludes({ exclude: ['@file-viewer'] }), [])
    assert.deepEqual(capabilityIncludes({ exclude: [' @file-viewer '] }), [requiredEntry, optionalEntry])
    assert.deepEqual(capabilityIncludes({ exclude: [`${preset}>${required}`] }), [optionalEntry])
    assert.deepEqual(capabilityIncludes({ exclude: [`${preset}\t > \t${required}`] }), [optionalEntry])
  } finally {
    await rm(project, { recursive: true, force: true })
  }
})
