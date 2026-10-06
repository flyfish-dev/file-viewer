# @file-viewer/renderer-dicom

用于本地 DICOM Part 10 文件的显式按需渲染器。它直接使用模块化的 Cornerstone3D core 与 DICOM image-loader，不嵌入 OHIF 整套应用，也不使用 DCMTK。

本包显式依赖 `dcmjs` 传递 XML builder 所需的浏览器版 `events`，独立浏览器消费者不应依赖工作区中的其他包补齐它。

该包有意不进入 File Viewer 的 full 或 preset 默认依赖。需要医学影像预览的项目再单独安装并注册。

Core、image-loader 和 metadata 统一使用 Cornerstone 5.10.11，这是 image-loader 引入需要 Node >=24 的 JPEG XL 依赖前最后一个 5.10 版本。Node 22.16.0 开启 `engine-strict` 的真实冷安装通过；已有的传递依赖 `dcmjs` 要求 Node >=22.13.0，因此这里不承诺 Node 20 兼容。JPEG XL 与 HTJ2K 仍不在下述已测试的 Part 10 范围内。

上游依赖闭包仍钉住有漏洞的 `adm-zip`、`uuid` 和 `fflate` 版本。File Viewer 工作区已有 overrides 修复，但库自身的工作区策略不会传递给安装它的应用。应用需要在根目录设置下列限定依赖的策略，并提交生成的 lockfile；未设置这些 overrides 的默认安装不能通过安全审计。

npm 应用在根 `package.json` 中添加：

```json
{
  "overrides": {
    "dcmjs": { "adm-zip": "0.6.1" },
    "@cornerstonejs/dicom-image-loader": { "uuid": "11.1.1" },
    "@kitware/vtk.js": { "fflate": "0.7.5" }
  }
}
```

pnpm 应用在根 `pnpm-workspace.yaml` 中添加：

```yaml
overrides:
  'dcmjs>adm-zip': 0.6.1
  '@cornerstonejs/dicom-image-loader>uuid': 11.1.1
  '@kitware/vtk.js>fflate': 0.7.5
allowBuilds:
  core-js-pure: false
```

pnpm 11 策略显式跳过 `core-js-pure` 的可选安装后捐助提示，该脚本不会生成运行时文件；其他依赖的构建权限继续由应用策略决定。

安装后使用官方 npm registry 运行 `npm audit` 或 `pnpm audit`，再注册渲染器：

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
