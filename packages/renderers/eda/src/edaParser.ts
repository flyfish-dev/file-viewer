import type { CFB$Entry } from 'cfb'
import {
  inspectOasisLayout,
  parseGdsLayout,
  parseOasisTextLayout,
  type EdaLayoutPreview,
} from '@file-viewer/eda-layout'
import {
  cleanupOrcadText as cleanupText,
  collectOrcadStrings as collectStrings,
  createOrcadHexPreview as hexPreview,
  decodeOrcadSample as decodeSample,
  isOrcadCompoundFile,
  looksLikeOrcadText as looksLikeText,
} from '@file-viewer/eda-orcad'

const MAX_STREAMS = 200
const MAX_STREAM_STRINGS = 24
const MAX_PROPERTIES = 420

export type EdaParserLocale = 'zh-CN' | 'en-US' | 'ja-JP' | 'de-DE'

type EdaParserTextKey =
  | 'oasisFixture'
  | 'gdsLayout'
  | 'cfbContainer'
  | 'binaryIndex'
  | 'coverage'
  | 'layout'
  | 'layoutOasisName'
  | 'layoutGdsName'
  | 'titleOrcadSymbolLibrary'
  | 'titleOlbBinaryLibrary'
  | 'titleOrcadDrawingLibrary'
  | 'titleDraBinaryDrawing'
  | 'titleLayoutStructure'
  | 'noSymbol'
  | 'noFootprint'
  | 'noGds'
  | 'noOasis'
  | 'maxStreams'
  | 'binaryFallback'

