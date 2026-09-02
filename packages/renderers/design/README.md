# @file-viewer/renderer-design

Flyfish File Viewer 的 Adobe 设计文件 renderer。解析和像素合成都在可终止的 module Worker 中进行，所有运行时资源可自托管，不依赖公网 CDN。

## 当前能力

- PSD：支持 8-bit RGB/灰度 PSD。默认先显示文件内保存的合并图，作为视觉保真基准；只有不含组隔离、蒙版、裁剪、特殊混合、图层效果等复杂合成语义的文件才开放基础图层显隐。额外通道只有在 layer-info 明确声明 merged transparency 时才会作为显示 alpha，其余 selection/spot 通道不会被误用。
- PDD/PSDT：只接受签名、版本和结构均验证为 PSD v1 的容器别名，并复用同一像素与图层链路；不符合该边界的 PhotoDeluxe 私有变体会明确拒绝。
- PSB：支持无额外 alpha/spot 通道的 8-bit RGB/灰度 PSB 合并图和只读图层结构。PSB Raw 合并图由本项目按 planar 规范解码，避开上游 RGB 通道错误；PackBits RLE 由独立解析器处理。交互式图层合成、额外通道、16-bit、CMYK，以及含 ZIP 图层通道的 PSB 当前会明确拒绝。
- AI/AIT：默认优先使用文件内已验证的 PDF-compatible representation，保留保存时的画面、搜索与打印能力；同时可切换到 `illustrator-pgf` 原生 PGF/private-source Worker，读取真实画板和图层并在 Canvas 中按需渲染。原生链路保留未知操作符并输出 fidelity/unsupported 诊断，不把尚未实现的渐变、复杂文字、图片、插件、效果、蒙版、混合、叠印或专色还原冒充为完整 Illustrator 画面。普通 PDF 改名为 `.ai` 仍会被拒绝。
- IDML：在独立 Worker 中通过 `@paged-media/introspect-wasm` CPU WASM 按页渲染；先做 ZIP 路径、重叠、加密、ZIP64、压缩比与展开量检查，再懒渲染当前页。当前结构树只公开 TextFrame 与 Rectangle 摘要。
- ICML/IDMS/INX：在共享可终止 Worker 中做严格 UTF-8/XML 解析。ICML 展示带样式的故事内容；IDMS 重建有界版面片段、路径、颜色、图层与故事；旧 INX 只可视化已映射的常见页面项，同时保留全部未映射元素清单。任何链接资源只列路径，从不主动请求。
- FLA/XFL：支持现代 ZIP/XFL-based FLA 的舞台、时间轴、图层、关键帧、符号、资源清单，以及实色图形、静态文字、嵌套符号和 PNG/JPEG 的有界首帧预览。单个 DOMDocument XML 可读，但标准未压缩 XFL 文件夹需要未来的目录/多文件输入；旧二进制 FLA、补间、脚本、音视频和私有 `.dat` 不冒充完整还原。
- XD：严格读取 UCF/ZIP、manifest 与 AGC 结构，展示结构引用的最高分辨率 PNG/JPEG 预览和画板/图层/资源清单；不冒充尚未实现的原生 AGC 矢量重建。
- INDD/INDT：只在主页面、连续对象和 XMP 边界都验证通过时展示内嵌 JPEG/PNG 缩略图。专有原生排版数据库不做猜测；要看完整页面应导出 IDML。
- ASE/ACO：有界解析颜色模型、名称和分组，支持搜索、打印与 HTML 色板；Lab/CMYK 的浏览器 sRGB 仅作近似，同时保留原始值。
- ABR：支持现代 ABR 6/7/9/10 的笔尖 alpha、内嵌图案和预设参数；不模拟 Photoshop 笔触、动态和混合引擎。
- CSH：支持 v2 Bezier 路径与布尔操作元数据。减去、相交、排除不会被冒充为 Photoshop 最终栅格效果。
- PAT：支持 v1 的 8-bit RGB、灰度和索引色图案，解码 Raw/PackBits、alpha 与透明索引并显示真实像素；更老版本、16/32-bit、CMYK/Lab 和其他压缩会明确拒绝。
- GRD：支持 v5 Action Descriptor、文件夹、实色渐变色标/透明度与浏览器预览；噪声渐变只提供带固定种子的确定性近似并明确标注，不声称与 Photoshop 噪声算法逐像素一致。
- ASL：支持 v2 样式名称/ID、效果图、多实例数量、混合/不透明度/Blend If 摘要、图案引用和内嵌 PAT 预览。缺少目标图层、字体、色彩配置和 Photoshop 私有效果语义时不伪造最终样式栅格。
- EPS/PS：在可终止 Worker 中运行 Stet WASM，支持多页、按需栅格化、缩放和有界打印。发布产物不含上游 URW Base35 或 Ghostscript CMYK ICC，改用 OFL 字体替代与 PLRM DeviceCMYK 公式回退。它是实验性通用预览，不承诺覆盖全部 Adobe PostScript Level 3 扩展；字体度量和色彩管理可能与 Adobe 应用不同。

