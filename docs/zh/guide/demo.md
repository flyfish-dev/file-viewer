# Demo 说明

> **Maintainer-only commands:** this page contains complete-workspace release or verification examples that are not part of the public checkout. Public contributors should use the commands in `/README.md` or `/docs/guide/development.md`.

<!-- FILE_VIEWER_MAINTAINER_COMMANDS -->

<div class="doc-kicker">See It Before You Ship It</div>

<p class="doc-lead">
  一个好用的 Demo，不只是“给别人看看”，也是团队内部确认能力边界、联调文件样本和复现问题的最快入口。
  v2.2.6 的能力矩阵包含 208 个扩展名映射和 25 条预览链路；Demo 为每条链路提供可重复验证的代表样例，适合在本地开发、依赖升级和上线前做完整回归。
</p>

## 四个验证入口

| 入口 | 地址 | 适合做什么 |
| --- | --- | --- |
| 主示例页 | `/` | 切换预置文件、上传本地文件、快速确认各类格式表现 |
| iframe 嵌入页 | `/iframe.html` 或 `/iframe` | 无 Demo 外壳的官方嵌入入口，和主 Demo 共用 `?url=`、`from/name` 与 `postMessage(Blob)` 文件传入协议 |
| 文档比对页 | `/compare.html` | 左右并排预览两份文档，支持示例、URL、本地上传、交换、重置、同步滚动、聚焦文档浮层搜索和行级定位 |
| 组件 Demo | `apps/component-demo` | 同时验证 Vanilla JS / Pure Web、React、Vue3、jQuery、Svelte 和 script 标签接入 |

## 主示例页

主示例页采用沉浸式文档工作台。顶部胶囊只保留“打开文件”“粘贴链接”“样例”三个来源操作；当前文件名和真实格式图标悬浮在文档上方，鼠标移入顶部区域时展开，移出 1 秒后以融合动画回到操作栏。右侧搜索、适应、主题、下载和更多操作始终跟随文档能力显示，每个按钮只打开自己的就近浮层，不会让多个操作共用一个失去上下文的弹框。

左下角“最近打开”使用浏览器 `localStorage` 记忆 URL 与样例记录，可逐项移除并随时从历史图标恢复。完整设置收进“更多”，集中展示主题、密度、背景、统一缩放、搜索、打印、导出、水印、压缩包和当前格式专项参数；移动端只保留一个“更多”入口，文档仍在自己的容器内滚动，顶部文件名保持视口居中。

主示例页也内置了完整示例列表，包括 Word、Excel、PPT、PDF、OFD、Typst、XMind、压缩包、邮件、OLB/DRA/GDS/OASIS、CAD、地理数据、3D 模型、Excalidraw、draw.io、EPUB、UMD、Markdown、代码/文本、图片、音视频、字体/设计资产和结构化数据。示例选择器按文件类型分组展示，每个样例都提供图标、格式名和文件名，点击后会立即打开并自动收起选择器。它适合做三件事:

- 快速演示当前项目支持哪些文件类型
- 用本地上传验证 `file` 方案
- 在修改渲染逻辑后做肉眼回归检查

Demo 默认跟随浏览器语言。中文浏览器进入中文样例体系，其他语言进入英文样例体系；推荐用 `?locale=zh-CN` 或 `?locale=en-US` 固定语言，历史 `lang` 参数继续兼容。英文体系包含公开英文 DOCX、PDF、PPTX、XLSX 样例，以及本地英文 Markdown、文本、日志、CSV、JSON、TypeScript、JavaScript、GeoJSON、glTF 和压缩包嵌套样例，运行时不依赖公网 CDN。

<div class="doc-shot">
  <img src="/_media/file-viewer-demo-v2.2.6-formats-zh.gif" alt="Flyfish Viewer v2.2.6 中文主 Demo，展示 DOCX、PPTX、DWG、可交互三维 STEP 与文件胶囊融合" width="1200" height="750" loading="lazy" />
  <p class="doc-caption">动图依次停留在中文 DOCX、NASA PPTX、Autodesk DWG 平面图和可旋转的 STEP 实体，并保留真实的样例库与文件胶囊融合交互。</p>
</div>

