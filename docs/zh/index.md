---
layout: page
title: File Viewer
titleTemplate: false
---

<main class="doc-home doc-home-v2">
<nav class="doc-home-anchor" aria-label="文档首页导航">
<a href="#capability">核心能力</a>
<a href="#demo">Demo</a>
<a href="#presets">预设选择</a>
<a href="#ecosystem">生态接入</a>
<a href="#formats">格式能力</a>
<a href="#delivery">部署分发</a>
</nav>

<section id="capability" class="doc-start doc-product-hero">
<div class="doc-start-copy">
<span class="doc-eyebrow">File Viewer 文档</span>
<h1>File Viewer：文件预览，全部在浏览器完成。</h1>
<p>
为了预览一份内部 DOCX 就上传服务器，糟透了。File Viewer 让 Office、PDF、CAD、压缩包、邮件等文件留在浏览器里。这里面向企业后台、内网和私有化系统，讲清真实接入路径、格式限制、离线资源和上线验证。
</p>
<div class="doc-home-actions">
<a class="doc-action doc-action-primary" href="https://demo.file-viewer.app" target="_blank" rel="noreferrer">立即体验 Demo</a>
<a class="doc-action" href="/zh/guide/formats">查看格式矩阵</a>
<a class="doc-action" href="/zh/guide/quickstart">进入快速开始</a>
</div>
<div class="doc-start-stats" aria-label="File Viewer 核心能力">
<div><strong>208</strong><span>扩展名映射</span></div>
<div><strong>25</strong><span>预览链路</span></div>
<div><strong>离线</strong><span>Worker / WASM / 字体自托管</span></div>
<div><strong>按需</strong><span>preset 与 renderer 组合装配</span></div>
</div>
</div>

<figure class="doc-capability-panel doc-product-preview" aria-label="File Viewer 浏览器原生 DOCX 预览工作区">
<picture>
<source media="(max-width: 720px)" srcset="/_media/file-viewer-demo-v2.2.6-mobile-zh.webp" />
<img src="/_media/file-viewer-demo-v2.2.6-desktop-zh.webp" alt="File Viewer 中文浏览器原生 DOCX 预览工作区" width="1600" height="900" />
</picture>
<figcaption><strong>208 个扩展名</strong><span>25 条按需预览链路 · Worker、WASM、字体和 vendor 资源均可自托管</span></figcaption>
</figure>
</section>

<section class="doc-section doc-capability-section">
<div class="doc-section-heading">
<span>Platform Capability</span>
<h2>不只是展示文件，而是把预览链路做成可交付的前端能力。</h2>
<p>从格式识别、渲染调度、资源加载、用户交互到部署分发，File Viewer 以模块化架构把复杂预览能力拆成可控制、可验证、可持续升级的能力单元。</p>
</div>
<div class="doc-feature-grid">
<article class="doc-card"><strong>多格式高还原</strong><h3>覆盖真实业务附件</h3><p>PDF、Word、Excel、PPT/PPTX、OFD、Typst、CAD、DWF、PSD、Mermaid、PlantUML、压缩包内嵌预览等能力按模块维护。</p></article>
<article class="doc-card"><strong>按需与性能</strong><h3>命中文件才加载重型依赖</h3><p>renderer、worker、wasm、字体和 vendor 资源分层加载，IIFE full 入口也不会把全部能力压进首个脚本。</p></article>
<article class="doc-card"><strong>交互一致性</strong><h3>预览器级操作统一</h3><p>搜索定位、缩放、打印、导出、下载、水印、工具栏权限和生命周期回调保持一致，减少业务侧重复适配。</p></article>
<article class="doc-card"><strong>样式隔离</strong><h3>宿主 CSS 不再轻易污染预览区</h3><p>所有标准组件默认使用 Shadow DOM；主题定制使用 tokens 与 <code>::part()</code>，仅旧版深层覆盖场景使用 <code>styleIsolation:'none'</code>。</p></article>
<article class="doc-card"><strong>企业化部署</strong><h3>公网、内网和离线都能落地</h3><p>Worker/WASM/字体资源可自托管，支持 Docker、静态站点、Cloudflare Pages、Release 包和私有 CDN。</p></article>
</div>
</section>

