# @flyfish-group/file-viewer-react

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/compat/react/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/compat/react/README.zh-CN.md)

React file preview component. This package is the historical alias of `@file-viewer/react` and now provides the same native React component experience: it mounts the shared core directly and exposes consistent props, events, and ref APIs.

```bash
npm install @flyfish-group/file-viewer-react
```

```tsx
import FileViewer from '@flyfish-group/file-viewer-react'

export function Preview() {
  return (
    <div style={{ height: '100vh' }}>
      <FileViewer
        url="/files/demo.docx"
        options={{
          theme: 'light',
          toolbar: { position: 'bottom-right' },
          archive: { cache: true }
        }}
        onViewerEvent={(event) => {
          console.log(event.type, event.event, event.payload)
        }}
      />
    </div>
  )
}
```

`file` takes precedence over `url`. When passing a `Blob` or `ArrayBuffer`, also provide `name`, for example `contract.pdf`, so the viewer can detect the format:

```tsx
<FileViewer file={blob} name="contract.pdf" />
```

`options` cover theme, watermarking, search, unified zoom, download, print, HTML export, beforeOperation guards, lifecycle hooks, and format-specific settings. Lifecycle, operation availability, search state, and document location updates are emitted through `onViewerEvent`.

New projects should prefer the standard package name `@file-viewer/react`. Official documentation: https://doc.file-viewer.app/
