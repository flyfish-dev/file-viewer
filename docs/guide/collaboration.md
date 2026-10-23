---
description: "Find the right package, coordinate across languages and time zones, and prepare a focused File Viewer contribution."
---

# International Collaboration

[简体中文](../zh/guide/collaboration.md)

You can help with reproducible bugs, documentation, translations, accessibility, examples,
tests, or code. Start with [local development](development.md) and the repository's
[contribution guide](https://github.com/flyfish-dev/file-viewer/blob/main/CONTRIBUTING.md).

## Find the right place

| Area | Source | Useful starting check |
| --- | --- | --- |
| Source loading, shared contracts, events and operations | `packages/core` | `pnpm exec vitest run test/core-options.spec.ts` |
| Format parsing and rendering | `packages/renderers/<family>` | The package's `test` / `verify:*` scripts and the corresponding `test/*.spec.ts` |
| Vue, React, Svelte, jQuery and Web Component integrations | `packages/components/<framework>` | The package's build / type-check scripts and lifecycle tests |
| Optional features and format bundles | `packages/capabilities`, `packages/presets` | Their dependency / asset checks |
| Demo interaction and language copy | `apps/viewer-demo` | Demo type-check, affected unit tests, then the built browser smoke |
| Official website and documentation | `apps/official-site`, `apps/docs-site`, `docs` | `pnpm site:build` / `pnpm docs:build` |
| Scaffolding and asset copying | `packages/tools` | The tool's own tests and a generated consumer project |

Framework packages own their lifecycle and consume shared core contracts. A reusable format fix
belongs to its renderer or engine. Fix the general behavior rather than recognizing a sample's
filename. For an uncertain boundary, describe the observed behavior in an issue before a large
refactor. The [format matrix](formats.md) distinguishes stable and experimental support.

## Work across languages and time zones

English is the shared entry language and Chinese is also welcome. When using another language,
add a short English summary; label machine translations. Reviewers may ask about ambiguous wording.
Keep identifiers, literal error messages, filenames, paths, commands and template headings intact.
Language fluency and location are not acceptance criteria.

Use the issue or PR as the durable record: state the problem, proposed behavior, alternatives,
and evidence. Summarize meetings or private discussions before relying on their decisions. Use
dates such as `2026-10-20` and explicit time zones, preferably UTC. Review is asynchronous and
does not imply a guaranteed response time. Avoid repeated pings; add new evidence when available.

## From an idea to a reviewed change

1. Search existing issues, the format matrix and the target package. Report a bug with a safe
   fixture or runnable reproduction; screenshots alone cannot explain a parser failure.
2. For a new API, dependency, file format or broad refactor, describe the design and compatibility
   impact first. Small typo, translation, test and focused bug fixes can start as a PR.
3. Branch from current `main`. Keep a contribution focused; use a draft PR when feedback is needed.
   Record actual checks, supported browsers and any missing evidence.
4. Use the issue form and PR template. Keep the parsed English headings and checkbox values;
   write the prose in your preferred supported language. Explain an inapplicable field with a reason.
5. Resolve review feedback in the same PR and summarize behavioral changes. Maintainers review
   correctness, compatibility, licensing, accessibility and the required checks before landing.

Public contributors use the public GitHub repository and its normal PR workflow. Maintainer source
synchronization and package publication are separate duties; they are not prerequisites for a
contribution. Do not copy private reports, release receipts, credentials or customer documents into
your fork. A version in a source README does not mean new package bytes have been published.

## Prepare evidence reviewers can reuse

| Change | Evidence |
| --- | --- |
| Documentation or translation | Relevant docs build; valid links and unchanged code examples |
| Shared behavior or public API | Focused tests, affected package types and usage example |
| File rendering | Redistributable fixture or private-delivery receipt; reference app / producer details |
| Visible UI or interaction | Actual browser checks and screenshots at matched viewport / zoom; keyboard checks |
| Asset paths, Worker, WASM, fonts or CSP | A self-hosted consumer and offline / base-path checks |

Test with non-ASCII names and text, long translated labels, keyboard input, dark mode and zoom
when relevant. An iPhone claim requires Safari in an actual iOS Simulator or device; desktop
WebKit emulation alone is insufficient. Record limitations honestly rather than hiding UI from tests.

For private samples and usage support, see
[SUPPORT.md](https://github.com/flyfish-dev/file-viewer/blob/main/SUPPORT.md). Report vulnerabilities
through [SECURITY.md](https://github.com/flyfish-dev/file-viewer/blob/main/SECURITY.md), and conduct
concerns through [CODE_OF_CONDUCT.md](https://github.com/flyfish-dev/file-viewer/blob/main/CODE_OF_CONDUCT.md).
