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

The starter passes `officePreset` through `options.preset` and uses `@file-viewer/vite-plugin` to publish the complete runtime asset payload into the production build. Binary `.ppt` uses `@file-viewer/ppt@1.0.2`, with Worker parsing and SVG/Canvas rendering; `.pptx` uses the separate `@file-viewer/pptx` Worker engine. The complete PPT module tree is copied under `vendor/ppt/`. No PPT runtime URL configuration is needed for the standard Vite layout. Replace the bundled PDF or choose a local Office file to test your integration.
