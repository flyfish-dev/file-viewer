# 支持方式

File Viewer 是一个开源项目，适合通过 GitHub issue 讨论公开问题、复现样例和改进建议。

## 推荐求助路径

- 使用问题: 先看 [文档](https://doc.file-viewer.app) 和 [FAQ](https://doc.file-viewer.app/guide/faq)
- 在线验证: 使用 [Demo](https://demo.file-viewer.app) 上传脱敏文件或打开示例文件
- Bug / 兼容性问题: 提交 GitHub issue，并尽量附上复现信息
- 新格式 / 新框架支持: 提交 feature request，说明业务场景和优先级
- 私有化部署: 说明部署方式、静态资源路径、CSP、浏览器环境和失败资源

## 提 issue 前请准备

- 文件类型和文件来源
- 浏览器、操作系统、移动端 WebView 信息
- 使用的包名和版本
- 接入方式: Vue / React / Web Component / script 标签 / jQuery / Svelte
- 是否使用 `@file-viewer/*-full`、preset 或独立 renderer
- 控制台错误、网络失败资源、截图或最小复现

## Bug 样例要求与安全

Bug 和文件兼容问题必须提供以下三种证据之一:

1. GitHub Issue 中的公开或脱敏附件；
2. 可公开下载的样例或最小复现工程链接；
3. 已发送到 `admin@flyfish.dev` 的私有样例，并在 Issue 中写明
   `Sent to admin@flyfish.dev on YYYY-MM-DD: filename.ext`。

A screenshot alone is not sufficient：截图可以帮助比较现象，但不能替代真实文件或可运行复现。
不要上传含有隐私、商业合同、客户资料、身份证件、内部系统截图、Token 或其他敏感信息的文件。
公开附件必须已经脱敏并允许作为回归样例再分发。私有样例不会提交到开源仓库；必要时只会据此构造
不含业务信息、许可证边界清晰的最小 fixture。

## 赞助与企业支持

- 支持开源维护: [GitHub Sponsors](https://github.com/sponsors/wybaby168)
- 国内一次性赞赏: [微信 / 支付宝](https://dev.flyfish.group/sponsor?source=github)
- 私有化、定制兼容或明确响应时间: [企业技术支持](https://dev.flyfish.group/shop)

赞助不影响开源功能和 issue 的公开处理规则。除非对应赞助档位有明确说明，否则赞助不包含 SLA 或固定响应时间。
