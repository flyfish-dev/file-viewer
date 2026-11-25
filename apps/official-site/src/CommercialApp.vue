<script setup lang="ts">
import { computed, ref } from 'vue'
import { FORMAT_CATALOG_SUMMARY } from './formatCatalog.generated'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Boxes,
  Cpu,
  FileText,
  Gauge,
  Gem,
  GitBranch,
  Languages,
  LifeBuoy,
  LockKeyhole,
  Moon,
  Rocket,
  Scale,
  ShieldCheck,
  Sparkles,
  Sun
} from '@lucide/vue'

type Locale = 'zh' | 'en'

const locale = computed<Locale>(() => (window.location.pathname.startsWith('/en/') ? 'en' : 'zh'))
const isZh = computed(() => locale.value === 'zh')
const themePreferenceKey = 'flyfish-site-theme-preference'
const search = new URLSearchParams(window.location.search)
const requestedTheme = search.get('theme')
const hasThemeOverride = requestedTheme === 'light' || requestedTheme === 'dark'
let storedTheme: string | null = null
try {
  storedTheme = window.localStorage.getItem(themePreferenceKey)
} catch {
  // Fall back to the browser preference when storage is unavailable.
}
const theme = ref(
  hasThemeOverride
    ? requestedTheme
    : storedTheme === 'light' || storedTheme === 'dark'
      ? storedTheme
      : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
)

function applyTheme() {
  document.documentElement.dataset.theme = theme.value
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content', theme.value === 'dark' ? '#0f211f' : '#f5f1e9'
  )
}

function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  applyTheme()
  if (hasThemeOverride) {
    const url = new URL(window.location.href)
    url.searchParams.set('theme', theme.value)
    window.history.replaceState(window.history.state, '', url)
  }
  try {
    window.localStorage.setItem(themePreferenceKey, theme.value)
  } catch {
    // The current page can still change theme.
  }
}

applyTheme()

const themeQuery = computed(() => (hasThemeOverride ? `?theme=${theme.value}` : ''))
const themeLabel = computed(() =>
  theme.value === 'dark'
    ? (isZh.value ? '切换到浅色主题' : 'Switch to light theme')
    : (isZh.value ? '切换到深色主题' : 'Switch to dark theme')
)
const homeUrl = computed(() => (isZh.value ? '/' : '/en/') + themeQuery.value)
const switchLocaleUrl = computed(() => (isZh.value ? '/en/commercial/' : '/commercial/') + themeQuery.value)
const commercialProductUrl = 'https://product.flyfish.group/'
const commercialSupportUrl = 'https://dev.flyfish.group/shop'
const demoUrl = 'https://office.flyfish.dev/'

