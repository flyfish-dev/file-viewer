import {
  createFileViewerTranslator,
  createFileViewerZoomChangeEmitter as createZoomChangeEmitter,
  registerFileViewerZoomProvider,
  unregisterFileViewerZoomProvider,
  type FileRenderContext,
  type FileViewerRenderedInstance,
  type FileViewerZoomState
} from '@file-viewer/core'
import { getFileViewerPakoLoader } from './optionalCapabilities.js'

type InflateConstructor = typeof import('pako').Inflate
let Inflate: InflateConstructor | null = null

type BundleRef = { oid: string; name: string }
type BundlePrerequisite = { oid: string; subject: string }
type PackObjectKind = 'commit' | 'tree' | 'blob' | 'tag' | 'ofs-delta' | 'ref-delta' | 'unknown'

interface BundleHeader {
  signature: string
  capabilities: string[]
  refs: BundleRef[]
  prerequisites: BundlePrerequisite[]
  packOffset: number
  objectFormat: 'sha1' | 'sha256' | 'unknown'
}

interface PackObject {
  oid?: string
  kind: PackObjectKind
  size: number
  offset: number
  content?: Uint8Array
  baseOffset?: number
  baseOid?: string
  deltaKind?: Extract<PackObjectKind, 'ofs-delta' | 'ref-delta'>
}

interface CommitInfo {
  oid: string
  tree?: string
  parents: string[]
  author?: string
  committer?: string
  message: string
  refs: string[]
}

interface TreeEntry {
  mode: string
  name: string
  oid: string
}

interface FileEntry {
  path: string
  oid: string
  size: number
  preview: string
}

interface BundleModel {
  header: BundleHeader
  objects: PackObject[]
  commits: CommitInfo[]
  files: FileEntry[]
  treeEntries: Array<{ path: string; entry: TreeEntry }>
  deltaCount: number
}

const textDecoder = new TextDecoder('utf-8')
const asciiDecoder = new TextDecoder('latin1')

