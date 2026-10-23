# Release Notes Template

Use this structure for GitHub releases. The goal is to help users decide whether to upgrade, not only to list internal build artifacts.

````md
## File Viewer vX.Y.Z

This release improves [scenario], especially for [audience].

### Who Should Upgrade

- Projects using [Vue / React / Web Component / full package / preset]
- Teams deploying Worker / WASM / fonts / vendor assets to an intranet or private CDN
- Users affected by [specific bug or limitation]

### Highlights

- Fixed [user-visible behavior]
- Improved [format / renderer / deployment path]
- Updated Demo, Docs, offline assets, or component README

### Upgrade

npm:

```bash
pnpm add @file-viewer/vue3-full@latest
```

CDN / private deployment:

Sync the full `dist` directory, including Worker, WASM, vendor, font, PDF CMap, and renderer assets.

### Verification

- `pnpm type-check`
- `pnpm docs:build`
- `pnpm verify:public-release-facts`
- `pnpm verify:github-governance`

### Notes

- Demo: https://demo.file-viewer.app
- Docs: https://doc.file-viewer.app
- Compatibility feedback: https://github.com/flyfish-dev/file-viewer/issues/new/choose
````
