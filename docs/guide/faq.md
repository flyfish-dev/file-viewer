---

> **Maintainer-only commands:** this page contains complete-workspace release or verification examples that are not part of the public checkout. Public contributors should use the commands in `/README.md` or `/docs/guide/development.md`.

<!-- FILE_VIEWER_MAINTAINER_COMMANDS -->
description: "Troubleshoot File Viewer packages, runtime assets, Worker and WASM paths, supported formats, licensing, mobile layout, and deployment behavior."
---

# FAQ

## The viewer is blank

Confirm the host container has a stable height and the file has a recognizable extension or explicit `type`.

## Does a Full package require a manual asset copy?

Not with Vite, and not when the complete `web-full/dist/` directory is deployed. Full packages include `preset-all`, but complete format support also requires their matching Worker, WASM, font, and vendor files to be published. Version `2.1.30` gives every Full package one supported delivery path:

- Vite: enable `fileViewerRenderers({ copyAssets: true })`; dev and build publish matching full-package assets under `<deployment-base>/file-viewer/`.
- Webpack, Vue CLI, and other tools: run the same-version binary included by the full package:

```bash
npx --no-install file-viewer-copy-assets ./public/file-viewer
```

- Custom static prefix: call the full package's `setDefaultFullAssetBaseUrl()` during startup.
- CDN/IIFE: deploying the complete `@file-viewer/web-full/dist/` directory needs no extra copy. An entry-only build can run the included CLI.

Do not install another `preset-all` or asset copier version beside a full package. Then confirm your server returns the correct MIME type for `.wasm`, `.js`, fonts, and JSON manifests. Strict CSP deployments should serve all viewer assets from the same trusted origin.

If a Worker or WASM still fails, inspect its URL: the response must be the real asset, not an SPA HTML fallback with status 200.

## How can I verify the DOCX 0.3.26 fixes are active?

The current Word renderer uses `@file-viewer/docx@0.3.26` in both the main thread and the offline Worker. This version fixes overlapping Japanese text and VML text boxes (#155), Apache POI `w:hMerge` table cells (#160), and displaced floating shapes in multi-section documents (#161).

After upgrading, redeploy the matching viewer assets and confirm the browser requests `vendor/docx/docx.worker.js?v=0.3.26` (possibly below your `file-viewer/` base) as JavaScript. Do not reuse a Worker from an older package version. If the old layout remains, purge the CDN or service-worker cache and reload the document.

## Why does a full package still say the libarchive Worker did not load?

Every full package points Archive, PDF, DOCX, Excel, PPTX, CAD, Typst, Draw.io, SQLite, and related offline assets to `file-viewer/` under the deployment base by default. For a root deployment, confirm these example URLs return the real JavaScript/WASM files instead of a 404 page or an SPA HTML fallback:

- `/file-viewer/vendor/libarchive/worker-bundle.js`
- `/file-viewer/vendor/libarchive/libarchive.wasm`

If assets do not live at `file-viewer/` under the deployment base, set their location once during startup:

```ts
import { setDefaultFullAssetBaseUrl } from '@file-viewer/react-full'

setDefaultFullAssetBaseUrl('/your-static-prefix/')
```

The compatibility-mode notice does not mean ZIP/TAR/GZIP are unusable. It means the libarchive Worker could not start, so RAR, 7z, encrypted archives, and other libarchive-only formats still need the Worker/WASM assets. ZIP, TAR, and GZIP continue through the compatibility path, and legacy GBK/GB18030 Chinese ZIP entry names stay readable there.

## npm 11 fails with `Cannot read properties of null (reading 'matches')`

This is usually not a `@file-viewer/*` version mismatch. We verify npm 11.17.0 against a clean registry install and a local tgz dependency-closure install for `@file-viewer/vue3 + @file-viewer/preset-office`.

The message is an npm Arborist crash while building the dependency tree. The most common trigger is a project directory whose `node_modules` was created by pnpm, bun, vlt, or another package manager, followed by `npm install` in the same directory. npm may hit a store-style symlink with a null target and throw this internal `matches` TypeError.

Use one package manager per project and reset the install directory:

```bash
# If the project uses npm
rm -rf node_modules package-lock.json npm-shrinkwrap.json
npm cache verify
npm install
```

```bash
# If the project uses pnpm, keep using pnpm
rm -rf node_modules package-lock.json
pnpm install
```

For offline tgz installs, the top-level tgz still needs all runtime dependencies to resolve from npm, a private registry, or sibling local tarballs. In intranet environments, publish the same-version `@file-viewer/vue3`, the selected preset, its renderer packages, and `@file-viewer/core` to a private registry, or declare the local tgz dependency closure together.

Release verification includes:

```bash
pnpm verify:npm-install-smoke
```

## Can I deploy without public CDNs?

Yes. Runtime assets are designed to be self-hosted. Full packages publish Draw.io, Typst, CAD, Archive, PDF, DOCX, Spreadsheet, SQLite, and other heavy assets through the Vite plugin or their included same-version `file-viewer-copy-assets` binary; `web-full` can instead deploy its complete `dist/`.

## Why does every format not expose every toolbar action?

Each renderer reports operation availability. Download is usually available, but print, HTML export, search, zoom, page navigation, and text anchors depend on the active renderer.

## Should I use an iframe?

No for standard package integrations. Use the native package for your stack. iframe-style demos can still be useful for embedding the full hosted demo, but the core product path is native and debuggable.