const EDA_PARSER_TEXT: Record<EdaParserLocale, Record<EdaParserTextKey, string>> = {
  'zh-CN': {
    oasisFixture: '已识别为 OASIS 文本结构夹具，并在浏览器端解析几何预览和结构索引；真实 SEMI 二进制 OASIS 仍走安全索引与后续独立内核路线。',
    gdsLayout: '已识别为标准 GDSII 二进制版图记录，并在浏览器端解析几何预览和结构索引。',
    cfbContainer: '已识别为 Microsoft Compound File / OLE2 复合文档容器，并在浏览器端解析目录与流。',
    binaryIndex: '未识别为 CFB 容器，已使用二进制字符串索引模式展示可读信息。',
    coverage: '已索引 {streams} 个条目、{strings} 个可读字符串、{entities} 个 EDA 结构候选。',
    layout: '已解析 {layout}: {structures} 个 structure、{elements} 个几何/引用/文本元素，可在版图预览面板中拖动查看。',
    layoutOasisName: 'OASIS 文本结构',
    layoutGdsName: 'GDSII 版图',
    titleOrcadSymbolLibrary: 'OrCAD Capture 元件符号库',
    titleOlbBinaryLibrary: 'OLB 二进制库',
    titleOrcadDrawingLibrary: 'OrCAD / Allegro 图纸库',
    titleDraBinaryDrawing: 'DRA 二进制图纸',
    titleLayoutStructure: '{type} 版图结构',
    noSymbol: '未发现明确的元件符号候选，文件可能使用了私有二进制编码或需要专业工具导出 ASCII/XML 后再检查。',
    noFootprint: '未发现明确的封装、图形或 padstack 候选，文件可能使用了私有二进制数据库编码。',
    noGds: '未发现明确的 GDSII 版图结构候选。文件可能不是标准 GDSII 二进制或使用了专有封装。',
    noOasis: '未发现明确的 OASIS 版图结构候选。OASIS 完整几何浏览通常需要专业版图库或独立 WASM/TS 内核，当前前端包会安全展示头部、字符串、属性和二进制结构线索。',
    maxStreams: '仅展示前 {count} 个 CFB 项，完整文件仍可下载后在专业 EDA 工具中打开。',
    binaryFallback: '该文件不是标准 CFB 容器，已退化为安全的二进制字符串索引预览。',
  },
  'en-US': {
    oasisFixture: 'Detected an OASIS text fixture and parsed geometry preview plus structure indexes in the browser. Full SEMI binary OASIS still follows the safe index and dedicated-kernel path.',
    gdsLayout: 'Detected standard GDSII binary layout records and parsed geometry preview plus structure indexes in the browser.',
    cfbContainer: 'Detected a Microsoft Compound File / OLE2 container and parsed its directory and streams in the browser.',
    binaryIndex: 'This file is not recognized as a CFB container, so readable information is shown through a safe binary string index.',
    coverage: 'Indexed {streams} entries, {strings} readable strings, and {entities} EDA structure candidates.',
    layout: 'Parsed {layout}: {structures} structures and {elements} geometry/reference/text elements. Drag the layout preview panel to inspect it.',
    layoutOasisName: 'OASIS text fixture',
    layoutGdsName: 'GDSII layout',
    titleOrcadSymbolLibrary: 'OrCAD Capture Symbol Library',
    titleOlbBinaryLibrary: 'OLB Binary Library',
    titleOrcadDrawingLibrary: 'OrCAD / Allegro Drawing Library',
    titleDraBinaryDrawing: 'DRA Binary Drawing',
    titleLayoutStructure: '{type} Layout Structure',
    noSymbol: 'No clear component-symbol candidates were found. The file may use private binary encoding or need ASCII/XML export from a professional tool.',
    noFootprint: 'No clear footprint, drawing, or padstack candidates were found. The file may use private binary database encoding.',
    noGds: 'No clear GDSII layout structure candidates were found. The file may not be standard GDSII binary or may use a proprietary wrapper.',
    noOasis: 'No clear OASIS layout structure candidates were found. Full OASIS geometry browsing usually needs a professional layout library or dedicated WASM/TS kernel; this frontend package safely exposes headers, strings, properties, and binary clues.',
    maxStreams: 'Only the first {count} CFB entries are shown. Download the full file and open it in a professional EDA tool for complete inspection.',
    binaryFallback: 'This file is not a standard CFB container, so it falls back to a safe binary string index preview.',
  },
  'ja-JP': {
    oasisFixture: 'OASIS テキスト fixture を認識し、ブラウザー内で幾何プレビューと構造索引を解析しました。完全な SEMI バイナリ OASIS は安全な索引と専用カーネルの経路を使用します。',
    gdsLayout: '標準 GDSII バイナリレイアウトレコードを認識し、ブラウザー内で幾何プレビューと構造索引を解析しました。',
    cfbContainer: 'Microsoft Compound File / OLE2 コンテナーを認識し、ブラウザー内でディレクトリとストリームを解析しました。',
    binaryIndex: 'CFB コンテナーとして認識できなかったため、安全なバイナリ文字列索引で可読情報を表示します。',
    coverage: '{streams} 件の項目、{strings} 件の可読文字列、{entities} 件の EDA 構造候補を索引化しました。',
    layout: '{layout} を解析しました：構造 {structures} 件、幾何・参照・テキスト要素 {elements} 件。レイアウトプレビューパネルをドラッグして確認できます。',
    layoutOasisName: 'OASIS テキスト構造',
    layoutGdsName: 'GDSII レイアウト',
    titleOrcadSymbolLibrary: 'OrCAD Capture シンボルライブラリ',
    titleOlbBinaryLibrary: 'OLB バイナリライブラリ',
    titleOrcadDrawingLibrary: 'OrCAD / Allegro 図面ライブラリ',
    titleDraBinaryDrawing: 'DRA バイナリ図面',
    titleLayoutStructure: '{type} レイアウト構造',
    noSymbol: '明確なコンポーネントシンボル候補を検出できませんでした。独自バイナリエンコーディングの可能性があるため、専門ツールから ASCII/XML を書き出して確認してください。',
    noFootprint: '明確なフットプリント、図形、Padstack 候補を検出できませんでした。独自バイナリデータベース形式の可能性があります。',
    noGds: '明確な GDSII レイアウト構造候補を検出できませんでした。標準 GDSII バイナリではないか、独自ラッパーを使用している可能性があります。',
    noOasis: '明確な OASIS レイアウト構造候補を検出できませんでした。完全な OASIS 幾何プレビューには専門ライブラリまたは専用 WASM/TS カーネルが必要です。このフロントエンドパッケージはヘッダー、文字列、プロパティ、バイナリ構造の手掛かりを安全に表示します。',
    maxStreams: '安全上の理由から、先頭 {count} 件の CFB 項目だけを表示します。完全な確認にはファイルをダウンロードして専門 EDA ツールで開いてください。',
    binaryFallback: '標準 CFB コンテナーではないため、安全なバイナリ文字列索引プレビューへ切り替えました。',
  },
  'de-DE': {
    oasisFixture: 'Eine OASIS-Textstruktur wurde erkannt; Geometrievorschau und Strukturindex wurden im Browser verarbeitet. Vollständiges binäres SEMI OASIS verwendet weiterhin den sicheren Index- und den eigenen Kernel-Pfad.',
    gdsLayout: 'Standardmäßige binäre GDSII-Layoutdatensätze wurden erkannt; Geometrievorschau und Strukturindex wurden im Browser verarbeitet.',
    cfbContainer: 'Ein Microsoft-Compound-File-/OLE2-Container wurde erkannt; Verzeichnis und Datenströme wurden im Browser verarbeitet.',
    binaryIndex: 'Die Datei wurde nicht als CFB-Container erkannt. Lesbare Informationen werden über einen sicheren Binärzeichenfolgenindex angezeigt.',
    coverage: '{streams} Einträge, {strings} lesbare Zeichenfolgen und {entities} EDA-Strukturkandidaten wurden indiziert.',
    layout: '{layout} verarbeitet: {structures} Strukturen und {elements} Geometrie-, Referenz- oder Textelemente. Ziehen Sie die Layoutvorschau, um sie zu prüfen.',
    layoutOasisName: 'OASIS-Textstruktur',
    layoutGdsName: 'GDSII-Layout',
    titleOrcadSymbolLibrary: 'OrCAD-Capture-Symbolbibliothek',
    titleOlbBinaryLibrary: 'Binäre OLB-Bibliothek',
    titleOrcadDrawingLibrary: 'OrCAD-/Allegro-Zeichnungsbibliothek',
    titleDraBinaryDrawing: 'Binäre DRA-Zeichnung',
    titleLayoutStructure: '{type}-Layoutstruktur',
    noSymbol: 'Es wurden keine eindeutigen Bauteilsymbole gefunden. Die Datei verwendet möglicherweise eine private Binärcodierung oder muss mit einem Fachwerkzeug als ASCII/XML exportiert werden.',
    noFootprint: 'Es wurden keine eindeutigen Footprint-, Zeichnungs- oder Padstack-Kandidaten gefunden. Die Datei verwendet möglicherweise eine private binäre Datenbankcodierung.',
    noGds: 'Es wurden keine eindeutigen GDSII-Layoutstrukturen gefunden. Die Datei ist möglicherweise kein standardmäßiges GDSII-Binärformat oder verwendet einen proprietären Container.',
    noOasis: 'Es wurden keine eindeutigen OASIS-Layoutstrukturen gefunden. Für die vollständige OASIS-Geometrie ist üblicherweise eine Fachbibliothek oder ein eigener WASM/TS-Kernel erforderlich; dieses Frontend zeigt Header, Zeichenfolgen, Eigenschaften und binäre Hinweise sicher an.',
    maxStreams: 'Nur die ersten {count} CFB-Einträge werden angezeigt. Laden Sie die vollständige Datei für die Prüfung in einem EDA-Fachwerkzeug herunter.',
    binaryFallback: 'Die Datei ist kein standardmäßiger CFB-Container. Deshalb wird eine sichere Vorschau des Binärzeichenfolgenindex angezeigt.',
  },
}

