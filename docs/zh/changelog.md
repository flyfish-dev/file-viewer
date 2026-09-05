---

> **Maintainer-only commands:** this page contains complete-workspace release or verification examples that are not part of the public checkout. Public contributors should use the commands in `/README.md` or `/docs/guide/development.md`.

<!-- FILE_VIEWER_MAINTAINER_COMMANDS -->
description: '查看 File Viewer 主线版本的功能更新、安全修复、性能优化、验证证据与各发行渠道同步记录。'
---

# 更新日志

这份日志记录的是当前仓库主线中，对外最值得说明的能力演进。

## `v3.0.1` 宿主框架 peer 依赖、PDF 中文兜底字体与 EML 头部修正 — 2026-09-03

### 可读文本预览

- 新增可选的可读文本预览（#235）：普通与有界虚拟文本按逻辑行换行；结构化文本按格式懒加载 Prettier parser，以徽标和切换按钮区分格式化显示副本与原始源码。格式化阈值独立于大文本渲染，下载始终保留原始字节。

### CLI 可靠性与交互

- 新建项目的交互式格式选择改为预先列出 renderer/格式族并显示勾选状态；当前 profile 已包含的能力保持启用，额外能力支持编号、范围、全选和清空，不再要求手写扩展名。
- Vite 8 脚手架声明并在 `dev`/`build` 前校验 Node `^20.19.0 || >=22.12.0`，旧运行时会获得明确迁移提示；Web Component 事件从元素所属 document realm 创建，并为缺失全局 `CustomEvent` 的 DOM 环境保留兼容回退。

### 新增格式渲染器

- 新增 `@file-viewer/renderer-chm`：CHM 帮助文档在浏览器内离线解析，Rust/WASM 解包配合沙箱阅读器还原目录、正文与图片，不上传任何文件内容。
- 新增 `@file-viewer/renderer-design`：Adobe 设计文件离线预览，覆盖 PSD/PSB 图层、Illustrator 原生 PGF 与 PDF 兼容表面、IDML/ICML/INX、INDD/XD、现代 XFL 动画与色板、画笔等资源文件；作为显式按需包交付，Worker、WASM 与字体全部可自托管。

### PDF

- 修复 #242 报告的 3.0 打包失败（Vite 8 + pnpm 11 + Node 22）：`@file-viewer/vite-plugin` 从 2.4 起就把 PDF 资产列为必需，2.4 之所以能通过，是因为 `@fontsource-variable/noto-sans-sc` 当时是 `@file-viewer/renderer-pdf` 的运行时依赖；3.0.0 把该字体降级为 devDependency，安装后的应用解析不到任何字体来源，必需资产缺失直接中断 `vite build`，因此回退 2.4 看起来像修复。3.0.1 把字体来源上移到启用 PDF renderer 的 preset：`preset-office`、`preset-all` 直接声明字体包，`preset-standard` 由 `@file-viewer/assets-standard` 提供；`@file-viewer/renderer-pdf@3.0.1` 的发布包内不再携带任何字体副本（tarball 已核对），而在确实没有字体来源时该资产改为可选，构建输出警告而不是失败，PDF 继续依赖文档内嵌字体。该资产归属与可选性由 #242 门禁与 profile 门禁持续校验。

### 邮件

- EML 解析基线升级到 postal-mime `3.0.0`（#232）：未声明字符集的部件按邮件头编码正确回退，折叠的 RFC 5322 头部完整展开，重复头部按首个生效，`to`/`cc`/`bcc` 保持原始顺序。

### 生态组件安装

- `@file-viewer/vue3` 不再把宿主框架 `vue` 作为运行时依赖安装，改为 `peerDependencies: ">=3.3 <4"`，与 Vue 2.6/2.7、React、Svelte、jQuery 组件保持一致；构建期图标库同步移入 devDependencies，直接运行时依赖只剩 `@file-viewer/core`。这修复了应用锁定的 Vue 版本与组件自带版本不一致时安装出两份 Vue 实例、组件挂载抛 `Cannot read properties of null (reading 'refs')` 并留下空白页面的问题。
- 新增宿主运行时契约门禁：生态组件的可安装依赖只允许 File Viewer 自身包，宿主框架必须且只能声明为 peer，且三条 Vue 版本线互不重叠；冷安装校验在安装完成后立即比对宿主框架的解析路径，出现重复副本时直接失败并给出可读原因。
- `msdoc-viewer` 历史兼容别名升到 `0.2.5` 以跟随 3.0.1 的 `@file-viewer/doc`：该别名按解析到的 Word renderer 版本发布，同一冻结版本无法二次发布。本次发布冻结 88 个 npm 目标：87 个主线包为 `3.0.1`，`msdoc-viewer` 别名为 `0.2.5`。

### 依赖安全

- XMind 解析路径不再解析 `@xmldom/xmldom` 0.9.10：该版本带有 6 项安全公告，且均可由预览不可信文件时的 `DOMParser.parseFromString` 触发；依赖覆盖将整张依赖图锁定到 0.9.12，开源边界校验会持续确认该覆盖确实生效（#246）。

## `v3.0.0` 模块化 CLI、专业格式按需安装与安全门禁 — 2026-08-27

- 新增 `@file-viewer/cli`、`file-viewer-cli` 和 `create-file-viewer`，既可创建新项目，也可在已有 `package.json` 工程中检测框架与构建工具后安装；支持选择框架版本、格式、preset、资源、npm/pnpm/Yarn/Bun、不含凭据的私有 registry 与完整性校验的离线 tgz。
- `standard` 成为常用格式的推荐方案，但不改变八个已发布 Full 包。`*-full` 继续交付原 `preset-all` 格式矩阵、API 和同版本离线资源；CLI 显式选择 `full` 时才在此基础上加入后续专业能力，并提前展示体积、运行时和许可边界。
- DICOM 和数字签名容器不进入未改动的 Full 依赖。可选 DICOM renderer 支持有界的本地单文件、单帧/多帧预览，覆盖未压缩、JPEG Lossless、JPEG-LS 和 JPEG 2000 Lossless；不声称诊断、PACS/DICOMweb 或多文件序列能力（#210）。
- 可选签名与证据容器 renderer 有界检查 CMS/CAdES、RFC 3161/5544、ASiC-S/E、RFC 4998、JWS 和公开 OpenPGP 材料。它使用许可宽松的 rPGP Worker/WASM，不包含 LGPL 源码，并分开报告解析、摘要/签名检查、信任和法律效力（#206）。
- 修复 #200 报告者提供的五页 PPTX 布局样例，覆盖 DrawingML 表格边界/内边距、SmartArt 水平文字、复杂形状和 PPTX Worker，并通过 Chromium、Firefox 与 WebKit。
- 还原 #211 报告样例的 Excel 表格主题、表头和交替行样式，列宽拖拽在切换 sheet 后继续保留；同时增加 #203 异常合并信息和稳定 Office 列宽回归。
- React、React Full、React Legacy 和 React Legacy Full 支持邮件附件嵌套预览，并覆盖恶意附件名、缓冲区替换、卸载、Worker 和 Object URL 清理（#212）。
- 重新执行 #178 的 Office 365/WPS 单元格内嵌图、浮动图、TIFF、Worker 传输、双击大图和可选列宽拖拽回归。
- DOC、RTF、PPTX、Markdown、Mermaid、Drawing、PlantUML 和 Typst 的文档内容到 HTML/DOM 边界统一加固；外链默认阻断，CSP 与 Trusted Types 在 Chromium、Firefox 和 WebKit 通过。
- 冻结 84 个 npm 目标：83 个主线包使用 `3.0.0`，历史兼容包 `msdoc-viewer` 使用 `0.2.4`；外部自研引擎固定为 `@file-viewer/docx@0.3.28` 和 `styled-exceljs@0.21.4`。
- 正式发布只提升冻结提交在构建、测试、安全门禁、冷安装、浏览器矩阵和 `npm publish --dry-run` 中通过的原始 tarball；发布阶段不重建、不临时增加稳定版本。

## `v2.4.0` 统一版本与冻结候选发布 — 2026-08-25

- 根版本、GitHub Release 与 56 个常规 npm 包统一为 `2.4.0`；历史兼容包 `msdoc-viewer` 使用独立的 `0.2.3` 版本。
- Spreadsheet 与 iWork 渲染链升级到 `styled-exceljs@0.21.3`，覆盖无原型工作表映射、有界 XML/标签处理，以及文档生成 HTML、CSS、链接、图片和属性的安全序列化。
- 重新验证 #178 的 Office 365/WPS 单元格内嵌图、浮动图、TIFF、Worker 传输、双击大图和可选列宽拖拽；版本统一没有移除 Excel 列宽调整能力。
- 稳定发布只提升已通过完整构建、冷安装与 npm dry-run 的原始 tarball。预演回执固定源提交、包集合、字节大小和 SHA-512，正式发布命令不再重新构建。

## `v2.3.2` 多页 TIFF 与 Vite 8 分块兼容 — 2026-08-24

- TIFF 路径按需加载 MIT 许可的 UTIF.js，支持 CCITT Group 4、多页纵向展示、整组缩放/旋转/适宽、页码状态，以及双击或键盘大图查看（#208）。
- 对编码大小、页数、单页尺寸、单页像素和累计解码像素设置硬限制；逐页转换会释放 RGBA 和 Object URL，普通 PNG/JPEG/WEBP 路径不加载 TIFF 解码器。
- Vite 8 改用 Rolldown `codeSplitting.groups`，Vite 5—7 继续使用 Rollup `manualChunks`；用户分组、优先级、输出数组和 `codeSplitting:false` 保持不变（#209）。
- 使用 #178 原始 Office 365/WPS 内嵌图片工作簿再次验证主线程、Worker、TIFF drawing 与大图查看路径，Excel 列宽拖拽能力没有被移除。
- 实际发布版本为 `@file-viewer/renderer-image@2.3.1`、`@file-viewer/vite-plugin@2.3.3`、`@file-viewer/preset-lite@2.3.1`，以及统一的 All/Full/copy-assets 2.3.6 补丁线；本版继续包含 v2.3.1 的全部安全修复。

## `v2.3.1` 旧版 DOC 渲染安全补丁 — 2026-08-24

- 旧版 DOC 直接 HTML API 会对文档提供的字体名和生成属性正确编码，避免文档内容突破样式或 HTML 属性边界。
- DOC 外部链接改为默认阻断；内部书签保持可用，显式允许时也只接受 HTTP(S)、邮件、电话和安全相对地址。
- 标准挂载路径在文档标记进入 DOM 前使用 DOMPurify 3.4.13 再次净化，renderer CSS 通过 `textContent` 注入。
- 净化器只进入 DOC 懒加载路径；压缩后为 10,923 字节，并由 15 KiB 发布门禁约束后续增长。
- 修复版本为 `@file-viewer/doc@2.3.1`、`msdoc-viewer@0.2.2`、`@file-viewer/renderer-word@2.3.2`，以及 Office/Full/copy-assets 的 2.3.4 补丁线。

## `v2.3.0` Office/iWork 扩展与真实文件修复 — 2026-08-20

- 将 Pages、Numbers、Keynote、WordPerfect、Hangul、DBF、FB2、XLA/XLAM 与 POT 纳入稳定格式矩阵；当前唯一目录包含 221 个扩展名和 32 条预览链路。
- 完整发布 #174、#178、#179、#195、#198、#201—#204 对应修复；#200 因缺少原始 PPTX 继续保留。
- 修复 Excel Office 365/WPS 单元格内嵌图片、工作簿绘图、文件原始列宽、Shadow DOM 列宽拖拽，并支持双击图片放大；用户后续提供的 TIFF drawing 会按需在浏览器内解码，主线程、Worker 与大图预览使用同一路径。
- DOCX 引擎升级到 `@file-viewer/docx@0.3.27`，修复复杂框架、分节、定位页面和锚定内容；Worker 缓存参数同步到实际运行时版本。
- 加固 PPTX Worker 输出、Markdown 渲染、压缩包文件名解码、包依赖与离线 Worker/WASM 交付。
- PPTX 按需构建不再携带仅供二进制 PPT 使用的 CJK 字体和原生 WASM；Vite 5–8 会按 `package.json#exports` 正确解析 `renderer-presentation/pptx` 子路径（#205）。
- 源码和 GitHub Release 版本为 v2.3.0；npm 不可覆盖的更正包按实际版本使用 `@file-viewer/renderer-spreadsheet@2.3.2`、`@file-viewer/renderer-iwork@2.3.1`、`@file-viewer/renderer-word@2.3.1`、`@file-viewer/renderer-presentation@2.3.1`、`@file-viewer/vite-plugin@2.3.2`，以及 Office/Full/copy-assets 的 2.3.3 补丁线。TIFF drawing 元数据由 `styled-exceljs@0.21.2` 提供。

## `v2.2.9` PPTX 与 Markdown 渲染安全补丁 — 2026-08-17

npm 包于 2026-08-13 发布；GitHub Release 于 2026-08-17 完成最终归档。

- PPTX Worker 产生的 HTML、SVG、内联样式与全局 CSS 在进入预览 DOM 前统一经过严格净化；外部媒体/矢量资源 URL、危险链接协议、事件属性、脚本、全局选择器和不安全 CSS 声明会被移除。
- PPTX XML 中的超链接 tooltip、形状属性、颜色与字体字段获得入口级校验；正常本地片段、base64 图片、blob 媒体和生成类规则保持可用。
- Markdown 的 Marked 输出改为先经 DOMPurify 再插入文档，新窗口链接自动使用 `noopener noreferrer`；DOMPurify 3.4.13 与 Mermaid 11.16.1 同步进入直接依赖。
- 自托管 Chromium 门禁同时覆盖恶意 Markdown、伪造 PPTX Worker 与真实恶意 PPTX Worker，验证普通/虚拟化两条渲染路径均不执行脚本、不污染全局样式且不发起攻击者控制的请求。
- 54 个 npm 目标、208 个扩展名和 25 条预览链路保持不变。

## `v2.2.8` 大表格、OFD 首屏与二进制 PPT 观感修复 — 2026-08-11

- Spreadsheet 自动列宽只对有界行集取样，避免每次适配时全量遍历大工作表。76 MB、259,702 行真实 XLSX 在修复后完成解析、布局和浏览器渲染（GitHub #173）。#193 的原始样例为 38,732,752 字节、100,545 行 × 20 列，worksheet 与 sharedStrings 解压后合计约 108 MB；冷首屏 4.194 秒，末行虚拟滚动、100,545 / 100,545 行缓存和无控制台错误均完成验证。
- OFD 页面在初始布局完成前禁用 transform transition，第一帧稳定后再恢复缩放动画；减少动效偏好仍被完整尊重（GitHub #194）。
- `@file-viewer/ppt@0.3.3` 保留开源二进制 PPT 强制水印，但从重复斜向覆盖改为单个右下角标记，在批准的空白帧 fixture 中覆盖像素从 9,145 减少到 644。水印仍由 native 最终帧合成且无关闭通道。
- PPT 水印的尺寸按 1x/2x/3x 设备像素比整数增长，避免 Retina 与其他高分屏上的半像素边缘；三种 DPR 均通过真实浏览器渲染和像素区域证明。
- PDF 缩放锚点（GitHub #191）和 HTML-in-WordDocument 旧版 DOC 容错（GitHub #192）随本版完成 GitHub Release、组件仓、Demo、文档、官网、Docker 与 npm 的统一分发。
- 官网可交互预览的 pointer ownership、悬停切换与移动端入口完成回归；发布工具对 npm 短暂超时、未确定 registry 状态和中断后续传改为显式保护。
- 能力矩阵保持 54 个 npm 目标、208 个扩展名和 25 条预览链路。