<div class="doc-shot">
  <img src="/_media/file-viewer-demo-v2.2.6-samples-zh.webp" alt="Flyfish Viewer v2.2.6 中文深色样例选择器，按格式分组展示专业文件图标" width="1440" height="900" loading="lazy" />
  <p class="doc-caption">样例选择器在当前文件附近打开，默认展开当前分组；不同文件类型使用一致的文档轮廓与专属色彩，暗色模式不会对整张图标粗暴套用滤镜。</p>
</div>

## Demo 文件传入协议

官方 Demo 的主入口和 iframe 入口共用同一套文件传入协议。推荐客户系统使用 `/iframe.html`，支持 clean URL 的静态平台也可以写成 `/iframe`；显式传入 `url` 时会进入沉浸式模式，隐藏品牌、最近打开和来源操作，只保留文档与当前格式可用的工具栏。已有系统如果已经接入 `/index.html?from=...&name=...`，仍会继续按同样的 `postMessage(Blob)` 方式工作。

URL 文件:

```html
<iframe
  src="/file-viewer/iframe.html?url=/files/demo.docx"
  style="width:100%;height:720px;border:0"
  allow="fullscreen"
></iframe>
```

父页面传二进制:

```html
<iframe
  id="viewer"
  src="/file-viewer/iframe.html?from=https%3A%2F%2Fapp.example.com&name=contract.docx"
></iframe>
<script>
  const file = await fetch('/api/files/contract.docx').then(response => response.blob())
  document.querySelector('#viewer').contentWindow.postMessage(file, 'https://static.example.com')
</script>
```

`from` 必须与父页面 origin 一致，Demo 只接受该来源发来的 `Blob`。如果需要兼容旧主 Demo 集成，把上面 iframe 的 `src` 换成 `/file-viewer/index.html?from=...&name=...` 即可，协议不变。正式交付客户时不要只发 `dist/` 散文件，使用 GitHub Release 中的 `file-viewer-v2-*-official-demo-iframe.tar.gz`；包内有 `iframe-example.html`、`README.iframe.md` 和 `iframe-manifest.json`，可直接交给客户部署验收。

## 文档比对页

文档比对页是独立入口，不会出现在主预览流程里，也不会改变 `FileViewer` 组件本身的默认工具栏。它适合让用户快速核对两份附件的版式差异，例如旧版合同与新版 Word、PDF 与源文档、PPTX 不同版本或 Markdown 与导出物。

直接访问:

```text
/compare.html
```

生产环境体验地址:

```text
https://demo.file-viewer.app/compare.html
```

也可以用查询参数预置左右文件:

```text
/compare.html?left=/example/test.doc&right=/example/word.docx
```

当前支持的查询参数只有两个，文档中不建议额外扩展临时参数，避免和后续组件 API 冲突:

| 参数 | 说明 | 示例 |
| --- | --- | --- |
| `left` | 左侧面板初始文件 URL，支持同源相对路径或浏览器可访问的绝对 URL | `/example/test.doc` |
| `right` | 右侧面板初始文件 URL，支持同源相对路径或浏览器可访问的绝对 URL | `/example/word.docx` |

页面提供三种输入方式，左右两侧互不影响:

- 内置示例: DOC、DOCX、PDF、PPTX、Typst、Markdown，可快速演示常见文档差异
- URL 输入: 粘贴业务文件地址后点击预览，适合联调带签名的临时文件链接
- 本地上传: 直接选择本机文件，适合客户现场复现和售前演示

比对页顶部提供“同步滚动”“隐藏 PDF 工具栏”“文字对比”“交换”“重置”和行号定位。同步滚动按两侧真实滚动容器的滚动比例联动，不要求两份文档页数完全一致；搜索采用和主预览一致的轻量浮层交互，先聚焦左侧或右侧文档，再用浏览器常见查找快捷键呼出搜索框，命中只作用于当前聚焦文档，避免两侧同时滚动导致视线丢失。行级定位会复用预览器抽取出的通用锚点，文本类文档通常定位到段落/行块，PDF 会优先使用可用文本层和页面锚点。

