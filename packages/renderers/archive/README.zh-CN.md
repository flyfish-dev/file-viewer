# @file-viewer/renderer-archive

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/archive/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/archive/README.zh-CN.md)

Flyfish File Viewer 的独立压缩包 renderer 包。它用 `libarchive.js` Worker + WASM 读取 RAR、7z、ZIP、TAR 等压缩包目录，并在点击内部文件时才按需解压、缓存和调用 File Viewer 的嵌套渲染能力。

## 用法

```ts
import FileViewer from '@file-viewer/vue3'
import { archiveRenderer } from '@file-viewer/renderer-archive'

const options = {
  rendererMode: 'replace',
  renderers: archiveRenderer,
}
```

也可以和其他 renderer 一起组合：

```ts
import { archiveRenderer } from '@file-viewer/renderer-archive'
import { pdfRenderer } from '@file-viewer/renderer-pdf'
import { cadRenderer } from '@file-viewer/renderer-cad'

const options = {
  rendererMode: 'replace',
  renderers: [pdfRenderer, cadRenderer, archiveRenderer],
}
```

## 能力边界

- 支持 ZIP、TAR、GZIP、RAR、7z 等常见压缩包目录预览。
- `.cbz` / `.cbr` 自动进入漫画阅读模式：只展示图片页，按路径自然排序并自动打开封面，支持翻页按钮、页码、方向键、PageUp/PageDown、Home/End、空格键和触摸滑动。页面继续复用统一图片 renderer 的适屏、缩放和灯箱能力。
- 漫画模式完全复用现有 Worker、RAR4/RAR5、ZIP fallback、密码、按需解压、IndexedDB 缓存、体积限制和资源配置，不维护第二套解包逻辑。
- 自动兼容未声明 UTF-8、实际使用 GBK/GB18030 编码的旧 ZIP 中文文件名。
- 支持加密压缩包：检测到加密内容后使用 `libarchive.js` 统一解密，默认弹框要求用户输入密码，密码正确后继续读取目录或预览内部文件。
- 优先使用 `libarchive.js` Worker + WASM，避免大压缩包阻塞主线程。
- Worker 不可用时自动回退到 ZIP / TAR / GZIP 兼容模式，适合手机 WebView、本地临时服务器和内网静态部署排障；加密压缩包不会走 fallback，必须发布 libarchive Worker/WASM。
- 点击内部文件后才按需解压，并通过 `renderNestedBuffer` 或 core dispatcher 复用 PDF、Office、CAD、XMind、图片、代码等现有 renderer。
- 内置体积上限、单文件预览上限、Worker 超时、IndexedDB 缓存和可配置的内部条目下载入口，避免一次性把压缩包全部展开到内存。

## 离线资产

默认会从 viewer assets 下读取：

- `vendor/libarchive/worker-bundle.js`
- `vendor/libarchive/libarchive.wasm`

私有化部署时可以通过 `options.archive.workerUrl` 和 `options.archive.wasmUrl` 覆盖。
Vue 3 / Vue 2.7 / Vue 2.6 full 包默认把 viewer assets 根设为 `/file-viewer/`，会自动指向这两个 libarchive 文件；如果部署在其它静态前缀，先调用对应 full 包导出的 `setDefaultFullAssetBaseUrl('/your-prefix/')` 即可。

```ts
const options = {
  archive: {
    workerUrl: '/file-viewer/vendor/libarchive/worker-bundle.js',
    wasmUrl: '/file-viewer/vendor/libarchive/libarchive.wasm',
    cache: true,
    workerTimeoutMs: 30000,
  },
}
```

## 内部条目下载权限

压缩包内部文件预览栏的下载按钮默认保持可见。需要隐藏时可以配置全局布尔值：

```ts
const options = {
  archive: {
    entryActions: {
      download: false,
    },
  },
}
```

也可以按内部路径、扩展名、大小等元数据做判断：

```ts
const options = {
  archive: {
    entryActions: {
      download(entry) {
        return entry.path.startsWith('public/')
      },
    },
  },
}
```

这个选项只影响压缩包内部条目的下载按钮，不会关闭顶层 viewer 下载原始压缩包的工具栏动作。

## 加密压缩包

默认情况下，检测到加密内容会显示内置密码弹框。业务也可以预置密码，或接管密码获取流程：

```ts
const options = {
  archive: {
    password: initialPasswordFromYourSystem,
    async requestPassword(context) {
      // context.filename / context.entryName / context.reason / context.attempt
      return await openYourPermissionCheckedPasswordModal(context)
    },
  },
}
```

`requestPassword` 返回字符串时继续解密；返回 `null` 或 `undefined` 时取消预览并展示友好提示。错误密码会重新请求密码，不会切换到 JSZip fallback。

## 迁移说明

`@file-viewer/core` 已不再内置 archive renderer，也不再为压缩包链路直接安装 `libarchive.js`。ZIP/TAR/GZIP fallback、`jszip`、缓存和 Worker 逻辑由本包维护；core 在 OFD 完全拆出前可能仍会因 OFD vendor 临时保留 `jszip`。需要压缩包预览时，请显式安装本包，或直接使用 `@file-viewer/preset-all` 聚合能力。
