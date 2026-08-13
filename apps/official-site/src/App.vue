<script setup lang="ts">
import { computed, h, nextTick, onBeforeUnmount, onMounted, ref, watch, type Component } from 'vue'
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Boxes,
  Cloud,
  Cpu,
  Download,
  FileArchive,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Gem,
  GitBranch,
  HeartHandshake,
  Languages,
  Layers3,
  LockKeyhole,
  Mail,
  Menu,
  MessageCircle,
  Moon,
  MonitorPlay,
  Newspaper,
  PackageCheck,
  PanelTop,
  Radar,
  Rocket,
  SearchCheck,
  Send,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Sun,
  Users,
  Wrench,
  X,
  Zap
} from '@lucide/vue'

type Locale = 'zh' | 'en'
type SiteTheme = 'light' | 'dark'
type SupportDialogView = 'sponsor' | 'contact'
type ChineseContactId = 'service' | 'updates' | 'community'
type HighlightLanguage = 'bash' | 'javascript' | 'typescript' | 'xml'
type HeroPreviewId = 'word' | 'cad' | 'sheet' | 'slide'
type HeroPreviewPhase = 'idle' | 'entering' | 'active' | 'leaving'
type HeroPreviewShield = {
  id: HeroPreviewId
  left: number
  top: number
  width: number
  height: number
  clientLeft: number
  clientTop: number
  clientRight: number
  clientBottom: number
}

type MetricItem = {
  title: string
  value: string
  detail: string
  tone: string
}

type FormatGroup = {
  label: string
  count: string
  examples: string
  icon: Component
  tone: string
}

type Scenario = {
  title: string
  summary: string
  icon: Component
}

type QrItem = {
  label: string
  note: string
  image: string
}

type ChineseContactItem = QrItem & {
  id: ChineseContactId
  icon: Component
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

type NavAnchorId = 'formats' | 'demo' | 'solutions' | 'ecosystem' | 'support'

type SectionId = 'top' | NavAnchorId

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
const githubStarCountFallback = 1900
const releasesUrl = 'https://github.com/flyfish-dev/file-viewer/releases'
const currentReleaseVersion = '2.2.8'
const currentReleaseUrl = `${releasesUrl}/tag/v${currentReleaseVersion}`
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
const sitePreviewImageUrls = {
  zh: `${siteRootUrl}${demoPreviewDesktopPaths.zh.slice(1)}`,
  en: `${siteRootUrl}${demoPreviewDesktopPaths.en.slice(1)}`
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
    title: 'File Viewer by Flyfish - 浏览器原生多格式文件预览',
    description:
      'File Viewer by Flyfish 是浏览器原生、离线优先的多格式预览组件：208 个扩展名通过 25 条独立预览链路按需加载，54 个 npm 目标覆盖主流前端生态。',
    ogLocale: 'zh_CN',
    ogLocaleAlternate: 'en_US',
    imageAlt: 'File Viewer v2.2.8 浏览器原生 DOCX 预览工作区'
  },
  en: {
    lang: 'en',
    canonical: siteEnglishUrl,
    title: 'File Viewer by Flyfish - Browser-native multi-format file preview',
    description:
      'File Viewer by Flyfish is a browser-native, offline-first preview component. It routes 208 extensions through 25 lazy preview pipelines and ships 54 npm targets for the main frontend stacks.',
    ogLocale: 'en_US',
    ogLocaleAlternate: 'zh_CN',
    imageAlt: 'File Viewer v2.2.8 browser-native DOCX preview workspace'
  }
} satisfies Record<Locale, SiteMetadata>

hljs.registerLanguage('bash', bash)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('xml', xml)

const locale = ref<Locale>('en')
const siteTheme = ref<SiteTheme>('light')
const siteMain = ref<HTMLElement | null>(null)
const topbar = ref<HTMLElement | null>(null)
const flatNav = ref<HTMLElement | null>(null)
const demoReveal = ref<HTMLElement | null>(null)
const quickStartSection = ref<HTMLElement | null>(null)
const quickStartTrack = ref<HTMLElement | null>(null)
const supportDialogPanel = ref<HTMLElement | null>(null)
const supportDialogCloseButton = ref<HTMLButtonElement | null>(null)
const supportDialogSponsorTriggerButton = ref<HTMLButtonElement | null>(null)
const supportDialogContactTriggerButton = ref<HTMLButtonElement | null>(null)
const isTopbarPinned = ref(false)
const activeSectionId = ref<SectionId>('top')
const navExplorerOpen = ref(false)
const activeHeroPreviewId = ref<HeroPreviewId | null>(null)
const pinnedHeroPreviewId = ref<HeroPreviewId | null>(null)
const heroPreviewPhase = ref<HeroPreviewPhase>('idle')
const heroPreviewShield = ref<HeroPreviewShield | null>(null)
const demoRevealActive = ref(false)
const demoFrameMounted = ref(false)
const demoFrameReady = ref(false)
const quickStartSectionActive = ref(false)
const activeQuickStartIndex = ref(0)
const githubStarCount = ref(githubStarCountFallback)
const supportDialogOpen = ref(false)
const supportDialogView = ref<SupportDialogView>('sponsor')
const activeChineseContactId = ref<ChineseContactId>('service')
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
const heroPreviewShieldStyle = computed(() => {
  const shield = heroPreviewShield.value
  if (!shield) return undefined
  return {
    left: `${shield.left}px`,
    top: `${shield.top}px`,
    width: `${shield.width}px`,
    height: `${shield.height}px`
  }
})
const githubStarsLabel = computed(() => formatStarCount(githubStarCount.value))
const githubStarsAriaLabel = computed(() =>
  isZh.value
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
const localizedCompareUrl = computed(() => resolveLocalizedDemoUrl(compareUrl))
const localizedDocsUrl = computed(() => resolveLocalizedDocsUrl())
const localizedDocsQuickstartUrl = computed(() => resolveLocalizedDocsUrl('guide/quickstart'))
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
    ?.setAttribute('content', nextTheme === 'dark' ? '#081b16' : '#fbfdfc')
}

function toggleTheme() {
  siteTheme.value = siteTheme.value === 'light' ? 'dark' : 'light'
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
    if (typeof payload.stargazers_count === 'number' && Number.isFinite(payload.stargazers_count)) {
      githubStarCount.value = payload.stargazers_count
    }
  } catch {
    // Keep the baked-in count when GitHub is unavailable or rate limited.
  }
}