“文字对比”不是把两个预览器简单并排。它先通过 `getDocumentTextChunks()` 取得两侧文档锚点文字并消除切片重叠，再使用成熟的 `jsdiff` 做逐行对齐；替换行会继续做字符级 diff，因此中文合同中只改一个数字或词语时，左右两侧会分别标出删除和新增的具体字符。差异视图提供新增、删除、修改、未变化计数、上一处 / 下一处导航，以及“只看差异”过滤。

PDF 在比对页中默认隐藏自身阅读工具栏，只保留正文和可滚动页面，避免左侧 Word / Markdown 与右侧 PDF 因多一条页码缩放栏而错位。需要查看 PDF 页码、缩放、旋转或目录时，可以关闭“隐藏 PDF 工具栏”开关。

为了保持左右对照清晰，比对页默认关闭每个预览器通用操作栏。如果需要下载、打印、导出 HTML、水印或业务权限钩子，请使用主预览入口或在业务侧基于 `FileViewer` 组件自定义比对容器。

私有化部署时，`pnpm build-only` 产物、Docker 镜像和开源总仓库的 `demo/` 目录都会包含同一个入口:

```text
demo/compare.html
```

上线前建议至少验证下面两条:

```bash
pnpm verify:demo-output
```

```text
/compare.html?left=/example/test.doc&right=/example/word.docx
```

当前文字 diff 的稳定主路径是 DOCX、Markdown、代码和纯文本等能够可靠提取阅读顺序的文档。它比较最终可读文字，不解析 Word 内部的修订作者、批注或 OOXML change-tracking 元数据，也不做表格单元格结构 diff。PDF 已可使用同一入口逐步验证，但结果取决于 PDF 文本层的阅读顺序；扫描 PDF 暂不内置 OCR，检测不到文字时会明确提示。多页 PDF 若当前文本层未覆盖全部页面，对比会主动停止而不是把可见页误报成完整结果；完整 PDF 提取、OCR 和版面坐标映射留在后续阶段。需要审计级 PDF OCR 或 Office 修订历史时，仍应在业务侧接入相应服务，并通过 `collectDocumentAnchors()`、`scrollToAnchor()` 和 `getDocumentTextChunks()` 继续关联来源位置。

## Word 页面效果

Word 示例被单独拿出来说明，因为它已经不只是“能打开”，而是具备明确的沉浸式阅读面。`.doc` 和 `.docx` 都会保持页面居中和宽度自适应；DOCX 的页面之外背景可在“沉浸透明 / 格式默认”之间切换，文档本身按主题使用协调的浅色纸张或深色文档面。顶部和右侧工具组固定不动，滚动只发生在文档容器内，因此长文档向上滚动时不会被空白顶栏截断。

## Vanilla JS / React 组件 Demo

仓库中的 `apps/component-demo` 会同时挂载 React 组件、Pure Web controller、`<flyfish-file-viewer>` Custom Element、Vue3 组件、jQuery 组件、Svelte action 和普通 script 标签全局包，用同一份 DOCX 示例验证组件原生挂载、生命周期事件、文件输入和资源加载。调试时运行:

```bash
pnpm dev:components
```

构建上线前运行:

```bash
pnpm build:component-demo
pnpm --filter @flyfish-group/file-viewer-component-demo preview
```

如果开发服务和 build preview 中各个面板都能显示同一份 DOCX 示例，就说明 React 组件、纯 JS Custom Element / `mountViewer`、jQuery、Svelte 和 script 标签全局包都可用。

## 示例文件清单

仓库中当前提供的示例文件位于 `apps/viewer-demo/public/example/`:

代码、配置和日志类样本已经按真实集成场景扩充，不再只是几行占位内容；它们会覆盖注释、函数、类型、嵌套配置、SQL CTE、Shell 参数、diff 块和长内容滚动，适合验证代码高亮的实际可读性。`word.docx` 使用 Basel Convention 公开中文正式文档，`ppt.pptx` 使用 NASA Science 公开月球科学战略演示稿，`markdown.md` 使用更丰富的长内容样例，`pdf.pdf` 使用项目方提供的 13 页《PDF沉浸式翻译技术说明》，`report.typ` 使用项目内编写的多页 Typst 源文件报告，用于验证浏览器端直接编译、按页 SVG 预览、打印和 HTML 导出链路。DWG 使用 Autodesk 官方 AutoCAD sample files，ODT/ODS/ODP 使用 The Document Foundation 公开 OpenDocument 文件；CAD、3D、绘图、音频和 EPUB 样本使用公开文件或项目内最小夹具，UMD 电子书样本由项目内生成，来源记录在 `apps/viewer-demo/public/example/SOURCES.md`。

