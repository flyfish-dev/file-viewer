<script setup lang="ts">
import { computed } from 'vue'
import {
  ArrowRight,
  BookOpen,
  Box,
  Code2,
  Download,
  GitBranch,
  Layers3,
  LockKeyhole,
  PackageCheck,
  Terminal
} from '@lucide/vue'
const props = defineProps<{
  isZh: boolean
  docsUrl: string
  cliUrl: string
  commercialUrl: string
  releasesUrl: string
  githubUrl: string
}>()
const doc = (path: string) =>
  new URL(`${props.isZh ? 'zh/' : ''}guide/${path}?no_lang_redirect=1`, props.docsUrl).href
const resources = computed(() => [
  {
    icon: BookOpen,
    title: props.isZh ? '从第一个预览开始' : 'Your first file preview',
    text: props.isZh
      ? '先用 Vanilla / Web Component 跑通，再接入熟悉的框架。'
      : 'Start with Vanilla or a Web Component, then integrate with your framework.',
    label: props.isZh ? '快速开始' : 'Quick start',
    href: doc('quickstart-web')
  },
  {
    icon: Layers3,
    title: props.isZh ? '只加载需要的能力' : 'Load what you need',
    text: props.isZh
      ? '按需选择 preset 与格式，明确依赖、资产和加载方式。'
      : 'Choose presets and formats with explicit dependencies, assets and loading paths.',
    label: props.isZh ? '按需加载指南' : 'On-demand guide',
    href: doc('on-demand-renderers')
  },
  {
    icon: Terminal,
    title: props.isZh ? '把重复配置交给 CLI' : 'Let the CLI handle setup',
    text: props.isZh
      ? '新建项目或接入现有应用，先检查计划，再验证配置。'
      : 'Create a project or integrate an existing app. Review the plan, then verify the setup.',
    label: props.isZh ? '探索 File Viewer CLI' : 'Explore File Viewer CLI',
    href: props.cliUrl
  }
])
const questions = computed(() => [
  {
    q: props.isZh ? '文件需要上传到第三方服务器吗？' : 'Do files need a third-party server?',
    a: props.isZh
      ? '预览在浏览器端完成，不需要第三方转码服务。生产环境可以自托管脚本、Worker、WASM 与字体；URL 文件仍需从你配置的文件服务读取。'
      : 'Preview runs in the browser without a third-party conversion service. Self-host scripts, Workers, WASM and fonts. URL-based files are still read from the file service you configure.'
  },
  {
    q: props.isZh ? '应该选 Full 包，还是按需安装？' : 'Should I use Full or an on-demand setup?',
    a: props.isZh
      ? '希望快速覆盖多种格式，可以从 Full 开始；对包体、场景和格式范围有明确要求时，选择轻量组件与对应 preset。轻量组件不包含全部格式能力。'
      : 'Start with Full for broad coverage. Choose a lightweight component and the required presets when you have a specific size budget or format scope. Lightweight components do not include every renderer.'
  },
  {
    q: props.isZh ? '可以用于商业项目吗？' : 'Can I use it in a commercial project?',
    a: props.isZh
      ? '仓库源码与软件包采用 Apache-2.0，可选外部依赖保留各自许可。旧 PPT 内置引擎的水印需要保留。高还原 Office 引擎与企业服务的详细差异请查看商业版页面。'
      : 'The repository and packages use Apache-2.0. Optional dependencies keep their own licenses, and the legacy PPT engine watermark must remain. See the commercial page for Office fidelity and enterprise services.'
  },
  {
    q: props.isZh
      ? '支持扩展名是否代表完全还原？'
      : 'Does a supported extension mean perfect fidelity?',
    a: props.isZh
      ? '不代表。不同格式分别提供版式、流式、结构化或媒体预览，实验格式也有独立标记。请用你的真实文件检查效果，并查看完整矩阵中的能力与限制。'
      : 'No. Formats may offer paginated, flow, structured or media preview, with experimental support marked separately. Test your own files and check the matrix for capabilities and limitations.'
  }
])
</script>