const copy = {
  zh: {
    nav: {
      formats: '支持矩阵',
      solutions: '应用落地',
      ecosystem: '生态组件',
      commercial: '商业版',
      delivery: '部署分发',
      support: '打赏支持',
      docs: '文档',
      demo: '在线体验'
    },
    hero: {
      eyebrow: 'v2.2.8 · 208 个扩展名 · 无需转码服务器',
      title: '文件预览，全部在浏览器完成。',
      subtitle:
        '为了预览一份内部 DOCX 就把它上传到服务器，糟透了。File Viewer 让 Office、PDF、CAD、压缩包、邮件等文件留在浏览器里，并且可以完整离线部署。',
      primary: '立即体验',
      secondary: '阅读文档',
      commercial: '了解商业版',
      proof: ['54 个 npm 目标', '208 个文件扩展名', '25 条预览链路', 'Full 自托管资产契约']
    },
    matrixTitle: '208 个扩展名，按 25 条真实预览链路组织。',
    matrixIntro:
      '这不是一个通用降级页面配一长串后缀。PDF/OFD、Word、Spreadsheet、二进制 PPT、PPTX、CAD、Archive、XMind 和 STEP 等格式会匹配独立 renderer；Worker、WASM、字体与 vendor 资产按需加载，Full 包可整套离线交付。',
    formatsTitle: '支持矩阵',
    solutionsTitle: '适合长期运行在企业系统里',
    solutionsIntro:
      '从 OA 审批到工程图纸，从客服工单到 AI 文档工作台，File Viewer 更关注真实文件、复杂网络、私有化部署和用户每天都会遇到的细节。',
    ecosystemTitle: '原生组件接入，统一参数与事件。',
    ecosystemIntro:
      'Full 包直接内置 preset-all，无需再安装或传入 preset。Vite 注册插件并开启 copyAssets:true 后自动发布包内资产；Webpack、Vue CLI 等非 Vite 项目只需执行一次包内 CLI。',
    demoTitle: '不看截图想象。直接打开真实文件。',
    demoIntro:
      '用完整样例矩阵检查沉浸式文档滚动、独立工具弹层、格式图标、全局缩放、明暗主题、本地上传和显式 URL 模式；桌面与移动端共用同一渲染链路。',
    docsTitle: '接入文档，快速参阅关键能力。',
    docsIntro:
      '从快速开始进入，集中查阅 Full 包、Vite 自动资产、非 Vite 单次复制、完整 web-full dist、格式矩阵、组件参数与私有化部署。',
    commercialTitle: '免费组件与商业版的边界，一眼看清。',
    commercialIntro:
      '开源 File Viewer 负责浏览器原生、多格式、可离线部署的通用预览；商业版来自 Flyfish Office 自研原生文档引擎，专注 Word、Excel、PowerPoint 的高还原、大文件性能、授权交付和优先支持。两者不是二选一：商业版可以作为可替换的 Office 能力接入现有 File Viewer 组件，获得 file-viewer-pro 体验。',
    commercialCta: '了解商业授权',
    supportTitle: '让开源维护持续下去。',
    supportIntro: '如果 File Viewer 帮到了你的项目，可以在需要时选择一种方式支持维护。',
    releaseTitle: 'v2.2.8 已发布：PDF 缩放保持阅读位置，旧版 DOC 的 HTML 文档流可安全恢复。',
    footer: '本仓库源码与软件包采用 Apache-2.0；可选外部依赖保留各自许可。由 Flyfish Dev 持续维护。'
  },
  en: {
    nav: {
      formats: 'Format Matrix',
      solutions: 'Use Cases',
      ecosystem: 'Components',
      commercial: 'Commercial',
      delivery: 'Delivery',
      support: 'Sponsor',
      docs: 'Docs',
      demo: 'Live Demo'
    },
    hero: {
      eyebrow: 'v2.2.8 · 208 extensions · no conversion server',
      title: 'Preview files entirely in the browser.',
      subtitle:
        'Uploading a private DOCX just to preview it is awful. File Viewer keeps Office, PDF, CAD, archives, email, and more in the browser, with every runtime asset ready for self-hosting.',
      primary: 'Try the Demo',
      secondary: 'Read the Docs',
      commercial: 'Commercial Edition',
      proof: [
        '54 npm targets',
        '208 file extensions',
        '25 preview pipelines',
        'Self-hosted Full assets'
      ]
    },
    matrixTitle: '208 extensions. 25 real preview pipelines.',
    matrixIntro:
      'This is not one generic fallback page with a long suffix list. PDF/OFD, Word, Spreadsheet, binary PPT, PPTX, CAD, Archive, XMind, STEP, and other families match dedicated renderers. Workers, WASM, fonts, and vendor assets load on demand, while Full packages deliver the complete offline payload.',
    formatsTitle: 'Format matrix',
    solutionsTitle: 'Built for long-running enterprise workspaces',
    solutionsIntro:
      'From approvals to engineering drawings, support tickets, and AI document workflows, File Viewer focuses on real files, private networks, self-hosted delivery, and the details users meet every day.',
    ecosystemTitle: 'Native integrations with one options and event model.',
    ecosystemIntro:
      'Full packages include preset-all, so there is no separate preset to install or pass. Vite publishes packaged assets with copyAssets:true; Webpack, Vue CLI, and other builds run the included CLI once.',
    demoTitle: 'Do not guess from screenshots. Open real files.',
    demoIntro:
      'Use the full sample matrix to check immersive document scrolling, anchored tool panels, format icons, global zoom, light and dark themes, local uploads, and explicit URL mode. Desktop and mobile use the same renderer paths.',
    docsTitle: 'Integration docs for fast technical reference.',
    docsIntro:
      'Start with Full packages, Vite asset publishing, the one-command non-Vite path, complete web-full dist, format coverage, component options, and self-hosted deployment.',
    commercialTitle: 'Open-source component or commercial edition? Make the boundary obvious.',
    commercialIntro:
      'The open-source File Viewer focuses on browser-native, multi-format, offline-ready preview. The commercial edition comes from the Flyfish Office product line and focuses on Word, Excel, and PowerPoint fidelity, large-file performance, licensed delivery, and priority support. They are not mutually exclusive: the commercial engine can replace the Office capability inside the same File Viewer integration to deliver a file-viewer-pro experience.',
    commercialCta: 'Commercial Licensing',
    supportTitle: 'Keep the open-source work moving.',
    supportIntro:
      'If File Viewer saves your team time, choose a support option when it makes sense.',
    releaseTitle:
      'v2.2.8 keeps the PDF reading position while zooming and safely recovers HTML-backed legacy DOC files.',
    footer:
      'Repository source and packages use Apache-2.0; optional external dependencies keep their own licenses. Maintained by Flyfish Dev.'
  }
} satisfies Record<Locale, Record<string, any>>

const metrics = computed<MetricItem[]>(() =>
  isZh.value
    ? [
        {
          title: '文件扩展名',
          value: '208',
          detail: '由唯一格式注册表生成，官网、文档与发布物同源',
          tone: 'green'
        },
        {
          title: '预览链路',
          value: '25',
          detail: '匹配独立 renderer，Worker/WASM 只在需要时加载',
          tone: 'blue'
        },
        {
          title: 'Preset 层级',
          value: '4',
          detail: 'lite、office、engineering、all 按产品形态装配',
          tone: 'violet'
        },
        {
          title: 'npm 发布目标',
          value: '54',
          detail: '48 个标准包与 6 个历史兼容 alias 同版本发布',
          tone: 'amber'
        }
      ]
    : [
        {
          title: 'Extensions',
          value: '208',
          detail:
            'Generated from one format registry shared by the site, docs, and release artifacts',
          tone: 'green'
        },
        {
          title: 'Pipelines',
          value: '25',
          detail: 'Dedicated renderer matches with lazy Worker and WASM loading',
          tone: 'blue'
        },
        {
          title: 'Preset tiers',
          value: '4',
          detail: 'lite, office, engineering, and all product-shaped bundles',
          tone: 'violet'
        },
        {
          title: 'npm targets',
          value: '54',
          detail: '48 standard packages and 6 historical aliases released together',
          tone: 'amber'
        }
      ]
)

const formatGroups = computed<FormatGroup[]>(() =>
  isZh.value
    ? [
        {
          label: 'Office 与版式文档',
          count: 'Word / Excel / PPT / PDF / OFD / Typst',
          examples: 'docx、doc、xlsx、xls、ppt、pptx、pdf、ofd、typ',
          icon: FileText,
          tone: 'emerald'
        },
        {
          label: '工程与设计资产',
          count: 'CAD / EDA / 3D / Mind Maps',
          examples:
            'dwg、dxf、dwf、dwfx、olb、dra、gds、oas、oasis、xmind、step、stl、excalidraw、drawio',
          icon: Layers3,
          tone: 'cyan'
        },
        {
          label: '归档与沟通文件',
          count: 'Archives / Email / Ebooks',
          examples: 'zip、7z、rar、tar、eml、msg、mbox、epub、umd',
          icon: FileArchive,
          tone: 'orange'
        },
        {
          label: '代码、数据与媒体',
          count: 'Code / Data / Media / Geo',
          examples: 'md、json、ts、py、sqlite、parquet、mp4、mp3、geojson、kml',
          icon: FileCode2,
          tone: 'indigo'
        }
      ]
    : [
        {
          label: 'Office and fixed-layout documents',
          count: 'Word / Excel / PPT / PDF / OFD / Typst',
          examples: 'docx, doc, xlsx, xls, ppt, pptx, pdf, ofd, typ',
          icon: FileText,
          tone: 'emerald'
        },
        {
          label: 'Engineering and design assets',
          count: 'CAD / EDA / 3D / Mind maps',
          examples:
            'dwg, dxf, dwf, dwfx, olb, dra, gds, oas, oasis, xmind, step, stl, excalidraw, drawio',
          icon: Layers3,
          tone: 'cyan'
        },
        {
          label: 'Archives and communication files',
          count: 'Archives / Email / Ebooks',
          examples: 'zip, 7z, rar, tar, eml, msg, mbox, epub, umd',
          icon: FileArchive,
          tone: 'orange'
        },
        {
          label: 'Code, data, media, and geo',
          count: 'Code / Data / Media / Geo',
          examples: 'md, json, ts, py, sqlite, parquet, mp4, mp3, geojson, kml',
          icon: FileCode2,
          tone: 'indigo'
        }
      ]
)

