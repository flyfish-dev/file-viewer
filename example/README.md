# Example

当前目录用于演示文件预览与 iframe 嵌入联调。主示例页会从这里读取内置样本，覆盖当前已注册的主要格式入口。

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
- `ppt.pptx`: 验证 `pptx` 幻灯片渲染
- `pdf.pdf`: 验证 `pdf` 阅读体验
- `ofd.ofd`: 验证 `ofd.js` 在线预览
- `drawing.dxf`: 验证 CAD/DXF 图纸预览
- `sample.dwg`: 验证 DWG 兼容提示
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
- `video.mp4`: 验证视频播放

## 说明

部分兼容扩展名样本复用了同一份可解析文件内容来确认渲染入口，例如表格兼容格式和图片兼容格式。生产上线前，仍建议用业务真实文件补一轮回归。

`ofd.ofd` 示例来自 Apache-2.0 授权的 `DLTech21/ofd.js` 项目公开样本，用于确认 OFD 在浏览器端的基础解析和渲染链路。运行时使用同仓库纯 JS 解析/渲染源码，避开 npm dist 的授权 wasm 分支。

DWG 当前作为 CAD 兼容入口保留，`sample.dwg` 用于演示转换提示。组件会提示先转换为 DXF 后预览，避免默认引入 GPL 授权的 DWG 解析运行时。
