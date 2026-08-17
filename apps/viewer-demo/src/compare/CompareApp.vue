<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { ChevronDown, ChevronUp, Search, X } from '@lucide/vue'
import { FileViewer } from '@file-viewer/vue3'
import { allRenderers } from '@file-viewer/preset-all'
import { normalizeFileViewerLocale } from '@file-viewer/core'
import type {
  FileViewerFileRef as FileRef,
  FileViewerLifecycleContext,
  FileViewerOptions,
  FileViewerPublicApi as FileViewerExpose,
  FileViewerSearchState
} from '@file-viewer/core'
import brandLogo from '@/assets/logo.png'
import { useSynchronizedScroll } from './useSynchronizedScroll'
import {
  buildDocumentTextDiff,
  extractComparableDocumentText,
  type TextDiffResult,
} from './textDiff'

type CompareSide = 'left' | 'right'
type DemoLocale = 'zh-CN' | 'en-US' | 'ja-JP'

interface CompareSample {
  label: string;
  description: string;
  url: string;
}

interface ComparePanelState {
  side: CompareSide;
  title: string;
  url: string;
  file?: FileRef;
  filename: string;
  status: string;
}

type FileViewerPublicApi = ComponentPublicInstance & FileViewerExpose

const params = new URLSearchParams(window.location.search)
const DEMO_LOCALE_STORAGE_KEY = 'file-viewer-demo-locale'

const normalizeDemoLocale = (value?: string | null): DemoLocale => {
  return normalizeFileViewerLocale(value || 'auto')
}

const resolveInitialDemoLocale = (): DemoLocale => {
  const explicitLocale = params.get('locale') || params.get('lang')
  if (explicitLocale) {
    return normalizeDemoLocale(explicitLocale)
  }
  const storedLocale = window.localStorage.getItem(DEMO_LOCALE_STORAGE_KEY)
  if (storedLocale) {
    return normalizeDemoLocale(storedLocale)
  }
  return normalizeDemoLocale('auto')
}

const compareLocale = ref<DemoLocale>(resolveInitialDemoLocale())

const compareCopyMap: Record<DemoLocale, Record<string, string>> = {
  'zh-CN': {
    backHome: '返回 File Viewer 主预览',
    pageTitle: 'File Viewer 文档比对',
    pageDescription: 'File Viewer 独立文档比对入口，支持 DOCX 等文档文本提取、逐行对齐和字符级差异视图。',
    title: '文档比对',
    subtitle: '左右并排预览，并可提取文档文字生成逐行对齐、字符级标记的真实差异视图。',
    leftPanel: '左侧文档',
    rightPanel: '右侧文档',
    lineLocator: '行级定位',
    linePlaceholder: '行号',
    locate: '定位',
    syncScroll: '同步滚动',
    hidePdfToolbar: '隐藏 PDF 工具栏',
    swap: '交换',
    reset: '重置',
    compareSearch: '文档比对搜索',
    searchCurrent: '搜索当前文档',
    previousSearchResult: '上一个搜索结果',
    nextSearchResult: '下一个搜索结果',
    closeSearch: '关闭搜索',
    boardLabel: '文档左右比对',
    sample: '示例',
    uploadFile: '上传文件',
    localFile: '本地文件',
    localUpload: '本地上传',
    urlFile: 'URL 文件',
    unselected: '未选择',
    statusReady: '准备就绪',
    statusWaiting: '等待加载',
    statusNoFile: '未选择文件',
    statusLoading: '加载中',
    statusComplete: '已完成',
    statusUnloaded: '已卸载',
    aiChunks: '{count} 个切片',
    language: '语言',
    textDiff: '文字对比',
    closeTextDiff: '返回并排预览',
    textDiffTitle: '文字差异视图',
    textDiffDescription: '使用 jsdiff 对文档提取文字逐行对齐，并在修改行内标出具体字符。',
    textDiffRefresh: '重新对比',
    textDiffRunning: '正在提取并比较两侧文档文字…',
    textDiffNoText: '至少一侧没有可提取文字。请等待文档加载完成；扫描 PDF 需要先做 OCR。',
    textDiffPdfPartial: 'PDF 文本层尚未覆盖全部页面，已停止对比以避免展示不完整结果。完整 PDF 提取会在后续阶段继续实现。',
    textDiffTooLarge: '文档文字超出交互对比上限，请缩小文档范围后重试。',
    textDiffFailed: '文字对比失败，请检查两侧文档是否已完整加载。',
    textDiffPdfNotice: 'PDF 文字对比仍为实验能力：结果取决于 PDF 文本层顺序，扫描 PDF 暂不包含 OCR。',
    diffAdded: '新增',
    diffRemoved: '删除',
    diffChanged: '修改',
    diffUnchanged: '未变化',
    previousChange: '上一处差异',
    nextChange: '下一处差异',
    noDifferences: '两侧提取文字完全一致。',
    showOnlyChanges: '只看差异',
    diffEngine: 'jsdiff 字符级算法'
  },
  'en-US': {
    backHome: 'Back to File Viewer demo',
    pageTitle: 'File Viewer Document Compare',
    pageDescription: 'Standalone File Viewer document comparison with extracted text, aligned lines, and character-level changes.',
    title: 'Document Compare',
    subtitle: 'Preview files side by side, then extract their text into an aligned character-level diff.',
    leftPanel: 'Left document',
    rightPanel: 'Right document',
    lineLocator: 'Line locator',
    linePlaceholder: 'Line',
    locate: 'Go',
    syncScroll: 'Sync scroll',
    hidePdfToolbar: 'Hide PDF toolbar',
    swap: 'Swap',
    reset: 'Reset',
    compareSearch: 'Document compare search',
    searchCurrent: 'Search current document',
    previousSearchResult: 'Previous search result',
    nextSearchResult: 'Next search result',
    closeSearch: 'Close search',
    boardLabel: 'Side-by-side document comparison',
    sample: 'Sample',
    uploadFile: 'Upload file',
    localFile: 'Local file',
    localUpload: 'Local upload',
    urlFile: 'URL file',
    unselected: 'Not selected',
    statusReady: 'Ready',
    statusWaiting: 'Waiting',
    statusNoFile: 'No file selected',
    statusLoading: 'Loading',
    statusComplete: 'Completed',
    statusUnloaded: 'Unloaded',
    aiChunks: '{count} chunks',
    language: 'Language',
    textDiff: 'Text diff',
    closeTextDiff: 'Back to previews',
    textDiffTitle: 'Text difference view',
    textDiffDescription: 'jsdiff aligns extracted document text by line and marks exact characters inside changed lines.',
    textDiffRefresh: 'Compare again',
    textDiffRunning: 'Extracting and comparing both documents…',
    textDiffNoText: 'At least one side has no extractable text. Wait for loading to finish; scanned PDFs need OCR first.',
    textDiffPdfPartial: 'The PDF text layer does not cover every page, so comparison stopped instead of showing a partial result. Full-PDF extraction is the next stage.',
    textDiffTooLarge: 'The extracted text exceeds the interactive comparison limit. Compare a smaller document range.',
    textDiffFailed: 'Text comparison failed. Check that both documents finished loading.',
    textDiffPdfNotice: 'PDF text comparison is experimental: order follows the PDF text layer, and scanned PDFs do not run OCR yet.',
    diffAdded: 'Added',
    diffRemoved: 'Removed',
    diffChanged: 'Changed',
    diffUnchanged: 'Unchanged',
    previousChange: 'Previous change',
    nextChange: 'Next change',
    noDifferences: 'The extracted text is identical.',
    showOnlyChanges: 'Changes only',
    diffEngine: 'jsdiff character algorithm'
  },
  'ja-JP': {
    backHome: 'File Viewer メインプレビューへ戻る',
    pageTitle: 'File Viewer 文書比較',
    pageDescription: '抽出テキストの行揃えと文字単位の差分表示に対応した File Viewer 文書比較 Demo。',
    title: '文書比較',
    subtitle: '左右でプレビューし、抽出した文書テキストを行揃えして文字単位で比較します。',
    leftPanel: '左の文書',
    rightPanel: '右の文書',
    lineLocator: '行へ移動',
    linePlaceholder: '行番号',
    locate: '移動',
    syncScroll: 'スクロールを同期',
    hidePdfToolbar: 'PDF ツールバーを隠す',
    swap: '入れ替え',
    reset: 'リセット',
    compareSearch: '文書比較検索',
    searchCurrent: '現在の文書を検索',
    previousSearchResult: '前の検索結果',
    nextSearchResult: '次の検索結果',
    closeSearch: '検索を閉じる',
    boardLabel: '左右文書比較',
    sample: 'サンプル',
    uploadFile: 'ファイルをアップロード',
    localFile: 'ローカルファイル',
    localUpload: 'ローカルアップロード',
    urlFile: 'URL ファイル',
    unselected: '未選択',
    statusReady: '準備完了',
    statusWaiting: '読み込み待ち',
    statusNoFile: 'ファイルが選択されていません',
    statusLoading: '読み込み中',
    statusComplete: '完了',
    statusUnloaded: 'アンロード済み',
    aiChunks: '{count} チャンク',
    language: '言語',
    textDiff: 'テキスト差分',
    closeTextDiff: '左右プレビューへ戻る',
    textDiffTitle: 'テキスト差分ビュー',
    textDiffDescription: 'jsdiff で抽出テキストを行ごとに揃え、変更行の文字差分を表示します。',
    textDiffRefresh: '再比較',
    textDiffRunning: '両方の文書からテキストを抽出して比較しています…',
    textDiffNoText: '少なくとも片方に抽出可能なテキストがありません。読み込み完了を待ってください。スキャン PDF には OCR が必要です。',
    textDiffPdfPartial: 'PDF テキストレイヤーが全ページをカバーしていないため、不完全な結果を表示せず比較を停止しました。PDF 全体抽出は次の段階です。',
    textDiffTooLarge: '抽出テキストが対話型比較の上限を超えています。範囲を小さくしてください。',
    textDiffFailed: 'テキスト比較に失敗しました。両方の文書が読み込み済みか確認してください。',
    textDiffPdfNotice: 'PDF テキスト比較は実験的です。順序は PDF テキストレイヤーに依存し、スキャン PDF の OCR はまだ実行しません。',
    diffAdded: '追加',
    diffRemoved: '削除',
    diffChanged: '変更',
    diffUnchanged: '変更なし',
    previousChange: '前の差分',
    nextChange: '次の差分',
    noDifferences: '抽出テキストは同一です。',
    showOnlyChanges: '差分のみ',
    diffEngine: 'jsdiff 文字単位アルゴリズム'
  }
}