const scenarios = computed<Scenario[]>(() =>
  isZh.value
    ? [
        {
          title: 'OA 审批与合同归档',
          summary: 'PDF、Word、OFD、图片和压缩包直接在审批流里打开，减少下载和外部应用跳转。',
          icon: ShieldCheck
        },
        {
          title: '知识库与附件中心',
          summary: '文档、表格、演示稿、代码片段和媒体附件在同一阅读体验中被检索、定位和复用。',
          icon: SearchCheck
        },
        {
          title: '工程图纸协同',
          summary: 'CAD/DWG/DXF/DWF、EDA 和 3D 模型进入浏览器，适合工程、制造和图纸审核。',
          icon: Radar
        },
        {
          title: '客服与工单平台',
          summary: '邮件、附件包、截图、录音和文档在线预览，帮助团队快速判断问题来源。',
          icon: Mail
        },
        {
          title: '私有化与离线部署',
          summary: '前端静态资源即可运行，支持 npm、Docker、Release tarball 和内网静态站。',
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
            'Open PDF, Word, OFD, images, and archives directly in approval flows without downloads or external apps.',
          icon: ShieldCheck
        },
        {
          title: 'Knowledge bases and attachment hubs',
          summary:
            'Documents, spreadsheets, decks, snippets, and media attachments become searchable and reusable in one reading surface.',
          icon: SearchCheck
        },
        {
          title: 'Engineering drawing collaboration',
          summary:
            'Bring CAD/DWG/DXF/DWF, EDA assets, and 3D models into browser workflows for review and manufacturing teams.',
          icon: Radar
        },
        {
          title: 'Support and ticketing systems',
          summary:
            'Preview email, attachment bundles, screenshots, recordings, and documents to identify issues quickly.',
          icon: Mail
        },
        {
          title: 'Private and offline deployment',
          summary:
            'Run from static assets with npm, Docker, GitHub Release tarballs, or internal static hosting.',
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
    label: isZh.value ? 'Vanilla JS Full' : 'Vanilla JS Full',
    packageName: '@file-viewer/web-full',
    install: 'npm install @file-viewer/web-full@2.2.8',
    title: isZh.value
      ? '完整部署 dist，零 copy 直接预览'
      : 'Deploy the complete dist with zero copy steps',
    summary: isZh.value
      ? 'web-full 内置 preset-all；完整 dist 已包含 renderer、Worker、WASM、字体和 vendor，保持目录结构部署即可。'
      : 'web-full includes preset-all; its complete dist already contains renderers, Workers, WASM, fonts, and vendor assets.',
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
    title: isZh.value ? 'Vue 3 一步获得完整能力' : 'Vue 3 with complete capability',
    summary: isZh.value
      ? 'Full 已内置 preset-all，无需另装或传入 preset；完整资产通过 Vite 自动发布或非 Vite CLI 一次复制。'
      : 'Full includes preset-all with no separate preset option; Vite publishes assets automatically, or the non-Vite CLI copies them once.',
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
    title: isZh.value ? 'Vue 3 标准包按需装配' : 'Vue 3 standard package with presets',
    summary: isZh.value
      ? '标准包保持最轻入口，格式能力通过 preset 或单 renderer 注入，适合控制安装体积。'
      : 'The standard package stays light; presets or single renderers control the installed capability set.',
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
    title: isZh.value ? 'React full 包一行接入' : 'React full package in one line',
    summary: isZh.value
      ? '内置 preset-all 与同版本完整资产，同时保留 React 组件、hooks、事件回调和 ref/controller。'
      : 'Includes preset-all and the same-version complete asset payload, while keeping components, hooks, callbacks, and ref/controller APIs.',
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
    label: 'Svelte',
    packageName: '@file-viewer/svelte-full',
    install: 'npm install @file-viewer/svelte-full',
    title: isZh.value ? 'Svelte full 包完整接入' : 'Svelte full package with the complete matrix',
    summary: isZh.value
      ? 'Svelte Full 内置 preset-all 与完整离线资产，并保留统一的 options、事件、主题、搜索、缩放和打印导出能力。'
      : 'Svelte Full includes preset-all and complete offline assets while keeping the shared options, events, themes, search, zoom, print, and export APIs.',
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
${'<\\/script>'}

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
    title: isZh.value ? 'Vue 2.7 / 2.6 项目平滑接入' : 'Smooth Vue 2.7 / 2.6 integration',
    summary: isZh.value
      ? 'Vue 2.7 与 Vue 2.6 Full 均内置 preset-all、同版本复制 CLI，并保持相同的 props、事件和样式入口。'
      : 'Vue 2.7 and Vue 2.6 Full both include preset-all, the same-version copy CLI, and the same props, events, and style entry.',
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
      ? 'jQuery Full 命令式完整接入'
      : 'Complete imperative jQuery Full integration',
    summary: isZh.value
      ? '内置 preset-all 与同版本完整资产，面向传统多页应用保留 controller、事件解绑、销毁和运行时更新能力。'
      : 'Includes preset-all and same-version complete assets, with controller, event cleanup, destroy, and runtime updates for classic apps.',
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
    label: isZh.value ? 'Vite 自动装配' : 'Vite Auto',
    packageName: '@file-viewer/vite-plugin',
    install: isZh.value
      ? 'npm install @file-viewer/vue3-full && npm install -D @file-viewer/vite-plugin'
      : 'npm install @file-viewer/vue3-full && npm install -D @file-viewer/vite-plugin',
    title: isZh.value
      ? 'Full + copyAssets:true 自动完成格式与资产'
      : 'Full + copyAssets:true completes formats and assets',
    summary: isZh.value
      ? 'Full 自带 preset-all；插件在 dev/build 中自动发布全部 Worker、WASM、字体和 vendor，并兼容根路径与子路径部署。'
      : 'Full brings preset-all; the plugin publishes every Worker, WASM, font, and vendor asset in dev/build for root or subpath deployments.',
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
      ? '非 Vite：任一 Full 包自带复制命令'
      : 'Non-Vite: every Full package includes the copy command',
    title: isZh.value
      ? 'Webpack / Vue CLI 只执行一次 CLI'
      : 'One CLI command for Webpack or Vue CLI',
    summary: isZh.value
      ? '命令来自已安装的 Full 包，复制同版本完整资产并写入清单；运行时不依赖公共 CDN。'
      : 'The command comes with the installed Full package, copies its same-version complete payload, and writes the manifest; runtime stays off public CDNs.',
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

const donationQrItems: QrItem[] = [
  {
    label: '微信打赏',
    note: '微信扫码，请维护者喝杯柠檬水',
    image: '/donate-wx.jpg?v=637db1a6'
  },
  {
    label: '支付宝打赏',
    note: '支付宝扫码，支持开源持续迭代',
    image: '/donate-alipay.jpg?v=3b614e81'
  }
]

const chineseContactItems: ChineseContactItem[] = [
  {
    id: 'service',
    label: '客服微信',
    note: '商务咨询、商业授权与优先技术支持',
    image: '/contact.jpg',
    icon: MessageCircle
  },
  {
    id: 'updates',
    label: '微信公众号',
    note: '获取版本更新与文件预览实践文章',
    image: '/wechat-mp.png',
    icon: Newspaper
  },
  {
    id: 'community',
    label: '用户交流群',
    note: '与开发者和 File Viewer 用户交流',
    image: '/invite.webp',
    icon: Users
  }
]

const activeChineseContact = computed(
  () =>
    chineseContactItems.find((item) => item.id === activeChineseContactId.value) ??
    chineseContactItems[0]!
)

const currentCopy = computed(() => copy[locale.value])

const pageSectionIds: readonly SectionId[] = [
  'top',
  'demo',
  'formats',
  'solutions',
  'ecosystem',
  'support'
]

const explorerPrimaryItems = computed<ExplorerItem[]>(() => [
  {
    href: '#demo',
    section: 'demo',
    label: isZh.value ? '先看真实预览' : 'See the real viewer',
    note: isZh.value ? '直接体验真实文件与完整工具栏' : 'Open real files with the complete toolbar',
    icon: MonitorPlay
  },
  {
    href: '#formats',
    section: 'formats',
    label: isZh.value ? '查看支持格式' : 'Check format coverage',
    note: isZh.value
      ? '208 个扩展名，匹配 25 条预览链路'
      : '208 extensions across 25 preview pipelines',
    icon: FileText
  },
  {
    href: '#ecosystem',
    section: 'ecosystem',
    label: isZh.value ? '开始集成' : 'Start integrating',
    note: isZh.value
      ? '选择组件，一段代码即可运行'
      : 'Choose a component and run one focused snippet',
    icon: FileCode2
  }
])

const explorerResourceItems = computed<ExplorerItem[]>(() => [
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
    label: `v${currentReleaseVersion}`,
    note: isZh.value ? '下载最新离线包' : 'Download the latest offline build',
    icon: Download
  },
  {
    href: '/en/browser-file-viewer/',
    label: isZh.value ? '项目事实' : 'Verified facts',
    note: isZh.value
      ? '统一版本、包名与架构口径'
      : 'Canonical identity, packages, architecture, and limits',
    icon: BadgeCheck
  },
  {
    href: commercialPageUrl.value,
    label: isZh.value ? '商业版' : 'Commercial',
    note: isZh.value
      ? '高保真 Office 引擎与企业支持'
      : 'High-fidelity Office engine and enterprise support',
    icon: Gem
  }
])

const featuredQuickStartItems = computed(() => quickStartItems.value.slice(0, 5))

const activeFlatNavId = computed<NavAnchorId>(() => {
  if (activeSectionId.value === 'formats') return 'formats'
  if (activeSectionId.value === 'ecosystem' || activeSectionId.value === 'solutions') {
    return 'ecosystem'
  }
  return 'demo'
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
  syncBrowserPathForLocale(nextLocale)
}

function selectQuickStart(index: number) {
  activeQuickStartIndex.value = index
  const track = quickStartTrack.value
  const target = track?.children.item(index) as HTMLElement | null
  if (!track || !target) return

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  track.scrollTo({
    left: target.offsetLeft - track.offsetLeft,
    behavior: reduceMotion ? 'auto' : 'smooth'
  })
}

let quickStartScrollFrame = 0
let pageScrollFrame = 0

function syncQuickStartFromScroll() {
  const track = quickStartTrack.value
  if (!track) return

  window.cancelAnimationFrame(quickStartScrollFrame)
  quickStartScrollFrame = window.requestAnimationFrame(() => {
    const panels = Array.from(track.children) as HTMLElement[]
    const trackCenter = track.scrollLeft + track.clientWidth / 2
    let nextIndex = activeQuickStartIndex.value
    let nearestDistance = Number.POSITIVE_INFINITY

    panels.forEach((panel, index) => {
      const panelCenter = panel.offsetLeft + panel.offsetWidth / 2
      const distance = Math.abs(panelCenter - trackCenter)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nextIndex = index
      }
    })

    activeQuickStartIndex.value = nextIndex
  })
}

function handleQuickStartKeydown(event: KeyboardEvent, index: number) {
  const lastIndex = featuredQuickStartItems.value.length - 1
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
}

function isPageSectionId(id: string): id is SectionId {
  return pageSectionIds.includes(id as SectionId)
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function usesCoarsePointer() {
  return window.matchMedia('(hover: none), (pointer: coarse)').matches
}

const heroPreviewEnterFallbackMs = 740
const heroPreviewLeaveFallbackMs = 230
let heroPreviewTransitionTimer: number | null = null
let heroPreviewExitRequested = false

function clearHeroPreviewTransitionTimer() {
  if (heroPreviewTransitionTimer === null) return
  window.clearTimeout(heroPreviewTransitionTimer)
  heroPreviewTransitionTimer = null
}

function scheduleHeroPreviewTransitionFallback(callback: () => void, delay: number) {
  clearHeroPreviewTransitionTimer()
  heroPreviewTransitionTimer = window.setTimeout(() => {
    heroPreviewTransitionTimer = null
    callback()
  }, delay)
}

function finishHeroPreviewLeave() {
  if (heroPreviewPhase.value !== 'leaving') return
  clearHeroPreviewTransitionTimer()
  heroPreviewShield.value = null
  activeHeroPreviewId.value = null
  heroPreviewPhase.value = 'idle'
  heroPreviewExitRequested = false

  if (pinnedHeroPreviewId.value) {
    startHeroPreviewEnter(pinnedHeroPreviewId.value)
  }
}

function startHeroPreviewLeave() {
  if (heroPreviewPhase.value !== 'active' || !activeHeroPreviewId.value) return
  heroPreviewPhase.value = 'leaving'

  if (prefersReducedMotion()) {
    finishHeroPreviewLeave()
    return
  }

  scheduleHeroPreviewTransitionFallback(finishHeroPreviewLeave, heroPreviewLeaveFallbackMs)
}

function finishHeroPreviewEnter() {
  if (heroPreviewPhase.value !== 'entering' || !activeHeroPreviewId.value) return
  clearHeroPreviewTransitionTimer()
  heroPreviewPhase.value = 'active'

  if (
    heroPreviewExitRequested ||
    (pinnedHeroPreviewId.value && pinnedHeroPreviewId.value !== activeHeroPreviewId.value)
  ) {
    startHeroPreviewLeave()
  }
}

function startHeroPreviewEnter(id: HeroPreviewId) {
  if (heroPreviewPhase.value !== 'idle') return
  clearHeroPreviewTransitionTimer()
  heroPreviewExitRequested = false
  activeHeroPreviewId.value = id
  heroPreviewPhase.value = 'entering'

  if (prefersReducedMotion()) {
    finishHeroPreviewEnter()
    return
  }

  scheduleHeroPreviewTransitionFallback(finishHeroPreviewEnter, heroPreviewEnterFallbackMs)
}

function setHeroPreviewPointerAnchor(event: PointerEvent, id: HeroPreviewId) {
  if (!(event.currentTarget instanceof HTMLElement)) return
  const bounds = event.currentTarget.getBoundingClientRect()
  const anchorX = Math.min(bounds.width, Math.max(0, event.clientX - bounds.left))
  const anchorY = Math.min(bounds.height, Math.max(0, event.clientY - bounds.top))
  event.currentTarget.style.setProperty('--focus-origin-x', `${anchorX}px`)
  event.currentTarget.style.setProperty('--focus-origin-y', `${anchorY}px`)

  const stage = event.currentTarget.closest<HTMLElement>('.hero-orbit-stage')
  if (!stage) return
  const stageBounds = stage.getBoundingClientRect()
  const focusScale =
    Number.parseFloat(
      window.getComputedStyle(event.currentTarget).getPropertyValue('--focus-scale')
    ) || 1
  const guard = 10
  const clientLeft = event.clientX - anchorX * focusScale - guard
  const clientTop = event.clientY - anchorY * focusScale - guard
  const width = bounds.width * focusScale + guard * 2
  const height = bounds.height * focusScale + guard * 2
  heroPreviewShield.value = {
    id,
    left: clientLeft - stageBounds.left,
    top: clientTop - stageBounds.top,
    width,
    height,
    clientLeft,
    clientTop,
    clientRight: clientLeft + width,
    clientBottom: clientTop + height
  }
}

function resetHeroPreviewPointerAnchor(event: Event) {
  if (!(event.currentTarget instanceof HTMLElement)) return
  event.currentTarget.style.setProperty('--focus-origin-x', '50%')
  event.currentTarget.style.setProperty('--focus-origin-y', '50%')
}

function handleHeroPreviewPointerEnter(event: PointerEvent, id: HeroPreviewId) {
  if (usesCoarsePointer() || pinnedHeroPreviewId.value) return

  if (heroPreviewPhase.value === 'idle') {
    setHeroPreviewPointerAnchor(event, id)
    startHeroPreviewEnter(id)
  } else if (heroPreviewPhase.value === 'entering' && activeHeroPreviewId.value === id) {
    heroPreviewExitRequested = false
  }
}

function requestHeroPreviewPointerLeave(id: HeroPreviewId) {
  if (usesCoarsePointer() || pinnedHeroPreviewId.value || activeHeroPreviewId.value !== id) {
    return
  }

  if (heroPreviewPhase.value === 'entering') {
    heroPreviewExitRequested = true
  } else if (heroPreviewPhase.value === 'active') {
    startHeroPreviewLeave()
  }
}

function handleHeroPreviewPointerLeave(event: PointerEvent, id: HeroPreviewId) {
  const shield = heroPreviewShield.value
  if (
    shield?.id === id &&
    event.clientX >= shield.clientLeft &&
    event.clientX <= shield.clientRight &&
    event.clientY >= shield.clientTop &&
    event.clientY <= shield.clientBottom
  ) {
    return
  }
  requestHeroPreviewPointerLeave(id)
}

function handleHeroPreviewShieldPointerEnter() {
  if (heroPreviewPhase.value === 'entering') {
    heroPreviewExitRequested = false
  }
}

function handleHeroPreviewShieldPointerLeave() {
  if (activeHeroPreviewId.value) {
    requestHeroPreviewPointerLeave(activeHeroPreviewId.value)
  }
}

function setPinnedHeroPreview(id: HeroPreviewId | null) {
  pinnedHeroPreviewId.value = id

  if (heroPreviewPhase.value === 'idle') {
    if (id) startHeroPreviewEnter(id)
    return
  }

  if (activeHeroPreviewId.value === id) {
    heroPreviewExitRequested = false
  } else if (heroPreviewPhase.value === 'entering') {
    heroPreviewExitRequested = true
  } else if (heroPreviewPhase.value === 'active') {
    startHeroPreviewLeave()
  }
}

function activateHeroPreview(event: PointerEvent, id: HeroPreviewId) {
  if (event.pointerType !== 'touch' && !usesCoarsePointer()) return
  resetHeroPreviewPointerAnchor(event)
  setPinnedHeroPreview(pinnedHeroPreviewId.value === id ? null : id)
}

function activateHeroPreviewFromKeyboard(event: KeyboardEvent, id: HeroPreviewId) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  resetHeroPreviewPointerAnchor(event)
  setPinnedHeroPreview(pinnedHeroPreviewId.value === id ? null : id)
}

function handleHeroPreviewTransitionEnd(event: TransitionEvent, id: HeroPreviewId) {
  if (
    event.target !== event.currentTarget ||
    event.propertyName !== 'transform' ||
    activeHeroPreviewId.value !== id
  ) {
    return
  }

  if (heroPreviewPhase.value === 'entering') {
    finishHeroPreviewEnter()
  } else if (heroPreviewPhase.value === 'leaving') {
    finishHeroPreviewLeave()
  }
}

function clearHeroPreviewOutside(event: PointerEvent) {
  if (!pinnedHeroPreviewId.value || !(event.target instanceof Element)) return
  if (!event.target.closest('.hero-preview-item')) {
    setPinnedHeroPreview(null)
  }
}

function getTopbarScrollOffset() {
  const rect = topbar.value?.getBoundingClientRect()
  const height = rect?.height ?? 72
  const top = rect ? Math.max(8, rect.top) : 14
  return Math.ceil(height + top + 62)
}

function updateAnchorOffsetVariable() {
  const rect = topbar.value?.getBoundingClientRect()
  const styles = topbar.value ? window.getComputedStyle(topbar.value) : null
  const marginTop = styles ? Number.parseFloat(styles.marginTop) || 0 : 14
  const marginBottom = styles ? Number.parseFloat(styles.marginBottom) || 0 : 32
  const topbarSpace = Math.ceil((rect?.height ?? 72) + marginTop + marginBottom)
  document.documentElement.style.setProperty('--site-anchor-offset', `${getTopbarScrollOffset()}px`)
  document.documentElement.style.setProperty('--site-topbar-space', `${topbarSpace}px`)
}

function resolveActiveSection() {
  const anchorY = window.scrollY + getTopbarScrollOffset() + 56
  let nextSection: SectionId = 'top'

  pageSectionIds.forEach((id) => {
    const section = document.getElementById(id)
    if (section && section.offsetTop <= anchorY) {
      nextSection = id
    }
  })

  const pageBottom = window.scrollY + window.innerHeight
  const documentHeight = document.documentElement.scrollHeight
  if (pageBottom >= documentHeight - 8) {
    nextSection = 'support'
  }

  return nextSection
}

function syncFlatNavHighlight() {
  const nav = flatNav.value
  const target = nav?.querySelector<HTMLElement>(`[data-flat-nav="${activeFlatNavId.value}"]`)
  if (!nav || !target) return

  nav.style.setProperty('--flat-nav-x', `${target.offsetLeft}px`)
  nav.style.setProperty('--flat-nav-width', `${target.offsetWidth}px`)
}

function updatePageNavStateNow() {
  isTopbarPinned.value = window.scrollY > 24
  updateAnchorOffsetVariable()
  activeSectionId.value = resolveActiveSection()
  const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
  const progress = Math.min(1, Math.max(0, window.scrollY / scrollRange))
  document.documentElement.style.setProperty('--site-scroll-progress', progress.toFixed(4))
  void nextTick(syncFlatNavHighlight)
}

function requestPageNavStateUpdate() {
  window.cancelAnimationFrame(pageScrollFrame)
  pageScrollFrame = window.requestAnimationFrame(updatePageNavStateNow)
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
  event.preventDefault()
  navExplorerOpen.value = false
  const target = document.getElementById(id)
  if (!target) return

  const top =
    id === 'top'
      ? 0
      : Math.max(0, target.getBoundingClientRect().top + window.scrollY - getTopbarScrollOffset())
  if (id === 'ecosystem') {
    quickStartSectionActive.value = true
  }
  activeSectionId.value = id
  window.history.replaceState(null, '', `#${id}`)
  window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}

let supportDialogPreviousBodyOverflow = ''
let supportDialogReturnFocusElement: HTMLButtonElement | null = null

function openSupportDialog(view: SupportDialogView) {
  if (supportDialogOpen.value) return

  navExplorerOpen.value = false
  supportDialogView.value = view
  activeChineseContactId.value = 'service'
  supportDialogReturnFocusElement =
    view === 'sponsor'
      ? supportDialogSponsorTriggerButton.value
      : supportDialogContactTriggerButton.value
  supportDialogPreviousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  supportDialogOpen.value = true
  void nextTick(() => supportDialogCloseButton.value?.focus())
}

function closeSupportDialog() {
  if (!supportDialogOpen.value) return

  supportDialogOpen.value = false
  document.body.style.overflow = supportDialogPreviousBodyOverflow
  void nextTick(() => supportDialogReturnFocusElement?.focus())
}

function handleSupportDialogKeydown(event: KeyboardEvent) {
  if (event.key !== 'Tab' || !supportDialogOpen.value) return

  const focusableElements = Array.from(
    supportDialogPanel.value?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) ?? []
  ).filter((element) => !element.hasAttribute('disabled'))
  if (!focusableElements.length) return

  const firstElement = focusableElements[0]!
  const lastElement = focusableElements[focusableElements.length - 1]!
  const activeElement = document.activeElement

  if (
    event.shiftKey &&
    (activeElement === firstElement || !supportDialogPanel.value?.contains(activeElement))
  ) {
    event.preventDefault()
    lastElement.focus()
  } else if (!event.shiftKey && activeElement === lastElement) {
    event.preventDefault()
    firstElement.focus()
  }
}

function handleGlobalKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (supportDialogOpen.value) {
      closeSupportDialog()
      return
    }
    navExplorerOpen.value = false
  }
}

