# DOCX 原样列表、缩放及流程图复核

本组确认当前分支已有实现的行为，不增加预览特判，不重复记为新的代码修复。

- **C018**：原始编号定义确实是两个 `-` 项目符号；单元格内两处生成标记可见，111 个正文字符、1 行/3 单元格保持。该用例没有要求把项目符号改成数字序号。
- **C031**：原稿保持单页，按 100%、88%、50%、200%、100% 顺序缩放，页面宽高等比例变化，553 个正文字符和页脚内容未改变，没有增加空白页。
- **C033**：原文没有 `w:textDirection`，表格按正常横向文字呈现；2 个原始表格跨页后共保留48行/192单元格，2,734个正文字符逐字相同。流程图包含一个 SVG 扩展及 PNG 回退，当前实现采用原始SVG；加载后的字节哈希与内嵌SVG一致，显示框保持550×517像素的原始比例，不用重绘图片代替文档资源。

在 DPR 1/2 下，实际 Word renderer、页面缩放提供者和浏览器解码共15项检查通过。原样检查保持原文件字节，不通过忽略空白等方式掩盖正文差异；报告只记录数量与哈希，不包含原稿正文。测试不自行下载文件，不访问外网。

```bash
pnpm --filter @file-viewer/core build
pnpm --filter @file-viewer/doc build
pnpm --filter @file-viewer/renderer-word build
WORD_LAYOUT_CORPUS_DIR=/path/to/originals \
  node packages/renderers/word/scripts/verify-original-layout-subcases.mjs
```

目录需提供 `C018.docx`、`C031.docx`、`C033.docx`，运行前分别核对固定SHA-256。`WORD_LAYOUT_OUTPUT` 和 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 可控制输出目录及浏览器。缺文件会失败，不能成为空跑通过。

上述报告点可按证据收口；它们不替代其他原稿的制表符、页眉锚点、印章、跨页表格和桌面应用整页视觉对照，也不代表整个W02或资料包已经结项。字体环境可能影响分页，所以仅C031的单页要求作为这里的页数断言。