## `v2.2.7` PDF 缩放定位与旧版 Word 容错补丁 — 2026-08-11

- PDF 工具栏的放大、缩小和 API 缩放会先记录当前页与页内可视比例，再在 PDF.js 完成重新布局后恢复同一锚点；连续点击也不会短暂切换活动页（GitHub #191）。
- 部分扩展名为 `.doc` 的文件实际是 CFB 容器，`WordDocument` 流中保存 GB18030/UTF-8 HTML 且没有 `0Table`/`1Table`。解析器现在会在 FIB 之前识别这种明确格式，过滤脚本等不安全内容并转换为正常 AST，不再报 `Missing table stream`（GitHub #192）。
- `flyfish-dev/docjs` 所属仓库同步当前 legacy DOC 引擎，并独立通过表格、WPS、OfficeArt 图片、文本框 story 和 HTML-in-WordDocument 样例回归。
- 官网的文件预览 Hero 增加可交互卡片、悬停焦点和主题切换，同时收紧桌面与移动端的信息层级。
- 54 个 npm 目标、208 个扩展名和 25 条预览链路保持不变。

## `v2.2.6` 大文件、分页导航与 Office 交互稳定性补丁 — 2026-08-10

- Spreadsheet 会在解析阶段按真实单元格收紧异常 worksheet dimensions，避免格式化到整张工作表的文件造成巨量空行/列；图表发现改为读取 worksheet relationship，不再重复把大型 worksheet XML 解压为字符串（GitHub #173/#175）。
- Vue 3 与其他窄宿主首次打开 Spreadsheet 时按实际可视宽度计算 fit，桌面宽容器仍保持 100% 初始比例（GitHub #172）。
- OFD renderer 新增上一页、下一页、当前页/总页数、手动滚动同步、首尾禁用状态与键盘导航；resize 后保留活动页，打印时隐藏导航工具栏（GitHub #177）。
- Word renderer 会在正确的 DOCX renderer 边界拦截内部关系和外部 URL 的默认导航，同时保留链接文字；旧版 DOC 的文本框 story 也会从底层结构恢复，不再只显示占位字形（GitHub #171/#183）。
- PDF 在目录跳转、翻页、旋转和缩放状态回放后保留当前页与可视锚点，页码和页面不再突然向上跳动（GitHub #184）。
- `@file-viewer/pptx` 修复 connector 起终点、翻转和零尺寸 viewport 的几何计算；File Viewer 仅同步正式引擎产物，并通过专用几何 harness 与完整浏览器回归（GitHub #176）。
- 官网重新整理导航、支持矩阵、商业版和移动端入口，补齐 canonical redirect、IndexNow 和机器可读引用元数据；Crawler URL 仍不会进入离线运行时资产错误扫描。
- 发布前后回归覆盖冷安装、全 workspace 类型检查、根测试、全量构建、离线与 renderer 资产、28 格式矩阵、PDF/DOCX/XLSX/PPTX Demo，以及八类标准组件浏览器入口。
- 54 个 npm 目标、208 个扩展名和 25 条预览链路保持不变。

## `v2.2.5` 文档审阅、打印与 Office 图形渲染补丁 — 2026-08-01

- 文档比对页使用成熟的 `jsdiff` 对两侧提取文字逐行对齐，并在替换行内标记具体字符；提供新增、删除、修改、未变化计数、上下差异导航和“只看差异”。DOCX、Markdown、代码和纯文本是稳定路径；PDF 仅在文本层覆盖完整页面时展示，扫描 PDF 暂不内置 OCR（GitHub #145）。
- 打印蒙版支持上传本地印章图片，并按实际文档页拖动、缩放、删除和导出到打印 HTML；已有矩形蒙版与多 renderer 页索引保持兼容（GitHub #157）。
- 文件加载前可以通过统一守卫拒绝或确认来源；PDF 搜索/定位可聚焦真实可见区域，并修复边界框、同步滚动和旋转状态回放（GitHub #151/#154）。
- Geo renderer 增加天地图矢量、影像与地形底图预设；默认不开启公网请求，业务仍需显式提供可用配置（GitHub #153）。
- DOCX 页面背景与浮动覆盖层恢复正确层级；PPTX 清理残留图表节点，并修复组合形状中的梯形、平行四边形等几何映射和层级关系。
- 图片预览新增旋转并优化 Lightbox 缩放/拖动；首页部署修复旧 HTML 缓存被当作 JavaScript 模块返回造成的严格 MIME 报错。
- Vue 2.6 + Vue CLI 3 / webpack 4 客户样例、Docker 发布上下文、组件构建和公开仓边界均完成完整回归。
- 54 个 npm 目标、208 个扩展名和 25 条预览链路保持不变。

## `v2.2.4` DOCX/CAD 运行时与沉浸式预览稳定性补丁 — 2026-07-28

- Vue 2.6 + Vue CLI 3 / webpack 4 客户样例改为真实 `preset-office` 加图片、视频、CAD、3D 的显式补充装配；PDF.js legacy 模块会整体隔离内部 `modules`、`module_cache`、`exports`、`require` 四个 webpack runtime 标识，避免首次 PDF 初始化污染宿主导出、重选文件后从 `undefined` 读取 `createFileViewerTranslator`。DOCX ESM alias、同一本地 PDF 连续选择、图片和视频真实浏览器回归同步固化。
- Word 链路升级到 `@file-viewer/docx@0.3.26`。日文模板的东亚字体回退、行高和 VML 文本框不再导致字符重叠（GitHub #155）；Apache POI 输出的兼容 OOXML `w:hMerge restart/continue` 会规范化为真实列跨度，异常孤立 continuation 仍保持可读（GitHub #160）；多分节中文简历中的浮动形状、定位尺寸和页内内容流恢复原有关系，目录不再被挤压错位（GitHub #161）。主线程与离线 Worker 使用同一版本，并用 `0.3.26` 资源查询参数避免旧 Worker 缓存残留。
- CAD 链路使用 npm `latest` 的 `@flyfish-dev/cad-viewer@0.8.0`。底层引擎新增 BOM 提取与表格安全的 CSV/JSON 导出接口，收紧 DWG/DXF 元数据边界，并把 LibreDWG WASM 升级到 0.7.9；复杂线型 STYLE 引用为空时，合法图纸不再因解析异常而无法加载。
- Word 链路升级到 `@file-viewer/docx@0.3.23`。东亚语言和主题字体按文档语言脚本解析并保留可靠的系统字体回退，悬挂制表位、目录缩进和 HTML 样式属性的渲染更接近 Word；Worker 与主线程继续使用同一解析行为。
- Archive renderer 在压缩包内选中 Shapefile `.shp` 时，会按同目录和同 basename 收集 `.dbf`、`.shx`、`.prj`、`.cpg` sidecar，生成有界的临时 ZIP 后交给既有 Geo renderer；多数据集压缩包不会串用属性或投影文件，普通压缩包预览路径保持不变（GitHub #148/#149）。
- Word 链路升级到 `@file-viewer/docx@0.3.22`。缺失或部分缺失 `sectPr` / `pgSz` / `pgMar` 的 DOCX 在共享解析层获得 A4 页面和 1 英寸正文边距兜底，主线程与 Worker 行为一致；显式自定义尺寸、横向布局、零边距和附件保持不变（GitHub #150）。
- OFD 渐进渲染进入最终 ready 状态时不再重新隐藏已经可见的内容，消除大文件预览的二次闪烁；89 页样例会记录可见性 mutation 并确认不存在 ready 后回退（GitHub #163）。
- STEP/STP 重复预览时，Three.js Canvas backing buffer 会按当前 CSS 尺寸与设备像素比持续校正；即使外部流程把 backing buffer 降到 1×，下一渲染帧也会恢复清晰分辨率（GitHub #164）。
- Demo 首屏只按收起后的文件胶囊预留文档起始位置；开始滚动后文档可以自然进入胶囊后方，继续保持全视口沉浸滚动和透明滚动条。
- 日语界面完成核心消息、工具栏和样例入口覆盖；54 个 npm 目标、208 个扩展名和 25 条预览链路保持不变。

## `v2.2.3` 工具栏隔离与演示文稿运行时兼容补丁 — 2026-07-21

- Web、Vue 3、Vue 2.7、Vue 2.6、React、React Legacy、Svelte 与 jQuery 共用 Core 浏览器控制器。标准组件默认在 Shadow DOM 中渲染，业务全局 CSS 不再覆盖工具栏；需要参与宿主样式系统时仍可显式设置 `styleIsolation: 'none'`。
- 修复 Shadow/Light 模式在同一宿主重挂时的边界残留，并保护业务自行创建的 ShadowRoot：File Viewer 只管理自己的挂载节点，销毁不会清空业务内容。
- Vue 3 的组件样式和 renderer 样式进入真实 ShadowRoot；Vue 2.6 的事件、状态回调、命令与视图状态 API 和现代组件保持一致。
- PPTX Worker 兼容 Angular 22 application builder 的 `.angular/cache`、Vite 依赖优化和 `baseHref` 路径。
- 二进制 PPT 升级到 `@file-viewer/ppt@0.3.2`。自包含 Worker 修复普通 Vite 生产构建中的相邻模块 404；强制 Worker 模式已在全新临时应用中渲染 25 页真实 PPT，并确认 Worker、WASM 与字体请求全部返回 200。
- 54 个 npm 目标、208 个扩展名和 25 条预览链路保持不变；组件浏览器矩阵与主 Demo 的 136 个样例均完成真实渲染回归。

## `v2.2.2` EPUB 安全依赖与 Docker 响应头补丁 — 2026-07-17

- EPUB renderer 与缩略图包改为按需加载随包交付的本地引擎；构建固定组合 `epubjs@0.3.93` 与 `@xmldom/xmldom@0.9.10`，npm 用户的生产依赖树不再安装旧 XML DOM 包。
- 每次构建都会生成引擎 SHA-256、版本 manifest 和完整第三方 NOTICE；发布门禁会对两个 tarball 做全新官方 registry 安装与 `npm audit --omit=dev`，并验证不存在裸 `epubjs` import 或外部运行时依赖。
- Nginx 中带独立 `Cache-Control` 的 location 显式保留 `X-Content-Type-Options: nosniff` 与 `Referrer-Policy`，避免 location 级 `add_header` 关闭 server 级继承；`.mjs` 保持 `application/javascript`。
- 54 个 npm 目标、208 个扩展名和 25 条预览链路不变；2.2.1 的 PDF 下载、DOCX 锚点和自托管模块修复全部保留。

## `v2.2.1` 上传下载、DOCX 锚点与自托管运行时补丁 — 2026-07-17

- 修复上传 PDF 完成渲染后下载为 0 字节（GitHub #139）。PDF.js 转移并分离输入 `ArrayBuffer` 后，Core 会使用仍然完整的原始 `File`；流式 URL 和合法空文件保持原有行为。
- Word 链路升级到 `@file-viewer/docx@0.3.21`：WPS/WPG/图片不再重复应用根锚点偏移，嵌套组变换和组内图片正确组合，同段落内的页面/段落锚点也会在真实布局后同步（GitHub #133）；缺失页眉或页脚 root 的可选结构在引擎层直接跳过（GitHub #130）。
- Docker/Nginx 为 `.mjs` 返回正确的 JavaScript MIME，`nosniff` 下 PDF.js Worker、PPT 和其他 ESM 资产可以正常动态导入。
- CAD 运行时资源构建支持跨文件系统 `EXDEV`，暂存、复制、交换、回滚和部分清理失败均有确定行为；Docker 上下文和依赖缓存同步优化。
- 54 个 npm 目标、208 个扩展名和 25 条预览链路保持不变；PDF 上传下载、OFD→PDF、PPT、PPTX、复杂锚定 DOCX 和自托管容器均完成真实浏览器回归。#133 附件页面不再溢出，关键区块相对参考 PDF 的横向误差小于 0.4 pt、纵向误差约 2–3 pt。

## `v2.2.0` 产品化 Demo、路径兼容与集中缺陷修复 — 2026-07-17

- 主 Demo 重新设计为产品化预览工作台：桌面端使用紧凑导航轨、文件来源浮层、顶部文档操作和底部缩放 dock；平板与移动端自动收起非核心操作，暗色模式继续保留独立白色文档纸张。
- 显式 `?url=` 文件入口在首帧前进入沉浸模式，隐藏 Demo 品牌、样例、历史与外层状态，只保留预览器工具栏；桌面与移动端均为满视口文档容器滚动，不产生页面级滚动条。
- `@flyfish-dev/cad-viewer` 升级至 `0.7.0`。DWG Worker、DWF WASM、LibreDWG JS/WASM 四个运行时文件全部作为必需资产发布；复制过程先暂存并校验，再原子交换，失败会回滚，同时保留业务自定义 SHX 文件。
- STEP/STP、IGES/IGS 和 BREP 已通过本地 OCCT Worker/WASM 直接生成 Three.js 网格；装配层级、面颜色、适配、统一缩放、暗色场景、主线程回退以及子路径离线资源都进入真实浏览器回归。IFC 和 3DM 仍只提供准确的能力提示。
- Core 新增统一运行时资源基址 API，Vite 插件把 Full、preset 和独立 renderer 的 `copyAssets.baseDir` 同步到运行时。Angular 深层路由、相对 Vite base、SSR、Windows 分隔符、空格、中文目录，以及路径中包含 `assets` / `static` / `js` 的部署均有确定性回归。
- CSV/TSV 文本解析优先识别 UTF-8 BOM 和严格 UTF-8，无效 UTF-8 自动使用 GB18030（兼容 GBK）；`options.spreadsheet.textEncoding` 可显式指定编码，二进制 XLS/XLSX 不进入文本解码路径（GitHub #124）。
- `options.text.lineNumbers` 为普通代码/文本提供可配置行号；行号不会污染复制、全文搜索或屏幕阅读器输出，大文件虚拟滚动和移动端宽度保持稳定（GitHub #125）。
- Markdown 不再被普通文本的 512 KiB 默认阈值自动切成源码视图；默认始终保持 `marked` 排版阅读面，只有显式设置 `options.text.markdownVirtualizeAboveBytes` 才会在超限后进入有界源码模式（GitHub #136）。
- `options.text.toolbar` 默认保持历史元信息栏；显式传 `false` 可隐藏代码、文本和超大 Markdown 源码视图顶部的类型、索引状态与行数，不会误伤 Viewer 全局工具栏（GitHub #137）。
- PPTX 样式会注入真正承载内容的 ShadowRoot，默认 Worker URL 统一从运行时资源基址解析；Web Full IIFE 和 Angular 子路径不再请求站点根 `/worker/pptx.worker.js`（GitHub #127/#129）。
- PDF.js 的 `:root` 变量同时作用于当前 `.pdf-shell`，容器高度由本地 ResizeObserver 维护；全宽 flex grow + `overflow-auto` 宿主在初始 fit、缩小和 forced-colors 下保持居中（GitHub #128）。
- 宿主应用预载 PDF.js 3.x 时，File Viewer 不再让 PDF.js 5.4 复用不兼容的全局 fake-worker handler；本包只在自己的 PDFWorker 初始化期间临时接管 handler，随后完整恢复宿主 namespace（GitHub #134）。
- 静态 PDF Worker 会在实例化前校验官方版本标记；若部署目录残留的 Worker 与当前 PDF.js API 不一致，会自动切换到随包交付的同版本 handler，避免 `API version does not match the Worker version`（GitHub #138）。
- DOCX 渲染器识别缺失页眉/页脚 root 的特定异常，只对该可选结构禁用 headers/footers 并重试正文，其他异常仍按原路径抛出（GitHub #130）。
- Word renderer 会先按文件签名区分 OOXML ZIP 与 CFB：扩展名误写为 `.doc` 的有效 DOCX 不再进入二进制解析器，真实 `.doc` 路径保持不变（GitHub #131）。
- 非 Full 的 `preset-office` 资产复制补齐 `vendor/xlsx/sheet.worker.js`；Vite 子路径、npm/pnpm 冷安装、生产构建和来源版本都加入回归（GitHub #135）。
- PowerPoint 97–2003 二进制 `.ppt` 使用 `@file-viewer/ppt@0.3.1` 的 Worker / OffscreenCanvas / WASM、独立 CJK 字体与有界帧缓存，与 PPTX OOXML 解析链路严格分流，并纳入统一缩放、打印、HTML 导出和真实浏览器样例回归（GitHub #123）。Demo、Full、copy-assets、CDN/IIFE 以及 Vue 2.6 + Vue CLI 3 示例都交付经过校验的九文件 `vendor/ppt/` 运行时，标准布局无需手工配置 URL。File Viewer 自身代码仍为 Apache-2.0，PPT 运行时保留包内独立 LICENSE/NOTICE 与公开水印。
- TSV 纳入 Spreadsheet pipeline；格式矩阵更新为 208 个扩展名、25 条预览链路；离线扫描同时阻止 Demo GitHub API 请求和 Typst/Chevrotain 公网默认值进入分发资产。