let demoRevealObserver: IntersectionObserver | undefined
let quickStartObserver: IntersectionObserver | undefined
let siteRevealObserver: IntersectionObserver | undefined
let topbarResizeObserver: ResizeObserver | undefined
let demoFrameUnmountTimer: number | undefined

function setupSiteRevealMotion() {
  const root = siteMain.value
  if (!root) return

  const revealGroups = [
    '.section-heading',
    '.metric-card',
    '.format-card',
    '.demo-reveal-copy > *',
    '.scenario-card',
    '.ecosystem-copy > :not(.quickstart-tabs)',
    '.trust-rail-heading > *',
    '.trust-flow article',
    '.support-copy > *',
    '.support-entry',
    '.footer-bottom'
  ]
  const elements = Array.from(
    new Set(
      revealGroups.flatMap((selector) => Array.from(root.querySelectorAll<HTMLElement>(selector)))
    )
  )

  elements.forEach((element, index) => {
    element.classList.add('site-reveal')
    element.style.setProperty('--reveal-delay', `${(index % 5) * 55}ms`)
  })

  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    elements.forEach((element) => element.classList.add('is-visible'))
    return
  }

  siteRevealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        const target = entry.target as HTMLElement
        target.classList.add('is-visible')
        siteRevealObserver?.unobserve(target)
      })
    },
    {
      rootMargin: '0px 0px -9% 0px',
      threshold: [0.08, 0.2]
    }
  )
  elements.forEach((element) => siteRevealObserver?.observe(element))
}

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
  void nextTick(syncFlatNavHighlight)
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
  topbarResizeObserver = new ResizeObserver(requestPageNavStateUpdate)
  if (topbar.value) {
    topbarResizeObserver.observe(topbar.value)
  }
  window.addEventListener('scroll', requestPageNavStateUpdate, { passive: true })
  window.addEventListener('resize', requestPageNavStateUpdate)
  window.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('pointerdown', clearHeroPreviewOutside, { passive: true })
  updatePageNavStateNow()
  syncFlatNavHighlight()
  setupSiteRevealMotion()
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
        rootMargin: '-12% 0px -18% 0px',
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
        rootMargin: '-14% 0px -18% 0px',
        threshold: [0, 0.16, 0.42, 0.72]
      }
    )
    quickStartObserver.observe(quickStartSection.value)
  }
})