const comparisonRows = computed(() =>
  isZh.value
    ? [
        {
          dimension: '支持哪些文件',
          icon: Boxes,
          open: `免费开源，可在浏览器中离线预览。${FORMAT_CATALOG_SUMMARY.rendererCount} 个渲染器覆盖 ${FORMAT_CATALOG_SUMMARY.registeredExtensionCount} 种已注册的扩展名，其中 ${FORMAT_CATALOG_SUMMARY.stableExtensionCount} 种稳定、${FORMAT_CATALOG_SUMMARY.experimentalExtensionCount} 种处于实验阶段。`,
          commercial:
            '用于预览 Word、Excel 和 PowerPoint，重点保留原文件版式，并提供企业交付。'
        },
        {
          dimension: 'Office 版式',
          icon: Scale,
          open: '可嵌入网页，提供阅读、搜索和打印。DOCX 会按预览窗口重排，分页和版式可能与桌面 Office 不同。',
          commercial:
            '可用合同、报表和正式档案核对分页、字体、表格、图形、页眉页脚、批注、修订和复杂幻灯片版式。'
        },
        {
          dimension: '打开大文件',
          icon: Gauge,
          open: '按需加载核心、渲染器、Worker 和 WASM，适合在网页和附件列表中查看文件。',
          commercial: '通过分块渲染、虚拟滚动、缓存和内存优化处理大文档、大表格和复杂演示稿。'
        },
        {
          dimension: '接入方式',
          icon: GitBranch,
          open: '用 preset 或渲染器选装 PDF、OFD、CAD、压缩包、邮件、绘图、3D 和数据文件等格式。',
          commercial:
            '更换 Office 渲染器，继续使用原有的其他格式、组件 API、主题、工具栏、事件和水印。'
        },
        {
          dimension: '授权与支持',
          icon: ShieldCheck,
          open: 'File Viewer 自有源码和软件包采用 Apache-2.0。可在 GitHub 提交问题，由社区和维护者跟进。正式交付需另行约定。',
          commercial:
            '可约定商业授权、私有交付、交付周期和支持范围，安排样例回归测试、定制兼容和优先技术支持。'
        }
      ]
    : [
        {
          dimension: 'File support',
          icon: Boxes,
          open: `Preview files offline in the browser with the free, open-source viewer. The ${FORMAT_CATALOG_SUMMARY.rendererCount} renderers cover ${FORMAT_CATALOG_SUMMARY.registeredExtensionCount} registered file extensions, including ${FORMAT_CATALOG_SUMMARY.stableExtensionCount} stable and ${FORMAT_CATALOG_SUMMARY.experimentalExtensionCount} experimental extensions.`,
          commercial:
            'Preview Word, Excel, and PowerPoint files with an engine built to preserve their layout. Enterprise delivery is available.'
        },
        {
          dimension: 'Office layout',
          icon: Scale,
          open: 'Embed previews for reading, searching, and printing. DOCX text reflows to fit the viewer, so page breaks and layout can differ from desktop Office.',
          commercial:
            'Check page breaks, fonts, tables, shapes, headers, footers, comments, tracked changes, and complex slide layouts in your contracts, reports, and records.'
        },
        {
          dimension: 'Large files',
          icon: Gauge,
          open: 'The core, renderers, workers, and WebAssembly modules load when needed. This works for typical web previews and attachment lists.',
          commercial:
            'Uses chunked rendering, virtual scrolling, caching, and memory tuning for large documents, spreadsheets, and complex presentations.'
        },
        {
          dimension: 'Integration',
          icon: GitBranch,
          open: 'Use presets or individual renderers for formats such as PDF, OFD, CAD, archives, email, drawings, 3D, and data files.',
          commercial:
            'Switch the Office renderer and keep your other formats, component APIs, themes, toolbars, events, and watermarks.'
        },
        {
          dimension: 'License and support',
          icon: ShieldCheck,
          open: 'File Viewer uses Apache-2.0 for its own source and packages. Report problems on GitHub for community and maintainer support. Agreed delivery terms are a separate arrangement.',
          commercial:
            'Agree on licensing, private delivery, timing, and support. You can arrange regression tests using sample files, compatibility work, and priority technical support.'
        }
      ]
)

const decisionItems = computed(() =>
  isZh.value
    ? [
        { label: '预览一般附件', open: '从开源版开始', commercial: '有 Office 版式要求时再评估', icon: FileText },
        {
          label: '预览合同、报表或正式档案',
          open: '用实际文件核对排版',
          commercial: '优先用实际文件试用',
          icon: BadgeCheck
        },
        { label: '要求服务级别协议（SLA）或定制兼容', open: '通过 GitHub 获取社区支持', commercial: '联系团队确认服务内容和交付时间', icon: LifeBuoy }
      ]
    : [
        {
          label: 'Preview everyday attachments',
          open: 'Start with the open-source viewer',
          commercial: 'Consider it if you have specific Office layout needs',
          icon: FileText
        },
        {
          label: 'Preview contracts, reports, or official records',
          open: 'Check the layout with actual files',
          commercial: 'Test actual files early',
          icon: BadgeCheck
        },
        {
          label: 'Agree on a service-level agreement (SLA) or custom compatibility',
          open: 'Ask for community support on GitHub',
          commercial: 'Contact the team to agree on scope and timing',
          icon: LifeBuoy
        }
      ]
)
</script>

