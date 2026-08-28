# @file-viewer/renderer-dicom

用于本地 DICOM Part 10 文件的显式按需渲染器。它直接使用模块化的 Cornerstone3D core 与 DICOM image-loader，不嵌入 OHIF 整套应用，也不使用 DCMTK。

该包有意不进入 File Viewer 的 full 或 preset 默认依赖。需要医学影像预览的项目再单独安装并注册：

```ts
import { createViewer } from '@file-viewer/core'
import { dicomRenderer } from '@file-viewer/renderer-dicom'

const viewer = createViewer(container, {
  rendererMode: 'replace',
  renderers: [dicomRenderer],
})
```

第一阶段接受经过 Chromium、Firefox、WebKit 真实浏览器回归的 Implicit/Explicit/Deflated Explicit VR Little Endian、JPEG Lossless Process 14 SV1、JPEG-LS Lossless 和 JPEG 2000 Lossless Part 10 文件（单帧或多帧），支持帧切换、窗宽/窗位、缩放、平移、左右 90° 旋转、适合视图及 File Viewer 统一 view-state 恢复。其他传输语法、PACS/DICOMweb、多文件序列组装、标注、MPR、分割和 hanging protocol 不在本包范围内。

只有选中 DICOM 文件后才初始化解码 worker。默认限制为源文件 64 MiB、256 帧、单帧 1600 万解码采样点、累计 4800 万解码采样点，均可通过 renderer options 向下调整。销毁预览时会移除本实例的 file-manager 条目、viewport、rendering engine、事件监听、metadata 与图像缓存；Cornerstone 的共享 worker 池由宿主管理，不会因销毁某个 File Viewer 实例而被终止。

本地 Part 10 路径只注册 `dicomfile:` loader，不注册 `wadors`/DICOMweb loader；文件交给渲染器后不会发起 `fetch` 或 XHR。完整 npm 与原生 WASM codec 许可闭包见 `THIRD_PARTY_LICENSES.json` 和 `THIRD_PARTY_NOTICES.md`。

该渲染器仅用于预览，不属于医疗器械或诊断工作站。