onBeforeUnmount(() => {
  if (supportDialogOpen.value) {
    document.body.style.overflow = supportDialogPreviousBodyOverflow
  }
  window.removeEventListener('scroll', requestPageNavStateUpdate)
  window.removeEventListener('resize', requestPageNavStateUpdate)
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('pointerdown', clearHeroPreviewOutside)
  demoRevealObserver?.disconnect()
  quickStartObserver?.disconnect()
  siteRevealObserver?.disconnect()
  topbarResizeObserver?.disconnect()
  clearHeroPreviewTransitionTimer()
  clearFrameUnmountTimers()
  window.cancelAnimationFrame(quickStartScrollFrame)
  window.cancelAnimationFrame(pageScrollFrame)
})
</script>

<template>
  <main
    ref="siteMain"
    class="site-shell"
    :class="{ 'has-pinned-nav': isTopbarPinned }"
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
        <img src="/logo.png" alt="" />
        <span>File Viewer</span>
      </a>
      <div ref="flatNav" class="flat-nav" aria-label="Homepage sections">
        <span class="flat-nav-highlight" aria-hidden="true" />
        <a
          href="#demo"
          data-flat-nav="demo"
          :class="{ 'is-active': activeFlatNavId === 'demo' }"
          @click="scrollToSection($event, 'demo')"
        >
          {{ isZh ? '在线体验' : 'Live Demo' }}
        </a>
        <a
          href="#formats"
          data-flat-nav="formats"
          :class="{ 'is-active': activeFlatNavId === 'formats' }"
          @click="scrollToSection($event, 'formats')"
        >
          {{ isZh ? '支持格式' : 'Formats' }}
        </a>
        <a
          href="#ecosystem"
          data-flat-nav="ecosystem"
          :class="{ 'is-active': activeFlatNavId === 'ecosystem' }"
          @click="scrollToSection($event, 'ecosystem')"
        >
          {{ isZh ? '快速接入' : 'Integrate' }}
        </a>
        <a :href="commercialPageUrl">
          {{ isZh ? '商业版' : 'Commercial' }}
        </a>
      </div>
      <button
        class="nav-explorer-toggle"
        type="button"
        aria-controls="primary-navigation"
        :aria-expanded="navExplorerOpen"
        @click="navExplorerOpen = !navExplorerOpen"
      >
        <Radar :size="17" />
        <span>{{ isZh ? '探索产品' : 'Explore' }}</span>
        <X v-if="navExplorerOpen" :size="15" />
        <Menu v-else :size="15" />
      </button>

      <button
        v-if="navExplorerOpen"
        class="nav-explorer-scrim"
        type="button"
        :aria-label="isZh ? '关闭探索菜单' : 'Close explore menu'"
        @click="navExplorerOpen = false"
      />

      <section
        id="primary-navigation"
        class="nav-explorer-panel"
        :class="{ 'is-open': navExplorerOpen }"
        :aria-hidden="!navExplorerOpen"
      >
        <div class="nav-explorer-heading">
          <div>
            <span>{{ isZh ? '从一个问题开始' : 'Start with one question' }}</span>
            <strong>{{ isZh ? '你现在想看什么？' : 'What do you need right now?' }}</strong>
          </div>
          <button
            type="button"
            :aria-label="isZh ? '关闭探索菜单' : 'Close explore menu'"
            @click="navExplorerOpen = false"
          >
            <X :size="18" />
          </button>
        </div>

        <div class="nav-explorer-primary">
          <a
            v-for="(item, index) in explorerPrimaryItems"
            :key="item.href"
            :href="item.href"
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
          <Moon v-if="siteTheme === 'light'" :size="17" />
          <Sun v-else :size="17" />
        </button>
        <a
          class="nav-icon-button github-star-button"
          :href="githubUrl"
          target="_blank"
          rel="noreferrer"
          :aria-label="githubStarsAriaLabel"
        >
          <GitHubMark />
          <span class="github-star-badge" aria-hidden="true">
            <Star :size="9" fill="currentColor" :stroke-width="2.5" />
            <span>{{ githubStarsLabel }}</span>
          </span>
        </a>
        <button class="language-toggle" type="button" @click="toggleLocale">
          <Languages :size="16" />
          {{ nextLocaleLabel }}
        </button>
        <a class="topbar-action" :href="localizedDemoUrl" target="_blank" rel="noreferrer">
          <span class="topbar-action-label-full">{{ currentCopy.nav.demo }}</span>
          <span class="topbar-action-label-short">{{ isZh ? '体验' : 'Demo' }}</span>
          <ArrowRight :size="16" />
        </a>
      </div>
    </nav>

    <section id="top" class="hero-section">
      <div class="hero-copy">
        <p class="eyebrow">
          <Sparkles :size="17" />
          {{ currentCopy.hero.eyebrow }}
        </p>
        <h1>
          <template v-if="isZh">
            <span class="hero-title-line">浏览器原生。</span>
            <span class="hero-title-line">离线优先。</span>
            <span class="hero-title-line hero-title-accent">企业级文件预览。</span>
          </template>
          <template v-else>
            <span class="hero-title-line">Browser-native.</span>
            <span class="hero-title-line">Offline-first.</span>
            <span class="hero-title-line hero-title-accent">Enterprise-ready.</span>
          </template>
        </h1>
        <p class="hero-subtitle">{{ currentCopy.hero.subtitle }}</p>
        <div class="hero-actions">
          <a class="button primary" :href="localizedDemoUrl" target="_blank" rel="noreferrer">
            <span>{{ currentCopy.hero.primary }}</span>
            <MonitorPlay :size="18" />
          </a>
          <a class="button secondary" :href="localizedDocsUrl" target="_blank" rel="noreferrer">
            <span>{{ currentCopy.hero.secondary }}</span>
            <BookOpen :size="18" />
          </a>
        </div>
        <div class="hero-badges" aria-label="Highlights">
          <span v-for="item in currentCopy.hero.proof.slice(0, 3)" :key="item">
            <BadgeCheck :size="15" />
            {{ item }}
          </span>
        </div>
      </div>

      <div
        class="hero-visual hero-orbit-stage"
        :data-preview-phase="heroPreviewPhase"
        :data-preview-active="activeHeroPreviewId || undefined"
        :aria-label="
          isZh
            ? 'Word、CAD、电子表格与演示文稿的真实浏览器预览'
            : 'Real browser previews for Word, CAD, spreadsheets, and presentations'
        "
      >
        <div class="hero-orbit-stack">
          <div
            class="hero-preview-item hero-preview-word"
            :class="{
              'is-preview-active': activeHeroPreviewId === 'word' && heroPreviewPhase !== 'leaving',
              'is-preview-cancelling':
                activeHeroPreviewId === 'word' && heroPreviewPhase === 'leaving'
            }"
            tabindex="0"
            role="button"
            :aria-pressed="pinnedHeroPreviewId === 'word'"
            :aria-label="isZh ? '置顶查看 DOCX 预览' : 'Bring the DOCX preview to front'"
            @pointerenter="handleHeroPreviewPointerEnter($event, 'word')"
            @pointerleave="handleHeroPreviewPointerLeave($event, 'word')"
            @pointerdown="activateHeroPreview($event, 'word')"
            @keydown="activateHeroPreviewFromKeyboard($event, 'word')"
          >
            <div
              class="hero-preview-focus"
              @transitionend="handleHeroPreviewTransitionEnd($event, 'word')"
            >
              <figure class="hero-preview-card">
                <figcaption>
                  <span><FileText :size="15" />DOCX</span>
                  <strong>{{ isZh ? '版式文档' : 'Layout document' }}</strong>
                </figcaption>
                <img
                  src="/hero-previews/word.webp"
                  :alt="isZh ? 'Word 文档真实渲染样例' : 'Real Word document rendering sample'"
                  width="1280"
                  height="800"
                  decoding="async"
                  fetchpriority="high"
                />
              </figure>
            </div>
          </div>

          <div
            class="hero-preview-item hero-preview-cad"
            :class="{
              'is-preview-active': activeHeroPreviewId === 'cad' && heroPreviewPhase !== 'leaving',
              'is-preview-cancelling':
                activeHeroPreviewId === 'cad' && heroPreviewPhase === 'leaving'
            }"
            tabindex="0"
            role="button"
            :aria-pressed="pinnedHeroPreviewId === 'cad'"
            :aria-label="isZh ? '置顶查看 DWG 预览' : 'Bring the DWG preview to front'"
            @pointerenter="handleHeroPreviewPointerEnter($event, 'cad')"
            @pointerleave="handleHeroPreviewPointerLeave($event, 'cad')"
            @pointerdown="activateHeroPreview($event, 'cad')"
            @keydown="activateHeroPreviewFromKeyboard($event, 'cad')"
          >
            <div
              class="hero-preview-focus"
              @transitionend="handleHeroPreviewTransitionEnd($event, 'cad')"
            >
              <figure class="hero-preview-card">
                <figcaption>
                  <span><Layers3 :size="15" />DWG</span>
                  <strong>{{ isZh ? '工程图纸' : 'CAD drawing' }}</strong>
                </figcaption>
                <img
                  src="/hero-previews/cad.webp"
                  :alt="isZh ? 'CAD 图纸真实渲染样例' : 'Real CAD drawing rendering sample'"
                  width="1280"
                  height="800"
                  decoding="async"
                />
              </figure>
            </div>
          </div>

          <div
            class="hero-preview-item hero-preview-sheet"
            :class="{
              'is-preview-active':
                activeHeroPreviewId === 'sheet' && heroPreviewPhase !== 'leaving',
              'is-preview-cancelling':
                activeHeroPreviewId === 'sheet' && heroPreviewPhase === 'leaving'
            }"
            tabindex="0"
            role="button"
            :aria-pressed="pinnedHeroPreviewId === 'sheet'"
            :aria-label="isZh ? '置顶查看 XLSX 预览' : 'Bring the XLSX preview to front'"
            @pointerenter="handleHeroPreviewPointerEnter($event, 'sheet')"
            @pointerleave="handleHeroPreviewPointerLeave($event, 'sheet')"
            @pointerdown="activateHeroPreview($event, 'sheet')"
            @keydown="activateHeroPreviewFromKeyboard($event, 'sheet')"
          >
            <div
              class="hero-preview-focus"
              @transitionend="handleHeroPreviewTransitionEnd($event, 'sheet')"
            >
              <figure class="hero-preview-card">
                <figcaption>
                  <span><FileSpreadsheet :size="15" />XLSX</span>
                  <strong>{{ isZh ? '数据报表' : 'Spreadsheet' }}</strong>
                </figcaption>
                <img
                  src="/hero-previews/spreadsheet.webp"
                  :alt="isZh ? '电子表格真实渲染样例' : 'Real spreadsheet rendering sample'"
                  width="1280"
                  height="818"
                  decoding="async"
                />
              </figure>
            </div>
          </div>

          <div
            class="hero-preview-item hero-preview-slide"
            :class="{
              'is-preview-active':
                activeHeroPreviewId === 'slide' && heroPreviewPhase !== 'leaving',
              'is-preview-cancelling':
                activeHeroPreviewId === 'slide' && heroPreviewPhase === 'leaving'
            }"
            tabindex="0"
            role="button"
            :aria-pressed="pinnedHeroPreviewId === 'slide'"
            :aria-label="isZh ? '置顶查看 PPTX 预览' : 'Bring the PPTX preview to front'"
            @pointerenter="handleHeroPreviewPointerEnter($event, 'slide')"
            @pointerleave="handleHeroPreviewPointerLeave($event, 'slide')"
            @pointerdown="activateHeroPreview($event, 'slide')"
            @keydown="activateHeroPreviewFromKeyboard($event, 'slide')"
          >
            <div
              class="hero-preview-focus"
              @transitionend="handleHeroPreviewTransitionEnd($event, 'slide')"
            >
              <figure class="hero-preview-card">
                <figcaption>
                  <span><PanelTop :size="15" />PPTX</span>
                  <strong>{{ isZh ? '演示文稿' : 'Presentation' }}</strong>
                </figcaption>
                <img
                  src="/hero-previews/presentation.webp"
                  :alt="isZh ? '演示文稿真实渲染样例' : 'Real presentation rendering sample'"
                  width="1280"
                  height="800"
                  decoding="async"
                />
              </figure>
            </div>
          </div>
        </div>
        <div
          v-if="heroPreviewShield"
          class="hero-preview-event-shield"
          :data-preview-shield="heroPreviewShield.id"
          :style="heroPreviewShieldStyle"
          aria-hidden="true"
          @pointerenter="handleHeroPreviewShieldPointerEnter"
          @pointerleave="handleHeroPreviewShieldPointerLeave"
        />
        <div class="hero-orbit-status" aria-hidden="true">
          <span><LockKeyhole :size="14" />{{ isZh ? '浏览器本地渲染' : 'Browser-local' }}</span>
          <span><Zap :size="14" />{{ isZh ? 'CSS 3D 合成' : 'CSS 3D compositing' }}</span>
        </div>
      </div>
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
      ref="demoReveal"
      class="demo-reveal-section"
      :class="{ 'demo-reveal-active': demoRevealActive }"
      aria-labelledby="demo-title"
    >
      <div class="demo-reveal-stage">
        <div class="demo-reveal-copy">
          <div>
            <p class="section-kicker">Live demo</p>
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
            <span>{{ isZh ? '完整预览器' : 'full viewer' }}</span>
          </div>
          <div class="demo-browser demo-browser-wide">
            <div class="demo-browser-bar">
              <span />
              <span />
              <span />
              <strong>demo.file-viewer.app</strong>
            </div>
            <div class="demo-frame-stack">
              <picture class="demo-frame-poster" :class="{ 'is-hidden': demoFrameReady }">
                <source media="(max-width: 760px)" :srcset="demoPreviewMobilePath" />
                <img
                  :src="demoPreviewDesktopPath"
                  :alt="
                    isZh
                      ? 'File Viewer v2.2.8 沉浸式 DOCX 预览界面'
                      : 'File Viewer v2.2.8 immersive DOCX preview UI'
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
                :src="localizedDemoUrl"
                :title="isZh ? 'File Viewer 在线 Demo' : 'File Viewer live demo'"
                loading="lazy"
                @load="handleDemoFrameLoad"
              ></iframe>
            </div>
          </div>
          <div class="demo-seam demo-seam-bottom">
            <span>{{ isZh ? '真实样例矩阵' : 'real sample matrix' }}</span>
          </div>
        </div>
      </div>
    </section>

    <section
      id="formats"
      class="band band-light format-index-section"
      aria-labelledby="formats-title"
    >
      <div class="section-heading">
        <div>
          <p class="section-kicker">Coverage matrix</p>
          <h2 id="formats-title">{{ currentCopy.matrixTitle }}</h2>
        </div>
        <p>{{ currentCopy.matrixIntro }}</p>
      </div>
      <div class="format-grid" :aria-label="currentCopy.formatsTitle">
        <article
          v-for="(group, index) in formatGroups"
          :key="group.label"
          class="format-card"
          :class="`accent-${group.tone}`"
        >
          <span class="format-index">{{ String(index + 1).padStart(2, '0') }}</span>
          <span class="format-icon" aria-hidden="true">
            <component :is="group.icon" :size="18" :stroke-width="1.9" />
          </span>
          <h3>{{ group.label }}</h3>
          <strong>{{ group.count }}</strong>
          <p>{{ group.examples }}</p>
          <ArrowRight class="format-arrow" :size="18" aria-hidden="true" />
        </article>
      </div>
    </section>

    <div class="workflow-grid">
      <section id="solutions" class="band scenario-section" aria-labelledby="solutions-title">
        <div class="section-heading compact">
          <p class="section-kicker">In production</p>
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
          <p class="section-kicker">Native components</p>
          <h2 id="ecosystem-title">{{ currentCopy.ecosystemTitle }}</h2>
          <p>{{ currentCopy.ecosystemIntro }}</p>
          <div class="quickstart-tabs" role="tablist" aria-label="Ecosystem quick start examples">
            <button
              v-for="(item, index) in featuredQuickStartItems"
              :id="`quickstart-tab-${index}`"
              :key="item.packageName"
              class="quickstart-tab"
              :class="[
                `quickstart-tab-${item.tone}`,
                { 'is-active': index === activeQuickStartIndex }
              ]"
              :style="{ transitionDelay: `${index * 55}ms` }"
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
              <span>{{ activeQuickStart.install }}</span>
              <strong>{{ activeQuickStart.title }}</strong>
            </div>
            <a :href="activeQuickStart.href" target="_blank" rel="noreferrer">
              {{ isZh ? '完整文档' : 'Full docs' }}
              <ArrowRight :size="15" />
            </a>
          </div>

          <div
            ref="quickStartTrack"
            class="quickstart-track"
            tabindex="0"
            aria-live="polite"
            @scroll.passive="syncQuickStartFromScroll"
          >
            <article
              v-for="(item, index) in featuredQuickStartItems"
              :id="`quickstart-panel-${index}`"
              :key="item.packageName"
              class="code-panel quickstart-panel"
              :class="`quickstart-panel-${item.tone}`"
              role="tabpanel"
              :aria-labelledby="`quickstart-tab-${index}`"
              :aria-hidden="index !== activeQuickStartIndex"
            >
              <div class="code-toolbar">
                <span />
                <span />
                <span />
                <strong>{{ item.language }}</strong>
              </div>
              <pre><code
              class="hljs"
              :class="`language-${item.highlightLanguage}`"
              v-html="highlightSnippet(item.code, item.highlightLanguage)"
            ></code></pre>
            </article>
          </div>

          <div class="quickstart-footer">
            <span>{{ activeQuickStart.summary }}</span>
            <div class="quickstart-dots" aria-label="Quick start slides">
              <button
                v-for="(item, index) in featuredQuickStartItems"
                :key="`dot-${item.packageName}`"
                type="button"
                :class="{ 'is-active': index === activeQuickStartIndex }"
                :aria-label="`${isZh ? '切换到' : 'Show'} ${item.label}`"
                @click="selectQuickStart(index)"
              />
            </div>
          </div>
        </div>
      </section>
    </div>

    <section class="trust-rail-section" aria-labelledby="trust-rail-title">
      <div class="trust-rail-heading">
        <div>
          <p class="section-kicker">Offline architecture</p>
          <h2 id="trust-rail-title">
            {{ isZh ? '文件留在你的环境里。' : 'Your files stay in your environment.' }}
          </h2>
        </div>
        <a :href="resolveLocalizedDocsUrl('guide/distribution')" target="_blank" rel="noreferrer">
          {{ isZh ? '查看部署方式' : 'See deployment options' }}
          <ArrowRight :size="16" />
        </a>
      </div>
      <div class="trust-flow" :aria-label="isZh ? '离线预览链路' : 'Offline preview flow'">
        <article>
          <span>01</span>
          <Boxes :size="21" />
          <strong>{{ isZh ? '你的业务' : 'Your application' }}</strong>
          <small>{{ isZh ? '上传、URL 或业务附件' : 'Upload, URL, or attachment' }}</small>
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
          <strong>{{ isZh ? '预览链路' : 'Preview pipelines' }}</strong>
          <small>{{ isZh ? '按需加载 Worker / WASM' : 'Lazy Worker / WASM loading' }}</small>
        </article>
        <ArrowRight class="trust-flow-arrow" :size="18" aria-hidden="true" />
        <article>
          <span>04</span>
          <Cloud :size="21" />
          <strong>{{ isZh ? '私有部署' : 'Self-hosted assets' }}</strong>
          <small>{{ isZh ? '不上传第三方服务' : 'No third-party upload' }}</small>
        </article>
      </div>
    </section>

    <footer id="support" class="support-footer">
      <div class="support-copy">
        <div class="footer-brand">
          <img src="/logo.png" alt="" />
          <strong>File Viewer</strong>
        </div>
        <h2>{{ currentCopy.supportTitle }}</h2>
        <p>{{ currentCopy.supportIntro }}</p>
      </div>
      <div class="support-entry">
        <button
          ref="supportDialogSponsorTriggerButton"
          type="button"
          class="support-trigger"
          aria-haspopup="dialog"
          :aria-expanded="supportDialogOpen && supportDialogView === 'sponsor'"
          aria-controls="support-dialog"
          @click="openSupportDialog('sponsor')"
        >
          <HeartHandshake :size="20" aria-hidden="true" />
          <span>{{ isZh ? '打赏支持' : 'Support the project' }}</span>
          <ArrowRight :size="18" aria-hidden="true" />
        </button>
        <button
          ref="supportDialogContactTriggerButton"
          type="button"
          class="support-trigger is-contact"
          aria-haspopup="dialog"
          :aria-expanded="supportDialogOpen && supportDialogView === 'contact'"
          aria-controls="support-dialog"
          @click="openSupportDialog('contact')"
        >
          <MessageCircle :size="20" aria-hidden="true" />
          <span>{{ isZh ? '联系我们' : 'Contact us' }}</span>
          <ArrowRight :size="18" aria-hidden="true" />
        </button>
      </div>
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

  <Teleport to="body">
    <Transition name="support-dialog">
      <div
        v-show="supportDialogOpen"
        id="support-dialog"
        class="support-dialog-backdrop"
        :aria-hidden="!supportDialogOpen"
        @click.self="closeSupportDialog"
      >
        <section
          ref="supportDialogPanel"
          class="support-dialog-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="support-dialog-title"
          aria-describedby="support-dialog-description"
          @keydown="handleSupportDialogKeydown"
        >
          <button
            ref="supportDialogCloseButton"
            type="button"
            class="support-dialog-close"
            :aria-label="
              isZh
                ? supportDialogView === 'sponsor'
                  ? '关闭打赏弹层'
                  : '关闭联系弹层'
                : supportDialogView === 'sponsor'
                  ? 'Close support dialog'
                  : 'Close contact dialog'
            "
            @click="closeSupportDialog"
          >
            <X :size="20" aria-hidden="true" />
          </button>

          <header class="support-dialog-heading">
            <span>
              <MessageCircle v-if="supportDialogView === 'contact'" :size="16" aria-hidden="true" />
              <HeartHandshake v-else :size="16" aria-hidden="true" />
              {{
                supportDialogView === 'contact'
                  ? isZh
                    ? '中文联系渠道'
                    : 'International contact'
                  : isZh
                    ? '支持开源维护'
                    : 'Support open source'
              }}
            </span>
            <h2 id="support-dialog-title">
              {{
                supportDialogView === 'contact'
                  ? isZh
                    ? '选择最适合你的联系渠道'
                    : 'Choose a direct contact channel.'
                  : isZh
                    ? '选择你方便的支持方式'
                    : 'Support open-source maintenance.'
              }}
            </h2>
            <p id="support-dialog-description">
              {{
                supportDialogView === 'contact'
                  ? isZh
                    ? '客服微信用于商务与优先支持；公众号和交流群用于获取更新与社区交流。'
                    : 'Reach the File Viewer team through WhatsApp or Telegram.'
                  : isZh
                    ? '扫描微信或支付宝二维码，也可以使用 GitHub Sponsors 或小铺直链。'
                    : 'Choose GitHub Sponsors for recurring support, or open the support shop directly.'
              }}
            </p>
          </header>

          <div
            v-if="isZh && supportDialogView === 'sponsor'"
            class="support-dialog-sponsor"
            data-support-locale="zh-CN"
          >
            <div class="support-dialog-qr-grid">
              <article
                v-for="item in donationQrItems"
                :key="item.label"
                class="support-dialog-qr-card"
              >
                <div class="support-dialog-qr-image">
                  <img :src="item.image" :alt="item.label" decoding="async" />
                </div>
                <strong>{{ item.label }}</strong>
                <span>{{ item.note }}</span>
              </article>
            </div>

            <div class="support-dialog-actions" aria-label="其他打赏方式">
              <a
                class="is-github"
                :href="githubSponsorsUrl"
                target="_blank"
                rel="noopener noreferrer"
              >
                <GitHubMark />
                <span>
                  <strong>GitHub Sponsors</strong>
                  <small>一次性或持续赞助</small>
                </span>
                <ArrowRight :size="18" aria-hidden="true" />
              </a>
              <a :href="domesticSponsorUrl" target="_blank" rel="noopener noreferrer">
                <ShoppingCart :size="20" aria-hidden="true" />
                <span>
                  <strong>小铺打赏</strong>
                  <small>直达小铺支持页面</small>
                </span>
                <ArrowRight :size="18" aria-hidden="true" />
              </a>
            </div>

            <p class="support-dialog-note">
              打赏完全自愿，不影响 File Viewer 的开源功能与使用许可。
            </p>
          </div>

          <div
            v-else-if="isZh && supportDialogView === 'contact'"
            class="support-dialog-contact-layout"
            data-support-locale="zh-CN"
          >
            <div class="support-contact-list" aria-label="中文联系渠道">
              <button
                v-for="item in chineseContactItems"
                :key="item.id"
                type="button"
                :aria-pressed="activeChineseContactId === item.id"
                :class="{ 'is-active': activeChineseContactId === item.id }"
                @click="activeChineseContactId = item.id"
              >
                <span class="support-contact-list-icon">
                  <component :is="item.icon" :size="18" aria-hidden="true" />
                </span>
                <span>
                  <strong>{{ item.label }}</strong>
                  <small>{{ item.note }}</small>
                </span>
                <ArrowRight :size="17" aria-hidden="true" />
              </button>
            </div>

            <article class="support-contact-preview" aria-live="polite">
              <div
                class="support-contact-preview-image"
                :class="{ 'is-portrait': activeChineseContact.id === 'service' }"
              >
                <img
                  :src="activeChineseContact.image"
                  :alt="`${activeChineseContact.label}二维码`"
                  decoding="async"
                />
              </div>
              <strong>{{ activeChineseContact.label }}</strong>
              <span>{{ activeChineseContact.note }}</span>
            </article>
          </div>

          <div
            v-else-if="supportDialogView === 'sponsor'"
            class="support-dialog-international is-sponsor-only"
            data-support-locale="international"
          >
            <section aria-labelledby="international-support-title">
              <h3 id="international-support-title">Support maintenance</h3>
              <div class="support-dialog-actions" aria-label="International support options">
                <a
                  class="is-github"
                  :href="githubSponsorsUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <GitHubMark />
                  <span>
                    <strong>GitHub Sponsors</strong>
                    <small>One-time or recurring support</small>
                  </span>
                  <ArrowRight :size="18" aria-hidden="true" />
                </a>
                <a :href="domesticSponsorUrl" target="_blank" rel="noopener noreferrer">
                  <ShoppingCart :size="20" aria-hidden="true" />
                  <span>
                    <strong>Support shop</strong>
                    <small>Open the direct support page</small>
                  </span>
                  <ArrowRight :size="18" aria-hidden="true" />
                </a>
              </div>
            </section>

            <p class="support-dialog-note">
              Support is optional and does not change the open-source features or license.
            </p>
          </div>

          <div
            v-else
            class="support-dialog-international is-contact-only"
            data-support-locale="international"
          >
            <section aria-labelledby="international-contact-title">
              <h3 id="international-contact-title">International contact</h3>
              <div class="support-international-grid">
                <a
                  :href="whatsappContactUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open WhatsApp contact"
                >
                  <span class="support-international-icon is-whatsapp">
                    <MessageCircle :size="20" aria-hidden="true" />
                  </span>
                  <span>
                    <strong>WhatsApp</strong>
                    <small>Open a direct chat</small>
                  </span>
                  <ArrowRight :size="18" aria-hidden="true" />
                </a>
                <a
                  :href="telegramContactUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open Telegram contact"
                >
                  <span class="support-international-icon is-telegram">
                    <Send :size="20" aria-hidden="true" />
                  </span>
                  <span>
                    <strong>Telegram</strong>
                    <small>@wybaby168</small>
                  </span>
                  <ArrowRight :size="18" aria-hidden="true" />
                </a>
              </div>
            </section>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
