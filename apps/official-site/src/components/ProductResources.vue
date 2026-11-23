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
    title: props.isZh ? '在 Web 项目中接入' : 'Add a viewer to a web project',
    text: props.isZh
      ? '用原生 JavaScript 或 Web Component 打开第一个文件。'
      : 'Open your first file with plain JavaScript or a Web Component.',
    label: props.isZh ? '快速开始' : 'Quick start',
    href: doc('quickstart-web')
  },
  {
    icon: Layers3,
    title: props.isZh ? '按需加载文件格式' : 'Load formats on demand',
    text: props.isZh
      ? '为需要预览的格式选择 preset，并配置相应的依赖和静态资源。'
      : 'Choose presets for the formats you need, then configure their dependencies and static files.',
    label: props.isZh ? '按需加载文档' : 'On-demand loading guide',
    href: doc('on-demand-renderers')
  },
  {
    icon: Terminal,
    title: props.isZh ? '使用 CLI 配置项目' : 'Set up a project with the CLI',
    text: props.isZh
      ? '新建项目或接入现有应用。先查看 CLI 的修改计划，再验证生成的配置。'
      : 'Create a project or add the viewer to an existing app. Review the proposed changes and verify the generated configuration.',
    label: props.isZh ? 'CLI 使用说明' : 'CLI guide',
    href: props.cliUrl
  },
  {
    icon: Code2,
    title: props.isZh ? '在 Flutter 应用中接入' : 'Add a viewer to a Flutter app',
    text: props.isZh
      ? '从 pub.dev 安装。安装包包含离线资源，应用可提前加载预览器。已在 Apple 芯片和 Intel 芯片的 Mac 上验证。'
      : 'Install from pub.dev. The package includes offline files and supports preloading the viewer. Tested on Macs with Apple silicon and Intel processors.',
    label: props.isZh ? 'Flutter 接入文档' : 'Flutter documentation',
    href: `https://flutter.file-viewer.app/${props.isZh ? 'zh' : 'en'}/docs/quickstart/`
  }
])
const questions = computed(() => [
  {
    q: props.isZh ? '文件需要上传到第三方服务器吗？' : 'Do files need a third-party server?',
    a: props.isZh
      ? '预览在浏览器里完成，无需第三方转码服务。生产环境可以自行托管脚本、Worker、WASM 和字体。通过链接打开文件时，浏览器会从你配置的文件服务读取文件。'
      : 'Preview runs in the browser without a third-party conversion service. You can host the scripts, Workers, WASM and fonts yourself. When you open a file by URL, the browser fetches it from the file service you configured.'
  },
  {
    q: props.isZh ? '什么时候选 Full 包？' : 'When should I use Full?',
    a: props.isZh
      ? '需要预览多种格式时，可以使用 Full 包。只需支持几种格式，或对包大小有限制时，用轻量组件，再安装对应的 preset。'
      : 'Use Full if you need to preview many formats. If you only need a few formats or have a size limit, use a lightweight component and install the presets for those formats.'
  },
  {
    q: props.isZh ? '可以用于商业项目吗？' : 'Can I use it in a commercial project?',
    a: props.isZh
      ? '可以。仓库源码和软件包采用 Apache-2.0。可选的外部依赖适用各自的许可证，旧版 PPT 内置引擎的水印须保留。高还原 Office 引擎和企业支持见商业版说明。'
      : 'Yes. The source and packages use Apache-2.0. Optional dependencies have their own licenses. Keep the watermark in the built-in legacy PPT engine. See the commercial edition for its Office rendering engine and enterprise support.'
  },
  {
    q: props.isZh
      ? '预览能保留原文件的排版吗？'
      : 'Will the preview preserve the original layout?',
    a: props.isZh
      ? '取决于文件格式。有些格式按原页面预览，有些会按窗口宽度重新排版、显示数据结构或播放音视频。格式支持表列出了可用功能，并标注了实验性格式。接入前可以用自己的文件试一下。'
      : 'It depends on the format. The viewer may display pages, reflow content, show structured data or play media. The format guide lists the available features and marks experimental formats. Try your own files before integrating.'
  }
])
</script>

