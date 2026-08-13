# Runnable integration examples

These projects are intentionally small, self-contained starting points built against the public `2.2.9` packages. Each one has a local sample, a file picker, production asset copying, and a real build command.

| Example                                      | Best for                                         | Capability path                                       |
| -------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------- |
| [`vanilla-vite`](./vanilla-vite)             | Framework-free apps and Web Components           | `@file-viewer/web` + `preset-lite`                    |
| [`react-vite`](./react-vite)                 | React 18/19 applications                         | `@file-viewer/react` + `preset-office`                |
| [`vue3-vite`](./vue3-vite)                   | Vue 3 applications that want the complete matrix | `@file-viewer/vue3-full` + all 208 extension mappings |
| [`vue2.6-cli3-office`](./vue2.6-cli3-office) | Legacy Vue 2.6 / Vue CLI 3 / webpack 4 systems   | Office preset + explicit image/video/CAD/3D renderers |

## Run from the source workspace

A public checkout links these examples to the local package sources. Build those packages once, then start any example:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm --dir examples/vanilla-vite dev
pnpm --dir examples/react-vite dev
pnpm --dir examples/vue3-vite dev
```

Build every modern example with:

```bash
pnpm build:examples
```

## Use as a standalone starter

Copy one example directory outside this monorepo, then run `pnpm install && pnpm dev`. Its normal `^2.2.9` dependency ranges install the published packages from npm; the workspace-only overrides are not copied with it.

The examples keep their viewer assets local through `@file-viewer/vite-plugin`. Replace the bundled sample with your own URL or `File`, and choose `preset-lite`, `preset-office`, `preset-engineering`, `preset-all`, or a matching full package according to your format and bundle requirements.

Presentation files use two independent routes: binary `.ppt` is rendered by the packaged `@file-viewer/ppt@0.3.3` Worker/OffscreenCanvas/WASM runtime, while `.pptx` is rendered by `@file-viewer/pptx`. Office preset and Full examples publish the complete verified `vendor/ppt/` payload automatically. File Viewer-authored code remains Apache-2.0; the bundled PPT runtime keeps its own included LICENSE and NOTICE.

The Vue 2.6 project is deliberately kept outside the modern pnpm workspace because its Vue CLI 3 / webpack 4 dependency graph is a standalone compatibility harness.