## `v2.1.30` Full 包完整资产开箱契约

- 仅执行 `npm install` 只完成 renderer 代码安装，不会自动把 Worker、WASM、字体和 vendor 文件发布到业务站点；完成下述 Vite、非 Vite 或 `web-full/dist` 交付路径后，才属于完整格式支持。
- 八个 `*-full` 包统一内置 `preset-all` 和同一套运行时资源默认值，PDF、Office、CAD、Typst、Archive、Draw.io、SQLite 等不再因框架不同而使用不同路径。
- 七个框架 full 包精确依赖同版本 `file-viewer-copy-assets` 并直接提供复制 CLI；`web-full` 的完整 `dist/` 自带全部资源，可原样部署。
- Vite 插件识别 full 包后会在开发和构建阶段自动发布完整资产到部署基址下的 `file-viewer/`；自定义或空 `copyAssets.baseDir` 会同步运行时 URL，非 full 项目保持旧布局。
- Vite 开发服务器会在根路径、子路径、自定义或禁用 `publicDir` 时统一提供资产与完整性清单；`options.pdf.assetBaseUrl` 继续作为 PDF 全量资源覆盖，单项 URL 仍可单独覆盖。
- Svelte 与 Svelte Full 的包根默认导出固定为组件，action/controller 改走明确子路径，避免 Svelte 5 把 action 当组件挂载。
- 修复 CRA/Webpack 常见 `static/js` 及多级 assets 目录被误判为资源根的问题，子路径部署不再把 Worker/WASM 请求到静态脚本目录内。
- 批量发布脚本按 54 个 npm 目标的内部依赖稳定拓扑排序，并在依赖环或重复目标时提前失败。
- 新增八个 full 包资源合约、Vite 子路径与自定义目录、npm/pnpm 冷安装、CLI 完整复制以及真实 PPTX Worker 浏览器回归。

## `v2.1.29` 集中缺陷修复

- 修复 Vue 2.6 + Vue CLI 3 / webpack 4 示例上传 DOCX 后报 `renderAsync is not a function`（生产压缩后表现为 `u is not a function`）：webpack 4 默认选择 `@file-viewer/docx` 的 UMD `browser` 入口，该入口再次经过 Babel 转译后会丢失 CommonJS 导出。
- 旧构建链通过 alias 固定使用 `@file-viewer/docx/dist/docx-preview.mjs`，Word renderer 同时兼容传统 bundler 将 CommonJS API 放在 `default` 的模块形状。
- `pnpm verify:vue26-cli3-office-demo` 不再只验证内置 PDF；冷安装本地 tarball 后会真实上传 DOCX、等待文档页出现，并确认离线 DOCX Worker 被请求。`build`、`noApiBuild`、`nginx` 三种模式均纳入回归。
- 修复标准组件启用 `styleIsolation: 'shadow'` 后 Excel 单元格内容空白（GitHub #117）：`e-virt-table` 默认写入 `document.head` 的完整样式无法穿透 ShadowRoot，导致承载单元格文字的 overlayer 失去绝对定位并被画布裁掉。
- Spreadsheet renderer 会识别当前 `e-virt-table` 版本实际注入的完整样式，将其复制到渲染 ShadowRoot，并把 vendor `:root` 变量收敛到 host / `.excel-wrapper`；新增 harness 会先在 npm `2.1.23` 复现空白布局，再验证本地 Vite 开发与生产构建的多 sheet、合并单元格、公式、样式和 overlayer 几何关系。
- 移除 OFD vendor 对 `Array.prototype.pipeline` 的可枚举污染（GitHub #111），避免先加载 OFD 后 PDF.js 把数组误判为非法请求参数；OFD→PDF、PDF→OFD、重复切换和取消均纳入浏览器回归。
- 打印掩膜新增可选的零基 `pageIndex` 并保持旧全局坐标兼容（GitHub #112）；浏览模式允许滚轮/触摸翻页，绘制只武装当前页一次，PDF、DOCX、OFD、PPTX 的导出页均提供稳定页索引。
- 修复 Vite 开发入口 `/src/main.*` 被误当成运行时资产目录（GitHub #113）：资源基址排除 `/src/`、`/@fs/`、`/@id/`、`/@vite/` 和 `/node_modules/`，根路径/子路径 dev 不再请求 `/src/vendor/pdf` 或触发 fake worker / CMap EOF。
- Archive Worker 与 WASM 统一使用当前文档的运行时资源基址（GitHub #114/#115），同时保留显式绝对 URL 的最高优先级；ZIP、RAR5、7z、加密 ZIP 与 worker 失败边界均使用独立 Vite dev/build harness 验证。
- Vite 插件复制 PDF.js 资产时优先从 PDF renderer 自己的依赖树解析，并校验 API/Worker 版本和来源（GitHub #118）；消费项目根安装 `pdfjs-dist 6.x` 时不会再覆盖 renderer 固定的 `5.4.624` worker。
- PPTX renderer 的完成 Promise 现在等待 Worker、整体渲染及异步图表后处理全部结束（GitHub #119）；致命错误只触发错误事件，单页错误继续作为警告，切换文件或取消期间的旧任务无法回写完成状态。
- PDF 初始化和 ResizeObserver 统一重放规范化 fit 请求（GitHub #120/#121），保留 `padding`、`maxScale` 与三种 resize 策略；“1:1”固定回到 100%，居中按导航栏后的实际可视区域计算。
- CAD 引擎升级到 `@flyfish-dev/cad-viewer@0.6.6`（GitHub #122），修复 DWG 多段线闭合、保存 UCS/PLAN 初始视图及虚线/点线渲染。
- Web Full、Viewer Demo 和 Component Demo 构建完成后自动净化上游 Chevrotain/Typst 公网默认值；离线扫描只精确豁免 canonical/OG/Twitter 的静态元数据属性，同行运行时 URL 仍会被拦截。

## `v2.1.28` Office 兼容性与 Vite 8 修复

- 修复部分 Word/WPS `.doc` 文件仅在行结束标记携带表格属性时，单元格多段落被拆出表格、合并列宽错乱的问题；真实客户附件与合成表格回归均已验证。
- DOCX 引擎升级到 `@file-viewer/docx@0.3.20`，底部图表图例按实际文本宽度整体居中，同时保持右侧饼图图例行为不变。
- 修复 Vite 8 使用 spreadsheet renderer 时 `@xmldom/xmldom` 命名导出未预构建导致的浏览器启动错误，并加入独立 Vite 8 harness 回归。
- 加固离线资产、包体预算与 npm tarball 校验；全仓版本和 workspace 依赖推进到 `2.1.28`。

## `v2.1.27` 关键 PR 修复与缩略图能力

- 发布浏览器缩略图生成 API，覆盖 PDF、DOCX、XLSX、EPUB、OFD、Typst、PPTX 等格式，并强化取消、销毁和压缩包资源安全。
- 新增 CBZ/CBR 漫画阅读器，支持自然顺序、按钮/键盘/滑动导航及旧渲染会话清理。
- 修复 DOC 表格外边框继承与 Demo 集成 UI，补齐桌面/移动端回归验证。
- 版本提升至 `2.1.27`，用于避免覆盖 registry 中已有的旧 `2.1.26` 产物。

## `v2.1.26` 超大文本稳定浏览与主题切换

- 全仓版本、workspace 依赖和 release matrix 推进到 `2.1.26`。
- 文本、代码和 Markdown 超过 512 KiB 后自动使用稀疏行索引与有界虚拟滚动，不再一次性解码、高亮并挂载完整文件；52 万行代码、超长单行、全文搜索和尾部跳转均纳入真实 Chromium 回归。
- 工具栏新增可配置的手动浅色/深色切换按钮，支持 `toolbar.theme` 和 `toolbar.order`，并在重新渲染后恢复阅读位置（GitHub #97）。
- 发布已包含 DOCX / XLSX 图表预览修复及对应样例回归（GitHub #96）。
- GitHub 默认 `README.md` 改为 English，中文入口迁移到 `README.zh-CN.md`；中英文页面分别只展示对应语言的 Demo GIF。

## `v2.1.25` PDF 渲染器兼容性修复

- 全仓版本、workspace 依赖和 release matrix 推进到 `2.1.25`。
- 修复 UMI v4 项目启动报错 `Invalid regular expression flag`（GitHub #98）：`@file-viewer/renderer-pdf` 改为固定使用 `pdfjs-dist@4.10.38`，不再依赖新版 PDF.js 才需要的 JBIG2/OpenJPEG/QCMS/QuickJS wasm 辅助模块，PDF wasm 资源清单调整为可选（`required: false`）。
- 修复生产环境部署到二级路径（如 nginx 反代 `/workspace/`）时 PDF worker 路径解析错误（GitHub #99）：worker、cMap、标准字体等 PDF 资源统一按 `document.baseURI` 解析，移除单独的"仅站点根目录"回退逻辑，与其他渲染器的资源路径解析行为保持一致。
- 同步刷新 `pdf.worker.mjs` 等本地 vendor 资源与 CAD wasm 拷贝脚本。

## `v2.1.24` OFD 签章、DOC/PPTX 修复与打印体验

- 全仓版本、workspace 依赖和 release matrix 推进到 `2.1.24`。
- 修复 OFD 预览不显示电子签章（GitHub #94）：恢复 SES 签章外观解析，支持 PNG/JPEG 与嵌套 OFD 印章叠加。
- 修复 DOCX 导出/打印 HTML 图片空白（GitHub #90）：`blob:` 图片自动内联为 `data:` URL。
- 打印链路默认携带水印；新增掩膜打印与移动端打印下拉向上展开。
- 修复 `.doc` 内嵌 OfficeArt 图片解析（GitHub #87）与工具栏缩放按钮位移（GitHub #88）。
- 修复 PPTX Origin OLE EMF 图表渲染与空白 run 保留；DOCX 暗黑模式与远程 URL 规范化。

## 当前主线 OFD 电子签章预览

- 修复 OFD 预览不显示电子签章的问题（GitHub #94）：恢复 SES `SignedValue` 签章外观解析，支持 PNG/JPEG 印章图片与嵌套 OFD 印章，并按 `StampAnnot` 边界叠加到对应页面。
- 预览路径只提取印章外观，不做国密/证书验签，单个签章失败不会阻断正文渲染；新增 `seal-png.ofd` / `seal-ofd.ofd` 回归与 `pnpm --filter @file-viewer/renderer-ofd verify:github-94`。

## 当前主线 DOCX/导出 HTML 图片修复

- 修复 DOCX 导出 HTML / 打印时图片空白的问题（GitHub #90）：`@file-viewer/docx` 预览默认使用会话级 `blob:` URL，导出克隆后在新文档中失效。
- 在 core 导出/打印统一链路把 `blob:` 内联为可移植的 `data:` URL，并在 adapter 导出前等待图片就绪；同一修复覆盖打印窗口与 HTML 下载。

## 当前主线打印水印与打印掩膜

- 打印链路默认附带当前水印样式（`print-color-adjust: exact`），避免浏览器打印时丢掉水印层（GitHub #92）。
- 工具栏打印改为紧凑下拉：点击「打印」后可选「直接打印」或「掩膜打印」；掩膜打印进入拖拽黑块设计流程，确认后再打印。
- 移动端底部操作面板与浮动工具栏的打印下拉改为向上展开，避免盖住底部快捷入口或被裁切。
- 掩膜设计器通过 core 内部动态 `import('./print-mask')` 异步加载，不打进主包；组件侧统一调用 `printWithMask()` / `printRenderedHtml({ mask })`，安装组件即可开箱使用，无需用户配置 `@file-viewer/core/print-mask` 子路径 alias。
- 打印 HTML 在内容之上、水印之下叠加黑色遮盖块。

## 当前主线 `.doc` 内嵌图片解析修复

- 按 MS-DOC `PICFAndOfficeArtData` / MS-ODRAW OfficeArt BLIP 规范解析内嵌图片，不再只靠魔数扫描；修复把 OfficeArt 内嵌 PNG/JPEG 误判为 `image/emf` 或 `application/octet-stream`，导致浏览器空白占位的问题（GitHub #87）。
- 新增 OfficeArt FBSE/BLIP 提取、DIB→BMP、压缩 EMF/WMF zlib 解压与 SVG 转换，以及 PICF 显示尺寸（`dxaGoal`/`dyaGoal`/`mx`/`my`）应用到 `<img>`。
- 增加 `image-embedded.doc` 回归 fixture 与 `pnpm --filter @file-viewer/doc verify:github-87`，锁定 PNG/JPEG 内嵌图可解析、可渲染。

## 当前主线工具栏缩放按钮位置修复

