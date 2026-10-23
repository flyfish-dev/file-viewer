# 按需渲染架构

<div class="doc-kicker">On-demand Renderer Architecture</div>

<p class="doc-lead">
  文件预览器的格式越来越多，不能让每个项目在安装阶段都承担全部 Office、CAD、Typst、3D、压缩包、邮件和工程格式依赖。
  2.x 的目标是把 core 收敛为轻量、框架无关、纯 TypeScript 的预览底座，把重渲染链路拆成可组合、可自动装配、可独立发布的 renderer package。
</p>

新增的 v3 `standard` profile、CLI 计划、真实闭包预算和 full 切换阻塞项见 [V3 模块化配置](/zh/guide/v3-modular-profiles)。

## 设计目标

| 目标       | 要求                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 安装更快   | 默认组件包只安装 core、组件本身和必要轻量依赖；PDF、Office、CAD、Typst、3D、archive 等重链路不再默认进入 core `dependencies`。 |
| 打包更轻   | 用户只 `import` 自己装配的 renderer，Vite / Rollup / Webpack / Rspack 才会把对应依赖打进最终产物。                             |
| 调试简单   | Vue、React、Svelte、jQuery、Vanilla JS 都仍然是原生组件体验，不回退 iframe；Vite 项目默认由插件自动发现已安装 preset，也保留手动 renderer 控制。 |
| 自动化友好 | 提供 preset、Vite 插件、资产复制 CLI 和校验脚本，让用户可以“一行装配”，也能精确控制企业内网部署资源。                          |
| 渐进兼容   | 先支持 `@file-viewer/preset-all` 维持完整能力，再逐步把默认安装切到 lightweight preset，避免一次性破坏现有客户。               |

## 架构决策

最终方案采用“轻 core + 独立 renderer + preset 编排 + 构建插件自动装配”的四层模型。

| 层级              | 责任                                                                                                  | 不允许做的事                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Core              | 文件源加载、格式识别、renderer registry、生命周期、搜索/定位、缩放、打印导出、统一 options 和事件 API | 直接依赖 PDF.js、Office、CAD、Typst、WASM、地图、3D、压缩包等重库  |
| Renderer package  | 单条格式链路的解析、渲染、worker/wasm/vendor assets、样例、smoke 测试和 README                        | 把 Vue/React/Svelte 组件逻辑塞进 renderer；依赖其它 wrapper 的实现 |
| Preset package    | 把多个 renderer 组合成 `lite`、`office`、`engineering`、`all` 等业务能力包                            | 隐式修改用户 options；在默认组件里偷偷安装全量依赖                 |
| Component package | Vue3、React、Svelte、jQuery、Vanilla JS 等原生组件体验，接收同一套 options 和 renderer/preset         | 使用 iframe 作为主链路；复制 renderer 逻辑；制造不同框架的参数差异 |

关键原则：

- **默认轻量**：安装 `@file-viewer/vue3`、`@file-viewer/react`、`@file-viewer/web` 只得到 core 和组件能力，不得到全部重渲染依赖。
- **显式能力**：用户要 PDF、Office、CAD、Typst、Archive、3D 等能力时，安装对应 renderer 或 preset。
- **安装即装配**：Vite 项目使用 `@file-viewer/vite-plugin` 后，会自动发现已安装 preset 并注入 virtual module；没有安装的能力不进入最终 bundle。
- **全量仍简单**：需要最完整体验时，`@file-viewer/preset-all` 保留“一行安装、一行自动装配”的路径，官方 demo 使用它展示完整能力。
- **资产可追踪**：每个 renderer 的 worker、wasm、字体、vendor 文件必须通过 manifest/CLI 暴露，避免业务方手抄路径。

## 行业基线

- 使用 ESM `import()` 做运行时拆分。插件读取业务项目实际安装的 Vite 主版本：Vite 5—7 写入 `build.rollupOptions.output.manualChunks`，Vite 8 写入 `build.rolldownOptions.output.codeSplitting.groups`。业务已有分组、优先级、输出数组和 `codeSplitting:false` 不会被覆盖。
- 使用 `package.json#exports` 暴露稳定子路径。Node.js 官方文档建议显式定义导出入口，避免用户引用内部文件。
- 使用 renderer 级 chunk 命名策略给 demo / 官网这类应用稳定命名大型渲染链路，便于缓存和排查首屏体积。
- 使用 optional peer / peerDependenciesMeta 时只作为“插件提示”，不把重依赖放回 core；renderer package 自己声明真实依赖。

## 最终包形态

| 包                                                                  | 定位                                                                                                       | 依赖原则                                                                                  |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `@file-viewer/core`                                                 | 纯 TS 核心：类型、格式注册表、source loader、dispatcher、生命周期、搜索、缩放、打印/导出 API、资产解析协议 | 只保留无渲染重依赖的基础代码；不依赖 Vue/React/Svelte，不依赖 Office/CAD/PDF/Typst 等重库 |
| `@file-viewer/vue3`、`@file-viewer/react`、`@file-viewer/svelte` 等 | 生产可用标准组件                                                                                           | 只依赖 core 和自身生态依赖；通过 props/options 接收 `preset` / `renderers`                     |
| `@file-viewer/renderer-*`                                           | 单条或一组强相关渲染链路                                                                                   | 自己声明真实重依赖、worker、wasm、vendor assets 和 smoke 样本                             |
| `@file-viewer/preset-lite`                                          | 文本、Markdown、图片、音视频基础预览                                                                       | 聚合 `renderer-text`、`renderer-image`、`renderer-media`，适合常见轻附件场景               |
| `@file-viewer/preset-standard`                                      | 常用 Office/PDF/OFD/压缩包/邮件/文本/媒体基线                                                              | 不默认包含专业工程、iWork、DICOM、数字签名容器、旧 PPT 等重能力                           |
| `@file-viewer/preset-office`                                        | Word、Spreadsheet、PPT、PDF、OFD 均由独立 renderer 承接                                                   | 聚合文档链路，避免业务手写多个 Office renderer import                                    |
| `@file-viewer/preset-engineering`                                   | CAD、3D、XMind、Draw.io、Excalidraw、Geo、Typst、Archive、EDA 和 Data 结构预览                            | 聚合工程附件链路；仍比 `preset-all` 更窄                                                  |
| `@file-viewer/preset-all`                                           | 已发布兼容 renderer 集合，包含 CHM                                                                         | 既有 demo 和全量发行版保持兼容；后续专业能力仍显式安装                                    |
| `@file-viewer/vite-plugin`                                          | 自动生成 renderer virtual module、复制 assets、设置 manual chunks                                          | 让业务项目按配置自动装配，不需要手写大量 import                                           |

