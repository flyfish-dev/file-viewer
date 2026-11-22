# BPMN 流程图

此功能从 3.1.2 起提供。BPMN 需要显式启用，不会增加现有 Full 包的默认依赖。

安装 `@file-viewer/renderer-drawing` 及可选依赖 `bpmn-js@18.33.0`，再向任一标准组件注册：

```ts
import { mountViewer } from '@file-viewer/web'
import { bpmnRenderer } from '@file-viewer/renderer-drawing/bpmn'

mountViewer(document.querySelector('#viewer'), {
  url: '/documents/process.bpmn',
  filename: 'process.bpmn',
  options: { renderers: [bpmnRenderer] }
})
```

预览支持带 BPMN DI 布局的 BPMN 2.0 XML，可切换流程图与原始源码、平移、缩放、适应视口，也可选择文件中的其他图。源码和流程脚本不会执行。缺少布局或文件损坏时显示诊断，并保留源码查看入口，不擅自生成坐标。

需要默认显示源码或限制输入大小时，可用 `createBpmnRenderer({ initialView: 'source', maxFileBytes: 5 * 1024 * 1024 })`。默认输入上限为 20 MiB。此入口只用于预览，不提供流程编辑和执行。

bpmn.io 上游许可证要求保留其水印；File Viewer 的 Apache-2.0 不会覆盖这份许可证。具体条款见 renderer 包内的 `THIRD_PARTY_NOTICES.md`。

宿主页面有底部悬浮工具条时，在 viewer 容器上设置 `--file-viewer-content-end-inset` 为工具条占用的高度。流程图会预留这部分空间，不改动上游水印。Demo 回归会检查标识和链接没有被工具条遮挡。

Demo 的“BPMN 流程图与源码”使用独立构造、可再分发的样例。用户在 issue 中提供的附件只用于本地验证，不会自动公开到 Demo。