<template>
  <section id="resources" class="product-resources" aria-labelledby="resources-title">
    <header class="resources-heading">
      <div>
        <p class="section-kicker">BUILT TO FIT YOUR STACK</p>
        <h2 id="resources-title">
          {{ isZh ? '从预览，到你的产品。' : 'From a preview to your product.' }}
        </h2>
      </div>
      <p>
        {{
          isZh
            ? '原生接入、可控的加载方式、清晰的部署路径。让文件预览成为产品的一部分。'
            : 'Native integrations, intentional loading and a clear deployment path. Make file preview part of your product.'
        }}
      </p>
    </header>
    <div class="framework-strip" :aria-label="isZh ? '支持的集成方式' : 'Supported integrations'">
      <span><Code2 :size="17" />Vanilla / Web</span><span>Vue 3</span><span>Vue 2.6 / 2.7</span
      ><span>React / Legacy</span><span>Svelte</span><span>jQuery</span><span>TypeScript</span>
    </div>
    <div class="resource-grid">
      <a
        v-for="(item, index) in resources"
        :key="item.href"
        class="resource-card"
        :href="item.href"
        target="_blank"
        rel="noreferrer"
        ><div class="resource-card-top">
          <component :is="item.icon" :size="24" :stroke-width="1.5" /><span>0{{ index + 1 }}</span>
        </div>
        <h3>{{ item.title }}</h3>
        <p>{{ item.text }}</p>
        <span class="resource-card-link">{{ item.label }}<ArrowRight :size="17" /></span
      ></a>
    </div>
    <div class="delivery-panel">
      <div class="delivery-panel-copy">
        <span class="delivery-icon"><LockKeyhole :size="25" :stroke-width="1.5" /></span>
        <p class="section-kicker">YOUR INFRASTRUCTURE. YOUR FILES.</p>
        <h3>{{ isZh ? '为你的环境而部署。' : 'Deploy on your terms.' }}</h3>
        <p>
          {{
            isZh
              ? '从 npm 组件到完整静态资源，在公网、内网与离线环境里，保持同一套预览体验。'
              : 'From npm components to a complete static distribution, keep a consistent preview experience across public, private and offline environments.'
          }}
        </p>
        <a :href="doc('distribution')" target="_blank" rel="noreferrer"
          >{{ isZh ? '部署与分发文档' : 'Distribution guide' }}<ArrowRight :size="17"
        /></a>
      </div>
      <div class="delivery-options">
        <a :href="doc('quickstart-web')" target="_blank" rel="noreferrer"
          ><PackageCheck :size="21" /><span
            ><strong>npm / Full</strong
            ><small>{{
              isZh ? '原生组件，完整资产契约' : 'Native components, packaged assets'
            }}</small></span
          ><ArrowRight :size="16" /></a
        ><a :href="releasesUrl" target="_blank" rel="noreferrer"
          ><Download :size="21" /><span
            ><strong>{{ isZh ? 'Release 离线包' : 'Release archives' }}</strong
            ><small>{{
              isZh ? '固定版本，自托管静态分发' : 'Versioned, self-hosted static delivery'
            }}</small></span
          ><ArrowRight :size="16" /></a
        ><a :href="doc('distribution')" target="_blank" rel="noreferrer"
          ><Box :size="21" /><span
            ><strong>Docker / {{ isZh ? '内网部署' : 'Private networks' }}</strong
            ><small>{{
              isZh ? '按部署指南准备运行时资源' : 'Prepare the runtime for your infrastructure'
            }}</small></span
          ><ArrowRight :size="16"
        /></a>
      </div>
    </div>
  </section>

  <section class="product-faq" aria-labelledby="faq-title">
    <div>
      <p class="section-kicker">BEFORE YOU BUILD</p>
      <h2 id="faq-title">{{ isZh ? '开始之前，先说清楚。' : 'A few things worth knowing.' }}</h2>
      <p>
        {{ isZh ? '能力与边界都透明，才能安心接入。' : 'Clear capabilities. Honest limitations.' }}
      </p>
      <a :href="commercialUrl"
        >{{ isZh ? '免费版与商业版对比' : 'Open source vs. commercial' }}<ArrowRight :size="16"
      /></a>
    </div>
    <div class="faq-list">
      <details v-for="item in questions" :key="item.q">
        <summary>{{ item.q }}<span class="faq-plus" aria-hidden="true">+</span></summary>
        <p>{{ item.a }}</p>
      </details>
    </div>
  </section>

  <section
    class="open-source-note"
    :aria-label="isZh ? '开源与维护' : 'Open source and maintenance'"
  >
    <GitBranch :size="24" :stroke-width="1.5" />
    <div>
      <strong>{{
        isZh ? '代码开放。维护持续。一起向前。' : 'Open code. Ongoing care. Built together.'
      }}</strong>
      <p>
        {{
          isZh
            ? '查看源码、提交可复现的问题，或参与改进。每一份真实反馈都有价值。'
            : 'Explore the source, report a reproducible issue or contribute a fix. Real-world feedback makes the project better.'
        }}
      </p>
    </div>
    <a :href="githubUrl" target="_blank" rel="noreferrer">GitHub<ArrowRight :size="17" /></a>
  </section>
</template>