const compareCopy = computed(() => compareCopyMap[compareLocale.value])

const formatCompareCopy = (key: string, params: Record<string, string | number> = {}) => {
  return Object.entries(params).reduce(
    (message, [name, value]) => message.replaceAll(`{${name}}`, String(value)),
    compareCopy.value[key] || key
  )
}

const samplesByLocale: Record<DemoLocale, CompareSample[]> = {
  'zh-CN': [
    { label: 'DOC 旧版合同', description: 'Word 97-2003 示例', url: '/example/test.doc' },
    { label: 'DOCX 中文长文档', description: '表格图示与正式页', url: '/example/word.docx' },
    { label: 'PDF 技术说明', description: '真实 PDF 页面', url: '/example/pdf.pdf' },
    { label: 'PowerPoint 97–2003', description: '25 页传统二进制演示稿', url: '/example/office-demo.ppt' },
    { label: 'NASA 月球战略 PPTX', description: '20 页专业演示稿', url: '/example/ppt.pptx' },
    { label: 'Typst 源文件', description: 'Typst 直读渲染', url: '/example/report.typ' },
    { label: 'Markdown 文档', description: '轻量文本排版', url: '/example/markdown.md' }
  ],
  'en-US': [
    { label: 'DOCX rich document', description: 'Open English DOCX sample', url: '/example/en/calibre-demo.docx' },
    { label: 'PDF publication', description: 'Real PDF pages with artwork', url: '/example/en/prince-sample.pdf' },
    { label: 'Excel workbook', description: 'Microsoft financial workbook', url: '/example/en/financial-sample.xlsx' },
    { label: 'PowerPoint 97–2003', description: '25-slide binary presentation', url: '/example/office-demo.ppt' },
    { label: 'NASA lunar strategy PPTX', description: 'Professional public NASA deck', url: '/example/en/sample-presentation.pptx' },
    { label: 'Typst source', description: 'Local Typst rendering sample', url: '/example/report.typ' },
    { label: 'Markdown document', description: 'Lightweight rich text layout', url: '/example/en/markdown.md' }
  ],
  'ja-JP': [
    { label: 'DOCX リッチ文書', description: '英語 DOCX サンプルを日本語 UI で表示', url: '/example/en/calibre-demo.docx' },
    { label: 'PDF 出版物', description: '図版を含む実際の PDF ページ', url: '/example/en/prince-sample.pdf' },
    { label: 'Excel ワークブック', description: 'Microsoft 財務ワークブック', url: '/example/en/financial-sample.xlsx' },
    { label: 'PowerPoint 97–2003', description: '25 スライドのバイナリプレゼンテーション', url: '/example/office-demo.ppt' },
    { label: 'NASA 月面戦略 PPTX', description: '公開されている専門的な NASA スライド', url: '/example/en/sample-presentation.pptx' },
    { label: 'Typst ソース', description: 'ローカル Typst レンダリングサンプル', url: '/example/report.typ' },
    { label: 'Markdown 文書', description: '軽量リッチテキストレイアウト', url: '/example/en/markdown.md' }
  ]
}

