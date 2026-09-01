import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  applyFileViewerSelectionCommand,
  createFileViewerCapabilitySelection,
  finalizeFileViewerCapabilitySelection,
  listFileViewerCapabilitySelectionRows,
  promptFileViewerCapabilitySelection,
  renderFileViewerSelectionGroup,
} from '../dist/interactive-selection.js'

const capability = (id, packageName, formats = [], options = {}) => ({
  id,
  packageName,
  version: '3.0.0',
  rendererIds: [id],
  formats,
  assets: {},
  license: { spdx: 'Apache-2.0', policy: options.policy ?? 'permissive' },
  weight: options.weight ?? 'light',
  profiles: [],
})

const catalog = {
  profiles: [
    {
      id: 'standard',
      packageName: '@file-viewer/preset-standard',
      version: '3.0.0',
      capabilityPackages: ['@file-viewer/renderer-pdf'],
    },
  ],
  capabilities: [
    capability('pdf', '@file-viewer/renderer-pdf', ['pdf']),
    capability('cad', '@file-viewer/renderer-cad', ['dwg', 'dxf', 'dwf'], { weight: 'heavy' }),
    capability('archive', '@file-viewer/renderer-archive', ['zip', 'rar', '7z']),
    capability('digital-signature', '@file-viewer/renderer-signature', [], {
      weight: 'heavy',
      policy: 'review-required',
    }),
  ],
  legacyFull: { excludedFutureCapabilities: ['digital-signature'] },
}

test('preselects profile capabilities and keeps them locked', () => {
  const state = createFileViewerCapabilitySelection({
    catalog,
    profile: 'standard',
    formats: ['.dxf'],
  })
  const rows = listFileViewerCapabilitySelectionRows(state, 'formats')
  assert.deepEqual(
    rows.map(({ capability: item, selected, locked }) => [item.id, selected, locked]),
    [
      ['pdf', true, true],
      ['cad', true, false],
      ['archive', false, false],
    ]
  )
  assert.match(renderFileViewerSelectionGroup(state, 'formats', 'en'), /\[✓\].*PDF.*\.pdf.*profile/)
  assert.match(renderFileViewerSelectionGroup(state, 'formats', 'en'), /\[x\].*CAD.*\.dwg.*\.dxf/)
})

test('toggles numbers and ranges without disabling profile rows', () => {
  const state = createFileViewerCapabilitySelection({ catalog, profile: 'standard' })
  const result = applyFileViewerSelectionCommand(state, 'formats', '1-3')
  assert.equal(result.action, 'changed')
  assert.equal(result.locked, true)
  assert.deepEqual(finalizeFileViewerCapabilitySelection(state), {
    formats: [],
    capabilities: ['cad', 'archive'],
  })
  assert.equal(applyFileViewerSelectionCommand(state, 'formats', '99').action, 'invalid')
})

test('walks format and extensionless capability pages with checkbox output', async () => {
  const answers = ['2', '', '1', '']
  let output = ''
  const result = await promptFileViewerCapabilitySelection({
    catalog,
    profile: 'standard',
    locale: 'zh-CN',
    question: async () => answers.shift() ?? '',
    write: (value) => {
      output += value
    },
  })
  assert.deepEqual(result, { formats: [], capabilities: ['cad', 'digital-signature'] })
  assert.match(output, /文件格式族/)
  assert.match(output, /无扩展名的可选增强能力/)
  assert.match(output, /\[✓\].*PDF/)
  assert.match(output, /\[x\].*CAD/)
  assert.match(output, /需关注许可证/)
})

test('full profile locks the legacy matrix while leaving future capabilities optional', () => {
  const state = createFileViewerCapabilitySelection({ catalog, profile: 'full' })
  assert.deepEqual(
    listFileViewerCapabilitySelectionRows(state, 'formats').map(({ capability: item, locked }) => [
      item.id,
      locked,
    ]),
    [
      ['pdf', true],
      ['cad', true],
      ['archive', true],
    ]
  )
  assert.equal(listFileViewerCapabilitySelectionRows(state, 'enhancements')[0].locked, false)
})

test('maps the frozen standard profile to preselected catalog rows', async () => {
  const frozenCatalog = JSON.parse(
    await readFile(new URL('../catalog/catalog.json', import.meta.url), 'utf8')
  )
  const state = createFileViewerCapabilitySelection({
    catalog: frozenCatalog,
    profile: 'standard',
  })
  const rows = listFileViewerCapabilitySelectionRows(state, 'formats')
  const inherited = rows.filter((row) => row.locked)
  assert.ok(rows.length > 0)
  assert.ok(inherited.length > 0)
  assert.ok(inherited.every((row) => row.selected))
  assert.match(renderFileViewerSelectionGroup(state, 'formats', 'en'), /\[✓\]/)
})
