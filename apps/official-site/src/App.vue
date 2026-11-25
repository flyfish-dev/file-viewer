<script setup lang="ts">
import { computed, h, nextTick, onBeforeUnmount, onMounted, ref, watch, type Component } from 'vue'
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import dart from 'highlight.js/lib/languages/dart'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  Boxes,
  ChevronDown,
  Cloud,
  Cpu,
  Download,
  Film,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Gem,
  GitBranch,
  Layers3,
  LockKeyhole,
  Mail,
  Menu,
  MessageCircle,
  Moon,
  MonitorPlay,
  PackageCheck,
  PanelTop,
  Radar,
  Rocket,
  SearchCheck,
  Send,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Sun,
  Wrench,
  X,
  Zap
} from '@lucide/vue'
import { FORMAT_CATALOG_SUMMARY } from './formatCatalog.generated'
import AFileStage from './components/AFileStage.vue'
import BrowserCompatibility from './components/BrowserCompatibility.vue'
import FormatExperience from './components/FormatExperience.vue'
import ProductResources from './components/ProductResources.vue'
import serviceQrImage from './assets/contact/wecom.webp'
import updatesQrImage from './assets/contact/updates.webp'
import communityQrImage from './assets/contact/community.webp'

type Locale = 'zh' | 'en'
type SiteTheme = 'light' | 'dark'
type ChineseContactId = 'service' | 'updates' | 'community'
type HighlightLanguage = 'bash' | 'dart' | 'javascript' | 'typescript' | 'xml'
type MetricItem = {
  title: string
  value: string
  detail: string
  tone: string
}

type Scenario = {
  title: string
  summary: string
  icon: Component
}

type ChineseContactItem = {
  id: ChineseContactId
  label: string
  note: string
  image: string
}

type QuickStartItem = {
  label: string
  packageName: string
  install: string
  title: string
  summary: string
  language: string
  highlightLanguage: HighlightLanguage
  code: string
  href: string
  tone: string
  icon: Component
}

type NavAnchorId = 'formats' | 'demo' | 'ecosystem'

type SectionId = NavAnchorId | 'top' | 'compatibility' | 'solutions' | 'resources' | 'support'

type ExplorerItem = {
  href: string
  label: string
  note: string
  icon: Component
  section?: SectionId
}

const docsUrl = 'https://doc.file-viewer.app/'
const demoUrl = 'https://demo.file-viewer.app/'
const compareUrl = 'https://demo.file-viewer.app/compare.html'
const githubUrl = 'https://github.com/flyfish-dev/file-viewer'
const githubApiUrl = 'https://api.github.com/repos/flyfish-dev/file-viewer'
const releasesUrl = 'https://github.com/flyfish-dev/file-viewer/releases'
const currentReleaseVersion = '3.3.6'
const currentReleaseUrl = releasesUrl
const registeredExtensionCount = FORMAT_CATALOG_SUMMARY.registeredExtensionCount
const stableExtensionCount = FORMAT_CATALOG_SUMMARY.stableExtensionCount
const experimentalExtensionCount = FORMAT_CATALOG_SUMMARY.experimentalExtensionCount
const previewPipelineCount = FORMAT_CATALOG_SUMMARY.rendererCount
const githubSponsorsUrl = 'https://github.com/sponsors/wybaby168'
const domesticSponsorUrl = 'https://dev.flyfish.group/sponsor?source=github'
const whatsappContactUrl = 'https://wa.me/qr/DY3NG2HEGJFGL1'
const telegramContactUrl = 'https://t.me/wybaby168'
const siteRootUrl = 'https://file-viewer.app/'
const siteEnglishUrl = `${siteRootUrl}en/`
const demoPreviewDesktopPaths = {
  zh: '/file-viewer-demo-v2.2.6-desktop-zh.webp',
  en: '/file-viewer-demo-v2.2.6-desktop-en.webp'
} satisfies Record<Locale, string>
const demoPreviewMobilePaths = {
  zh: '/file-viewer-demo-v2.2.6-mobile-zh.webp',
  en: '/file-viewer-demo-v2.2.6-mobile-en.webp'
} satisfies Record<Locale, string>
// Share cards use the same 1280x640 PNG as the GitHub repository social preview.
const sitePreviewImageUrls = {
  zh: `${siteRootUrl}social-preview.png`,
  en: `${siteRootUrl}social-preview.png`
} satisfies Record<Locale, string>
const siteLocalePreferenceKey = 'flyfish-site-locale-preference'
const siteThemePreferenceKey = 'flyfish-site-theme-preference'

type SiteMetadata = {
  lang: string
  canonical: string
  title: string
  description: string
  ogLocale: string
  ogLocaleAlternate: string
  imageAlt: string
}

const siteMetadata = {
  zh: {
    lang: 'zh-CN',
    canonical: siteRootUrl,
    title: 'File Viewer - Office、PDF、CAD 浏览器文件预览',
    description: `开源 File Viewer 在浏览器内预览 Office、PDF、CAD 等 ${registeredExtensionCount} 个扩展名（${stableExtensionCount} 个稳定、${experimentalExtensionCount} 个实验），通过 ${previewPipelineCount} 条链路按需加载，无需服务端转码，支持离线与私有化部署。`,
    ogLocale: 'zh_CN',
    ogLocaleAlternate: 'en_US',
    imageAlt: 'File Viewer：浏览器内预览文件，资源可自托管'
  },
  en: {
    lang: 'en',
    canonical: siteEnglishUrl,
    title: 'File Viewer for Office, PDF & CAD | Flyfish',
    description: `Open-source browser file viewer for Office, PDF, CAD, archives, email, and ${registeredExtensionCount} registered extensions (${stableExtensionCount} stable, ${experimentalExtensionCount} experimental) across ${previewPipelineCount} lazy preview pipelines. No conversion server. Self-hosted and offline-ready.`,
    ogLocale: 'en_US',
    ogLocaleAlternate: 'zh_CN',
    imageAlt: 'File Viewer: local browser previews with self-hosted runtime assets'
  }
} satisfies Record<Locale, SiteMetadata>

hljs.registerLanguage('bash', bash)
hljs.registerLanguage('dart', dart)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('xml', xml)

const locale = ref<Locale>('en')
const siteTheme = ref<SiteTheme>('light')
const siteMain = ref<HTMLElement | null>(null)
const topbar = ref<HTMLElement | null>(null)
const navMenuButton = ref<HTMLButtonElement | null>(null)
const demoReveal = ref<HTMLElement | null>(null)
const quickStartSection = ref<HTMLElement | null>(null)
const isTopbarPinned = ref(false)
const activeSectionId = ref<SectionId>('top')
const navExplorerOpen = ref(false)
const demoRevealActive = ref(false)
const demoFrameMounted = ref(false)
const demoFrameReady = ref(false)
const recordingOpen = ref(false)
const quickStartSectionActive = ref(false)
const activeQuickStartIndex = ref(0)
const githubStarCount = ref<number | null>(null)
const isZh = computed(() => locale.value === 'zh')
const nextLocaleLabel = computed(() => (isZh.value ? 'EN' : '中文'))
const nextThemeLabel = computed(() =>
  siteTheme.value === 'light'
    ? isZh.value
      ? '切换到暗色主题'
      : 'Switch to dark theme'
    : isZh.value
      ? '切换到亮色主题'
      : 'Switch to light theme'
)
const githubStarsLabel = computed(() =>
  githubStarCount.value === null ? 'GitHub' : formatStarCount(githubStarCount.value)
)
const githubStarsAriaLabel = computed(() =>
  githubStarCount.value === null
    ? isZh.value
      ? 'GitHub 开源总仓'
      : 'GitHub repository'
    : isZh.value
      ? `GitHub 开源总仓，${githubStarsLabel.value} stars`
      : `GitHub repository, ${githubStarsLabel.value} stars`
)
const demoPreviewDesktopPath = computed(() => demoPreviewDesktopPaths[locale.value])
const demoPreviewMobilePath = computed(() => demoPreviewMobilePaths[locale.value])

function resolveLocalizedDemoUrl(targetUrl: string) {
  const url = new URL(targetUrl)
  url.searchParams.set('lang', isZh.value ? 'zh-CN' : 'en-US')
  return url.toString()
}

function resolveLocalizedDocsUrl(path = '') {
  const normalizedPath = path.replace(/^\/+/, '')
  const localizedPath = isZh.value ? `zh/${normalizedPath}` : normalizedPath
  const url = new URL(localizedPath, docsUrl)
  url.searchParams.set('no_lang_redirect', '1')
  return url.toString()
}

