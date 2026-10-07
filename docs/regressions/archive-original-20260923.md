# 压缩包文件名与子文件原样验收

C009 原 ZIP 的 SHA-256 为 `dbbb2ba181355380d245d43fa768f4500485c57a34a61522e129d597038e0f52`。三个条目均是未设置 UTF-8 标志的 GBK 文件名，其中包含圈号；两个 TXT 和一个文本内容的 DOC 均为 GBK 正文。

此次直接读取原 ZIP 的本地存储头和数据段，独立生成名称、内容字节与正文的预期；浏览器运行实际 Archive renderer、JSZip 提取、预设注册的 Text/Word renderer，不替换子预览。中文与圈号搜索、三个子文件正文、下载数据及卸载均通过，共 8 项。

原有文件名解码与文本型 DOC 路由已能够处理这一原样，复测通过不重复计为新修复。上批另补充的符号型 GBK 文件名保护保持不变。

下载链接的 `download` 属性为正确的原始解码名称，实际保存的数据哈希相符；但当前内存测试页面的浏览器建议文件名返回默认值。报告单列 `downloadFilenameAccepted: false`，没有据属性正确就把目标宿主保存名判为通过。加密 ZIP、RAR 和其他代码页不在此原样结论内。

```sh
pnpm --filter @file-viewer/core build
pnpm --filter @file-viewer/doc build
ARCHIVE_ORIGINAL_SAMPLE=/path/to/C009.zip node packages/renderers/archive/scripts/verify-original-zip.mjs
```

测试必须提供哈希匹配原件，不以生成式内容替代。需要 Playwright/Chromium 与工作区依赖，可用 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 指定现有浏览器。证据在 `evidence/archive-original-20260923/report.json`；截图只在本地验收交付包中保存。