const bundleStyle = `
.git-bundle-viewer{display:grid;height:100%;min-height:420px;grid-template-rows:auto minmax(0,1fr);--bundle-bg:#f6f8fa;--bundle-surface:#fff;--bundle-border:rgba(31,35,40,.12);--bundle-text:#24292f;--bundle-muted:#57606a;--bundle-accent:#0f766e;--bundle-code:#0d1117;--bundle-code-text:#e6edf3;--bundle-font-size:13px;background:var(--bundle-bg);color:var(--bundle-text);box-sizing:border-box}
.git-bundle-toolbar{position:sticky;top:0;z-index:2;display:flex;min-height:46px;align-items:center;justify-content:space-between;gap:12px;padding:8px 16px;border-bottom:1px solid var(--bundle-border);background:rgba(255,255,255,.92);backdrop-filter:blur(12px);box-sizing:border-box}
.git-bundle-toolbar span,.git-bundle-toolbar strong{color:var(--bundle-muted);font-size:12px;font-weight:800;letter-spacing:0}
.git-bundle-layout{display:grid;min-height:0;grid-template-columns:minmax(260px,340px) minmax(260px,360px) minmax(0,1fr);gap:12px;padding:12px;box-sizing:border-box}
.git-bundle-panel{min-height:0;overflow:auto;border:1px solid var(--bundle-border);border-radius:8px;background:var(--bundle-surface)}
.git-bundle-panel h3{position:sticky;top:0;z-index:1;margin:0;padding:11px 12px;border-bottom:1px solid var(--bundle-border);background:var(--bundle-surface);font-size:13px}
.git-bundle-list{margin:0;padding:8px;list-style:none}
.git-bundle-list button{display:block;width:100%;margin:0 0 6px;padding:9px 10px;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--bundle-text);font:inherit;font-size:var(--bundle-font-size);text-align:left;cursor:pointer}
.git-bundle-list button:hover,.git-bundle-list button.active{border-color:rgba(15,118,110,.28);background:rgba(15,118,110,.08)}
.git-bundle-list small{display:block;margin-top:4px;color:var(--bundle-muted);font-size:.86em;line-height:1.35}
.git-bundle-meta{display:grid;gap:1px;background:var(--bundle-border)}
.git-bundle-meta div{padding:10px 12px;background:var(--bundle-surface)}
.git-bundle-meta span{display:block;color:var(--bundle-muted);font-size:11px;font-weight:800}
.git-bundle-meta strong{display:block;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.git-bundle-tree{padding:10px 12px;font-size:var(--bundle-font-size)}
.git-bundle-tree button{display:block;width:100%;padding:6px 8px;border:0;border-radius:6px;background:transparent;color:var(--bundle-text);font:inherit;text-align:left;cursor:pointer}
.git-bundle-tree button:hover,.git-bundle-tree button.active{background:rgba(15,118,110,.08);color:var(--bundle-accent)}
.git-bundle-file{display:grid;min-height:0;grid-template-rows:auto minmax(0,1fr)}
.git-bundle-file-header{padding:11px 12px;border-bottom:1px solid var(--bundle-border);font-size:12px;font-weight:800;color:var(--bundle-muted)}
.git-bundle-code{margin:0;overflow:auto;padding:16px 18px;background:var(--bundle-code);color:var(--bundle-code-text);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono',monospace;font-size:var(--bundle-font-size);line-height:1.65;white-space:pre}
.git-bundle-notice{margin:8px;padding:10px 12px;border:1px solid rgba(245,158,11,.35);border-radius:8px;background:rgba(245,158,11,.12);color:#92400e;font-size:12px;line-height:1.55}
[data-viewer-theme='dark'] .git-bundle-viewer{--bundle-bg:#0d1117;--bundle-surface:#161b22;--bundle-border:rgba(139,148,158,.24);--bundle-text:#e6edf3;--bundle-muted:#8b949e;--bundle-code:#010409;--bundle-code-text:#e6edf3}
[data-viewer-theme='dark'] .git-bundle-toolbar{background:rgba(13,17,23,.92)}
@media (prefers-color-scheme:dark){[data-viewer-theme='system'] .git-bundle-viewer{--bundle-bg:#0d1117;--bundle-surface:#161b22;--bundle-border:rgba(139,148,158,.24);--bundle-text:#e6edf3;--bundle-muted:#8b949e;--bundle-code:#010409;--bundle-code-text:#e6edf3}[data-viewer-theme='system'] .git-bundle-toolbar{background:rgba(13,17,23,.92)}}
@media (max-width:980px){.git-bundle-layout{grid-template-columns:1fr}.git-bundle-panel{min-height:240px}}
`

const createElement = <TagName extends keyof HTMLElementTagNameMap>(
  documentRef: Document,
  tagName: TagName,
  className?: string,
  text?: string
) => {
  const element = documentRef.createElement(tagName)
  if (className) {
    element.className = className
  }
  if (typeof text === 'string') {
    element.textContent = text
  }
  return element
}

const createStyle = (documentRef: Document) => {
  const style = documentRef.createElement('style')
  style.textContent = bundleStyle
  return style
}

