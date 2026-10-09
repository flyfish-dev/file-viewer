# @file-viewer/capability-mermaid

导入后为 Markdown 内嵌 Mermaid 代码块注册 Mermaid loader。standard 默认不安装。

当前源码通过正常构建，将 Mermaid 12.1.0 与 KaTeX 0.18.2 打入包内，并通过 `@file-viewer/capability-mermaid/engine` 为绘图渲染器提供相同引擎。应用安装当前候选无需配置依赖安全 overrides。`dist/bundled-runtime.json` 记录实际输入版本、锁文件和源码哈希、许可文本及输出文件哈希；完整第三方许可位于 `dist/THIRD_PARTY_LICENSES.txt`。

构建源码需要 Node.js 22.12 或更高版本，这是 Mermaid 12 的构建依赖要求。发布包提供编译后的浏览器引擎，应用不需要安装原始 Mermaid 包。

Node20 消费兼容性由独立的 Node20.20.2 安装与浏览器构建验证。设置 `FILE_VIEWER_CONSUMER_NODE` 和 `FILE_VIEWER_CONSUMER_NPM_CLI` 为该运行时的 Node 二进制和 npm CLI 路径后，以构建源码的 Node 运行 `node scripts/verify-packed-browser.mjs --node20-consumer`。Public CI 同时执行普通 Vite 消费检查和这一独立消费检查。

数学标签默认使用 KaTeX MathML，不请求外部字体或样式。带数学标签的图使用经过资源策略检查和 DOMPurify 清理的 `foreignObject`；普通图继续使用 SVG 标签。

`pnpm --filter @file-viewer/capability-mermaid verify:packed-browser` 在空缓存、无安全 overrides 的独立消费项目中核验打包文件与两种依赖审计，并在 Chromium、WebKit 中检查 Markdown 和绘图的实际图形、数学标签、带参与者配置的时序图与离线请求。这些检查对应源码候选；npm 已发布的 3.1.2 仍使用旧依赖图。