const localizedDemoUrl = computed(() => resolveLocalizedDemoUrl(demoUrl))
const embeddedDemoUrl = computed(() => {
  const url = new URL(localizedDemoUrl.value)
  url.searchParams.set('welcome', '0')
  return url.toString()
})
const localizedCompareUrl = computed(() => resolveLocalizedDemoUrl(compareUrl))
const localizedDocsUrl = computed(() => resolveLocalizedDocsUrl())
const localizedDocsQuickstartUrl = computed(() => resolveLocalizedDocsUrl('guide/quickstart'))
const cliPageUrl = computed(() => (isZh.value ? '/cli/' : '/en/cli/'))
const commercialPageUrl = computed(() => (isZh.value ? '/commercial/' : '/en/commercial/'))

function formatStarCount(count: number) {
  if (count >= 1000000) {
    return `${Number((count / 1000000).toFixed(1))}m`
  }
  if (count >= 1000) {
    return `${Number((count / 1000).toFixed(1))}k`
  }
  return `${count}`
}

function resolveInitialTheme(): SiteTheme {
  const requestedTheme = new URLSearchParams(window.location.search).get('theme')
  if (requestedTheme === 'dark' || requestedTheme === 'light') return requestedTheme
  const documentTheme = document.documentElement.dataset.theme
  if (documentTheme === 'light' || documentTheme === 'dark') {
    return documentTheme
  }
  try {
    const storedTheme = window.localStorage.getItem(siteThemePreferenceKey)
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme
    }
  } catch {
    // Use the operating-system theme when storage is unavailable.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(nextTheme: SiteTheme) {
  document.documentElement.dataset.theme = nextTheme
  document.documentElement.style.colorScheme = nextTheme
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', nextTheme === 'dark' ? '#04171d' : '#f4f8f6')
}

function toggleTheme() {
  siteTheme.value = siteTheme.value === 'light' ? 'dark' : 'light'
  const url = new URL(window.location.href)
  url.searchParams.set('theme', siteTheme.value)
  window.history.replaceState(null, '', url)
}

async function loadGithubStarCount() {
  try {
    const response = await fetch(githubApiUrl, {
      headers: {
        Accept: 'application/vnd.github+json'
      }
    })
    if (!response.ok) {
      return
    }
    const payload = (await response.json()) as { stargazers_count?: unknown }
    if (
      typeof payload.stargazers_count === 'number' &&
      Number.isSafeInteger(payload.stargazers_count) &&
      payload.stargazers_count >= 0
    ) {
      githubStarCount.value = payload.stargazers_count
    }
  } catch {
    // Keep the repository link usable without inventing a count when offline.
  }
}

const copy = {
  zh: {
    nav: { demo: '在线演示' },
    hero: {
      subtitle:
        '支持 Office 文档、PDF、CAD 图纸和压缩包。文件由浏览器处理，可以部署到内网，也能离线用。',
      secondary: '接入文档',
      proof: [
        `${stableExtensionCount} 个稳定扩展名`,
        `${experimentalExtensionCount} 个实验扩展名`,
        `${previewPipelineCount} 条预览链路`
      ]
    },
    demoTitle: '打开文件试试',
    demoIntro:
      '打开本地文件、粘贴文件链接，或从样例里选一份。可以翻页、缩放和切换主题，手机上也能用。',
    solutionsTitle: '常见用法',
    solutionsIntro: '把预览放到原来处理文件的地方，比如审批页、图纸审核页或工单详情。',
    ecosystemTitle: '把预览接到你的项目里',
    ecosystemIntro:
      '选你在用的框架，照着下面的安装命令和示例接入。Full 包自带全部格式预设。用 Vite 可以让插件自动复制资源，其他构建工具可以运行一次包里的复制命令。',
    supportTitle: '支持与联系',
    footer: 'File Viewer 由 Flyfish Dev 维护。项目源码和软件包采用 Apache-2.0，第三方依赖沿用各自的许可证。'
  },
  en: {
    nav: { demo: 'Live demo' },
    hero: {
      subtitle:
        'Open Office files, PDFs, CAD drawings, and archives. The browser processes the files. You can host the viewer on a private network or use it offline.',
      secondary: 'Integration docs',
      proof: [
        `${stableExtensionCount} stable extensions`,
        `${experimentalExtensionCount} experimental extensions`,
        `${previewPipelineCount} preview pipelines`
      ]
    },
    demoTitle: 'Try it with a file',
    demoIntro:
      'Open a local file, paste a file link, or choose a sample. You can turn pages, zoom, and change themes on your phone or computer.',
    solutionsTitle: 'Common uses',
    solutionsIntro: 'Add a preview where people already work with files, such as an approval page, a drawing review, or a support ticket.',
    ecosystemTitle: 'Add File Viewer to your project',
    ecosystemIntro:
      'Pick your framework below for the install command and an example. Full packages include all presets. Let the Vite plugin copy the assets or run the included copy command for other build tools.',
    supportTitle: 'Support and contact',
    footer:
      'Flyfish Dev maintains File Viewer. The source and packages use Apache-2.0. Third-party dependencies use their own licenses.'
  }
} satisfies Record<Locale, Record<string, unknown>>

const metrics = computed<MetricItem[]>(() =>
  isZh.value
    ? [
        {
          title: '文件扩展名',
          value: String(registeredExtensionCount),
          detail: `${stableExtensionCount} 个稳定、${experimentalExtensionCount} 个实验；由唯一格式目录生成`,
          tone: 'green'
        },
        {
          title: '预览链路',
          value: String(previewPipelineCount),
          detail: '匹配独立 renderer，Worker/WASM 只在需要时加载',
          tone: 'blue'
        },
        {
          title: '格式预设',
          value: '4',
          detail: 'lite、office、engineering、all 按产品形态装配',
          tone: 'violet'
        },
        {
          title: 'npm 包',
          value: '89',
          detail: '81 个标准包、8 个历史兼容包，msdoc-viewer 独立版本',
          tone: 'amber'
        }
      ]
    : [
        {
          title: 'Extensions',
          value: String(registeredExtensionCount),
          detail: `${stableExtensionCount} stable and ${experimentalExtensionCount} experimental; generated from one catalog`,
          tone: 'green'
        },
        {
          title: 'Pipelines',
          value: String(previewPipelineCount),
          detail: 'Dedicated renderer matches with lazy Worker and WASM loading',
          tone: 'blue'
        },
        {
          title: 'Format presets',
          value: '4',
          detail: 'lite, office, engineering, and all product-shaped bundles',
          tone: 'violet'
        },
        {
          title: 'npm packages',
          value: '89',
          detail:
            '81 standard packages, 8 legacy-compatible packages, and independently versioned msdoc-viewer',
          tone: 'amber'
        }
      ]
)

const scenarios = computed<Scenario[]>(() =>
  isZh.value
    ? [
        {
          title: '审批与合同归档',
          summary: '在审批页直接打开 PDF、Word、OFD、图片和压缩包。',
          icon: ShieldCheck
        },
        {
          title: '知识库与附件',
          summary: '在知识库里打开文档、表格、演示稿、代码和媒体附件。支持搜索的文件可以直接查找内容。',
          icon: SearchCheck
        },
        {
          title: '工程图纸审核',
          summary: '工程和制造团队可以在网页上核对 DWG、DXF、DWF 等 CAD 图纸，也能查看 EDA 文件和三维模型。',
          icon: Radar
        },
        {
          title: '客服工单',
          summary: '在工单里打开邮件、压缩包、截图、录音和文档。',
          icon: Mail
        },
        {
          title: '内网和离线部署',
          summary: '可以用 npm、Docker 或 GitHub Releases 的归档部署，也可以把静态资源放到内网站点。',
          icon: LockKeyhole
        },
        {
          title: 'AI 文档工作台',
          summary: '搜索、高亮、定位、导出 HTML 和文本切片为溯源、向量化与知识提取留好接口。',
          icon: Sparkles
        }
      ]
    : [
        {
          title: 'Approvals and contract archives',
          summary:
            'Open PDFs, Word documents, OFD files, images, and archives on the approval page.',
          icon: ShieldCheck
        },
        {
          title: 'Knowledge bases and attachments',
          summary:
            'Open documents, spreadsheets, slides, code, and media in your knowledge base. Search within files that support it.',
          icon: SearchCheck
        },
        {
          title: 'Drawing reviews',
          summary:
            'Review DWG, DXF, and DWF drawings, EDA files, and 3D models in the browser.',
          icon: Radar
        },
        {
          title: 'Support tickets',
          summary:
            'Open emails, archives, screenshots, recordings, and documents from a support ticket.',
          icon: Mail
        },
        {
          title: 'Private networks and offline use',
          summary:
            'Deploy with npm, Docker, or a GitHub release archive. You can also serve the static files on your internal network.',
          icon: LockKeyhole
        },
        {
          title: 'AI document workspaces',
          summary:
            'Search, highlights, anchors, HTML export, and text chunks prepare the ground for citation and vector workflows.',
          icon: Sparkles
        }
      ]
)

