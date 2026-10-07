# DOCX 嵌入 HTML 开关与链接策略补验

## 已修复的配置断链

宿主传入 `options.docx.renderAltChunks: false` 时，选项未进入公开类型和引擎参数，C054 的内嵌 HTML 仍被创建为 iframe。现在在 core 类型中声明该可选字段，并由 Word renderer 显式转发；缺省时不注入覆盖值，保持原有引擎默认行为。

关闭后不创建 altChunk iframe，正常正文不变。开启或缺省仍使用现有空 `sandbox` 与 `no-referrer`，没有为完整预览开放脚本、同源权限或外部网络。没有修改引擎补丁、静态 Worker、依赖或锁文件；这是可选配置的向后兼容扩展。

## 原样与回归验证

C054 原件首先验证 SHA-256，并分别经真实 Worker 和主线程解析。缺省、明确开启和明确关闭三种配置均验证正文完整、内嵌文本的保留/省略、沙箱属性、脚本标记未执行及卸载。修复前的相同脚本在明确关闭的原样与生成式断言共失败4项；其他77项通过。修复后81项全部通过。

C053 在默认阻断和允许外部链接两种策略下复测：危险 `javascript:`/HTML `data:` 链接仍不可激活；允许策略中的 HTTPS 对照保留，阻断策略不开放外链，链接文字不丢失。该行为在修复前已正常，本次只补充原样验收，不将其记作新漏洞修复。未点击或访问外部目标。

4项新增选项单元测试使Word包累计101项；实际浏览器的81项包含两份原件、两份生成式样本、两条解析路径、正文哈希、iframe可见文本、沙箱及Worker销毁。没有原样目录时只执行41项生成式检查；指定目录而缺件或哈希不匹配立即失败。

```bash
pnpm --filter @file-viewer/core build
pnpm --filter @file-viewer/doc build
pnpm --filter @file-viewer/renderer-word build
WORD_EMBED_CORPUS_DIR=/path/to/neutral-originals \
  node packages/renderers/word/scripts/verify-embedded-content.mjs
```

最终执行结果见 `evidence/word-embedded-content-20261006/verification.json`。本组结清 C053/C054 所给链接与嵌入 HTML 控制子项，不扩大到全部文档安全审计、所有 altChunk 类型、真实 WebView 或未取得原件的场景。