| 文件 | 用途 | 对应能力 |
| --- | --- | --- |
| `test.doc` | 验证老 Word 文档链路 | `doc` + Word 风格页面容器 |
| `word.docx` | Basel Convention 公开中文正式文档，验证现代 Word 长文档、标题层级、表格、图示、主题阅读面和完整打印 | `docx` |
| `excel.xlsx` | 验证表格样式链路 | `xlsx` |
| `excel.xlsm` | 验证宏工作簿扩展名映射 | `xlsm` |
| `excel.xlsb` | 验证二进制工作簿扩展名映射 | `xlsb` |
| `excel.xls` | 验证老 Excel 扩展名映射 | `xls` |
| `table.csv` | 验证轻量数据表格链路 | `csv` |
| `excel.ods` | The Document Foundation 公开 ODS 表格，验证 OpenDocument 表格扩展名映射、真实工作表和样式读取 | `ods` |
| `excel.fods` | 标准 Flat ODS XML 夹具，验证平面 OpenDocument 表格扩展名映射 | `fods` |
| `excel.numbers` | 验证 Numbers 扩展名映射 | `numbers` |
| `sample.rtf` | 验证 RTF 富文本兼容预览 | `rtf` |
| `document.odt` | The Document Foundation 公开 ODT 模板，验证 OpenDocument 文本正文抽取和纸张阅读面 | `odt` |
| `ppt.pptx` | NASA 公开月球科学战略演示稿，验证星云封面、深色引用页、图文混排、页眉页脚和多页专业版式 | `pptx` |
| `slides.odp` | The Document Foundation 公开 ODP 文件，验证 OpenDocument 演示文稿页面结构和文本预览 | `odp` |
| `pdf.pdf` | 项目方提供的 13 页真实技术说明 PDF，验证多页阅读、缩放工具栏、页面/目录导航窗格、完整打印和 HTML 导出 | `pdf` |
| `ofd.ofd` | 验证 OFD 在线预览 | `ofd` |
| `report.typ` | 验证 Typst 源文件直接读取、浏览器 WASM 编译、按页 SVG 预览、打印和 HTML 导出 | `typ` |
| `drawing.dxf` | 使用公开 DXF 样例验证 CAD 图纸预览、平移、缩放、图层和 WebGL/Canvas fallback | `dxf` |
| `sample.dwg` | 使用 Autodesk 官方 DWG 样例验证 Worker + LibreDWG WASM 几何解析、块、表格和 CAD 视图适配 | `dwg` |
| `samples/apache/blocks_and_tables.dwf` | 使用 Apache Tika 公开 Jira 附件验证原生 DWF 容器、块和表格渲染 | `dwf` |
| `samples/autodesk/house.dwfx` | 使用 Autodesk 官方 Viewer 教程样例验证 DWFx/XPS native renderer、多页结构和 CAD 视图适配 | `dwfx` |
| `samples/autodesk/robot-arm.dwfx` | 使用 Autodesk 官方 Viewer 教程样例验证 W2D/W3D native renderer 和复杂装配图形 | `dwfx` |
| `mindmap.xmind` | 使用项目内生成的双 sheet XMind 夹具验证脑图节点、标签、备注、链接、目录、Panzoom 画布拖拽平移、移动端双指缩放、适配画布、缩放、搜索和导出 | `xmind` |
| `map.geojson` | 验证 GeoJSON 点线面离线地图预览 | `geojson` |
| `route.kml` | 验证 KML 转 GeoJSON 后预览 | `kml` |
| `track.gpx` | 验证 GPX 轨迹转 GeoJSON 后预览 | `gpx` |
| `model.gltf` | 使用项目内嵌入数据的最小 glTF 验证 Web 3D 预览 | `gltf` |
| `model.obj` | 使用项目内生成的 OBJ 四面体验证 OBJ 几何预览 | `obj` |
| `model.stl` | 使用项目内生成的 STL 四面体验证 STL 几何预览 | `stl` |
| `model.ply` | 使用项目内生成的 PLY 四面体验证 PLY 几何预览 | `ply` |
| `model.step` | 使用 `occt-import-js` 上游基础立方体 STEP 样例验证离线 OCCT Worker/WASM、真实网格、适配视图和统一缩放 | `step` |
| `flow.excalidraw` | 使用公开 Excalidraw 图纸验证官方恢复与 SVG 导出预览 | `excalidraw` |
| `process.drawio` | 使用官方 draw.io 示例验证官方 diagrams.net 离线 viewer 与内置 SVG fallback 链路 | `drawio` |
| `book.epub` | 使用 Project Gutenberg 公开 EPUB 验证电子书目录和滚动阅读 | `epub` |
| `book.umd` | 使用项目内生成的 UMD 电子书验证元数据、目录和 zlib 正文解析 | `umd` |
| `archive.zip` | 验证 ZIP 目录读取、按需解压、缓存、内部文档预览和 `archive.entryActions.download` 单条下载按钮策略 | `zip` |
| `archive.tar.gz` | 验证 TAR.GZ 压缩包兼容入口、内部文件预览和内部下载按钮隐藏策略 | `gz` |
| `sample.eml` | 验证 EML 头信息、HTML/文本正文、附件下载和附件预览 | `eml` |
| `sample.msg` | 使用 msgreader 上游公开样例验证 Outlook MSG 解析 | `msg` |
| `sample.mbox` | 验证 MBOX 归档识别和首封邮件预览 | `mbox` |
| `sample.olb` | 使用项目内生成的 CFB 元件库夹具验证 OLB 结构预览 | `olb` |
| `sample.dra` | 使用项目内生成的 CFB 封装图纸夹具验证 DRA 结构预览 | `dra` |
| `layout.gds` | 使用项目内生成的 GDSII 版图夹具验证库名、单元、层、边界、路径、文本、引用和 SVG 版图预览 | `gds` |
| `layout.oas` / `layout.oasis` | 使用项目内生成的 OASIS 文本结构夹具验证 OAS/OASIS 路由和版图结构退化预览 | `oas` / `oasis` |
| `markdown.md` | 验证 Markdown 长内容、表格、代码块和明暗主题阅读面 | `md` |
| `notes.markdown` | 验证 Markdown 长扩展名和主题隔离 | `markdown` |
| `text.txt` | 验证纯文本展示 | `txt` |
| `data.json` | 验证 JSON 高亮 | `json` |
| `data.jsonc` | 验证 JSONC 注释配置高亮 | `jsonc` |
| `data.json5` | 验证 JSON5 宽松对象语法高亮 | `json5` |
| `notebook.ipynb` | 验证 Jupyter Notebook JSON 结构预览 | `ipynb` |
| `code.js` | 验证 JavaScript 高亮 | `js` |
| `code.mjs` | 验证 ES Module JavaScript 高亮 | `mjs` |
| `code.cjs` | 验证 CommonJS JavaScript 高亮 | `cjs` |
| `code.ts` | 验证 TypeScript 高亮 | `ts` |
| `code.tsx` | 验证 TSX 高亮 | `tsx` |
| `code.jsx` | 验证 JSX 高亮 | `jsx` |
| `code.css` | 验证 CSS 高亮 | `css` |
| `page.html` | 验证 HTML 源码展示，不作为网页执行 | `html` |
| `page.htm` | 验证 HTM 源码展示，不作为网页执行 | `htm` |
| `data.xml` | 验证 XML 高亮 | `xml` |
| `component.vue` | 验证 Vue 单文件组件高亮 | `vue` |
| `config.yaml` | 验证 YAML 高亮 | `yaml` |
| `config.yml` | 验证 YML 高亮 | `yml` |
| `config.toml` | 验证 TOML 配置高亮 | `toml` |
| `settings.ini` | 验证 INI 高亮 | `ini` |
| `service.proto` | 验证 Protocol Buffers IDL 高亮 | `proto` |
| `infrastructure.hcl` | 验证 HCL 基础设施配置展示 | `hcl` |
| `formula.tex` | 验证 TeX / LaTeX 源码展示 | `tex` |
| `graph.gv` | 验证 Graphviz DOT 源码展示 | `gv` |
| `request.http` | 验证 HTTP 请求片段展示 | `http` |
| `script.sh` | 验证 Shell 脚本高亮 | `sh` |
| `script.bash` | 验证 Bash 脚本高亮 | `bash` |
| `query.sql` | 验证 SQL 高亮 | `sql` |
| `main.go` | 验证 Go 高亮 | `go` |
| `main.rs` | 验证 Rust 高亮 | `rs` |
| `code.rb` | 验证 Ruby 高亮 | `rb` |
| `code.swift` | 验证 Swift 高亮 | `swift` |
| `Main.kt` | 验证 Kotlin 高亮 | `kt` |
| `component.react` | 验证 React 片段入口 | `react` |
| `index.php` | 验证 PHP 高亮 | `php` |
| `main.c` | 验证 C 高亮 | `c` |
| `main.cpp` | 验证 C++ 高亮 | `cpp` |
| `module.cc` | 验证 C++ 兼容扩展名高亮 | `cc` |
| `main.h` | 验证 C/C++ 头文件高亮 | `h` |
| `main.hpp` | 验证 C++ 头文件高亮 | `hpp` |
| `program.cs` | 验证 C# 高亮 | `cs` |
| `change.diff` | 验证 diff 高亮 | `diff` |
| `code.java` | 验证 Java 高亮 | `java` |
| `code.py` | 验证 Python 高亮 | `py` |
| `app.log` | 验证日志文本展示 | `log` |
| `pic.png` | 验证 PNG 图片预览 | `png` |
| `pic.jpg` | 验证 JPG 图片预览 | `jpg` |
| `pic.jpeg` | 验证 JPEG 图片预览 | `jpeg` |
| `pic.gif` | 验证 GIF 图片预览 | `gif` |
| `pic.bmp` | 验证 BMP 图片预览 | `bmp` |
| `pic.tiff` | 验证 TIFF 图片预览 | `tiff` |
| `pic.tif` | 验证 TIF 图片预览 | `tif` |
| `vector.svg` | 验证 SVG 图片预览 | `svg` |
| `pic.webp` | 验证 WEBP 图片预览 | `webp` |
| `audio.mp3` | 使用 MDN CC0 音频验证 MP3 原生播放 | `mp3` |
| `audio.ogg` | 使用 Wikimedia Commons 音频验证 OGG 原生播放 | `ogg` |
| `melody.mid` | 验证 MIDI 轨道、时长和音符摘要 | `mid` |
| `video.mp4` | 验证视频播放 | `mp4` |
| `icon.ico` | 验证 ICO 图标预览 | `ico` |
| `sample.sqlite` | 验证 SQLite 表结构和少量数据行预览 | `sqlite` |
| `module.wasm` | 验证 WASM 模块导入导出摘要 | `wasm` |