const getEdaParserText = (
  locale: EdaParserLocale,
  key: EdaParserTextKey,
  params: Record<string, string | number> = {}
) => {
  const template = EDA_PARSER_TEXT[locale]?.[key] || EDA_PARSER_TEXT['en-US'][key] || key
  return Object.entries(params).reduce(
    (message, [name, value]) => message.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value)),
    template
  )
}

export type {
  EdaLayoutElement,
  EdaLayoutPreview,
} from '@file-viewer/eda-layout'

export type EdaFileType = 'olb' | 'dra' | 'gds' | 'oas' | 'oasis'
export type EdaParserMode = 'cfb' | 'binary'
export type EdaStreamKind = 'text' | 'binary' | 'storage'
export type EdaDomainRole =
  | 'root'
  | 'library'
  | 'symbol'
  | 'footprint'
  | 'padstack'
  | 'drawing'
  | 'metadata'
  | 'property'
  | 'geometry'
  | 'net'
  | 'unknown'
export type EdaDiagnosticLevel = 'info' | 'warning'

export interface EdaProperty {
  key: string;
  value: string;
  source: string;
}

export interface EdaStreamView {
  path: string;
  name: string;
  size: number;
  kind: EdaStreamKind;
  role: EdaDomainRole;
  sample?: string;
  hex?: string;
  strings: string[];
  properties: EdaProperty[];
}

export interface EdaTreeNode {
  id: string;
  path: string;
  name: string;
  kind: EdaStreamKind;
  role: EdaDomainRole;
  size: number;
  children: EdaTreeNode[];
}