const GitHubMark = {
  name: 'GitHubMark',
  render: () =>
    h(
      'svg',
      {
        class: 'github-mark',
        viewBox: '0 0 24 24',
        'aria-hidden': 'true',
        fill: 'currentColor'
      },
      [
        h('path', {
          d: 'M12 1.7C6.3 1.7 1.7 6.3 1.7 12c0 4.6 3 8.5 7.2 9.8.5.1.7-.2.7-.5v-1.8c-2.9.6-3.5-1.2-3.5-1.2-.5-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.6 1.1 1.6 1.1.9 1.6 2.4 1.1 2.9.9.1-.7.4-1.1.7-1.3-2.3-.3-4.7-1.2-4.7-5.1 0-1.1.4-2.1 1.1-2.8-.1-.3-.5-1.4.1-2.8 0 0 .9-.3 2.9 1.1.8-.2 1.7-.3 2.6-.3.9 0 1.8.1 2.6.3 2-1.4 2.9-1.1 2.9-1.1.6 1.4.2 2.5.1 2.8.7.8 1.1 1.7 1.1 2.8 0 4-2.4 4.8-4.7 5.1.4.3.8 1 .8 2v3c0 .3.2.6.8.5 4.2-1.3 7.2-5.2 7.2-9.8C22.3 6.3 17.7 1.7 12 1.7Z'
        })
      ]
    )
} satisfies Component