<div class="doc-note">
  部分兼容格式示例复用了同一份可解析内容来覆盖扩展名入口，例如表格兼容格式和图片兼容格式。Excel 当前使用虚拟表格展示，打印按钮会按能力自动隐藏，避免只打印当前视口。上线前仍建议使用业务真实文件补一轮回归。
</div>

## 完整覆盖与绘图说明

上面的清单已经覆盖当前注册的主要样例扩展名。CAD 链路使用 `@flyfish-dev/cad-viewer` 0.8.0，支持 DWG / DXF / DWF / DWFx / XPS，并增强了 DWG 文字、宽多段线、复杂线型以及外部 SHX 引用识别。0.8.0 底层引擎新增 BOM 提取与 CSV/JSON 导出接口，强化 DWG/DXF 元数据边界，并把 LibreDWG WASM 升级到 0.7.9，修复复杂线型 STYLE 引用为空时合法图纸无法加载的问题；DWG 会按需加载 viewer assets 中 `wasm/cad/` 下的 Worker 和 LibreDWG WASM，DWF/DWFx/XPS 会按需加载 native renderer 与 `dwfv-render.wasm`。

3D 模型示例覆盖 glTF、OBJ、STL、PLY 四条最常用的浏览器模型入口；FBX、DAE、3DS、3MF、AMF、USD/USDZ、KMZ、PCD、VRML/WRL、XYZ、VTK/VTP 等扩展名也已经注册到 `@file-viewer/renderer-3d`。STEP / STP、IGES / IGS 和 BREP 已通过 `@file-viewer/geometry-engine` 在本地 OCCT Worker/WASM 中三角化并交给 Three.js 渲染；`model.step` 会强制验证真实网格、适配视图和统一缩放，不能退回转换提示。IFC 与 3DM 当前仍只展示签名识别和独立 `web-ifc` / `rhino3dm` 接入说明。XMind 样例用于验证多 sheet 脑图、目录、标签、备注、链接、Panzoom 画布拖拽平移、移动端双指缩放、适配画布、搜索、缩放和导出链路。