const toHex = (bytes: Uint8Array) => {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

const readUInt32 = (bytes: Uint8Array, offset: number) => {
  return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0
}

const concatBytes = (items: Uint8Array[]) => {
  const total = items.reduce((sum, item) => sum + item.byteLength, 0)
  const merged = new Uint8Array(total)
  let offset = 0
  for (const item of items) {
    merged.set(item, offset)
    offset += item.byteLength
  }
  return merged
}

type FileViewerTranslator = ReturnType<typeof createFileViewerTranslator>

const parseHeader = (bytes: Uint8Array, t: FileViewerTranslator): BundleHeader => {
  const lines: string[] = []
  let offset = 0
  while (offset < bytes.length) {
    const next = bytes.indexOf(10, offset)
    if (next < 0) {
      throw new Error('Git bundle header is incomplete.')
    }
    const rawLine = bytes.subarray(offset, next)
    const line = asciiDecoder.decode(rawLine).replace(/\r$/, '')
    offset = next + 1
    if (line === '') {
      break
    }
    lines.push(line)
  }

  const signature = lines.shift() || ''
  if (!signature.startsWith('# v') || !signature.includes('git bundle')) {
    throw new Error(t('gitBundle.error.invalid'))
  }

  const capabilities: string[] = []
  const refs: BundleRef[] = []
  const prerequisites: BundlePrerequisite[] = []
  let objectFormat: BundleHeader['objectFormat'] = 'sha1'

  for (const line of lines) {
    if (line.startsWith('@')) {
      capabilities.push(line.slice(1))
      const objectFormatMatch = line.match(/^@object-format=(sha1|sha256)$/)
      if (objectFormatMatch) {
        objectFormat = objectFormatMatch[1] as 'sha1' | 'sha256'
      }
      continue
    }
    if (line.startsWith('-')) {
      const [oid = '', ...subject] = line.slice(1).split(/\s+/)
      prerequisites.push({ oid, subject: subject.join(' ') })
      continue
    }
    const [oid = '', ...name] = line.split(/\s+/)
    if (oid) {
      refs.push({ oid, name: name.join(' ') || oid })
    }
  }

  return {
    signature,
    capabilities,
    refs,
    prerequisites,
    packOffset: offset,
    objectFormat
  }
}

const readPackObjectHeader = (bytes: Uint8Array, start: number) => {
  let offset = start
  let byte = bytes[offset++]
  const typeCode = (byte >> 4) & 0x07
  let size = byte & 0x0f
  let shift = 4
  while (byte & 0x80) {
    byte = bytes[offset++]
    size |= (byte & 0x7f) << shift
    shift += 7
  }
  return { typeCode, size, offset }
}

const readOfsDeltaBase = (bytes: Uint8Array, start: number) => {
  let offset = start
  let value = bytes[offset++] & 0x7f
  while (bytes[offset - 1] & 0x80) {
    value += 1
    value = (value << 7) + (bytes[offset++] & 0x7f)
  }
  return { value, offset }
}

const inflateObject = (bytes: Uint8Array, start: number) => {
  if (!Inflate) throw new Error('Git bundle support is opt-in. Run `npx file-viewer-cli add text-tools --write`, then `npx file-viewer-cli install --yes`.')
  const inflator = new Inflate()
  let offset = start
  while (!inflator.ended && offset < bytes.length) {
    inflator.push(bytes.subarray(offset, offset + 1), false)
    offset += 1
    if (inflator.err) {
      throw new Error(inflator.msg || 'Git pack object inflate failed.')
    }
  }
  if (!inflator.ended || !(inflator.result instanceof Uint8Array)) {
    throw new Error('Git pack object is incomplete.')
  }
  return {
    content: inflator.result,
    nextOffset: offset
  }
}

const kindName = (typeCode: number): PackObjectKind => {
  if (typeCode === 1) return 'commit'
  if (typeCode === 2) return 'tree'
  if (typeCode === 3) return 'blob'
  if (typeCode === 4) return 'tag'
  if (typeCode === 6) return 'ofs-delta'
  if (typeCode === 7) return 'ref-delta'
  return 'unknown'
}

const hashObjectId = async (
  format: BundleHeader['objectFormat'],
  kind: PackObjectKind,
  content: Uint8Array
) => {
  if (format === 'unknown') {
    return undefined
  }
  const header = new TextEncoder().encode(`${kind} ${content.byteLength}\0`)
  const digest = await globalThis.crypto.subtle.digest(format === 'sha256' ? 'SHA-256' : 'SHA-1', concatBytes([header, content]))
  return toHex(new Uint8Array(digest))
}

const readDeltaSize = (bytes: Uint8Array, start: number) => {
  let offset = start
  let size = 0
  let shift = 0
  let byte = 0
  do {
    byte = bytes[offset++]
    size |= (byte & 0x7f) << shift
    shift += 7
  } while (byte & 0x80)
  return { size, offset }
}

const applyPackDelta = (base: Uint8Array, delta: Uint8Array) => {
  const baseSize = readDeltaSize(delta, 0)
  const targetSize = readDeltaSize(delta, baseSize.offset)
  let offset = targetSize.offset
  const chunks: Uint8Array[] = []

  if (baseSize.size !== base.byteLength) {
    throw new Error('Git delta base size does not match the resolved object.')
  }

  while (offset < delta.byteLength) {
    const opcode = delta[offset++]
    if (opcode & 0x80) {
      let copyOffset = 0
      let copySize = 0
      if (opcode & 0x01) copyOffset = delta[offset++]
      if (opcode & 0x02) copyOffset |= delta[offset++] << 8
      if (opcode & 0x04) copyOffset |= delta[offset++] << 16
      if (opcode & 0x08) copyOffset |= delta[offset++] << 24
      if (opcode & 0x10) copySize = delta[offset++]
      if (opcode & 0x20) copySize |= delta[offset++] << 8
      if (opcode & 0x40) copySize |= delta[offset++] << 16
      if (copySize === 0) copySize = 0x10000
      chunks.push(base.subarray(copyOffset, copyOffset + copySize))
    } else if (opcode) {
      chunks.push(delta.subarray(offset, offset + opcode))
      offset += opcode
    } else {
      throw new Error('Git delta contains a reserved opcode.')
    }
  }

  const result = concatBytes(chunks)
  if (result.byteLength !== targetSize.size) {
    throw new Error('Git delta target size does not match decoded content.')
  }
  return result
}

const resolvePackDeltas = async (
  objects: PackObject[],
  format: BundleHeader['objectFormat']
) => {
  const byOffset = new Map<number, PackObject>()
  const byOid = new Map<string, PackObject>()
  objects.forEach(object => {
    byOffset.set(object.offset, object)
    if (object.oid) {
      byOid.set(object.oid, object)
    }
  })

  for (let pass = 0; pass < objects.length; pass += 1) {
    let resolvedThisPass = 0
    for (const object of objects) {
      if (!object.deltaKind || object.oid || !object.content) {
        continue
      }
      const base = typeof object.baseOffset === 'number'
        ? byOffset.get(object.baseOffset)
        : object.baseOid
          ? byOid.get(object.baseOid)
          : undefined
      if (!base?.content || base.deltaKind || base.kind === 'ofs-delta' || base.kind === 'ref-delta') {
        continue
      }
      object.content = applyPackDelta(base.content, object.content)
      object.kind = base.kind
      object.oid = await hashObjectId(format, object.kind, object.content)
      if (object.oid) {
        byOid.set(object.oid, object)
      }
      resolvedThisPass += 1
    }
    if (!resolvedThisPass) {
      break
    }
  }
}

const parsePack = async (
  bytes: Uint8Array,
  header: BundleHeader,
  t: FileViewerTranslator
) => {
  const offset = header.packOffset
  if (asciiDecoder.decode(bytes.subarray(offset, offset + 4)) !== 'PACK') {
    throw new Error(t('gitBundle.error.missingPack'))
  }
  const version = readUInt32(bytes, offset + 4)
  const count = readUInt32(bytes, offset + 8)
  const objects: PackObject[] = []
  let cursor = offset + 12
  const maxObjects = Math.min(count, 2500)

  for (let index = 0; index < maxObjects && cursor < bytes.length; index += 1) {
    const objectOffset = cursor
    const parsedHeader = readPackObjectHeader(bytes, cursor)
    cursor = parsedHeader.offset
    const kind = kindName(parsedHeader.typeCode)
    let baseOffset: number | undefined
    let baseOid: string | undefined

    if (kind === 'ofs-delta') {
      const parsedBase = readOfsDeltaBase(bytes, cursor)
      baseOffset = objectOffset - parsedBase.value
      cursor = parsedBase.offset
    } else if (kind === 'ref-delta') {
      const oidLength = header.objectFormat === 'sha256' ? 32 : 20
      baseOid = toHex(bytes.subarray(cursor, cursor + oidLength))
      cursor += oidLength
    }

    const inflated = inflateObject(bytes, cursor)
    cursor = inflated.nextOffset
    const item: PackObject = {
      kind,
      size: parsedHeader.size,
      offset: objectOffset,
      content: inflated.content,
      baseOffset,
      baseOid,
      deltaKind: kind === 'ofs-delta' || kind === 'ref-delta' ? kind : undefined
    }

    if (kind !== 'ofs-delta' && kind !== 'ref-delta' && kind !== 'unknown') {
      item.oid = await hashObjectId(header.objectFormat, kind, inflated.content)
    }
    objects.push(item)
  }
  await resolvePackDeltas(objects, header.objectFormat)

  return {
    version,
    declaredCount: count,
    objects,
    parsedCount: objects.length
  }
}

const parseCommit = (object: PackObject, refsByOid: Map<string, string[]>): CommitInfo | null => {
  if (object.kind !== 'commit' || !object.oid || !object.content) {
    return null
  }
  const text = textDecoder.decode(object.content)
  const [headers = '', ...messageParts] = text.split(/\n\n/)
  const parents: string[] = []
  let tree: string | undefined
  let author: string | undefined
  let committer: string | undefined

  for (const line of headers.split(/\n/)) {
    if (line.startsWith('tree ')) {
      tree = line.slice(5)
    } else if (line.startsWith('parent ')) {
      parents.push(line.slice(7))
    } else if (line.startsWith('author ')) {
      author = line.slice(7)
    } else if (line.startsWith('committer ')) {
      committer = line.slice(10)
    }
  }

  return {
    oid: object.oid,
    tree,
    parents,
    author,
    committer,
    message: messageParts.join('\n\n').trim() || '(no message)',
    refs: refsByOid.get(object.oid) || []
  }
}

const parseTree = (content: Uint8Array): TreeEntry[] => {
  const entries: TreeEntry[] = []
  let offset = 0
  while (offset < content.byteLength) {
    const modeEnd = content.indexOf(32, offset)
    if (modeEnd < 0) break
    const nameEnd = content.indexOf(0, modeEnd + 1)
    if (nameEnd < 0 || nameEnd + 21 > content.byteLength) break
    entries.push({
      mode: asciiDecoder.decode(content.subarray(offset, modeEnd)),
      name: textDecoder.decode(content.subarray(modeEnd + 1, nameEnd)),
      oid: toHex(content.subarray(nameEnd + 1, nameEnd + 21))
    })
    offset = nameEnd + 21
  }
  return entries
}

const isMostlyText = (bytes: Uint8Array) => {
  const sample = bytes.subarray(0, Math.min(bytes.byteLength, 4096))
  if (!sample.length) {
    return true
  }
  let printable = 0
  for (const byte of sample) {
    if (byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte < 127) || byte >= 128) {
      printable += 1
    }
  }
  return printable / sample.length > 0.86
}

