# Development

> **Maintainer-only commands:** this page contains complete-workspace release or verification examples that are not part of the public checkout. Public contributors should use the commands in `/README.md` or `/docs/guide/development.md`.

<!-- FILE_VIEWER_MAINTAINER_COMMANDS -->

This page describes the reproducible workflow available in the public GitHub checkout. Maintainer-only release, deployment and repository synchronization tooling lives outside the public workspace.

## Requirements

- Node.js 24
- pnpm 11
- A current Chromium-based browser for the smoke test

## Install and run

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Run the component examples instead of the product demo with:

```bash
pnpm dev:components
```

## Quality gates

```bash
pnpm type-check
pnpm test
pnpm build
pnpm docs:build
pnpm exec playwright install chromium
pnpm verify:browser-smoke
```

The browser smoke opens the built demo with an English Markdown sample, validates English metadata, and checks the sample picker at desktop and 390 px mobile widths.

## Repository layout

- `packages/core`: framework-independent TypeScript contracts and runtime.
- `packages/renderers`: format-focused rendering pipelines.
- `packages/presets`: lite, office, engineering and all presets plus the Vite plugin.
- `packages/components`: native ecosystem components and full packages.
- `apps/viewer-demo`: authoritative offline assets, samples and the product demo.
- `docs`: documentation source.

Please keep runtime assets local and avoid introducing third-party CDN dependencies. Focused fixes, sanitized regression samples and compatibility reports are welcome.