const samples = computed(() => samplesByLocale[compareLocale.value])
const initialSamples = samplesByLocale[compareLocale.value]

const createPanel = (side: CompareSide, title: string, fallbackUrl: string): ComparePanelState => ({
  side,
  title,
  url: params.get(side) || fallbackUrl,
  file: undefined,
  filename: '',
  status: compareCopy.value.statusReady
})

const leftPanel = reactive(createPanel('left', compareCopy.value.leftPanel, initialSamples[0].url))
const rightPanel = reactive(createPanel('right', compareCopy.value.rightPanel, initialSamples[1].url))
const syncScrollEnabled = ref(true)
const comparePdfToolbarHidden = ref(true)
const compareSearchOpen = ref(false)
const compareSearchQuery = ref('')
const compareSearchInputRef = ref<HTMLInputElement | null>(null)
const compareLineTarget = ref('')
const activeCompareSide = ref<CompareSide>('left')
const leftViewerRef = ref<FileViewerPublicApi | null>(null)
const rightViewerRef = ref<FileViewerPublicApi | null>(null)
const panelLoaded = reactive<Record<CompareSide, boolean>>({ left: false, right: false })
const textDiffOpen = ref(false)
const textDiffStatus = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const textDiffMessage = ref('')
const textDiffResult = ref<TextDiffResult | null>(null)
const textDiffOnlyChanges = ref(false)
const activeTextDiffChange = ref(-1)
const textDiffBodyRef = ref<HTMLElement | null>(null)
let textDiffRunId = 0

const createEmptySearchState = (): FileViewerSearchState => ({
  query: '',
  total: 0,
  currentIndex: -1,
  current: null,
  matches: []
})

const leftSearchState = ref<FileViewerSearchState>(createEmptySearchState())
const rightSearchState = ref<FileViewerSearchState>(createEmptySearchState())

const getPanelTitle = (side: CompareSide) => {
  return side === 'left' ? compareCopy.value.leftPanel : compareCopy.value.rightPanel
}

const activeSideLabel = computed(() => getPanelTitle(activeCompareSide.value))

const activeSearchState = computed(() => {
  return activeCompareSide.value === 'left' ? leftSearchState.value : rightSearchState.value
})

const viewerOptions = computed<FileViewerOptions>(() => ({
  renderers: allRenderers,
  toolbar: false,
  archive: {
    cache: true
  },
  locale: compareLocale.value,
  pdf: {
    toolbar: !comparePdfToolbarHidden.value,
    defaultNavigationVisible: false
  },
  ai: {
    enabled: true,
    collectText: true
  }
}))

const uploadAccept = [
  '.doc', '.docx', '.docm', '.dot', '.dotx', '.dotm',
  '.pdf', '.ofd', '.typ', '.typst', '.ppt', '.pptx', '.pptm', '.potx', '.potm', '.ppsx', '.ppsm',
  '.xls', '.xlsx', '.xlsm', '.xlsb', '.xlt', '.xltx', '.xltm', '.csv', '.tsv', '.ods', '.md', '.markdown', '.txt', '.html',
  '.htm', '.eml', '.msg', '.epub', '.umd', '.png', '.jpg', '.jpeg'
].join(',')

const sampleByUrl = computed(() => {
  return new Map(samples.value.map(sample => [sample.url, sample]))
})

const getPanelSourceLabel = (panel: ComparePanelState) => {
  if (panel.file) {
    return panel.filename || compareCopy.value.localFile
  }
  return sampleByUrl.value.get(panel.url)?.label || panel.url || compareCopy.value.unselected
}

const getPanelDescription = (panel: ComparePanelState) => {
  if (panel.file) {
    return compareCopy.value.localUpload
  }
  return sampleByUrl.value.get(panel.url)?.description || compareCopy.value.urlFile
}