- 修复默认工具栏从 100% 点击“放大”后，“1:1”还原按钮精确出现在“放大”按钮原位置，导致连续点击时第二次点击变成误触发“还原”而非继续放大的问题（GitHub #88）：工具栏为右对齐布局，且两个图标按钮宽度相同，原实现把“1:1”插入在“放大”按钮之后，右对齐重排会让“放大”整体左移一个按钮宽度，新按钮正好顶替上“放大”刚才的像素位置。
- 调整为“1:1”按钮插入在“放大”按钮之前，让“放大”按钮始终保持工具栏最右侧的锚点位置，显示/隐藏“1:1”不再引起它的位移；新增 DOM 顺序回归测试和真实浏览器坐标验证，锁定该行为避免回归。

## 当前主线 DOCX 暗黑模式适配

- DOCX 渲染引擎升级到 `@file-viewer/docx@0.3.18`，同步刷新 `vendor/docx/docx.worker.js` 和缓存版本参数，确保本地 Demo、web viewer 与 compat viewer 使用同一版离线 Worker。
- `options.theme: 'dark'` 会自动启用 DOCX 暗黑渲染；`theme: 'light'` 保持浅色文档面；`theme: 'system'` 继续跟随浏览器 `prefers-color-scheme`。需要业务强制覆盖时可设置 `options.docx.darkMode: true / false`。
- 新增 DOCX 暗黑样式回归断言，覆盖 viewer 背景、DOCX 包裹层、文档页颜色和 `color-scheme`，避免暗色模式下出现白块、透明底或文字对比度异常。

## `v2.1.20` 压缩包中文文件名与 full 资产路径修复

- 修复未声明 UTF-8 的 GBK/GB18030 ZIP 文件名乱码问题，兼容客户压缩包中中文文件名目录展示。
- 区分旧编码 ZIP 的兼容解码路径和真正的 libarchive Worker 失败，避免错误显示 “libarchive Worker 未能启动” 提示。
- Vue 3 / Vue 2.7 / Vue 2.6 full 包默认补齐 `/file-viewer/` 下的 Archive、PDF、Office、CAD、Typst 等离线资产 URL，并保留自定义 asset base URL 能力。

## 当前主线官方 Demo iframe 交付包

- 新增 `iframe.html` 作为官方 Demo 的无外壳嵌入入口，支持 `?url=...` 直接预览业务文件，也支持 `?from=<父页面 origin>&name=<文件名>` 后由父页面 `postMessage(Blob)` 传入二进制文件；原主 Demo `index.html` 保留同一套协议，兼容既有集成。
- 新增 `file-viewer-v2-*-official-demo-iframe.tar.gz` release artifact，包内包含官方 Demo 构建产物、`iframe-example.html`、`README.iframe.md`、`iframe-manifest.json`、示例文件和离线 Worker/WASM/vendor 资源，客户可直接私有化部署。
- `release:standard:build`、`release:public`、`verify:demo-output`、`verify:demo-iframe-artifact` 和公开仓 `release-manifest.json` 校验全部纳入该产物，避免后续发布漏带官方 iframe Demo 包。

## `v2.1.19` fit 适配与 Shadow DOM provider 补强

- 在 `v2.1.18` 离线资产发布基础上继续推进全仓版本到 `2.1.19`，确保最新源码、npm 包、公开仓、Release 资产和文档矩阵保持同一发布口径。
- core 的搜索、缩放和视图状态 provider 查找支持穿透 open ShadowRoot，Web Component / Shadow DOM 隔离模式下的工具栏、fit 和状态同步不再丢失内部 renderer provider。
- 图片、DOC 和 DOCX renderer 接入专属 fit provider，`fit:'width'`、`contain`、`scale-down` 等模式会基于真实图片尺寸或文档页面尺寸计算绝对缩放；图片未加载和文档暂不可测时会自动重试。
- 新增 ShadowRoot provider 回归测试，覆盖 provider 注册、查找和注销链路，避免样式隔离/组件封装后核心操作能力退化。

## `v2.1.18` 离线资产、本地化发布与 DOCX 引擎更新

- 全仓版本、workspace 依赖和 release matrix 推进到 `2.1.18`；当前矩阵覆盖 52 个 npm 发布目标、16 个组件目标、27 条 smoke 渲染链、24 个 renderer pipeline、206 个扩展名和 432 个组件渲染目标。
- `libarchive.js` Worker / WASM 改为发布前自动从当前 lockfile 固定版本同步到 demo、component demo、web viewer、compat viewer 和 web-full 产物，`release:standard:preflight` 会强制校验这些本地资产，压缩包运行时不再依赖外部地址。
- 全仓离线运行时扫描扩展到 core、renderer、preset、组件、compat、demo public/dist 和 full IIFE async renderer 产物；默认禁止 CDN、官方域名 fallback 和第三方在线服务引用，Geo 默认公开底图作为明确例外保留。
- DOCX 渲染引擎升级到 `@file-viewer/docx@0.3.17`，同步刷新 `vendor/docx/docx.worker.js`、`jszip.min.js` 和缓存版本参数，确保 npm 包、demo、component demo、web viewer 和 web-full 都拿到同一版离线 Worker 资产。
- `sanitize:release-dist` 覆盖 public 与 dist 两类运行时资产，避免 `prepare-viewer` 或 full IIFE 构建后重新带入 Typst 字体 CDN、Chevrotain diagram CDN、Draw.io 远端 fallback 等外链标记。
- Web Component / IIFE / web-full 默认走 Shadow DOM 样式隔离，框架组件可通过 `options.styleIsolation:'shadow'` opt-in；README、生态组件 README 和文档站同步说明 tokens、parts、hostile CSS 验证和旧 light DOM 兼容路径。

## 当前主线 ViewerOptions.fit 统一适配能力

- `ViewerOptions` 新增 `fit`，支持 `auto`、`contain`、`cover`、`width`、`height`、`actual` 和 `scale-down`；未传 `fit` 时继续保持各 renderer 历史首屏行为，避免轻量接入被默认策略改变
- `fit` 对象形态支持 `{ mode, resize, padding, minScale, maxScale }`，其中 `resize` 默认 `until-interaction`：首屏和容器变化自动适配，用户手动缩放、平移或恢复视图后停止覆盖用户视角
- core 扩展 zoom / view-state provider 合约，新增 `fitToView()` controller/ref API 和 `fit-change` 事件；Web Component 支持 `<flyfish-file-viewer fit="width">`
- PDF、图片、CAD、XMind、Geo 和 3D renderer 接入专属 fit provider，其他标准 renderer 通过通用 view-state provider 走内部 zoom provider 兜底；压缩包和邮件内嵌预览继承父级 `options.fit`
- Demo 新增 fit 模式切换入口；显式 fit、resize、用户缩放暂停自动适配和 `fitToView()` 主动重算纳入通用浏览器 smoke / release matrix 体系，避免长期保留一次性 issue 验证入口

## 当前主线工具栏定制能力

- `toolbar.position` 新增 `top-center`，支持顶部操作栏水平居中；原有 `top` 继续保持顶部靠右，`auto` 和 `bottom-right` 行为不变，兼容已有接入

## 当前主线视图状态同步能力

- 新增统一 `initialViewState`、`view-state-change`、`getViewState()` 和 `applyViewState()` 协议，面向投屏、远端协同、双栏对比和阅读进度恢复
- 所有标准 renderer loader 自动注册通用 view-state provider，未写专属适配的格式也能记录 / 恢复 renderer、缩放和滚动比例
- PDF 提供页码、页数、缩放、旋转、滚动和导航状态；XMind、Geo、3D、CAD 追加画布 pan、地图中心、相机视角或底层视图快照等高交互状态
- 程序化恢复使用 `source: 'api'` / `action: 'restore'`，并抑制中间滚动和缩放回弹事件，避免操作端和展示端互相触发
- README、中英文使用文档、快速开始和格式能力页已统一说明 view-state、真实 zoom 状态和 PPTX Worker 自托管配置，方便几轮修复后对外口径保持一致

## 当前主线缩放状态准确性修复

- core 的 zoom controller 会订阅 renderer provider 的异步状态变更，首屏自适应、容器 resize 和内部重排后同步抛出真实 `zoom-change`
- `getOperationAvailability()` / `operation-availability-change` 会结合当前 `zoomState` 动态计算 `zoomIn`、`zoomOut`、`zoomReset`，各生态组件和自定义工具栏不再拿到静态缩放能力
- PDF、Word/DOCX、DOC 和图片预览修正首屏 fit 后的真实比例、缩放步进和 reset 状态，避免显示默认 `100%` 或点击缩放时来回跳
- 新增 `pnpm verify:zoom-state` 浏览器回归，覆盖 DOCX、PDF 和图片的首屏比例、内部 scale 与工具栏显示一致性

## `v2.1.9` OFD 资源路径解析加固

- OFD renderer 加固电子发票资源路径归一化和查找逻辑，兼容 `DocumentRes`、`PublicRes`、`BaseLoc`、大小写差异和缺失目录等组合场景
- 修复部分 OFD 文件读取图片资源时因路径解析失败抛出 `Cannot read properties of undefined (reading 'async')`，导致整份文档无法预览的问题
- 缺失或异常资源继续降级跳过，保证可解析页面主体优先展示

## `v2.1.8` OFD 电子发票兼容与压缩包内嵌预览修复

- OFD renderer 兼容多个并列 `ofd:Fonts`、`ofd:DrawParams`、`ofd:MultiMedias` 资源分组，修复部分电子发票在读取图片资源时抛出 `Cannot read properties of undefined (reading 'format')` 的问题
- OFD 图片资源渲染增加缺失资源兜底，单个资源异常不会中断整份文档正文预览
- PDF renderer 默认静态 `vendor/pdf/pdf.worker.mjs` 不存在或被网关回退成 HTML 时，会自动懒加载包内 PDF.js worker handler 兜底，修复轻量 `@file-viewer/vue3` / `@file-viewer/web` + `@file-viewer/preset-office` 接入时因未复制 viewer assets 导致 `Setting up fake worker failed` 的问题；显式 `options.pdf.workerUrl`、Vite 插件和 `file-viewer-copy-assets` 仍优先使用真实 Worker
- 压缩包预览支持隐藏/显示内部文件列表，长文件名自动省略，避免移动端和窄容器下把页面挤出视图
- `@file-viewer/web-full` IIFE 嵌套预览继续使用当前已安装的 renderer / preset 上下文，压缩包内 PDF、Office、图片等文件不再误判为缺失 renderer

## 当前主线 GitHub 曝光与长期运营资产优化

- README 首屏改为“面向企业后台、内网和私有化系统的纯前端文件预览组件”，把无需服务端转码、Demo、文档、快速开始和支持格式前置，把 206 个扩展名作为可信度证据承接
- 新增 `CONTRIBUTING.md`、`SUPPORT.md`、`SECURITY.md`、`CODE_OF_CONDUCT.md`、`ROADMAP.md`、根 `CHANGELOG.md`、Issue 模板和 PR 模板，方便收集真实业务文件兼容性反馈
- 文档站新增方案对比页，克制说明 File Viewer、服务端转码和 Office Online / 云服务的适用边界
- 新增 `RELEASE_TEMPLATE.md`，沉淀 Release 写法、Topics、Social Preview 和版本发布节奏
- 新增 GitHub Wiki 同步链路，将完整中英文文档以 Wiki 页面保留在 GitHub，和官网文档站形成双入口

## `v2.1.6` Vite 插件 PDF 资产复制与移动端接入说明修复

- `@file-viewer/vite-plugin` 的依赖解析改为递归锚点发现：在 pnpm / yarn PnP 风格严格依赖场景下，即使业务只直接安装 `@file-viewer/react`、`@file-viewer/preset-office` 和 `@file-viewer/vite-plugin`，插件也能从 preset 依赖链继续定位 `@file-viewer/renderer-pdf` 与 `pdfjs-dist`，正确复制 `vendor/pdf/pdf.worker.mjs`、CMap、WASM 和 standard fonts
- 新增插件回归用例，模拟 React/Vite 项目中 renderer 只挂在 preset 依赖下的安装结构，验证 `copyAssets:true` 能在 dev publicDir 中生成完整 PDF 离线资源
- React 快速开始补充手机浏览器、H5 WebView 与 React Native WebView 接入说明，明确容器高度、`100dvh`、安全区、右下角工具栏、内部缩放 provider 和自托管 Worker/WASM 资源的推荐配置

## `v2.1.5` DOCX Electron 兼容与 Excel 图片滚动层级修复

- DOCX Worker 默认改为自动环境检测：HTTP/HTTPS 部署继续启用 Worker，Electron `file://`、`about:`、`data:` 等不安全本地协议会自动回退到主线程解析，避免本地预览长时间等待 Worker 握手；显式 `options.docx.worker: true / false` 仍拥有最高优先级
- DOCX Worker 默认超时调整为 5000ms，静态资源路径、MIME、CSP 或 WebView 不兼容时更快回退，减少用户误判为页面卡死的等待时间
- Excel / XLSX 图片浮层限制在真实单元格内容区，并为右侧/底部滚动条预留安全交互区域，修复图片覆盖表格滚动条导致滚动困难的问题

## `v2.1.4` 文档首页专业化与 IIFE 按格式异步加载

- 文档站首页重构为能力驱动入口，首屏突出浏览器端文件预览基础设施、多格式覆盖、统一交互、模块化装配、离线资源和企业部署能力，避免只围绕快速开始展开
- 中英文文档首页同步新增核心能力区，说明高还原格式链路、按需性能策略、搜索/缩放/打印/导出/水印等统一交互，以及公网、内网、Docker、Cloudflare Pages、Release 包和私有 CDN 的交付边界
- `@file-viewer/web-full` IIFE 首包改为只注册 Custom Element、controller 和 lazy full preset；PDF、Word、Excel、CAD、Typst、压缩包等重型 renderer 会在命中文件类型时异步加载 `dist/renderers/*.iife.js`
- Worker、WASM、字体、PDF cMap、CAD、Typst、Archive、Docx、Excel 和 Draw.io 离线资源继续按脚本 URL 自动解析，保持 CDN 与企业自托管一致体验

## `v2.1.3` CDN 全量接入与生态 full 包

- 新增 `@file-viewer/web-full`、`@file-viewer/vue3-full`、`@file-viewer/vue2.7-full`、`@file-viewer/vue2.6-full`、`@file-viewer/react-full`、`@file-viewer/react-legacy-full`、`@file-viewer/jquery-full` 和 `@file-viewer/svelte-full`，面向“先验收完整能力，再按业务边界裁剪”的快速接入场景
- `@file-viewer/web-full` 提供 CDN / script 标签完整格式入口，IIFE 包会根据脚本地址自动定位随包分发的 Worker、WASM、字体、PDF cMap、CAD、Typst、Archive、Docx、Excel 和 Draw.io 离线资源，适合公网 CDN 与企业自托管两种模式
- 保留原有轻量组件包与 `preset-lite` / `preset-office` / `preset-engineering` / `preset-all` 的按需组合模式；文档和 README 前置说明“轻组件 + preset / renderer”的推荐边界，避免把 full 包误用为所有业务的默认选择
- Vanilla JS 快速开始补齐无组件命令式 `mountViewer` 示例；Vue3、Vue2.7、Vue2.6、React、React Legacy、Svelte、jQuery 的快速开始均补齐 full 包与按需包两条路径
- 生态包校验扩展到 50 个发布目标，覆盖标准组件、完整 full 包、核心、renderer、preset、Vite 插件与历史兼容 alias；发布链路同步构建 Demo、官网、文档站、开源总仓和 npm

