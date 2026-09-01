# Changelog

完整对外更新日志见 [docs/changelog.md](docs/changelog.md)。

## Unreleased

### CLI reliability and interaction

- 新建项目的交互式格式选择改为预先列出 renderer/格式族并显示勾选状态；当前 profile 已包含的能力保持启用，额外能力支持编号、范围、全选和清空，不再要求手写扩展名。
- Vite 8 脚手架声明并在 `dev`/`build` 前校验 Node `^20.19.0 || >=22.12.0`，旧运行时会获得明确迁移提示；Web Component 事件从元素所属 document realm 创建，并为缺失全局 `CustomEvent` 的 DOM 环境保留兼容回退。

## File Viewer v3.0.0 — 2026-08-27

这是模块化安装、全功能 CLI、专业格式按需加载和全仓安全加固的主版本。已发布 Full 包的格式、API 和离线资源契约保持向下兼容；DICOM 和数字签名等后续重型能力仍为显式按需安装。

### CLI and package model

- 新增完整的 `@file-viewer/cli` / `file-viewer-cli` / `create-file-viewer`：可创建新项目，也可在已有 `package.json` 项目中检测框架和构建工具后安装；支持选择框架版本、格式、preset、资源、npm/pnpm/Yarn/Bun、私有 registry 与完整性校验的离线 tgz。
- `standard` 是新项目的常用格式默认方案。八个历史 `*-full` 包继续交付已发布的 `preset-all` 兼容矩阵和同版本 Worker/WASM/字体/vendor 资源；CLI 显式选择 `full` 时才会在此基础上加入后续专业能力并展示体积与许可边界。
- 原 `file-viewer-copy-assets` 命令、八个 Full 包的同版本委托、`web-full/dist` 零复制部署、Vite 自动资源发布和自定义资源前缀全部保留。

### Formats and issue fixes

- 新增可选的可读文本预览（#235）：`text.wrapLongLines` 在普通与虚拟文本路径按逻辑行换行，`text.prettyPrint` 按格式动态加载 Prettier parser 并提供原始源码切换，`prettyPrintMaxBytes` 仅约束格式化且默认继承大文本阈值；任何超限、异常或不支持输入均无错误回退，下载仍使用原始字节。
- #200 的原始 PPTX 样例已纳入五页布局回归，覆盖 DrawingML 表格边界与内边距、SmartArt 水平文字、复杂形状和 PPTX Worker，并通过 Chromium、Firefox 与 WebKit。
- #206 提供显式按需的数字签名与证据容器 renderer，使用许可宽松的 rPGP Worker/WASM，并将解析、摘要/签名检查、信任和法律效力分开呈现；不包含 LGPL 源码。
- #210 提供显式按需的本地 DICOM Part 10 单文件预览，覆盖未压缩、JPEG Lossless、JPEG-LS 和 JPEG 2000 Lossless 的单帧/多帧边界；不宣称诊断、PACS/DICOMweb 或多文件序列能力。
- #211 还原报告样例的 Excel 表格主题、表头和交替行样式，列宽拖拽会在切换 sheet 后保留；#203 的异常合并信息和 Office 列宽回归同步加固。
- #212 在 React、React Full、React Legacy 和 React Legacy Full 中支持邮件附件嵌套预览，并验证恶意附件名、缓冲区替换、卸载和 Worker/Object URL 清理。
- #178 的 Office 365/WPS 单元格内嵌图、浮动图、TIFF、Worker 传输、双击放大和可选列宽拖拽继续作为闭合回归。

### Security and release

- DOC/RTF/PPTX/Markdown/Mermaid/Drawing/PlantUML/Typst 的文档内容到 HTML/DOM 边界统一编码、协议限制与二次净化；外链默认阻断，CSP/Trusted Types 在三浏览器验证。
- 源码矩阵为 84 个 npm 目标：83 个主线包使用 `3.0.0`，历史兼容包 `msdoc-viewer` 使用 `0.2.4`；外部自研引擎固定为 `@file-viewer/docx@0.3.28` 与 `styled-exceljs@0.21.4`。
- 正式发布只提升同一冻结提交生成并完成构建、测试、安全门禁、冷安装、真实浏览器和 `npm publish --dry-run` 的原始 tarball；发布阶段不重建、不临时增加稳定版本号。

