# @file-viewer/vite-plugin

Flyfish File Viewer 的 Vite 按需 renderer 自动装配插件。它可以自动发现已安装的 `@file-viewer/preset-*` 和 `@file-viewer/*-full` 包，让 Vue、React、Svelte、jQuery 和 Vanilla JS 组件无需手动传 `renderers` 就获得对应预览能力；也可以根据业务声明的文件格式生成 `virtual:file-viewer-renderers`，只 import 命中的 renderer 包，并提供 chunk 分组和离线 worker/WASM/字体资源复制能力。

## 最快开始

需要完整格式支持时，最快路径是“full 包 + 注册一次 Vite 插件”。full 已内置 `preset-all`，不要再安装 preset；`copyAssets:true` 会在开发和构建时自动匹配 full 包，并把 Worker、WASM、字体和 vendor 文件发布到部署基址下的 `file-viewer/`（根部署即 `/file-viewer/`）：

```bash
pnpm add @file-viewer/vue3-full
pnpm add -D @file-viewer/vite-plugin
```

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

只安装 full 包而不启用资源复制，PDF Worker、CAD/Typst/Archive WASM 等格式会缺少运行文件，只能获得部分格式支持。

需要更小体积时，改用“标准组件包 + 一个 preset”，Vite 配置保持不变。插件会自动发现已安装的 preset，无需手写 renderer import，也无需显式写 `preset:'office'`：

```bash
pnpm add @file-viewer/vue3 @file-viewer/preset-office
pnpm add -D @file-viewer/vite-plugin
```

组件默认 `autoRenderers:true`，会读取 Vite 插件注入的 preset / renderer registry。常规业务代码只要使用 `@file-viewer/vue3`、`@file-viewer/react`、`@file-viewer/web`、`@file-viewer/svelte`、`@file-viewer/jquery`、`@file-viewer/vue2.7` 或 `@file-viewer/vue2.6` 即可获得对应能力。

可选 preset：

- `@file-viewer/preset-lite`: 文本、Markdown、代码、图片、音频、视频。
- `@file-viewer/preset-office`: PDF、Word、Excel、PowerPoint、OFD、RTF、OpenDocument。
- `@file-viewer/preset-engineering`: CAD、3D、绘图、XMind、Geo、Typst、Archive、Data、EDA。
- `@file-viewer/preset-all`: 官方 demo 完整格式矩阵。

如果只需要极少数格式，也可以安装对应 renderer 包，例如 `@file-viewer/renderer-pdf`、`@file-viewer/renderer-word`、`@file-viewer/renderer-ofd`、`@file-viewer/renderer-presentation`、`@file-viewer/renderer-cad`、`@file-viewer/renderer-drawing`、`@file-viewer/renderer-3d`、`@file-viewer/renderer-data`、`@file-viewer/renderer-eda`、`@file-viewer/renderer-typst`、`@file-viewer/renderer-archive`、`@file-viewer/renderer-text`，再通过 `formats` 做精确裁剪。

## vite.config.ts

推荐默认使用 full/preset 自动装配。只传 `copyAssets:true` 时，插件会自动发现已安装的 `@file-viewer/*-full` 或 `@file-viewer/preset-*`，无需写 `preset:'all'`：

```ts
fileViewerRenderers({
  copyAssets: true
})
```

只有在需要源码扫描、单格式裁剪、或手动 registry 管理时，再使用自定义能力：

```ts
import { defineConfig } from 'vite'
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default defineConfig({
  plugins: [
    fileViewerRenderers({
      formats: ['pdf', 'dwg', 'typst', 'zip', 'xmind'],
      scan: true,
      copyAssets: true,
      chunkStrategy: 'renderer'
    })
  ]
})
```

`inject` 默认开启，插件会把 `virtual:file-viewer-renderers` 注入 Vite HTML 入口，preset 导入后会自动注册到 core。常规业务只需要安装组件包和对应 preset，组件会通过 `autoRenderers` 默认读取这些能力。

```ts
const options = {
  // 默认 true；需要完全手动控制时设为 false。
  autoRenderers: true
}
```

### 可定制能力

| 选项 | 说明 |
| --- | --- |
| `copyAssets` | `true` 或 `{ publicDir, outDir, mode, baseDir }`；复制匹配的 Worker、WASM、字体和 vendor 资源。检测到 full 时默认发布到 `<部署基址>/file-viewer/`，这是 full 完整格式支持的必需项；标准包/preset 保持原有根目录行为 |
| `preset` | `'auto' | 'lite' | 'office' | 'engineering' | 'all'`；默认无显式格式时自动发现已安装 preset |
| `autoPresets` | `true` 或 preset 列表；常用于 `scan:true` 时继续自动激活已安装 preset |
| `formats` | 文件扩展名或格式 token，例如 `['pdf', 'docx', 'dwg']` |
| `renderers` | renderer id，例如 `['pdf', 'word', 'cad']` |
| `scan` | `true` 或 `{ roots, extensions, maxFileSize }`，扫描源码 hint 并合并格式 |
| `inject` | 默认 `true`；设为 `false` 后手动导入 `virtual:file-viewer-renderers` |
| `chunkStrategy` | `'renderer' | 'none'`，控制是否注入 renderer 级 chunk 分组 |
| `stabilizeInteropChunks` | 默认 `true`；当宿主项目已有 `manualChunks` 函数时，把 CodeMirror / Lezer / Sandpack 归到同一 chunk，避免生产构建 TDZ 初始化错误 |
| `missingRenderer` | `'error' | 'warn' | 'ignore'`，控制尚未提取的 renderer 映射提示方式 |

