# Example

当前目录用于演示文件预览与 iframe 嵌入联调。主示例页会从这里读取内置样本，覆盖当前已注册的主要格式入口。

PDF、CAD、3D 模型、绘图、音频、EPUB、MSG 等样例使用可追溯的公开样本或项目内最小夹具；UMD、EML、OLB、DRA 和压缩包样例由项目内生成，来源和许可见下方“公开样例来源”。这样既能避免手写占位文件过于理想化，也方便后续升级依赖时复现真实文件的兼容性问题。

代码/配置/日志类样本刻意保留了更接近真实业务的结构，例如异步加载计划、文件类型识别、错误处理、配置嵌套、SQL CTE、Shell 参数处理和多语言类型定义。这样可以更充分地验证 `highlight.js` 对注释、字符串、泛型、对象嵌套、缩进、diff 和长行滚动的展示效果。

## 当前内置样本

- `test.doc`: 验证 `.doc` 老文档与 Word 风格页面容器
- `word.docx`: 验证现代 Word 文档链路
- `excel.xlsx`: 验证 `xlsx` 样式能力
- `excel.xlsm`: 验证 `xlsm` 扩展名入口
- `excel.xlsb`: 验证 `xlsb` 扩展名入口
- `excel.xls`: 验证 `xls` 扩展名入口
- `table.csv`: 验证 `csv` 表格入口
- `excel.ods`: 验证 `ods` 扩展名入口
- `excel.fods`: 验证 `fods` 扩展名入口
- `excel.numbers`: 验证 `numbers` 扩展名入口
- `ppt.pptx`: 验证 `pptx` 幻灯片渲染、组合图形、主题背景和图片资源
- `pdf.pdf`: 使用 W3C 轻量公开 PDF 验证阅读体验、缩放工具栏和页面导航
- `ofd.ofd`: 验证 `ofd.js` 在线预览
- `drawing.dxf`: 使用公开 DXF CAD 样例验证图纸预览
- `sample.dwg`: 使用公开 DWG 样例验证 DWG 兼容预览和原因提示
- `model.gltf`: 使用项目内最小 glTF 验证 Web 3D 预览
- `model.obj`: 使用项目内 OBJ 四面体验证 OBJ 几何预览
- `model.stl`: 使用项目内 STL 四面体验证 STL 几何预览
- `model.ply`: 使用项目内 PLY 四面体验证 PLY 几何预览
- `model.step`: 使用项目内最小 STEP 验证工程 CAD 格式转换原因提示
- `flow.excalidraw`: 使用公开 Excalidraw 图纸验证官方 SVG 导出预览
- `process.drawio`: 使用官方 draw.io 示例验证 diagrams.net 图纸预览
- `book.epub`: 使用 Project Gutenberg 公开 EPUB 验证电子书目录和滚动阅读
- `book.umd`: 验证 UMD 电子书元数据、目录和 zlib 正文解析
- `archive.zip`: 验证 ZIP 目录读取、按需解压、缓存和压缩包内文件预览
- `archive.tar.gz`: 验证 TAR.GZ 压缩包兼容入口和内部文件预览
- `sample.eml`: 验证 EML 头信息、HTML/文本正文、附件下载和附件预览
- `sample.msg`: 使用 msgreader 上游公开样例验证 Outlook MSG 解析
- `sample.olb`: 使用项目内生成的 CFB 元件库夹具验证 OLB 结构预览
- `sample.dra`: 使用项目内生成的 CFB 封装图纸夹具验证 DRA 结构预览
- `markdown.md`: 验证 Markdown 阅读样式
- `notes.markdown`: 验证 Markdown 长扩展名
- `text.txt`: 验证纯文本预览
- `data.json`: 验证 JSON 高亮
- `code.js`: 验证 JavaScript 高亮
- `code.mjs`: 验证 ES Module JavaScript 高亮
- `code.cjs`: 验证 CommonJS JavaScript 高亮
- `code.ts`: 验证 TypeScript 高亮
- `code.tsx`: 验证 TSX 高亮
- `code.jsx`: 验证 JSX 高亮
- `code.css`: 验证 CSS 高亮
- `page.html`: 验证 HTML 源码高亮，不执行页面脚本
- `page.htm`: 验证 HTM 源码高亮，不执行页面脚本
- `data.xml`: 验证 XML 高亮
- `component.vue`: 验证 Vue 单文件组件高亮
- `config.yaml`: 验证 YAML 高亮
- `config.yml`: 验证 YML 高亮
- `settings.ini`: 验证 INI 高亮
- `script.sh`: 验证 Shell 脚本高亮
- `script.bash`: 验证 Bash 脚本高亮
- `query.sql`: 验证 SQL 高亮
- `main.go`: 验证 Go 高亮
- `main.rs`: 验证 Rust 高亮
- `index.php`: 验证 PHP 高亮
- `main.c`: 验证 C 高亮
- `main.cpp`: 验证 C++ 高亮
- `module.cc`: 验证 C++ 兼容扩展名高亮
- `main.h`: 验证 C/C++ 头文件高亮
- `main.hpp`: 验证 C++ 头文件高亮
- `program.cs`: 验证 C# 高亮
- `change.diff`: 验证 diff 高亮
- `code.java`: 验证 Java 高亮
- `code.py`: 验证 Python 高亮
- `app.log`: 验证日志文件预览
- `pic.png`: 验证 PNG 图片预览
- `pic.jpg`: 验证 JPG 图片预览
- `pic.jpeg`: 验证 JPEG 图片预览
- `pic.gif`: 验证 GIF 图片预览
- `pic.bmp`: 验证 BMP 图片预览
- `pic.tiff`: 验证 TIFF 图片预览
- `pic.tif`: 验证 TIF 图片预览
- `vector.svg`: 验证 SVG 图片预览
- `pic.webp`: 验证 WEBP 图片预览
- `audio.mp3`: 使用 MDN CC0 音频验证 MP3 原生播放
- `audio.ogg`: 使用 Wikimedia Commons 音频验证 OGG 原生播放
- `video.mp4`: 验证视频播放

