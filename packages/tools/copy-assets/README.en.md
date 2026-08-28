# file-viewer-copy-assets

The official Flyfish File Viewer asset-copy CLI. Full packages include `preset-all`, but their Worker, WASM, font, and vendor files still have to be published. Without those files, only part of the format matrix can work.

Every `*-full` package automatically installs an exactly matching CLI. For Webpack, Vue CLI, and other non-Vite builds, run it to copy into the default static directory:

```bash
npx --no-install file-viewer-copy-assets ./public/file-viewer
# In pnpm projects:
pnpm exec file-viewer-copy-assets ./public/file-viewer
```

When using a standard package, explicitly install the matching CLI. For standalone execution, use an explicitly versioned `npx` command:

```bash
npm install -D file-viewer-copy-assets@3.0.0
npx --yes file-viewer-copy-assets@3.0.0 ./public/file-viewer
```

The CLI carries a version-matched asset payload, copies Worker, WASM, font, PDF, CAD, Typst, Archive, Draw.io, and Office vendor assets, and writes a `flyfish-viewer-assets.json` integrity manifest. Installing it or running `--version` does not modify the project; only the copy command writes to the selected target. Runtime assets remain self-hosted with no public CDN dependency.

After copying, the static server must expose the target as `file-viewer/` under the deployment base (`/file-viewer/` for a root deployment) and return the manifest, JavaScript, WASM, and font URLs with correct MIME types. A valid manifest proves the local payload is complete; it does not replace an HTTP deployment check. If assets live elsewhere, call the full package's `setDefaultFullAssetBaseUrl()` during startup.

Vite projects should use `copyAssets: true` in `@file-viewer/vite-plugin`; the plugin publishes assets matching installed full/preset packages. A CDN/IIFE deployment of the complete `@file-viewer/web-full/dist/` directory already carries assets and needs no extra copy. Deploying only the entry IIFE is incomplete; use the installed CLI instead.

## Usage

```bash
# Defaults to ./public/file-viewer
npx --no-install file-viewer-copy-assets
# pnpm equivalent
pnpm exec file-viewer-copy-assets

# Keep unrelated existing files in the target directory
pnpm exec file-viewer-copy-assets ./public/file-viewer --no-clean

# With no local dependency, pin the standalone CLI version explicitly
pnpm dlx file-viewer-copy-assets@3.0.0 ./public/file-viewer
```

Automation can append `--json`; stdout then contains exactly one machine-readable result object. Existing calls keep the original two-line text output.

Set `FILE_VIEWER_PUBLIC_DIR` to override the default output or `FILE_VIEWER_SKIP_ASSET_COPY=1` when a CI step should skip copying. See the [File Viewer deployment guide](https://doc.file-viewer.app/guide/distribution) for full details.

简体中文：[README.md](./README.md)
