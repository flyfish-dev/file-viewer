# Contributing to File Viewer

Thank you for improving File Viewer. The repository covers many file producers, browsers,
frameworks, Workers, WASM modules, and private-deployment layouts, so reproducible evidence matters
more than a long report. These rules keep reports actionable without asking contributors to run the
maintainer-only release pipeline.

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
pnpm verify:format-support
pnpm verify:ecosystem-readmes
pnpm verify:offline-assets
pnpm verify:demo-output
```

`pnpm verify:migration-gates` and release-channel checks are maintainer gates. Contributors do not
need to run them unless a maintainer specifically requests it.

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

Bug 和文件兼容问题必须在提交时提供可复现样例，可选择公开/脱敏附件、公开链接，或先把
私有样例发送到 `admin@flyfish.dev`，然后在 Issue 中记录发送日期和文件名。截图只能说明
现象，不能替代原文件或最小复现工程。

PR 不要求普通贡献者运行完整发版流程，但必须写清实际执行过的命令和结果。涉及格式或
渲染时提供 fixture；涉及用户可见效果时提供截图；纯文档、重构等非视觉改动可以写
`N/A: 具体原因`。仓库会自动校验标题、说明结构、验证证据、样例和截图，代码本身仍由
Public CI 构建和测试。
