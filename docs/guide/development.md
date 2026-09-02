---
description: "Set up the File Viewer monorepo, run focused builds and browser checks, and follow the required verification sequence before a release."
---

# Local Development

<div class="doc-kicker">Build, Verify, Release</div>

## Install

```bash
pnpm install
```

## Common Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Run the main demo |
| `pnpm docs:dev` | Run the documentation site |
| `pnpm site:dev` | Run the official site |
| `pnpm build-only` | Build the main demo |
| `pnpm docs:build` | Build documentation |
| `pnpm site:build` | Build the official site |
| `pnpm verify:format-support` | Verify 265 registered extensions (223 stable, 42 experimental) and 44 renderer pipelines stay documented |
| `pnpm verify:renderer-assets` | Verify runtime assets are included in renderer packages and web builds |
| `pnpm verify:browser-smoke` | Run demo and component browser smoke tests |

## Release Gate

Before publishing packages or deploying production, run the focused checks for the area you changed. Renderer and asset changes should at least pass:

```bash
pnpm build-only
pnpm docs:build
pnpm verify:format-support
pnpm verify:renderer-assets
pnpm verify:smoke-matrix
pnpm verify:npm-install-smoke
```

Use `pnpm verify:migration-gates` for a broader migration gate.