function snippetImport(statement: string) {
  return `im${'port'} ${statement}`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function highlightSnippet(code: string, language: HighlightLanguage) {
  try {
    return hljs.highlight(code, { language, ignoreIllegals: true }).value
  } catch {
    return escapeHtml(code)
  }
}

const quickStartItems = computed<QuickStartItem[]>(() => [
  {
    label: 'File Viewer CLI',
    packageName: '@file-viewer/cli',
    install: 'npm create file-viewer@latest my-viewer',
    title: isZh.value
      ? '创建项目或接入已有项目'
      : 'Create a project or add File Viewer to one',
    summary: isZh.value
      ? 'CLI 可以新建项目，也能识别已有项目的框架。你可以选需要的格式、用私有 npm 源，或准备离线用的 tgz 包。原有 copy-assets 命令也能用。'
      : 'The CLI can create a project or detect the framework in an existing one. You can pick formats, use a private registry, or prepare offline tgz packages. The copy-assets command still works.',
    language: 'Shell',
    highlightLanguage: 'bash',
    href: cliPageUrl.value,
    tone: 'green',
    icon: PackageCheck,
    code: `npm create file-viewer@latest my-viewer

# Or integrate the project containing package.json.
cd existing-app
npx file-viewer-cli add .

# Review exact packages and assets before applying.
npx file-viewer-cli plan --profile standard --json
npx file-viewer-cli verify --json`
  },
  {
    label: isZh.value ? 'Vanilla JS Full' : 'Vanilla JS Full',
    packageName: '@file-viewer/web-full',
    install: 'npm install @file-viewer/web-full@latest',
    title: isZh.value
      ? '部署整个 dist 目录'
      : 'Deploy the whole dist directory',
    summary: isZh.value
      ? 'web-full 自带 preset-all。把 dist 原样部署，其中已经有渲染器、Worker、WASM、字体和第三方资源。'
      : 'Keep the dist directory as it is when you deploy it. It includes preset-all, renderers, Workers, WASM, fonts, and vendor assets.',
    language: 'HTML',
    highlightLanguage: 'xml',
    href: resolveLocalizedDocsUrl('guide/quickstart-web'),
    tone: 'violet',
    icon: MonitorPlay,
    code: `<!-- Deploy @file-viewer/web-full/dist intact at /file-viewer/. -->
<div id="viewer" style="height:720px"></div>
<script src="/file-viewer/flyfish-file-viewer-web-full.iife.js"></${'script'}>

<script>
const controller = FlyfishFileViewerWebFull.mountViewer(
  document.getElementById('viewer'),
  {
    url: '/files/drawing.dwg',
    options: {
      theme: 'light',
      toolbar: { position: 'bottom-right' }
    },
    onEvent(event) {
      console.log(event.type, event.payload)
    }
  }
)

controller.zoomIn()
</${'script'}>`
  },
  {
    label: 'Vue 3',
    packageName: '@file-viewer/vue3-full',
    install: 'npm install @file-viewer/vue3-full',
    title: isZh.value ? '在 Vue 3 中使用 Full 包' : 'Use the Full package with Vue 3',
    summary: isZh.value
      ? 'Full 包自带 preset-all。用 Vite 插件自动复制资源，或者用包里的 CLI 复制一次。'
      : 'The Full package includes preset-all. Let the Vite plugin copy the assets, or run the included CLI to copy them once.',
    language: 'Vue SFC',
    highlightLanguage: 'typescript',
    href: resolveLocalizedDocsUrl('guide/quickstart-vue3'),
    tone: 'green',
    icon: PanelTop,
    code: `${snippetImport("{ createApp } from 'vue'")}
${snippetImport("FileViewer from '@file-viewer/vue3-full'")}

const viewerOptions = {
  theme: 'light',
  toolbar: { position: 'bottom-right', zoom: true }
}

createApp(App).use(FileViewer).mount('#app')

<file-viewer
  url="/files/contract.pdf"
  :options="viewerOptions"
  @load-complete="handleLoadComplete"
/>`
  },
  {
    label: isZh.value ? 'Vue 3 按需' : 'Vue 3 On Demand',
    packageName: '@file-viewer/vue3',
    install: 'npm install @file-viewer/vue3 @file-viewer/preset-office',
    title: isZh.value ? '在 Vue 3 中只安装需要的格式' : 'Install only the formats you need in Vue 3',
    summary: isZh.value
      ? '用标准包加格式预设，也可以只装单个渲染器，减少安装体积。'
      : 'Use the standard package with a format preset or a single renderer to keep the install smaller.',
    language: 'Vue SFC',
    highlightLanguage: 'typescript',
    href: resolveLocalizedDocsUrl('guide/quickstart-vue3'),
    tone: 'green',
    icon: PanelTop,
    code: `${snippetImport("{ createApp } from 'vue'")}
${snippetImport("FileViewer from '@file-viewer/vue3'")}
${snippetImport("officePreset from '@file-viewer/preset-office'")}

const viewerOptions = {
  preset: officePreset,
  rendererMode: 'replace',
  theme: 'light',
  toolbar: { position: 'bottom-right', zoom: true }
}

createApp(App).use(FileViewer).mount('#app')

<file-viewer
  url="/files/contract.pdf"
  :options="viewerOptions"
/>`
  },
  {
    label: 'React',
    packageName: '@file-viewer/react-full',
    install: 'npm install @file-viewer/react-full',
    title: isZh.value ? '在 React 中使用 Full 包' : 'Use the Full package with React',
    summary: isZh.value
      ? 'Full 包自带 preset-all 和同版本资源。可以用 React 组件、Hook、事件回调或 ref/controller 操作预览器。'
      : 'The package includes preset-all and matching assets. Use React components, hooks, callbacks, or the ref/controller API to work with the viewer.',
    language: 'TSX',
    highlightLanguage: 'typescript',
    href: resolveLocalizedDocsUrl('guide/quickstart-react'),
    tone: 'blue',
    icon: Rocket,
    code: `${snippetImport("FileViewer, { useFileViewer } from '@file-viewer/react-full'")}

export function Preview() {
  const viewer = useFileViewer({
    url: '/files/report.docx',
    options: {
      theme: 'light',
      toolbar: { position: 'bottom-right' }
    },
    onEvent: event => console.log(event.type)
  })

  return (
    <FileViewer
      ref={viewer.ref}
      {...viewer.props}
    />
  )
}`
  },
  {
    label: 'Flutter',
    packageName: 'file_viewer_flutter',
    install: 'flutter pub add file_viewer_flutter:0.1.0-dev.2',
    title: isZh.value ? '在 Flutter 应用里预览文件' : 'Preview files in a Flutter app',
    summary: isZh.value
      ? 'pub.dev 上提供开发预览版。移动端、桌面端和 Web 使用同一套 Dart API，离线资源随应用发布。Flutter 文档列出了各平台的设置和已测试的功能。'
      : 'The development preview is on pub.dev. The same Dart API covers mobile, desktop, and web, with offline assets bundled in the app. See the Flutter docs for setup and tested features by platform.',
    language: 'Dart',
    highlightLanguage: 'dart',
    href: `https://flutter.file-viewer.app/${isZh.value ? 'zh' : 'en'}/docs/quickstart/`,
    tone: 'blue',
    icon: PanelTop,
    code: `import 'package:flutter/material.dart';
import 'package:file_viewer_flutter/file_viewer_flutter.dart';

void main() {
  runApp(const FileViewerHost(
    child: MaterialApp(
      home: Scaffold(
        body: FileViewer(
          source: FileViewerSource.asset('assets/example.pdf'),
        ),
      ),
    ),
  ));
}

// Declare your PDF in pubspec.yaml and configure the host once.
// dart run file_viewer_flutter:setup --project . --check
// dart run file_viewer_flutter:setup --project . --apply`
  },
  {
    label: 'Svelte',
    packageName: '@file-viewer/svelte-full',
    install: 'npm install @file-viewer/svelte-full',
    title: isZh.value ? '在 Svelte 中使用 Full 包' : 'Use the Full package with Svelte',
    summary: isZh.value
      ? 'Full 包自带 preset-all 和离线资源。可以设置主题、监听事件，以及搜索、缩放、打印和导出。'
      : 'The Full package includes preset-all and offline assets. Use the shared options and events for themes, search, zoom, printing, and export.',
    language: 'Svelte',
    highlightLanguage: 'xml',
    href: resolveLocalizedDocsUrl('guide/quickstart-svelte'),
    tone: 'cyan',
    icon: Zap,
    code: `<script lang="ts">
  ${snippetImport("FileViewer from '@file-viewer/svelte-full'")}

  const options = {
    theme: 'light',
    toolbar: { position: 'bottom-right', zoom: true }
  }
${'</' + 'script>'}

<FileViewer
  url="/files/deck.pptx"
  {options}
  on:viewerEvent={event => console.log(event.detail.type)}
/>`
  },
  {
    label: 'Vue 2.7 / 2.6',
    packageName: '@file-viewer/vue2.7-full',
    install: 'npm install @file-viewer/vue2.7-full',
    title: isZh.value ? '按 Vue 版本安装对应的包' : 'Install the package for your Vue version',
    summary: isZh.value
      ? 'Vue 2.7 和 2.6 各有一个 Full 包。两者都带 preset-all 和同版本的资源复制命令，组件参数、事件和样式入口相同。'
      : 'Vue 2.7 and 2.6 have separate Full packages. Both include preset-all and a matching asset copy command. They use the same props, events, and style entry.',
    language: 'Vue 2',
    highlightLanguage: 'javascript',
    href: resolveLocalizedDocsUrl('guide/quickstart-vue2'),
    tone: 'amber',
    icon: Layers3,
    code: `${snippetImport("Vue from 'vue'")}
${snippetImport("FileViewer from '@file-viewer/vue2.7-full'")}
// Vue 2.6 projects use @file-viewer/vue2.6-full.

Vue.use(FileViewer)

new Vue({
  template: \`
    <file-viewer
      url="/files/archive.zip"
      :options="viewerOptions"
      @viewer-event="handleViewerEvent"
    />
  \`,
  data: () => ({
    viewerOptions: {
      theme: 'light',
      toolbar: true
    }
  })
}).$mount('#app')`
  },
  {
    label: 'jQuery',
    packageName: '@file-viewer/jquery-full',
    install: 'npm install @file-viewer/jquery-full',
    title: isZh.value
      ? '在 jQuery 页面中挂载预览器'
      : 'Mount the viewer on a jQuery page',
    summary: isZh.value
      ? 'Full 包自带 preset-all 和同版本资源。用 controller 换文件、更新设置、解除事件绑定或销毁预览器。'
      : 'The Full package includes preset-all and matching assets. Use the controller to load files, update settings, remove listeners, or destroy the viewer.',
    language: 'JavaScript',
    highlightLanguage: 'javascript',
    href: resolveLocalizedDocsUrl('guide/ecosystem#jquery'),
    tone: 'orange',
    icon: Wrench,
    code: `${snippetImport("{ mountViewer } from '@file-viewer/jquery-full'")}

const controller = mountViewer(document.getElementById('viewer'), {
  url: '/files/sheet.xlsx',
  options: {
    theme: 'light',
    toolbar: { zoom: true }
  },
  onEvent(event) {
    console.log(event.type)
  }
})

controller.load({ url: '/files/contract.pdf' })`
  },
  {
    label: isZh.value ? 'Vite 复制资源' : 'Vite asset copy',
    packageName: '@file-viewer/vite-plugin',
    install: isZh.value
      ? 'npm install @file-viewer/vue3-full && npm install -D @file-viewer/vite-plugin'
      : 'npm install @file-viewer/vue3-full && npm install -D @file-viewer/vite-plugin',
    title: isZh.value
      ? '让 Vite 自动复制资源'
      : 'Let Vite copy the assets',
    summary: isZh.value
      ? 'Full 自带 preset-all。打开 copyAssets 后，插件会在开发和构建时复制 Worker、WASM、字体和第三方资源。网站可以部署到根路径或子目录。'
      : 'Full includes preset-all. With copyAssets enabled, Vite copies Workers, WASM, fonts, and vendor assets in development and builds. You can deploy at the root or a subpath.',
    language: 'Vite',
    highlightLanguage: 'typescript',
    href: resolveLocalizedDocsUrl('guide/on-demand-renderers'),
    tone: 'blue',
    icon: Layers3,
    code: `${snippetImport("{ defineConfig } from 'vite'")}
${snippetImport("{ fileViewerRenderers } from '@file-viewer/vite-plugin'")}

export default defineConfig({
  plugins: [
    fileViewerRenderers({
      copyAssets: true
    })
  ]
})

// @file-viewer/vue3-full already includes preset-all.
// No preset option and no manual asset copy are required.`
  },
  {
    label: isZh.value ? '离线部署' : 'Offline',
    packageName: '@file-viewer/*-full',
    install: isZh.value
      ? '每个 Full 包都带资源复制命令'
      : 'Every Full package includes the asset copy command',
    title: isZh.value
      ? '在 Webpack 或 Vue CLI 项目中复制资源'
      : 'Copy assets in a Webpack or Vue CLI project',
    summary: isZh.value
      ? '在项目里运行这条命令，复制 Full 包里的资源并生成清单。资源由你的站点提供，离线也能加载。'
      : 'Run this command in your project to copy assets from the installed Full package and write the manifest. Your site serves the assets, including offline.',
    language: 'Shell',
    highlightLanguage: 'bash',
    href: resolveLocalizedDocsUrl('guide/distribution'),
    tone: 'cyan',
    icon: Boxes,
    code: `npx --no-install file-viewer-copy-assets ./public/file-viewer

# Serve public/file-viewer from /file-viewer/ on your own domain.
# Workers, WASM, fonts, vendor files, and the manifest stay aligned
# with the installed Full package version.`
  }
])

const activeQuickStart = computed(() => {
  const items = quickStartItems.value
  return items[activeQuickStartIndex.value] ?? items[0]!
})

const chineseContactItems: ChineseContactItem[] = [
  {
    id: 'service',
    label: '企业微信',
    note: '商务咨询、授权与优先技术支持',
    image: serviceQrImage
  },
  {
    id: 'updates',
    label: '微信公众号',
    note: '版本更新与使用说明',
    image: updatesQrImage
  },
  {
    id: 'community',
    label: '用户交流群',
    note: '和开发者、用户交流',
    image: communityQrImage
  }
]

const failedContactQrs = ref<Partial<Record<ChineseContactId, boolean>>>({})

const currentCopy = computed(() => copy[locale.value])

const pageSectionIds: readonly SectionId[] = [
  'top',
  'demo',
  'formats',
  'compatibility',
  'solutions',
  'ecosystem',
  'resources',
  'support'
]

const explorerPrimaryItems = computed<ExplorerItem[]>(() => [
  {
    href: '#demo',
    section: 'demo',
    label: isZh.value ? '试用文件预览' : 'Try file preview',
    note: isZh.value ? '打开本地文件或试用样例' : 'Open a local file or try a sample',
    icon: MonitorPlay
  },
  {
    href: '#formats',
    section: 'formats',
    label: isZh.value ? '查文件格式' : 'Find supported formats',
    note: isZh.value
      ? `${registeredExtensionCount} 个已注册扩展名，匹配 ${previewPipelineCount} 条预览链路`
      : `${registeredExtensionCount} registered extensions across ${previewPipelineCount} preview pipelines`,
    icon: FileText
  },
  {
    href: '#ecosystem',
    section: 'ecosystem',
    label: isZh.value ? '开始集成' : 'Start integrating',
    note: isZh.value
      ? '按框架查看安装命令和代码示例'
      : 'Find install commands and examples by framework',
    icon: FileCode2
  }
])

const explorerResourceItems = computed<ExplorerItem[]>(() => [
  {
    href: cliPageUrl.value,
    label: 'File Viewer CLI',
    note: isZh.value ? '创建项目、接入已有项目或准备离线包' : 'Create a project, add the viewer, or prepare offline packages',
    icon: PackageCheck
  },
  {
    href: localizedDocsQuickstartUrl.value,
    label: isZh.value ? '文档' : 'Docs',
    note: isZh.value ? '快速开始与 API' : 'Quickstart and API',
    icon: BookOpen
  },
  {
    href: githubUrl,
    label: 'GitHub',
    note: isZh.value ? '源码、Issue 与 Release' : 'Source, issues, and releases',
    icon: GitBranch
  },
  {
    href: currentReleaseUrl,
    label: 'GitHub Releases',
    note: isZh.value ? '查看已发布离线包' : 'Browse published offline builds',
    icon: Download
  },
  {
    href: '/en/browser-file-viewer/',
    label: isZh.value ? '项目介绍' : 'About File Viewer',
    note: isZh.value
      ? '查看官方包名、架构和支持范围'
      : 'Find the official packages, architecture, and limits',
    icon: BadgeCheck
  },
  {
    href: commercialPageUrl.value,
    label: isZh.value ? '商业版' : 'Commercial',
    note: isZh.value
      ? '查看 Office 引擎、授权和技术支持'
      : 'Compare the Office engine, licensing, and support',
    icon: Gem
  }
])

const activeFlatNavId = computed<NavAnchorId | null>(() => {
  const section = activeSectionId.value
  if (section === 'demo' || section === 'formats' || section === 'ecosystem') return section
  return null
})

function resolveLocaleFromPathname(pathname: string): Locale | undefined {
  const normalizedPathname = pathname.toLowerCase()
  if (normalizedPathname === '/en' || normalizedPathname.startsWith('/en/')) {
    return 'en'
  }
  if (normalizedPathname === '/zh' || normalizedPathname.startsWith('/zh/')) {
    return 'zh'
  }
  return undefined
}

function resolvePathForLocale(nextLocale: Locale) {
  return nextLocale === 'en' ? '/en/' : '/'
}

function syncBrowserPathForLocale(nextLocale: Locale) {
  const pathLocale = resolveLocaleFromPathname(window.location.pathname)
  if ((nextLocale === 'zh' && pathLocale !== 'en') || pathLocale === nextLocale) {
    return
  }

  const nextPath = resolvePathForLocale(nextLocale)
  const nextUrl = `${nextPath}${window.location.search}${window.location.hash}`
  window.history.replaceState(null, '', nextUrl)
}

function setMetaContent(selector: string, content: string) {
  const element = document.querySelector<HTMLMetaElement>(selector)
  if (element) {
    element.content = content
  }
}

function setLinkHref(selector: string, href: string) {
  const element = document.querySelector<HTMLLinkElement>(selector)
  if (element) {
    element.href = href
  }
}

function updateDocumentMetadata(nextLocale: Locale) {
  const metadata = siteMetadata[nextLocale]
  const canonical = resolveCanonicalForCurrentPath()
  const previewImageUrl = sitePreviewImageUrls[nextLocale]
  document.documentElement.lang = metadata.lang
  document.title = metadata.title
  setLinkHref('link[rel="canonical"]', canonical)
  setMetaContent('meta[name="description"]', metadata.description)
  setMetaContent('meta[property="og:title"]', metadata.title)
  setMetaContent('meta[property="og:description"]', metadata.description)
  setMetaContent('meta[property="og:url"]', canonical)
  setMetaContent('meta[property="og:image"]', previewImageUrl)
  setMetaContent('meta[property="og:image:secure_url"]', previewImageUrl)
  setMetaContent('meta[property="og:image:alt"]', metadata.imageAlt)
  setMetaContent('meta[property="og:locale"]', metadata.ogLocale)
  setMetaContent('meta[property="og:locale:alternate"]', metadata.ogLocaleAlternate)
  setMetaContent('meta[name="twitter:title"]', metadata.title)
  setMetaContent('meta[name="twitter:description"]', metadata.description)
  setMetaContent('meta[name="twitter:image"]', previewImageUrl)
}

function readStoredLocalePreference(): Locale | undefined {
  try {
    const storedLocale = window.localStorage.getItem(siteLocalePreferenceKey)
    return storedLocale === 'zh' || storedLocale === 'en' ? storedLocale : undefined
  } catch {
    return undefined
  }
}

function writeStoredLocalePreference(nextLocale: Locale) {
  try {
    window.localStorage.setItem(siteLocalePreferenceKey, nextLocale)
  } catch {
    // Storage can be unavailable in privacy-restricted browsing modes.
  }
}

function prefersChineseEnvironment() {
  const languages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language].filter(Boolean)
  return languages.some((language) => language.toLowerCase().startsWith('zh'))
}