## `v2.1.2` 压缩包内嵌预览、移动端 PDF 与安装口径修复

- 压缩包内嵌 PDF / Office / 图片等文件预览会清理父级压缩包的 `url` / `streamUrl`，避免内部 PDF 误读取外层 `.zip` / `.rar` 流导致 `Invalid PDF structure` 或 `Bad FCHECK in flate stream`
- 移动端 PDF 预览在窄屏默认收起页侧边栏并压缩工具栏高度，避免导航面板遮挡页面主体；显式 `options.pdf.defaultNavigationVisible` 仍可覆盖默认行为
- 快速开始、生态总览和 README 将“轻组件包 + preset / renderer 格式能力层”的安装边界前置说明，明确 `@file-viewer/vue3` 等组件包最轻，`preset-all` 是完整 Demo / 内部全格式入口而非所有业务默认选择
- 发布前回归覆盖 `archive` 嵌套渲染上下文、core preset 自动装配、文档构建、Demo 构建、官网构建、离线资源校验、安装体积预算和冷安装时间；`vue3 + preset-all` 最重冷安装目标通过
- 全线生态包、Demo、文档站、官网和开源总仓同步推进到 `2.1.2`

## `v2.1.1` GitHub issue 回归修复与发布同步

- `@file-viewer/vite-plugin` 新增 preset 自动发现与默认 HTML 注入；安装 `@file-viewer/vue3` 等组件包并安装 `@file-viewer/preset-office` / `preset-engineering` 后，框架组件可通过 `autoRenderers` 自动获得对应预览能力，仍保留 `inject:false`、`autoRenderers:false` 和 `rendererMode:'replace'` 的手动控制路径
- core 缺失 renderer 状态改为区分“支持矩阵内但未装配”和“真正不支持”：如 `.pdf` 未装配时提示安装 `@file-viewer/preset-office` 或 `@file-viewer/renderer-pdf`，避免用户误解为产品不支持该格式
- Markdown 预览自动剥离文件开头 YAML Frontmatter，避免元数据被当作正文渲染，同时保留正文中的普通分隔线
- PDF 默认 Worker、cMap、WASM 和标准字体资源改为站点根路径解析，兼容 Vite / Vue Router / React Router 等深层路由部署
- Excel / XLSX worker 将图片 drawing anchor 纳入虚拟表格尺寸计算，修复图片位于数据区下方时无法继续向下滚动的问题
- 工具栏新增 `toolbar.items` 与 `toolbar.permissions`，同时保留 `beforeOperation` / `toolbar.beforeOperation` 作为异步鉴权和确认拦截点
- 全线生态包、Demo、文档站、官网和公开总仓同步推进到 `2.1.1`

## `v2.1.0` 模块化架构与文档门户专业化

- 全仓 workspace、标准组件包、renderer、preset、兼容 alias、Demo、官网和文档站版本统一推进到 `2.1.0`
- 对外重点明确为模块化架构：`@file-viewer/core` 负责底层协议和统一 API，重型格式能力进入独立 renderer，`preset-lite` / `preset-office` / `preset-engineering` / `preset-all` 按产品形态组合，各生态组件保持原生体验
- README 头部补齐品牌图标、GitHub / npm / Docs / Demo / Release / Docker / License / 格式矩阵 badge，并把 Demo GIF 前置，降低用户理解成本
- README 与文档站补齐最小化引入和组合引入的详细步骤，说明 `@file-viewer/vite-plugin`、`formats`、`preset`、`copyAssets`、`virtual:file-viewer-renderers`、`builtinRenderers:'none'` 和 `rendererMode:'replace'` 的推荐搭配
- 文档站首页移除嵌入 Demo 的 iframe，改为 GIF 展示、模块化接入路径和更专业的文档导览；官网 `file-viewer.app` 改为嵌入 `doc.file-viewer.app`，让门户和文档站关系更紧密
- 对外 npm 生态口径更新为 50 个发布目标：45 个标准组件/完整 full 包/核心/renderer/preset/工程插件包 + 5 个历史兼容 alias

## 当前主线 XMind、EDA 版图与表格列宽体验补齐

- 新增 PSD 高保真图层预览，`@file-viewer/renderer-data` 在命中 `.psd` 时才按需加载 `ag-psd`，支持图层选择显隐、画布重绘、统一缩放、主题隔离和 HTML 导出边界说明
- 新增 Mermaid / PlantUML 绘图预览，`@file-viewer/renderer-drawing` 在命中 `.mermaid` / `.mmd` / `.plantuml` / `.puml` 时才分别加载官方 Mermaid renderer、`plantuml-encoder` 与 Panzoom；PlantUML 默认离线源码预览，需要完整服务端 SVG 时可通过 `options.drawing.plantumlServerUrl` 指向自托管服务
- 新增 Git patch 和 Git bundle 预览，`@file-viewer/renderer-text` 对 `.patch` 按需加载 `diff2html` 输出左右比对，对 `.bundle` / `.bdl` 解析 refs、提交历史、文件树和可读 blob 内容，并在浏览器端还原常规 OFS_DELTA / REF_DELTA 对象
- UMD 电子书从 core 迁移到 `@file-viewer/renderer-epub`，与 EPUB 共用电子书 renderer 包；`@file-viewer/core` 运行时依赖归零，`pako` 仅在打开 UMD / Git bundle 等相关 renderer chunk 时加载
- 支持格式矩阵更新为 206 个扩展名、24 条预览链路；Demo 新增 PSD、Mermaid、PlantUML、patch 和 git bundle 示例，Vite 插件、bundle budget、组件 README 与文档站口径同步
- XMind 画布交互切换为轻量成熟的 `@panzoom/panzoom`，保留 `@ljheee/xmind-parser` 的 XMind 8 XML / XMind 2020+ JSON 解析链路，拖拽平移、节点起手拖拽、移动端双指缩放、滚轮锚点缩放、键盘平移、适配画布和 toolbar 状态同步由统一 Panzoom 状态驱动；浏览器 smoke 已加入真实鼠标拖拽断言
- `@file-viewer/eda-layout` 新增 OASIS 可读文本夹具解析，OAS/OASIS demo 不再只是结构提示，能够在浏览器里输出 SVG 版图；真实 SEMI 二进制 OASIS 仍保持安全结构索引、可读字符串、实体候选和诊断边界，后续完整几何继续走独立 WASM/增量渲染内核路线

- 新增 `@file-viewer/renderer-presentation` 独立 renderer 包，基于 `@file-viewer/pptx` 提供 PPTX / PPTM / POTX / POTM / PPSX / PPSM 按需预览、缩放、打印和 HTML 导出；`@file-viewer/preset-all` 与 `@file-viewer/vite-plugin` 已优先聚合该包，ODP 继续走 OpenDocument 兼容链路
- `@file-viewer/core` 移除 `@file-viewer/pptx` 直接依赖和内置 PPTX handler，PowerPoint 完整预览统一通过 `@file-viewer/renderer-presentation` 或 `@file-viewer/preset-all` 装配，core 直接渲染依赖从 37 降到 36
- 新增 `@file-viewer/renderer-word` 独立 renderer 包，承接 DOCX / DOCM / DOTX / DOTM、DOC / DOT、RTF 和 ODT 预览链路；`@file-viewer/core` 移除 `@file-viewer/docx`、`msdoc-viewer`、`rtf.js`、`linkedom` 和 `@xmldom/xmldom` 直接依赖，Word 完整预览统一通过 `@file-viewer/renderer-word` 或 `@file-viewer/preset-all` 装配，core 直接渲染依赖从 36 降到 31
- XMind 已从 core 兼容入口中彻底移出，`@file-viewer/core` 不再默认安装 `@ljheee/xmind-parser`；完整脑图预览统一由 `@file-viewer/renderer-mindmap` 或 `@file-viewer/preset-all` 装配，core 直接渲染依赖从 31 降到 30
- 地理数据已从 core 兼容入口中移出，`@file-viewer/core` 不再默认安装 `@tmcw/togeojson`、`shpjs`、`maplibre-gl` 和 `proj4`；GeoJSON / KML / GPX / SHP 预览统一由 `@file-viewer/renderer-geo` 或 `@file-viewer/preset-all` 装配，core 直接渲染依赖从 30 降到 28
- HEIC / HEIF 转换能力已从 core 轻量图片入口中移出，`@file-viewer/core` 不再默认安装 `heic2any`；普通图片仍保留浏览器原生预览，HEIC / HEIF 和完整图片链路统一由 `@file-viewer/renderer-image` 或 `@file-viewer/preset-all` 装配，core 直接渲染依赖从 28 降到 27
- Vue3 原生组件渲染桥接层改为按当前 `options.renderers`、`options.rendererMode` 和 `options.builtinRenderers` 创建临时 renderer registry，`@file-viewer/preset-all` / 独立 renderer 包会在组件路径真实生效，避免 XMind、Geo、HEIC 等已从 core 移出的格式在 Demo 中误显示“不支持”
- 新增 `@file-viewer/renderer-drawing` 独立 renderer 包，覆盖 Draw.io / diagrams.net 离线 viewer、Excalidraw rough.js 只读 SVG 兜底、统一缩放、打印和 HTML 导出，并由 `@file-viewer/preset-all` 与 `@file-viewer/vite-plugin` 自动聚合
- 新增 `@file-viewer/renderer-3d` 独立 renderer 包，基于 Three.js loaders 承接 GLTF/GLB、OBJ、STL、PLY、FBX、DAE、3DS、3MF、USD/USDZ、点云和 VTK 等 WebGL 预览，并由 `@file-viewer/preset-all` 与 `@file-viewer/vite-plugin` 自动聚合
- 新增 `@file-viewer/renderer-data` 独立 renderer 包，承接字体、PSD、AI/EPS、SQLite、Parquet、Avro、WASM 和 WebArchive 的安全结构预览，SQLite WASM 由 `@file-viewer/vite-plugin` 复制到离线 assets
- 新增 `@file-viewer/renderer-eda` 独立 renderer 包，承接 OLB、DRA、GDSII、OASIS 结构预览；标准 GDSII 可用纯前端记录解析生成 SVG 快速版图，大元素集会自动切到 WebGL canvas，OASIS / Cadence 高保真几何继续按独立 WASM 内核路线维护
- 新增 `@file-viewer/eda-layout` 与 `@file-viewer/eda-orcad` 两个 EDA engine package；GDSII/OASIS 版图底层能力、OrCAD/Allegro 二进制检查能力从 UI renderer 中拆出，GDSII WebGL typed-array 批次已有独立门禁，后续 OASIS WASM 或逐步 TS 移植可以独立发布、独立回归
- 复核 XMind、GDSII/OASIS、OLB/DRA 等新增复杂格式的公开生态与 WASM/手写解析路线，明确 GDSII 是当前正式快速预览，OASIS 文本夹具可真实出图，真实二进制 OASIS/OLB/DRA 仍属于结构预览和后续独立 WASM 内核路线；同时把 XMind `pan` 写入 smoke matrix 显式断言，真实浏览器 smoke 已覆盖 Pointer 与真实鼠标拖拽路径
- 按需渲染架构计划补齐为可执行路线图，明确轻 core、独立 renderer、preset 编排、Vite 插件自动装配、renderer 交付契约、core 依赖预算和终态验收门禁；新增 `verify:core-dependency-budget`、`verify:renderer-contracts`、`verify:renderer-assets`、`verify:install-budget` 与 `verify:bundle-budget`，后续以清理 core 直接重依赖和守住首屏入口体积为 2.x 主治理线
- 支持格式矩阵保持 206 个扩展名、24 条预览链路，新增 XMind 脑图、Mermaid / PlantUML、Git patch / bundle 和 PSD 图层预览，并将 EDA 安全结构索引扩展到 GDSII / OASIS 版图文件；`brep` 进入 3D 工程模型入口
- `.xmind` 基于 `@ljheee/xmind-parser` 离线解析 XMind 8 XML 与 XMind 2020+ JSON 包结构，支持多 sheet、节点、标签、备注、链接、标记、图片、目录树、Panzoom 拖拽平移、移动端双指缩放、适配画布、搜索、缩放、打印和 HTML 导出
- 优化 XMind 画布平移体验，使用 Panzoom 替代脆弱的手写输入状态机，支持移动端 pinch zoom、Ctrl/Command 滚轮锚点缩放、键盘方向键平移和双击适配视图，拖拽中禁用链接命中并禁用浏览器原生拖图/拖链接，边界约束改为画布式保留可见边缘
- XMind 浏览器 smoke 已增加 Pointer、节点起手、滚轮平移和真实鼠标拖拽断言
- XMind 平移、目录定位和键盘方向键移动后会同步通知统一缩放 toolbar，外部 `resetZoom()` / `getZoomState()` 能正确感知“已平移但比例未变化”的状态
- XMind 官方 Demo 样例已通过真实浏览器回归：`.xmind` 能由 `@file-viewer/renderer-mindmap` 正常接管，拖拽后画布 transform 发生平移变化，证明组件层 preset 装配和 renderer 内部 pan 交互同时生效；浏览器冒烟脚本也会对 `.xmind` 执行 PointerEvent 拖拽断言
- XMind 增加 ResizeObserver 视口适配策略：首次打开和宿主容器尺寸变化会自动适配画布，用户手动拖拽、滚轮或缩放后保留当前视角，只做安全边界校正，避免脑图在移动端、嵌入容器和响应式布局中“拖不动”或 resize 后视角丢失
- 代码与 Markdown 预览从 core 兼容入口中彻底移出，`@file-viewer/core` 不再默认安装 `highlight.js` 和 `marked`；完整文本预览统一由 `@file-viewer/renderer-text` 或 `@file-viewer/preset-all` 装配，core 直接渲染依赖从 27 降到 25，Phase 3 依赖预算从 10 降到 8
- 音视频预览从 core 兼容入口中彻底移出，`@file-viewer/core` 不再默认安装 `hls.js` 和 `@tonejs/midi`；MP3/WAV/OGG/MIDI/MP4/WEBM/HLS 完整媒体能力统一由 `@file-viewer/renderer-media` 或 `@file-viewer/preset-all` 装配，core 直接渲染依赖从 25 降到 23，Phase 3 依赖预算从 8 降到 6
- 3D 模型与绘图预览从 core 兼容入口中彻底移出，`@file-viewer/core` 不再默认安装 `three`、`@excalidraw/excalidraw` 和 `roughjs`；GLB/GLTF/STL/OBJ/FBX/DAE/3MF/VTK 等模型由 `@file-viewer/renderer-3d` 装配，Draw.io / Excalidraw / Mermaid / PlantUML 由 `@file-viewer/renderer-drawing` 装配，core 直接渲染依赖从 23 降到 20，Phase 3 依赖预算从 6 降到 3
- 压缩包、邮件和 EPUB 预览从 core 兼容入口中彻底移出，`@file-viewer/core` 不再默认安装 `libarchive.js`、`postal-mime`、`@kenjiuno/msgreader` 和 `epubjs`；Archive / Email / EPUB 完整能力统一由 `@file-viewer/renderer-archive`、`@file-viewer/renderer-email`、`@file-viewer/renderer-epub` 或 `@file-viewer/preset-all` 装配，core 直接运行时依赖从 20 降到 16，Phase 3 依赖预算从 3 降到 0
- 数据资产与 EDA 预览从 core 兼容入口中彻底移出，`@file-viewer/core` 不再默认安装 `ag-psd`、`sql.js`、`hyparquet`、`avsc` 和 `cfb`；PSD / SQLite / Parquet / Avro / OLB / DRA / GDSII / OASIS 完整能力统一由 `@file-viewer/renderer-data`、`@file-viewer/renderer-eda` 或 `@file-viewer/preset-all` 装配，core 直接运行时依赖从 16 降到 11，Phase 4 依赖预算归零
- PDF 预览从 core 兼容入口中彻底移出，`@file-viewer/core` 不再默认安装 `pdfjs-dist`；PDF 页面渲染、导航、目录、搜索、缩放、打印和导出统一由 `@file-viewer/renderer-pdf` 或 `@file-viewer/preset-all` 装配，core 直接运行时依赖从 11 降到 10，Phase 2 依赖预算从 10 降到 9
- OFD 预览从 core 兼容入口中彻底移出，`@file-viewer/core` 不再默认安装 `jszip`、`ofd-xml-parser` 和 DLTech21/ofd.js vendor；OFD 页面渲染、缩放、打印和导出统一由 `@file-viewer/renderer-ofd` 或 `@file-viewer/preset-all` 装配，core 直接运行时依赖从 10 降到 8，Phase 2 依赖预算从 9 降到 7
- Typst 预览从 core 兼容入口中彻底移出，`@file-viewer/core` 不再默认安装 `@myriaddreamin/typst.ts`、`@myriaddreamin/typst-ts-renderer` 和 `@myriaddreamin/typst-ts-web-compiler`；Typst 源文件编译、按页 SVG 渲染、缩放、打印和导出统一由 `@file-viewer/renderer-typst` 或 `@file-viewer/preset-all` 装配，core 直接运行时依赖从 8 降到 5，Phase 2 依赖预算从 7 降到 4
- CAD 预览从 core 兼容入口中彻底移出，`@file-viewer/core` 不再默认安装 `@flyfish-dev/cad-viewer`；DWG / DXF / DWF / DWFx / XPS 完整预览统一由 `@file-viewer/renderer-cad` 或 `@file-viewer/preset-all` 装配，core 直接运行时依赖从 5 降到 4，Phase 2 依赖预算从 4 降到 3
- Spreadsheet 预览从 core 兼容入口中彻底移出，新增 `@file-viewer/renderer-spreadsheet` 独立 renderer 包承接 XLSX / XLSM / XLSB / XLS / CSV / ODS / FODS / Numbers 等表格格式；`@file-viewer/core` 不再默认安装 `styled-exceljs`、`e-virt-table` 和 `tinycolor2`，完整表格能力统一由 `@file-viewer/renderer-spreadsheet` 或 `@file-viewer/preset-all` 装配，core 直接运行时依赖从 4 降到 1，Phase 2 依赖预算从 3 降到 0
- `.gds` 新增标准 GDSII 记录解析、SVG 版图预览和大元素集 WebGL canvas，能够展示 structure、boundary、path、text、reference、层信息和坐标边界；`.oas`、`.oasis` 文本夹具可生成 SVG 版图，真实 SEMI 二进制 OASIS 保持纯前端安全结构索引、可读字符串、实体候选、二进制线索和诊断，避免把专业 EDA 文件误当普通文本或空白二进制
- 邮件预览迁移为 `@file-viewer/renderer-email` 独立 renderer 包，继续支持 EML / MSG / MBOX、正文/头信息切换、附件下载和附件嵌套预览，并由 `@file-viewer/preset-all` 自动聚合
- OFD 预览迁移为 `@file-viewer/renderer-ofd` 独立 renderer 包，继续基于 `DLTech21/ofd.js` 的纯前端源码链路解析和页面渲染，vendor 随包离线分发，并由 `@file-viewer/preset-all` 与 `@file-viewer/vite-plugin` 自动聚合
- EPUB 预览迁移为 `@file-viewer/renderer-epub` 独立 renderer 包，继续使用 `epubjs` 提供目录、滚动阅读、章节跳转和阅读进度，并由 `@file-viewer/preset-all` 自动聚合
- 代码与 Markdown 预览迁移为 `@file-viewer/renderer-text` 独立 renderer 包，继续使用按语言动态加载的 `highlight.js` 和 `marked`，并由 `@file-viewer/preset-all` 自动聚合
- 图片预览迁移为 `@file-viewer/renderer-image` 独立 renderer 包，普通图片继续使用浏览器原生解码，HEIC / HEIF 只在命中格式时按需加载 `heic2any`，并由 `@file-viewer/preset-all` 自动聚合
- 音视频预览迁移为 `@file-viewer/renderer-media` 独立 renderer 包，MP4 / WebM / 常见音频继续使用原生控件，HLS 和 MIDI 只在命中格式时按需加载 `hls.js` / `@tonejs/midi`，并由 `@file-viewer/preset-all` 自动聚合
- 地理数据预览迁移为 `@file-viewer/renderer-geo` 独立 renderer 包，GeoJSON 直接读取，KML / GPX 按需加载 `@tmcw/togeojson`，SHP 按需加载 `shpjs`，地图叠加层和 CRS 转换按需加载 `maplibre-gl` / `proj4`，并由 `@file-viewer/preset-all` 自动聚合
- 新增 `@file-viewer/vite-plugin` 工程化入口，支持按 `formats` 自动生成 `virtual:file-viewer-renderers`、renderer chunk 分组、缺失 renderer 提示，并复制 PDF/CAD/Typst/Archive 离线 worker/WASM/vendor 资源和部署 manifest
- `@file-viewer/vite-plugin` 新增 `scan: true` 源码 hint 自动装配能力，可从 `fileViewerFormats` / `fileViewerRenderers` / `data-file-viewer-formats` / 上传 `accept` 声明提取格式并选择对应 renderer；新增 `verify:vite-plugin-auto-scan` 防止自动化装配链路回退
- 新增 `@file-viewer/preset-lite`、`@file-viewer/preset-office` 和 `@file-viewer/preset-engineering` 三个标准 preset 包；`@file-viewer/vite-plugin` 支持 `preset: 'lite' | 'office' | 'engineering' | 'all'`，会导入对应 `@file-viewer/preset-*` 包，并可继续用 `formats` 补充 preset 外 renderer，兼容 pnpm 严格依赖模型
- `verify:renderer-standalone-smoke` 从 PDF-only 升级为全独立 renderer plugin 门禁，使用本地 tarball 构造隔离业务项目，安装 core、Vite 插件、19 个 renderer plugin 以及本地依赖闭包，逐个验证 renderer 注册、handler 挂载、Vite selection 映射和 virtual module 不误引入无关 renderer 包
- 标准组件 README 与开源总仓 README 新增“工程级按需 renderer 装配”双语片段，统一说明 `@file-viewer/vite-plugin`、`virtual:file-viewer-renderers`、`builtinRenderers:'none'`、`rendererMode:'replace'`、`scan:true`、`copyAssets:true` 和 `@file-viewer/preset-all` 的推荐使用边界，并由 `verify:ecosystem-readmes` 纳入自动校验
- STEP / IGES / IFC / 3DM / BREP 等重型工程格式完成浏览器 WASM 路线调研，并新增 `@file-viewer/geometry-engine` 独立边界包维护签名识别、推荐内核和转换说明；OpenCascade、web-ifc、rhino3dm 等重 WASM 不进入 core 首屏链路
- 表格预览新增 `options.spreadsheet.resizableColumns` 开关，默认关闭以保持历史交互兼容；官方 Demo 默认开启，方便客户拖拽表头边界查看被截断的长文本
- Demo 新增 `mindmap.xmind`、`layout.gds`、`layout.oas`、`layout.oasis` 示例，并将样例选择器补充为脑图与绘图、邮件与 EDA 等更清晰分组