Excalidraw 默认使用 `roughjs` 生成只读 SVG，运行环境提供官方 Excalidraw ESM 模块时会优先尝试 `restore` 与 `exportToSvg`；draw.io / diagrams.net 文件默认使用随 viewer assets 分发的官方 `GraphViewer` 离线预览，styles、shapes、stencils、img、mxgraph 和 math 资源都来自本地 `vendor/drawio/`。如果官方 viewer 加载异常，会自动回退内置 SVG 预览；内网路径特殊时可通过 `options.drawing.viewerScriptUrl` 指定自托管脚本。

Demo 默认保持 `comfortable` 密度，避免首次打开就进入紧凑版；需要验证效率型外壳、工具栏、压缩包目录、嵌套预览头部、小按钮和搜索输入时，可在 URL 上追加 `?density=compact` 显式切换。压缩包样例用于验证 `libarchive.js` Worker、目录读取、按需解压、IndexedDB 缓存和内部文件继续预览。接入方可以用同一组样例把 `options.archive.entryActions.download` 设为 `false` 或回调，确认内部文件预览栏的下载按钮隐藏，而顶层 viewer 下载原始压缩包的动作仍然可独立控制。邮件样例用于验证 EML / MSG / MBOX 的头信息、正文切换、附件下载和附件预览。地理数据样例用于验证 GeoJSON/KML/GPX 到 MapLibre 矢量叠加层、CRS 归一化和 SVG fallback 的链路；在线 Demo 默认启用 OpenFreeMap 公开底图，私有化或内网接入仍可把 `options.geo.basemap` / `options.geo.tileUrl` 改成离线、自托管或镜像地址。OLB / DRA 样例用于验证 EDA 文件结构树、对象候选、属性、诊断和可读字符串索引；GDS 样例用于验证标准 GDSII 记录解析和 SVG 版图预览；OAS / OASIS 样例用于验证可读 OASIS 文本夹具 SVG 版图与真实二进制 OASIS 的安全结构诊断边界。SQLite、WASM 和 ICO 样例用于验证资产/数据预览链路不会影响普通文档首屏。

