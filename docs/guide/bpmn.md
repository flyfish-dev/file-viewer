# BPMN diagrams

Available in 3.1.2 and later. BPMN is an explicit opt-in; Full packages keep their existing dependency set.

Install `@file-viewer/renderer-drawing` and its optional peer `bpmn-js@18.33.0`, then register it with any standard component:

```ts
import { mountViewer } from '@file-viewer/web'
import { bpmnRenderer } from '@file-viewer/renderer-drawing/bpmn'

mountViewer(document.querySelector('#viewer'), {
  url: '/documents/process.bpmn',
  filename: 'process.bpmn',
  options: { renderers: [bpmnRenderer] }
})
```

The read-only view renders BPMN 2.0 XML with BPMN DI layout. Use its toolbar to switch between the diagram and original source, pan, zoom, fit the diagram, or select another diagram in the same file. Source mode does not execute XML or embedded process scripts. Missing layout and malformed files produce a visible diagnostic while keeping the source available.

`createBpmnRenderer({ initialView: 'source', maxFileBytes: 5 * 1024 * 1024 })` starts with source view and a smaller input limit. The default limit is 20 MiB. This is not a modeler or workflow execution engine; it does not invent missing diagram coordinates.

The upstream bpmn.io license requires its watermark to stay visible. The optional dependency's license is not replaced by File Viewer's Apache-2.0 license. See the renderer's `THIRD_PARTY_NOTICES.md` for the exact terms.

If your application overlays a floating toolbar at the bottom, set `--file-viewer-content-end-inset` on the viewer host to the occupied height. The diagram reserves that space without modifying the upstream watermark. The Demo checks that its controls do not cover the logo or link.

The Demo's **BPMN diagram and source** sample is independently constructed and redistributable. Issue attachments are tested locally, not automatically republished as demo files.