function resolveInitialLocale(): Locale {
  const requested = new URLSearchParams(window.location.search).get('lang')
  if (requested === 'zh-CN' || requested === 'zh') return 'zh'
  if (requested === 'en-US' || requested === 'en') return 'en'
  const pathLocale = resolveLocaleFromPathname(window.location.pathname)
  if (pathLocale) {
    return pathLocale
  }

  const storedLocale = readStoredLocalePreference()
  if (storedLocale) {
    return storedLocale
  }

  if (prefersChineseEnvironment()) {
    return 'zh'
  }

  return 'en'
}

function resolveCanonicalForCurrentPath() {
  return resolveLocaleFromPathname(window.location.pathname) === 'en' ? siteEnglishUrl : siteRootUrl
}

function toggleLocale() {
  const nextLocale = isZh.value ? 'en' : 'zh'
  navExplorerOpen.value = false
  writeStoredLocalePreference(nextLocale)
  locale.value = nextLocale
  const url = new URL(window.location.href)
  url.searchParams.delete('lang')
  window.history.replaceState(null, '', url)
  syncBrowserPathForLocale(nextLocale)
}

function selectQuickStart(index: number) {
  activeQuickStartIndex.value = index
}

let pageScrollFrame = 0

function handleQuickStartKeydown(event: KeyboardEvent, index: number) {
  const lastIndex = quickStartItems.value.length - 1
  if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
    event.preventDefault()
    selectQuickStart(Math.max(0, index - 1))
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
    event.preventDefault()
    selectQuickStart(Math.min(lastIndex, index + 1))
  } else if (event.key === 'Home') {
    event.preventDefault()
    selectQuickStart(0)
  } else if (event.key === 'End') {
    event.preventDefault()
    selectQuickStart(lastIndex)
  }
  if (event.defaultPrevented) {
    siteMain.value
      ?.querySelector<HTMLButtonElement>(`#quickstart-tab-${activeQuickStartIndex.value}`)
      ?.focus({ preventScroll: true })
  }
}

function isPageSectionId(id: string): id is SectionId {
  return pageSectionIds.includes(id as SectionId)
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function getTopbarScrollOffset() {
  const nav = topbar.value
  const inset = nav ? Number.parseFloat(window.getComputedStyle(nav).top) || 0 : 8
  return Math.ceil((nav?.getBoundingClientRect().height ?? 68) + inset + 18)
}

function resolveActiveSection(offset: number) {
  const readingLine = offset + Math.min(240, window.innerHeight * 0.25)
  let active: SectionId = 'top'
  for (const id of pageSectionIds) {
    const section = document.getElementById(id)
    if (section && section.getBoundingClientRect().top <= readingLine) active = id
  }
  return active
}

function updatePageNavStateNow() {
  pageScrollFrame = 0
  isTopbarPinned.value = window.scrollY > 4
  activeSectionId.value = resolveActiveSection(getTopbarScrollOffset())
  const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
  const progress = Math.min(1, Math.max(0, window.scrollY / scrollRange))
  document.documentElement.style.setProperty('--site-scroll-progress', progress.toFixed(4))
}

function requestPageNavStateUpdate() {
  if (!pageScrollFrame) pageScrollFrame = window.requestAnimationFrame(updatePageNavStateNow)
}

function scrollInitialHashIntoView() {
  const hashId = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : ''
  const target = hashId ? document.getElementById(hashId) : null
  if (!target) return

  window.requestAnimationFrame(() => {
    if (hashId === 'ecosystem') {
      quickStartSectionActive.value = true
    }
    if (isPageSectionId(hashId)) {
      activeSectionId.value = hashId
    }
    const top =
      hashId === 'top'
        ? 0
        : Math.max(0, target.getBoundingClientRect().top + window.scrollY - getTopbarScrollOffset())
    window.scrollTo({ top, behavior: 'auto' })
    updatePageNavStateNow()
  })
}

function scrollToSection(event: MouseEvent, id: SectionId) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  if (navExplorerOpen.value) closeNavExplorer()
  const target = document.getElementById(id)
  if (!target) return

  const top =
    id === 'top'
      ? 0
      : Math.max(0, target.getBoundingClientRect().top + window.scrollY - getTopbarScrollOffset())
  if (id === 'ecosystem') {
    quickStartSectionActive.value = true
  }
  window.history.replaceState(null, '', `#${id}`)
  window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}

