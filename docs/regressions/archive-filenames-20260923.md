# 压缩包旧编码文件名修复

修复仅含圈号、全角符号或 CJK 标点的 GBK 文件名无法解码、无法选择 ZIP 回退路径的问题。原判断只接受汉字；现在对合法 GBK 使用有限的文字/符号证据。GBK 解码改为严格模式，拒绝仅有合法前缀但末尾损坏的输入。无 UTF-8 标志但字节本身是合法 UTF-8 的文件名不再误判为 GBK。

保留 UTF-8 优先、ZIP Unicode extra field 优先及加密 ZIP 不回退的边界。不把任意未知旧编码保证为 GBK，也不改写提取的子文件字节。

验证：`pnpm --filter @file-viewer/renderer-archive build` 后执行 `node packages/renderers/archive/scripts/verify-zip-filename-encoding.mjs`。本地真实 JSZip 提取及 10 项检查通过。包含纯符号 GBK、未标志 UTF-8、标志 UTF-8、畸形 GBK、ASCII、空值、非 ZIP、加密 ZIP、Unicode extra field 和原始内容字节。原样归档的端到端检查另行记录，不以本组生成用例代替原稿验收。