## 公开样例来源

| 示例 | 来源 | 许可 |
| --- | --- | --- |
| `drawing.dxf` | `mozman/ezdxf` 的 `examples_dxf/wipeout_door.dxf` | MIT |
| `word.docx` | Basel Convention 的公开中文正式文档 `UNEP-CHW.15-6-Add.5-Rev.1.Chinese.docx` | 公开下载，需保留来源归属 |
| `ppt.pptx` | NASA Science 的 `day2-1630-pac-lunarstrategy-noble-nov2023.pptx` 月球科学战略演示稿 | NASA public media usage guidelines, acknowledge NASA and do not imply endorsement |
| `sample.dwg` | Autodesk 官方 AutoCAD sample files 的 `blocks_and_tables_-_imperial.dwg` | Autodesk public AutoCAD sample file |
| `document.odt` | The Document Foundation Wiki 的 `Book-template-0-2.odt` | CC-BY-SA-3.0 / LGPL-3.0+ / MPL-1.1 |
| `excel.ods` | The Document Foundation Wiki 的 `Fixture_Copa_del_Mundo_2014.ods` | CC-BY-SA-3.0 |
| `slides.odp` | The Document Foundation Wiki 的 `QA_Impress_Example_01_ODP_File.odp` | CC-BY-SA-3.0 |
| `excel.fods` | 项目内编写的标准 Flat ODS XML fixture | Apache-2.0 |
| `samples/apache/blocks_and_tables.dwf` | Apache Tika `TIKA-1823` 的 `blocks_and_tables.dwf` Jira 附件 | Apache Software Foundation Jira attachment |
| `samples/autodesk/house.dwfx` | Autodesk `viewer-javascript-tutorial` 的 `Sample files/House.dwfx` 官方样例 | MIT |
| `samples/autodesk/robot-arm.dwfx` | Autodesk `viewer-javascript-tutorial` 的 `Sample files/RobotArm1.dwfx` 官方样例 | MIT |
| `model.gltf` / `model.obj` / `model.stl` / `model.ply` | 项目内生成的最小 3D fixture | Apache-2.0 |
| `model.step` | `occt-import-js` 上游 `simple-basic-cube/cube.stp`（上游记录原始来源为 GrabCAD simple-basic-cube） | 保留上游来源归属；仅用于解析回归 |
| `mindmap.xmind` | 项目内使用 `@ljheee/xmind-parser` 生成的双 sheet XMind fixture | Apache-2.0 |
| `flow.excalidraw` | `neo4j-labs/agent-memory` 的 `poleo-model.excalidraw` | Apache-2.0 |
| `process.drawio` | `jgraph/drawio-diagrams` 的 `blog/data-flow.drawio` | Apache-2.0 |
| `book.umd` | 项目内生成的最小 UMD 文本电子书 fixture | Apache-2.0 |
| `archive.zip` / `archive.tar.gz` | 项目内打包的丰富 PDF、公开 DOCX、Markdown、TypeScript 和 JSON 示例集合 | 随内部文件来源 |
| `en/archive.zip` / `en/archive.tar.gz` | 项目内打包的英文 DOCX、PDF、PPTX、XLSX、Markdown、文本、日志、CSV、JSON、代码、GeoJSON 和 glTF 示例集合 | 随内部文件来源 |
| `sample.eml` | 项目内生成的标准 MIME 邮件 fixture | Apache-2.0 |
| `sample.msg` | `HiraokaHyperTools/msgreader` 的 `test/A memo.msg` | MIT |
| `sample.olb` / `sample.dra` / `layout.gds` / `layout.oas` / `layout.oasis` | 项目内生成的 EDA / 版图结构 fixture | Apache-2.0 |
| `audio.mp3` | MDN interactive examples 的 `t-rex-roar.mp3` | CC0 |
| `audio.ogg` | Wikimedia Commons 的 `Example.ogg` | CC BY-SA 3.0 |
| `book.epub` | Project Gutenberg 的 `Alice's Adventures in Wonderland` EPUB | Public domain in the USA |

