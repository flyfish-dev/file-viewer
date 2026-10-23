---
description: "定位负责的包、跨语言与时区协作，并准备可复现、可评审的 File Viewer 贡献。"
---

# 国际协作指南

[English](../../guide/collaboration.md)

欢迎贡献可复现的问题、文档、翻译、无障碍、示例、测试和代码。先阅读[本地开发](development.md)及
仓库 [CONTRIBUTING.md](https://github.com/flyfish-dev/file-viewer/blob/main/CONTRIBUTING.md)。

## 定位负责的包

| 范围 | 源码 | 起步检查 |
| --- | --- | --- |
| 文件加载、共享契约、事件与操作 | `packages/core` | `pnpm exec vitest run test/core-options.spec.ts` |
| 格式解析与渲染 | `packages/renderers/<family>` | 包内 `test` / `verify:*` 命令及对应 `test/*.spec.ts` |
| Vue、React、Svelte、jQuery、Web Component | `packages/components/<framework>` | 包内构建、类型检查和生命周期测试 |
| 可选能力与格式组合 | `packages/capabilities`、`packages/presets` | 对应依赖与资源检查 |
| Demo 交互与界面翻译 | `apps/viewer-demo` | Demo 类型检查、受影响单测、构建后的浏览器 smoke |
| 官网与文档 | `apps/official-site`、`apps/docs-site`、`docs` | `pnpm site:build` / `pnpm docs:build` |
| 项目脚手架与资源复制 | `packages/tools` | 工具自身测试及实际生成的消费项目 |

框架组件负责自身生命周期并使用 core 共享契约；可复用的格式修复属于 renderer 或引擎。修复通用行为，
不要识别样例文件名。不确定边界时，先在 issue 描述现象，再进行大重构。[格式矩阵](formats.md)区分
稳定支持与实验支持。

## 跨语言与时区协作

英文是共同入口，也欢迎中文。使用其他语言时，附上简短英文摘要，机器翻译请注明；评审者可能确认有歧义的
措辞。标识符、原始错误信息、文件名、路径、命令和模板标题保持原样。语言流利程度和所在地不是接受贡献的标准。

把 issue / PR 作为长期记录，写明问题、预期行为、备选方案和证据。依赖会议或私聊结论前，请先在公开线程中
补充摘要。使用 `2026-10-20` 这样的日期并注明时区，建议 UTC。评审是异步的，不承诺固定响应时间；避免
重复催促，有新证据时直接补充。

## 从想法到可评审改动

1. 搜索已有 issue、格式矩阵和目标包。Bug 请提供安全样例或可运行复现；截图无法独立定位解析问题。
2. 新 API、依赖、格式或大重构先说明设计和兼容影响；小型错字、翻译、测试和聚焦修复可以直接提交 PR。
3. 从当前 `main` 建分支，保持单一目标；需要反馈时先开 Draft PR。记录实际检查、浏览器和缺失证据。
4. 使用 issue 表单与 PR 模板，保留供解析的英文标题和复选框值；正文可使用所支持的语言。不适用项说明原因。
5. 在同一 PR 处理反馈并总结行为变化。维护者根据正确性、兼容性、许可、无障碍和必需检查进行评审与合入。

公开贡献使用 GitHub 公开仓及正常 PR 流程。维护者源码同步、包发布是独立职责，不是普通贡献的前提。
不要把私有报告、发布回执、凭据或客户文档复制进 fork。源码 README 的版本说明不代表发布了新的 npm 字节。

## 准备可复用的评审证据

| 改动 | 证据 |
| --- | --- |
| 文档或翻译 | 对应文档构建、有效链接、保持代码示例原意 |
| 共享行为或公开 API | 聚焦测试、受影响包的类型检查、使用示例 |
| 文件渲染 | 可再分发 fixture 或私有发送回执；参照软件、生成工具信息 |
| 可见 UI 与交互 | 真实浏览器检查、匹配视口与缩放的截图、键盘检查 |
| 资源路径、Worker、WASM、字体、CSP | 自托管消费项目、离线与 base-path 检查 |

相关改动应覆盖非 ASCII 文件名与文本、长翻译标签、键盘、暗色和缩放。声称支持 iPhone 时，要使用真实 iOS
Simulator 或设备中的 Safari；桌面 WebKit 模拟不足以代替。诚实记录限制，不要对测试隐藏用户界面。

私有样例与使用支持见 [SUPPORT.md](https://github.com/flyfish-dev/file-viewer/blob/main/SUPPORT.md)；漏洞见
[SECURITY.md](https://github.com/flyfish-dev/file-viewer/blob/main/SECURITY.md)，行为准则问题见
[CODE_OF_CONDUCT.md](https://github.com/flyfish-dev/file-viewer/blob/main/CODE_OF_CONDUCT.md)。