const isPdfPanel = (panel: ComparePanelState) => {
  const value = panel.filename || panel.url
  return /\.pdf(?:$|[?#])/i.test(value || '')
}

const textDiffContainsPdf = computed(() => isPdfPanel(leftPanel) || isPdfPanel(rightPanel))
const visibleTextDiffRows = computed(() => {
  const rows = textDiffResult.value?.rows || []
  return textDiffOnlyChanges.value ? rows.filter(row => row.kind !== 'equal') : rows
})
const textDiffChangeRows = computed(() => (
  (textDiffResult.value?.rows || []).filter(row => row.kind !== 'equal')
))
const textDiffChangePosition = computed(() => {
  const total = textDiffChangeRows.value.length
  return total && activeTextDiffChange.value >= 0
    ? `${activeTextDiffChange.value + 1}/${total}`
    : `0/${total}`
})

const selectSample = (panel: ComparePanelState, url: string) => {
  panel.url = url
  panel.file = undefined
  panel.filename = ''
  panel.status = compareCopy.value.statusWaiting
}

const handleUrlInput = (panel: ComparePanelState) => {
  panel.file = undefined
  panel.filename = ''
  panel.status = panel.url ? compareCopy.value.statusWaiting : compareCopy.value.statusNoFile
}

const getEventValue = (event: Event) => {
  return (event.target as HTMLInputElement | HTMLSelectElement | null)?.value || ''
}

const handleUpload = (panel: ComparePanelState, event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }
  panel.file = file
  panel.filename = file.name
  panel.url = ''
  panel.status = compareCopy.value.statusWaiting
  input.value = ''
}

const swapPanels = () => {
  const leftSnapshot = {
    url: leftPanel.url,
    file: leftPanel.file,
    filename: leftPanel.filename,
    status: leftPanel.status
  }
  leftPanel.url = rightPanel.url
  leftPanel.file = rightPanel.file
  leftPanel.filename = rightPanel.filename
  leftPanel.status = rightPanel.status
  rightPanel.url = leftSnapshot.url
  rightPanel.file = leftSnapshot.file
  rightPanel.filename = leftSnapshot.filename
  rightPanel.status = leftSnapshot.status
}

const resetSamples = () => {
  selectSample(leftPanel, samples.value[0].url)
  selectSample(rightPanel, samples.value[1].url)
}

const setViewerRef = (side: CompareSide, element: Element | ComponentPublicInstance | null) => {
  if (side === 'left') {
    leftViewerRef.value = element as FileViewerPublicApi | null
  } else {
    rightViewerRef.value = element as FileViewerPublicApi | null
  }
}

const getViewerScroller = (side: CompareSide) => {
  const viewer = side === 'left' ? leftViewerRef.value : rightViewerRef.value
  return viewer?.getScrollContainer?.() || null
}

const { bind: bindScrollSync } = useSynchronizedScroll(
  syncScrollEnabled,
  () => getViewerScroller('left'),
  () => getViewerScroller('right')
)

const compareSearchSummary = computed(() => {
  if (!compareSearchQuery.value.trim()) {
    return `${activeSideLabel.value} · 0/0`
  }
  const format = (state: FileViewerSearchState) => {
    return state.total ? `${state.currentIndex + 1}/${state.total}` : '0/0'
  }
  return `${activeSideLabel.value} · ${format(activeSearchState.value)}`
})

const setActivePanel = (side: CompareSide) => {
  activeCompareSide.value = side
}

const getActiveViewer = () => {
  return activeCompareSide.value === 'left' ? leftViewerRef.value : rightViewerRef.value
}

const setActiveSearchState = (state: FileViewerSearchState) => {
  if (activeCompareSide.value === 'left') {
    leftSearchState.value = state
  } else {
    rightSearchState.value = state
  }
}

const openCompareSearch = async (side = activeCompareSide.value) => {
  activeCompareSide.value = side
  compareSearchOpen.value = true
  await nextTick()
  compareSearchInputRef.value?.focus()
  compareSearchInputRef.value?.select()
}

const clearActiveCompareSearch = async () => {
  const state = await getActiveViewer()?.clearDocumentSearch() ?? createEmptySearchState()
  setActiveSearchState(state)
  return state
}

const closeCompareSearch = async () => {
  compareSearchOpen.value = false
  await clearActiveCompareSearch()
}

const runCompareSearch = async () => {
  const query = compareSearchQuery.value.trim()
  if (!query) {
    await clearActiveCompareSearch()
    return
  }

  const state = await getActiveViewer()?.searchDocument(query) ?? createEmptySearchState()
  setActiveSearchState(state)
}

const nextCompareSearch = async () => {
  if (!compareSearchQuery.value.trim()) {
    return
  }
  if (activeSearchState.value.query !== compareSearchQuery.value.trim()) {
    await runCompareSearch()
    return
  }
  const state = await getActiveViewer()?.nextSearchResult() ?? activeSearchState.value
  setActiveSearchState(state)
}

const previousCompareSearch = async () => {
  if (!compareSearchQuery.value.trim()) {
    return
  }
  if (activeSearchState.value.query !== compareSearchQuery.value.trim()) {
    await runCompareSearch()
    return
  }
  const state = await getActiveViewer()?.previousSearchResult() ?? activeSearchState.value
  setActiveSearchState(state)
}

const goToCompareLine = async () => {
  const line = Number.parseInt(compareLineTarget.value, 10)
  if (!Number.isFinite(line) || line <= 0) {
    return
  }
  await Promise.all([
    leftViewerRef.value?.scrollToLine(line),
    rightViewerRef.value?.scrollToLine(line)
  ])
}

const getAiChunkCount = (side: CompareSide) => {
  const viewer = side === 'left' ? leftViewerRef.value : rightViewerRef.value
  return viewer?.getDocumentTextChunks?.().length || 0
}

const isLocalPlainTextPanel = (panel: ComparePanelState) => (
  !!panel.file && /\.(?:txt|md|markdown|csv|tsv|json|jsonl|xml|html?|css|less|scss|sass|ya?ml|ini|log|sql|[cm]?[jt]sx?|vue|svelte|py|java|kt|rs|go|php|rb|swift)$/i.test(panel.filename)
)

const getPanelComparableText = async (
  panel: ComparePanelState,
  viewer: FileViewerPublicApi | null
) => {
  if (isLocalPlainTextPanel(panel) && panel.file instanceof Blob) {
    return panel.file.text()
  }
  const chunks = viewer?.getDocumentTextChunks?.() || []
  if (isPdfPanel(panel)) {
    const pageCount = viewer?.getViewState?.()?.pageCount || 0
    const extractedPageCount = new Set(
      chunks.map(chunk => chunk.anchor.page).filter(page => typeof page === 'number')
    ).size
    if (pageCount > 0 && extractedPageCount > 0 && extractedPageCount < pageCount) {
      throw new Error('compare-pdf-partial')
    }
  }
  return extractComparableDocumentText(chunks)
}

const scrollToTextDiffChange = async (direction: 1 | -1) => {
  const rows = textDiffChangeRows.value
  if (!rows.length) {
    activeTextDiffChange.value = -1
    return
  }
  activeTextDiffChange.value = (
    activeTextDiffChange.value + direction + rows.length
  ) % rows.length
  if (textDiffOnlyChanges.value) {
    await nextTick()
  }
  textDiffBodyRef.value
    ?.querySelector<HTMLElement>(`[data-text-diff-row="${rows[activeTextDiffChange.value].id}"]`)
    ?.scrollIntoView({ block: 'center' })
}

const runDocumentTextDiff = async () => {
  const runId = ++textDiffRunId
  textDiffStatus.value = 'loading'
  textDiffMessage.value = compareCopy.value.textDiffRunning
  textDiffResult.value = null
  activeTextDiffChange.value = -1
  await nextTick()
  await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()))
  if (runId !== textDiffRunId) {
    return
  }
  try {
    const [leftText, rightText] = await Promise.all([
      getPanelComparableText(leftPanel, leftViewerRef.value),
      getPanelComparableText(rightPanel, rightViewerRef.value),
    ])
    if (runId !== textDiffRunId) {
      return
    }
    if (!leftText.trim() || !rightText.trim()) {
      textDiffStatus.value = 'error'
      textDiffMessage.value = compareCopy.value.textDiffNoText
      return
    }
    const result = buildDocumentTextDiff(leftText, rightText)
    if (runId !== textDiffRunId) {
      return
    }
    textDiffResult.value = result
    textDiffStatus.value = 'ready'
    textDiffMessage.value = ''
    activeTextDiffChange.value = textDiffChangeRows.value.length ? 0 : -1
    await nextTick()
    if (activeTextDiffChange.value >= 0) {
      textDiffBodyRef.value
        ?.querySelector<HTMLElement>(`[data-text-diff-row="${textDiffChangeRows.value[0].id}"]`)
        ?.scrollIntoView({ block: 'center' })
    }
  } catch (error) {
    if (runId !== textDiffRunId) {
      return
    }
    textDiffStatus.value = 'error'
    textDiffMessage.value = error instanceof RangeError
      ? compareCopy.value.textDiffTooLarge
      : error instanceof Error && error.message === 'compare-pdf-partial'
        ? compareCopy.value.textDiffPdfPartial
        : compareCopy.value.textDiffFailed
  }
}

const toggleTextDiff = async () => {
  if (textDiffOpen.value) {
    textDiffOpen.value = false
    textDiffRunId += 1
    return
  }
  textDiffStatus.value = 'loading'
  textDiffMessage.value = compareCopy.value.textDiffRunning
  await Promise.all([
    leftViewerRef.value?.collectDocumentAnchors?.(),
    rightViewerRef.value?.collectDocumentAnchors?.(),
  ])
  textDiffOpen.value = true
  await runDocumentTextDiff()
}