## 可选专业 renderer

流式地理数据可显式装配 `@file-viewer/renderer-3d/geo3d`，支持 LAS/LAZ/COPC、GeoTIFF/COG、CityJSON、3D Tiles 和 3TZ；默认 3D renderer 和 Full preset 不会加载它。普通 TIFF 继续走图片链路，检测到地理标签后才切换。URL 或本地 File 输入保留随机读取；3TZ 解压有大小、数量和路径边界。

```bash
npm install @file-viewer/renderer-3d @giro3d/giro3d@2.0.5
# 需要 3TZ 时再安装
npm install jszip@3.10.2
npx file-viewer-geo3d-assets public/file-viewer/vendor/geo3d
```

```ts
import { createGeo3dRenderer } from '@file-viewer/renderer-3d/geo3d'

const options = {
  rendererMode: 'extend',
  renderers: [createGeo3dRenderer({ assetBaseUrl: '/file-viewer/vendor/geo3d/' })]
}
```

安装的匹配版本解码资产、Worker、WASM 和许可证均部署在本地。检测规则、Range/CORS、3TZ 边界和样例说明见 [Geo3D 指南](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/3d/GEO3D.md)。

从 3.1.2 起，[BPMN 流程图](/zh/guide/bpmn) 和 [XML 校验与转换配置](/zh/guide/xml-profiles) 可显式启用，但不会随 Full 包自动开启。

Adobe 设计、DICOM、数字签名检查与二进制检查器都是显式可选能力，不属于八个已发布 `@file-viewer/*-full` 包或冻结的 `@file-viewer/preset-all` 兼容基线。这样普通升级不会额外引入专业 Worker/WASM、医学影像、密码学或二进制分析依赖，也不会改变 Full 包已经发布的能力边界。

| 可选 renderer | 格式 | 直接安装 | CLI 选择 | 能力边界 |
| --- | --- | --- | --- | --- |
| **Adobe 设计** (`@file-viewer/renderer-design`) | `.psd`、`.psb`、`.pdd`、`.psdt`、`.ai`、`.ait`、`.eps`、`.ps`、`.idml`、`.icml`、`.idms`、`.inx`、`.xd`、`.indd`、`.indt`、`.fla`、`.xfl`、`.ase`、`.aco`、`.abr`、`.csh`、`.pat`、`.grd`、`.asl` | `npm install @file-viewer/renderer-design` | `npx file-viewer-cli config add psd --write` | 在浏览器本地通过 Worker/WASM 预览 Photoshop 保存像素与受支持图层；Illustrator 高还原 PDF-compatible 表面以及可切换的 `illustrator-pgf` 原生 PGF 画板、图层、路径；IDML/exchange 结构、XD/INDD 嵌入预览、现代 XFL、色板、Photoshop 资源和 PostScript；未知操作符与原生语义边界会明确显示。 |
| **DICOM** (`@file-viewer/renderer-dicom`) | `.dcm`、`.dicom` | `npm install @file-viewer/renderer-dicom` | `npx file-viewer-cli config add dicom --write` | 预览一个本地 DICOM Part 10 文件，支持多帧导航、窗宽/窗位、缩放、拖动、旋转、适配视图和基础元数据；不负责 study 组装、PACS/DICOMweb、MPR、分割或诊断。 |
| **数字签名** (`@file-viewer/renderer-signature`) | `.p7m`、`.p7s`、`.p7c`、`.p7b`、`.pkcs7`、`.cms`、`.cmsc`、`.tsd`、`.tst`、`.tsq`、`.tsr`、`.asics`、`.scs`、`.asice`、`.sce`、`.ers`、`.asc`、`.sig`、`.pgp`、`.gpg`、`.jws` | `npm install @file-viewer/renderer-signature` | `npx file-viewer-cli config add p7m --write` | 在浏览器本地做有界容器检查，并分开报告解析、摘要、签名和时间戳结果。 |
| **二进制检查器** (`@file-viewer/renderer-binary`) | `.bin`、`.hex`、`.elf`、`.exe`、`.dll`、`.class`、`.macho` | `npm install @file-viewer/renderer-binary` | `npx file-viewer-cli config add bin --write` | 浏览器本地的只读 offset/十六进制/ASCII 视图，使用受限模块 Worker、虚拟化行、类型值与受审核的 ELF、PE/COFF、Mach-O、PNG、ZIP、WebAssembly、Java class 头部目录；不会声明 `application/octet-stream`，也不会替换专用 renderer。 |