这些样例的作用是验证预览器兼容性，不承诺覆盖你业务中所有 CAD 图元、绘图插件、UMD 方言或打包器输出。上线前仍建议把自己的高频文件加入回归清单。

## 建议保留一套自己的回归样本

如果你要把这个项目接进正式业务，建议你把下面这几类文件各留一份，形成自己的最小回归集:

- 一份版式复杂的 `docx`
- 一份历史 `.doc`
- 一份带合并单元格和颜色的 `xlsx`
- 一份兼容格式表格，比如 `xls` 或 `csv`
- 一份业务里最常见的 `pdf`
- 一份真实 OFD 发票或归档件
- 一份 DXF 图纸
- 一份 Excalidraw 或 draw.io 图纸
- 一份 EPUB 或 UMD 电子书
- 一份业务常见压缩包，里面至少包含 PDF、Office 和代码/文本文件
- 一份 EML 或 MSG 邮件，最好带附件
- 一份 OLB、DRA、GDS 或 OASIS，如果业务会接触 EDA / 芯片版图文件
- 一份真实 XMind，如果业务会接触脑图、会议纪要或知识结构文件
- 一份 Markdown 说明文档
- 一份日志或配置文件，比如 `log` / `json`
- 一份源码文件，比如 `ts` / `py` / `java`
- 一份 `svg` 或 `webp` 图片
- 一份业务常用音频，比如 `mp3` 或 `ogg`

这样每次升级预览器、调整依赖或准备发版时，都能快速知道“这次有没有把关键能力碰坏”。

<div class="doc-note">
  建议你先用仓库内置样本确认主链路，再用自己的真实文件补一轮回归。前者帮你判断“项目本身能不能跑”，后者帮你判断“它能不能真正接住你的业务”。
</div>
