# @flyfish-group/file-viewer-react

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/compat/react/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/compat/react/README.zh-CN.md)

React 文件预览组件。这个包是 `@file-viewer/react` 的历史包名同步版本，当前提供原生 React 组件体验: 组件内部直接挂载共享预览底座，并暴露一致的 props、事件和 ref API。

```bash
npm install @flyfish-group/file-viewer-react
```

```tsx
import FileViewer from '@flyfish-group/file-viewer-react'

export function Preview() {
  return (
    <div style={{ height: '100vh' }}>
      <FileViewer
        url="https://example.com/demo.docx"
        onViewerEvent={(event) => {
          console.log(event.type, event.event, event.payload)
        }}
        options={{
          theme: 'light',
          toolbar: { position: 'bottom-right' },
          watermark: { text: '内部预览', opacity: 0.14 },
          archive: { cache: true }
        }}
      />
    </div>
  )
}
```

`file` 优先级高于 `url`。当传入 `Blob` 或 `ArrayBuffer` 时，请同时传 `name`，例如 `contract.pdf`，用于识别格式:

```tsx
<FileViewer file={blob} name="contract.pdf" />
```

`options` 支持主题、水印、搜索、统一缩放、下载、打印、导出 HTML、beforeOperation 前置校验、生命周期 hooks 和格式专项参数。生命周期、操作能力变化、搜索状态和当前位置会通过 `onViewerEvent` 回传给宿主。

新项目建议优先使用标准包名 `@file-viewer/react`。官方文档: https://doc.file-viewer.app/
