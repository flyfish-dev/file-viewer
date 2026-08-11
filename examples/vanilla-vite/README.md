# Vanilla JS + Web Component + Vite

A framework-free starter using the lightweight Web Component and `preset-lite`. It previews text, code, Markdown, images, audio, and video while keeping the initial dependency set compact.

After copying this directory outside the monorepo:

```bash
pnpm install
pnpm dev
```

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm --dir examples/vanilla-vite dev
```

`@file-viewer/vite-plugin` copies runtime assets into the build automatically. To cover another format family, replace `preset-lite` with `preset-office`, `preset-engineering`, or `preset-all` in both `package.json` and `vite.config.ts`, then pass the same preset through `viewer.options`. The Office preset keeps binary `.ppt` on the packaged `@file-viewer/ppt@0.3.3` Worker/OffscreenCanvas/WASM engine and `.pptx` on its separate `@file-viewer/pptx` Worker engine. The standard Vite layout publishes `vendor/ppt/` and needs no manual PPT URLs.
