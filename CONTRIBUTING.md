# Contributing to File Viewer

[English](#contributing-to-file-viewer) · [简体中文](#中文说明)

Thank you for improving File Viewer. The repository covers many file producers, browsers,
frameworks, Workers, WASM modules, and private-deployment layouts, so reproducible evidence matters
more than a long report. These rules keep reports actionable without asking contributors to run the
maintainer-only release pipeline.

Start with the [development guide](docs/guide/development.md),
[international collaboration guide](docs/guide/collaboration.md), and
[translation guide](docs/guide/translations.md). Documentation, translations, accessibility,
examples, reproductions, and code are all useful contributions.

## Languages and asynchronous collaboration

English is the shared entry language; Chinese reports and replies are also welcome. You may use
another language and add a short English summary, including machine translation marked as such.
Ask for clarification when wording is uncertain; language fluency is not an acceptance criterion.
Keep API names, commands, logs, paths, PR template headings, and issue-form options unchanged.

Keep decisions and reproduction steps in the issue or PR so contributors in other time zones can
participate. Use ISO dates and explicit time zones (prefer UTC) for coordination. Summarize an
offline discussion in the public thread before relying on its decisions. Reviews are asynchronous;
do not assume an immediate response or an SLA. Draft PRs and focused documentation fixes are welcome.

## Choose the right issue form

- **Bug report:** API, component, packaging, Worker/WASM, performance, interaction, or regression bugs.
- **File compatibility report:** a real file does not open or differs from its reference application.
- **Feature request:** one focused user outcome, format, API, integration, deployment, or documentation improvement.
- **Security:** use [GitHub private vulnerability reporting](https://github.com/flyfish-dev/file-viewer/security/advisories/new); do not publish exploitable details.

Blank issues are disabled so the minimum reproduction data is collected once instead of through
multiple maintainer follow-ups.

## Bug reports require a sample

Every bug must include one of the following before it is triaged:

1. a public or sanitized attachment;
2. a public download link or runnable minimal reproduction; or
3. a private sample already sent to `admin@flyfish.dev`.

For private delivery, write this receipt in the issue without exposing the file:

```text
Sent to admin@flyfish.dev on YYYY-MM-DD: filename.ext
```

A screenshot is useful for comparison but is not a substitute for the affected file or runnable
project. Do not create a sample by only renaming another extension. Public attachments must be
sanitized and safe to redistribute as regression fixtures. Never publish customer documents,
contracts, credentials, personal data, internal URLs, or private screenshots.

If the full file is sensitive, a reduced sample that preserves the failing XML record, object,
font, codec, archive entry, sheet, slide, or page is preferred. Maintainers may store private
samples outside Git and commit only a generated, license-safe regression fixture.

## Local development

Use Node.js and pnpm versions declared by the repository:

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm type-check
pnpm docs:build
pnpm verify:github-governance
```

Run a focused test for the changed package or renderer. Useful repository-level checks include:

```bash
pnpm verify:public-release-facts
pnpm test
pnpm build
pnpm verify:browser-smoke
```

Build the demo before running the browser smoke. For a focused renderer change, run the relevant
`test/*.spec.ts` file with `pnpm exec vitest run test/<name>.spec.ts` and retain any needed browser evidence.

## Pull request evidence contract

Keep one PR focused on one outcome. The PR template and `PR Governance` check enforce a small,
predictable contract:

- use a `type(scope): concise outcome` title;
- link the issue, or write `N/A: <specific reason>` for maintenance-only work;
- list commands that were actually run and their results;
- provide a public/repository fixture or private-sample receipt for format/rendering changes;
- include Visual evidence for user-visible changes;
- identify affected packages/formats, compatibility risk, and rollback;
- complete the privacy, test, documentation, and offline-asset confirmations.

Visual evidence means at least one screenshot in the PR body. Matched before/after screenshots at
the same viewport and zoom are preferred for rendering changes. A non-visual change may use
`N/A: <specific reason>`; do not create decorative screenshots just to satisfy automation.

The metadata check reads only the PR title and body from the trusted default branch. The normal
`Public CI` workflow still builds and tests the proposed code. Passing the metadata check is not a
replacement for targeted tests or browser verification.

## Change-specific expectations

- Renderer changes need a real or generated license-safe fixture and a focused parser/browser assertion.
- Component API changes need matching types and documentation for affected ecosystems.
- Worker, WASM, font, vendor, base-path, MIME, or CSP changes need an offline/private-deployment check.
- User-visible behavior needs a screenshot and, when interaction matters, a real browser test.
- Documentation-only changes may run `pnpm docs:build` and mark unrelated evidence as not applicable.
- Do not add runtime CDN dependencies. File Viewer must remain offline-deployable.
- Do not commit secrets, `.env` files, private samples, generated caches, or unrelated workspace changes.

## Ownership and scope

Fix the owning package rather than adding sample-specific workarounds. Core remains framework-free;
framework behavior belongs in its component package; reusable format behavior belongs in the
renderer or maintained engine dependency. If ownership is uncertain, describe the observed boundary
in the issue or PR and let maintainers route it.

## 中文说明

本节是上文英文版的完整中文对照；如有出入，以英文版为准。

从[本地开发](docs/zh/guide/development.md)、[国际协作](docs/zh/guide/collaboration.md)和
[翻译指南](docs/zh/guide/translations.md)开始。文档、翻译、无障碍、示例、复现和代码都欢迎贡献。

### 语言与异步协作

英文是共同入口，也欢迎中文报告和回复。使用其他语言时，请附一段简短英文摘要；机器翻译请注明。
措辞不清时主动确认，语言流利程度不作为接受贡献的标准。API 名称、命令、日志、路径、PR 模板标题和
issue 表单选项请保持原样，以免破坏复现或自动校验。

把决策和复现步骤留在 issue / PR，方便不同时区的贡献者参与。约定时间使用 ISO 日期和明确时区，建议 UTC。
依赖线下讨论的结论前，请先在公开线程中补上摘要。评审是异步的，不承诺即时响应或 SLA；欢迎先提交
Draft PR，也欢迎聚焦的文档修正。

### 选择合适的 issue 表单

- **Bug report:** API、组件、打包、Worker/WASM、性能、交互或回归问题。
- **File compatibility report:** 某个真实文件打不开，或与原生应用显示不一致。
- **Feature request:** 一个聚焦的用户目标、格式、API、集成、部署或文档改进。
- **Security:** 使用 [GitHub 私密漏洞报告](https://github.com/flyfish-dev/file-viewer/security/advisories/new)，不要公开可利用细节。

空白 issue 已关闭，这样最少的复现信息可以一次收齐，而不是靠维护者多轮追问。

### Bug 必须附带样例

每个 bug 在分诊前必须提供以下之一:

1. 公开或脱敏后的附件；
2. 公开下载链接或可运行的最小复现；
3. 已发送到 `admin@flyfish.dev` 的私有样例。

私下发送时，请在 issue 中写下这条回执，而不要暴露文件本身:

```text
Sent to admin@flyfish.dev on YYYY-MM-DD: filename.ext
```

截图便于对比，但不能替代出问题的文件或可运行工程。不要只靠改扩展名来"制造"样例。公开附件必须已经脱敏，
并且可以作为回归 fixture 再分发。不要公开客户文档、合同、凭据、个人数据、内部 URL 或私密截图。

如果完整文件比较敏感，更推荐提供保留了出错 XML 记录、对象、字体、编解码器、压缩包条目、工作表、幻灯片或页面的
精简样例。维护者可能把私有样例保存在 Git 之外，只提交生成的、许可证安全的回归 fixture。

### 本地开发

使用仓库声明的 Node.js 与 pnpm 版本:

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm type-check
pnpm docs:build
pnpm verify:github-governance
```

针对改动的包或 renderer 运行聚焦测试。常用的仓库级检查见上文英文版命令列表。运行浏览器 smoke 前先构建 Demo；
聚焦的 renderer 改动可以用 `pnpm exec vitest run test/<name>.spec.ts` 运行对应 `test/*.spec.ts`，并保留需要的浏览器证据。

### PR 证据约定

一个 PR 只解决一个问题。PR 模板和 `PR Governance` 检查执行一份简短、可预期的约定:

- 标题使用 `type(scope): concise outcome`；
- 关联 issue，纯维护类工作写 `N/A: <具体原因>`；
- 列出实际执行过的命令和结果；
- 格式 / 渲染改动提供公开或仓库内 fixture，或私有样例回执；
- 用户可见改动提供 Visual evidence（截图）；
- 写明受影响的包 / 格式、兼容风险和回滚方式；
- 完成隐私、测试、文档和离线资源确认项。

Visual evidence 指 PR 正文里至少一张截图；渲染改动最好提供相同视口和缩放下的前后对比。非视觉改动可以写
`N/A: <具体原因>`，不要为了通过自动化而制作装饰性截图。

元数据检查只从受信任的默认分支读取 PR 标题和正文；正常的 `Public CI` 仍会构建和测试提交的代码。元数据检查
通过不能替代针对性的测试或浏览器验证。

### 不同改动的要求

- Renderer 改动需要真实或生成的、许可证安全的 fixture，以及聚焦的解析 / 浏览器断言。
- 组件 API 改动需要同步受影响生态的类型和文档。
- Worker、WASM、字体、vendor、base-path、MIME 或 CSP 改动需要做离线 / 私有化部署检查。
- 用户可见行为需要截图；交互相关时还需要真实浏览器测试。
- 纯文档改动可以只运行 `pnpm docs:build`，其他证据标为不适用。
- 不要增加运行时 CDN 依赖，File Viewer 必须保持可离线部署。
- 不要提交密钥、`.env` 文件、私有样例、生成缓存或无关的工作区改动。

### 归属与范围

修复应落在负责的包里，而不是加针对某个样例的绕过。core 保持与框架无关；框架行为属于对应组件包；可复用的格式
行为属于 renderer 或维护中的引擎依赖。不确定归属时，在 issue 或 PR 中描述观察到的边界，由维护者分派。