如果宿主项目按包名拆分 `node_modules`，`@codemirror/*`、`@lezer/*` 和 Sandpack 之间的循环依赖可能在生产构建中表现为 `codemirror-view.* Cannot access ... before initialization`。插件默认会包裹已有的 `manualChunks` 函数，只稳定这些已知互操作 chunk，保留其它自定义分组；确实需要完全接管时可设置 `stabilizeInteropChunks:false`。

`copyAssets.baseDir` 可以覆盖自动目录：必须是相对路径，不能包含 `..`；传空字符串表示显式复制到根目录。插件会为标准包、preset 和 full 包同步统一运行时资源根；full 包仍同时同步 `setDefaultFullAssetBaseUrl()`。只有设置 `inject:false` 且不手动导入虚拟模块时，业务才需要调用 `setDefaultFileViewerAssetBaseUrl()`（full 包同时调用 `setDefaultFullAssetBaseUrl()`）。Vite 配置了 `base:'/app/'` 时，full 包开发 URL 为 `/app/file-viewer/...`，构建文件仍位于 `outDir/file-viewer/`。

如果你需要严格控制 registry，可以关闭注入并手动传入：

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

也可以使用 `preset: 'auto'` 发现项目中已安装的 preset 包；当 `preset-all` 存在时会优先使用它，避免重复导入其它 preset。注意：如果同时开启 `scan:true`，请显式使用 `preset:'auto'` 或 `autoPresets:true`，否则插件会以源码 hint 为准，不再做“无配置 preset 自动发现”。

```ts
fileViewerRenderers({
  preset: 'auto',
  scan: true,
  formats: ['pdf'],
  copyAssets: true,
  chunkStrategy: 'renderer'
})
```

`scan: true` 会扫描常见源码目录里的轻量 hint，并把它们合并到 `formats`：

```ts
export const fileViewerFormats = ['pdf', 'docx', 'xlsx']
```

```html
<input accept=".pdf,.docx" data-file-viewer-formats="dwg,xmind" />
```

这适合业务把上传入口、示例矩阵或附件白名单维护在源码中时使用：开发和构建阶段插件会自动生成 renderer 装配模块，少写一份手工 import 清单。

## 缺失 renderer 提示

如果用户打开的是支持矩阵内的格式，但项目没有安装或装配对应 renderer，core 会显示“需要装配预览能力”，并提示推荐安装的 preset / renderer 包，例如 `.pdf` 会引导安装 `@file-viewer/preset-office` 或 `@file-viewer/renderer-pdf`。只有真正不在支持矩阵中的扩展名才显示“不支持在线预览”。

## 嵌套 Vite 项目

从 3.0.3 起，子目录只有项目元数据或 Vite 插件声明时，会沿祖先 `package.json`
查找实际可解析的 Full 依赖。子项目明确声明轻量组件或 preset 时保留其根目录资产布局，
不会继承父项目的 Full 布局。`copyAssets.baseDir` 仍具有最高优先级；`publicDir`
和 `build.outDir` 均相对于 Vite root，不相对于依赖所在目录。

## 当前边界

当前插件会为已经拆出的 renderer 包生成导入：Word、Spreadsheet、PDF、OFD、Presentation、CAD、Draw.io/Excalidraw/Mermaid/PlantUML、3D、Data、EDA、Typst、压缩包、邮件、EPUB、代码/Markdown/Patch/Git Bundle、图片、媒体、XMind 和 Geo。可以通过 `formats` 显式声明，也可以通过 `scan: true` 从源码 hint 自动发现；`.zipx`、`.cbz`、`.tiff`、`.mjs`、`.gv`、`.patch`、`.bundle`、`.mermaid`、`.puml`、`.mpeg` 等 core 支持的扩展也会映射到对应 renderer。开启 `copyAssets:true` 时会识别已安装能力；full 包把匹配资源复制到开发 `publicDir/file-viewer/` 与构建 `outDir/file-viewer/`，标准包/preset 维持根目录行为，包括 Typst compiler / renderer WASM 与默认字体目录。`preset: 'auto' | 'lite' | 'office' | 'engineering' | 'all'` 会导入对应 `@file-viewer/preset-*` 包；如果同时声明 `formats`，插件会在 preset 之外补充额外 renderer。

## 文档

- 按需渲染架构: <https://doc.file-viewer.app/guide/on-demand-renderers>
- 支持格式: <https://doc.file-viewer.app/guide/formats>