## 说明

部分兼容扩展名样本复用了同一份可解析文件内容来确认渲染入口，例如表格兼容格式和图片兼容格式。生产上线前，仍建议用业务真实文件补一轮回归。

## 公开样例来源

| 文件 | 公开来源 | 许可 |
| --- | --- | --- |
| `drawing.dxf` | `mozman/ezdxf` 的 `examples_dxf/wipeout_door.dxf` | MIT |
| `sample.dwg` | `dshn06/cad-webviewer-unity` 的 `baseline-sample.dwg` | MIT |
| `model.gltf` / `model.obj` / `model.stl` / `model.ply` / `model.step` | 项目内生成的最小 3D fixture | Apache-2.0 |
| `flow.excalidraw` | `neo4j-labs/agent-memory` 的 `poleo-model.excalidraw` | Apache-2.0 |
| `process.drawio` | `jgraph/drawio-diagrams` 的 `blog/data-flow.drawio` | Apache-2.0 |
| `book.umd` | 项目内生成的最小 UMD 文本电子书 fixture | Apache-2.0 |
| `archive.zip` / `archive.tar.gz` | 项目内打包的 PDF、DOCX、Markdown、TypeScript 和 JSON 示例集合 | Apache-2.0 |
| `sample.eml` | 项目内生成的标准 MIME 邮件 fixture | Apache-2.0 |
| `sample.msg` | `HiraokaHyperTools/msgreader` 的 `test/A memo.msg` | MIT |
| `sample.olb` / `sample.dra` | 项目内生成的 CFB EDA fixture | Apache-2.0 |
| `audio.mp3` | MDN interactive examples 的 `t-rex-roar.mp3` | CC0 |
| `audio.ogg` | Wikimedia Commons 的 `Example.ogg` | CC BY-SA 3.0 |
| `book.epub` | Project Gutenberg 的 `Alice's Adventures in Wonderland` EPUB | Public domain in the USA |

这些样例只作为预览器验收文件使用。更新样例时请继续保留公开来源、固定路径和许可信息，避免重新引入无法追溯的本地占位文件。

`ofd.ofd` 示例来自 Apache-2.0 授权的 `DLTech21/ofd.js` 项目公开样本，用于确认 OFD 在浏览器端的基础解析和渲染链路。运行时使用同仓库纯 JS 解析/渲染源码，避开 npm dist 的授权 wasm 分支。

DWG 当前作为 CAD 兼容入口保留，`sample.dwg` 已换成真实公开 DWG 文件。运行时会优先识别误命名 DXF，真实 DWG 会尽量提取内嵌 PNG/JPEG/BMP 预览图；完整几何仍建议在业务侧转换为 DXF，避免默认引入 GPL 或闭源 DWG 解析运行时。

`model.gltf`、`model.obj`、`model.stl`、`model.ply` 和 `model.step` 用于验证 Three.js 模型预览、视图适配、线框/网格/坐标轴控制以及工程格式转换提示。

`flow.excalidraw` 与 `process.drawio` 用于验证绘图类文本格式。Excalidraw 使用官方 `@excalidraw/excalidraw` 的 `restore` 与 `exportToSvg`，draw.io 使用官方 diagrams.net `GraphViewer`，组件本身只做按需加载、容器挂载和错误提示。

`audio.mp3` 与 `audio.ogg` 用于验证浏览器原生音频播放能力；`book.epub` 用于验证 `epubjs` 的目录、章节资源和滚动阅读能力；`book.umd` 用于验证早期移动电子书的文件头、元数据、章节偏移、章节标题和 zlib 正文段。

`archive.zip` 与 `archive.tar.gz` 用于验证 `libarchive.js` 的 Worker 目录读取、按需解压、IndexedDB 缓存和压缩包内文件继续预览。`sample.eml` 与 `sample.msg` 用于验证邮件头信息、HTML/文本正文、附件下载和附件预览。`sample.olb` 与 `sample.dra` 是 CFB 容器夹具，用于验证 OLB / DRA 的内部条目、文本片段和可读字符串预览。