### Upgrade

```bash
npm create file-viewer@3.0.0 my-viewer
pnpm add @file-viewer/vue3-full@3.0.0
```

## File Viewer v2.4.0 — 2026-08-25

这是统一版本、安全加固与稳定发布流程版本。v2.3.0—v2.3.2 的 Office、TIFF、Vite 8 与 DOC 安全修复全部包含在本版中。

### Security and reliability

- Spreadsheet 与 iWork 渲染链升级到 `styled-exceljs@0.21.3`：工作表名称映射使用无原型字典，XML 标签扫描和富文本/公式处理保持有界，并继续对文档生成的 HTML、CSS、链接、图片与属性执行安全序列化。
- #178 的 Office 365/WPS 单元格内嵌图、浮动图、TIFF drawing、Worker 传输、双击放大和可选列宽拖拽纳入同一回归边界；本次版本统一没有移除 Excel 列宽调整能力。
- 继续包含旧版 DOC、PPTX Worker、Markdown、压缩包文件名和离线 Worker/WASM 交付的既有安全门禁。

### Release

- 根版本、GitHub Release 与 56 个常规 npm 包统一为 `2.4.0`；历史兼容包 `msdoc-viewer` 使用独立的 `0.2.3` 版本。
- 稳定发布改为先完整构建、打包、冷安装和 `npm publish --dry-run`，再记录每个 tarball 的大小与 SHA-512。正式发布只接受同一提交生成的冻结产物，不再在发布命令中重建或因预演失败增加稳定版本号。

### Upgrade

```bash
pnpm add @file-viewer/vue3-full@2.4.0
pnpm add -D @file-viewer/vite-plugin@2.4.0
```

## File Viewer v2.3.2 — 2026-08-24

这是 TIFF 多页预览与 Vite 8 Rolldown 分块兼容补丁，继续包含 v2.3.1 的全部安全修复。

### Fixes

- `@file-viewer/renderer-image@2.3.1` 在 TIFF 路径按需加载 MIT 许可的 UTIF.js，支持 CCITT Group 4、多页纵向展示、整组缩放/旋转/适宽、页码状态，以及双击和键盘大图查看（#208）。编码大小、页数、单页尺寸和累计解码像素均有硬限制，逐页转换后释放 RGBA 与 Object URL；PNG/JPEG/WEBP 等普通图片路径不加载 TIFF 解码器。
- `@file-viewer/vite-plugin@2.3.3` 按项目实际 Vite 主版本选择配置：Vite 5—7 继续使用 Rollup `manualChunks`，Vite 8 使用 Rolldown `codeSplitting.groups`；用户已有分组、输出数组、优先级和 `codeSplitting:false` 均保持不变（#209）。
- #178 的 Office 365/WPS 单元格内嵌图、浮动图片、TIFF drawing、Worker/主线程传输和双击放大再次通过原始样例回归，Excel 列宽拖拽能力保持启用。
- 本版 npm 目标为 `@file-viewer/preset-lite@2.3.1`，以及 `@file-viewer/preset-all`、`file-viewer-copy-assets` 和八个 Full 包统一的 2.3.6 补丁线。

### Upgrade

```bash
pnpm add @file-viewer/vue3-full@2.3.6
pnpm add -D @file-viewer/vite-plugin@2.3.3
```

## File Viewer v2.3.1 — 2026-08-24

这是旧版 DOC 渲染链的安全补丁版本，格式矩阵和公开 API 保持不变。

### Security

