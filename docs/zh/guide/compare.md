# 方案对比

File Viewer 的定位是企业后台、内网和私有化场景里的纯前端文件预览组件。它适合“业务附件快速查看、初筛、检索、打印、导出和自托管交付”，但不替代专业编辑器，也不承诺把所有复杂文件做到像原生软件一样高还原。

## 免费开源组件与商业版的边界

开源 File Viewer 和商业版不是二选一关系。开源版负责浏览器原生、多格式、可离线部署的通用预览；商业版来自 Flyfish Office 自研原生文档引擎，重点替换 Office 文档能力，让同一个 File Viewer 集成获得接近 `file-viewer-pro` 的 Office 预览效果。

| 维度 | 免费 File Viewer 组件 | 商业版 / file-viewer-pro 路线 |
| --- | --- | --- |
| 文件格式 | 221 个已注册扩展名（221 个稳定、0 个实验）、32 条预览链路，覆盖 PDF/OFD、Office/iWork、CAD、Typst、压缩包、邮件、电子书、绘图、媒体、3D 和数据资产；通过 `preset-lite`、`preset-office`、`preset-engineering`、`preset-all` 按需启用 | 重点增强 Word、Excel、PowerPoint 深水区，可替换 `preset-office` 中的 Word / Spreadsheet / Presentation 能力；PDF、OFD、CAD、Archive 等其它格式继续由开源 renderer 承接 |
| 还原度 | 目标是可读、可搜索、可打印、可嵌入业务系统；DOCX 当前偏流式阅读，Excel/PPTX 覆盖常见业务预览，不承诺原生 Office 逐像素一致 | 自研原生文档引擎面向分页、字体、表格、图形、页眉页脚、批注修订和复杂演示布局，适合合同、报告、档案和正式交付预览 |
| 性能 | 轻 core + renderer 按需加载，Worker/WASM 懒加载，适合大多数附件中心和在线预览；极端大文件需要结合真实样本做回归 | 针对大文档、大表格和复杂 PPT 做 Worker 解析、分页/分块渲染、虚拟滚动、缓存和内存调优，优先保障主线程流畅 |
| 授权与支持 | Apache-2.0 开源，可用于商业项目；社区 issue、打赏和优先支持可协助定位，但上线验收与兼容性风险由项目自行把控 | 商业授权、私有交付、优先技术支持、样本回归和定制兼容路线，适合需要明确责任边界、交付周期和企业支持的场景 |

## 商业版替换 Office 能力的路线

商业版交付时提供可插拔的 Office preset / renderer。业务侧保留原来的 Vue、React、Svelte、jQuery、Web Component 或 Vanilla JS 组件入口，也保留主题、水印、工具栏、搜索、事件和其它格式能力，只把 Word、Excel、PowerPoint 的渲染链路切到商业引擎。

```ts
import FileViewer from '@file-viewer/vue3'
import engineeringPreset from '@file-viewer/preset-engineering'
import { commercialOfficePreset } from './vendor/file-viewer-pro-office'

const viewerOptions = {
  rendererMode: 'replace',
  preset: [
    commercialOfficePreset,
    engineeringPreset
  ],
  theme: 'light'
}
```

实际包名和交付方式以商业授权交付为准。上面的重点是稳定的替换模式：`core`、组件包和非 Office renderer 不变，Office preset / renderer 可被商业版替换。

## 和服务端转码方案的差异

| 方案 | 优点 | 局限 |
| --- | --- | --- |
| 服务端转码 | 可统一输出 PDF / 图片，便于缓存、归档和权限审计；对复杂 Office 场景更容易做统一兜底 | 需要部署转换服务、队列、临时文件、字体、缓存、重试和清理流程；内网交付成本高 |
| Office Online / 云服务 | 效果好，维护少，协作能力成熟 | 内网、私有化、涉密文件、离线环境和严格合规场景不一定适合 |
| File Viewer | 纯前端、自托管、按需加载，适合嵌入业务系统和内网附件中心 | 复杂 Office / CAD 仍需要真实文件回归，不替代专业编辑器或最终归档转换 |

## 什么时候优先选 File Viewer

- 文件不适合传到第三方转换服务。
- 项目在内网、私有化、离线或严格 CSP 环境中运行。
- 团队希望用同一个组件覆盖 Office、PDF/OFD、CAD、压缩包、邮件、图片、音视频、代码和结构化数据。
- 业务目标是“预览、初筛、搜索、打印、导出、下载”，而不是在线编辑。
- 前端团队希望按需装配 renderer，而不是在每个页面维护一堆独立 viewer。

## 什么时候服务端转码更合适

- 需要长期归档，且必须把所有文件统一固化为 PDF 或图片。
- 文件体积很大，浏览器端内存和移动端性能成为主要瓶颈。
- 需要极高还原度、批量转换、OCR、水印固化、合规留痕或异步审核队列。
- 业务已经有稳定的 LibreOffice / OnlyOffice / 商业转换服务，并且运维成本可接受。

## 推荐组合

很多生产系统可以把两类方案组合起来:

- 默认用 File Viewer 做浏览器端即时预览，减少排队和后端转换压力。
- 对少数归档、合同、审计或强一致场景，再触发服务端转 PDF。
- 内网部署时把 Worker、WASM、字体和 vendor 资源随业务静态资源一起自托管。
- 用 issue 和样本回归持续收集真实格式兼容性，而不是只靠合成样例判断效果。

## 验证清单

- 在 [Demo](https://demo.file-viewer.app) 试 Word、Excel、PPT、PDF、DWG、ZIP 和 EML。
- 用脱敏业务文件验证你真正关心的格式。
- 检查移动端 WebView、内网静态资源路径、Worker/WASM MIME、CSP 和字体资源。
- 对 Office / CAD 高还原需求，结合 [格式完整度](./format-fidelity) 看清楚边界。