const previewBlob = (content: Uint8Array) => {
  if (!isMostlyText(content)) {
    return `[binary blob: ${content.byteLength} bytes]`
  }
  return textDecoder.decode(content.subarray(0, Math.min(content.byteLength, 12000)))
}

const collectTree = (
  objectMap: Map<string, PackObject>,
  treeOid: string | undefined,
  basePath = '',
  depth = 0
): { treeEntries: Array<{ path: string; entry: TreeEntry }>; files: FileEntry[] } => {
  if (!treeOid || depth > 24) {
    return { treeEntries: [], files: [] }
  }
  const treeObject = objectMap.get(treeOid)
  if (treeObject?.kind !== 'tree' || !treeObject.content) {
    return { treeEntries: [], files: [] }
  }

  const treeEntries: Array<{ path: string; entry: TreeEntry }> = []
  const files: FileEntry[] = []
  for (const entry of parseTree(treeObject.content)) {
    const path = basePath ? `${basePath}/${entry.name}` : entry.name
    treeEntries.push({ path, entry })
    const object = objectMap.get(entry.oid)
    if (object?.kind === 'tree') {
      const child = collectTree(objectMap, entry.oid, path, depth + 1)
      treeEntries.push(...child.treeEntries)
      files.push(...child.files)
    } else if (object?.kind === 'blob' && object.content) {
      files.push({
        path,
        oid: entry.oid,
        size: object.content.byteLength,
        preview: previewBlob(object.content)
      })
    }
  }

  return { treeEntries, files }
}