- `@file-viewer/doc` 生成的字体、链接、图片与附件标记在直接 HTML API 边界完成编码和协议限制；外部链接默认阻断，内部书签继续可用，显式允许时也只接受 HTTP(S)、邮件、电话与安全相对地址。
- 标准挂载路径在文档 HTML 进入 DOM 前使用 DOMPurify 3.4.13 做纵深净化，样式内容通过 `textContent` 注入；DOMPurify 仅进入 DOC 懒加载路径，压缩增量为 10,923 字节并受 15 KiB 硬门禁约束。
- Chromium 安全回归覆盖直接 HTML 与标准挂载 API，验证混淆危险协议、恶意字体/属性、图片和附件均不会执行事件；正常书签、链接、图片、表格与分页保持可用。
- 修复包为 `@file-viewer/doc@2.3.1`、`msdoc-viewer@0.2.2`、`@file-viewer/renderer-word@2.3.2`，以及 Office/Full/copy-assets 的 2.3.4 补丁线。

### Upgrade

```bash
pnpm add @file-viewer/vue3-full@2.3.4
```

## File Viewer v2.3.0 — 2026-08-20

这是 Office/iWork 格式扩展和真实问题文件集中修复版本。稳定能力矩阵扩展为 57 个 npm 目标、221 个扩展名和 32 条预览链路。

### Highlights

- 完整发布 Keynote、二进制 PPT 模块加载、GBK 文本、CAD Worker、德语界面、复杂 DOCX、Excel 图表/列宽/列宽拖动等修复（#174/#179/#195/#198/#201/#202/#203/#204）。
- Excel Office 365/WPS 单元格内嵌图片、浮动绘图和双击放大（#178）在本版完成全部发行渠道交付；用户后续样例中的 TIFF drawing 也会按需在浏览器内解码，主线程、Worker 与双击大图路径保持一致。
- PPTX 按需构建不再打入仅供二进制 PPT 使用的 CJK 字体和原生 WASM；Vite 5–8 会按 `package.json#exports` 正确解析 `renderer-presentation/pptx` 子路径（#205）。
- 源码与 GitHub Release 使用 v2.3.0；npm 不可覆盖的更正包按实际版本发布为 `@file-viewer/renderer-spreadsheet@2.3.2`、`@file-viewer/renderer-iwork@2.3.1`、`@file-viewer/renderer-word@2.3.1`、`@file-viewer/renderer-presentation@2.3.1`、`@file-viewer/vite-plugin@2.3.2`，以及 Office/Full/copy-assets 的 2.3.3 补丁线。TIFF MIME 修复来自 `styled-exceljs@0.21.2`。

## File Viewer v2.2.9 — 2026-08-17

这是 PPTX 与 Markdown 渲染路径的安全补丁版本。能力矩阵保持 54 个 npm 目标、208 个扩展名和 25 条预览链路。

npm 包于 2026-08-13 发布；GitHub Release 于 2026-08-17 完成最终归档。

### Security

- `@file-viewer/pptx` 在 Worker 输出进入 DOM 前统一净化 HTML/SVG、内联样式、生成 CSS、链接与资源 URL；恶意演示文稿不能再借 tooltip、形状属性、颜色或字体字段注入脚本、全局 CSS 或外部资源请求。
- `@file-viewer/renderer-text` 不再把 Marked 输出直接写入 `innerHTML`，而是在插入前使用 DOMPurify 过滤不受信任的 Markdown HTML，并为新窗口链接补充 `noopener noreferrer`。
- DOMPurify 升级至 3.4.13，Mermaid 升级至 11.16.1；构建链固定到已修复的 PostCSS 8.5.23 与 NanoID 3.3.17。
- 新增真实 PPTX Worker 与 Chromium 安全门禁，覆盖普通/虚拟化渲染、SVG 根节点和子节点 URL 属性、Markdown 原始 HTML，并断言没有脚本执行、越界样式或外部请求。

### Upgrade

```bash
pnpm add @file-viewer/vue3-full@2.2.9
pnpm add -D @file-viewer/vite-plugin@2.2.9
```

## File Viewer v2.2.8 — 2026-08-11

这是大表格性能、OFD 首屏稳定性和二进制 PPT 观感修复版本，同时完成 2.2.7 未结束的公开分发链路。能力矩阵保持 54 个 npm 目标、208 个扩展名和 25 条预览链路。

### Highlights

