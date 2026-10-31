# @file-viewer/ppt

浏览器内预览 PowerPoint 97–2003 二进制 `.ppt` / `.pot`。纯 TypeScript 实现，运行时零 npm 依赖，支持自托管和离线使用，无需 WASM、Office 或服务端转换。

公共 npm 包采用 Apache-2.0，可免费用于个人、商业和生产项目。源码仓库暂时保持私有；[公开分发仓](https://github.com/flyfish-dev/pptjs)只提供编译包与发布工作流。包内提供编译后的 JavaScript、类型声明和许可证，不包含 TypeScript 源文件、源映射、客户文件或字体。此许可只适用于本 TypeScript 实现，不改变旧版原生 WASM 包的许可。

Browser preview for legacy binary PowerPoint files. The published runtime is freely usable under Apache-2.0; the development repository remains private. This is a preview engine with documented limits, not a complete PowerPoint implementation.

## 安装

```sh
npm install @file-viewer/ppt
```

## Vanilla / 浏览器预览

```ts
import { createSlideViewer } from '@file-viewer/ppt';

const viewer = createSlideViewer(document.querySelector('#presentation')!, {
  worker: true,
  onError: error => console.error(error),
});

await viewer.load(file); // File / Blob / ArrayBuffer / ArrayBufferView
viewer.goTo(0);         // 从 0 开始
viewer.next();
viewer.previous();
viewer.destroy();       // SPA 卸载时释放资源
```

宿主需要明确尺寸，例如 `width:100%; height:70vh`。直接部署 ESM 时保留完整 `dist/`；解析 Worker 使用相邻的独立 `pptjs.worker.js`。自定义部署可显式设置 `workerUrl`，使用导出入口 `@file-viewer/ppt/worker.mjs`。不使用公共 CDN 或远程字体。

`createPptViewer(container, options)` 也保留此单页 SVG 接口。`play()`、`pause()`、`advance()` 和 `setPlaybackEnabled()` 提供受支持的旧式动画、过渡和手动媒体播放；现代完整动画时间线尚不支持。

## 兼容现有 Canvas 接口

```ts
import { createPptViewer } from '@file-viewer/ppt';

const runtime = await createPptViewer({ worker: 'auto' });
const mounted = await runtime.mount('#presentation', bytes, {
  virtualize: true,
  scale: 1,
  pixelRatio: 1,
});

await mounted.renderSlide(0);
const png = mounted.canvases[0].toDataURL('image/png');
await mounted.close();
await runtime.close();
```

`loadPptViewer(options)` 与 options-only 的 `createPptViewer(options)` 等价。也可使用 `runtime.open(bytes)`，再调用 `document.renderSlide(index, canvas, {scale, pixelRatio})`、`releaseSlide(index)` 和 `close()`。默认不分离调用者的输入缓冲区；仅显式设置 `transferInputOwnership: true` 才转移完整 ArrayBuffer 的所有权。

Worker 负责解析，SVG 布局和 Canvas 快照使用浏览器字体与主线程绘图。`mode: 'worker'` 描述解析方式。运行时提供取消、虚拟滚动、离屏 Canvas 释放和 PNG 导出；不使用旧版原生引擎或其持久帧缓存。`cacheStats()` 如实返回禁用缓存和零 WASM 内存。

## 从 0.3.x 原生包迁移

1.0.x 替换了底层引擎。现有 `open` / `mount` / Canvas 生命周期接口保留，同时新增模型解析和单页 SVG 查看接口。

- 移除旧部署中的 WASM、内置字体与原生许可证配置。`wasmUrl`、`fontUrl` 和 `cache` 参数暂时接受，但新引擎不加载这些资源。
- 旧的 `ppt-native.wasm` 和 `ppt-font-cjk.otf` 导出不再提供。`worker.mjs` 导出现在指向纯 JavaScript Worker。
- 不要求旧原生包的水印。不得据此修改或移除旧包已有的水印或许可限制。
- 公共类型 `PptDocument` 表示兼容 Canvas 文档；解析模型类型为 `ParsedPptDocument`。

## 解析与 SVG 输出

```ts
import { parsePpt, renderSlide } from '@file-viewer/ppt';

const model = parsePpt(bytes, { password: suppliedPassword });
const { html, css, warnings } = renderSlide(model, 0);
```

仅处理调用者传入的本地字节。外部链接不会自动加载，嵌入的 OLE 程序不会执行。加密文件仅尝试调用者提供的打开密码。错误及未支持的内容通过结构化错误或诊断返回。

## 支持范围

支持幻灯片顺序、母版与主题颜色、文本和段落、图片裁剪与透明度、嵌套组、常用预设几何、自定义路径和圆弧、渐变、部分阴影、EMF/WMF 预览，以及部分旧式播放效果。复合路径按各次绘制的填充、描边状态输出，组内的普通描边保留物理宽度。图案填充按前景／背景色绘制，使用原始像素周期平铺。

字体由宿主提供。缺失字体会改变字重、换行和基线。复杂艺术字、3D 材质、部分形状公式、现代动画、复杂脚本及嵌入应用行为仍有限制；不能将成功解析或测试通过解释为完整保真。PPTX 和编辑保存不属于此包范围。诊断可从解析模型或 `renderSlide()` 返回值读取。

支持现代浏览器；Worker、Canvas 与所用字体的实际支持取决于宿主环境。辅助阅读、搜索可使用解析模型，静态预览可使用 SVG 查看接口，打印和截图可使用 Canvas 接口。

文档与集成说明：[File Viewer 文档](https://doc.file-viewer.app/guide/on-demand-renderers)。支持入口：[Flyfish](https://dev.flyfish.group/shop)。