DICOM 安装（包括 CLI `--profile full`）需要遵循包内 [DICOM 安装策略](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/dicom/README.md#应用安装策略)，配置应用根目录的依赖 overrides 并满足 Node.js 要求。默认依赖图仍有审计发现，消费项目不会继承本仓库的 workspace 策略。部署前需验证实际应用及浏览器行为。

### 已经使用 Full 包时

这条规则适用于 `@file-viewer/web-full`、`@file-viewer/vue3-full`、`@file-viewer/vue2.7-full`、`@file-viewer/vue2.6-full`、`@file-viewer/react-full`、`@file-viewer/react-legacy-full`、`@file-viewer/jquery-full` 和 `@file-viewer/svelte-full`。

保留现有 Full 包，只安装业务真正需要的专业 renderer。下面示例同时启用四个当前可选能力；不需要某项时，删除对应安装、import 和数组成员即可：

```bash
npm install @file-viewer/renderer-binary @file-viewer/renderer-design @file-viewer/renderer-dicom @file-viewer/renderer-signature
```

```ts
import { binaryRenderer } from '@file-viewer/renderer-binary'
import { designRenderer } from '@file-viewer/renderer-design'
import { dicomRenderer } from '@file-viewer/renderer-dicom'
import { signatureRenderer } from '@file-viewer/renderer-signature'

const options = {
  rendererMode: 'extend',
  renderers: [binaryRenderer, designRenderer, dicomRenderer, signatureRenderer]
}
```

`rendererMode: 'extend'` 会保留 Full 包提供的 preset，再追加上述 renderer。只有明确希望显式配置成为完整 renderer 集合时，才使用 `replace`。

CLI 管理的项目执行需要的 `config add`，再安装生成的方案：

```bash
# Adobe 设计
npx file-viewer-cli config add psd --write

# DICOM
npx file-viewer-cli config add dicom --write

# 数字签名容器
npx file-viewer-cli config add p7m --write

# 二进制检查器
npx file-viewer-cli config add bin --write

npx file-viewer-cli install --yes
```

直接安装 Full 包与选择 CLI `full` profile 是两个有意区分的入口：Full 包保持已发布的 `preset-all` 兼容基线；CLI `full` 保留对应 Full 包，默认只追加既有 DICOM/签名能力。Adobe 设计与二进制检查器只有在 `config add`、`--formats` 或 `--capabilities` 明确选择后才加入，并先展示体积与许可证边界。

预构建 `web-full` IIFE 只包含已发布的 Full renderer 集合，不内置 Adobe 设计、DICOM、数字签名与二进制检查器 renderer。需要这些能力时，应使用包管理项目或 CLI 生成集成；把可选包复制到 IIFE 旁边并不会完成注册。

数字签名 renderer 可以把安全提取出的 PDF、XML、图片、Office 等内容交回普通嵌套预览链路，因此需要同时保留对应 renderer。密码学验证结果不等于证书或密钥可信，也不能判定合格签名、政策合规或法律效力。

### 二进制检查器边界

二进制检查器只在业务明确需要字节级查看时使用。它没有 MIME 通配路由，不会覆盖 PNG、ZIP、WASM 或其他专用 renderer。首版目录是只读的，默认限制为整文件 16 MiB、解析 5 秒、512 个结构节点、16 层嵌套和单个解码字符串 4 KiB；超限输入会明确失败，不会对任意文件做不完整扫描。每次解析都在一次性模块 Worker 中完成，并在成功、错误、超时或取消后终止；十六进制网格按可见行虚拟化，不会为每个字节创建 DOM 节点。

## 用户最佳体验路径

| 场景                            | 推荐方式                                                  | 安装体验                        | 打包体验                                 |
| ------------------------------- | --------------------------------------------------------- | ------------------------------- | ---------------------------------------- |
| 只预览常见轻量附件              | 安装组件包 + `@file-viewer/preset-lite` 或 text/image/media 单 renderer | 最快，依赖最少                  | 主包只包含轻量 renderer                  |
| 只需要 PDF/Word/Excel/PPT/OFD   | 安装组件包 + `@file-viewer/preset-office`，极致裁剪时再按 renderer 安装 | Office 依赖按文档 preset 聚合   | 只会产生文档相关异步 chunk               |
| CAD/3D/Typst/Archive 等专项能力 | 安装组件包 + `@file-viewer/preset-engineering` 或对应单 renderer | 工程链路按产品形态聚合          | worker/wasm 跟随 renderer asset manifest |
| CHM 帮助文档                    | 安装组件包 + `@file-viewer/renderer-chm`，全格式平台可直接使用 `preset-all` | 单格式安装或完整 preset 均可用 | Rust/WASM Worker 资产自托管到 `vendor/chm/` |
| 企业内网全格式平台              | 安装组件包 + `@file-viewer/preset-all` + asset copy CLI   | 一次性完整安装                  | chunk 按 renderer 拆分，避免首屏全部执行 |
| 大型业务前端希望自动化          | `@file-viewer/vite-plugin` 自动发现已安装 preset，必要时配置 `formats` / `scan` | 由插件提示缺失 renderer         | 自动生成 virtual module 和部署 manifest  |

因此“分包”不是让用户手动拼很多碎片，而是把默认能力变轻，把完整能力保留为 preset，把工程化项目交给插件自动装配。

## Vite 插件免配置自动装配

`@file-viewer/vite-plugin` 的默认体验是“装了哪个 preset，就自动激活哪个 preset”。当配置为空或只配置 `copyAssets:true`，插件会扫描当前项目依赖中的 `@file-viewer/preset-*`，优先使用 `preset-all`，否则按已安装的 `lite`、`office`、`engineering` 组合注入能力。

```ts
import { defineConfig } from 'vite'
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default defineConfig({
  plugins: [
    fileViewerRenderers({
      copyAssets: true
    })
  ]
})
```

框架组件默认 `autoRenderers:true`，因此 Vue、React、Svelte、jQuery、Vanilla JS / Pure Web 都会自动读取插件注入的 renderer registry。业务侧只有在严格裁剪、源码扫描、或需要完全手动管理 registry 时，才需要额外配置。

| 定制项 | 作用 |
| --- | --- |
| `copyAssets:true` | 复制命中的 Worker、WASM、字体、PDF/CAD/Typst/Archive/CHM/Data 等离线资源；CHM 三个运行时文件写入 `vendor/chm/` |
| `preset:'auto'` / `autoPresets:true` | 与 `scan:true` 同时使用时，继续保留“按已安装 preset 自动激活能力” |
| `formats` / `renderers` | 在 preset 外补充少数格式，或完全使用单 renderer 精确裁剪 |
| `scan:true` | 从源码中的 `fileViewerFormats`、`data-file-viewer-formats`、`accept` 等 hint 收集格式 |
| `inject:false` | 关闭自动注入，改为手动导入 `virtual:file-viewer-renderers` 并传给 `options.renderers` |
| `chunkStrategy:'renderer'` | 使用 renderer 级 chunk 命名，便于缓存和定位体积问题 |

PPTX-only 项目应直接从 `@file-viewer/renderer-pptx` 导入 `pptxRenderer`，或配置 `fileViewerRenderers({ formats: ['pptx'] })`。两条路径都不会把传统 `.ppt` 包、CJK 字体和 WASM 带入安装及生产闭包；原 `@file-viewer/renderer-presentation/pptx` 子路径继续兼容。只需要二进制 `.ppt` 时显式安装 `@file-viewer/renderer-ppt`；两种格式都需要时继续使用根入口 `presentationRenderer`。

## 接入步骤

### 最小化引入：只要一个格式就只装一个 renderer

以 PDF-only 场景为例：

```bash
npm i @file-viewer/vue3 @file-viewer/renderer-pdf
```

```ts
import { pdfRenderer } from '@file-viewer/renderer-pdf'

const options = {
  rendererMode: 'replace',
  renderers: [pdfRenderer]
}
```

这条路径不依赖 Vite，Webpack、Rspack、Rollup、Umi、传统多页应用和微前端壳都可以稳定使用。Vite 项目可以额外安装插件，让插件生成 import 并自动注入：

```bash
npm i -D @file-viewer/vite-plugin
```

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default defineConfig({
  plugins: [
    fileViewerRenderers({
      formats: ['pdf'],
      copyAssets: true,
      chunkStrategy: 'renderer'
    })
  ]
})
```

`copyAssets` 会复制已安装包能提供的离线资产。`@file-viewer/renderer-pdf` 以运行时依赖拥有 `@fontsource-variable/noto-sans-sc`，因此直接安装 renderer 或任何启用 PDF 的 preset 都会自动自托管 CJK 回退字体。`@file-viewer/assets-standard` 仍是 standard profile 的优先预置来源。两种来源都无法解析时，说明已安装的依赖树不完整，构建会给出可操作的失败信息，不会静默移除 CJK 回退能力。`pnpm test:pdf-cjk-font-github-242` 会验证直接所有权，以及必须被复制的字体和许可证载荷。

插件默认 `inject:true`，会把生成的 renderer 模块注入 Vite HTML 入口，组件通过 `autoRenderers` 自动获得能力。常规业务代码无需再手动传 `renderers`。

把 `@file-viewer/vue3` 换成 `@file-viewer/web`、`@file-viewer/react`、`@file-viewer/svelte`、`@file-viewer/jquery`、`@file-viewer/vue2.7` 或 `@file-viewer/vue2.6` 后，仍然使用同一份 `options`。

### 组合引入：按产品形态选 preset

办公文档平台推荐：

```bash
npm i @file-viewer/vue3 @file-viewer/preset-office
```

```ts
import officePreset from '@file-viewer/preset-office'

const options = {
  rendererMode: 'replace',
  preset: officePreset
}
```

如果项目使用 Vite，可以再装插件省去手动 import：

```bash
npm i -D @file-viewer/vite-plugin
```

```ts
import { defineConfig } from 'vite'
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default defineConfig({
  plugins: [
    fileViewerRenderers({
      copyAssets: true
      // 无需 preset:'office'，插件会自动发现已安装 preset。
    })
  ]
})
```

常见轻附件使用 `preset-lite`，CAD / 3D / Typst / EDA / 数据资产等工程附件使用 `preset-engineering`，完整样例矩阵或全格式后台使用 `preset-all`。插件无参或只传 `copyAssets:true` 时会自动发现已安装 preset；`copyAssets:true` 会把 Worker、WASM、PDF 字体、CAD、Typst WASM/字体、Archive、CHM、Data 等离线资源复制到部署目录，其中 CHM 运行时位于 `vendor/chm/`，避免企业内网环境依赖公共 CDN。

全量一键安装:

```bash
npm i @file-viewer/vue3 @file-viewer/preset-all
# Vite 项目再安装插件:
npm i -D @file-viewer/vite-plugin
```

如果需要同时扫描源码 hint 并自动发现已安装 preset，请使用 `preset:'auto'` 或 `autoPresets:true`：

```ts
fileViewerRenderers({
  preset: 'auto',
  scan: true,
  formats: ['pdf'],
  copyAssets: true,
  chunkStrategy: 'renderer'
})
```

如果需要完全手动控制 registry，可以关闭注入并显式传入 virtual module：

```ts
fileViewerRenderers({
  formats: ['pdf'],
  inject: false,
  copyAssets: true
})
```

```ts
import { configuredFileViewerRenderers } from 'virtual:file-viewer-renderers'

const options = {
  rendererMode: 'replace',
  renderers: configuredFileViewerRenderers
}
```

## renderer 包参考

只需要少数格式时，可以跳过 preset，直接安装对应 renderer 并传给 `options.renderers`：

| Renderer 包 | 导出 | 主要链路 |
| --- | --- | --- |
| `@file-viewer/renderer-pdf` | `pdfRenderer` | PDF |
| `@file-viewer/renderer-word` | `wordRenderer` | DOCX、DOC、DOT、RTF、ODT |
| `@file-viewer/renderer-spreadsheet` | `spreadsheetRenderer` | Excel、OpenDocument 表格、CSV 类表格 |
| `@file-viewer/renderer-presentation` | `presentationRenderer` | 二进制 `.ppt` 使用 `@file-viewer/ppt`；OpenXML 演示文稿使用 `@file-viewer/pptx` |
| `@file-viewer/renderer-ofd` | `ofdRenderer` | OFD |
| `@file-viewer/renderer-cad` | `cadRenderer` | DWG、DXF、DWF、DWFx、XPS |
| `@file-viewer/renderer-3d` | `modelRenderer` | 3D 模型和轻量几何签名；`@file-viewer/renderer-3d/ifc` 是单独导出的实验性 IFC 可视预览入口 |
| `@file-viewer/renderer-design` | `designRenderer` | PSD/PSB/PDD/PSDT、AI/AIT、EPS/PS、IDML/ICML/IDMS/INX、XD、INDD/INDT、现代 FLA/XFL、ASE/ACO 与 ABR/CSH/PAT/GRD/ASL |
| `@file-viewer/renderer-dicom` | `dicomRenderer` | 在标准 Viewer 入口中选择启用的本地 DICOM Part 10 单文件与多帧预览 |
| `@file-viewer/renderer-signature` | `signatureRenderer` | 在标准 Viewer 入口中选择启用的 CMS/CAdES、时间戳、ASiC、证据记录、JWS 与公开 OpenPGP 检查 |
| `@file-viewer/renderer-drawing` | `drawingRenderer` | draw.io、Excalidraw、Mermaid、PlantUML |
| `@file-viewer/renderer-mindmap` | `mindmapRenderer` | XMind |
| `@file-viewer/renderer-geo` | `geoRenderer` | GeoJSON、KML、GPX、SHP |
| `@file-viewer/renderer-typst` | `typstRenderer` | Typst 源文件本地 WASM 预览 |
| `@file-viewer/renderer-archive` | `archiveRenderer` | 压缩包和内部文件预览 |
| `@file-viewer/renderer-chm` | `chmRenderer` | CHM 目录、索引、搜索、内部链接与本地 Rust/WASM 正文读取 |
| `@file-viewer/renderer-email` | `emailRenderer` | EML、MSG、MBOX |
| `@file-viewer/renderer-epub` | `ebookRenderer` | EPUB、UMD |
| `@file-viewer/renderer-text` | `textRenderer` | Markdown、代码高亮、patch、git bundle |
| `@file-viewer/renderer-image` | `imageRenderer` | 图片、HEIC / HEIF 链路 |
| `@file-viewer/renderer-media` | `mediaRenderer` | 音频、视频、HLS、MIDI 摘要 |
| `@file-viewer/renderer-data` | `dataRenderer` | PSD、字体、SQLite、Parquet、Avro、WASM、WebArchive |
| `@file-viewer/renderer-eda` | `edaRenderer` | OLB、DRA、GDS、OAS/OASIS |

`@file-viewer/ppt`、`@file-viewer/pptx`、`@file-viewer/geometry-engine`、`@file-viewer/eda-layout` 和 `@file-viewer/eda-orcad` 是 renderer 内部引擎包；常规业务预览优先使用上表 renderer 或 preset。

### 可选 IFC BIM 查看器

显式的 `@file-viewer/renderer-3d/ifc` 只增强 IFC 文件：它在浏览器本地使用 That Open / `web-ifc` 完成可视预览、选择、属性面板和配置钩子。既有 Full/Office 入口保持不变；使用方需要安装可选 peer，并通过 `file-viewer-ifc-assets` 自托管匹配的 Worker/WASM 和许可证资产。官方 Demo 已用 buildingSMART IFC4、IFC4.3 样例验证这条路径。具体安装和许可边界见包内 [IFC 指南](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/3d/IFC.md)。

`preset: 'auto'` 会发现项目中已安装的 preset 包；当 `preset-all` 存在时会优先使用它，避免重复导入其它 preset。

### CHM：自托管 Rust/WASM Worker

只需要 CHM 时直接安装独立 renderer：

```bash
npm i @file-viewer/vue3 @file-viewer/renderer-chm
```

```ts
import { chmRenderer } from '@file-viewer/renderer-chm'

const options = {
  rendererMode: 'replace',
  renderers: [chmRenderer]
}
```

Vite 项目也可以配置 `formats: ['chm']` 和 `copyAssets:true`。`preset-all` 与 Full 包已经包含该 renderer，但部署时仍必须把以下同版本文件自托管到 `file-viewer/vendor/chm/`：

- `chm.worker.js`
- `chm_wasm.js`
- `chm_wasm_bg.wasm`

Vite 插件或同版本 asset copy CLI 会自动发布该目录。非标准部署路径可通过 `options.chm.workerUrl`、`options.chm.wasmModuleUrl` 和 `options.chm.wasmUrl` 覆盖；生产环境不应指向公共 CDN。

CHM 在独立 Worker 中本地解析。主题 HTML 会先清洗，再放入不含 `allow-scripts` 的 iframe sandbox；严格 CSP 同时禁用脚本、插件、表单、base URL 重写和自动加载的外网活动资源。`ms-its:` / `mk:@MSITStore` 内部链接及图片、样式等包内资源只解析回当前 CHM。该能力是只读帮助文档阅读器，不模拟 ActiveX HTML Help 运行环境。

## 缺失 renderer 的友好提示

core 始终保留完整支持矩阵。用户打开矩阵内但当前项目未装配 renderer 的格式时，预览器会显示“需要装配预览能力”，并提示推荐安装的 preset / renderer 包，例如 `.pdf` 会引导安装 `@file-viewer/preset-office` 或 `@file-viewer/renderer-pdf`。只有真正不在支持矩阵中的扩展名才显示“不支持在线预览”，避免用户误以为产品不支持该格式。

## 用户接入方式

### 方式一：轻量默认

```ts
import { FileViewer } from '@file-viewer/vue3'

// Vue / React / Svelte / jQuery / Vanilla JS 都保持同一套 options 语义。
const options = {
  // 当前已可用: 只启用图片这类 core 原生轻量链路。
  // 音视频请额外装配 @file-viewer/renderer-media。
  // 代码、文本和 Markdown 请额外装配 @file-viewer/renderer-text。
  builtinRenderers: 'lite'
}
```

### 方式二：业务按需组合

```ts
import { FileViewer } from '@file-viewer/vue3'
import { pdfRenderer } from '@file-viewer/renderer-pdf'
import { ofdRenderer } from '@file-viewer/renderer-ofd'
import { wordRenderer } from '@file-viewer/renderer-word'
import { spreadsheetRenderer } from '@file-viewer/renderer-spreadsheet'
import { cadRenderer } from '@file-viewer/renderer-cad'

const options = {
  renderers: [pdfRenderer, ofdRenderer, wordRenderer, spreadsheetRenderer, cadRenderer]
}
```

### 方式三：全量体验

```bash
npm i @file-viewer/vue3 @file-viewer/preset-all
npm i -D @file-viewer/vite-plugin
```

```ts
fileViewerRenderers({
  copyAssets: true
})
```

### 方式四：构建插件自动装配

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default defineConfig({
  plugins: [
    fileViewerRenderers({
      formats: ['pdf', 'ofd', 'dwg', 'dxf', 'typst', 'zip', 'xmind', 'geojson'],
      copyAssets: true,
      chunkStrategy: 'renderer'
    })
  ]
})
```

插件默认注入 virtual module；业务组件会自动读取已注册 renderer。只有需要 `rendererMode:'replace'` 的严格裁剪场景，才需要关闭 `inject` 并手动引入 `configuredFileViewerRenderers`。

## Renderer 插件协议

每个 renderer package 暴露稳定的装配对象：

```ts
import type { FileViewerRendererPlugin } from '@file-viewer/core'

export const pdfRenderer: FileViewerRendererPlugin = {
  id: 'pdf',
  definitions: [{ id: 'pdf', extensions: ['pdf'], label: 'PDF' }],
  assets: [{ id: 'pdf.worker', kind: 'worker', source: 'dist/assets/pdf.worker.mjs' }],
  install(registry) {
    registry.register({
      id: 'pdf',
      extensions: ['pdf'],
      handler: async (...args) => {
        const { renderPdf } = await import('./pdfRenderer')
        return renderPdf(...args)
      }
    })
  }
}
```

核心原则：

- `core` 只认识协议，不知道具体 PDF、CAD、Typst、Office 的依赖。
- renderer 的 worker/wasm/vendor 静态资源跟着 renderer 包走，通过统一 asset manifest 暴露。
- wrapper 只负责把用户传入的 renderers 安装进 viewer，不复制渲染逻辑。
- preset 只是 renderer plugin 数组，不再隐藏性地把所有依赖塞进默认组件包。

## Renderer 交付契约

每条独立 renderer 线路必须按同一套标准交付，防止“包拆出来了，但体验和维护反而变差”。

| 项目             | 必须交付                                                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Package manifest | `package.json` 包含 `exports`、`types`、`files`、`publishConfig`、`repository.directory`、准确 `dependencies`，不引用其它 wrapper。 |
| Public API       | 默认导出 renderer plugin，同时命名导出 `xxxRenderer`、`xxxRendererDefinition` 和必要的低阶 `renderFileViewerXxx()`。                |
| Lazy boundary    | renderer 入口只注册定义和 handler；真实重库必须在 handler 内部 `import()`，避免装配时立即执行重逻辑。                               |
| Assets           | worker/wasm/vendor/fonts 通过 manifest 或 copy helper 暴露；不能要求用户猜测 `node_modules` 内部路径。                              |
| Offline          | 所有运行时资源可从 npm 包或 demo public 目录复制，不能依赖第三方 CDN。                                                              |
| Samples          | 每个主要扩展名至少一个真实样例；复杂格式注明“结构预览 / 完整可视预览 / 需要商业转换链路”的边界。                                    |
| Tests            | `type-check`、`build`、format registry smoke、至少一个浏览器 smoke；WASM/worker renderer 需要资产存在校验。                         |
| Documentation    | 中文/英文 README、文档站接入示例、支持格式矩阵、故障排查和内网部署说明。                                                            |
| Release          | npm tarball 校验、公开源码仓同步、root README 和生态矩阵同步。                                                                      |

## 自动装配设计

`@file-viewer/vite-plugin` 是最终的工程化入口，目标不是替代显式 import，而是把显式 import 自动生成。

```ts
fileViewerRenderers({
  formats: ['pdf', 'docx', 'xlsx', 'dwg', 'typst'],
  scan: true,
  copyAssets: true,
  chunkStrategy: 'renderer',
  missingRenderer: 'error'
})
```

插件需要完成：

- 根据 `formats` 查 `renderer manifest`，生成 `virtual:file-viewer-renderers`。
- 支持 `scan: true` 从源码中的 `fileViewerFormats`、`fileViewerRenderers`、`data-file-viewer-formats` 和上传 `accept` 声明自动发现格式，减少手写 import 清单。
- 如果用户选择 `preset: 'all' | 'office' | 'engineering' | 'lite'`，自动 import 对应 preset。
- 检查 package 是否已安装；缺失时给出明确安装命令，而不是运行时报错。
- 复制 worker/wasm/vendor assets，并生成部署清单，服务于 Cloudflare Pages、Vercel、Docker、内网静态部署。
- 为 Vite 8 生成 Rolldown code splitting 配置；为 Vite 7/Rollup/Rspack/Webpack 提供对应 adapter 或文档 fallback。
- 产出 bundle 预算报告，让用户知道每条 renderer 带来的安装和打包成本。

## 复杂格式方案边界

| 格式线                      | 当前优先方案                                                                                                                                                  | 后续拆包方向                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Presentation / PPT / PPTX   | `@file-viewer/renderer-presentation` 作为标准 renderer 插件；二进制 `.ppt` 按需加载包内 `@file-viewer/ppt@0.3.6` Worker/OffscreenCanvas/WASM 与有界帧缓存，OpenXML 文件按需加载 `@file-viewer/pptx` 和另一条 Worker，ODP 仍归 OpenDocument 兼容链路。 | core 不直接依赖任何演示文稿引擎；标准资产布局零配置，`.ppt` 只在自定义路径时使用 `presentation.pptModuleUrl` / `pptWorkerUrl` / `pptWasmUrl` / `pptFontUrl` 覆盖，PPTX 使用 `workerUrl` / `workerType` 覆盖自托管资源。 |
| Word / DOCX / DOC / RTF / ODT | `@file-viewer/renderer-word` 作为标准 renderer 插件，底层按需加载自研 `@file-viewer/docx`、`msdoc-viewer` 和 RTF/OpenDocument 兼容链路。 | core 已移除 `@file-viewer/docx`、`msdoc-viewer`、`rtf.js`、`linkedom` 等 Word 直接依赖，Word 完整预览统一通过 renderer-word 或 preset-all 装配。 |
| OFD                         | 使用 `@file-viewer/renderer-ofd` + `DLTech21/ofd.js` 源码链路在线预览，避开 npm dist 授权 WASM 分支；vendor 源码随 renderer 包离线分发。                  | core 已移除 OFD 兼容入口、`jszip`、`ofd-xml-parser` 和 OFD vendor，OFD 完整预览统一通过 renderer-ofd 或 preset-all 装配。 |
| Typst                       | 使用官方 Typst Rust/WASM 生态在浏览器内编译并渲染，不退化为源码查看。                                                                                         | `@file-viewer/renderer-typst` 独立维护 compiler/renderer WASM、字体和缓存策略。                          |
| Draw.io / diagrams.net / Mermaid / PlantUML | `@file-viewer/renderer-drawing` 以 diagrams.net 官方离线 viewer 包、Excalidraw rough.js 只读 SVG 兜底、Mermaid 官方 SVG 渲染和 PlantUML 离线源码预览 / 可配置 SVG 服务为基准，优先保证离线或自托管预览，不依赖公网 CDN。 | 绘图类格式统一在该包内维护 pan/zoom、主题适配、打印和 HTML 导出；PlantUML 需要完整图形渲染时再配置自托管 `plantumlServerUrl`。 |
| OpenDocument / WPS 兼容格式 | 常规 ODT/ODS/ODP 走 ZIP+XML 结构解析；高保真 Office 兼容方向预留 LibreOffice WASM 路线。                                                                      | Office renderer 拆出后，复杂版式可继续独立演进为 WASM 后端。                                             |
| XMind                       | 解析现代 `content.json` 和经典 `content.xml`，渲染层使用 `@panzoom/panzoom` 提供可拖拽、移动端双指缩放、定位的只读画布；官方 XMind TS/SVG viewer 可作为后续高保真对照，但不直接引入不可控交互。 | core 已移除 XMind 兼容入口和 `@ljheee/xmind-parser` 直接依赖，`@file-viewer/renderer-mindmap` 单独维护 XMind/FreeMind/OPML 等思维导图体验。 |
| GeoJSON / KML / GPX / SHP   | GeoJSON 直接读取，KML/GPX 转 GeoJSON，SHP 走 Shapefile 到 GeoJSON，CRS 归一化后用离线 MapLibre 矢量地图渲染叠加层，WebGL 不可用时回退 SVG。 | core 已移除 geo 兼容入口和 `@tmcw/togeojson` / `shpjs` / `maplibre-gl` / `proj4` 直接依赖，`@file-viewer/renderer-geo` 单独维护地理数据预览体验。 |
| Archive                     | 优先 `libarchive.js` Worker + WASM，覆盖 RAR/7z/TAR/ZIP 等多格式；Worker 不可用时降级 ZIP/TAR/GZIP，内部文件点击后再按需解压和嵌套预览。                      | `@file-viewer/renderer-archive` 独立维护 worker/wasm、缓存、内存上限和移动端 fallback。                  |
| CHM                         | `@file-viewer/renderer-chm` 在独立 Worker 中运行本地 Rust/WASM 解析器，读取 ITSF/ITSP、LZX、目录、索引、主题和包内资源。 | 三个运行时资产自托管于 `vendor/chm/`；主题 HTML 经清洗后进入无脚本 sandbox，并由 CSP 阻断插件、表单和外网活动资源。 |
| EDA / 工程二进制            | `@file-viewer/renderer-eda` 先承接 OLB/DRA/GDSII/OASIS 的结构预览；标准 GDSII 用纯 TS 解析 records，小图生成 SVG 快速版图，大元素集使用 `@file-viewer/eda-layout` 的 WebGL typed-array 批次和 canvas 渲染；OASIS 文本夹具可生成 SVG，真实二进制 OASIS 与 Cadence 专有二进制先做安全索引和诊断。 | OASIS 后续适合引入 KLayout / dump_oas_gds2 路线的 WASM 或 WebGL 增量渲染；Cadence DRA/OLB/DSN 高保真预览以后续 OpenAllegroParser/OpenOrCadParser WASM 化为主。 |

调研结论是：能用成熟官方或事实标准开源链路的格式不手搓；规格复杂、二进制重、需要长期迭代的能力，应该像 PPTX 一样拆成独立内核和独立 renderer 包持续维护。

## 新增格式解析策略

新增格式不再默认塞进 core。能找到成熟浏览器离线库或 WASM 的链路，优先独立 renderer 包维护；只有体积小、协议简单、跨格式复用明确的解析工具才允许留在 core。

| 格式族 | 当前策略 | 后续演进 |
| --- | --- | --- |
| XMind | `.xmind` 按 ZIP 容器读取，现代文件优先解析 `content.json`，经典文件解析 `content.xml`；Panzoom 交互由 `@file-viewer/renderer-mindmap` 维护。 | 继续补多结构布局、更多 marker 图标和复杂图片资源还原，交互回归覆盖 Pointer、真实鼠标、触摸和移动端双指缩放。 |
| Archive | `@file-viewer/renderer-archive` 使用 `libarchive.js` Worker + WASM，Worker 不可用时降级 ZIP/TAR/GZIP。 | 保持 Worker 超时、IndexedDB 缓存和体积上限，不把压缩包依赖带回 core。 |
| CHM | `@file-viewer/renderer-chm` 使用自托管 Rust/WASM Worker 解析目录、索引、LZX 主题和包内资源。 | 保持 `vendor/chm/` 离线资产、解压预算与无脚本 sandbox/CSP；不实现 ActiveX 或任意脚本执行。 |
| Email | `@file-viewer/renderer-email` 使用 `postal-mime` 和 `@kenjiuno/msgreader`，邮件附件复用统一嵌套预览。 | 增强 MSG 边界样例和附件安全策略。 |
| EPUB/UMD | EPUB 使用 `@file-viewer/renderer-epub` 与按需加载的包内本地引擎；UMD 同样由 `@file-viewer/renderer-epub` 维护结构解析和 `pako` 解压。 | 电子书能力统一在 ebook renderer 中维护，core 保持零运行时依赖；v2.3.0 的 EPUB vendor 不从公网加载，也不向业务生产依赖树暴露内部 XML 解析器。 |
| OLB/DRA | `@file-viewer/renderer-eda` 当前基于 CFB 和二进制线索做安全结构树、实体候选、属性、字符串和诊断展示。 | OrCAD/Allegro 属于专业私有工程格式，完整几何/电气语义会像 PPTX 一样拆独立引擎长期维护，必要时引入自研 WASM。 |
| GDS/OASIS | GDSII 已做记录级解析，小图输出 SVG，大元素集输出 WebGL canvas；OASIS 文本夹具可输出 SVG，真实二进制 OASIS 先做安全结构索引和诊断。 | OASIS 完整几何继续走独立 WASM/增量渲染路线，不进入 core 首屏链路。 |
| DWF/DWFx/CAD | CAD 能力由 `@file-viewer/renderer-cad` 和 `@flyfish-dev/cad-viewer` 承接，WASM/Worker 资源通过资产 manifest 自托管。 | 随 cad-viewer 持续升级 DWF/DWFx、DWG/DXF 体验，core 只保留协议和资源发现。 |
| Typst | `@file-viewer/renderer-typst` 按需加载 Typst WASM 编译、SVG 渲染和本地字体资产。 | 保持离线 WASM / 字体配置入口，后续评估更轻量只读渲染内核。 |
| Draw.io / Excalidraw / Mermaid / PlantUML | Draw.io 使用 diagrams.net 离线 viewer 与安全 SVG fallback；Excalidraw 默认使用 rough.js 只读 SVG，运行环境提供官方 ESM 模块时尝试 restore/exportToSvg；Mermaid 使用官方 SVG renderer；PlantUML 默认离线源码预览，可接入自托管 SVG 服务。 | 保持 vendor 离线随包分发；PlantUML 需要完整图形渲染时推荐企业内网自托管服务端点，避免依赖公共公网服务。 |
| OpenDocument | 常规 ODT/ODS/ODP 走 ZIP+XML 结构解析和 Office renderer 兼容链路。 | 复杂版式继续评估 WebODF / LibreOffice WASM，不进入 core 默认依赖。 |

## 开发验证

公开仓中的架构和格式改动可运行以下检查，并为受影响的 renderer 补充测试：

```bash
pnpm audit:renderer-deps
pnpm verify:public-release-facts
pnpm type-check
pnpm test
pnpm docs:build
```

浏览器资源改动还应运行[开发指南](./development.md)中的构建及 smoke 检查。

## 外部参考

- Vite 生产构建、动态导入错误处理和 Vite 8 chunk 策略: <https://vite.dev/guide/build>
- Rollup `manualChunks` 配置: <https://rollupjs.org/configuration-options/>
- Node.js package `exports` 与 conditional exports: <https://nodejs.org/api/packages.html>
- pnpm optional peer metadata: <https://pnpm.io/package_json#peerdependenciesmeta>
- XMind ZIP / `content.json` 解析事实标准参考: <https://wanglin2.github.io/mind-map-docs/en/api/xmind.html>
- Typst 浏览器 WASM 渲染链路: <https://github.com/myriad-dreamin/typst.ts>
- diagrams.net / draw.io 离线 viewer 和 XML 格式参考: <https://github.com/jgraph/drawio>
- Excalidraw 官方 restore / export utilities: <https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/utils>
- libarchive.js 的 Worker/WASM 随归档 renderer 的本地资源分发，运行时不依赖公网 CDN。
- WebODF / ODF 浏览器渲染参考: <https://webodf.org/>
- OrCAD / Allegro 开源解析器路线: <https://github.com/Werni2A/OpenOrCadParser>、<https://github.com/Werni2A/OpenAllegroParser>
- GDSII 格式与 JS 解析参考: <https://layouteditor.org/layout/file-formats/gdsii>、<https://github.com/TinyTapeout/gdsii>

<div class="doc-note">
  这个计划的核心不是“拆很多包”本身，而是让用户用到什么才安装什么、打包什么、部署什么。完整能力仍然保留，但默认体验必须轻。
</div>
