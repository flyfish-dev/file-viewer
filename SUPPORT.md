# 支持与反馈

File Viewer 是一个公开维护的开源项目。通用使用问题、可公开复现的 Bug、兼容性反馈和改进建议，应优先通过文档、Demo 和 GitHub issue 处理；涉及敏感文件、确定交付范围或固定响应时间的需求，应使用企业技术支持。

## 推荐求助路径

- 使用问题：先查看 [文档](https://doc.file-viewer.app) 和 [FAQ](https://doc.file-viewer.app/guide/faq)
- 在线验证：使用 [Demo](https://demo.file-viewer.app) 打开示例文件或上传脱敏文件
- Bug / 兼容性问题：提交 GitHub issue，并尽量附上完整复现信息
- 新格式 / 新框架支持：提交 feature request，说明业务场景、文件来源和实际优先级
- 私有化部署问题：说明部署方式、静态资源路径、CSP、浏览器环境和失败资源
- 敏感文件、定制兼容或明确期限：[企业技术支持](https://dev.flyfish.group/shop)

## 提交 issue 前请准备

- 文件类型、文件来源和生成软件
- 浏览器、操作系统、移动端 WebView 信息
- 使用的包名和准确版本
- 接入方式：Vue / React / Web Component / script 标签 / jQuery / Svelte
- 是否使用 `@file-viewer/*-full`、preset 或独立 renderer
- 控制台错误、网络失败资源、截图或最小复现
- 能够公开上传的脱敏样本；无法公开时请描述文件结构和失败现象

## 样本文件安全

不要在公开 issue 中上传含有隐私、商业合同、客户资料、身份证件、内部系统截图、源代码或其他敏感信息的文件。优先制作脱敏样本；确实需要分析原始敏感文件时，应通过单独约定范围、保密和交付边界的企业支持处理。

## 社区赞助

如果 File Viewer 为个人或团队节省了研发、部署或服务器转码成本，可以通过赞助支持公共版本持续维护：

- [完整中文赞助说明](https://doc.file-viewer.app/zh/donate)
- [GitHub Sponsors](https://github.com/sponsors/wybaby168?metadata_campaign=file-viewer-support)
- [微信 / 支付宝一次性赞赏](https://dev.flyfish.group/sponsor?source=file-viewer-support)

赞助用于真实文件兼容、回归测试、Worker/WASM 与离线资产、文档示例和版本维护。赞助不是隐藏的付费 issue 队列，不保证指定功能或 Bug 在特定日期完成；除非公开档位明确说明，否则不包含 SLA、私下咨询或敏感文件分析。

## 企业技术支持

以下需求更适合通过 [企业技术支持](https://dev.flyfish.group/shop) 单独确认：

- 私有化、纯内网或特殊 CSP 环境部署
- 指定业务文件的兼容性修复
- 需要合同、发票、保密约定或验收标准
- 需要确定交付范围、排期或响应时间
- 与现有系统、WebView、权限或文件服务的定制集成

企业服务与社区赞助相互独立。无论是否赞助，公开功能、文档、许可和正常 issue 处理规则都不会改变。