- Spreadsheet 的自动列宽推断改为有界取样，不再对大工作表重复全量扫描；76 MB / 259,702 行样例（#173）和 38,732,752 字节 / 100,545 行原始问题样例（#193）均完成真实浏览器回归，后者冷首屏为 4.194 秒。
- OFD 首次渲染不再重放页面 transform 动画，消除内容出现后的瞬时闪动，同时保留后续缩放过渡和 `prefers-reduced-motion` 边界（#194）。
- 二进制 `.ppt` 运行时升级至 `@file-viewer/ppt@0.3.3`：开源版强制水印收紧到右下角，覆盖像素减少约 93%；1x/2x/3x 高分屏使用整数设备像素缩放，避免半像素取整导致的模糊。
- PDF 缩放锚点（#191）和 HTML-in-WordDocument 旧版 DOC 容错（#192）继续纳入本次完整公开分发与生产回归。
- 官网预览卡片的指针归属、悬停切换和移动交互完成稳定性加固；发布脚本对 registry 超时、查询失败和中断后续传保持 fail-closed。

### Upgrade

```bash
pnpm add @file-viewer/vue3-full@2.2.8
pnpm add -D @file-viewer/vite-plugin@2.2.8
```

## File Viewer v2.2.7 — 2026-08-11

这是 PDF 缩放定位、旧版 Word 容错和官网交互的补丁版本。能力矩阵保持 54 个 npm 目标、208 个扩展名和 25 条预览链路。

### Highlights

- PDF 工具栏缩放会保留当前页及页内可视比例；单次点击、连续放大和反向缩小都不会再把活动页跳到页首或相邻页（#191）。
- 旧版 `.doc` 若实际是 CFB 容器内嵌 HTML，不再误当二进制 FIB 读取并报 `Missing table stream`；解析器会在 `WordDocument` 边界识别编码、过滤不安全内容并转换为正常文档 AST（#192）。
- `flyfish-dev/docjs` 同步了当前 legacy DOC 引擎、历史表格/OfficeArt/文本框修复和样例回归，并在所属仓库完成独立构建验证。
- 官网新增可交互的 CSS 预览卡片、主题切换和更紧凑的预览层级，桌面与移动布局保持一致。
- 发布回归覆盖 PDF 缩放/旋转/导航浏览器 harness、真实问题 DOC 样例、legacy DOC 表格/图片/文本框矩阵，以及全量构建、离线资产和标准组件入口。

### Upgrade

```bash
pnpm add @file-viewer/vue3-full@2.2.7
pnpm add -D @file-viewer/vite-plugin@2.2.7
```

## File Viewer v2.2.6 — 2026-08-10

这是大文件、分页导航和 Office 交互稳定性补丁，同时完成官网与公开检索入口升级。能力矩阵保持 54 个 npm 目标、208 个扩展名和 25 条预览链路。

### Highlights

- Spreadsheet 不再信任异常的整表维度，也不会为了发现图表而把大型 worksheet XML 重复解压成字符串；窄容器首次打开时会按真实可视宽度适配（#172/#173/#175）。
- OFD 新增上一页、下一页、页码计数、滚动同步与键盘导航；打印时工具栏自动隐藏（#177）。
- Word renderer 阻止 DOCX 内外部超链接触发页面跳转，同时保留文本可读性；旧版 DOC 文本框 story 内容也会从底层结构恢复（#171/#183）。
- PDF 在目录跳转、翻页和旋转后保持当前页与可视锚点，避免页码和文档突然向上跳动（#184）。
- PPTX connector 的起终点、翻转和零尺寸 viewport 在 `@file-viewer/pptx` 引擎边界修复，File Viewer 只同步正式引擎产物（#176）。
- 官网重构为更紧凑的产品入口，补齐中英文商业版、canonical、IndexNow 与机器可读引用元数据；运行时离线扫描继续排除 crawler metadata URL。
- 真实 post-merge main 已完成冷安装、全 workspace 类型检查、根测试、全量构建、28 格式矩阵、离线资产、关键 Demo 和全部标准组件浏览器回归。

### Upgrade

