import type {
  FileViewerCapabilityCatalogEntry,
  FileViewerCliCatalog,
  FileViewerCliLocale,
  FileViewerProfile,
} from './types.js'

export type FileViewerSelectionGroup = 'formats' | 'enhancements'

type SelectionCopy = {
  formats: string
  enhancements: string
  profile: string
  heavy: string
  review: string
  noFormats: string
  summary: (selected: number, total: number, inherited: number) => string
  prompt: string
  invalid: string
  locked: string
  cancelled: string
}

const selectionCopy: Record<FileViewerCliLocale, SelectionCopy> = {
  en: {
    formats: 'File format families',
    enhancements: 'Optional capabilities without a file extension',
    profile: 'profile',
    heavy: 'heavy',
    review: 'license review',
    noFormats: 'no extension',
    summary: (selected, total, inherited) =>
      `${selected}/${total} enabled; ${inherited} provided by the selected profile`,
    prompt:
      'Toggle numbers/ranges (for example 2,5-7); a=all, n=clear extras, b=back, 0=cancel, Enter=confirm: ',
    invalid: 'Enter listed numbers, ranges, a, n, b, 0, or press Enter.',
    locked: 'Profile-provided capabilities stay enabled; only optional rows were changed.',
    cancelled: 'Cancelled without changes.',
  },
  'zh-CN': {
    formats: '文件格式族',
    enhancements: '无扩展名的可选增强能力',
    profile: '方案内置',
    heavy: '重型',
    review: '需关注许可证',
    noFormats: '无扩展名',
    summary: (selected, total, inherited) =>
      `已启用 ${selected}/${total} 项，其中 ${inherited} 项由当前方案提供`,
    prompt: '输入编号/范围切换（如 2,5-7）；a=全选，n=清空额外项，b=返回，0=取消，回车=确认：',
    invalid: '请输入列表中的编号、范围、a、n、b、0，或直接回车确认。',
    locked: '方案内置能力会保持启用，仅切换了可选项。',
    cancelled: '已取消，未修改文件。',
  },
  'ja-JP': {
    formats: 'ファイル形式ファミリー',
    enhancements: '拡張子を持たないオプション機能',
    profile: 'プロファイル',
    heavy: '重量',
    review: 'ライセンス確認',
    noFormats: '拡張子なし',
    summary: (selected, total, inherited) =>
      `${selected}/${total} 件を有効化（${inherited} 件はプロファイルに含まれます）`,
    prompt:
      '番号/範囲を切替（例: 2,5-7）；a=すべて、n=追加分を解除、b=戻る、0=中止、Enter=確定: ',
    invalid: '表示された番号、範囲、a、n、b、0 を入力するか、Enter で確定してください。',
    locked: 'プロファイルに含まれる機能は有効のままです。オプション項目だけを切り替えました。',
    cancelled: '変更せずにキャンセルしました。',
  },
  'de-DE': {
    formats: 'Dateiformat-Familien',
    enhancements: 'Optionale Funktionen ohne Dateiendung',
    profile: 'Profil',
    heavy: 'umfangreich',
    review: 'Lizenz prüfen',
    noFormats: 'keine Endung',
    summary: (selected, total, inherited) =>
      `${selected}/${total} aktiviert; ${inherited} durch das Profil bereitgestellt`,
    prompt:
      'Nummern/Bereiche umschalten (z. B. 2,5-7); a=alle, n=Extras leeren, b=zurück, 0=abbrechen, Enter=bestätigen: ',
    invalid: 'Geben Sie Nummern, Bereiche, a, n, b oder 0 ein, oder bestätigen Sie mit Enter.',
    locked: 'Profil-Funktionen bleiben aktiviert; nur optionale Einträge wurden geändert.',
    cancelled: 'Ohne Änderungen abgebrochen.',
  },
}

const normalizeTokens = (values: readonly string[]) =>
  [
    ...new Set(
      values
        .flatMap((value) => value.split(','))
        .map((value) => value.trim().toLowerCase().replace(/^\./, ''))
        .filter(Boolean)
    ),
  ]

const capabilityForToken = (token: string, catalog: FileViewerCliCatalog) =>
  catalog.capabilities.find(
    (capability) =>
      capability.id.toLowerCase() === token ||
      capability.formats.some((format) => format.toLowerCase() === token) ||
      capability.rendererIds.some((rendererId) => rendererId.toLowerCase() === token)
  )

