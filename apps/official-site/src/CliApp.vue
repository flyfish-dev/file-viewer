<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  Check,
  ChevronRight,
  CircleGauge,
  Copy,
  Download,
  FileCheck2,
  FolderCog,
  Languages,
  Moon,
  PackageCheck,
  PlugZap,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Sun,
  TerminalSquare
} from '@lucide/vue'

type Locale = 'zh' | 'en'
type TerminalExample = 'create' | 'add' | 'prepare'

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
const switchLocaleUrl = computed(() => (isZh.value ? '/en/cli/' : '/cli/') + themeQuery.value)
const guideUrl = computed(() =>
  isZh.value ? 'https://doc.file-viewer.app/zh/guide/cli' : 'https://doc.file-viewer.app/guide/cli'
)
const activeExample = ref<TerminalExample>('create')
const copied = ref(false)
const exampleOrder: TerminalExample[] = ['create', 'add', 'prepare']

function navigateExamples(event: KeyboardEvent) {
  const current = exampleOrder.indexOf(activeExample.value)
  const choices = {
    ArrowLeft: (current + exampleOrder.length - 1) % exampleOrder.length,
    ArrowRight: (current + 1) % exampleOrder.length,
    Home: 0,
    End: exampleOrder.length - 1
  } as const
  const next = choices[event.key as keyof typeof choices]
  if (next === undefined) return

  event.preventDefault()
  activeExample.value = exampleOrder[next]
  document.getElementById(`cli-example-${activeExample.value}`)?.focus()
}

const terminalExamples = computed<Record<TerminalExample, { label: string; command: string }>>(
  () => ({
    create: {
      label: isZh.value ? '创建项目' : 'Create project',
      command: `npm create file-viewer@latest my-viewer

# Reproducible non-interactive setup
npx file-viewer-cli create my-viewer \\
  --framework vue3 \\
  --profile standard \\
  --formats pdf,docx,xlsx,pptx \\
  --package-manager pnpm \\
  --non-interactive --yes`
    },
    add: {
      label: isZh.value ? '接入现有项目' : 'Add to a project',
      command: `cd existing-app
npx file-viewer-cli add .

# Inspect first, then apply
npx file-viewer-cli add . \\
  --profile standard --json
npx file-viewer-cli add . \\
  --profile standard \\
  --non-interactive --yes`
    },
    prepare: {
      label: isZh.value ? '准备离线包' : 'Prepare offline',
      command: `npx file-viewer-cli prepare \\
  --framework vue3 \\
  --profile standard \\
  --registry https://registry.example.com/ \\
  --offline-dir .file-viewer/offline \\
  --concurrency 4 --yes`
    }
  })
)

const workflow = computed(() =>
  isZh.value
    ? [
        {
          index: '01',
          title: '创建项目',
          text: '先选框架和已验证的框架版本，再选 File Viewer 版本、文件格式、包管理器和资源目录。确认计划后，create 生成可直接构建的项目。',
          icon: Sparkles
        },
        {
          index: '02',
          title: '接入已有项目',
          text: 'add 读取 package.json 和锁文件，识别框架、preset 或 Full 包、构建工具、静态目录和入口。支持 Vite、Vue CLI、Webpack、Next 和 Nuxt。无法确定怎么接入时，CLI 会给出手动步骤。',
          icon: ScanSearch
        },
        {
          index: '03',
          title: '复制预览资源',
          text: '按已选格式和功能复制所需的运行时文件。file-viewer-copy-assets 继续支持原有参数、环境变量、合并和安全清理。',
          icon: FolderCog
        },
        {
          index: '04',
          title: '准备离线安装包',
          text: '从指定的 npm 源或私有源同时下载所需版本的 .tgz 文件，并生成完整性清单。在隔离网络里可按哈希校验后复用。',
          icon: PackageCheck
        }
      ]
    : [
        {
          index: '01',
          title: 'Create a project',
          text: 'Choose a supported framework version, a File Viewer release, formats, a package manager, and an asset folder. Review the plan, then run create to generate a project you can build.',
          icon: Sparkles
        },
        {
          index: '02',
          title: 'Add to an existing project',
          text: 'add reads package.json and the lockfile to find the framework, preset or Full package, build tool, static folder, and entry point. It supports Vite, Vue CLI, Webpack, Next, and Nuxt. If it cannot determine a safe change, it gives you manual steps.',
          icon: ScanSearch
        },
        {
          index: '03',
          title: 'Copy runtime files',
          text: 'Copy the files needed by the formats and features you selected. Existing file-viewer-copy-assets scripts keep their options, environment variables, merge rules, and safe cleanup behavior.',
          icon: FolderCog
        },
        {
          index: '04',
          title: 'Prepare packages for offline use',
          text: 'Download the required versions as .tgz files in parallel from npm or a private registry. Use the integrity manifest to check the files by hash before reusing them on an isolated network.',
          icon: PackageCheck
        }
      ]
)