const queueTextDiffRefresh = () => {
  if (!textDiffOpen.value || !panelLoaded.left || !panelLoaded.right) {
    return
  }
  window.setTimeout(() => void runDocumentTextDiff(), 0)
}

const handleLoadStart = (panel: ComparePanelState) => {
  panelLoaded[panel.side] = false
  panel.status = compareCopy.value.statusLoading
  if (textDiffOpen.value) {
    textDiffStatus.value = 'loading'
    textDiffMessage.value = compareCopy.value.textDiffRunning
  }
}

const handleLoadComplete = (panel: ComparePanelState, context: FileViewerLifecycleContext) => {
  panelLoaded[panel.side] = true
  const chunkCount = getAiChunkCount(panel.side)
  const aiSuffix = chunkCount ? ` · ${formatCompareCopy('aiChunks', { count: chunkCount })}` : ''
  panel.status = `${context.duration ? `${compareCopy.value.statusComplete} ${context.duration}ms` : compareCopy.value.statusComplete}${aiSuffix}`
  void bindScrollSync()
  if (compareSearchQuery.value.trim()) {
    void runCompareSearch()
  }
  queueTextDiffRefresh()
}

const handleUnload = (panel: ComparePanelState) => {
  panelLoaded[panel.side] = false
  panel.status = compareCopy.value.statusUnloaded
}

const setCompareLocale = (nextLocale: DemoLocale) => {
  compareLocale.value = nextLocale
  window.localStorage.setItem(DEMO_LOCALE_STORAGE_KEY, nextLocale)
}

const syncDocumentLocaleMeta = () => {
  document.documentElement.lang = compareLocale.value
  document.title = compareCopy.value.pageTitle
  const description = document.querySelector('meta[name="description"]')
  description?.setAttribute('content', compareCopy.value.pageDescription)
}

const handleDocumentKeydown = (event: KeyboardEvent) => {
  const key = event.key.toLowerCase()
  if ((event.metaKey || event.ctrlKey) && !event.altKey && key === 'f') {
    event.preventDefault()
    event.stopPropagation()
    if (compareSearchOpen.value) {
      void closeCompareSearch()
      return
    }
    void openCompareSearch()
    return
  }

  if (event.key === 'Escape' && compareSearchOpen.value) {
    void closeCompareSearch()
  }
}

onMounted(() => {
  syncDocumentLocaleMeta()
  document.addEventListener('keydown', handleDocumentKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleDocumentKeydown)
})

watch(compareLocale, (nextLocale, previousLocale) => {
  syncDocumentLocaleMeta()
  leftPanel.title = compareCopy.value.leftPanel
  rightPanel.title = compareCopy.value.rightPanel

  const previousSamples = samplesByLocale[previousLocale] || []
  const nextSamples = samplesByLocale[nextLocale]
  const previousLeftDefault = previousSamples[0]?.url
  const previousRightDefault = previousSamples[1]?.url
  if (!leftPanel.file && (!leftPanel.url || leftPanel.url === previousLeftDefault)) {
    selectSample(leftPanel, nextSamples[0].url)
  }
  if (!rightPanel.file && (!rightPanel.url || rightPanel.url === previousRightDefault)) {
    selectSample(rightPanel, nextSamples[1].url)
  }
})

</script>