## `v2.0.11` Vanilla JS 原生组件增强版

- 全生态包版本同步推进到 `2.0.11`，Demo、官网、文档站、组件 README、开源总仓库和 npm 发布统一使用最新 Vanilla JS 入口
- `@file-viewer/web` 新增 `<flyfish-file-viewer>` 原生 Web Component，支持 `src/url`、`filename/name`、`type`、`size`、`theme`、`toolbar`、`toolbar-position`、`watermark`、`search`、`options` 等属性，并暴露完整 controller 实例方法
- IIFE script 标签包会自动注册 Custom Element，同时继续暴露 `window.FlyfishFileViewerWeb.mountViewer`，兼顾无构建工具页面和完全命令式接入场景
- 组件 Demo 新增 Custom Element 独立页面，并把浏览器 smoke 扩展到原生元素、IIFE 自动注册、React、Vue3、jQuery、Svelte 和手写 JS 入口
- 文档站、官网首页和 README 将纯 JS 默认推荐路径更新为 Web Component，`mountViewer` 作为高级 controller API 保留

## `v2.0.10` DOCX 自研渲染引擎稳定版

- 全生态包版本同步推进到 `2.0.10`，Demo、组件 Demo、官网、文档站和开源总仓库统一使用当前 DOCX 主链路
- `@file-viewer/core` 继续使用自研 `@file-viewer/docx@0.3.12`，默认 Worker 解析、连续流式阅读、目录字段缓存、异步分批渲染和离线 `workerUrl` / `workerJsZipUrl` 资源配置
- DOCX 默认保持流式布局，避免复杂目录、长表格、制表符、样式继承和中文正式文档在视觉分页中被拆坏；需要页式效果的业务仍可显式开启 `options.docx.visualPagination`
- 开源 README、文档站、组件 README、Demo 样例与发布产物统一以当前 DOCX 能力为准，便于客户直接升级验证

## `v2.0.9` 生态文档与定制能力完善版本

- 文档站、README 和各生态组件 README 全量补齐实际支持的 props / options / events / controller API，覆盖 Vanilla JS / Pure Web、Vue3、Vue2.7、Vue2.6、React、React Legacy、jQuery、Svelte、core 与兼容 alias 包
- 工具栏定制能力文档化，统一说明 `options.toolbar`、`toolbar.beforeOperation`、`toolbar.items`、自定义按钮、隐藏默认工具栏和外部自定义工具栏的最佳实践
- 官网首页补充多框架快速接入代码切换板块，帮助用户在 Vanilla JS / Pure Web、Vue、React、Svelte、jQuery 和 core API 之间快速定位接入方式
- 生态发布口径同步刷新到 `2.0.9`，继续保持 core 纯 TypeScript 底座、各框架组件独立实现、离线资源随包分发和生产级 demo / 文档站 / 官网一体上线

## 当前主线

### 当前主线 DOCX 自研渲染引擎接入

- DOCX / DOCM / DOTX / DOTM 渲染切换为自研 `@file-viewer/docx`，默认启用 Worker ZIP/XML 解析、真实浏览器 DOM 连续流式渲染、目录字段缓存和异步分批渲染；页式预览改为 `options.docx.visualPagination: true` 显式开启
- 新增 `options.docx.workerJsZipUrl`，与 `options.docx.workerUrl` 一起支持完全离线部署；viewer assets 会复制 `vendor/docx/docx.worker.js` 和 `vendor/docx/jszip.min.js`
- `options.docx.worker` 默认开启，仅在 CSP 或宿主环境禁用 Worker 时需要关闭；默认超时提升到 120000ms，降低大文档误回退概率
- 文档站、README、格式矩阵和纯 JS 离线接入说明同步改为 `@file-viewer/docx` 口径

### 当前主线 生态接入文档全量对齐

- 新增 [生态组件总览](/guide/ecosystem)，集中说明 `@file-viewer/core`、`@file-viewer/pptx`、Vanilla JS / Pure Web、Vue3、Vue2.7、Vue2.6、React、React Legacy、jQuery、Svelte 和历史兼容包的选型边界
- 文档站导航、快速开始、Vue2/React/Pure Web 接入、组件用法、FAQ、发布分发和开发发版说明统一改为 `@file-viewer/*` 标准包名优先
- 补齐 Svelte 组件/action、jQuery 插件、Pure Web script 标签、Core 自定义接入、离线 viewer assets 和统一 controller API 示例
- 修正 React 文档中的事件参数为标准 `onEvent`，并明确 React Legacy、Vue2.6、PPTX 引擎和离线资源复制流程

### 当前主线 全格式浏览器冒烟与静态资源稳定性修复

- 修复 3D 模型、OFD、EPUB、UMD、绘图和 CAD 等渲染器的隐藏 loading 状态在部分浏览器/CSS 组合下仍可见的问题，避免预览完成后继续显示“正在解析”
- Draw.io 默认切换为随 viewer assets 分发的官方 diagrams.net 离线 viewer，加载超时后自动切换本地 SVG 安全预览，保证 `drawio` / `dio` 样例不会因 viewer 初始化卡住而长期 loading
- PDF 预览新增 `options.pdf.thumbnails`，页面导航可切换为真实页面缩略图；缩略图使用 IntersectionObserver 按可见区域懒渲染，避免大文档一次性生成所有 canvas
- PDF 视图会在页面初始化、缩放、旋转和渲染后写回传统 `px` 页面尺寸，兼容不支持 CSS `round()` 的 360 极速、华为浏览器等 Chromium 分支
- Typst compiler / renderer WASM 和默认字体资产改为随 viewer assets 本地分发，并新增 `options.typst.fontAssetsUrl` / `options.typst.renderTimeoutMs`；默认加载 / 编译超时提升到 180 秒，浏览器端始终走真实 SVG 预览链路，不再用源码视图冒充成功，也不再为默认字体访问公共 CDN
- Cloudflare Pages 部署脚本会对超过单文件限制的 Typst compiler WASM 自动做 Brotli 预压缩并写入 `_headers`，补齐 `Content-Encoding: br`、`Vary: Accept-Encoding`、WASM MIME 和长期缓存策略；新增 `pnpm verify:cloudflare-compression` 用于上线后验证官网、文档站、Demo 和 Typst WASM 的 Cloudflare 压缩响应
- 运行时不再提供公共 CDN 或第三方在线资源 fallback；Typst 本地 WASM 或字体目录不可用时会显示明确部署错误，Draw.io 默认走官方离线 viewer 并在异常时回退内置 SVG，适合企业内网和纯离线部署
- PDF.js worker、CMap、WASM 和 standard fonts 默认随 viewer assets 分发到 `vendor/pdf/`，构建脚本会同步复制并校验，避免 PDF 预览隐式访问公网静态资源
- SQLite 预览默认使用 viewer assets 中的 `wasm/data/sql-wasm.wasm`，构建脚本同步复制并校验 sql.js WASM，减少移动端 WebView、本地服务器和 CSP 环境下的加载不确定性
- PDF 样式注入会去除 PDF.js 内置外部图片引用，避免静态产物部署时因 `images/shadow.png` / `loading-icon.gif` 缺失导致 404 或控制台噪声
- 新增全量 demo sample matrix 浏览器冒烟，逐一打开 `example/` 下 107 个样例文件；本轮已在 dev server 和静态 dist 产物中完成真实浏览器验证

