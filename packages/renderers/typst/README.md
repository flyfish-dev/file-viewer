# @file-viewer/renderer-typst

Flyfish File Viewer 的独立 Typst renderer 包。它直接读取 `.typ` / `.typst` 源文件，并使用 `@myriaddreamin/typst.ts` 的浏览器 WASM compiler / renderer 输出按页 SVG，避免用源码视图冒充预览成功。

## 用法

```ts
import FileViewer from '@file-viewer/vue3'
import { typstRenderer } from '@file-viewer/renderer-typst'

const options = {
  rendererMode: 'replace',
  renderers: typstRenderer,
}
```

也可以和其他 renderer 一起组合：

```ts
import { pdfRenderer } from '@file-viewer/renderer-pdf'
import { typstRenderer } from '@file-viewer/renderer-typst'

const options = {
  rendererMode: 'replace',
  renderers: [pdfRenderer, typstRenderer],
}
```

## 能力边界

- 支持 `.typ`、`.typst`。
- 浏览器端真实编译 Typst 源文件并输出 SVG 页面。
- 支持页面尺寸识别、缩放、打印和 HTML 导出。
- 支持 `options.typst.renderTimeoutMs` 加载 / 编译超时控制。
- WASM 缺失、MIME 错误、网络错误或编译错误会给出明确诊断。

## 离线资产

默认会从 viewer assets 下读取：

- `wasm/typst/typst_ts_web_compiler_bg.wasm`
- `wasm/typst/typst_ts_renderer_bg.wasm`
- `wasm/typst/fonts/`

私有化部署时可以通过 `options.typst.compilerWasmUrl`、`options.typst.rendererWasmUrl` 和 `options.typst.fontAssetsUrl` 覆盖。默认字体资产随本包发布并由 `file-viewer-copy-assets` / `@file-viewer/vite-plugin` 复制到本地静态目录，预览运行时不会访问公共 CDN。

## CSP 与 Trusted Types

Typst SVG 通过受控的 XML 解析、结构化净化和 DOM 节点导入渲染，不使用 `innerHTML`。如果站点启用了 `require-trusted-types-for 'script'`，请在 `trusted-types` 指令中允许 `file-viewer-typst-svg`（DOMPurify 的导出/打印路径还需要 `dompurify`）。

## 迁移说明

Typst 渲染已经从 `@file-viewer/core` 迁移到本包。core 只保留 `renderFileViewerTypst()` 兼容导出并给出明确安装提示，不再默认安装 `@myriaddreamin/*`。需要 Typst 真实预览时，请显式安装本包，或直接使用 `@file-viewer/preset-all`。
