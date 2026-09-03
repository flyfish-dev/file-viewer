# 参与开发

> **Maintainer-only commands:** this page contains complete-workspace release or verification examples that are not part of the public checkout. Public contributors should use the commands in `/README.md` or `/docs/guide/development.md`.

<!-- FILE_VIEWER_MAINTAINER_COMMANDS -->

本页只描述 GitHub 公开 checkout 中可重复执行的开发流程。发布、部署和仓库同步等维护者操作保留在完整私有工作区，不在公开仓暴露无效命令。

## 环境要求

- Node.js 24
- pnpm 11
- 用于轻量 smoke 的现代 Chromium 浏览器

## 安装与启动

```bash
pnpm install --frozen-lockfile
pnpm dev
```

启动生态组件示例：

```bash
pnpm dev:components
```

## 公开仓质量门禁

```bash
pnpm type-check
pnpm test
pnpm build
pnpm docs:build
pnpm exec playwright install chromium
pnpm verify:browser-smoke
```

浏览器 smoke 会打开构建后的 demo 英文 Markdown 示例，检查英文分享元数据，并分别验证桌面端和 390 px 移动端的示例选择器。

## 目录说明

- `packages/core`：框架无关的 TypeScript 合约与运行时。
- `packages/renderers`：按格式聚合的渲染管线。
- `packages/presets`：lite、office、engineering、all preset 与 Vite 插件。
- `packages/components`：各生态原生组件与 full 包。
- `apps/viewer-demo`：权威离线资源、样例和产品 demo。
- `docs`：文档源码。

运行时资源必须可本地部署，不应新增第三方 CDN 依赖。欢迎提交聚焦修复、脱敏回归样例和兼容性报告。
