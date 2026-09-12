# @file-viewer/renderer-binary

`@file-viewer/renderer-binary` 是 File Viewer 的显式可选、只读二进制检查器。它在本地模块 Worker 中解析受审核的内置格式头，并提供虚拟化偏移量、十六进制、ASCII 列、字段树和双向字节选区。

## 安装与接入

```ts
import FileViewer from '@file-viewer/vue3'
import { binaryRenderer } from '@file-viewer/renderer-binary'

const options = {
  rendererMode: 'replace',
  renderers: [binaryRenderer],
  binary: {
    maxFileBytes: 16 * 1024 * 1024,
  },
}
```

Vite 项目也可显式选择：`fileViewerRenderers({ formats: ['bin'] })`。本包不属于 `preset-all` 或 Full/Vue 2 依赖闭包。

## 路由与范围

- 只注册 `.bin`、`.hex`、`.elf`、`.exe`、`.dll`、`.class`、`.macho`；不注册 `application/octet-stream`。
- PNG、ZIP、WASM 只在用户显式打开本包时用作结构模板，绝不覆盖已有专用 renderer。
- 支持内置的 ELF、PE/COFF、Mach-O、PNG、ZIP、WASM 与 Java class 头部结构；未命中时展示原始字节。
- 不支持编辑、补丁、用户自定义模板、动态导入或任意二进制扫描。

## 安全限制

默认整文件上限为 16 MiB，并对解析时间、结构节点、层级和解码字符串长度设上限。Worker 在返回一个结果、超时、出错或取消时都会终止；UI 只渲染可见的十六进制行。
