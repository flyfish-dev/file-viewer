<script setup lang="ts">
import { computed } from 'vue'
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
  Rocket,
  Scale,
  ShieldCheck,
  Sparkles
} from '@lucide/vue'

type Locale = 'zh' | 'en'

const locale = computed<Locale>(() => (window.location.pathname.startsWith('/en/') ? 'en' : 'zh'))
const isZh = computed(() => locale.value === 'zh')
const homeUrl = computed(() => (isZh.value ? '/' : '/en/'))
const switchLocaleUrl = computed(() => (isZh.value ? '/en/commercial/' : '/commercial/'))
const commercialProductUrl = 'https://product.flyfish.group/'
const commercialSupportUrl = 'https://dev.flyfish.group/shop'
const demoUrl = 'https://office.flyfish.dev/'

const comparisonRows = computed(() =>
  isZh.value
    ? [
        {
          dimension: '产品定位',
          icon: Boxes,
          open: '浏览器原生、多格式、离线优先的开源预览组件。覆盖 265 个已注册扩展名与 44 条独立预览链路，其中 223 个稳定、42 个实验。',
          commercial:
            '面向严肃 Office 场景的原生文档引擎，重点解决 Word、Excel、PowerPoint 的高还原与企业交付。'
        },
        {
          dimension: 'Office 还原度',
          icon: Scale,
          open: '目标是可读、可搜索、可打印、可嵌入。DOCX 偏流式阅读，不承诺与桌面 Office 逐像素一致。',
          commercial:
            '针对分页、字体、表格、图形、页眉页脚、批注修订与复杂演示布局，适合合同、报表和正式档案。'
        },
        {
          dimension: '大文件性能',
          icon: Gauge,
          open: 'core 与 renderer 按需加载，Worker / WASM 懒加载，适合大多数附件中心和在线预览。',
          commercial: '针对大文档、大表格和复杂演示稿提供分块渲染、虚拟滚动、缓存与内存调优。'
        },
        {
          dimension: '格式组合',
          icon: GitBranch,
          open: 'PDF、OFD、CAD、Archive、Email、Drawing、3D、Data 等能力按 preset 或 renderer 自由装配。',
          commercial:
            '只替换 Office 预览链路；其它开源格式能力、组件 API、主题、工具栏、事件和水印继续保留。'
        },
        {
          dimension: '授权与支持',
          icon: ShieldCheck,
          open: 'File Viewer 自有源码与软件包采用 Apache-2.0；社区 issue 与开源维护支持不包含明确交付承诺。',
          commercial:
            '提供商业授权、私有交付、样本回归、定制兼容和优先技术支持，责任边界与周期更明确。'
        }
      ]
    : [
        {
          dimension: 'Product role',
          icon: Boxes,
          open: 'A browser-native, multi-format, offline-first open-source viewer covering 265 registered extensions across 44 preview pipelines: 223 stable and 42 experimental.',
          commercial:
            'A native document engine for serious Office workflows, focused on Word, Excel, and PowerPoint fidelity and enterprise delivery.'
        },
        {
          dimension: 'Office fidelity',
          icon: Scale,
          open: 'Built for readable, searchable, printable, embeddable previews. DOCX is flow-first and does not promise desktop Office pixel parity.',
          commercial:
            'Targets pagination, fonts, tables, shapes, headers, revisions, and complex slide layouts for contracts, reports, and archives.'
        },
        {
          dimension: 'Large-file performance',
          icon: Gauge,
          open: 'Core and renderers load on demand, with lazy Worker and WASM paths for most attachment centers and browser previews.',
          commercial:
            'Adds chunked rendering, virtual scrolling, caching, and memory tuning for large documents, sheets, and complex decks.'
        },
        {
          dimension: 'Format composition',
          icon: GitBranch,
          open: 'PDF, OFD, CAD, archives, email, drawings, 3D, data, and other capabilities stay composable through presets or renderers.',
          commercial:
            'Only the Office path changes. Open-source formats, component APIs, themes, toolbars, events, and watermarks stay in place.'
        },
        {
          dimension: 'License and support',
          icon: ShieldCheck,
          open: 'File Viewer-owned source and packages use Apache-2.0. Community issues and maintenance support do not include delivery commitments.',
          commercial:
            'Commercial licensing, private delivery, sample regression, custom compatibility work, and priority support define clearer ownership.'
        }
      ]
)