const frameworks = [
  'Vanilla / Web Component',
  'Vue 3',
  'Vue 2.7',
  'Vue 2.6',
  'React 18 / 19',
  'React Legacy',
  'Svelte 3 / 4 / 5',
  'jQuery'
]

const profiles = computed(() => [
  {
    name: 'standard',
    badge: isZh.value ? '新项目推荐' : 'For new projects',
    title: isZh.value ? '安装常用格式' : 'Install common formats',
    text: isZh.value
      ? '支持 Word、PDF、OFD、PPTX、电子表格、压缩包、邮件、文本、图片和媒体。专业格式和功能按需另选。'
      : 'Includes Word, PDF, OFD, PPTX, spreadsheets, archives, email, text, images, and media. Select specialist formats and features separately.',
    tone: 'standard'
  },
  {
    name: 'full',
    badge: isZh.value ? '完整安装' : 'Full installation',
    title: isZh.value ? '安装 Full 和新增格式' : 'Install Full and the newer formats',
    text: isZh.value
      ? '使用对应的 Full 包及其 preset-all、API 和运行时文件，再安装 DICOM 和数字签名容器。'
      : 'Use the matching Full package with its preset-all, APIs, and runtime files, and add DICOM and digital-signature containers.',
    tone: 'full'
  },
  {
    name: 'custom',
    badge: isZh.value ? '按需安装' : 'Selective installation',
    title: isZh.value ? '自行选择格式或功能' : 'Choose specific formats or features',
    text: isZh.value
      ? '选择渲染器、格式或功能。相同的选项会生成相同的注册模块和资源清单。'
      : 'Select renderers, formats, or features. The same options generate the same registration module and asset plan.',
    tone: 'custom'
  }
])

const languageOptions = [
  ['en', 'English'],
  ['zh-CN', '简体中文'],
  ['ja-JP', '日本語'],
  ['de-DE', 'Deutsch']
]

async function copyCommand() {
  try {
    await navigator.clipboard.writeText(terminalExamples.value[activeExample.value].command)
    copied.value = true
    window.setTimeout(() => {
      copied.value = false
    }, 1600)
  } catch {
    copied.value = false
  }
}
</script>