```bash
pnpm add @file-viewer/vue3-full@2.2.6
pnpm add -D @file-viewer/vite-plugin@2.2.6
```

## File Viewer v2.2.5 — 2026-08-01

这是文档审阅、打印和复杂 Office 图形渲染补丁。能力矩阵保持 54 个 npm 目标、208 个扩展名和 25 条预览链路。

### Highlights

- 独立文档比对页新增基于 `jsdiff` 的真实文字 diff：逐行对齐、字符级增删标记、差异统计和上下导航；DOCX / 文本为稳定路径，PDF 文本层不完整时主动中止，扫描件明确提示 OCR 边界（#145）。
- 打印蒙版新增本地印章图片上传、跨页定位、拖动、缩放、删除和打印 HTML 导出，原有蒙版工作流保持兼容（#157）。
- 新增文件加载前检查与 PDF 可视区域聚焦定位；PDF 区域边界、同步滚动、图片旋转和 Lightbox 交互完成回归（#151/#154）。
- Geo renderer 新增天地图矢量、影像和地形底图预设，并保持离线和显式配置边界（#153）。
- 修复 DOCX 页面背景与覆盖层、PPTX 图表残留、组合梯形几何和层级渲染，以及首页静态 HTML 返回给模块脚本导致的 MIME 错误。
- Vue 2.6 / webpack 4 客户样例、Docker 上下文、组件构建和公开仓发布链路完成稳定性加固。

### Upgrade

```bash
pnpm add @file-viewer/vue3-full@2.2.5
pnpm add -D @file-viewer/vite-plugin@2.2.5
```

## File Viewer v2.2.4 — 2026-07-28

这是 DOCX/CAD 运行时升级和沉浸式预览稳定性补丁。能力矩阵保持 54 个 npm 目标、208 个扩展名和 25 条预览链路。

### Fixes

- `@file-viewer/docx` 升级至 `0.3.26`：修复日文模板的东亚字体回退、行高和 VML 文本框重叠（#155），兼容 Apache POI 输出的 `w:hMerge` 横向合并单元格（#160），并修复多分节中文简历的浮动形状、定位尺寸与页内内容流错位（#161）。
- 主线程和离线 DOCX Worker 使用同一版本，并同步更新 Full 包资源查询参数，避免浏览器继续命中旧 Worker 缓存。
- `@flyfish-dev/cad-viewer` 升级至 `0.8.0`，补齐 BOM 与表格安全的 CSV/JSON 导出，复杂线型 STYLE 引用为空时不再中断合法 DWG/DXF。
- 修复 OFD 渐进渲染切换到最终 ready 状态时内容被再次隐藏造成的二次闪烁（#163）。
- 修复重复打开 STEP 后 Canvas backing buffer 偶发退回 CSS 1× 分辨率的问题；渲染循环会按当前设备像素比持续校正（#164）。
- Demo 首屏按收起后的文件胶囊预留文档起始位置，滚动后文档仍可进入胶囊后方，保持全屏沉浸滚动与透明滚动条。
- 日语界面、Archive 内 Shapefile sidecar 组合预览以及对应构建、浏览器回归一并进入本次发布。

### Upgrade

```bash
pnpm add @file-viewer/vue3-full@2.2.4
pnpm add -D @file-viewer/vite-plugin@2.2.4
```

## File Viewer v2.2.3 — 2026-07-21

这是组件工具栏隔离与演示文稿运行时兼容补丁。能力矩阵保持 54 个 npm 目标、208 个扩展名和 25 条预览链路。

### Fixes