function closeNavExplorer() {
  navExplorerOpen.value = false
  navMenuButton.value?.focus({ preventScroll: true })
}

function handleGlobalKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && navExplorerOpen.value) closeNavExplorer()
}

let demoRevealObserver: IntersectionObserver | undefined
let quickStartObserver: IntersectionObserver | undefined
let topbarResizeObserver: ResizeObserver | undefined
let demoFrameUnmountTimer: number | undefined


function clearFrameUnmountTimers() {
  if (demoFrameUnmountTimer) {
    window.clearTimeout(demoFrameUnmountTimer)
    demoFrameUnmountTimer = undefined
  }
}

function setDemoFrameActive(active: boolean) {
  demoRevealActive.value = active
  if (demoFrameUnmountTimer) {
    window.clearTimeout(demoFrameUnmountTimer)
    demoFrameUnmountTimer = undefined
  }

  if (active) {
    demoFrameMounted.value = true
    return
  }

  demoFrameUnmountTimer = window.setTimeout(() => {
    if (!demoRevealActive.value) {
      demoFrameMounted.value = false
      demoFrameReady.value = false
    }
    demoFrameUnmountTimer = undefined
  }, 5000)
}

function handleDemoFrameLoad() {
  demoFrameReady.value = true
}

watch(locale, (nextLocale) => {
  demoFrameReady.value = false
  updateDocumentMetadata(nextLocale)
  void nextTick(requestPageNavStateUpdate)
})

watch(siteTheme, (nextTheme) => {
  applyTheme(nextTheme)
  try {
    window.localStorage.setItem(siteThemePreferenceKey, nextTheme)
  } catch {
    // The active theme still applies when storage is unavailable.
  }
})

