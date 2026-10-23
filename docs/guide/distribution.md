# Distribution

File Viewer is distributed through npm, GitHub Releases, Docker and the hosted demo/documentation sites.

| Need | Recommended channel |
| --- | --- |
| Application integration | npm packages under `@file-viewer/*` |
| Complete framework integration | Matching `@file-viewer/*-full` package plus `/file-viewer/` runtime assets |
| Static/iframe/offline archives | [GitHub Releases](https://github.com/flyfish-dev/file-viewer/releases) |
| Ready-to-run container | `flyfishdev/file-viewer` on Docker Hub |
| Source development | This GitHub repository |

Large release archives and npm tarballs are not committed to Git history. `artifacts/` contains only machine-readable release manifests, status, matrix and schemas; each release record links to its downloadable GitHub Release asset.

`*-full` already includes `preset-all`; do not install another preset. Vite uses `fileViewerRenderers({ copyAssets:true })` to publish same-version Worker, WASM, font, and vendor assets under `file-viewer/` at the deployment base. Other build tools run the full package's `npx --no-install file-viewer-copy-assets ./public/file-viewer`. Direct CDN `web-full`, or an intact deployment of its complete `dist/`, needs no copy step.

## Public source build

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm docs:build
```

See [Development](./development.md) for the complete public quality gate and [Docker](./docker.md) for the published image.

## Maintainer boundary

Versioning, npm publication, official Docker publication, Cloudflare deployment, repository synchronization and release signing are maintainer-only operations in the complete private workspace. This separation keeps public commands accurate and prevents private operational tooling from leaking into the open-source boundary.