<template>
  <main class="compare-page">
    <header class="compare-header">
      <a class="brand" href="/" :aria-label="compareCopy.backHome">
        <img :src="brandLogo" alt="">
        <span>
          <strong>File Viewer</strong>
          <small>Document Compare</small>
        </span>
      </a>
      <div class="compare-title">
        <h1>{{ compareCopy.title }}</h1>
        <p>{{ compareCopy.subtitle }}</p>
      </div>
      <div class="header-actions">
        <div class="locale-toggle-group" role="group" :aria-label="compareCopy.language">
          <button class="locale-toggle" :class="{ active: compareLocale === 'zh-CN' }" type="button" @click="setCompareLocale('zh-CN')">中</button>
          <button class="locale-toggle" :class="{ active: compareLocale === 'en-US' }" type="button" @click="setCompareLocale('en-US')">EN</button>
          <button class="locale-toggle" :class="{ active: compareLocale === 'ja-JP' }" type="button" @click="setCompareLocale('ja-JP')">日</button>
        </div>
        <div class="line-locator" :aria-label="compareCopy.lineLocator">
          <input
            v-model.trim="compareLineTarget"
            type="number"
            min="1"
            :placeholder="compareCopy.linePlaceholder"
            @keyup.enter="goToCompareLine"
          >
          <button type="button" @click="goToCompareLine">{{ compareCopy.locate }}</button>
        </div>
        <label class="sync-toggle">
          <input v-model="syncScrollEnabled" type="checkbox">
          <span>{{ compareCopy.syncScroll }}</span>
        </label>
        <label class="sync-toggle">
          <input v-model="comparePdfToolbarHidden" type="checkbox">
          <span>{{ compareCopy.hidePdfToolbar }}</span>
        </label>
        <button
          type="button"
          data-open-text-diff
          :class="{ active: textDiffOpen }"
          @click="toggleTextDiff"
        >{{ textDiffOpen ? compareCopy.closeTextDiff : compareCopy.textDiff }}</button>
        <button type="button" @click="swapPanels">{{ compareCopy.swap }}</button>
        <button type="button" @click="resetSamples">{{ compareCopy.reset }}</button>
      </div>
    </header>

    <div v-if="compareSearchOpen" class="compare-search-popover" role="search" :aria-label="compareCopy.compareSearch">
      <span class="compare-search-side">{{ activeSideLabel }}</span>
      <label class="compare-search-field">
        <Search class="compare-search-field-icon" aria-hidden="true" />
        <input
          ref="compareSearchInputRef"
          v-model.trim="compareSearchQuery"
          type="search"
          :placeholder="compareCopy.searchCurrent"
          @keyup.enter="runCompareSearch"
        >
      </label>
      <span class="compare-search-summary">{{ compareSearchSummary }}</span>
      <button
        type="button"
        :title="compareCopy.previousSearchResult"
        :aria-label="compareCopy.previousSearchResult"
        @click="previousCompareSearch"
      >
        <ChevronUp class="compare-search-icon" aria-hidden="true" />
      </button>
      <button
        type="button"
        :title="compareCopy.nextSearchResult"
        :aria-label="compareCopy.nextSearchResult"
        @click="nextCompareSearch"
      >
        <ChevronDown class="compare-search-icon" aria-hidden="true" />
      </button>
      <button
        type="button"
        :title="compareCopy.closeSearch"
        :aria-label="compareCopy.closeSearch"
        @click="closeCompareSearch"
      >
        <X class="compare-search-icon" aria-hidden="true" />
      </button>
    </div>

    <section
      v-if="textDiffOpen"
      class="text-diff-panel"
      data-text-diff-view
      :aria-label="compareCopy.textDiffTitle"
    >
      <header class="text-diff-header">
        <div>
          <span class="text-diff-kicker">{{ compareCopy.diffEngine }}</span>
          <h2>{{ compareCopy.textDiffTitle }}</h2>
          <p>{{ compareCopy.textDiffDescription }}</p>
          <p v-if="textDiffContainsPdf" class="text-diff-pdf-notice">{{ compareCopy.textDiffPdfNotice }}</p>
        </div>
        <div class="text-diff-actions">
          <label class="sync-toggle">
            <input v-model="textDiffOnlyChanges" type="checkbox">
            <span>{{ compareCopy.showOnlyChanges }}</span>
          </label>
          <button
            type="button"
            :disabled="!textDiffChangeRows.length"
            :title="compareCopy.previousChange"
            :aria-label="compareCopy.previousChange"
            @click="scrollToTextDiffChange(-1)"
          >
            <ChevronUp aria-hidden="true" />
          </button>
          <span class="text-diff-position">{{ textDiffChangePosition }}</span>
          <button
            type="button"
            :disabled="!textDiffChangeRows.length"
            :title="compareCopy.nextChange"
            :aria-label="compareCopy.nextChange"
            @click="scrollToTextDiffChange(1)"
          >
            <ChevronDown aria-hidden="true" />
          </button>
          <button type="button" data-refresh-text-diff @click="runDocumentTextDiff">{{ compareCopy.textDiffRefresh }}</button>
        </div>
      </header>

      <div
        v-if="textDiffStatus !== 'ready'"
        class="text-diff-state"
        :class="{ error: textDiffStatus === 'error' }"
        data-text-diff-status
      >{{ textDiffMessage || compareCopy.textDiffRunning }}</div>

      <template v-else-if="textDiffResult">
        <div class="text-diff-summary" data-text-diff-summary>
          <span class="added"><strong>{{ textDiffResult.summary.added }}</strong>{{ compareCopy.diffAdded }}</span>
          <span class="removed"><strong>{{ textDiffResult.summary.removed }}</strong>{{ compareCopy.diffRemoved }}</span>
          <span class="changed"><strong>{{ textDiffResult.summary.changed }}</strong>{{ compareCopy.diffChanged }}</span>
          <span><strong>{{ textDiffResult.summary.unchanged }}</strong>{{ compareCopy.diffUnchanged }}</span>
        </div>
        <div class="text-diff-column-heads" aria-hidden="true">
          <span>{{ getPanelSourceLabel(leftPanel) }}</span>
          <span>{{ getPanelSourceLabel(rightPanel) }}</span>
        </div>
        <div ref="textDiffBodyRef" class="text-diff-body">
          <div
            v-for="row in visibleTextDiffRows"
            :key="row.id"
            class="text-diff-row"
            :class="`is-${row.kind}`"
            :data-text-diff-row="row.id"
            :data-text-diff-kind="row.kind"
          >
            <span class="text-diff-line-number">{{ row.leftLine ?? '' }}</span>
            <code class="text-diff-code text-diff-code--left"><span
              v-for="(segment, index) in row.left"
              :key="`${row.id}-left-${index}`"
              :class="`diff-segment--${segment.kind}`"
            >{{ segment.value || ' ' }}</span></code>
            <span class="text-diff-line-number">{{ row.rightLine ?? '' }}</span>
            <code class="text-diff-code text-diff-code--right"><span
              v-for="(segment, index) in row.right"
              :key="`${row.id}-right-${index}`"
              :class="`diff-segment--${segment.kind}`"
            >{{ segment.value || ' ' }}</span></code>
          </div>
          <div v-if="!textDiffChangeRows.length" class="text-diff-identical">{{ compareCopy.noDifferences }}</div>
        </div>
      </template>
    </section>

    <section v-show="!textDiffOpen" class="compare-board" :aria-label="compareCopy.boardLabel">
      <article
        v-for="panel in [leftPanel, rightPanel]"
        :key="panel.side"
        class="compare-panel"
        :class="{ 'compare-panel--active': activeCompareSide === panel.side }"
        tabindex="0"
        @pointerdown="setActivePanel(panel.side)"
        @focusin="setActivePanel(panel.side)"
      >
        <div class="panel-tools">
          <div class="panel-heading">
            <span class="status-dot" />
            <div>
              <h2>{{ getPanelTitle(panel.side) }}</h2>
              <p>{{ panel.status }}</p>
            </div>
          </div>

          <div class="tool-grid">
            <label>
              <span>{{ compareCopy.sample }}</span>
              <select
                :value="panel.url"
                @change="selectSample(panel, getEventValue($event))"
              >
                <option
                  v-for="sample in samples"
                  :key="sample.url"
                  :value="sample.url"
                >
                  {{ sample.label }}
                </option>
              </select>
            </label>

            <label>
              <span>URL</span>
              <input
                v-model.trim="panel.url"
                type="text"
                placeholder="/example/word.docx"
                @input="handleUrlInput(panel)"
              >
            </label>

            <label class="upload-button">
              <input
                type="file"
                :accept="uploadAccept"
                @change="handleUpload(panel, $event)"
              >
              <span>{{ compareCopy.uploadFile }}</span>
            </label>
          </div>
        </div>

        <div class="source-card">
          <strong>{{ getPanelSourceLabel(panel) }}</strong>
          <span>{{ getPanelDescription(panel) }}</span>
        </div>

        <div class="compare-viewer">
          <FileViewer
            :key="`${panel.side}-${panel.file ? panel.filename : panel.url}-${comparePdfToolbarHidden ? 'compact' : 'full'}`"
            :ref="el => setViewerRef(panel.side, el)"
            :url="panel.file ? undefined : panel.url"
            :file="panel.file"
            :options="viewerOptions"
            @load-start="handleLoadStart(panel)"
            @load-complete="handleLoadComplete(panel, $event)"
            @unload-complete="handleUnload(panel)"
          />
        </div>
      </article>
    </section>
  </main>
</template>

<style scoped>
:global(html),
:global(body),
:global(#compare-app) {
  width: 100%;
  height: 100%;
  margin: 0;
}

:global(body) {
  overflow: hidden;
  background: #edf4f0;
}