onMounted(async () => {
  siteTheme.value = resolveInitialTheme()
  applyTheme(siteTheme.value)
  locale.value = resolveInitialLocale()
  if (readStoredLocalePreference() || prefersChineseEnvironment()) {
    syncBrowserPathForLocale(locale.value)
  }
  updateDocumentMetadata(locale.value)
  void loadGithubStarCount()
  await nextTick()
  topbarResizeObserver = new ResizeObserver(() => {
    document.documentElement.style.setProperty('--site-anchor-offset', `${getTopbarScrollOffset()}px`)
    requestPageNavStateUpdate()
  })
  if (topbar.value) {
    topbarResizeObserver.observe(topbar.value)
  }
  if (siteMain.value) topbarResizeObserver.observe(siteMain.value)
  window.addEventListener('scroll', requestPageNavStateUpdate, { passive: true })
  window.addEventListener('resize', requestPageNavStateUpdate)
  window.addEventListener('keydown', handleGlobalKeydown)
  updatePageNavStateNow()
  if (window.location.hash === '#ecosystem') {
    quickStartSectionActive.value = true
  }
  scrollInitialHashIntoView()

  if (demoReveal.value) {
    demoRevealObserver = new IntersectionObserver(
      ([entry]) => {
        const active = entry.isIntersecting && entry.intersectionRatio > 0.18
        setDemoFrameActive(active)
      },
      {
        rootMargin: '-60px 0px -24px 0px',
        threshold: [0, 0.18, 0.4, 0.72]
      }
    )
    demoRevealObserver.observe(demoReveal.value)
  }

  if (quickStartSection.value) {
    quickStartObserver = new IntersectionObserver(
      ([entry]) => {
        quickStartSectionActive.value =
          window.location.hash === '#ecosystem' ||
          (entry.isIntersecting && entry.intersectionRatio > 0.16)
      },
      {
        rootMargin: '-60px 0px -24px 0px',
        threshold: [0, 0.16, 0.42, 0.72]
      }
    )
    quickStartObserver.observe(quickStartSection.value)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', requestPageNavStateUpdate)
  window.removeEventListener('resize', requestPageNavStateUpdate)
  window.removeEventListener('keydown', handleGlobalKeydown)
  demoRevealObserver?.disconnect()
  quickStartObserver?.disconnect()
  topbarResizeObserver?.disconnect()
  clearFrameUnmountTimers()
  window.cancelAnimationFrame(pageScrollFrame)
})
</script>

<template>
  <main
    ref="siteMain"
    class="site-shell"
    :lang="locale"
  >
    <div class="site-progress" aria-hidden="true"><span /></div>
    <nav
      ref="topbar"
      class="topbar"
      :class="{ 'is-pinned': isTopbarPinned }"
      aria-label="Primary navigation"
    >
      <a class="brand" href="#top" aria-label="File Viewer" @click="scrollToSection($event, 'top')">
        <img src="/brand-mark-96.png" alt="" />
        <span>File Viewer</span>
      </a>
      <div class="flat-nav" :aria-label="isZh ? '首页导航' : 'Homepage sections'">
        <a
          href="#demo"
          data-flat-nav="demo"
          :class="{ 'is-active': activeFlatNavId === 'demo' }"
          :aria-current="activeFlatNavId === 'demo' ? 'location' : undefined"
          @click="scrollToSection($event, 'demo')"
        >
          {{ currentCopy.nav.demo }}
        </a>
        <a
          href="#formats"
          data-flat-nav="formats"
          :class="{ 'is-active': activeFlatNavId === 'formats' }"
          :aria-current="activeFlatNavId === 'formats' ? 'location' : undefined"
          @click="scrollToSection($event, 'formats')"
        >
          {{ isZh ? '支持格式' : 'Formats' }}
        </a>
        <a
          href="#ecosystem"
          data-flat-nav="ecosystem"
          :class="{ 'is-active': activeFlatNavId === 'ecosystem' }"
          :aria-current="activeFlatNavId === 'ecosystem' ? 'location' : undefined"
          @click="scrollToSection($event, 'ecosystem')"
        >
          {{ isZh ? '快速接入' : 'Integrate' }}
        </a>
        <a :href="cliPageUrl">CLI</a>
        <a :href="commercialPageUrl">
          {{ isZh ? '商业版' : 'Commercial' }}
        </a>
      </div>
      <button
        ref="navMenuButton"
        class="nav-explorer-toggle"
        type="button"
        :aria-label="navExplorerOpen ? (isZh ? '收起菜单' : 'Close menu') : (isZh ? '打开菜单' : 'Open menu')"
        :title="isZh ? '网站菜单' : 'Site menu'"
        aria-controls="primary-navigation"
        :aria-expanded="navExplorerOpen"
        @click="navExplorerOpen = !navExplorerOpen"
      >
        <X v-if="navExplorerOpen" :size="16" />
        <Menu v-else :size="16" />
      </button>

      <button
        v-if="navExplorerOpen"
        class="nav-explorer-scrim"
        type="button"
        :aria-label="isZh ? '关闭菜单' : 'Close menu'"
        @click="closeNavExplorer"
      />

      <section
        id="primary-navigation"
        class="nav-explorer-panel"
        :class="{ 'is-open': navExplorerOpen }"
        :aria-hidden="!navExplorerOpen"
        :inert="!navExplorerOpen"
      >
        <div class="nav-explorer-heading">
          <div>
            <strong>{{ isZh ? '网站导航' : 'Site navigation' }}</strong>
          </div>
          <button
            type="button"
            :aria-label="isZh ? '关闭导航面板' : 'Close navigation panel'"
            @click="closeNavExplorer"
          >
            <X :size="18" />
          </button>
        </div>

        <div class="nav-explorer-primary">
          <a
            v-for="(item, index) in explorerPrimaryItems"
            :key="item.href"
            :href="item.href"
            :aria-current="item.section === activeFlatNavId ? 'location' : undefined"
            @click="item.section && scrollToSection($event, item.section)"
          >
            <span class="nav-explorer-index">0{{ index + 1 }}</span>
            <span class="nav-explorer-icon"><component :is="item.icon" :size="20" /></span>
            <span>
              <strong>{{ item.label }}</strong>
              <small>{{ item.note }}</small>
            </span>
            <ArrowRight :size="17" />
          </a>
        </div>

        <div class="nav-explorer-resources">
          <a
            v-for="item in explorerResourceItems"
            :key="item.href"
            :href="item.href"
            target="_blank"
            rel="noreferrer"
            @click="navExplorerOpen = false"
          >
            <component :is="item.icon" :size="17" />
            <span>
              <strong>{{ item.label }}</strong>
              <small>{{ item.note }}</small>
            </span>
          </a>
        </div>
      </section>
      <div class="topbar-actions">
        <button
          class="nav-icon-button theme-toggle"
          type="button"
          :aria-label="nextThemeLabel"
          :title="nextThemeLabel"
          @click="toggleTheme"
        >
          <Moon v-if="siteTheme === 'light'" :size="16" />
          <Sun v-else :size="16" />
        </button>
        <a
          class="nav-icon-button github-star-button"
          :href="githubUrl"
          target="_blank"
          rel="noreferrer"
          :aria-label="githubStarsAriaLabel"
        >
          <GitHubMark />
          <span v-if="githubStarCount !== null" class="github-star-count" aria-hidden="true">{{ githubStarsLabel }}</span>
        </a>
        <button class="language-toggle" type="button" :title="isZh ? 'Switch to English' : '切换到中文'" @click="toggleLocale">
          {{ nextLocaleLabel }}
        </button>
        <a class="topbar-action" :href="localizedDemoUrl" target="_blank" rel="noreferrer">
          <span class="topbar-action-label-full">{{ currentCopy.nav.demo }}</span>
          <span class="topbar-action-label-short">{{ isZh ? '演示' : 'Demo' }}</span>
          <ArrowRight :size="13" />
        </a>
      </div>
    </nav>

    <section id="top" class="a-hero" aria-labelledby="a-hero-title">
      <div class="a-hero-copy">
        <p class="a-hero-release">
          <a :href="currentReleaseUrl" target="_blank" rel="noreferrer">v{{ currentReleaseVersion }}</a>
          <span>{{ isZh ? '无需转码服务器' : 'No conversion server' }}</span>
        </p>
        <h1 id="a-hero-title">
          <template v-if="isZh">在浏览器里<br />预览文件</template>
          <template v-else>Preview files<br />in your browser</template>
        </h1>
        <p class="a-hero-description">{{ currentCopy.hero.subtitle }}</p>
        <div class="a-hero-actions">
          <a class="a-hero-primary" :href="localizedDemoUrl" target="_blank" rel="noreferrer">
            {{ currentCopy.nav.demo }}<ArrowRight :size="18" />
          </a>
          <a class="a-hero-secondary" :href="localizedDocsUrl" target="_blank" rel="noreferrer">
            {{ currentCopy.hero.secondary }}
          </a>
        </div>
        <ul class="a-hero-proof" :aria-label="isZh ? '支持情况' : 'Format coverage'">
          <li v-for="item in currentCopy.hero.proof" :key="item">{{ item }}</li>
        </ul>
      </div>
      <AFileStage :is-zh="isZh" />
    </section>

    <section
      class="metric-rail"
      :aria-label="isZh ? 'File Viewer 产品数据' : 'File Viewer product metrics'"
    >
      <div class="metric-grid">
        <article
          v-for="item in metrics"
          :key="item.title"
          class="metric-card"
          :class="`metric-${item.tone}`"
        >
          <span>{{ item.title }}</span>
          <strong>{{ item.value }}</strong>
        </article>
      </div>
    </section>

    <section
      id="demo"
      class="demo-reveal-section"
      :class="{ 'demo-reveal-active': demoRevealActive }"
      aria-labelledby="demo-title"
    >
      <div class="demo-reveal-stage">
        <div class="demo-reveal-copy">
          <div>
            <h2 id="demo-title">{{ currentCopy.demoTitle }}</h2>
            <p>{{ currentCopy.demoIntro }}</p>
          </div>
          <div class="inline-actions">
            <a class="button primary" :href="localizedDemoUrl" target="_blank" rel="noreferrer">
              <span>{{ currentCopy.nav.demo }}</span>
              <MonitorPlay :size="18" />
            </a>
            <a
              class="button secondary"
              :href="localizedCompareUrl"
              target="_blank"
              rel="noreferrer"
            >
              <span>{{ isZh ? '文档比对' : 'Compare Demo' }}</span>
              <PanelTop :size="18" />
            </a>
          </div>
        </div>

        <div class="demo-reveal-window">
          <div class="demo-seam demo-seam-top">
            <span>{{ isZh ? '文件预览' : 'File preview' }}</span>
          </div>
          <div class="demo-browser demo-browser-wide">
            <div class="demo-browser-bar">
              <span />
              <span />
              <span />
              <strong>demo.file-viewer.app</strong>
            </div>
            <div ref="demoReveal" class="demo-frame-stack">
              <picture class="demo-frame-poster" :class="{ 'is-hidden': demoFrameReady }">
                <source media="(max-width: 760px)" :srcset="demoPreviewMobilePath" />
                <img
                  :src="demoPreviewDesktopPath"
                  :alt="
                    isZh
                      ? `File Viewer v${currentReleaseVersion} DOCX 预览界面`
                      : `File Viewer v${currentReleaseVersion} DOCX preview`
                  "
                  width="1600"
                  height="900"
                  loading="lazy"
                  decoding="async"
                />
              </picture>
              <iframe
                v-if="demoFrameMounted"
                :key="`demo-${locale}`"
                :class="{ 'is-ready': demoFrameReady }"
                :src="embeddedDemoUrl"
                :title="isZh ? 'File Viewer 在线 Demo' : 'File Viewer live demo'"
                loading="lazy"
                @load="handleDemoFrameLoad"
              ></iframe>
            </div>
          </div>
          <div class="demo-seam demo-seam-bottom">
            <span>{{ isZh ? '文件样例' : 'Sample files' }}</span>
          </div>
        </div>
      </div>
      <details class="a-recording" @toggle="recordingOpen = ($event.currentTarget as HTMLDetailsElement).open">
        <summary>
          <span class="a-recording-title">
            <Film :size="17" aria-hidden="true" />
            {{ isZh ? '看操作演示' : 'Watch the walkthrough' }}
          </span>
          <small>{{ isZh ? '翻报告、放幻灯片、看图纸和三维模型' : 'Read a report, show slides, and inspect a drawing and a 3D model' }}</small>
          <ChevronDown class="a-recording-chevron" :size="17" aria-hidden="true" />
        </summary>
        <figure v-if="recordingOpen">
          <img
            :src="`/a-media/file-viewer-demo-v3-${locale}.webp`"
            :alt="isZh ? '实际操作 File Viewer，滚动报告、播放幻灯片、放大建筑图、旋转狐狸模型' : 'File Viewer in action, scrolling a report, playing slides, zooming a drawing and rotating a fox model'"
            width="1200"
            height="750"
          />
          <figcaption>
            <a href="https://demo.file-viewer.app/example/licenses/fox/NOTICE.txt" target="_blank" rel="noreferrer">
              {{ isZh ? '狐狸模型作者与许可' : 'Fox model credits and license' }}
            </a>
          </figcaption>
        </figure>
      </details>
    </section>

    <FormatExperience
      :is-zh="isZh"
      :docs-url="resolveLocalizedDocsUrl('guide/formats')"
      :demo-url="localizedDemoUrl"
    />

    <BrowserCompatibility :is-zh="isZh" />

    <div class="workflow-grid">
      <section id="solutions" class="band scenario-section" aria-labelledby="solutions-title">
        <div class="section-heading compact">
          <h2 id="solutions-title">{{ currentCopy.solutionsTitle }}</h2>
          <p>{{ currentCopy.solutionsIntro }}</p>
        </div>
        <div class="scenario-grid">
          <article
            v-for="(scenario, index) in scenarios.slice(0, 5)"
            :key="scenario.title"
            class="scenario-card"
          >
            <span class="scenario-number">0{{ index + 1 }}</span>
            <h3>{{ scenario.title }}</h3>
            <p>{{ scenario.summary }}</p>
          </article>
        </div>
      </section>

      <section
        id="ecosystem"
        ref="quickStartSection"
        class="band ecosystem-section"
        :class="{ 'quickstart-active': quickStartSectionActive }"
        aria-labelledby="ecosystem-title"
      >
        <div class="ecosystem-copy">
          <h2 id="ecosystem-title">{{ currentCopy.ecosystemTitle }}</h2>
          <p>{{ currentCopy.ecosystemIntro }}</p>
          <div
            class="quickstart-tabs"
            role="tablist"
            :aria-label="isZh ? '选择框架接入示例' : 'Framework integration examples'"
          >
            <button
              v-for="(item, index) in quickStartItems"
              :id="`quickstart-tab-${index}`"
              :key="item.packageName"
              class="quickstart-tab"
              :class="[
                `quickstart-tab-${item.tone}`,
                { 'is-active': index === activeQuickStartIndex }
              ]"
              type="button"
              role="tab"
              :aria-selected="index === activeQuickStartIndex"
              :aria-controls="`quickstart-panel-${index}`"
              :tabindex="index === activeQuickStartIndex ? 0 : -1"
              @click="selectQuickStart(index)"
              @keydown="handleQuickStartKeydown($event, index)"
            >
              <span class="quickstart-tab-icon">
                <component :is="item.icon" :size="17" />
              </span>
              <span class="quickstart-tab-copy">
                <strong>{{ item.label }}</strong>
                <em>{{ item.title }}</em>
              </span>
            </button>
          </div>
        </div>

        <div class="quickstart-workbench" aria-label="Ecosystem quick start code">
          <div class="quickstart-header">
            <div>
              <strong>{{ activeQuickStart.title }}</strong>
              <code class="quickstart-command">{{ activeQuickStart.install }}</code>
            </div>
            <a :href="activeQuickStart.href" target="_blank" rel="noreferrer">
              {{ isZh ? '完整文档' : 'Full docs' }}
              <ArrowRight :size="15" />
            </a>
          </div>

          <div class="quickstart-track">
            <article
              v-for="(item, index) in quickStartItems"
              v-show="index === activeQuickStartIndex"
              :id="`quickstart-panel-${index}`"
              :key="item.packageName"
              class="code-panel quickstart-panel"
              :class="`quickstart-panel-${item.tone}`"
              role="tabpanel"
              :aria-labelledby="`quickstart-tab-${index}`"
              :aria-hidden="index !== activeQuickStartIndex"
            >
              <div class="code-toolbar">
                <FileCode2 :size="15" aria-hidden="true" />
                <strong>{{ item.language }}</strong>
              </div>
              <pre
                tabindex="0"
                :aria-label="`${item.label} ${isZh ? '代码示例' : 'code example'}`"
              ><code
              class="hljs"
              :class="`language-${item.highlightLanguage}`"
              v-html="highlightSnippet(item.code, item.highlightLanguage)"
            ></code></pre>
            </article>
          </div>

          <div class="quickstart-footer">
            <span>{{ activeQuickStart.summary }}</span>
          </div>
        </div>
      </section>
    </div>

    <section class="trust-rail-section" aria-labelledby="trust-rail-title">
      <div class="trust-rail-heading">
        <div>
          <h2 id="trust-rail-title">
            {{ isZh ? '在内网或离线使用' : 'Use File Viewer on a private network or offline' }}
          </h2>
        </div>
        <a :href="resolveLocalizedDocsUrl('guide/distribution')" target="_blank" rel="noreferrer">
          {{ isZh ? '部署说明' : 'Deployment guide' }}
          <ArrowRight :size="16" />
        </a>
      </div>
      <div class="trust-flow" :aria-label="isZh ? '离线预览链路' : 'Offline preview flow'">
        <article>
          <span>01</span>
          <Boxes :size="21" />
          <strong>{{ isZh ? '文件来源' : 'File source' }}</strong>
          <small>{{ isZh ? '本地文件、链接或附件' : 'Local file, link, or attachment' }}</small>
        </article>
        <ArrowRight class="trust-flow-arrow" :size="18" aria-hidden="true" />
        <article>
          <span>02</span>
          <PackageCheck :size="21" />
          <strong>File Viewer</strong>
          <small>{{ isZh ? '组件与 core' : 'Component and core' }}</small>
        </article>
        <ArrowRight class="trust-flow-arrow" :size="18" aria-hidden="true" />
        <article>
          <span>03</span>
          <Cpu :size="21" />
          <strong>{{ isZh ? '按格式加载' : 'Load by format' }}</strong>
          <small>{{ isZh ? '加载当前格式所需的 Worker 和 WASM' : 'Load the Workers and WASM each format needs' }}</small>
        </article>
        <ArrowRight class="trust-flow-arrow" :size="18" aria-hidden="true" />
        <article>
          <span>04</span>
          <Cloud :size="21" />
          <strong>{{ isZh ? '私有部署' : 'Self-hosted assets' }}</strong>
          <small>{{ isZh ? '文件由浏览器在本地处理' : 'The browser processes files locally' }}</small>
        </article>
      </div>
    </section>

    <ProductResources
      :is-zh="isZh"
      :docs-url="docsUrl"
      :cli-url="cliPageUrl"
      :commercial-url="commercialPageUrl"
      :releases-url="releasesUrl"
      :github-url="githubUrl"
    />

    <footer id="support" class="support-footer">
      <div class="support-copy">
        <div class="footer-brand">
          <img src="/brand-mark-96.png" alt="" />
          <strong>File Viewer</strong>
        </div>
        <h2>{{ currentCopy.supportTitle }}</h2>
      </div>
      <section class="support-channels" aria-labelledby="footer-contact-title">
        <h3 id="footer-contact-title">{{ isZh ? '联系团队' : 'Contact us' }}</h3>
        <template v-if="isZh">
          <p class="support-scan-note">微信扫码，或在微信内长按识别。</p>
          <ul class="support-qr-grid">
            <li v-for="item in chineseContactItems" :key="item.id" class="support-qr-card">
              <div class="support-qr-copy">
                <strong>{{ item.label }}</strong>
                <span>{{ item.note }}</span>
              </div>
              <div class="support-qr-frame">
                <img
                  v-if="!failedContactQrs[item.id]"
                  :src="item.image"
                  :alt="`${item.label}二维码`"
                  width="108"
                  height="108"
                  loading="lazy"
                  decoding="async"
                  @error="failedContactQrs[item.id] = true"
                />
                <button
                  v-else
                  type="button"
                  :aria-label="`重新加载${item.label}二维码`"
                  @click="failedContactQrs[item.id] = false"
                >重新加载</button>
              </div>
            </li>
          </ul>
        </template>
        <div v-else class="support-links">
          <a :href="whatsappContactUrl" target="_blank" rel="noopener noreferrer">
            <MessageCircle :size="17" aria-hidden="true" />
            <span>WhatsApp</span>
            <ArrowUpRight :size="16" aria-hidden="true" />
          </a>
          <a :href="telegramContactUrl" target="_blank" rel="noopener noreferrer">
            <Send :size="17" aria-hidden="true" />
            <span>Telegram</span>
            <ArrowUpRight :size="16" aria-hidden="true" />
          </a>
          <a class="support-email" href="mailto:admin@flyfish.dev">
            <Mail :size="17" aria-hidden="true" />
            <span>admin@flyfish.dev</span>
            <ArrowUpRight :size="16" aria-hidden="true" />
          </a>
        </div>
      </section>

      <section class="support-sponsor" aria-labelledby="footer-sponsor-title">
        <h3 id="footer-sponsor-title">{{ isZh ? '赞助项目' : 'Sponsor the project' }}</h3>
        <div class="support-links">
          <a :href="githubSponsorsUrl" target="_blank" rel="noopener noreferrer">
            <GitHubMark />
            <span>GitHub Sponsors</span>
            <ArrowUpRight :size="16" aria-hidden="true" />
          </a>
          <a :href="domesticSponsorUrl" target="_blank" rel="noopener noreferrer">
            <ShoppingCart :size="17" aria-hidden="true" />
            <span>{{ isZh ? '飞鱼小铺' : 'Flyfish Shop' }}</span>
            <ArrowUpRight :size="16" aria-hidden="true" />
          </a>
        </div>
      </section>
      <div class="footer-bottom">
        <p>{{ currentCopy.footer }}</p>
        <div class="footer-badges" aria-label="File Viewer directory badges">
          <a
            class="footer-badge kittylaunch-badge"
            href="https://kittylaunch.com/p/file-viewer"
            target="_blank"
            rel="noopener"
          >
            <img
              src="https://kittylaunch.com/api/public/badges/launch_badge.svg?theme=light&name=File%20Viewer"
              width="280"
              height="68"
              alt="File Viewer on KittyLaunch"
              data-kittylaunch-badge="1"
              loading="lazy"
              decoding="async"
            />
          </a>
          <a
            class="footer-badge saashub-badge"
            href="https://www.saashub.com/fileviewer-app"
            target="_blank"
            rel="noopener"
          >
            <img
              src="https://cdn-b.saashub.com/img/badges/approved-color.png?v=1"
              width="300"
              height="100"
              alt="FileViewer.app is approved on SaaSHub"
              data-saashub-badge="1"
              loading="lazy"
              decoding="async"
            />
          </a>
        </div>
      </div>
    </footer>
  </main>
</template>