- 标准 Web、Vue 3、Vue 2.7、Vue 2.6、React、React Legacy、Svelte 与 jQuery 组件统一使用 Core 浏览器控制器；默认 Shadow DOM 会隔离宿主全局样式，显式 `styleIsolation: 'none'` 仍可切换为 Light DOM。
- 修复同一宿主从 Shadow DOM 重挂为 Light DOM 时内容仍留在 ShadowRoot，以及挂载到业务自有 ShadowRoot 时误清空已有节点的问题；销毁时只移除 File Viewer 自己创建的边界。
- Vue 3 在真实 ShadowRoot 内注入组件与 renderer 样式；Vue 2.6 补齐 `onEvent`、`onStateChange` 和视图状态 API，工具栏、事件与命令在旧构建链中保持一致。
- Angular 22 + Vite 优化缓存下的 PPTX Worker 会正确解析 `baseHref` 和 `.angular/cache` 路径，不再请求错误的站点根路径。
- 二进制 PPT 升级到 `@file-viewer/ppt@0.3.2`。其 Worker 变为自包含模块，普通 Vite 项目无需复制 `vendor/ppt` 也能从 npm ESM 包启动 Worker；Full、copy-assets 与 IIFE 路径继续完整自托管。
- PDF、Spreadsheet、PPTX、Markdown 和打印蒙版在 Shadow DOM、移动端与统一缩放路径下补齐样式和布局回归。

### Upgrade

```bash
pnpm add @file-viewer/vue3-full@2.2.3
pnpm add -D @file-viewer/vite-plugin@2.2.3
```

## File Viewer v2.2.2 — 2026-07-17

这是 2.2.1 的依赖与自托管安全补丁。能力矩阵保持 54 个 npm 目标、208 个扩展名和 25 条预览链路。

### Fixes

- `@file-viewer/renderer-epub` 与 `@file-viewer/thumbnail` 不再向 npm 用户安装 `epubjs → @xmldom/xmldom 0.7.x`。EPUB 引擎改为包内懒加载模块，构建固定使用 `@xmldom/xmldom 0.9.10`，同时生成版本、哈希与完整第三方许可证清单。
- 新增可重复的 `npm pack → 全新安装 → npm audit` 门禁：发布包必须包含本地 EPUB 模块、manifest 和 NOTICE，生产依赖树不得再出现 `epubjs` 或 `@xmldom/xmldom`。
- 修复 Nginx 的 `add_header` 继承边界：所有自定义缓存策略的 HTML、`.mjs`、静态资源、样例和 vendor 路由现在都会显式返回 `X-Content-Type-Options: nosniff` 与 `Referrer-Policy`；`.mjs` 继续使用正确的 `application/javascript` MIME。
- 完整保留 2.2.1 的上传 PDF 下载、复杂 DOCX 锚点布局、OFD 图片定位、PPT/PPTX 与全格式浏览器回归结果。

### Upgrade

```bash
pnpm add @file-viewer/vue3-full@2.2.2
pnpm add -D @file-viewer/vite-plugin@2.2.2
```

## File Viewer v2.2.1 — 2026-07-17

这是 2.2.0 的发布后补丁，集中修复上传 PDF 的下载数据源、复杂 DOCX 锚定绘图布局和自托管 Docker 运行时。能力矩阵仍为 54 个 npm 目标、208 个扩展名和 25 条预览链路。

### Fixes

- 修复上传 PDF 渲染后下载为 0 字节（#139）：PDF.js 将 `ArrayBuffer` 转移给 Worker 后，下载会自动回退到仍然完整的原始 `File`；流式 URL 与合法空文件仍保持各自原有语义。
- `@file-viewer/docx` 升级至 `0.3.21`，修复 WPS/WPG/图片锚点被重复偏移、嵌套组变换组合错误，以及同一段落中页面锚点与段落锚点混排造成的巨大空白（#133）；缺失页眉/页脚 root 的可选结构也在引擎层安全跳过（#130）。
- 自托管 Nginx 为 `.mjs` 显式返回 `application/javascript`，避免 `nosniff` 阻止 PDF.js Worker、PPT 和其他 ESM 运行时加载。
- CAD 运行时资源替换支持跨文件系统 `EXDEV`，复制、校验、交换与失败回滚均保留完整副本；Docker 构建上下文和 pnpm 缓存层同步收紧。
- 真实浏览器回归覆盖 PDF 上传/渲染/下载、OFD→PDF 同会话切换、二进制 PPT、PPTX、复杂锚定 DOCX，以及 Docker 中的模块 MIME 和离线资源完整性；#133 附件不再产生页面溢出，关键区块相对参考 PDF 的横向误差小于 0.4 pt、纵向误差约 2–3 pt。