以上状态会在支持矩阵中分别标为实验性或未实现；扩展名识别不等于完整支持。

## 用法

```ts
import { designRenderer } from '@file-viewer/renderer-design'
import { pdfRenderer } from '@file-viewer/renderer-pdf'

const options = {
  rendererMode: 'replace',
  renderers: [designRenderer, pdfRenderer],
  design: {
    workerUrl: '/vendor/design/photoshop.worker.js',
    illustratorWorkerUrl: '/vendor/design/illustrator-pgf.worker.js',
    illustratorMode: 'auto', // auto | pdf | native
    containerWorkerUrl: '/vendor/design/adobe-container.worker.js',
    adobeResourceWorkerUrl: '/vendor/design/adobe-resource.worker.js',
    postscriptWorkerUrl: '/vendor/design/postscript.worker.js',
    postscriptWasmUrl: '/vendor/design/stet_wasm_bg.wasm',
    idmlWorkerUrl: '/vendor/design/idml.worker.js',
    idmlWasmUrl: '/vendor/design/paged_introspect_wasm_bg.wasm',
  },
}
```

AI/AIT 原生 PGF 预览可独立使用 design renderer；只有 PDF-compatible 表面需要同时装配 PDF renderer。`auto` 在 PDF 表面可用时优先高还原 PDF，否则尝试原生 PGF。design renderer 保持显式按需安装，不会自动进入 preset-all 或 full 组件。

## 离线资源

PSD/PSB/PDD/PSDT、AI/AIT、XD/INDD/INDT/ASE/ACO/ICML/IDMS/INX/FLA/XFL、ABR/CSH/PAT/GRD/ASL、IDML 与 EPS/PS 分别使用各自的 `vendor/design/*.worker.js`；AI/AIT 原生路径使用 `illustrator-pgf.worker.js`，ICML/IDMS/INX/FLA/XFL 与 XD/INDD/ASE/ACO 复用 Adobe container Worker，PAT/GRD/ASL 复用 Adobe resource Worker，不增加运行时网络依赖。IDML 还需要 `paged_introspect_wasm_bg.wasm`，EPS/PS 需要 `stet_wasm_bg.wasm`。`@file-viewer/vite-plugin` 在安装 design renderer 后可按 manifest 复制资源，`@file-viewer/assets-design` 也提供显式复制；也可通过 `options.design.*Url` 指定自托管地址。默认浏览器 Worker 已内置流式有界 zstd 解码，同时支持未压缩、deflate 与 Illustrator 24 zstd 私有源；超限输出和不受支持的长距离 zstd frame 会明确失败。所有许可证文本与 WASM 同目录分发。

## 安全和性能边界

默认限制源文件 128 MiB、画布 1600 万像素且单边不超过 16384 像素、2000 层、单层 1600 万像素、单次解码 128 MiB，并将主线程图层画布 LRU 控制在 64 MiB。IDML/EPS/PS 打印门禁按可见画布、缓存、打印副本和当前解码临时量的总工作集计算。解析超时会直接终止 Worker；损坏文件、超限文件和不支持的色彩/位深会显式失败。合并图只接受 Raw/PackBits RLE，ZIP 合并图明确拒绝；PSD 的 ZIP 图层可由 ag-psd 按需解码，而 PSB 解析器目前会拒绝含 ZIP 图层通道的文件。只读结构建立后会立即释放 Worker 内的源文件和解析树。嵌入 ICC 当前会给出“未做颜色转换”诊断。`useWorker: false` 只对明确提供本地回退的 Photoshop/资源解析路径生效；XD、INDD/INDT、ASE/ACO、IDML 与 EPS/PS 始终要求可终止 Worker。

EPS/PS 默认另限 32 MiB 源文件、100 页、8192 像素单边、1600 万输出像素、256 MiB VM 和 30 秒 Worker 操作；超时或 abort 会终止整个 Worker。完整构建与边界说明见 `POSTSCRIPT-WASM.md`。

手机布局提供自适应首屏、拖动画布、双指缩放和抽屉式图层列表。复杂 PSD/PSB 的图层列表保持只读，避免用不准确的 Canvas 合成覆盖文件内高保真合并图。

## 许可证

本包采用 Apache-2.0。`ag-psd`、`@webtoon/psd`、`base64-js`、`pako`、`@xmldom/xmldom` 与 `xmlchars` 采用 MIT，`saxes` 采用 ISC；`@paged-media/introspect-wasm` 选择 MPL-2.0；Stet 为 Apache-2.0 OR MIT；四组替代字体为 SIL OFL 1.1。完整声明见 `THIRD_PARTY_NOTICES.md`，许可全文随 npm 包或离线资产分发。本 npm 包不携带上游图片或笔刷 fixture；Demo 的外部样例均在 `SOURCES.md` 与哈希清单中记录来源和许可证。