export interface EdaEntity {
  id: string;
  name: string;
  role: EdaDomainRole;
  path: string;
  streamCount: number;
  byteLength: number;
  properties: EdaProperty[];
  pins: string[];
  layers: string[];
  keywords: string[];
  description?: string;
  footprint?: string;
}

export interface EdaStats {
  textStreams: number;
  binaryStreams: number;
  storageEntries: number;
  propertyCount: number;
  stringCount: number;
  symbolCount: number;
  footprintCount: number;
  padstackCount: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface EdaDiagnostic {
  level: EdaDiagnosticLevel;
  code: string;
  message: string;
}

export interface EdaParseResult {
  type: EdaFileType;
  parser: EdaParserMode;
  title: string;
  byteLength: number;
  streamCount: number;
  totalStreamBytes: number;
  streams: EdaStreamView[];
  tree: EdaTreeNode[];
  entities: EdaEntity[];
  metadata: EdaProperty[];
  strings: string[];
  warnings: string[];
  diagnostics: EdaDiagnostic[];
  stats: EdaStats;
  layout?: EdaLayoutPreview;
}

const toBytes = (buffer: ArrayBuffer) => new Uint8Array(buffer)

const normalizeBytes = (value: CFB$Entry['content']) => {
  return value instanceof Uint8Array ? value : new Uint8Array(value)
}

const normalizeSearchText = (value: string) => {
  return cleanupText(value).toLowerCase()
}

const lastPathPart = (path: string) => {
  const parts = path.split('/').filter(Boolean)
  return parts[parts.length - 1] || path || '/'
}

const stripExtension = (value: string) => {
  return value.replace(/\.[a-z0-9]+$/i, '')
}

const uniquePush = (target: string[], value: string, max = Number.POSITIVE_INFINITY) => {
  const cleaned = cleanupText(value)
  if (!cleaned || target.includes(cleaned) || target.length >= max) {
    return
  }
  target.push(cleaned)
}

const PROPERTY_RE = /^\s*([A-Za-z][A-Za-z0-9_. /#-]{1,56})\s*[:=]\s*(.{1,240})\s*$/
const INLINE_PROPERTY_RE = /\b([A-Za-z][A-Za-z0-9_. /#-]{1,56})\s*=\s*([^;\n\r|]{1,240})/g

const normalizePropertyKey = (key: string) => {
  return cleanupText(key).replace(/\s+/g, ' ')
}

const addProperty = (target: EdaProperty[], seen: Set<string>, key: string, value: string, source: string) => {
  if (target.length >= MAX_PROPERTIES) {
    return
  }
  const normalizedKey = normalizePropertyKey(key)
  const normalizedValue = cleanupText(value)
  if (!normalizedKey || !normalizedValue) {
    return
  }
  const identity = `${source}\u0000${normalizedKey.toLowerCase()}\u0000${normalizedValue}`
  if (seen.has(identity)) {
    return
  }
  seen.add(identity)
  target.push({ key: normalizedKey, value: normalizedValue, source })
}

const extractProperties = (text: string, strings: string[], source: string) => {
  const properties: EdaProperty[] = []
  const seen = new Set<string>()
  const chunks = [text, ...strings].filter(Boolean)
  chunks.forEach(chunk => {
    cleanupText(chunk)
      .split(/\n|[|;]/)
      .forEach(line => {
        const match = line.match(PROPERTY_RE)
        if (match) {
          addProperty(properties, seen, match[1], match[2], source)
        }
      })

    for (const match of chunk.matchAll(INLINE_PROPERTY_RE)) {
      addProperty(properties, seen, match[1], match[2], source)
    }
  })
  return properties
}

const hasProperty = (properties: EdaProperty[], keys: string[]) => {
  const normalized = keys.map(key => key.toLowerCase())
  return properties.some(property => normalized.includes(property.key.toLowerCase()))
}

const getPropertyValue = (properties: EdaProperty[], keys: string[]) => {
  const normalized = keys.map(key => key.toLowerCase())
  return properties.find(property => normalized.includes(property.key.toLowerCase()))?.value
}

const roleFromText = (
  type: EdaFileType,
  path: string,
  name: string,
  sample: string,
  strings: string[],
  properties: EdaProperty[],
  kind: EdaStreamKind
): EdaDomainRole => {
  const haystack = normalizeSearchText(`${path}\n${name}\n${sample}\n${strings.join('\n')}`)
  if (haystack === '/' || path === '/') {
    return 'root'
  }
  if (kind === 'storage' && /(^|\/)(library|libraries)(\/|$)/i.test(path)) {
    return 'library'
  }
  if (/(header|version|source|author|metadata|property|properties)/.test(haystack)) {
    return hasProperty(properties, ['Name', 'Pins', 'Footprint', 'Padstack']) ? 'property' : 'metadata'
  }

  if (type === 'olb') {
    if (/(^|\/)(symbols?|parts?)(\/|$)/.test(haystack) || hasProperty(properties, ['Pins', 'Footprint', 'PCB Footprint', 'Part Number'])) {
      return 'symbol'
    }
    if (/(^|\/)(library|capture|orcad)(\/|$)/.test(haystack)) {
      return 'library'
    }
  }

  if (type === 'dra') {
    if (/(padstack|pad stack|thermal|antipad|drill)/.test(haystack) || hasProperty(properties, ['Padstack', 'Drill'])) {
      return 'padstack'
    }
    if (/(footprint|package|psm|bsm|fsm|ssm|symbol)/.test(haystack)) {
      return 'footprint'
    }
    if (/(route|net|via|ratsnest)/.test(haystack)) {
      return 'net'
    }
    if (/(line |arc |circle|shape|outline|silk|place_bound|assembly|soldermask|pastemask)/.test(haystack)) {
      return 'geometry'
    }
    if (/(drawing|units|layers?|constraint|allegro)/.test(haystack) || hasProperty(properties, ['Units', 'Layers'])) {
      return 'drawing'
    }
  }

  if (type === 'gds' || type === 'oas' || type === 'oasis') {
    if (/(cell|structure|strname|sref|aref|boundary|path|polygon|layer|datatype|text|xy|gds|oas|oasis|layout)/.test(haystack)) {
      return 'geometry'
    }
    if (/(library|libname|units|precision|technology|property|properties)/.test(haystack)) {
      return 'metadata'
    }
  }

  if (properties.length) {
    return 'property'
  }
  return kind === 'storage' ? 'library' : 'unknown'
}

const buildStreamView = (type: EdaFileType, path: string, name: string, size: number, kind: EdaStreamKind, bytes?: Uint8Array): EdaStreamView => {
  if (kind === 'storage' || !bytes) {
    const role = roleFromText(type, path, name, '', [], [], kind)
    return { path, name, size, kind, role, strings: [], properties: [] }
  }

  const sample = looksLikeText(bytes) ? decodeSample(bytes) : ''
  const strings = collectStrings([bytes], MAX_STREAM_STRINGS)
  const properties = extractProperties(sample, strings, path)
  const role = roleFromText(type, path, name, sample, strings, properties, sample ? 'text' : 'binary')
  return {
    path,
    name,
    size,
    kind: sample ? 'text' : 'binary',
    role,
    sample,
    hex: sample ? undefined : hexPreview(bytes),
    strings,
    properties
  }
}

const sortTree = (node: EdaTreeNode) => {
  node.children.sort((left, right) => {
    if (left.children.length !== right.children.length) {
      return right.children.length - left.children.length
    }
    return left.name.localeCompare(right.name)
  })
  node.children.forEach(sortTree)
}

const buildTree = (streams: EdaStreamView[], type: EdaFileType) => {
  const root: EdaTreeNode = {
    id: `${type}:root`,
    path: '/',
    name: type.toUpperCase(),
    kind: 'storage',
    role: 'root',
    size: 0,
    children: []
  }
  const nodes = new Map<string, EdaTreeNode>([['/', root]])

  streams.forEach(stream => {
    const parts = stream.path.split('/').filter(Boolean)
    let parent = root
    let currentPath = ''
    parts.forEach((part, index) => {
      currentPath += `/${part}`
      const isLeaf = index === parts.length - 1
      let node = nodes.get(currentPath)
      if (!node) {
        node = {
          id: `${type}:${currentPath}`,
          path: currentPath,
          name: part,
          kind: isLeaf ? stream.kind : 'storage',
          role: isLeaf ? stream.role : roleFromText(type, currentPath, part, '', [], [], 'storage'),
          size: isLeaf ? stream.size : 0,
          children: []
        }
        nodes.set(currentPath, node)
        parent.children.push(node)
      }
      if (isLeaf) {
        node.kind = stream.kind
        node.role = stream.role
        node.size = stream.size
      }
      parent = node
    })
  })

  sortTree(root)
  return root.children
}

const splitListValue = (value?: string) => {
  if (!value) {
    return []
  }
  const result: string[] = []
  value.split(/[,/;| ]+/).forEach(item => {
    if (/^[A-Za-z0-9_.+-]+$/.test(item)) {
      uniquePush(result, item, 64)
    }
  })
  return result
}

const entityRoleForStream = (stream: EdaStreamView, type: EdaFileType): EdaDomainRole | null => {
  if (type === 'olb') {
    return stream.role === 'symbol' && stream.kind !== 'storage' ? 'symbol' : null
  }
  if (type === 'gds' || type === 'oas' || type === 'oasis') {
    return stream.role === 'geometry' || stream.role === 'metadata' ? 'drawing' : null
  }
  if (stream.role === 'padstack') {
    return 'padstack'
  }
  if (stream.role === 'footprint' || (stream.role === 'geometry' && /\/footprint\//i.test(stream.path))) {
    return 'footprint'
  }
  if (stream.role === 'drawing') {
    return 'drawing'
  }
  return null
}

const streamEntityPath = (stream: EdaStreamView, role: EdaDomainRole) => {
  if (role === 'footprint') {
    const match = stream.path.match(/^(.+?\/Footprint)(?:\/|$)/i)
    return match?.[1] || stream.path
  }
  if (role === 'drawing') {
    const match = stream.path.match(/^(.+?\/Drawing)(?:\/|$)/i)
    return match?.[1] || stream.path
  }
  return stream.path
}

const inferEntityName = (stream: EdaStreamView, role: EdaDomainRole, entityPath: string) => {
  const propertyName = getPropertyValue(stream.properties, [
    'Name',
    'Part',
    'Part Name',
    'Symbol',
    'Device',
    'Footprint',
    'PCB Footprint',
    'Package',
    'Padstack',
    'Pad Stack',
    'Drawing'
  ])
  if (propertyName) {
    return propertyName
  }
  const pathName = stripExtension(lastPathPart(entityPath))
  if (pathName && pathName !== '/') {
    return pathName
  }
  return role.toUpperCase()
}

const roleKeywords = (stream: EdaStreamView, role: EdaDomainRole) => {
  const keywords: string[] = []
  const text = `${stream.path}\n${stream.sample || ''}\n${stream.strings.join('\n')}`.toLowerCase()
  const domainWords = role === 'symbol'
    ? ['pins', 'footprint', 'pspice', 'part', 'symbol']
    : ['units', 'layers', 'padstack', 'drill', 'outline', 'route', 'constraint', 'shape', 'place_bound']
  domainWords.forEach(word => {
    if (text.includes(word)) {
      uniquePush(keywords, word, 12)
    }
  })
  return keywords
}

const appendUniqueProperties = (target: EdaProperty[], properties: EdaProperty[]) => {
  const seen = new Set(target.map(property => `${property.key.toLowerCase()}\u0000${property.value}`))
  properties.forEach(property => {
    const identity = `${property.key.toLowerCase()}\u0000${property.value}`
    if (seen.has(identity)) {
      return
    }
    seen.add(identity)
    target.push(property)
  })
}

const collectEntities = (streams: EdaStreamView[], type: EdaFileType) => {
  const entities = new Map<string, EdaEntity>()
  streams.forEach(stream => {
    const role = entityRoleForStream(stream, type)
    if (!role) {
      return
    }
    const entityPath = streamEntityPath(stream, role)
    const key = `${role}:${entityPath.toLowerCase()}`
    const existing = entities.get(key)
    const entity = existing || {
      id: key,
      name: inferEntityName(stream, role, entityPath),
      role,
      path: entityPath,
      streamCount: 0,
      byteLength: 0,
      properties: [],
      pins: [],
      layers: [],
      keywords: []
    }

    entity.streamCount += 1
    entity.byteLength += stream.size
    appendUniqueProperties(entity.properties, stream.properties)
    splitListValue(getPropertyValue(stream.properties, ['Pins', 'Pin', 'Pin Numbers'])).forEach(pin => uniquePush(entity.pins, pin, 96))
    splitListValue(getPropertyValue(stream.properties, ['Layers', 'Layer'])).forEach(layer => uniquePush(entity.layers, layer, 64))
    roleKeywords(stream, role).forEach(keyword => uniquePush(entity.keywords, keyword, 16))

    entity.description ||= getPropertyValue(entity.properties, ['Description', 'Desc'])
    entity.footprint ||= getPropertyValue(entity.properties, ['Footprint', 'PCB Footprint', 'Package'])
    entities.set(key, entity)
  })

  return Array.from(entities.values()).sort((left, right) => {
    const roleOrder: Record<string, number> = { symbol: 0, footprint: 1, padstack: 2, drawing: 3 }
    const order = (roleOrder[left.role] ?? 9) - (roleOrder[right.role] ?? 9)
    return order || left.name.localeCompare(right.name)
  })
}

const collectMetadata = (streams: EdaStreamView[]) => {
  const metadata: EdaProperty[] = []
  streams.forEach(stream => {
    if (stream.role === 'metadata' || stream.role === 'library' || stream.role === 'drawing') {
      appendUniqueProperties(metadata, stream.properties)
    }
  })
  return metadata.slice(0, 80)
}

const buildStats = (
  streams: EdaStreamView[],
  entities: EdaEntity[],
  strings: string[],
  parser: EdaParserMode,
  layout?: EdaLayoutPreview
): EdaStats => {
  const stats = {
    textStreams: streams.filter(stream => stream.kind === 'text').length,
    binaryStreams: streams.filter(stream => stream.kind === 'binary').length,
    storageEntries: streams.filter(stream => stream.kind === 'storage').length,
    propertyCount: streams.reduce((sum, stream) => sum + stream.properties.length, 0),
    stringCount: strings.length,
    symbolCount: entities.filter(entity => entity.role === 'symbol').length,
    footprintCount: entities.filter(entity => entity.role === 'footprint').length,
    padstackCount: entities.filter(entity => entity.role === 'padstack').length,
    confidence: 'low' as EdaStats['confidence']
  }

  if (layout?.elements.length) {
    stats.confidence = 'high'
  } else if (parser === 'cfb' && entities.length && stats.propertyCount) {
    stats.confidence = 'high'
  } else if (parser === 'cfb' || strings.length || stats.propertyCount) {
    stats.confidence = 'medium'
  }
  return stats
}

const buildDiagnostics = (
  type: EdaFileType,
  parser: EdaParserMode,
  streams: EdaStreamView[],
  entities: EdaEntity[],
  strings: string[],
  warnings: string[],
  layout: EdaLayoutPreview | undefined,
  locale: EdaParserLocale
): EdaDiagnostic[] => {
  const diagnostics: EdaDiagnostic[] = warnings.map((message, index) => ({
    level: 'warning',
    code: `warning-${index + 1}`,
    message
  }))

  diagnostics.push({
    level: 'info',
    code: 'parser',
    message: layout
      ? layout.format === 'oasis'
        ? getEdaParserText(locale, 'oasisFixture')
        : getEdaParserText(locale, 'gdsLayout')
      : parser === 'cfb'
      ? getEdaParserText(locale, 'cfbContainer')
      : getEdaParserText(locale, 'binaryIndex')
  })
  diagnostics.push({
    level: 'info',
    code: 'coverage',
    message: getEdaParserText(locale, 'coverage', {
      streams: streams.length,
      strings: strings.length,
      entities: entities.length,
    })
  })
  if (layout) {
    diagnostics.push({
      level: 'info',
      code: `${layout.format}-layout`,
      message: getEdaParserText(locale, 'layout', {
        layout: getEdaParserText(
          locale,
          layout.format === 'oasis' ? 'layoutOasisName' : 'layoutGdsName'
        ),
        structures: layout.structureCount,
        elements: layout.elements.length,
      })
    })
  }

  const needsSymbol = type === 'olb' && !entities.some(entity => entity.role === 'symbol')
  const needsFootprint = type === 'dra' && !entities.some(entity => entity.role === 'footprint' || entity.role === 'padstack')
  const needsLayout = (type === 'gds' || type === 'oas' || type === 'oasis') && !layout && !entities.some(entity => entity.role === 'drawing')
  if (needsSymbol || needsFootprint || needsLayout) {
    diagnostics.push({
      level: 'warning',
      code: 'domain-candidates',
      message: type === 'olb'
        ? getEdaParserText(locale, 'noSymbol')
        : type === 'dra'
          ? getEdaParserText(locale, 'noFootprint')
          : type === 'gds'
            ? getEdaParserText(locale, 'noGds')
            : getEdaParserText(locale, 'noOasis')
    })
  }

  return diagnostics
}

const assembleResult = (
  buffer: ArrayBuffer,
  type: EdaFileType,
  parser: EdaParserMode,
  streamCount: number,
  streams: EdaStreamView[],
  strings: string[],
  warnings: string[],
  layout: EdaLayoutPreview | undefined,
  locale: EdaParserLocale
): EdaParseResult => {
  const totalStreamBytes = streams.reduce((sum, stream) => sum + stream.size, 0)
  const entities = collectEntities(streams, type)
  const metadata = collectMetadata(streams)
  const diagnostics = buildDiagnostics(type, parser, streams, entities, strings, warnings, layout, locale)
  return {
    type,
    parser,
    title: type === 'olb'
      ? getEdaParserText(
          locale,
          parser === 'cfb' ? 'titleOrcadSymbolLibrary' : 'titleOlbBinaryLibrary'
        )
      : type === 'dra'
        ? getEdaParserText(
            locale,
            parser === 'cfb' ? 'titleOrcadDrawingLibrary' : 'titleDraBinaryDrawing'
          )
        : getEdaParserText(locale, 'titleLayoutStructure', { type: type.toUpperCase() }),
    byteLength: buffer.byteLength,
    streamCount,
    totalStreamBytes,
    streams,
    tree: buildTree(streams, type),
    entities,
    metadata,
    strings,
    warnings,
    diagnostics,
    stats: buildStats(streams, entities, strings, parser, layout),
    layout
  }
}

const parseCfbContainer = async (
  buffer: ArrayBuffer,
  type: EdaFileType,
  locale: EdaParserLocale
): Promise<EdaParseResult> => {
  const CFB = await import('cfb')
  const container = CFB.parse(toBytes(buffer), { type: 'array' })
  const streamEntries = container.FileIndex
    .map((entry, index) => ({ entry, path: container.FullPaths[index] || entry.name }))
    .filter(item => item.entry.type !== 5 && item.path !== '/' && item.entry.name)
    .slice(0, MAX_STREAMS)

  const byteChunks: Uint8Array[] = []
  const streams = streamEntries.map(({ entry, path }) => {
    if (entry.type === 1) {
      return buildStreamView(type, path, entry.name, entry.size || 0, 'storage')
    }
    const content = normalizeBytes(entry.content || [])
    byteChunks.push(content)
    return buildStreamView(type, path, entry.name, entry.size || content.byteLength || 0, 'binary', content)
  })

  const warnings = streamEntries.length >= MAX_STREAMS
    ? [getEdaParserText(locale, 'maxStreams', { count: MAX_STREAMS })]
    : []

  return assembleResult(buffer, type, 'cfb', container.FileIndex.length, streams, collectStrings(byteChunks), warnings, undefined, locale)
}

const parseBinaryFallback = (
  buffer: ArrayBuffer,
  type: EdaFileType,
  locale: EdaParserLocale
): EdaParseResult => {
  const bytes = toBytes(buffer)
  const stream = buildStreamView(type, `${type}.${type}`, `${type}.${type}`, buffer.byteLength, 'binary', bytes)
  const layout = type === 'gds'
    ? parseGdsLayout(bytes)
    : type === 'oas' || type === 'oasis'
      ? parseOasisTextLayout(bytes)
      : undefined
  const oasis = type === 'oas' || type === 'oasis' ? inspectOasisLayout(bytes) : undefined
  const warnings = layout
    ? layout.warnings
    : oasis
      ? oasis.warnings
      : [getEdaParserText(locale, 'binaryFallback')]
  return assembleResult(buffer, type, 'binary', 1, [stream], collectStrings([bytes]), warnings, layout, locale)
}

export const parseEdaFile = async (
  buffer: ArrayBuffer,
  type = 'olb',
  options: { locale?: EdaParserLocale } = {}
) => {
  const locale = options.locale || 'zh-CN'
  const normalizedType: EdaFileType = type === 'dra'
    ? 'dra'
    : type === 'gds' || type === 'oas' || type === 'oasis'
      ? type
      : 'olb'
  const bytes = toBytes(buffer)
  if (!isOrcadCompoundFile(bytes)) {
    return parseBinaryFallback(buffer, normalizedType, locale)
  }
  try {
    return await parseCfbContainer(buffer, normalizedType, locale)
  } catch (error) {
    const fallback = parseBinaryFallback(buffer, normalizedType, locale)
    fallback.warnings.unshift(error instanceof Error ? error.message : String(error))
    fallback.diagnostics.unshift({
      level: 'warning',
      code: 'cfb-parse-failed',
      message: error instanceof Error ? error.message : String(error)
    })
    return fallback
  }
}