### `v2.0.1` 架构重构与全生态 2.x 起始版本

- 全线 npm 包、workspace 依赖、Docker 镜像和开源 release 包从 `2.0.1` 重新起步，用大版本号明确标识 core / component 架构重构带来的兼容边界变化
- `@file-viewer/core` 继续保持纯 TypeScript、框架无关的底层能力包；Vanilla JS / Pure Web、Vue3、Vue2.7、Vue2.6、React、React Legacy、jQuery、Svelte 等标准组件包只依赖 core，各自提供原生集成体验
- 清理旧独立页面实现和历史过渡口径，对外文档统一强调原生组件与纯 Web API 是核心集成路径
- 开源总仓库产物命名切换为 `file-viewer-v2-*`，同时发布 2.x npm tarball、Demo、Component Demo、文档站静态产物和库 dist 包，避免继续暴露旧 `file-viewer-v3-*` 产物线
- 文档、README、分发说明、Docker 部署说明和生态验收清单同步刷新到 2.x 版本口径，后续新增能力都在 2.x 线上连续演进

### 当前主线 统一缩放工具栏

- `options.toolbar.zoom` 新增统一缩放按钮显示控制，默认开启；按钮是否真正展示仍由当前渲染链路的内部缩放 provider 决定，避免对虚拟表格、canvas、PDF 文本层和 CAD 交互做宿主级 CSS 强缩放
- 组件 ref 新增 `zoomIn()`、`zoomOut()`、`resetZoom()` 和 `getZoomState()`，外部自定义工具栏可以通过标准 API 控制缩放；`operation-availability-change` 同步返回 `zoom`、`zoomIn`、`zoomOut` 和 `zoomReset`，`zoom-change` 回传最终比例文本
- PDF、DOCX、PPTX、Excel 虚拟表格、图片、CAD、OFD、Typst、Markdown、代码和 Excalidraw / draw.io 绘图链路接入渲染器内部缩放逻辑；缩放操作同样进入 `options.beforeOperation` / `toolbar.beforeOperation` 前置校验

### `v1.0.26` Vue3 npm 入口类型声明修复版本

- 修复 `@flyfish-group/file-viewer3@1.0.25` 在发布前被 Demo 构建覆盖 `dist` 后，npm 包缺少 `dist/src/package/index.d.ts`，导致 TypeScript 项目出现 `TS2307: Cannot find module '@flyfish-group/file-viewer3' or its corresponding type declarations` 的问题
- Vue3 标准组件包 使用包内 `prepublishOnly` 发布前保护，根包只保留 monorepo 编排脚本，阻止 Demo HTML 产物误进入组件库 npm 包
- 非 scoped 包 `file-viewer3` 同步发布 `1.0.26`，继续作为 `@flyfish-group/file-viewer3` 的兼容 alias 使用；开源总仓库只保留一份 scoped v3 tarball，避免重复占用存储
- 支持格式矩阵补齐到 194 个扩展名、23 条预览链路，新增 RTF/ODT/ODP、MBOX、GeoJSON/KML/GPX/SHP、AVIF/ICO/HEIC/HEIF/JXL、WEBM/M3U8、MIDI、JSONC/JSON5/IPYNB/TOML/Proto/HCL/TeX/Graphviz/HTTP/Ruby/Swift/Kotlin/React 片段，以及字体、PSD、AI/EPS、SQLite、WASM、Parquet、Avro、WebArchive 等资产/数据预览入口

### `v1.0.25` 移动端压缩包与表格体验修复版本

- Vue3 包 `@flyfish-group/file-viewer3@1.0.25`、Vue2 包 `@flyfish-group/file-viewer@1.0.25`、React 包 `@flyfish-group/file-viewer-react@1.0.25` 和纯 JS 包 `@flyfish-group/file-viewer-web@1.0.25` 继续保持连续版本
- 压缩包预览迁移为 `@file-viewer/renderer-archive` 独立 renderer，并保留 Worker 探测、初始化超时、静态 Worker/WASM 路径和 ZIP/TAR/GZIP 兼容模式；手机 WebView、本地临时服务器、MIME 或 CSP 导致 `libarchive.js` Worker 卡住时，会自动降级，避免一直停留在 loading
- `options.archive` 新增 `wasmUrl` 和 `workerTimeoutMs` 说明；普通私有化部署不再需要写死 `workerUrl`，只有静态目录或 WASM 路径特殊时才需要显式指定
- 移动端 Excel / XLS 预览把工作表名称移到表格上方的横向可滚动标签栏，当前工作表自动滚入可见区域，解决手机上 sheet 名称藏在底部角落、需要技巧才能看到的问题
- Excel / XLS 多 sheet 场景下，工作表标签改为按内容宽度展示并横向滚动，避免按整体宽度平均压缩导致 sheet 名称完全看不清
- Excel / XLS 静态 Worker 改为显式 opt-in，默认使用同一套主线程解析器，避免本地服务器、手机 WebView、MIME 或 CSP 环境下停在 Worker 初始化阶段
- DOCX 默认采用真实浏览器 DOM 连续渲染；`docx.worker` 和 `docx.progressive` 保持默认开启以提升大文档响应，`docx.visualPagination` 改为显式 opt-in，避免复杂目录、长表格、制表符和样式继承被分页拆坏
- README、文档站、React / 纯 JS 接入文档、开源 release 包和 workspace 依赖同步刷新到 `1.0.25`

### 当前主线 Demo 富样式公开样例升级

- DOCX 渲染链路下沉到 `@file-viewer/core`，移除 Vue3 本地 Word vendor 入口；所有标准组件包共享同一套 DOCX 页面渲染、缩放 provider、打印和 HTML 导出适配器
- DOCX Worker 保留 `options.docx.workerUrl`、`options.docx.workerJsZipUrl` 与 `options.docx.workerTimeout` 兜底，静态资源不可用、CSP/MIME 不兼容或超时后由 DOCX 引擎自动回退
- CAD 渲染器保持在 `@flyfish-dev/cad-viewer` 0.6.4，支持 DWG / DXF / DWF / DWFx / XPS 统一预览；DWG 默认通过独立 Worker 加载 LibreDWG WASM，DWF/DWFx/XPS 使用 native renderer 渲染 W2D/W3D/XPS 图形
- 构建脚本会复制 `libredwg-web.js`、`libredwg-web.wasm`、`dwfv-render.wasm`、`dwg-worker.js` 和 worker 依赖 chunk 到 viewer assets 的 `wasm/cad/`
- Demo 补充 Apache Tika `blocks_and_tables.dwf` 与 Autodesk 官方 Viewer 教程的 `House.dwfx`、`RobotArm1.dwfx` 样例，用于分别验证 DWF、DWFx/XPS、W2D/W3D native renderer 和大图纸按需加载体验
- 入口组件在挂载重型渲染器前先释放浏览器绘制帧，确保 Loading 先显示，减少用户误以为页面无响应
- `word.docx` 保持 Basel Convention 公开中文正式文档，覆盖长正文、标题层级、表格、图示、白色纸张和完整打印回归，避免默认 Demo 使用临时生成或过度病态的样例文件
- `ppt.pptx` 与英文 `sample-presentation.pptx` 替换为 NASA Science 公开月球科学战略演示稿，覆盖星云封面、深色引用页、图文混排、正式页眉页脚和 20 页真实专业 PPTX 结构
- `archive.zip` 与 `archive.tar.gz` 内部 DOCX 同步更新为当前公开中文 Word 样例，压缩包内继续预览时也能验证真实文档效果
- 示例来源表、Demo 文档和公开样例 README 同步刷新，避免继续把 Word / PPT 误写成临时生成的 Demo 文件

### 当前主线 文档比对、搜索定位和 AI 友好结构增强

- 文档比对页同步滚动改为绑定真实预览滚动容器，并按 scroll ratio 同步左右滚动位置，PDF 内部滚动层、Word 外层滚动层和文本预览都走同一套逻辑
- 文档比对页搜索改为当前聚焦文档的浮层交互，配合成熟图标按钮提供关键词搜索、高亮命中、上一个 / 下一个；避免顶部工具区拥挤，也避免左右两侧同时滚动导致视线丢失
- 文档比对页继续提供行级定位；搜索、定位和文本切片结果会返回行号、页码和锚点上下文，便于业务侧做审计与溯源
- 新增 `options.pdf.toolbar`，可在左右比对等紧凑场景隐藏 PDF 自身页码、缩放、旋转工具栏，避免 PDF 比其他格式多一条顶部导航导致正文错位
- 新增 `options.search`、`searchDocument()`、`clearDocumentSearch()`、`nextSearchResult()`、`previousSearchResult()`、`getSearchState()` 等通用搜索 API；PDF 等特殊渲染器可注册原生搜索提供器，避免通用 DOM 高亮污染文本层或 canvas
- 新增 `collectDocumentAnchors()`、`scrollToLine()`、`scrollToAnchor()` 和 `getDocumentTextChunks()`，预览器只提供锚点、文本切片和溯源上下文，不绑定具体 AI 服务，业务侧可基于它做向量化、召回、高亮和来源定位
- 主 Demo 和文档比对 Demo 的搜索浮层统一改用成熟图标按钮，公开文档同步补充文档比对页、搜索定位、PDF 工具栏隐藏、AI 友好结构和溯源定位说明

### `v1.0.24` CAD native renderer 与构建产物同步版本

- Vue3 包 `@flyfish-group/file-viewer3@1.0.24`、Vue2 包 `@flyfish-group/file-viewer@1.0.24`、React 包 `@flyfish-group/file-viewer-react@1.0.24` 和纯 JS 包 `@flyfish-group/file-viewer-web@1.0.24` 继续保持连续版本
- CAD 渲染器升级到 `@flyfish-dev/cad-viewer@0.6.2`，DWG / DXF / DWF / DWFx / XPS 统一走成熟 CAD viewer；DWF/DWFx/XPS 使用 `dwf-viewer@0.6.4` native renderer 解析 W2D/W3D/XPS 图形
- 构建脚本新增复制 `dwfv-render.wasm`，与 `libredwg-web.js`、`libredwg-web.wasm`、`dwg-worker.js` 和 worker 依赖 chunk 一起进入 `wasm/cad/`，私有化部署可通过 `options.cad.dwfWasmUrl` 覆盖路径
- 压缩包和邮件附件的嵌套预览同步识别 `dwf`、`dwfx`、`xps`，避免主入口支持 CAD 五类格式而附件链路覆盖不足
- Demo 图纸分组补充 Apache Tika `blocks_and_tables.dwf` 以及 Autodesk 官方 Viewer 教程的 `House.dwfx`、`RobotArm1.dwfx` 样例，便于验证 DWF、DWFx/XPS、多页结构、W2D/W3D 图形、视图适配和按需加载体验
- README、文档站、React / 纯 JS README、入口缓存策略、开源 release 包和 workspace 依赖同步刷新到 `1.0.24`

### `v1.0.22` PPTX 兼容性修复与连续发布版本

- Vue3 包 `@flyfish-group/file-viewer3@1.0.22`、Vue2 包 `@flyfish-group/file-viewer@1.0.22`、React 包 `@flyfish-group/file-viewer-react@1.0.22` 和纯 JS 包 `@flyfish-group/file-viewer-web@1.0.22` 继续保持连续版本
- 修复部分客户 PPTX 无法打开的问题，兼容缺少 `docProps/app.xml` 的演示文稿，默认按现代 Office 版本降级解析
- PPTX OpenXML 关系解析改为通用路径解析，支持 relationship 单对象 / 数组 / 缺失三种形态，并按 `presentation.xml` 真实 slide 顺序渲染
- 增强 slide / layout / master / theme / diagram 关系读取容错，缺失可选部件时降级渲染当前页内容，不再因空指针导致整份 PPTX 白屏
- README、文档站、React / 纯 JS README、入口缓存策略、开源 release 包和 workspace 依赖同步刷新到 `1.0.22`

### `v1.0.21` Docker Hub 仓库与格式边界校准版本

- Vue3 包 `@flyfish-group/file-viewer3@1.0.21`、Vue2 包 `@flyfish-group/file-viewer@1.0.21`、React 包 `@flyfish-group/file-viewer-react@1.0.21` 和纯 JS 包 `@flyfish-group/file-viewer-web@1.0.21` 继续保持连续版本
- 清理 `.wps`、`.wpt`、`.et`、`.ett`、`.dps`、`.dpt` 等当前没有开箱即用浏览器渲染方案的 WPS 原生格式说明，避免用户误以为这些格式已经完整支持
- Office 模板和宏格式继续按实际可渲染链路保留，包括 `dot`、`dotx`、`dotm`、`docm`、`xlt`、`xltx`、`xltm`、`pptm`、`potx`、`potm`、`ppsx`、`ppsm`
- 新增 Docker Hub 仓库创建脚本，支持用 Docker Hub API 创建 `flyfishdev/file-viewer` 公开仓库，并在异常时输出更明确的安全诊断信息
- 文档站补全文档比对页使用说明，明确 `/compare.html`、`left` / `right` 预置参数、内置示例、URL、本地上传、同步滚动、私有化部署路径和视觉比对边界
- 开源总仓库新增 Gitee 镜像 `gitee.com/flyfish-dev/file-viewer`，GitHub / Gitee 同步交付混淆构建产物、Demo、文档静态产物、示例文件和 tarball
- Demo 输出校验继续覆盖 `compare.html`、主入口资源、viewer 资源目录和示例资源，避免上线缺少独立比对入口
- 文档站新增 Cloudflare Pages Direct Upload 脚本和 `docs/public/_headers` 缓存策略，`doc.file-viewer.app` 可切换到 `flyfish-file-viewer-docs.pages.dev` 以改善国内访问速度
- 新增 `options.theme`，支持 `light`、`dark`、`system`；显式主题优先于浏览器 `prefers-color-scheme`，固定浅色业务 UI 可以传 `light` 避免 Markdown、代码、Typst 等预览区域被系统暗色模式带偏
- 新增 `toolbar.position`，支持 `auto`、`top`、`bottom-right`；默认 `auto` 下 PDF 通用下载/打印/HTML 操作栏会悬浮到右下角，避免和 PDF 页码、缩放、目录导航栏形成双顶部导航
- 升级 Vue、Vite、PDF.js、Axios、Marked、React 适配层等第三方依赖到当时 npm latest，并同步刷新 DOCX 构建 chunk
- DOCX 渲染关闭生产调试告警，兼容 Word 写入的 `autoSpaceDN` / `autoSpaceDE` 等段落属性，避免控制台被 `DOCX: Unknown document element` warning 刷屏
- README、文档站、React / 纯 JS README、入口缓存策略和 workspace 依赖同步刷新到 `1.0.21`

### `v1.0.20` Typst 直读源文件与边缘部署优化版本

