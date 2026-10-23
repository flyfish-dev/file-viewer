# @file-viewer/renderer-drawing

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/drawing/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/drawing/README.zh-CN.md)

Flyfish File Viewer 的独立绘图渲染器，覆盖 `drawio`、`dio`、`excalidraw`、`mermaid`、`mmd`、`plantuml` 和 `puml`。

## 特性

- `drawio` / `dio` 默认使用随 viewer assets 分发的 diagrams.net offline viewer。
- `excalidraw` 默认使用 `roughjs` 生成稳定只读 SVG；如果运行环境已提供官方 `@excalidraw/excalidraw` ESM 模块，会优先尝试 `restore` 与 `exportToSvg`，失败时自动回退。
- `mermaid` / `mmd` 按需加载官方 `mermaid`，输出主题适配 SVG。
- `plantuml` / `puml` 默认保持离线 SVG 源码预览；需要完整 PlantUML 渲染时，可通过 `options.drawing.plantumlServerUrl` 指向自托管 SVG 端点，端点不可用时仍会回落到离线预览，避免白屏或 broken image。
- Mermaid / PlantUML 预览使用 `@panzoom/panzoom` 提供拖拽平移、Ctrl/Command 滚轮缩放和统一工具栏缩放联动。
- 支持统一缩放、打印、HTML 导出和 `options.drawing` 自托管资源配置。
- 独立安装、独立发布，适合只需要绘图预览的业务按需装配。
- `@file-viewer/core` 已不再内置 drawing renderer，也不再直接依赖 `@excalidraw/excalidraw`、`mermaid`、`plantuml-encoder`、`@panzoom/panzoom` 或 `roughjs`。

## 使用

```ts
import { createFileViewerCore, createFileViewerRendererRegistry } from '@file-viewer/core';
import { drawingRenderer } from '@file-viewer/renderer-drawing';

const registry = createFileViewerRendererRegistry({
  renderers: [drawingRenderer],
});

const viewer = createFileViewerCore({
  target: document.querySelector('#viewer')!,
  rendererRegistry: registry,
});
```

完整按需加载方案见 [官方文档](https://doc.file-viewer.app/guide/on-demand-renderers)。

## 显式启用 BPMN（实验性）

BPMN 2.0 使用独立子路径 `/bpmn`，不会自动加入普通 `drawingRenderer`、现有 preset 或 Full。安装可选引擎后显式注册：

```sh
npm install @file-viewer/core @file-viewer/renderer-drawing bpmn-js@18.28.0
```

```ts
import { createFileViewerCore, createFileViewerRendererRegistry } from '@file-viewer/core';
import { bpmnRenderer } from '@file-viewer/renderer-drawing/bpmn';

const viewer = createFileViewerCore({
  target: document.querySelector('#viewer')!,
  rendererRegistry: createFileViewerRendererRegistry({ renderers: [bpmnRenderer] }),
});
```

- 独立 renderer id 为 `bpmn`，仅注册 `.bpmn`，`presets: []`。
- 使用官方只读 bpmn-js Viewer 绘制事件、任务、网关、泳池、泳道、消息流和子流程；有多个 BPMNDiagram 时可选择图。
- 流程图与源码视图可切换。源码保留解码后的原 XML、BOM、换行、注释和扩展内容，不从引擎重新序列化生成。
- 统一 zoom provider 与工具栏联动，支持拖拽平移、方向键平移、Ctrl/Command 滚轮缩放、适合窗口和原始比例。源码视图缩放字体，切回图时保留图的平移与缩放。
- 没有 BPMN DI 布局时显示源码并说明原因，不虚构布局；无效 XML、DOCTYPE 或导入错误也保留源码。部分导入警告会显示在视图内。
- 不执行流程脚本或 XML 中的代码；外部/变量颜色引用只从渲染副本中移除，原 XML 保留。引擎、样式均本地打包，无 CDN、远程解析或额外字体下载。
- 官方 CSS 随延迟加载的运行时注入当前容器，支持普通 DOM 和 Shadow DOM，无需宿主另外导入 CSS。`unmount()` 注销缩放接口、事件、观察器并销毁引擎，支持多个实例及导入中取消。
- 默认文件上限为 20 MiB。此入口不声明打印、HTML 导出、编辑或执行能力。

通过工厂配置初始视图或输入上限：

```ts
import { createBpmnRenderer, renderFileViewerBpmn } from '@file-viewer/renderer-drawing/bpmn';

const renderer = createBpmnRenderer({ initialView: 'source', maxFileBytes: 20 * 1024 * 1024 });
// 也可直接在具有明确高度的容器中渲染，无框架依赖。
const instance = await renderFileViewerBpmn(buffer, target, { options: { locale: 'zh-CN' }, signal });
await instance.ready;
instance.setView('source');
const originalXml = instance.getSource();
const diagrams = instance.getDiagrams();
// await instance.selectDiagram(diagrams[0].id);
await instance.unmount();
```

`ready` 在一次导入尝试结束后完成；文件错误通过可见状态与源码视图呈现。`getDiagrams()` 返回 `id`/`name`，`selectDiagram(id)` 串行打开对应图。`context.signal` 可取消本实例。

**许可证：** bpmn-js 的许可证要求保留并完整显示 bpmn.io 水印，不可删除、遮挡或裁切；并非 MIT。详见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。包自身 Apache-2.0 不覆盖上游附加条款。

公开演示可复用独立构造的 [simple-process.bpmn](./test/fixtures/simple-process.bpmn)，许可证 CC0-1.0。GitHub #297 的 pizza 附件仅作本地验证输入，不随包或公开演示分发。