.compare-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(31, 137, 93, 0.14), transparent 34%),
    linear-gradient(180deg, #f8fbf9 0%, #edf4f0 100%);
  color: #172635;
  font-family: Aptos, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.compare-header {
  flex-shrink: 0;
  min-height: 80px;
  display: grid;
  grid-template-columns: minmax(220px, 0.9fr) minmax(260px, 1.2fr) auto;
  align-items: center;
  gap: 22px;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(21, 41, 58, 0.08);
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(18px);
}

.brand {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: inherit;
  text-decoration: none;
}

.brand img {
  width: 44px;
  height: 44px;
  object-fit: contain;
  filter: drop-shadow(0 10px 16px rgba(22, 111, 73, 0.18));
}

.brand strong,
.brand small,
.compare-title h1,
.compare-title p,
.panel-heading h2,
.panel-heading p,
.source-card strong,
.source-card span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.brand strong {
  font-size: 18px;
  letter-spacing: 0;
}

.brand small {
  margin-top: 2px;
  color: #668093;
  font-size: 12px;
  font-weight: 700;
}

.compare-title {
  min-width: 0;
  display: grid;
  gap: 8px;
  text-align: center;
}

.compare-title h1 {
  margin: 0;
  font-size: 24px;
  line-height: 1.2;
}

.compare-title p {
  margin: 6px 0 0;
  color: #6a7d8e;
  font-size: 13px;
}

.header-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
}

.locale-toggle-group {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.header-actions button,
.sync-toggle,
.line-locator {
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 14px;
  border: 1px solid rgba(20, 42, 59, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
  color: #294259;
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  box-shadow: 0 8px 20px rgba(16, 38, 54, 0.06);
}

.line-locator {
  gap: 6px;
  padding: 0 6px 0 10px;
}

.line-locator input {
  width: 62px;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: #294259;
  font: inherit;
  font-size: 13px;
  font-weight: 800;
}

.line-locator input::placeholder {
  color: #7b91a2;
}

.line-locator button {
  height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  box-shadow: none;
}

.header-actions button {
  cursor: pointer;
}

.header-actions button:hover {
  border-color: rgba(31, 152, 99, 0.28);
  color: #14794e;
}

.header-actions button.active {
  border-color: #0b7480;
  background: #0b7480;
  color: #fff;
}

.locale-toggle.active {
  background: #0b7480;
  color: #fff;
}

.sync-toggle input {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: #1f9966;
}

.compare-search-popover {
  position: absolute;
  z-index: 30;
  top: 96px;
  right: 24px;
  display: inline-grid;
  grid-template-columns: auto minmax(180px, 280px) auto auto auto auto;
  align-items: center;
  gap: 6px;
  max-width: calc(100% - 48px);
  padding: 6px;
  border: 1px solid rgba(20, 35, 53, 0.09);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 18px 42px rgba(18, 35, 50, 0.18);
  backdrop-filter: blur(18px);
}

.compare-search-side,
.compare-search-summary,
.compare-search-popover button,
.compare-search-field {
  height: 34px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: #526174;
  font: inherit;
  font-size: 12px;
  font-weight: 900;
}

.compare-search-side,
.compare-search-summary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  padding: 0 10px;
  color: #718193;
  white-space: nowrap;
}

.compare-search-field {
  min-width: 0;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  background: rgba(20, 35, 53, 0.04);
}

.compare-search-field:focus-within {
  background: rgba(33, 163, 102, 0.1);
  color: #16804f;
}

.compare-search-field input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: inherit;
  font: inherit;
}

.compare-search-field-icon,
.compare-search-icon {
  width: 16px;
  height: 16px;
  stroke-width: 2.4;
}

.compare-search-popover button {
  width: 34px;
  min-width: 34px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.compare-search-popover button:hover {
  background: rgba(33, 163, 102, 0.1);
  color: #16804f;
}

.text-diff-panel {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr);
  margin: 18px;
  overflow: hidden;
  border: 1px solid rgba(24, 45, 62, 0.1);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 52px rgba(16, 35, 50, 0.11);
}

.text-diff-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid rgba(24, 45, 62, 0.08);
}

.text-diff-header h2 {
  margin: 4px 0 0;
  font-size: 20px;
}

.text-diff-header p {
  margin: 6px 0 0;
  color: #667d90;
  font-size: 13px;
}

.text-diff-kicker {
  color: #0b7480;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.text-diff-pdf-notice {
  color: #9a6400 !important;
}

.text-diff-actions {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.text-diff-actions button,
.text-diff-actions .sync-toggle {
  min-width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 11px;
  border: 1px solid rgba(24, 45, 62, 0.1);
  border-radius: 9px;
  background: #fff;
  color: #294259;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
}

.text-diff-actions button {
  cursor: pointer;
}

.text-diff-actions button:disabled {
  cursor: default;
  opacity: .42;
}

.text-diff-actions svg {
  width: 16px;
  height: 16px;
}

.text-diff-position {
  min-width: 48px;
  color: #667d90;
  text-align: center;
  font-size: 12px;
  font-weight: 900;
}

.text-diff-state {
  grid-row: 2 / -1;
  display: grid;
  place-items: center;
  min-height: 260px;
  padding: 32px;
  color: #61778a;
  font-size: 14px;
  font-weight: 800;
  text-align: center;
}

.text-diff-state.error {
  color: #a33b33;
}

.text-diff-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-bottom: 1px solid rgba(24, 45, 62, 0.08);
  background: #f8faf9;
}

.text-diff-summary span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 9px;
  border-radius: 999px;
  background: #eef2f5;
  color: #5c7183;
  font-size: 11px;
  font-weight: 800;
}

.text-diff-summary strong {
  font-size: 13px;
}

