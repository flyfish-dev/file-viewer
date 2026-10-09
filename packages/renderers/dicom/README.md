# @file-viewer/renderer-dicom

用于本地 DICOM Part 10 文件的显式按需渲染器。它直接使用模块化的 Cornerstone3D core 与 DICOM image-loader，不嵌入 OHIF 整套应用，也不使用 DCMTK。

该包有意不进入 File Viewer 的 full 或 preset 默认依赖。CLI 的 `--profile full` 会另外加入 DICOM 和数字签名能力。通过 CLI 或手动安装 DICOM 时，都需要配置下述应用安装策略。

## 应用安装策略

`@file-viewer/renderer-dicom@3.1.2` 使用 Cornerstone 5.8.2，默认依赖图仍会解析到受影响的传递依赖。安装已发布包的应用不会继承本仓库的 workspace overrides，CLI 也不会自动添加此策略。

使用 npm 时，请在安装前将以下定向 overrides 合并到使用方应用根目录的 `package.json`：

```json
{
  "overrides": {
    "dcmjs": {
      "adm-zip": "0.6.1"
    },
    "@cornerstonejs/dicom-image-loader": {
      "uuid": "11.1.1"
    },
    "@kitware/vtk.js": {
      "fflate": "0.7.5"
    }
  }
}
```

```bash
npm install @file-viewer/renderer-dicom
npm ls adm-zip uuid fflate
npm audit
npm audit --omit=dev
```

保留更新后的应用 lockfile。其他包管理器需要在应用或 workspace 根目录配置等效 overrides，并核验实际解析的版本。仅把这些叶子包添加为直接依赖，不能替换其上游包锁定的精确版本。

2026-10-08 的全新 npm 消费项目检查使用从当前源码树打包的 core 和 renderer 产物，未审计 registry tarball。这些产物的默认依赖图在完整审计与生产依赖审计中均报告 10 个受影响包条目（7 个 high、3 个 moderate）。另一个使用相同产物并配置上述三项 overrides 的消费项目，两种审计均为零发现。该结果仅对应配置 overrides 后的依赖图和当时的公告数据，不代表已发布包的默认依赖图审计无问题。

安装与构建工具必须满足当前传递依赖 `dcmjs@0.52.0` 已有的 Node.js `>=22.13` 要求。上述检查使用 Node.js 24.20.0 和 npm 11.9.0。

部署前，应用需要验证其实际依赖图、打包工具、目标浏览器及所需 DICOM 传输语法。上述依赖审计未运行浏览器检查。Public CI 的完整运行时检查在 Node inspection 后运行 `pnpm --filter @file-viewer/renderer-dicom verify:packed-browser`：在独立消费项目中使用空 npm 缓存安装源码打包产物及上述应用策略，审计其依赖图，并在 Chromium 与 WebKit 中检查真实 CT 像素和销毁清理。无论成功或失败，CI 均保留 JSON 报告、命令日志及可用截图七天。这项有界样例检查不代表所有传输语法均已覆盖，也不代表默认依赖图审计无问题。

## 注册

需要医学影像预览的项目再单独安装并注册：

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

本地 Part 10 路径只注册 `dicomfile:` loader，不注册 `wadors`/DICOMweb loader；文件交给渲染器后不会发起 `fetch` 或 XHR。`THIRD_PARTY_LICENSES.json` 和 `THIRD_PARTY_NOTICES.md` 记录本仓库 workspace 解析出的 npm 依赖及许可快照，以及原生 WASM codec 许可证。应用的实际依赖闭包可能与该快照不同，需要另行核验。

该渲染器仅用于预览，不属于医疗器械或诊断工作站。