const profileCapabilityIds = (profile: FileViewerProfile, catalog: FileViewerCliCatalog) => {
  if (profile === 'custom') return new Set<string>()
  if (profile === 'full') {
    const excluded = new Set(catalog.legacyFull?.excludedFutureCapabilities ?? [])
    return new Set(
      catalog.capabilities
        .filter((capability) => !excluded.has(capability.id))
        .map((capability) => capability.id)
    )
  }
  const selectedProfile = catalog.profiles.find((candidate) => candidate.id === profile)
  const packages = new Set(selectedProfile?.capabilityPackages ?? [])
  return new Set(
    catalog.capabilities
      .filter((capability) => packages.has(capability.packageName))
      .map((capability) => capability.id)
  )
}

export type FileViewerCapabilitySelectionState = {
  catalog: FileViewerCliCatalog
  profile: FileViewerProfile
  selectedCapabilityIds: Set<string>
  inheritedCapabilityIds: Set<string>
  unknownFormats: string[]
  unknownCapabilities: string[]
}

export function createFileViewerCapabilitySelection(input: {
  catalog: FileViewerCliCatalog
  profile: FileViewerProfile
  formats?: readonly string[]
  capabilities?: readonly string[]
}): FileViewerCapabilitySelectionState {
  const formats = normalizeTokens(input.formats ?? [])
  const capabilities = normalizeTokens(input.capabilities ?? [])
  const inheritedCapabilityIds = profileCapabilityIds(input.profile, input.catalog)
  const selectedCapabilityIds = new Set<string>()
  const unknownFormats: string[] = []
  const unknownCapabilities: string[] = []
  for (const token of formats) {
    const capability = capabilityForToken(token, input.catalog)
    if (capability) selectedCapabilityIds.add(capability.id)
    else unknownFormats.push(token)
  }
  for (const token of capabilities) {
    const capability = capabilityForToken(token, input.catalog)
    if (capability) selectedCapabilityIds.add(capability.id)
    else unknownCapabilities.push(token)
  }
  for (const capabilityId of inheritedCapabilityIds) selectedCapabilityIds.delete(capabilityId)
  return {
    catalog: input.catalog,
    profile: input.profile,
    selectedCapabilityIds,
    inheritedCapabilityIds,
    unknownFormats,
    unknownCapabilities,
  }
}

export type FileViewerCapabilitySelectionRow = {
  index: number
  capability: FileViewerCapabilityCatalogEntry
  selected: boolean
  locked: boolean
}

export function listFileViewerCapabilitySelectionRows(
  state: FileViewerCapabilitySelectionState,
  group: FileViewerSelectionGroup
): FileViewerCapabilitySelectionRow[] {
  return state.catalog.capabilities
    .filter((capability) =>
      group === 'formats' ? capability.formats.length > 0 : capability.formats.length === 0
    )
    .map((capability, index) => ({
      index: index + 1,
      capability,
      selected:
        state.inheritedCapabilityIds.has(capability.id) ||
        state.selectedCapabilityIds.has(capability.id),
      locked: state.inheritedCapabilityIds.has(capability.id),
    }))
}

const acronyms = new Map<string, string>([
  ['cad', 'CAD'],
  ['dicom', 'DICOM'],
  ['eda', 'EDA'],
  ['epub', 'EPUB'],
  ['html', 'HTML'],
  ['iwork', 'iWork'],
  ['ofd', 'OFD'],
  ['openxml', 'OpenXML'],
  ['pdf', 'PDF'],
  ['ppt', 'PPT'],
  ['pptx', 'PPTX'],
  ['rtf', 'RTF'],
  ['wasm', 'WASM'],
  ['xmind', 'XMind'],
  ['xml', 'XML'],
])