<template>
  <div class="commercial-page" :lang="isZh ? 'zh-CN' : 'en'">
    <header class="commercial-nav">
      <a class="commercial-brand" :href="homeUrl">
        <img src="/brand-mark-96.png" alt="" />
        <span>File Viewer</span>
      </a>
      <div class="commercial-nav-actions">
        <a class="commercial-back" :href="homeUrl">
          <ArrowLeft :size="16" />
          {{ isZh ? '返回主页' : 'Back home' }}
        </a>
        <a class="commercial-language" :href="switchLocaleUrl">
          <Languages :size="16" />
          {{ isZh ? 'EN' : '中文' }}
        </a>
        <button
          class="a-subpage-theme"
          type="button"
          :aria-label="themeLabel"
          @click="toggleTheme"
        >
          <Sun v-if="theme === 'dark'" :size="18" aria-hidden="true" />
          <Moon v-else :size="18" aria-hidden="true" />
        </button>
        <a class="commercial-demo" :href="demoUrl" target="_blank" rel="noreferrer">
          {{ isZh ? '试用商业版' : 'Try the commercial demo' }}
          <ArrowRight :size="16" />
        </a>
      </div>
    </header>

    <main>
      <section class="commercial-hero">
        <div class="commercial-hero-copy">
          <p><Gem :size="17" /> File Viewer</p>
          <h1>
            <template v-if="isZh">
              开源预览组件<span>和商业 Office 引擎</span>
            </template>
            <template v-else>
              Open-source viewer and <span>commercial Office engine</span>
            </template>
          </h1>
          <p class="commercial-hero-intro">
            {{
              isZh
                ? '日常附件可用开源版预览。需要保留 Office 文件版式，或要约定交付和支持时，可把 Word、Excel 和 PowerPoint 的渲染器换成商业版。'
                : 'Use the open-source viewer for everyday attachments. Switch to the commercial Word, Excel, and PowerPoint renderer when document layout or agreed delivery and support matter.'
            }}
          </p>
          <div class="commercial-hero-actions">
            <a :href="commercialProductUrl" target="_blank" rel="noreferrer">
              {{ isZh ? '查看商业版' : 'View the commercial edition' }}
              <ArrowRight :size="17" />
            </a>
            <a :href="commercialSupportUrl" target="_blank" rel="noreferrer">
              {{ isZh ? '联系商业支持' : 'Contact commercial support' }}
            </a>
          </div>
        </div>
        <div class="edition-stage">
          <div class="edition-rail" role="region" :aria-label="isZh ? '版本概览' : 'Edition overview'">
            <article>
              <Boxes :size="25" />
              <strong>{{ isZh ? '开源 File Viewer' : 'Open-source File Viewer' }}</strong>
              <p>
                {{
                  isZh
                    ? '在浏览器中预览多种格式。Apache-2.0'
                    : 'Preview many file types in the browser. Apache-2.0'
                }}
              </p>
            </article>
            <ArrowRight :size="20" aria-hidden="true" />
            <article class="is-commercial">
              <Sparkles :size="25" />
              <strong>{{ isZh ? '商业版 Office 引擎' : 'Commercial Office engine' }}</strong>
              <p>
                {{
                  isZh
                    ? '保留 Office 版式，处理大文件，可约定企业交付。'
                    : 'Preserve Office layouts, open large files, and arrange enterprise delivery.'
                }}
              </p>
            </article>
          </div>
        </div>
      </section>

      <section class="decision-section" aria-labelledby="decision-title">
        <div class="commercial-section-heading">
          <h2 id="decision-title">
            {{ isZh ? '按使用场景选版本' : 'Choose an edition for your files' }}
          </h2>
        </div>
        <div class="decision-table">
          <div class="decision-head" aria-hidden="true">
            <span>{{ isZh ? '使用场景' : 'What you need to do' }}</span>
            <span>{{ isZh ? '开源版' : 'Open source' }}</span>
            <span>{{ isZh ? '商业版' : 'Commercial' }}</span>
          </div>
          <article v-for="item in decisionItems" :key="item.label">
            <strong><component :is="item.icon" :size="18" />{{ item.label }}</strong>
            <span class="decision-answer">
              <span class="decision-edition">{{ isZh ? '开源版' : 'Open source' }}</span>
              {{ item.open }}
            </span>
            <span class="decision-answer">
              <span class="decision-edition">{{ isZh ? '商业版' : 'Commercial' }}</span>
              {{ item.commercial }}
            </span>
          </article>
        </div>
      </section>

      <section class="comparison-section" aria-labelledby="comparison-title">
        <div class="commercial-section-heading">
          <h2 id="comparison-title">
            {{ isZh ? '比较开源版和商业版' : 'Compare the two editions' }}
          </h2>
        </div>
        <div class="comparison-table">
          <div class="comparison-head" aria-hidden="true">
            <span>{{ isZh ? '功能或服务' : 'Feature or service' }}</span>
            <span>{{ isZh ? '开源 File Viewer' : 'Open-source File Viewer' }}</span>
            <span>{{ isZh ? '商业版 Office 引擎' : 'Commercial Office engine' }}</span>
          </div>
          <article v-for="row in comparisonRows" :key="row.dimension">
            <strong><component :is="row.icon" :size="19" />{{ row.dimension }}</strong>
            <p>
              <span>{{ isZh ? '开源版' : 'Open source' }}</span
              >{{ row.open }}
            </p>
            <p class="commercial-cell">
              <span>{{ isZh ? '商业版' : 'Commercial' }}</span
              >{{ row.commercial }}
            </p>
          </article>
        </div>
      </section>

      <section class="replacement-section" aria-labelledby="replacement-title">
        <div class="replacement-copy">
          <h2 id="replacement-title">
            {{
              isZh
                ? '在现有项目中更换 Office 渲染器'
                : 'Switch the Office renderer in your existing project'
            }}
          </h2>
          <span>
            {{
              isZh
              ? '保留已有组件、配置、事件、主题、水印及其他文件格式。'
              : 'Keep your components, options, events, themes, watermarks, and support for other file types.'
            }}
          </span>
        </div>
        <div class="replacement-flow">
          <article>
            <span>01</span><FileText :size="21" /><strong>{{
              isZh ? '沿用现有组件' : 'Keep your viewer component'
            }}</strong>
          </article>
          <ArrowRight :size="17" />
          <article>
            <span>02</span><Cpu :size="21" /><strong>{{
              isZh ? '更换 Office preset' : 'Switch the Office preset'
            }}</strong>
          </article>
          <ArrowRight :size="17" />
          <article>
            <span>03</span><LockKeyhole :size="21" /><strong>{{
              isZh ? '安排私有交付和回归测试' : 'Arrange private delivery and test your files'
            }}</strong>
          </article>
        </div>
      </section>

      <section class="commercial-cta">
        <Rocket :size="25" />
        <div>
          <h2>
            {{
              isZh
                ? '用你的 Office 文件试用'
                : 'Test with your own Office files'
            }}
          </h2>
          <p>
            {{
              isZh
                ? '先打开常用文档和最大的几个文件，检查版式和打开速度。如果项目还要求定制兼容或交付支持，可以联系团队。'
                : 'Start with everyday documents and a few of your largest files. Check the layout and how long they take to open. Contact the team if you need compatibility work or a support agreement.'
            }}
          </p>
        </div>
        <a :href="commercialSupportUrl" target="_blank" rel="noreferrer">
          {{ isZh ? '联系商业支持' : 'Contact commercial support' }}
          <ArrowRight :size="17" />
        </a>
      </section>
    </main>

    <footer class="commercial-footer">
      <a :href="homeUrl"><img src="/brand-mark-96.png" alt="" /> File Viewer</a>
      <span>© 2026 Flyfish Dev</span>
    </footer>
  </div>
</template>
