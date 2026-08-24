# 安全策略

File Viewer 运行在浏览器端，会处理用户选择或业务系统传入的文件。请不要在公开 issue 中上传敏感文件、内部文档、客户资料或未脱敏样本。

## 报告安全问题

如果你发现潜在安全问题，例如 XSS、任意脚本执行、敏感信息泄露、越权下载、危险 URL 处理或恶意文件导致的稳定性问题，请优先通过私下渠道联系维护者:

- [GitHub Private Vulnerability Reporting](https://github.com/flyfish-dev/file-viewer/security/advisories/new)
- Email: admin@flyfish.dev

请包含:

- 影响范围和复现步骤
- 受影响的文件类型、renderer 或组件包
- 浏览器环境
- 是否需要特定部署配置才能触发
- 可公开的最小复现，或脱敏后的说明

## 支持版本

当前主要维护 `2.x` 版本线。历史 `@flyfish-group/*` 包会继续同步关键修复，但新项目建议使用 `@file-viewer/*` 标准包名。

## 处理原则

- 不在公开 issue 中讨论尚未修复的可利用细节。
- 优先修复会影响默认配置、Demo、组件包和 self-hosted 静态资源路径的问题。
- 安全修复发布后，会在 changelog 或 release notes 中说明影响范围和升级建议。

## Vue 2 兼容边界

`@file-viewer/vue2.6` 和 `@file-viewer/vue2.7` 是面向存量系统的兼容组件，Vue 仅作为 peer dependency，不会打包进 File Viewer 产物。仓库内的 Vue 2 兼容测试只使用 runtime-only build 和受信任的静态 SFC，不调用 `Vue.compile`，也不接受用户可控的 Vue 模板字符串。

Vue 2 已终止上游维护。新项目应优先使用 `@file-viewer/vue3`；必须继续使用 Vue 2 的宿主系统，不应在运行时编译不可信模板。
