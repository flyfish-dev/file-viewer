# Public Sample Sources

本目录中的 PDF、CAD、3D 模型、绘图、音频、EPUB 和 MSG 示例文件使用可追溯的公开样本或项目内最小夹具；UMD、EML、OLB、DRA 和压缩包示例文件由项目内生成，用于固定回归对应结构。后续替换这些文件时，请优先选择许可清楚、可直接访问 raw 文件的公开仓库，并同步更新本文件与 `README.md`。

| Local file | Source | License | Purpose |
| --- | --- | --- | --- |
| `drawing.dxf` | `https://github.com/mozman/ezdxf/blob/master/examples_dxf/wipeout_door.dxf` | MIT | Real DXF CAD drawing for pan, zoom and layer smoke tests |
| `pdf.pdf` | `https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf` | W3C public test resource | Small real PDF sample for fast toolbar, scale and page navigation smoke tests |
| `sample.dwg` | `https://github.com/dshn06/cad-webviewer-unity/blob/main/cad-webview/public/cad-data/data/baseline-sample.dwg` | MIT | Real DWG sample for compatibility preview and geometry-limit messaging |
| `model.gltf` / `model.obj` / `model.stl` / `model.ply` / `model.step` | Project-generated minimal fixtures | Apache-2.0 | Three.js model rendering and engineering-format fallback smoke tests |
| `flow.excalidraw` | `https://github.com/neo4j-labs/agent-memory/blob/main/docs/assets/images/diagrams/excalidraw/poleo-model.excalidraw` | Apache-2.0 | Real Excalidraw scene for official restore/export smoke tests |
| `process.drawio` | `https://github.com/jgraph/drawio-diagrams/blob/dev/blog/data-flow.drawio` | Apache-2.0 | Official draw.io sample for diagrams.net viewer smoke tests |
| `book.umd` | 项目内生成的最小 UMD 文本电子书 fixture | Apache-2.0 | UMD ebook metadata, table-of-contents and zlib text smoke tests |
| `archive.zip` / `archive.tar.gz` | Project-packaged PDF, DOCX, Markdown, TypeScript and JSON sample set | Apache-2.0 | Archive directory, lazy extraction, cache and nested preview smoke tests |
| `sample.eml` | Project-generated MIME email fixture | Apache-2.0 | EML headers, text/html body, attachment download and attachment preview smoke tests |
| `sample.msg` | `https://github.com/HiraokaHyperTools/msgreader/blob/master/test/A%20memo.msg` | MIT | Outlook MSG parsing smoke test through @kenjiuno/msgreader |
| `sample.olb` / `sample.dra` | Project-generated CFB EDA fixtures | Apache-2.0 | OLB/DRA structured stream and readable-string smoke tests |
| `audio.mp3` | `https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3` | CC0 | Small MP3 sample for native audio playback smoke tests |
| `audio.ogg` | `https://commons.wikimedia.org/wiki/File:Example.ogg` | CC BY-SA 3.0 | OGG Vorbis sample for native audio playback smoke tests |
| `book.epub` | `https://www.gutenberg.org/ebooks/928.epub3.images` | Public domain in the USA | EPUB sample for epubjs table-of-contents and paginated reading smoke tests |

运行时说明:

- `sample.dwg` 是真实 DWG 文件；运行时会尽量识别误命名 DXF 或提取内嵌预览图，完整几何仍建议业务侧转换为 DXF。
- `pdf.pdf` 是 W3C 公开测试 PDF，体积很小，适合保证线上 demo 和浏览器烟测快速进入 PDF 渲染状态。
- `model.gltf`、`model.obj`、`model.stl`、`model.ply` 和 `model.step` 是最小 3D fixture，用于验证 Three.js 预览和工程格式转换提示。
- `flow.excalidraw` 先经过 `@excalidraw/excalidraw` 的官方 `restore`，再用 `exportToSvg` 输出只读预览，以兼容公开样例中常见的精简字段。
- `process.drawio` 由 diagrams.net 官方 `GraphViewer` 解析，组件不自行实现 draw.io 方言解析。
- `audio.mp3` 与 `audio.ogg` 只用于验证浏览器原生音频播放能力；不同浏览器对编码的支持存在差异。
- `book.epub` 来自 Project Gutenberg，运行时由 `epubjs` 解析 EPUB 包、目录和章节资源。
- `book.umd` 由项目内生成，覆盖 UMD 文件头、元数据、章节偏移、章节标题和 zlib 压缩正文段。
- `archive.zip` 与 `archive.tar.gz` 由本目录中的 PDF、DOCX、Markdown、TypeScript 和 JSON 示例打包，用于验证 `libarchive.js` Worker、按需解压、IndexedDB 缓存和内部文件继续预览。
- `sample.eml` 是标准 MIME fixture，用于验证 EML 头信息、HTML/文本正文和附件链路。
- `sample.msg` 来自 `HiraokaHyperTools/msgreader` 测试样例，用于验证 Outlook MSG 解析。
- `sample.olb` 与 `sample.dra` 是项目内生成的 CFB 夹具，用于验证 OLB / DRA 内部结构预览和可读字符串索引。
