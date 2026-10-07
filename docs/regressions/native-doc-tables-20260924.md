# 原生 DOC 嵌套表格与正文完整性

## 根因与修复

原先将连续的表格段落合并为一个表格，只按 `0x07` 结束单元格。这会把内外层独立列网格混合，也无法识别内层以段落标记结束的单元格和行。

解析阶段现在按实际 `itap` 层级使用显式栈：外层使用单元格标记与行结束属性，内层分别使用 `InnerTableCell`、`InnerTtp`。进入、退出嵌套层时保留父单元格中的原始内容顺序，各表独立计算网格、合并和边框。合法空单元格保留，正常行结束标记不再制造额外单元格，未结束的内容不会丢弃。异常层级跳跃不分配大量虚构中间表格。

`TableCellBlock.blocks` 是可选的有序段落／表格内容。旧 `paragraphs` 字段继续保留直接段落，旧的仅段落 AST 仍可渲染；需要遍历嵌套内容的调用方应优先使用 `blocks ?? paragraphs`。生成 HTML 时，段落修订处理及竖排文本包装都在嵌套表格边界处结束，避免合并跨表内容或旋转子表列网格。

本次不改写原始文件，不根据文件名、正文或哈希执行特殊渲染；不增加运行时依赖，不修改版本和锁文件。

## 原样验证

C001 的 11,441,152 字节通过 SHA-256 校验。修改前只形成一个扁平表格、17 行；修改后恢复 16 个独立表格、82 行，段落文本序列的 3,464 字符与修复前逐字一致，12 个内嵌图片完整保留并实际解码。另对 C056、C057、C069 的正文、表格和图片路径进行回归。

`verify-nested-tables.mjs` 默认 14 项；指定四份原样文件时为 22 项。覆盖独立列宽、真实空单元格、行结束标记、未结束行、三级嵌套、极端深度跳跃、文本框故事边界、旧 AST 兼容、HTML 转义及竖排边界。真实经典 Worker 与公开 Word 预览入口在 DPR 1/2 和 50%/100%/200% 缩放下均要求内容、表格、图片一致，销毁时清理宿主。

```bash
pnpm --filter @file-viewer/core build
pnpm --filter @file-viewer/doc build
pnpm --filter @file-viewer/renderer-word build
node packages/renderers/doc/scripts/verify-nested-tables.mjs
# 可选：NATIVE_TABLE_CORPUS_DIR 指向含 C001.doc、C056.doc、C057.doc、C069.doc 的目录。
```

测试只读取本地文件；原样身份和正文哈希固定，不将原件和正文发布到仓库。设置 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 可指定已有 Chromium。

## 结项范围

W01 的大 DOC 嵌套表格结构和四份原样的解码／内容完整性子项可按证据结项。单层、WPS、边框、合并、图片和混合旧容器已有回归继续保留。整体 Word 分页、字体度量、印章位置与桌面应用逐页外观并未由本组结构测试自动验收。真实测试结果见 `evidence/native-doc-tables-20260924/`。