const capabilityLabel = (id: string) =>
  id
    .split('-')
    .map((word) => acronyms.get(word) ?? `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(' ')

const formatSummary = (capability: FileViewerCapabilityCatalogEntry, copy: SelectionCopy) => {
  if (!capability.formats.length) return copy.noFormats
  const visible = capability.formats.slice(0, 7).map((format) => `.${format}`)
  const remainder = capability.formats.length - visible.length
  return `${visible.join(' ')}${remainder > 0 ? ` +${remainder}` : ''}`
}

export function renderFileViewerSelectionGroup(
  state: FileViewerCapabilitySelectionState,
  group: FileViewerSelectionGroup,
  locale: FileViewerCliLocale
) {
  const copy = selectionCopy[locale]
  const rows = listFileViewerCapabilitySelectionRows(state, group)
  const inherited = rows.filter((row) => row.locked).length
  const selected = rows.filter((row) => row.selected).length
  const labelWidth = Math.min(
    34,
    Math.max(18, ...rows.map((row) => capabilityLabel(row.capability.id).length))
  )
  const lines = rows.map((row) => {
    const marker = row.locked ? '[✓]' : row.selected ? '[x]' : '[ ]'
    const index = String(row.index).padStart(2, ' ')
    const label = capabilityLabel(row.capability.id).padEnd(labelWidth, ' ')
    const tags = [
      row.locked ? copy.profile : '',
      row.capability.weight === 'heavy' ? copy.heavy : '',
      row.capability.license.policy !== 'permissive' ? copy.review : '',
    ].filter(Boolean)
    return `  ${marker} ${index}. ${label}  ${formatSummary(row.capability, copy)}${tags.length ? `  (${tags.join(', ')})` : ''}`
  })
  return `\n${group === 'formats' ? copy.formats : copy.enhancements}:\n${lines.join('\n')}\n  ${copy.summary(selected, rows.length, inherited)}\n`
}

type SelectionCommandResult =
  | { action: 'confirm' | 'back' | 'cancel'; changed: false; locked: false }
  | { action: 'changed'; changed: true; locked: boolean }
  | { action: 'invalid'; changed: false; locked: false }

export function applyFileViewerSelectionCommand(
  state: FileViewerCapabilitySelectionState,
  group: FileViewerSelectionGroup,
  answer: string
): SelectionCommandResult {
  const normalized = answer.trim().toLowerCase()
  if (!normalized) return { action: 'confirm', changed: false, locked: false }
  if (normalized === 'b') return { action: 'back', changed: false, locked: false }
  if (normalized === '0') return { action: 'cancel', changed: false, locked: false }
  const rows = listFileViewerCapabilitySelectionRows(state, group)
  const editable = rows.filter((row) => !row.locked)
  if (normalized === 'a') {
    for (const row of editable) state.selectedCapabilityIds.add(row.capability.id)
    return { action: 'changed', changed: true, locked: false }
  }
  if (normalized === 'n') {
    for (const row of editable) state.selectedCapabilityIds.delete(row.capability.id)
    return { action: 'changed', changed: true, locked: false }
  }
  const indexes = new Set<number>()
  for (const token of normalized.split(/[\s,]+/).filter(Boolean)) {
    const match = token.match(/^(\d+)(?:-(\d+))?$/)
    if (!match) return { action: 'invalid', changed: false, locked: false }
    const start = Number(match[1])
    const end = Number(match[2] ?? match[1])
    if (start < 1 || end < start || end > rows.length)
      return { action: 'invalid', changed: false, locked: false }
    for (let index = start; index <= end; index += 1) indexes.add(index)
  }
  if (!indexes.size) return { action: 'invalid', changed: false, locked: false }
  let locked = false
  for (const index of indexes) {
    const row = rows[index - 1]
    if (row.locked) {
      locked = true
      continue
    }
    if (state.selectedCapabilityIds.has(row.capability.id))
      state.selectedCapabilityIds.delete(row.capability.id)
    else state.selectedCapabilityIds.add(row.capability.id)
  }
  return { action: 'changed', changed: true, locked }
}

export function finalizeFileViewerCapabilitySelection(state: FileViewerCapabilitySelectionState) {
  const selected = state.catalog.capabilities
    .filter((capability) => state.selectedCapabilityIds.has(capability.id))
    .map((capability) => capability.id)
  return {
    formats: [...state.unknownFormats],
    capabilities: [...selected, ...state.unknownCapabilities],
  }
}

export async function promptFileViewerCapabilitySelection(input: {
  catalog: FileViewerCliCatalog
  profile: FileViewerProfile
  locale: FileViewerCliLocale
  formats?: readonly string[]
  capabilities?: readonly string[]
  question: (prompt: string) => Promise<string>
  write: (output: string) => void
}) {
  const copy = selectionCopy[input.locale]
  const state = createFileViewerCapabilitySelection(input)
  const groups = (['formats', 'enhancements'] as const).filter(
    (group) => listFileViewerCapabilitySelectionRows(state, group).length > 0
  )
  let groupIndex = 0
  while (groupIndex < groups.length) {
    const group = groups[groupIndex]
    input.write(renderFileViewerSelectionGroup(state, group, input.locale))
    const result = applyFileViewerSelectionCommand(state, group, await input.question(copy.prompt))
    if (result.action === 'cancel') throw new Error(copy.cancelled)
    if (result.action === 'back') {
      if (groupIndex === 0) return null
      groupIndex -= 1
      continue
    }
    if (result.action === 'invalid') {
      input.write(`  ${copy.invalid}\n`)
      continue
    }
    if (result.action === 'changed') {
      if (result.locked) input.write(`  ${copy.locked}\n`)
      continue
    }
    groupIndex += 1
  }
  return finalizeFileViewerCapabilitySelection(state)
}