const parseBundleModel = async (
  buffer: ArrayBuffer,
  t: FileViewerTranslator
): Promise<BundleModel> => {
  const bytes = new Uint8Array(buffer)
  const header = parseHeader(bytes, t)
  const pack = await parsePack(bytes, header, t)
  const objectMap = new Map(pack.objects.flatMap(object => object.oid ? [[object.oid, object] as const] : []))
  const refsByOid = new Map<string, string[]>()
  header.refs.forEach(ref => {
    refsByOid.set(ref.oid, [...(refsByOid.get(ref.oid) || []), ref.name])
  })
  const commits = pack.objects
    .map(object => parseCommit(object, refsByOid))
    .filter((commit): commit is CommitInfo => Boolean(commit))
  const selectedCommit = header.refs.map(ref => refsByOid.has(ref.oid) ? commits.find(commit => commit.oid === ref.oid) : null)
    .find(Boolean) || commits[0]
  const tree = collectTree(objectMap, selectedCommit?.tree)

  return {
    header,
    objects: pack.objects,
    commits,
    files: tree.files,
    treeEntries: tree.treeEntries,
    deltaCount: pack.objects.filter(object => object.deltaKind).length
  }
}

const shortOid = (oid?: string) => oid ? oid.slice(0, 12) : '-'