.text-diff-summary .added { background: #e4f6ea; color: #167044; }
.text-diff-summary .removed { background: #fde8e7; color: #a33b33; }
.text-diff-summary .changed { background: #fff2cf; color: #8a5a00; }

.text-diff-column-heads {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  border-bottom: 1px solid rgba(24, 45, 62, 0.1);
  background: #f3f7f5;
}

.text-diff-column-heads span {
  min-width: 0;
  padding: 9px 52px;
  overflow: hidden;
  color: #3d566a;
  font-size: 12px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text-diff-column-heads span + span {
  border-left: 1px solid rgba(24, 45, 62, 0.1);
}

.text-diff-body {
  min-height: 0;
  overflow: auto;
  background: #fff;
  scrollbar-color: rgba(72, 96, 115, .35) transparent;
}

.text-diff-row {
  min-width: 760px;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 44px minmax(0, 1fr);
  border-bottom: 1px solid rgba(24, 45, 62, 0.055);
}

.text-diff-row.is-changed { background: rgba(255, 244, 210, .38); }
.text-diff-row.is-removed { background: rgba(253, 232, 231, .38); }
.text-diff-row.is-added { background: rgba(228, 246, 234, .38); }

.text-diff-line-number {
  padding: 7px 8px;
  border-right: 1px solid rgba(24, 45, 62, 0.07);
  color: #91a0ad;
  background: rgba(245, 248, 247, .76);
  font: 11px/1.6 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  text-align: right;
  user-select: none;
}

.text-diff-code {
  min-width: 0;
  display: block;
  padding: 7px 10px;
  overflow-wrap: anywhere;
  color: #243749;
  font: 12px/1.6 ui-monospace, SFMono-Regular, Menlo, Consolas, 'PingFang SC', monospace;
  white-space: pre-wrap;
}

.text-diff-code--left {
  border-right: 1px solid rgba(24, 45, 62, 0.1);
}

.diff-segment--removed {
  border-radius: 3px;
  background: #f6b8b5;
  color: #7e2520;
  text-decoration: line-through;
}

.diff-segment--added {
  border-radius: 3px;
  background: #aee4bf;
  color: #0c5932;
}

.text-diff-identical {
  display: grid;
  place-items: center;
  min-height: 180px;
  color: #5f7688;
  font-size: 14px;
  font-weight: 800;
}

.compare-board {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;
  padding: 18px;
  overflow: hidden;
}

.compare-panel {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid rgba(24, 45, 62, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 18px 52px rgba(16, 35, 50, 0.1);
}

.compare-panel:focus {
  outline: none;
}

.compare-panel--active {
  border-color: rgba(31, 153, 102, 0.34);
  box-shadow:
    0 0 0 3px rgba(31, 153, 102, 0.1),
    0 18px 52px rgba(16, 35, 50, 0.1);
}

.panel-tools {
  display: grid;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid rgba(24, 45, 62, 0.08);
}

.panel-heading {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-dot {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  border-radius: 999px;
  background: #22b779;
  box-shadow: 0 0 0 6px rgba(34, 183, 121, 0.12);
}

.panel-heading h2 {
  margin: 0;
  font-size: 18px;
  line-height: 1.2;
}

.panel-heading p {
  margin: 4px 0 0;
  color: #7890a4;
  font-size: 12px;
  font-weight: 700;
}

.tool-grid {
  display: grid;
  grid-template-columns: minmax(150px, 0.75fr) minmax(190px, 1fr) auto;
  gap: 10px;
  align-items: end;
}

.tool-grid label {
  min-width: 0;
  display: grid;
  gap: 6px;
  color: #607588;
  font-size: 12px;
  font-weight: 800;
}

.tool-grid select,
.tool-grid input[type='text'],
.upload-button span {
  width: 100%;
  height: 40px;
  border: 1px solid rgba(24, 45, 62, 0.1);
  border-radius: 10px;
  background: #ffffff;
  color: #1c3145;
  font: inherit;
  font-size: 13px;
  outline: none;
}

.tool-grid select,
.tool-grid input[type='text'] {
  padding: 0 12px;
}

.tool-grid select:focus,
.tool-grid input[type='text']:focus,
.upload-button:focus-within span {
  border-color: rgba(31, 153, 102, 0.5);
  box-shadow: 0 0 0 3px rgba(31, 153, 102, 0.12);
}

.upload-button {
  cursor: pointer;
}

.upload-button input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.upload-button span {
  min-width: 92px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  color: #166f4a;
  font-weight: 900;
  background: #edf8f2;
}

.source-card {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(24, 45, 62, 0.08);
  color: #273d52;
  background: rgba(247, 250, 248, 0.82);
}

.source-card strong {
  font-size: 14px;
}

.source-card span {
  max-width: 180px;
  color: #738a9d;
  font-size: 12px;
  font-weight: 700;
}

.compare-viewer {
  min-height: 0;
  overflow: hidden;
}

@media (max-width: 1180px) {
  .compare-header {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .compare-title {
    text-align: left;
  }

  .tool-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .compare-page {
    overflow: auto;
  }

  .compare-header {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .header-actions {
    justify-content: stretch;
  }

  .header-actions button,
  .sync-toggle,
  .line-locator {
    flex: 1;
  }

  .compare-search-popover {
    left: 18px;
    right: 18px;
    top: 100px;
    grid-template-columns: auto minmax(120px, 1fr) repeat(3, auto);
  }

  .compare-search-summary {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }

  .compare-board {
    min-height: 1200px;
    grid-template-columns: 1fr;
    overflow: visible;
  }

  .text-diff-panel {
    flex: none;
    min-height: 760px;
  }

  .text-diff-header {
    flex-direction: column;
  }

  .text-diff-actions {
    width: 100%;
    flex-wrap: wrap;
  }
}

@media (prefers-color-scheme: dark) {
  :global(body) {
    background: #0f171d;
  }

  .compare-page {
    background:
      linear-gradient(135deg, rgba(42, 167, 112, 0.16), transparent 34%),
      linear-gradient(180deg, #121b22 0%, #0d141a 100%);
    color: #ecf5f8;
  }

  .compare-header,
  .compare-panel,
  .text-diff-panel {
    border-color: rgba(149, 174, 190, 0.14);
    background: rgba(18, 28, 36, 0.9);
  }

  .compare-panel--active {
    border-color: rgba(47, 214, 151, 0.34);
    box-shadow:
      0 0 0 3px rgba(47, 214, 151, 0.1),
      0 18px 52px rgba(0, 0, 0, 0.22);
  }

  .brand small,
  .compare-title p,
  .panel-heading p,
  .source-card span,
  .tool-grid label {
    color: #9fb0bd;
  }

  .header-actions button,
  .sync-toggle,
  .line-locator,
  .text-diff-actions button,
  .text-diff-actions .sync-toggle,
  .tool-grid select,
  .tool-grid input[type='text'] {
    border-color: rgba(149, 174, 190, 0.14);
    background: rgba(16, 25, 32, 0.96);
    color: #ecf5f8;
  }

  .line-locator input {
    color: #ecf5f8;
  }

  .compare-search-popover {
    border-color: rgba(149, 174, 190, 0.14);
    background: rgba(12, 20, 27, 0.94);
    box-shadow: 0 18px 42px rgba(0, 0, 0, 0.34);
  }

  .compare-search-side,
  .compare-search-summary,
  .compare-search-popover button,
  .compare-search-field {
    color: #b8c7d5;
  }

  .compare-search-field {
    background: rgba(167, 185, 198, 0.09);
  }

  .compare-search-field:focus-within,
  .compare-search-popover button:hover {
    background: rgba(45, 212, 154, 0.14);
    color: #61e5b4;
  }

  .panel-tools,
  .source-card {
    border-color: rgba(149, 174, 190, 0.12);
  }

  .source-card {
    background: rgba(14, 22, 28, 0.8);
    color: #e7f0f4;
  }

  .upload-button span {
    border-color: rgba(47, 214, 151, 0.2);
    background: rgba(47, 214, 151, 0.12);
    color: #72e7b7;
  }

  .text-diff-header,
  .text-diff-summary,
  .text-diff-column-heads,
  .text-diff-row {
    border-color: rgba(149, 174, 190, 0.12);
  }

  .text-diff-header p,
  .text-diff-position {
    color: #9fb0bd;
  }

  .text-diff-summary,
  .text-diff-column-heads,
  .text-diff-body {
    background: #111b22;
  }

  .text-diff-column-heads span,
  .text-diff-code {
    color: #dfeaf0;
  }

  .text-diff-line-number {
    background: rgba(255, 255, 255, .025);
    color: #7f929f;
  }
}
</style>