- Vue3 包 `@flyfish-group/file-viewer3@1.0.20`、Vue2 包 `@flyfish-group/file-viewer@1.0.20`、React 包 `@flyfish-group/file-viewer-react@1.0.20` 和纯 JS 包 `@flyfish-group/file-viewer-web@1.0.20` 统一推进到连续版本
- Typst 严格直读 `.typ` / `.typst` 源文件并以轻量代码视图展示，禁止依赖 sidecar 或预编译 PDF，保证用户上传源码后即可直接查看
- PDF 远端 URL 加载链路新增渐进读取策略: 同源 PDF 默认直接交给 PDF.js 通过 URL 读取，服务端支持 Range 时自动分片加载，避免先整包下载 Blob 后才开始建页；跨域 URL 默认保持旧的兼容下载链路
- 新增 `options.pdf.streaming`、`options.pdf.rangeChunkSize` 和 `options.pdf.withCredentials`，可按业务文件服务能力控制 PDF 渐进读取、Range 分片大小和凭据策略
- 下载按钮支持 URL 源文件回退，流式 PDF 没有预下载 buffer 时也可以触发原始文件下载
- 新增 Cloudflare Pages Direct Upload 部署脚本、`wrangler.toml` 和 `_headers` 缓存策略，便于将 Demo 切到 Cloudflare 边缘网络并保持 `demo.file-viewer.app` 域名不变
- 新增独立文档比对入口 `/compare.html`，支持左右并排预览、示例选择、URL、本地上传和同步滚动，不污染主预览入口
- 新增 Dockerfile、nginx 静态运行配置和 buildx 发布脚本，发布镜像覆盖 `linux/amd64` 与 `linux/arm64`，用于一键部署 Demo 与比对页
- 新增 Office 模板兼容入口，覆盖 `dot`、`dotx`、`dotm`、`docm`、`xlt`、`xltx`、`xltm`、`pptm`、`potx`、`potm`、`ppsx`、`ppsm`

### `v1.0.19` 页面尺寸感知打印与入口组件瘦身版本

- Vue3 包 `@flyfish-group/file-viewer3@1.0.19`、Vue2 包 `@flyfish-group/file-viewer@1.0.19`、React 包 `@flyfish-group/file-viewer-react@1.0.19` 和纯 JS 包 `@flyfish-group/file-viewer-web@1.0.19` 统一推进到连续版本
- PDF 打印会按真实页面 CSS 尺寸生成完整高保真页图，并通过 `@page size` 固定输出纸张大小，避免导航窗格、视口宽度或缩放状态导致页面被挤压、裁切或只打印当前页
- DOCX / DOC 打印保留白色纸张和文档页尺寸，导出窗口只包含主体页面，避免把 Demo 外壳、工具栏、滚动容器或预览缩放带入打印结果
- 新增 `printStyle` 渲染适配器能力，PDF、DOCX、DOC 等有真实页面尺寸的格式可以按文件自身尺寸输出打印样式，后续格式可复用同一机制
- 将下载、打印、导出 HTML 的实现从 `FileViewer.vue` 抽离到 `useViewerExport` 和导出模板 helper，入口组件回归预览状态、生命周期和操作可用性的单一职责
- 补充打印页尺寸与导出模板单测，并同步刷新文档站、README、Demo 示例版本、开源 release 包和 npm 版本说明到 `1.0.19`

### `v1.0.18` 公开 issue 修复与真实 PDF 示例版本

- Vue3 包 `@flyfish-group/file-viewer3@1.0.18`、Vue2 包 `@flyfish-group/file-viewer@1.0.18`、React 包 `@flyfish-group/file-viewer-react@1.0.18` 和纯 JS 包 `@flyfish-group/file-viewer-web@1.0.18` 统一推进到连续版本
- 修复 GitHub issue #13: PDF 旋转页与导航配置兼容性增强，新增 `options.pdf.navigation` 和 `options.pdf.defaultNavigationVisible`，继续保持页侧边栏 / 树形目录侧边栏切换
- 修复 GitHub issue #9 与 #8: Excel 自动文本色更可靠，支持 workbook drawing 图片渲染，并按渲染链路隐藏不可靠的打印 / 导出入口
- 修复 GitHub issue #4: `.doc` 表格布局和单元格可读性增强，老 Word 文档在白色纸张容器里更接近实际阅读效果
- 修复 GitHub issue #1: `.doc` 的 `msdoc-viewer` CFB 局部 sector 容错改为包管理器无关的 `scripts/patch-msdoc-viewer.mjs`，npm / pnpm / yarn 安装后都可在构建前自动应用
- Demo PDF 替换为项目方提供的 13 页《PDF沉浸式翻译技术说明》，用于验证长文档阅读、缩放、页导航、树形目录、完整打印和 HTML 导出
- 文档站、README、集成说明、示例来源、开源 release 包和 npm 版本说明同步刷新到 `1.0.18`

### `v1.0.17` 打印能力矩阵与完整页打印版本

- Vue3 包 `@flyfish-group/file-viewer3@1.0.17`、Vue2 包 `@flyfish-group/file-viewer@1.0.17`、React 包 `@flyfish-group/file-viewer-react@1.0.17` 和纯 JS 包 `@flyfish-group/file-viewer-web@1.0.17` 统一推进到连续版本
- PDF 导航窗格继续完善“页面 / 目录”切换，目录模式支持树形层级、展开折叠和定位跳转，便于用户在长文档中快速预览
- Word、DOC 和 PDF 预览统一增强打印 / HTML 导出，专属导出适配器会移除预览缩放、滚动容器和 Demo 全局布局样式，避免只打印一页或页面被截断
- 新增打印能力动态判断，表格、压缩包、邮件、EPUB、音视频、3D 等不适合直接打印的渲染链路会自动隐藏打印按钮，避免用户进入错误打印流程
- 优化 Demo 暗色模式和 Markdown 阅读面，Markdown / 代码跟随系统主题，PDF / Word / Excel 等原始版式内容保持独立显示；同时替换更丰富的 DOCX / PDF / Markdown 示例并同步压缩包样例
- 新增文档加载、卸载生命周期钩子，以及下载、打印、导出 HTML 的按钮前置校验钩子，历史适配层同步透出事件和操作能力变化
- 文档站、README、集成说明、分发说明和开源 release 包说明同步刷新到 `1.0.17`

### `v1.0.15` 预览交互、打印与集成钩子增强版本

- PDF 导航窗格新增“页面 / 目录”切换，目录模式会读取 PDF 大纲并以可展开树形结构跳转，页面模式继续保留页侧边栏
- 增强 Word 和通用文档打印导出，`.docx` / `.doc` 会使用专属导出适配器清理预览缩放、绝对定位和滚动容器，避免只打印一页或页面被截断
- 新增 `options.hooks` 生命周期钩子，覆盖文档开始加载、加载完成、开始卸载和卸载完成，并提供文件类型、文件名、来源、URL、大小、版本和耗时上下文
- 新增 `options.beforeOperation` 与 toolbar 级前置操作钩子，下载、打印、导出 HTML 前都可以返回 `false` 取消，便于接入权限校验、审计确认和业务二次弹窗
- React / 纯 JS 适配层新增 viewer 事件监听入口，基线预览器会向宿主同步生命周期和操作事件
- 文档、README 和四条 npm 包线版本说明同步刷新到 `1.0.15`

### `v1.0.14` 最新发布与文档站同步版本

- Vue3 包 `@flyfish-group/file-viewer3@1.0.14`、Vue2 包 `@flyfish-group/file-viewer@1.0.14`、React 包 `@flyfish-group/file-viewer-react@1.0.14` 和纯 JS 包 `@flyfish-group/file-viewer-web@1.0.14` 统一抬升到最新版本
- 文档站首页、快速开始、分发说明、支持格式页和 README 中的安装示例同步刷新到 `1.0.14`
- 开源总仓库、Demo 静态产物和文档站静态产物重新构建，方便直接下载和验收
- 继续保持 Vue3 / Vue2 / React / 纯 JS 的集成路径、按需异步加载、示例分组和 PDF / OFD / 压缩包 / 邮件 / CAD / 绘图 / 电子书预览链路一致

### `v1.0.12` 完整格式、分发仓库与 npm 同步版本

- Vue3 包 `@flyfish-group/file-viewer3@1.0.12`、Vue2 包 `@flyfish-group/file-viewer@1.0.12`、React 包 `@flyfish-group/file-viewer-react@1.0.12` 和纯 JS 包 `@flyfish-group/file-viewer-web@1.0.12` 统一对齐到 npm `latest`
- 新增压缩包预览，基于 `libarchive.js` Worker 支持 ZIP、7z、RAR、TAR、GZIP、BZIP2、XZ、CAB、ISO、JAR、APK、CBZ/CBR 等入口，内部文件按需解压、IndexedDB 缓存并继续调用统一预览器
- 新增 EML / MSG 邮件预览，支持头信息、HTML/文本正文、附件下载和附件继续在线预览
- 增强 OLB / DRA 结构预览，基于 `cfb` 解析常见 EDA 复合文档容器，并提供结构树、元件/封装/Padstack 候选、属性、诊断、二进制退化和可读字符串索引
- 预览器新增 `options.watermark`、`options.toolbar` 和 `options.archive`，支持文字/图片水印、下载原文件、完整打印、导出渲染后 HTML、压缩包 worker 和体积限制配置
- 修复 PDF 打印和导出 HTML 的完整性，PDF 会通过专属导出适配器逐页生成全部页面，不再依赖当前滚动视口、当前页或已渲染 canvas，避免只打印当前页或内容被截断
- DWG 入口从单纯提示转换为尽力展示: 误命名 DXF 会直接按 DXF 解析，真实 DWG 会尝试提取内嵌 PNG/JPEG/BMP 预览图，并说明无法完整解析几何的原因
- 新增 Three.js 3D 模型预览器，支持 `glb`、`gltf`、`obj`、`stl`、`ply`、`fbx`、`dae`、`3ds`、`3mf`、`amf`、`usd`、`usda`、`usdc`、`usdz`、`kmz`、`pcd`、`wrl`、`vrml`、`xyz`、`vtk`、`vtp`；`step`、`stp`、`iges`、`igs`、`ifc`、`3dm` 会给出转换原因和建议
- Demo 新增 GLTF / OBJ / STL / PLY / STEP 3D 样例，以及 ZIP、TAR.GZ、EML、MSG、OLB、DRA 样例，支持格式矩阵更新到 135 个扩展名、19 条预览链路
- 文档站全局导航、首页、格式矩阵、分发说明、快速开始和 npm README 均刷新到 `1.0.12`
- 开源总仓库已升级为一站式主入口，保留可运行源码、Demo 静态站、文档静态站、样例文件和 release tarball
- React / 纯 JS 文档继续推荐 `npm install` 零步骤安装，并补充 pnpm 10 拦截 `postinstall` 时的 `pnpm approve-builds` / `pnpm exec file-viewer-copy-assets` 处理方式

### `v1.0.9` 媒体、绘图与电子书预览增强版本

- Vue3 包 `@flyfish-group/file-viewer3@1.0.9` 和 Vue2 包 `@flyfish-group/file-viewer@1.0.9` 同步发布到 npm `latest`
- 新增 React 包 `@flyfish-group/file-viewer-react@1.0.9` 和纯 JS 包 `@flyfish-group/file-viewer-web@1.0.9`，复用 Vue3 基线资源
- 新增原生 组件 Demo，覆盖 React 组件和纯 JS helper 两种入口，构建后可直接作为私有化静态站点部署
- 增强 PPTX 渲染，补齐组合图形坐标映射、旋转/翻转、主题背景、图片裁剪和 EMF 转 SVG 预览
- 新增 `.epub` 预览，使用 `epubjs` 按需解析 EPUB 包、目录和滚动阅读，并避开部分浏览器超宽分页白板问题
- 新增 `.umd` 电子书预览，按 UMD 文件结构解析元数据、章节目录和 zlib 压缩正文
- 新增 `.mp3`、`.mpeg`、`.wav`、`.ogg`、`.oga`、`.opus`、`.m4a`、`.aac`、`.flac`、`.weba` 音频入口，使用浏览器原生播放器
- 新增 `.excalidraw` 预览，默认使用 rough.js 按需生成只读 SVG，运行环境提供官方 Excalidraw ESM 模块时可优先尝试 `exportToSvg`
- 新增 `.drawio` / `.dio` 预览，默认使用随 viewer assets 分发的官方 diagrams.net `GraphViewer` 离线处理 mxGraphModel / mxfile；也可通过 `options.drawing.viewerScriptUrl` 覆盖自托管脚本，异常时回退内置 SVG
- 补充 Demo 示例文件、格式矩阵、FAQ 和接入说明

### `v1.0.8` 文档视觉与预览稳定性版本

- Vue3 包 `@flyfish-group/file-viewer3@1.0.8` 和 Vue2 包 `@flyfish-group/file-viewer@1.0.8` 同步发布到 npm `latest`
- 修复 PDF worker 生命周期，快速切换 PDF / OFD / PDF 时不再触发 worker 销毁告警
- 稳定 OFD 渲染状态，避免反复闪动“正在解析 OFD”
- 刷新文档站截图、主题配色和集成示例页视觉

### `v1.0.7` PDF 自适应修复版本

- Vue3 包 `@flyfish-group/file-viewer3@1.0.7` 和 Vue2 包 `@flyfish-group/file-viewer@1.0.7` 同步发布到 npm `latest`
- 修复 PDF.js 5 下 canvas 布局尺寸被 DPR backing store 干扰的问题，避免 PDF 页面被裁切或显示不完整
- 修复 PDF 默认宽度适配计算，导航窗格开启时也能按当前视口宽度给出可读缩放比例
- 同步刷新线上 Demo、文档说明和开源总仓库产物

### `v1.0.6` 开源分发版本

- Vue3 包 `@flyfish-group/file-viewer3@1.0.6` 和 Vue2 包 `@flyfish-group/file-viewer@1.0.6` 均已发布到 npm `latest`
- 新增 PDF 缩放工具栏、页码状态和可显隐页面导航窗格
- 补齐 OFD、CAD、代码高亮与完整示例文件盒子
- 示例文件选择器支持分组折叠，默认展开第一个分组，并保持同一时间只展开一个分组
- 增加 `pnpm obfuscate` 与 `pnpm release:ecosystem:pack`，库产物支持压缩混淆后分发
- README、文档站和开源总仓库说明同步补充 npm、GitHub、私有聚合仓、优先支持、授权与贡献说明
- npm tarball 只包含 `README.md`、`LICENSE` 和混淆压缩后的 `dist/`

### 文档站与交付说明完善

- 重写 README 与旧版文档结构
- 增加 Demo 说明、本地开发与打包说明
- 补充截图、接入建议与发布前检查清单

### `.doc` 渲染能力升级

- 使用 `msdoc-viewer` 替换旧的 `.doc` 解析方案
- 将 `.doc` 内容渲染在 Word 风格页面容器中
- 增加灰色工作台、白色纸张与页面居中展示效果

### 示例与工程体验

- 提供更清晰的本地 Demo 入口说明
- 支持将预览器独立部署并通过静态入口集成
- 本地构建、文档站构建与 npm 打包链路持续收敛

## 历史版本

### `v1.0.3`

- 修复与优化 PDF 字体、缩放和 Excel 样式相关问题

### 更早版本

- 优化 PPTX 加载性能
- 补强 Word 与 Excel 的基础预览能力
- 持续完善 TypeScript 与 Vue 3 版本实现

<div class="doc-note">
  npm 包版本请以 `package.json` 和实际发布记录为准；本页更偏向说明“这个仓库当前已经演进到了哪里”。
</div>