const commitTitle = (commit: CommitInfo) => commit.message.split(/\r?\n/)[0] || '(no message)'

const clampZoom = (value: number) => {
  return Math.min(2.2, Math.max(0.65, Number(value.toFixed(2))))
}

const renderMeta = (
  documentRef: Document,
  panel: HTMLElement,
  model: BundleModel,
  t: FileViewerTranslator
) => {
  const meta = createElement(documentRef, 'div', 'git-bundle-meta')
  const counts = new Map<PackObjectKind, number>()
  model.objects.forEach(object => {
    counts.set(object.kind, (counts.get(object.kind) || 0) + 1)
  })
  const items = [
    [t('gitBundle.meta.bundle'), model.header.signature],
    [t('gitBundle.meta.refs'), String(model.header.refs.length)],
    [t('gitBundle.meta.commits'), String(model.commits.length)],
    [t('gitBundle.meta.objects'), String(model.objects.length)],
    [t('gitBundle.meta.deltas'), String(model.deltaCount)],
    [t('gitBundle.meta.objectFormat'), model.header.objectFormat],
    [t('gitBundle.meta.objectTypes'), Array.from(counts).map(([kind, count]) => `${kind}:${count}`).join(' · ') || '-']
  ]
  items.forEach(([label, value]) => {
    const row = createElement(documentRef, 'div')
    row.append(createElement(documentRef, 'span', undefined, label), createElement(documentRef, 'strong', undefined, value))
    meta.appendChild(row)
  })
  panel.appendChild(meta)
  if (model.deltaCount > 0) {
    panel.appendChild(createElement(
      documentRef,
      'div',
      'git-bundle-notice',
      t('gitBundle.notice.delta')
    ))
  }
}