<template>
  <section id="resources" class="product-resources" aria-labelledby="resources-title">
    <header class="resources-heading">
      <div>
        <h2 id="resources-title">{{ isZh ? '接入与部署' : 'Integration and deployment' }}</h2>
      </div>
      <p>
        {{
          isZh
            ? '选择 Web 或 Flutter 的接入方式，再按需要配置文件格式和预览资源。'
            : 'Choose a Web or Flutter integration, then configure the formats and preview files you need.'
        }}
      </p>
    </header>
    <div class="framework-strip" :aria-label="isZh ? '支持的集成方式' : 'Supported integrations'">
      <span><Code2 :size="17" />{{ isZh ? '原生 JavaScript / Web Component' : 'JavaScript / Web Component' }}</span>
      <span>Vue 3</span>
      <span>Vue 2.6 / 2.7</span>
      <span>React / Legacy</span>
      <span>Svelte</span>
      <span>jQuery</span>
      <span>{{ isZh ? 'Flutter（预览版）' : 'Flutter (preview)' }}</span>
      <span>TypeScript</span>
    </div>
    <div class="resource-grid">
      <a
        v-for="item in resources"
        :key="item.href"
        class="resource-card"
        :href="item.href"
        target="_blank"
        rel="noreferrer"
        ><div class="resource-card-top">
          <component :is="item.icon" :size="24" :stroke-width="1.5" />
        </div>
        <h3>{{ item.title }}</h3>
        <p>{{ item.text }}</p>
        <span class="resource-card-link">{{ item.label }}<ArrowRight :size="17" /></span
      ></a>
    </div>
    <div class="delivery-panel">
      <div class="delivery-panel-copy">
        <span class="delivery-icon"><LockKeyhole :size="25" :stroke-width="1.5" /></span>
        <h3>{{ isZh ? '部署方式' : 'Deployment options' }}</h3>
        <p>
          {{
            isZh
              ? '可部署在公网、内网或离线环境。部署时请一并提供预览所需的静态资源。'
              : 'Deploy on a public or private network, or in an offline environment. Include the static files the viewer needs.'
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
              isZh ? '安装组件并发布所需的静态资源' : 'Install the component and serve its runtime files'
            }}</small></span
          ><ArrowRight :size="16" /></a
        ><a :href="releasesUrl" target="_blank" rel="noreferrer"
          ><Download :size="21" /><span
            ><strong>{{ isZh ? '离线安装包' : 'Offline release packages' }}</strong
            ><small>{{
              isZh ? '下载指定版本，在自己的服务器上托管' : 'Download a specific version and host it yourself'
            }}</small></span
          ><ArrowRight :size="16" /></a
        ><a :href="doc('distribution')" target="_blank" rel="noreferrer"
          ><Box :size="21" /><span
            ><strong>Docker / {{ isZh ? '内网部署' : 'Private networks' }}</strong
            ><small>{{
              isZh ? '按部署指南配置运行时文件' : 'Set up runtime files using the deployment guide'
            }}</small></span
          ><ArrowRight :size="16"
        /></a>
      </div>
    </div>
  </section>

  <section class="product-faq" aria-labelledby="faq-title">
    <div>
      <h2 id="faq-title">{{ isZh ? '常见问题' : 'Frequently asked questions' }}</h2>
      <a :href="commercialUrl"
        >{{ isZh ? '开源版与商业版对比' : 'Compare open source and commercial editions' }}<ArrowRight :size="16"
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
        isZh ? '源码与问题反馈' : 'Source code and issue reports'
      }}</strong>
      <p>
        {{
          isZh
            ? '可在 GitHub 查看源码、报告问题或提交修复。报告问题时请附上复现步骤。'
            : 'View the source, report an issue or submit a fix on GitHub. Include steps to reproduce the issue in your report.'
        }}
      </p>
    </div>
    <a :href="githubUrl" target="_blank" rel="noreferrer">GitHub<ArrowRight :size="17" /></a>
  </section>
</template>