<section id="demo" class="doc-demo-stage">
<div class="doc-section-heading">
<span>Live Experience</span>
<h2>先体验真实文件，再决定装配哪些能力。</h2>
<p>v2.2.9 Demo 使用沉浸式文档工作台：页面只让文档容器滚动，顶部来源胶囊和右侧工具组保持固定；每个操作打开自己的就近浮层，移动端则收敛为一个“更多”入口。</p>
</div>
<div class="doc-demo-layout">
<figure class="doc-demo-visual">
<img src="/_media/file-viewer-demo-v2.2.6-formats-zh.gif" alt="File Viewer v2.2.9 中文 Demo：特色 DOCX、PPTX、DWG 与可交互的三维 STEP 模型预览" width="1200" height="750" loading="lazy" />
<figcaption>最新中文 Demo 依次展示特色 DOCX、NASA PPTX、Autodesk DWG 与旋转 STEP 模型，同时保留文件胶囊融合和完整样例库交互。</figcaption>
</figure>
<div class="doc-demo-actions">
<a class="doc-path-card" href="https://demo.file-viewer.app" target="_blank" rel="noreferrer">
<strong>主 Demo</strong>
<span>上传文件、粘贴链接或打开 208 个扩展名映射中的真实样例，并验证统一缩放与格式专项工具。</span>
</a>
<a class="doc-path-card" href="https://demo.file-viewer.app/compare.html" target="_blank" rel="noreferrer">
<strong>文档比对</strong>
<span>左右并排预览、同步滚动、搜索定位和 PDF 工具栏隐藏。</span>
</a>
<a class="doc-path-card" href="/zh/guide/demo">
<strong>Demo 说明</strong>
<span>查看样例覆盖、部署边界和常见验证路径。</span>
</a>
</div>
</div>
</section>

<section id="presets" class="doc-section doc-section-muted doc-preset-section">
<div class="doc-section-heading">
<span>Install Strategy</span>
<h2>先选组件，再选能力。避免把全量格式一次塞进业务页。</h2>
<p>生产项目优先从轻量组件包开始，再按业务选择 preset 或单 renderer。<code>preset-all</code> 覆盖最完整，但体积最大，更适合完整文件工作台或内部验证环境。</p>
</div>
<div class="doc-preset-grid">
<article class="doc-card doc-preset-card">
<strong>轻附件</strong>
<h3>@file-viewer/preset-lite</h3>
<p>图片、文本、Markdown、代码、媒体等常见轻量附件。</p>
</article>
<article class="doc-card doc-preset-card">
<strong>办公文档</strong>
<h3>@file-viewer/preset-office</h3>
<p>PDF、Word、Excel、PowerPoint、OFD、RTF 和 OpenDocument 办公链路。</p>
</article>
<article class="doc-card doc-preset-card">
<strong>工程资料</strong>
<h3>@file-viewer/preset-engineering</h3>
<p>CAD、EDA、3D、地理数据、绘图和结构化工程文件。</p>
</article>
<article class="doc-card doc-preset-card">
<strong>完整工作台</strong>
<h3>@file-viewer/preset-all</h3>
<p>全格式体验与验收场景使用。业务端建议评估体量后再引入。</p>
</article>
</div>
<div class="doc-callout doc-callout-compact">
<strong>安装边界:</strong> 只安装 <code>@file-viewer/vue3</code>、<code>@file-viewer/react</code> 或 <code>@file-viewer/web</code> 是最轻的组件接入方式，但不会自动带入全部格式能力。需要预览文件时，请安装对应 preset 或 renderer。
</div>
<div class="doc-callout doc-callout-compact">
<strong>Full 一包接入:</strong> 重度用户、内部附件中心或验收环境直接安装对应的 <code>*-full</code> 包。Full 已内置 <code>preset-all</code>，不要再安装或传入其它 preset。Vite 通过 <code>fileViewerRenderers({ copyAssets:true })</code> 在开发和构建阶段自动发布同版本 Worker/WASM/字体/vendor 资源；非 Vite 项目运行 Full 包自带的同版本 CLI。
<pre><code>pnpm add @file-viewer/vue3-full
pnpm add -D @file-viewer/vite-plugin # Vite
# Webpack / Vue CLI / Rspack / Rollup / Umi
npx --no-install file-viewer-copy-assets ./public/file-viewer</code></pre>
<p>script 标签页面完整部署 <code>@file-viewer/web-full/dist/</code> 即可，目录已包含全量资产，无需复制。</p>
</div>
</section>