export default async function renderGitBundle(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type = 'bundle',
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const loadPako = getFileViewerPakoLoader()
  if (!loadPako) {
    throw new Error('Git bundle support is opt-in. Run `npx file-viewer-cli add text-tools --write`, then `npx file-viewer-cli install --yes`.')
  }
  ;({ Inflate } = await loadPako())
  const documentRef = target.ownerDocument || document
  const t = createFileViewerTranslator(context?.options)
  const model = await parseBundleModel(buffer, t)
  let zoom = 1
  const zoomEmitter = createZoomChangeEmitter()

  const root = createElement(documentRef, 'div', 'git-bundle-viewer')
  root.dataset.viewerZoomProvider = 'git-bundle'
  const toolbar = createElement(documentRef, 'div', 'git-bundle-toolbar')
  toolbar.append(
    createElement(documentRef, 'span', undefined, type.toUpperCase()),
    createElement(documentRef, 'strong', undefined, t('gitBundle.toolbar.summary', {
      commits: model.commits.length,
      files: model.files.length
    }))
  )

  const layout = createElement(documentRef, 'div', 'git-bundle-layout')
  const historyPanel = createElement(documentRef, 'section', 'git-bundle-panel')
  historyPanel.appendChild(createElement(documentRef, 'h3', undefined, t('gitBundle.title.history')))
  renderMeta(documentRef, historyPanel, model, t)
  const historyList = createElement(documentRef, 'ul', 'git-bundle-list')
  historyPanel.appendChild(historyList)

  const treePanel = createElement(documentRef, 'section', 'git-bundle-panel')
  treePanel.appendChild(createElement(documentRef, 'h3', undefined, t('gitBundle.title.fileTree')))
  const tree = createElement(documentRef, 'div', 'git-bundle-tree')
  treePanel.appendChild(tree)

  const filePanel = createElement(documentRef, 'section', 'git-bundle-panel git-bundle-file')
  const fileHeader = createElement(documentRef, 'div', 'git-bundle-file-header', t('gitBundle.file.choose'))
  const fileCode = createElement(documentRef, 'pre', 'git-bundle-code', '')
  filePanel.append(fileHeader, fileCode)
  layout.append(historyPanel, treePanel, filePanel)
  root.append(toolbar, layout)
  target.replaceChildren(createStyle(documentRef), root)

  const renderFiles = (files: FileEntry[]) => {
    tree.replaceChildren()
    if (!files.length) {
      tree.appendChild(createElement(documentRef, 'div', 'git-bundle-notice', t('gitBundle.file.noTree')))
      fileHeader.textContent = t('gitBundle.file.none')
      fileCode.textContent = ''
      return
    }
    files.forEach((file, index) => {
      const button = createElement(documentRef, 'button')
      button.type = 'button'
      button.textContent = `${file.path} · ${file.size} B`
      button.addEventListener('click', () => {
        tree.querySelectorAll('button').forEach(item => item.classList.remove('active'))
        button.classList.add('active')
        fileHeader.textContent = `${file.path} · ${shortOid(file.oid)}`
        fileCode.textContent = file.preview
      })
      tree.appendChild(button)
      if (index === 0) {
        button.click()
      }
    })
  }

  model.commits.forEach((commit, index) => {
    const button = createElement(documentRef, 'button')
    button.type = 'button'
    button.innerHTML = ''
    button.append(
      documentRef.createTextNode(commit.refs[0] || commitTitle(commit)),
      createElement(documentRef, 'small', undefined, `${shortOid(commit.oid)} · ${commitTitle(commit)}`)
    )
    button.addEventListener('click', () => {
      historyList.querySelectorAll('button').forEach(item => item.classList.remove('active'))
      button.classList.add('active')
      const objectMap = new Map(model.objects.flatMap(object => object.oid ? [[object.oid, object] as const] : []))
      const commitTree = collectTree(objectMap, commit.tree)
      renderFiles(commitTree.files)
    })
    historyList.appendChild(button)
    if (index === 0) {
      button.click()
    }
  })

  if (!model.commits.length) {
    historyList.appendChild(createElement(documentRef, 'li', 'git-bundle-notice', t('gitBundle.history.empty')))
    renderFiles(model.files)
  }

  const getZoomState = (): FileViewerZoomState => ({
    scale: zoom,
    label: `${Math.round(zoom * 100)}%`,
    canZoomIn: zoom < 2.2,
    canZoomOut: zoom > 0.65,
    canReset: zoom !== 1,
    minScale: 0.65,
    maxScale: 2.2
  })

  const setZoom = (scale: number) => {
    zoom = clampZoom(scale)
    root.style.setProperty('--bundle-font-size', `${13 * zoom}px`)
    zoomEmitter.emit()
    return getZoomState()
  }
  setZoom(1)

  registerFileViewerZoomProvider(root, {
    zoomIn: () => setZoom(zoom + 0.1),
    zoomOut: () => setZoom(zoom - 0.1),
    resetZoom: () => setZoom(1),
    setZoom,
    getState: getZoomState,
    subscribe: zoomEmitter.subscribe
  })

  return {
    $el: root,
    unmount() {
      unregisterFileViewerZoomProvider(root)
      target.replaceChildren()
    }
  }
}
