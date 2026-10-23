# Security Policy

[English](#security-policy) · [简体中文](#中文说明)

File Viewer runs in the browser and processes files chosen by users or passed in by host
applications. Do not upload sensitive files, internal documents, customer data, or unsanitized
samples to public issues.

## Reporting a vulnerability

If you find a potential security issue, such as XSS, arbitrary script execution, sensitive data
exposure, unauthorized downloads, unsafe URL handling, or stability problems triggered by malicious
files, contact the maintainers privately first:

- [GitHub Private Vulnerability Reporting](https://github.com/flyfish-dev/file-viewer/security/advisories/new)
- Email: admin@flyfish.dev

Please include:

- Impact and reproduction steps
- Affected file types, renderers, or component packages
- Browser environment
- Whether a specific deployment configuration is required to trigger it
- A minimal reproduction that can be made public, or a sanitized description

## Supported versions

The `3.x` release line is actively maintained. Legacy `@flyfish-group/*` packages continue to
receive critical fixes, but new projects should use the standard `@file-viewer/*` package names.

## Handling principles

- Exploitable details of unfixed issues are not discussed in public issues.
- Issues affecting default configurations, the demo, component packages, and self-hosted static
  asset paths are fixed first.
- After a security fix ships, the changelog or release notes describe the impact and the upgrade
  recommendation.

## Vue 2 compatibility boundary

`@file-viewer/vue2.6` and `@file-viewer/vue2.7` are compatibility components for existing systems.
Vue is only a peer dependency and is never bundled into File Viewer output. The repository's Vue 2
compatibility tests use only the runtime-only build and trusted static SFCs; they never call
`Vue.compile` and never accept user-controlled Vue template strings.

Vue 2 has reached upstream end of life. New projects should use `@file-viewer/vue3`; host systems
that must stay on Vue 2 should not compile untrusted templates at runtime.

## Dependency Audit Boundaries

The audit includes development dependencies and runs against the official npm registry before release builds. Vue 2 remains an explicitly documented compatibility exception.

The former `adm-zip` exception is retired. The workspace now resolves `adm-zip@0.6.1` or newer, which addresses `GHSA-vwc7-r8mq-g2x9` and `GHSA-7q85-xj36-vmfc`; CI and release rehearsal audit the complete lockfile against the official npm registry.

## 中文说明

File Viewer 运行在浏览器端，会处理用户选择或业务系统传入的文件。请不要在公开 issue 中上传敏感文件、内部文档、客户资料或未脱敏样本。

### 报告安全问题

如果你发现潜在安全问题，例如 XSS、任意脚本执行、敏感信息泄露、越权下载、危险 URL 处理或恶意文件导致的稳定性问题，请优先通过私下渠道联系维护者:

- [GitHub Private Vulnerability Reporting](https://github.com/flyfish-dev/file-viewer/security/advisories/new)
- Email: admin@flyfish.dev

请包含:

- 影响范围和复现步骤
- 受影响的文件类型、renderer 或组件包
- 浏览器环境
- 是否需要特定部署配置才能触发
- 可公开的最小复现，或脱敏后的说明

### 支持版本

当前主要维护 `3.x` 版本线。历史 `@flyfish-group/*` 包会继续同步关键修复，但新项目建议使用 `@file-viewer/*` 标准包名。

### 处理原则

- 不在公开 issue 中讨论尚未修复的可利用细节。
- 优先修复会影响默认配置、Demo、组件包和 self-hosted 静态资源路径的问题。
- 安全修复发布后，会在 changelog 或 release notes 中说明影响范围和升级建议。

### Vue 2 兼容边界

`@file-viewer/vue2.6` 和 `@file-viewer/vue2.7` 是面向存量系统的兼容组件，Vue 仅作为 peer dependency，不会打包进 File Viewer 产物。仓库内的 Vue 2 兼容测试只使用 runtime-only build 和受信任的静态 SFC，不调用 `Vue.compile`，也不接受用户可控的 Vue 模板字符串。

Vue 2 已终止上游维护。新项目应优先使用 `@file-viewer/vue3`；必须继续使用 Vue 2 的宿主系统，不应在运行时编译不可信模板。

### 依赖审计边界

审计范围包含开发依赖，并在发布构建前针对官方 npm registry 执行。Vue 2 仍是明确记录的兼容性例外。

此前的 `adm-zip` 例外已取消。工作区现在解析到 `adm-zip@0.6.1` 或更新版本，已修复 `GHSA-vwc7-r8mq-g2x9` 和 `GHSA-7q85-xj36-vmfc`；CI 与发布演练会针对官方 npm registry 审计完整的 lockfile。
