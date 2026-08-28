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
  PackageCheck,
  PlugZap,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  TerminalSquare
} from '@lucide/vue'

type Locale = 'zh' | 'en'
type TerminalExample = 'create' | 'add' | 'prepare'

const locale = computed<Locale>(() => (window.location.pathname.startsWith('/en/') ? 'en' : 'zh'))
const isZh = computed(() => locale.value === 'zh')
const homeUrl = computed(() => (isZh.value ? '/' : '/en/'))
const switchLocaleUrl = computed(() => (isZh.value ? '/en/cli/' : '/cli/'))
const guideUrl = computed(() =>
  isZh.value ? 'https://doc.file-viewer.app/zh/guide/cli' : 'https://doc.file-viewer.app/guide/cli'
)
const activeExample = ref<TerminalExample>('create')
const copied = ref(false)

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
          title: '创建脚手架',
          text: '选择框架、已校验版本、File Viewer 版本、格式、包管理器和资源目录，确认后生成可构建项目。',
          icon: Sparkles
        },
        {
          index: '02',
          title: '接入已有项目',
          text: '检测 package.json、lockfile、框架、preset / Full、Vite、Vue CLI、Webpack、Next、Nuxt、静态目录和入口；不能安全判断时先给出手工步骤。',
          icon: ScanSearch
        },
        {
          index: '03',
          title: '部署运行时资产',
          text: '按已选能力复制资源，也完整保留 file-viewer-copy-assets 的参数、环境变量、合并与安全清理契约。',
          icon: FolderCog
        },
        {
          index: '04',
          title: '缓存与离线交付',
          text: '从明确的 npm 或私有源并行准备精确 tgz，生成完整性清单，并在隔离网络中按哈希复用。',
          icon: PackageCheck
        }
      ]
    : [
        {
          index: '01',
          title: 'Create a scaffold',
          text: 'Choose a framework, validated version, File Viewer release, formats, package manager, and asset path before writing a buildable project.',
          icon: Sparkles
        },
        {
          index: '02',
          title: 'Integrate an existing app',
          text: 'Detect package.json, lockfiles, framework, preset or Full packages, Vite, Vue CLI, Webpack, Next, Nuxt, static directories, and entries; unsafe cases stop with manual steps.',
          icon: ScanSearch
        },
        {
          index: '03',
          title: 'Deploy runtime assets',
          text: 'Copy selected capability assets while preserving the complete file-viewer-copy-assets argument, environment, merge, and safe-cleanup contract.',
          icon: FolderCog
        },
        {
          index: '04',
          title: 'Cache for offline delivery',
          text: 'Prepare exact tgz files from an explicit npm or private registry in parallel, record integrity, and reuse them by hash in an isolated network.',
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
    badge: isZh.value ? '新项目推荐' : 'Recommended',
    title: isZh.value ? '常用格式，明确边界' : 'Common formats, explicit boundary',
    text: isZh.value
      ? 'Word、PDF/OFD、现代 PPTX、Spreadsheet、Archive、Email、Text、Image 和 Media；专业能力保持显式。'
      : 'Word, PDF/OFD, modern PPTX, Spreadsheet, Archive, Email, Text, Image, and Media, with specialist capabilities kept explicit.',
    tone: 'standard'
  },
  {
    name: 'full',
    badge: isZh.value ? '显式全功能' : 'Explicit all-capability',
    title: isZh.value ? '保留 Full，再加入后续可选项' : 'Keep Full, then add later opt-ins',
    text: isZh.value
      ? 'CLI 保留对应历史 Full 包的 preset-all、API 和资产行为，再加入目录中的后续显式能力。当前新增项是 DICOM 与数字签名容器。'
      : 'The CLI preserves the matching historical Full package, preset-all, API, and asset behavior, then adds later explicit catalog capabilities. The current additions are DICOM and digital-signature containers.',
    tone: 'full'
  },
  {
    name: 'custom',
    badge: isZh.value ? '精确选择' : 'Exact selection',
    title: isZh.value ? '只安装实际需要的能力' : 'Install only what the product needs',
    text: isZh.value
      ? '直接选择 renderer、格式或 capability，并生成确定性的注册模块和资产计划。'
      : 'Select renderers, formats, or capabilities and generate a deterministic registration module and asset plan.',
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
        <a class="cli-guide-link" :href="guideUrl" target="_blank" rel="noreferrer">
          {{ isZh ? '完整指南' : 'Complete guide' }}
          <ArrowRight :size="16" />
        </a>
      </nav>
    </header>

    <main>
      <section class="cli-hero">
        <div class="cli-hero-copy">
          <p class="cli-kicker"><TerminalSquare :size="17" /> @file-viewer/cli</p>
          <h1 v-if="isZh">从空目录到可运行预览，<span>也能接好已有项目。</span></h1>
          <h1 v-else>
            From an empty folder to a working viewer, <span>or into the app you already have.</span>
          </h1>
          <p class="cli-hero-intro">
            {{
              isZh
                ? '一个 CLI 完成脚手架、框架检测、格式选型、依赖安装、运行时资产部署和离线 tgz 准备。模块化流程在写入前显示完整计划；旧 copy-assets 兼容命令仍按原契约直接执行。'
                : 'One CLI handles scaffolding, framework detection, format selection, dependency installation, runtime assets, and offline tgz preparation. Modular workflows show a complete plan before writing; the legacy copy-assets command keeps its direct compatibility contract.'
            }}
          </p>
          <div class="cli-hero-actions">
            <a :href="guideUrl" target="_blank" rel="noreferrer">
              {{ isZh ? '查看使用指南' : 'Read the guide' }}
              <ArrowRight :size="17" />
            </a>
            <a
              href="https://www.npmjs.com/package/@file-viewer/cli"
              target="_blank"
              rel="noreferrer"
            >
              npm @file-viewer/cli
            </a>
          </div>
          <div class="cli-hero-proof">
            <span
              ><ShieldCheck :size="15" />{{ isZh ? '写入前确认' : 'Confirm before writes' }}</span
            >
            <span><FileCheck2 :size="15" />{{ isZh ? '确定性配置' : 'Deterministic config' }}</span>
            <span><Download :size="15" />{{ isZh ? '离线可交付' : 'Offline-ready' }}</span>
          </div>
        </div>

        <div class="cli-terminal" aria-label="File Viewer CLI examples">
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
          >
            <button
              v-for="(example, id) in terminalExamples"
              :key="id"
              type="button"
              role="tab"
              :aria-selected="activeExample === id"
              :class="{ 'is-active': activeExample === id }"
              @click="activeExample = id"
            >
              {{ example.label }}
            </button>
          </div>
          <pre><code><span class="cli-prompt">$</span> {{ terminalExamples[activeExample].command }}</code></pre>
          <div class="cli-terminal-status">
            <span><i /> {{ isZh ? '计划可审阅' : 'Reviewable plan' }}</span>
            <span>{{ isZh ? '无运行时 CDN' : 'No runtime CDN' }}</span>
          </div>
        </div>
      </section>

      <section class="cli-workflow" aria-labelledby="workflow-title">
        <div class="cli-section-heading">
          <p>{{ isZh ? '四条工作流' : 'Four workflows' }}</p>
          <h2 id="workflow-title">
            {{
              isZh
                ? '创建、接入、部署、离线准备，在同一套模型中完成。'
                : 'Create, integrate, deploy, and prepare offline from one model.'
            }}
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
          <p>{{ isZh ? '脚手架与自动检测' : 'Scaffold and detection' }}</p>
          <h2 id="frameworks-title">
            {{
              isZh
                ? '选择已校验版本，或尊重现有项目。'
                : 'Choose a validated version, or preserve the project you have.'
            }}
          </h2>
          <p>
            {{
              isZh
                ? 'create 会生成匹配框架的最小可构建项目；add 会检测依赖与构建配置。既有框架版本没有精确模板时，CLI 保留它并给出警告，不会擅自升级。'
                : 'create writes the smallest buildable project for the selected framework. add inspects dependencies and build config. When an existing runtime has no exact scaffold template, the CLI preserves it and warns instead of upgrading it.'
            }}
          </p>
          <a
            :href="guideUrl + (isZh ? '#选择框架和版本' : '#choose-a-framework-and-version')"
            target="_blank"
            rel="noreferrer"
          >
            {{ isZh ? '查看版本与检测规则' : 'See version and detection rules' }}
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
            <p>{{ isZh ? '可持续的格式组合' : 'Sustainable format composition' }}</p>
            <h2 id="profiles-title">
              {{
                isZh
                  ? 'Standard 不是 Full。Full 也不会无限变重。'
                  : 'Standard is not Full. Full does not grow silently.'
              }}
            </h2>
          </div>
          <small>
            {{
              isZh
                ? '现有八个 Full 包继续保持已发布的 preset-all、API、资产和格式行为。'
                : 'The eight existing Full packages keep their published preset-all, API, asset, and format behavior.'
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
                ? 'DICOM 是可选的轻量本地预览，不是医学影像工作站。'
                : 'DICOM is optional local preview, not a medical imaging workstation.'
            }}</strong>
            <p>
              {{
                isZh
                  ? '支持一个本地 DICOM Part 10 文件及其多帧浏览；不包含 series、PACS/DICOMweb、MPR、分割、诊断或内嵌 OHIF。'
                  : 'It supports one local DICOM Part 10 file, including multi-frame navigation. It does not include series, PACS/DICOMweb, MPR, segmentation, diagnosis, or embedded OHIF.'
              }}
            </p>
          </div>
        </div>
      </section>

      <section class="cli-delivery" aria-labelledby="delivery-title">
        <div class="cli-delivery-copy">
          <p>{{ isZh ? '私有源与离线交付' : 'Private and offline delivery' }}</p>
          <h2 id="delivery-title">
            {{
              isZh
                ? '先并行准备，进入隔离网络后按完整性复用。'
                : 'Prepare in parallel, then reuse by integrity inside the isolated network.'
            }}
          </h2>
          <p>
            {{
              isZh
                ? 'prepare/cache 从明确 registry 获取 File Viewer 自有依赖闭包，限制并发、检查每个 tgz，并原子写入清单。认证继续由包管理器或 CI 管理。'
                : 'prepare/cache fetches the File Viewer-owned closure from an explicit registry, bounds concurrency, inspects every tgz, and commits the manifest atomically. Authentication stays in package-manager or CI configuration.'
            }}
          </p>
        </div>
        <ol class="cli-delivery-steps">
          <li>
            <span>01</span
            ><strong>{{
              isZh ? '明确 npm 或私有 registry' : 'Select npm or a private registry'
            }}</strong>
          </li>
          <li>
            <span>02</span
            ><strong>{{
              isZh ? '准备精确 tgz 与完整性清单' : 'Prepare exact tgz files and integrity'
            }}</strong>
          </li>
          <li>
            <span>03</span
            ><strong>{{
              isZh ? '复用离线目录与受控 cache' : 'Reuse the offline directory and bounded cache'
            }}</strong>
          </li>
          <li>
            <span>04</span
            ><strong>{{
              isZh ? 'doctor / verify 阻断漂移' : 'Block drift with doctor / verify'
            }}</strong>
          </li>
        </ol>
      </section>

      <section class="cli-languages" aria-labelledby="languages-title">
        <div>
          <p><Languages :size="17" /> {{ isZh ? '多语言帮助' : 'Multilingual help' }}</p>
          <h2 id="languages-title">
            {{
              isZh
                ? '交互面向团队，JSON 面向自动化。'
                : 'Localized for teams. Stable JSON for automation.'
            }}
          </h2>
          <p>
            {{
              isZh
                ? '向导、帮助和人类可读计划支持四种语言；--json 始终保留稳定英文键，避免 CI 因语言变化失效。'
                : 'Prompts, help, and human-readable plans support four languages. --json keeps stable English keys so CI does not depend on display language.'
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
          <p>{{ isZh ? '从可审阅计划开始' : 'Start with a reviewable plan' }}</p>
          <h2>
            {{
              isZh
                ? '创建新项目，或在已有项目里运行 add。'
                : 'Create a new project or run add in the application you already have.'
            }}
          </h2>
        </div>
        <a :href="guideUrl" target="_blank" rel="noreferrer">
          {{ isZh ? '打开完整 CLI 指南' : 'Open the complete CLI guide' }}
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
            ? '浏览器原生 · 离线优先 · Apache-2.0'
            : 'Browser-native · Offline-first · Apache-2.0'
        }}
      </p>
      <a href="https://github.com/flyfish-dev/file-viewer" target="_blank" rel="noreferrer"
        >GitHub <ArrowRight :size="15"
      /></a>
    </footer>
  </div>
</template>
