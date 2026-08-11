# React 18/19 + Vite + Office preset

A production-shaped React starter for PDF/OFD, DOC/DOCX, spreadsheets, and PPT/PPTX files. The component is React-native; renderer capability comes from the modular Office preset.

After copying this directory outside the monorepo:

```bash
pnpm install
pnpm dev
```

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm --dir examples/react-vite dev
```

The starter passes `officePreset` through `options.preset` and uses `@file-viewer/vite-plugin` to publish the complete runtime asset payload into the production build. Binary `.ppt` routes to the packaged `@file-viewer/ppt@0.3.3` Worker/OffscreenCanvas/WASM engine under `vendor/ppt/`; `.pptx` routes to the separate `@file-viewer/pptx` Worker engine. No PPT runtime URL configuration is needed for the standard Vite layout. Replace the bundled PDF or choose a local Office file to test your integration.
