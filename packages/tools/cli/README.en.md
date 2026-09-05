# @file-viewer/cli

Create projects, integrate existing applications, select exact capabilities, and prepare offline File Viewer delivery. The CLI carries only a frozen capability catalog; it does not duplicate renderers, Workers, WASM, fonts, or static assets.

- [CLI home](https://file-viewer.app/en/cli/)
- [Complete guide](https://doc.file-viewer.app/guide/cli)
- [简体中文](./README.md)

## Quick start

Create a runnable project:

```bash
npm create file-viewer@latest my-viewer
```

Integrate the project containing the current `package.json`:

```bash
npx file-viewer-cli@latest add .
```

`file-viewer-cli` is the single-bin `npx` carrier and pins this scoped package at the same version. If `@file-viewer/cli` is already installed locally, run `file-viewer add .` instead.

The wizard selects a framework and validated version, File Viewer release, profile, formats, package manager, and asset directory. Interactive runs present checkbox-style renderer/format-family rows, preselect and retain everything supplied by the chosen profile, and let users toggle optional capabilities by number or range instead of typing extensions. It supports Vanilla/Web Component, Vue 3, Vue 2.7, Vue 2.6, React, React Legacy, Svelte, and jQuery.

New projects use Vite 8. The generated `package.json` declares Node `^20.19.0 || >=22.12.0`, and `dev`/`build` run a version preflight. Unsupported runtimes therefore fail with an actionable upgrade-and-reinstall message instead of an indirect `CustomEvent` exception.

```bash
npx file-viewer-cli create my-viewer \
  --framework vue3 \
  --profile standard \
  --formats pdf,docx,xlsx,pptx \
  --package-manager pnpm \
  --non-interactive \
  --yes
```

`add` detects the `packageManager` field, lockfiles, framework and version, installed preset/Full packages, Vite, Vue CLI, Webpack, Next.js, Nuxt 2/3, statically provable public directories, and application entries. Multiple candidates or an unsafe static-directory inference produce `manualSteps` and fail closed before installation or file writes; pass a contained `--asset-target` after confirming the real build target.

## Standard and Full

`standard` is the recommended common-format baseline for new projects. The eight existing `@file-viewer/*-full` packages keep their published `preset-all`, API, asset, and format behavior; they are not silently changed to `standard`.

Installing a Full package directly does not automatically add future specialist capabilities. Explicit CLI `--profile full` keeps the matching Full package and adds the later opt-ins marked as Full defaults in the catalog. The current default additions are DICOM and digital-signature/evidence containers, so the CLI shows their weight and licenses before confirmation. The Adobe design renderer remains explicit: add `--formats pat`, `--formats psd`, or `--capabilities design` to install `@file-viewer/renderer-design` and its independent asset pack without changing the frozen 221-extension, 32-pipeline `preset-all` baseline. DICOM covers one local DICOM Part 10 file, including multi-frame navigation. It does not provide series assembly, PACS/DICOMweb, MPR, segmentation, diagnosis, or an embedded OHIF application. The signature renderer reports bounded container inspection and cryptographic verification separately from certificate trust, policy, and legal-validity decisions.

## Configuration, assets, and legacy compatibility

```bash
npx file-viewer-cli list
npx file-viewer-cli config add dicom --write
npx file-viewer-cli config add p7m --write
npx file-viewer-cli plan --framework vue3 --profile full
npx file-viewer-cli install --yes
npx file-viewer-cli assets --write
npx file-viewer-cli doctor --json
npx file-viewer-cli verify --json
```

The original package and command remain available:

```bash
npx --no-install file-viewer-copy-assets ./public/file-viewer \
  --renderers pdf,office-word-openxml

# Unified entry to the same compatibility implementation
npx file-viewer-cli copy-assets ./public/file-viewer \
  --renderers pdf,office-word-openxml
```

Without a project config, `file-viewer assets` preserves the arguments, environment variables, merge default, receipts, and safety checks of `file-viewer-copy-assets`. Merge mode preserves unrelated files by default; cleanup replaces only a dedicated, boundary-checked `file-viewer` target and requires both `--clean --confirm`. A complete deployment of `@file-viewer/web-full/dist/` needs no separate copy step.

## Private registries and offline tgz files

```bash
npx file-viewer-cli prepare \
  --framework vue3 \
  --profile standard \
  --registry https://registry.example.com/ \
  --offline-dir .file-viewer/offline \
  --concurrency 4 \
  --yes

npx file-viewer-cli add . \
  --profile standard \
  --offline-dir .file-viewer/offline \
  --cache-dir .file-viewer/package-cache \
  --non-interactive \
  --yes
```

The offline directory includes the exact CLI, has an integrity manifest, and is reused only for exact versions. Tarballs are checked against their package identity; integrity is not registry provenance. Remote registries must use HTTPS (HTTP is loopback-only). `prepare` concurrency is `1-8`; install concurrency is `1-32`. Keep credentials in package-manager or CI configuration—the CLI rejects credentials embedded in URLs and does not write secrets into project config.

## Recovery and dependency ownership

Before a confirmed install, the CLI moves an existing project-local `node_modules` and Yarn unplugged directory into a same-filesystem backup, and snapshots the manifest, lockfiles, Yarn PnP/install-state files, generated integration, and managed asset target. A handled package-manager or asset failure restores those bytes. If safe atomic staging cannot be established, installation stops before invoking the package manager.

An abrupt process or host termination can leave an adjacent `.<project>.file-viewer-install-*` backup. Inspect and restore that directory before rerunning; do not delete it blindly. Package-manager caches, including a project-local Yarn cache, are outside this transaction. Obsolete heavy dependencies are removed only when the project config records them in `managedPackages` as CLI-owned; packages that were not installed and tracked by the CLI remain untouched.

## Help and language

Interactive text and help support English, Simplified Chinese, Japanese, and German. `--json` always uses stable English keys.

```bash
file-viewer --help --lang en
file-viewer create --help --lang zh-CN
file-viewer add --help --lang ja-JP
file-viewer prepare --help --lang de-DE
```

See the [complete CLI guide](https://doc.file-viewer.app/guide/cli) for every command, config field, CI pattern, offline boundary, and troubleshooting step.