### Upgrade

```bash
pnpm add @file-viewer/vue3-full@2.2.1
pnpm add -D @file-viewer/vite-plugin@2.2.1
```

## File Viewer v2.2.0 — 2026-07-17

这次升级把主 Demo、运行时资源路径和近期真实用户反馈一起收口。主 Demo 采用新的产品化工作台布局，桌面端把文件来源、文档操作和预览画布重新分层，移动端收进轻量悬浮操作；暗色模式、样例分组、搜索、缩放、上传和链接预览都保留完整交互。

### 适合升级的人

- 使用 Web Component / Shadow DOM 预览 PDF、PPTX 的项目。
- 部署在 Angular、Vue CLI、Webpack、Vite 子路径，或目录名包含空格、中文、`assets`、`static`、`js` 的项目。
- 需要预览 UTF-8、GBK、GB18030 CSV/TSV，或为代码/文本开启行号的项目。
- 使用 DWG、DXF、DWF、DWFx，并希望完整离线交付 CAD Worker/WASM 的项目。

### Highlights

- 主 Demo 全面重构为清爽的产品工作台；桌面、平板、移动端和暗色模式完成同视口视觉对照与交互回归。
- 通过显式 `?url=` 打开文件时首帧即进入沉浸模式：隐藏 Demo 品牌、样例、历史与外层状态，只保留预览器工具栏；桌面与移动端都保持文档容器独立滚动且无外层页面溢出。
- `@flyfish-dev/cad-viewer` 升级至 `0.7.0`；`dwg-worker.js`、`dwfv-render.wasm`、`libredwg-web.js`、`libredwg-web.wasm` 四个运行时文件全部纳入必需 manifest、原子复制、校验和回滚。
- STEP/STP、IGES/IGS 和 BREP 接入本地 OCCT Worker/WASM，直接生成 Three.js 网格，不再停留在转换提示；统一缩放、适配、暗色场景、装配层级和面颜色均纳入真实浏览器回归。
- 新增统一运行时资源基址 API。Full/非 Full、Vite/非 Vite、Angular 深层路由、相对 base、Windows 分隔符、空格和中文路径使用同一解析规则，不再依赖站点根目录。
- 修复 CSV 中文乱码（#124）：自动识别 UTF-8 BOM、严格 UTF-8，并回退 GB18030/GBK；新增 `spreadsheet.textEncoding` 显式覆盖和 TSV 支持。
- 新增 `text.lineNumbers`（#125）。普通文本默认关闭，大文件虚拟预览保持兼容；行号不会进入复制、搜索或无障碍文本。
- 修复大于 512 KiB 的 Markdown 被通用文本阈值切成源码视图（#136）。Markdown 默认继续渲染排版阅读面；只有显式设置 `text.markdownVirtualizeAboveBytes` 才会在超限后启用有界源码视图。
- 新增 `text.toolbar`（#137）。默认保留代码、文本和超大 Markdown 源码视图的类型、索引状态与行数栏；传 `false` 可只隐藏该 renderer 元信息栏，不影响 Viewer 全局工具栏。
- 修复 Web Component 中 PPTX 样式未进入实际 ShadowRoot（#127），以及 PPTX Worker 固定请求根路径（#129）；真实 IIFE 和 Angular 子路径均纳入浏览器回归。
- 修复全宽、flex grow、外层滚动容器中的 PDF 居中与缩放（#128），并让 PDF.js 根变量在 Shadow DOM 和 forced-colors 下正确生效。
- 修复宿主应用预载 PDF.js 3.x 时污染全局 fake-worker handler（#134）：File Viewer 的 PDF.js 5.4 只在自身 Worker 初始化期间临时接管 handler，随后恢复宿主 namespace，避免双向版本冲突。
- 修复静态 PDF Worker 与 API 版本不一致（#138）：使用 Worker 前会读取官方版本标记；发现旧 Worker 时不再实例化，而是自动回退到随包交付的同版本 PDF.js handler。
- DOCX 遇到缺失/损坏页眉页脚结构时自动降级为正文预览（#130），避免单个可选 part 让整份文档崩溃。
- Word 现在先按文件签名识别容器（#131）：即使 OOXML 文件被误命名为 `.doc`，也会进入 DOCX 渲染器；真实 CFB 二进制 `.doc` 仍走原解析链路。
- 非 Full 的 `preset-office` 资产复制补齐 Spreadsheet Worker（#135），并在 Vite 子路径、npm/pnpm 冷安装和生产构建中校验文件内容与来源版本。
- 新增 PowerPoint 97–2003 二进制 `.ppt` 预览：`@file-viewer/renderer-presentation` 使用 `@file-viewer/ppt@0.3.1` 的 Worker / OffscreenCanvas / WASM、独立 CJK 字体与有界帧缓存，与 PPTX OOXML 链路严格分流，并纳入统一缩放、打印和真实浏览器样例回归。Demo、Full、copy-assets、CDN/IIFE 和 Vue 2.6 + Vue CLI 3 示例都会交付经过校验的九文件 `vendor/ppt/` 运行时并开箱即用；PPT 运行时保留包内独立 LICENSE/NOTICE 与公开水印。格式矩阵更新为 208 个扩展名、25 条预览链路。
- 离线门禁覆盖 Demo 和所有分发资产；Demo 不再运行时请求 GitHub API，也不再用根绝对路径覆盖 Archive/Spreadsheet Worker。