const decisionItems = computed(() =>
  isZh.value
    ? [
        { label: '通用附件预览', open: '优先免费版', commercial: '通常不需要', icon: FileText },
        {
          label: '合同 / 报表 / 正式档案',
          open: '先用真实样本验证',
          commercial: '优先评估',
          icon: BadgeCheck
        },
        { label: '明确 SLA 与定制兼容', open: '不包含交付承诺', commercial: '适合', icon: LifeBuoy }
      ]
    : [
        {
          label: 'General attachment preview',
          open: 'Start open source',
          commercial: 'Usually unnecessary',
          icon: FileText
        },
        {
          label: 'Contracts, reports, formal archives',
          open: 'Validate real samples first',
          commercial: 'Evaluate early',
          icon: BadgeCheck
        },
        {
          label: 'Explicit SLA and custom compatibility',
          open: 'No delivery commitment',
          commercial: 'Designed for it',
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
        <a class="commercial-demo" :href="demoUrl" target="_blank" rel="noreferrer">
          {{ isZh ? '查看商业版 Demo' : 'Commercial demo' }}
          <ArrowRight :size="16" />
        </a>
      </div>
    </header>

    <main>
      <section class="commercial-hero">
        <div class="commercial-hero-copy">
          <p><Gem :size="17" /> {{ isZh ? '版本选择指南' : 'Edition guide' }}</p>
          <h1>
            <template v-if="isZh">
              免费版解决通用预览。<br />商业版解决 <span>Office 高还原与交付责任。</span>
            </template>
            <template v-else>
              Open source handles general preview.<br />Commercial handles
              <span>Office fidelity and delivery ownership.</span>
            </template>
          </h1>
          <p class="commercial-hero-intro">
            {{
              isZh
                ? '两者不是互斥产品。商业版可以只替换 Word、Excel、PowerPoint 的渲染链路，其它开源格式与接入 API 保持不变。'
                : 'These are not mutually exclusive products. The commercial engine can replace only the Word, Excel, and PowerPoint path while other open-source formats and APIs stay unchanged.'
            }}
          </p>
          <div class="commercial-hero-actions">
            <a :href="commercialProductUrl" target="_blank" rel="noreferrer">
              {{ isZh ? '了解商业版产品' : 'Explore the commercial product' }}
              <ArrowRight :size="17" />
            </a>
            <a :href="commercialSupportUrl" target="_blank" rel="noreferrer">
              {{ isZh ? '咨询适配方案' : 'Discuss fit and delivery' }}
            </a>
          </div>
        </div>
        <div class="edition-rail" aria-label="Edition overview">
          <article>
            <span>01 / OPEN SOURCE</span>
            <Boxes :size="25" />
            <strong>{{ isZh ? '免费 File Viewer' : 'Open-source File Viewer' }}</strong>
            <p>
              {{
                isZh
                  ? '多格式 · 浏览器原生 · Apache-2.0'
                  : 'Multi-format · Browser-native · Apache-2.0'
              }}
            </p>
          </article>
          <ArrowRight :size="20" aria-hidden="true" />
          <article class="is-commercial">
            <span>02 / COMMERCIAL</span>
            <Sparkles :size="25" />
            <strong>{{ isZh ? '商业版 Office 引擎' : 'Commercial Office engine' }}</strong>
            <p>
              {{
                isZh
                  ? '高还原 · 大文件 · 企业交付'
                  : 'High fidelity · Large files · Enterprise delivery'
              }}
            </p>
          </article>
        </div>
      </section>

      <section class="decision-section" aria-labelledby="decision-title">
        <div class="commercial-section-heading">
          <p>{{ isZh ? '先做选择' : 'Choose quickly' }}</p>
          <h2 id="decision-title">
            {{ isZh ? '什么场景该选哪一个？' : 'Which edition fits the job?' }}
          </h2>
        </div>
        <div class="decision-table">
          <div class="decision-head" aria-hidden="true">
            <span>{{ isZh ? '业务场景' : 'Workload' }}</span>
            <span>{{ isZh ? '免费版' : 'Open source' }}</span>
            <span>{{ isZh ? '商业版' : 'Commercial' }}</span>
          </div>
          <article v-for="item in decisionItems" :key="item.label">
            <strong><component :is="item.icon" :size="18" />{{ item.label }}</strong>
            <span>{{ item.open }}</span>
            <span>{{ item.commercial }}</span>
          </article>
        </div>
      </section>

      <section class="comparison-section" aria-labelledby="comparison-title">
        <div class="commercial-section-heading is-split">
          <div>
            <p>{{ isZh ? '详细差异' : 'Detailed differences' }}</p>
            <h2 id="comparison-title">
              {{ isZh ? '只比较真正影响决策的维度。' : 'Compare only what changes the decision.' }}
            </h2>
          </div>
          <small>
            {{
              isZh
                ? '商业版不是“更多格式”，而是更深的 Office 能力与更明确的交付边界。'
                : 'Commercial is not “more formats.” It is deeper Office capability and clearer delivery ownership.'
            }}
          </small>
        </div>
        <div class="comparison-table">
          <div class="comparison-head" aria-hidden="true">
            <span>{{ isZh ? '维度' : 'Dimension' }}</span>
            <span>{{ isZh ? '免费 File Viewer' : 'Open-source File Viewer' }}</span>
            <span>{{ isZh ? '商业版 Office 引擎' : 'Commercial Office engine' }}</span>
          </div>
          <article v-for="row in comparisonRows" :key="row.dimension">
            <strong><component :is="row.icon" :size="19" />{{ row.dimension }}</strong>
            <p>
              <span>{{ isZh ? '免费版' : 'Open source' }}</span
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
          <p>{{ isZh ? '替换路线' : 'Replacement path' }}</p>
          <h2 id="replacement-title">
            {{
              isZh
                ? '不用重做接入。只替换 Office 引擎。'
                : 'Keep the integration. Replace the Office engine.'
            }}
          </h2>
          <span>
            {{
              isZh
                ? '组件、options、事件、主题、水印和其它格式继续复用。'
                : 'Components, options, events, themes, watermarks, and other formats stay reusable.'
            }}
          </span>
        </div>
        <div class="replacement-flow">
          <article>
            <span>01</span><FileText :size="21" /><strong>{{
              isZh ? '保留组件入口' : 'Keep the component'
            }}</strong>
          </article>
          <ArrowRight :size="17" />
          <article>
            <span>02</span><Cpu :size="21" /><strong>{{
              isZh ? '替换 Office preset' : 'Replace the Office preset'
            }}</strong>
          </article>
          <ArrowRight :size="17" />
          <article>
            <span>03</span><LockKeyhole :size="21" /><strong>{{
              isZh ? '私有交付与回归' : 'Private delivery and regression'
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
                ? '还不确定？拿真实 Office 文件来判断。'
                : 'Still unsure? Decide with real Office files.'
            }}
          </h2>
          <p>
            {{
              isZh
                ? '高还原、大文件或支持责任是关键时，再进入商业版。'
                : 'Move to commercial when fidelity, large files, or support ownership becomes decisive.'
            }}
          </p>
        </div>
        <a :href="commercialSupportUrl" target="_blank" rel="noreferrer">
          {{ isZh ? '咨询方案' : 'Discuss your case' }}
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