<template>
  <div class="cli-page" :lang="isZh ? 'zh-CN' : 'en'">
    <header class="cli-nav">
      <a class="cli-brand" :href="homeUrl">
        <img src="/brand-mark-96.png" alt="" />
        <span>File Viewer</span>
        <small>CLI</small>
      </a>
      <nav class="cli-nav-actions" :aria-label="isZh ? 'CLI 页面导航' : 'CLI page navigation'">
        <a class="cli-back" :href="homeUrl">
          <ArrowLeft :size="16" />
          {{ isZh ? '返回主页' : 'Back home' }}
        </a>
        <a class="cli-language" :href="switchLocaleUrl">
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
        <a
          class="cli-guide-link"
          :aria-label="isZh ? 'CLI 使用指南' : 'CLI guide'"
          :href="guideUrl"
          target="_blank"
          rel="noreferrer"
        >
          {{ isZh ? 'CLI 使用指南' : 'CLI guide' }}
          <ArrowRight :size="16" />
        </a>
      </nav>
    </header>

    <main>
      <section class="cli-hero">
        <div class="cli-hero-copy">
          <p class="cli-kicker"><TerminalSquare :size="17" /> @file-viewer/cli</p>
          <h1 v-if="isZh">用命令行<span>接入文件预览</span></h1>
          <h1 v-else>
            Add file previews <span>from the command line</span>
          </h1>
          <p class="cli-hero-intro">
            {{
              isZh
                ? '运行 create 新建项目，或在已有项目中运行 add。选好要预览的格式，CLI 就会准备依赖和运行时文件，并在修改前显示计划。现有 copy-assets 命令仍可直接复制资源。'
                : 'Run create to start a project or add to set up an existing one. Choose the formats you need. The CLI shows what it will change before it installs dependencies and copies runtime files. Existing copy-assets commands still run directly.'
            }}
          </p>
          <div class="cli-hero-actions">
            <a :href="guideUrl" target="_blank" rel="noreferrer">
              {{ isZh ? '查看 CLI 指南' : 'Read the CLI guide' }}
              <ArrowRight :size="17" />
            </a>
            <a
              href="https://www.npmjs.com/package/@file-viewer/cli"
              target="_blank"
              rel="noreferrer"
            >
              {{ isZh ? '在 npm 上查看' : 'View on npm' }}
            </a>
          </div>
          <div class="cli-hero-proof">
            <span
              ><ShieldCheck :size="15" />{{ isZh ? '改动前可检查' : 'Review changes first' }}</span
            >
            <span><FileCheck2 :size="15" />{{ isZh ? '可重复生成配置' : 'Repeatable setup' }}</span>
            <span><Download :size="15" />{{ isZh ? '可准备离线包' : 'Prepare for offline use' }}</span>
          </div>
        </div>

        <div class="cli-terminal-stage">
          <div
            class="cli-terminal"
            role="region"
            :aria-label="isZh ? 'File Viewer CLI 示例' : 'File Viewer CLI examples'"
          >
            <div class="cli-terminal-topbar">
              <div aria-hidden="true"><i /><i /><i /></div>
              <span>file-viewer</span>
              <button
                type="button"
                :aria-label="isZh ? '复制命令' : 'Copy command'"
                @click="copyCommand"
              >
                <Check v-if="copied" :size="15" />
                <Copy v-else :size="15" />
                {{ copied ? (isZh ? '已复制' : 'Copied') : isZh ? '复制' : 'Copy' }}
              </button>
            </div>
            <div
              class="cli-terminal-tabs"
              role="tablist"
              :aria-label="isZh ? '命令示例' : 'Command examples'"
              @keydown="navigateExamples"
            >
              <button
                v-for="id in exampleOrder"
                :id="`cli-example-${id}`"
                :key="id"
                type="button"
                role="tab"
                :aria-selected="activeExample === id"
                :tabindex="activeExample === id ? 0 : -1"
                aria-controls="cli-command-panel"
                :class="{ 'is-active': activeExample === id }"
                @click="activeExample = id"
              >
                {{ terminalExamples[id].label }}
              </button>
            </div>
            <pre id="cli-command-panel" role="tabpanel" :aria-labelledby="`cli-example-${activeExample}`" tabindex="0"><code><span class="cli-prompt">$</span> {{ terminalExamples[activeExample].command }}</code></pre>
            <div class="cli-terminal-status">
              <span><i /> {{ isZh ? '可先检查计划' : 'Preview the plan first' }}</span>
              <span>{{ isZh ? '自行托管运行时文件' : 'Host your own runtime files' }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="cli-workflow" aria-labelledby="workflow-title">
        <div class="cli-section-heading">
          <h2 id="workflow-title">
            {{ isZh ? 'CLI 能做什么' : 'What you can do with the CLI' }}
          </h2>
        </div>
        <div class="cli-workflow-grid">
          <article v-for="item in workflow" :key="item.index">
            <span>{{ item.index }}</span>
            <component :is="item.icon" :size="24" />
            <h3>{{ item.title }}</h3>
            <p>{{ item.text }}</p>
          </article>
        </div>
      </section>

      <section class="cli-frameworks" aria-labelledby="frameworks-title">
        <div class="cli-framework-copy">
          <p>create / add</p>
          <h2 id="frameworks-title">
            {{
              isZh
                ? '支持的框架和版本'
                : 'Supported frameworks and versions'
            }}
          </h2>
          <p>
            {{
              isZh
              ? 'create 为所选框架生成最小的可构建项目。add 会读取现有依赖和构建配置。找不到与当前版本匹配的模板时，CLI 会保留你的框架版本并提示。'
              : 'create generates a minimal project for the framework you choose. add reads the project’s dependencies and build configuration. If no template matches the installed framework version, it keeps that version and shows a warning.'
            }}
          </p>
          <a
            :href="guideUrl + (isZh ? '#选择框架和版本' : '#choose-a-framework-and-version')"
            target="_blank"
            rel="noreferrer"
          >
            {{ isZh ? '查看支持的版本和检测方式' : 'Check framework versions and how detection works' }}
            <ChevronRight :size="16" />
          </a>
        </div>
        <div class="cli-framework-grid">
          <span v-for="framework in frameworks" :key="framework"
            ><PlugZap :size="16" />{{ framework }}</span
          >
        </div>
      </section>

      <section class="cli-profiles" aria-labelledby="profiles-title">
        <div class="cli-section-heading is-split">
          <div>
            <h2 id="profiles-title">
              {{ isZh ? '选择要安装的格式' : 'Choose which formats to install' }}
            </h2>
          </div>
          <small>
            {{
              isZh
                ? '已发布的八个 Full 包保持原有 preset-all、API、运行时文件和格式支持。'
                : 'The eight published Full packages keep the same preset-all, APIs, runtime files, and supported formats.'
            }}
          </small>
        </div>
        <div class="cli-profile-grid">
          <article v-for="profile in profiles" :key="profile.name" :class="`is-${profile.tone}`">
            <div>
              <code>{{ profile.name }}</code
              ><span>{{ profile.badge }}</span>
            </div>
            <h3>{{ profile.title }}</h3>
            <p>{{ profile.text }}</p>
          </article>
        </div>
        <div class="cli-dicom-boundary">
          <CircleGauge :size="22" />
          <div>
            <strong>{{
              isZh
                ? 'DICOM 用于在本地浏览单个文件'
                : 'DICOM opens one local file for preview'
            }}</strong>
            <p>
              {{
                isZh
                  ? '可选装 DICOM 预览，打开 DICOM Part 10 文件后可逐帧查看。不支持序列、PACS/DICOMweb、MPR、分割、诊断或内嵌 OHIF。'
                  : 'Install DICOM support to open a Part 10 file and browse its frames. The preview does not support series, PACS/DICOMweb, MPR, segmentation, diagnosis, or embedded OHIF.'
              }}
            </p>
          </div>
        </div>
      </section>

      <section class="cli-delivery" aria-labelledby="delivery-title">
        <div class="cli-delivery-copy">
          <p>prepare / cache</p>
          <h2 id="delivery-title">
            {{
              isZh
                ? '为隔离网络准备安装包'
                : 'Prepare packages for an isolated network'
            }}
          </h2>
          <p>
            {{
              isZh
                ? 'prepare 和 cache 从指定的源下载所需的 File Viewer 自有包，限制同时下载的数量，并检查每个 .tgz 文件。全部检查完成后再一次性写入清单。源的认证仍由包管理器或 CI 配置。'
                : 'prepare and cache download the required File Viewer packages from the registry you specify. They limit concurrent downloads, check every .tgz file, and replace the manifest in one step after all checks pass. Configure registry authentication in your package manager or CI.'
            }}
          </p>
        </div>
        <ol class="cli-delivery-steps">
          <li>
            <span>01</span
            ><strong>{{
              isZh ? '指定 npm 源或私有源' : 'Specify npm or a private registry'
            }}</strong>
          </li>
          <li>
            <span>02</span
            ><strong>{{
              isZh ? '下载指定版本并生成完整性清单' : 'Download the required versions and write the integrity manifest'
            }}</strong>
          </li>
          <li>
            <span>03</span
            ><strong>{{
              isZh ? '在隔离网络中复用离线目录和受控缓存' : 'Reuse the offline folder and bounded cache on the isolated network'
            }}</strong>
          </li>
          <li>
            <span>04</span
            ><strong>{{
              isZh ? '运行 doctor 和 verify 检查安装和文件' : 'Run doctor and verify to check the setup and files'
            }}</strong>
          </li>
        </ol>
      </section>

      <section class="cli-languages" aria-labelledby="languages-title">
        <div>
          <p><Languages :size="17" /> --lang</p>
          <h2 id="languages-title">
            {{
              isZh
                ? '设置命令行语言'
                : 'Set the CLI language'
            }}
          </h2>
          <p>
            {{
              isZh
                ? '用 --lang 切换向导、帮助和计划的显示语言。CI 中可用 --json 读取固定的英文键名。'
                : 'Use --lang to set the language for prompts, help, and plans. In CI, use --json for the same English keys in every language.'
            }}
          </p>
        </div>
        <div class="cli-language-grid">
          <code v-for="[lang, label] in languageOptions" :key="lang"
            >--lang {{ lang }}<span>{{ label }}</span></code
          >
        </div>
      </section>

      <section class="cli-cta">
        <div>
          <Boxes :size="25" />
          <h2>
            {{
              isZh
                ? '查看适合你项目的命令'
                : 'Find the right command for your project'
            }}
          </h2>
        </div>
        <a :href="guideUrl" target="_blank" rel="noreferrer">
          {{ isZh ? '打开 CLI 使用指南' : 'Open the CLI guide' }}
          <ArrowRight :size="17" />
        </a>
      </section>
    </main>

    <footer class="cli-footer">
      <a class="cli-brand" :href="homeUrl">
        <img src="/brand-mark-96.png" alt="" />
        <span>File Viewer</span>
      </a>
      <p>
        {{
          isZh
            ? '在浏览器中运行，支持离线预览。Apache-2.0'
            : 'Runs in the browser and supports offline previews. Apache-2.0'
        }}
      </p>
      <a href="https://github.com/flyfish-dev/file-viewer" target="_blank" rel="noreferrer"
        >GitHub <ArrowRight :size="15"
      /></a>
    </footer>
  </div>
</template>