### Upgrade

```bash
pnpm add @file-viewer/vue3-full@2.2.0
pnpm add -D @file-viewer/vite-plugin@2.2.0
```

非 Vite 项目继续使用同版本资产复制 CLI：

```bash
npx --no-install file-viewer-copy-assets ./public/file-viewer
```

## File Viewer v2.1.30 — 2026-07-15

这个版本统一了 Full 包的完整资产交付方式。仅执行 `npm install` 只会安装 renderer 代码，不会自动把 Worker、WASM、字体和 vendor 资源发布到业务站点；未完成资产交付时，不属于完整格式支持。

官方 8 个 Full 包：

- `@file-viewer/web-full`
- `@file-viewer/vue3-full`
- `@file-viewer/vue2.7-full`
- `@file-viewer/vue2.6-full`
- `@file-viewer/react-full`
- `@file-viewer/react-legacy-full`
- `@file-viewer/svelte-full`
- `@file-viewer/jquery-full`

交付规则：

- Vite：安装同版本 `@file-viewer/vite-plugin`，使用 `fileViewerRenderers({ copyAssets: true })`，dev/build 自动发布完整资源。
- Webpack、Rspack、Rollup、Vue CLI、Umi：运行 Full 包自带的同版本 CLI：`npx --no-install file-viewer-copy-assets ./public/file-viewer`。
- `@file-viewer/web-full`：直接使用 CDN/IIFE，或原样部署完整 `dist/` 目录时无需复制；只复制入口 IIFE 不是完整部署。

已覆盖 8 个 Full 包合约、10 组框架冷安装浏览器矩阵、Vue 2.6 / Vue CLI 3、Vite dev/build、非 Vite 复制 CLI 和 `web-full` 完整 `dist/` 回归。

### Upgrade

Vite：

```bash
pnpm add @file-viewer/vue3-full@2.1.30
pnpm add -D @file-viewer/vite-plugin@2.1.30
```

```ts
fileViewerRenderers({ copyAssets: true })
```

非 Vite：

```bash
pnpm add @file-viewer/vue3-full@2.1.30
npx --no-install file-viewer-copy-assets ./public/file-viewer
```

## 维护模板

后续发布说明继续使用“用户为什么升级”的结构：

```md
## File Viewer vX.Y.Z

这次主要改进 [场景] 的体验。

### 适合升级的人

- 使用 [框架/包/部署方式] 的项目
- 遇到 [具体问题] 的项目

### Highlights

- 修复 / 改进 [用户可感知变化]
- 更新 Demo、Docs、离线资源或组件 README

### Upgrade

pnpm add @file-viewer/vue3-full@latest
```