<section id="ecosystem" class="doc-section">
<div class="doc-section-heading">
<span>Native Ecosystem</span>
<h2>每个技术栈都有原生组件，不以 iframe 作为核心路径。</h2>
<p>所有生态组件共享 core 能力、options、事件、搜索、缩放、打印、导出和生命周期钩子，同时保持各框架自己的接入方式。</p>
</div>
<div class="doc-path-grid doc-ecosystem-grid">
<a class="doc-path-card" href="/zh/guide/quickstart-web"><strong>Vanilla JS / Web Component</strong><span>原生标签或 mountViewer 命令式挂载，适合任意页面。</span></a>
<a class="doc-path-card" href="/zh/guide/quickstart-vue3"><strong>Vue 3</strong><span>插件安装、组件 props、事件、ref/controller 和工具栏定制。</span></a>
<a class="doc-path-card" href="/zh/guide/quickstart-vue2"><strong>Vue 2.7 / Vue 2.6</strong><span>兼容旧系统，保留与 Vue3 一致的参数模型。</span></a>
<a class="doc-path-card" href="/zh/guide/quickstart-react"><strong>React / React Legacy</strong><span>Hooks、refs、事件回调和 legacy React 项目接入。</span></a>
<a class="doc-path-card" href="/zh/guide/ecosystem#svelte"><strong>Svelte</strong><span>组件与 action 双路径，适合 SvelteKit 和轻应用。</span></a>
<a class="doc-path-card" href="/zh/guide/ecosystem#jquery"><strong>jQuery</strong><span>传统后台可用 <code>$(el).fileViewer(options)</code> 接入。</span></a>
</div>
</section>

<section id="formats" class="doc-section doc-format-panel">
<div class="doc-section-heading">
<span>Format Matrix</span>
<h2>208 个扩展名映射，由 25 条真实预览链路承接。</h2>
<p>矩阵以代码中已注册的 renderer 为准。重型解析库、Worker、WASM 和离线 vendor 资源仅在命中文件类型时加载，不把“计划支持”混进当前能力。</p>
</div>
<div class="doc-format-grid">
<div><strong>Office</strong><span>DOCX / XLSX / PPT / PPTX / PDF / OFD / Typst</span></div>
<div><strong>Engineering</strong><span>DWG / DXF / DWF / 3D / GIS / EDA / OLB / DRA</span></div>
<div><strong>Knowledge</strong><span>Markdown / Code / Git patch / Git bundle / Mermaid / PlantUML</span></div>
<div><strong>Assets</strong><span>PSD / Images / HEIC / Audio / Video / Fonts / SQLite / Parquet</span></div>
<div><strong>Containers</strong><span>ZIP / RAR / 7Z / TAR / GZIP and nested preview</span></div>
<div><strong>Collaboration</strong><span>EML / MSG / XMind / draw.io / Excalidraw / EPUB / UMD</span></div>
</div>
<div class="doc-link-row">
<a href="/zh/guide/formats">查看完整格式矩阵</a>
<a href="/zh/guide/format-fidelity">查看格式完整度说明</a>
</div>
</section>

<section id="delivery" class="doc-final-band doc-final-band-v2">
<div>
<span>Delivery</span>
<h2>面向内网、私有化和开源分发的完整交付链路。</h2>
<p>
文档站、Demo、官网、npm 包、Docker 镜像、GitHub 开源总仓库和 Release 产物同步维护。需要更高还原度和极致性能的商业版，可从官网进入商业版说明与支持入口。
</p>
</div>
<div class="doc-final-actions">
<a class="doc-action doc-action-primary" href="/zh/guide/distribution">发布与分发</a>
<a class="doc-action" href="/zh/guide/docker">Docker 部署</a>
<a class="doc-action" href="https://github.com/flyfish-dev/file-viewer" target="_blank" rel="noreferrer">GitHub</a>
</div>
</section>
</main>
