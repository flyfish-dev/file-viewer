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

`@file-viewer/vite-plugin` copies runtime assets into the build automatically. To cover another format family, replace `preset-lite` with `preset-office`, `preset-engineering`, or `preset-all` in both `package.json` and `vite.config.ts`, then pass the same preset through `viewer.options`. The Office preset uses the TypeScript `@file-viewer/ppt@1.0.2` engine for binary `.ppt` and the separate `@file-viewer/pptx` Worker engine for `.pptx`. The standard Vite layout publishes the complete `vendor/ppt/` module tree and parsing Worker automatically and needs no manual PPT URLs.
