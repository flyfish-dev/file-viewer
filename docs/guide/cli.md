---
description: Scaffold new File Viewer apps, detect and integrate existing projects, select exact renderers or presets, preserve copy-assets compatibility, and prepare private or offline packages.
---

# File Viewer CLI

Use `npx file-viewer-cli@latest ...` for a zero-install command: this single-bin carrier delegates to the exact same-version `@file-viewer/cli`. After adding the scoped package to a project, use its local `file-viewer` executable directly.

<div class="doc-kicker">Create, Integrate, Deliver</div>

<p class="doc-lead">
Use one CLI to create a runnable project, add File Viewer to an existing application, select exact format capabilities, publish self-hosted assets, and prepare verified packages for private or air-gapped installs.
</p>

<div class="doc-grid">
  <div class="doc-card">
    <strong>Create</strong><br />Choose a framework, a validated runtime version, a format profile, extra formats, package manager, and asset location.
  </div>
  <div class="doc-card">
    <strong>Add</strong><br />Inspect an existing package.json project, show the complete plan, install exact packages, and wire the generated integration entry.
  </div>
  <div class="doc-card">
    <strong>Assets</strong><br />Deploy only selected capability assets or preserve the complete historical copy-assets command and Full-package contract.
  </div>
  <div class="doc-card">
    <strong>Prepare</strong><br />Build an integrity-checked local tgz directory from an explicit npm or private registry with bounded concurrency.
  </div>
</div>

## Start here

Run the interactive project creator:

```bash
npm create file-viewer@latest my-viewer
# or
pnpm create file-viewer my-viewer
```

The wizard shows the framework, profile, File Viewer release, validated framework versions, and optional formats before it asks for final confirmation. Cancelling or answering no leaves the project unchanged.

For a reproducible non-interactive run, pass every decision explicitly:

```bash
npx file-viewer-cli@latest create my-viewer \
  --framework vue3 \
  --profile standard \
  --formats pdf,docx,xlsx,pptx \
  --package-manager pnpm \
  --non-interactive \
  --yes
```

`--yes` is the write and installation confirmation for `create`, `add`, and `install`. Without it, non-interactive runs print the plan and do not install packages or write files.

## Choose a framework and version

| CLI value      | Generated integration                                  | Version choice                                     |
| -------------- | ------------------------------------------------------ | -------------------------------------------------- |
| `web`          | Vanilla JavaScript plus the File Viewer Custom Element | Browser template                                   |
| `vue3`         | Native Vue 3 component                                 | Validated Vue 3 version from the installed catalog |
| `vue2.7`       | Native Vue 2.7 component                               | Validated Vue 2.7 version                          |
| `vue2.6`       | Native Vue 2.6 component                               | Validated Vue 2.6 version                          |
| `react`        | React 18 or 19 component                               | Choose a validated React 18/19 version             |
| `react-legacy` | React 16.8/17-compatible component                     | Validated legacy React version                     |
| `svelte`       | Native Svelte action/component setup                   | Choose a validated Svelte 3, 4, or 5 version       |
| `jquery`       | jQuery plugin integration                              | Validated jQuery version                           |

The interactive wizard lists exact versions frozen in the installed CLI catalog. In CI, use `--framework-version <exact-version>`. The generated Vite and framework-plugin versions are selected as one tested template; the CLI does not combine arbitrary runtime versions.

## Choose a profile

| Profile       | What it means                                                                                                                   | Recommended use                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `standard`    | Common Word, PDF/OFD, modern PPTX, Spreadsheet, Archive, Email, Text, Image, and Media capabilities with a selective asset pack | Recommended default for new applications                                  |
| `lite`        | Text, Markdown/code, image, audio, and video                                                                                    | Small attachment previews                                                 |
| `office`      | The established Office preset, including its compatibility formats                                                              | Existing Office-focused integrations that need that exact preset contract |
| `engineering` | The established engineering preset                                                                                              | CAD, 3D, EDA, Geo, and engineering attachments                            |
| `all`         | The published `preset-all` compatibility matrix                                                                                 | Existing modular integrations that explicitly use `preset-all`            |
| `full`        | The matching historical `@file-viewer/*-full` package plus every later opt-in capability in the CLI catalog                     | Explicit all-capability setup when install size is acceptable             |
| `custom`      | No fixed preset; add only selected format/capability packages                                                                   | Strict dependency control                                                 |

<div class="doc-callout">
<strong>Standard and Full are different contracts.</strong> `standard` is the recommended common-format default. The eight published `@file-viewer/*-full` packages keep their existing `preset-all`, runtime-asset, API, and format behavior; they are not silently changed to `standard`. Installing a Full package directly also does not auto-add later specialist packages. Choosing `--profile full` in this CLI keeps that Full package intact and adds the catalog's later explicit opt-ins. The current additional opt-ins are DICOM and digital-signature containers, so the CLI prints their weight, runtime, and license boundaries before confirmation.
</div>

Use `file-viewer plan` before choosing Full if download size matters:

```bash
npx file-viewer-cli plan --framework react --profile full
```

The plan prints pinned packages, asset commands, heavy capabilities, license notices, and the current measured Full install range. It does not hide the Full cost behind a small top-level tarball number.

## Select formats and optional capabilities

Pass file extensions or capability ids during create/add:

```bash
npx file-viewer-cli create viewer \
  --framework react \
  --profile standard \
  --formats dwg,typst \
  --yes
```

Inspect the catalog, then change an initialized project:

```bash
npx file-viewer-cli list
npx file-viewer-cli config add dwg --write
npx file-viewer-cli config add dicom --write
npx file-viewer-cli config add p7m --write
npx file-viewer-cli config remove dwg --write
npx file-viewer-cli plan
npx file-viewer-cli install --yes
```

Heavy capabilities stay explicit in `standard`. The generated module imports only the fixed profile and selected additions, and runtime code still loads the matching renderer only after its format is opened.

Every selected capability is registered in the same generated File Viewer configuration. DICOM, signed containers, Office files, PDF, and the rest use the same component, source input, lifecycle, and toolbar; the CLI never creates a second viewer page or a format-specific application entry.

### DICOM boundary

`dicom` installs the optional local DICOM Part 10 renderer. It supports one local single-frame or multi-frame file, with bounded decoding and frame navigation. It does **not** provide multi-file series assembly, PACS/DICOMweb, MPR, segmentation, diagnostic interpretation, or an embedded OHIF application.

### Digital-signature boundary

`p7m` (or the `signature` capability id) installs the optional local signature and evidence-container renderer. It inspects bounded CMS/CAdES, RFC 3161/5544 timestamps, ASiC-S/E, RFC 4998 evidence records, JWS, and public OpenPGP material in Workers. Cryptographic verification results are kept separate from certificate/key trust, qualified-signature status, policy compliance, and legal validity. Private-key operations, automatic decryption, remote `jku`/`x5u` fetching, full XAdES, and archival-policy validation are intentionally excluded.

## Create a new project

The creator writes a small Vite project plus the File Viewer integration only after the plan is confirmed. Depending on the selected framework, the scaffold contains:

- `package.json`, `index.html`, and `src/main.mjs`;
- Svelte-specific `src/App.svelte` and `vite.config.mjs` when required;
- `file-viewer.config.json`, the durable selection record;
- `file-viewer.generated.mjs`, the default deterministic renderer registration module;
- one import marker in a recognized application entry;
- exact File Viewer dependencies and selected static assets.

Preview a create without writing:

```bash
npx file-viewer-cli create ./viewer \
  --framework svelte \
  --framework-version <validated-version> \
  --profile standard \
  --non-interactive \
  --json
```

Use `--force` only after reviewing the dry run. It allows replacement of conflicting CLI scaffold/config/generated files; it is not a general permission to rewrite arbitrary application files.

## Add File Viewer to an existing project

Run `add` from the directory containing `package.json`, or pass that directory positionally:

```bash
cd existing-app
npx file-viewer-cli add

# same operation from another directory
npx file-viewer-cli add ./existing-app
```

The inspection covers:

- the `packageManager` field first, then lockfiles;
- Vue, React, Svelte, or jQuery dependencies and their declared runtime line;
- an installed standard/preset/Full File Viewer profile;
- Vite, Vue CLI, Webpack, Next.js, or Nuxt 2/3 build configuration;
- a statically provable Vite `publicDir` or Nuxt `dir.public` / `dir.static`, plus the conventional Vue CLI and Next.js public directory;
- existing File Viewer packages and catalog-version drift;
- supported application entries that can import the generated module.

It stops on ambiguous multiple frameworks or multiple installed profiles and asks for an explicit `--framework` or `--profile`. Dynamic or disabled public directories, multiple build configs, generic Webpack output, and unknown build systems produce concrete `manualSteps` and fail closed before installation or file writes; resolve the build target and pass a contained `--asset-target` to continue. If an existing framework version does not exactly match a validated scaffold version, the CLI preserves that runtime and prints a warning instead of silently rewriting the project.

First review the detected state and commands:

```bash
npx file-viewer-cli add . --profile standard --json
```

Then apply the same choice:

```bash
npx file-viewer-cli add . --profile standard --yes --non-interactive
npx file-viewer-cli verify --json
```

If no recognized application entry exists, `add` fails before installation or writes. Pass `--entry <contained-client-entry>` explicitly; do not inject the browser integration into an SSR-only entry.

## Configuration and generated integration

The default `file-viewer.config.json` is project-relative and safe to commit:

```json
{
  "schemaVersion": 1,
  "framework": "vue3",
  "profile": "standard",
  "formats": ["dwg"],
  "capabilities": [],
  "assetTarget": "public/file-viewer",
  "generatedModule": "file-viewer.generated.mjs",
  "locale": "en"
}
```

| Field                            | Purpose                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `framework` / `frameworkVersion` | Native integration and exact validated runtime target                         |
| `profile`                        | Fixed preset, compatibility Full, or custom selection                         |
| `formats` / `capabilities`       | Explicit additions resolved through the frozen catalog                        |
| `assetTarget`                    | Project-relative static directory; defaults to `public/file-viewer`           |
| `generatedModule`                | Project-relative deterministic registration module                            |
| `source`                         | Explicit registry or integrity-manifest offline directory                     |
| `assetBaseUrl`                   | Explicit self-hosted/CDN runtime base; omitted means local same-origin assets |
| `managedPackages`                | Packages installed and owned by the CLI for safe heavy-dependency cleanup     |
| `locale`                         | CLI display language; JSON field names remain stable English keys             |

Generate or inspect the module separately:

```bash
npx file-viewer-cli generate
npx file-viewer-cli generate --write
```

Edit the config and regenerate rather than editing the generated file. User-owned files are not overwritten unless `--force` is explicit.

### Install recovery boundary

Before a confirmed create/add/install package-manager step, the CLI atomically moves an existing project-local `node_modules` plus Yarn unplugged directory into an adjacent same-filesystem backup. It also snapshots `package.json`, existing lockfiles, Yarn PnP/install-state files, CLI config/generated integration, and the managed asset target. A handled package-manager or asset failure restores those bytes. If the atomic staging area cannot be established, the CLI fails before invoking the package manager.

An abrupt process or host termination is outside the handled-error transaction and can leave `.<project>.file-viewer-install-*` beside the project. Inspect and restore that backup before rerunning; do not delete it blindly. Package-manager caches, including a project-local Yarn cache, are not rolled back. The CLI removes an obsolete heavy dependency only when `managedPackages` records that package as CLI-owned; an untracked declaration remains user-owned and is preserved.

## Asset commands and copy-assets compatibility

For a configured modular project, install or repair only the selected asset owners:

```bash
npx file-viewer-cli assets --write
```

The original aggregate command remains available with the same package and bin:

```bash
npx --no-install file-viewer-copy-assets ./public/file-viewer

# Equivalent unified CLI entry
npx file-viewer-cli copy-assets ./public/file-viewer
```

`file-viewer assets` also preserves the legacy copy behavior when no project config exists and legacy target/options are supplied. With a modular config present, it follows the selected asset plan instead; legacy flags cannot be mixed into that plan.

| Legacy option/environment       | Behavior                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------- |
| `[target-directory]`            | Defaults to `public/file-viewer`                                                |
| `--renderers <csv>`             | Copies only named renderer asset groups                                         |
| `--no-clean`                    | Merge mode; this is the default and preserves unrelated files                   |
| `--clean --confirm`             | Replace only a dedicated safe `file-viewer` target after both flags are present |
| `FILE_VIEWER_PUBLIC_DIR`        | Default output directory                                                        |
| `FILE_VIEWER_SKIP_ASSET_COPY=1` | Explicit CI skip                                                                |
| `INIT_CWD`                      | Calling project root used by package-manager execution                          |

The copy operation writes a manifest and receipt, validates required files, refuses path escapes/symlink targets, and does not overwrite unowned or externally modified assets. Existing Full-package commands keep delegating to the same-version implementation. A complete deployment of `@file-viewer/web-full/dist/` already contains its payload and needs no copy step.

## Private registry

Use HTTPS for a remote registry. Plain HTTP is accepted only for an explicit loopback host such as `127.0.0.1` during local testing:

```bash
npx file-viewer-cli add . \
  --profile standard \
  --registry https://registry.example.com/ \
  --cache-dir .file-viewer/package-cache \
  --yes
```

The CLI does not silently use an ambient registry to fetch a missing copy-assets payload. Registry URLs containing a username or password are rejected. Configure authentication in the package manager's user/CI settings; do not place credentials in the project config or command history.

`--registry` affects package acquisition only. Runtime Workers, WASM, fonts, and vendor assets remain self-hosted unless `--asset-base-url` is explicitly set to an approved origin.

## Prepare an offline tgz directory

`prepare` and its `cache` alias download the exact File Viewer-owned dependency closure from an explicit registry. Downloads use concurrency `1-8`; every tarball is checked for a regular contained file, SHA-512, package identity, version, and dependency metadata before the result is committed atomically with `file-viewer-offline-manifest.json`. Integrity proves that bytes match the prepared manifest; it does not establish registry provenance, so use a registry you trust.

Preview first:

```bash
npx file-viewer-cli prepare \
  --framework vue3 \
  --profile standard \
  --registry https://registry.npmjs.org/ \
  --offline-dir .file-viewer/offline
```

Prepare after review:

```bash
npx file-viewer-cli prepare \
  --framework vue3 \
  --profile standard \
  --registry https://registry.npmjs.org/ \
  --offline-dir .file-viewer/offline \
  --concurrency 4 \
  --yes
```

Use the verified directory in the target environment:

```bash
npx file-viewer-cli add . \
  --profile standard \
  --offline-dir .file-viewer/offline \
  --cache-dir .file-viewer/package-cache \
  --yes \
  --non-interactive
```

The offline directory contains the File Viewer-owned package closure, including compatibility packages required by the selected capabilities and the exact `@file-viewer/cli` used by `create-file-viewer`. It deliberately does not mirror unrelated framework packages or every third-party dependency already declared by the application. A fully air-gapped install must also provide the package-manager cache for those dependencies. npm, pnpm, Yarn Classic, and Yarn Berry receive generation-correct offline enforcement; Bun still requires a pre-populated cache.

`--registry` and `--offline-dir` are mutually exclusive during installation. An existing offline directory is reused only when its requested roots, registry, filenames, versions, and integrity hashes all match.

## Help and language

The CLI follows the system language when possible and supports four explicit help languages:

```bash
file-viewer --help --lang en
file-viewer --help --lang zh-CN
file-viewer --help --lang ja-JP
file-viewer --help --lang de-DE

file-viewer create --help --lang en
file-viewer add --help --lang zh-CN
file-viewer doctor --help --lang ja-JP
```

Prompts and human-readable plan labels are localized. `--json` always uses stable English keys for CI and tooling.

### Commands

| Command                     | Purpose                                                                   | Write gate                                                  |
| --------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `create [dir]`              | Create a buildable project                                                | Interactive confirmation or `--yes`                         |
| `add [dir]`                 | Detect and integrate an existing project                                  | Interactive confirmation or `--yes`                         |
| `list`                      | List formats, renderer ids, packages, weights, licenses, and asset owners | Read-only                                                   |
| `plan`                      | Print the exact install and asset plan                                    | Read-only                                                   |
| `init`                      | Create/update the project config                                          | `--write`                                                   |
| `config add/remove <token>` | Change explicit formats/capabilities                                      | `--write`                                                   |
| `generate`                  | Produce the deterministic integration module                              | `--write`                                                   |
| `install`                   | Install exact packages and assets from the config                         | `--yes`                                                     |
| `assets`                    | Install/repair configured assets, or use legacy mode without config       | `--write` in configured mode                                |
| `copy-assets`               | Run the complete legacy copy-assets contract                              | Direct target write; cleanup also needs `--clean --confirm` |
| `prepare` / `cache`         | Build a verified local tgz directory                                      | `--yes`                                                     |
| `doctor`                    | Report dependency, entry, receipt, hash, and asset problems               | Read-only                                                   |
| `verify`                    | Run doctor and exit non-zero on errors                                    | Read-only                                                   |

### Common options

| Option                                     | Purpose                                                                                                        |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `--project <dir>`                          | Project root; positional `create/add <dir>` is also supported                                                  |
| `--framework <name>`                       | Select one of the eight framework integrations                                                                 |
| `--framework-version <version>`            | Select an exact catalog-validated runtime template                                                             |
| `--profile <name>`                         | `standard`, `lite`, `office`, `engineering`, `all`, `full`, or `custom`                                        |
| `--formats <csv>` / `--capabilities <csv>` | Add exact catalog entries                                                                                      |
| `--package-manager <name>`                 | `npm`, `pnpm`, `yarn`, or `bun`                                                                                |
| `--package-manager-version <version>`      | Exact package-manager version; records and distinguishes Yarn Classic from Yarn Berry                          |
| `--asset-target <dir>`                     | Contained project-relative asset directory                                                                     |
| `--output <file>` / `--config <file>`      | Contained project-relative generated/config files                                                              |
| `--registry <url>`                         | Explicit npm/private registry                                                                                  |
| `--offline-dir <dir>`                      | Integrity-manifest local tgz directory                                                                         |
| `--cache-dir <dir>`                        | Controlled package-manager cache/store                                                                         |
| `--concurrency <n>`                        | `prepare/cache`: `1-8`; install package-manager network/script concurrency: `1-32`                             |
| `--file-viewer-version <version>`          | Require an exact match with the installed CLI catalog                                                          |
| `--asset-base-url <url>`                   | Explicit approved runtime asset base; local remains the default                                                |
| `--json`                                   | Machine-readable output with stable English keys                                                               |
| `--non-interactive`                        | Disable prompts for CI                                                                                         |
| `--yes` / `--write`                        | Explicit execution gates for their command groups                                                              |
| `--force`                                  | Replace conflicting CLI-managed config/generated/scaffold files after review                                   |
| `--dry-run`                                | Force every mutating command into a zero-write, zero-install preview even when `--yes` or `--write` is present |

## CI pattern

Keep planning and mutation separate:

```bash
# Reviewable, no writes
npx file-viewer-cli plan \
  --framework vue3 \
  --profile standard \
  --formats dwg \
  --json > file-viewer-plan.json

# Apply exact catalog choices
npx file-viewer-cli add . \
  --framework vue3 \
  --profile standard \
  --formats dwg \
  --non-interactive \
  --yes

# Fail CI when versions, entry imports, receipts, hashes, or assets drift
npx file-viewer-cli verify --json
```

The JSON plan contains command and argument arrays instead of a shell-interpolated string, so automation can review and execute it without evaluating user-controlled shell text.

## Troubleshooting

| Message or symptom                                     | What to do                                                                                                              |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `No package.json was found`                            | Run `create` for a new project, or run `add` from the package.json directory.                                           |
| Multiple framework/profile runtimes detected           | Pass the intended `--framework` / `--profile`; the CLI will not guess.                                                  |
| Requested File Viewer version differs from the catalog | Run the matching `@file-viewer/cli@<version>` instead of mixing release catalogs.                                       |
| Existing framework is not a validated scaffold runtime | Keep it and review the warning, or choose a validated `--framework-version` deliberately.                               |
| Missing copy-assets payload                            | Install the matching Full/copy package, configure an explicit registry, or provide the verified offline directory.      |
| Worker/WASM/font request returns HTML or 404           | Run the configured asset step, serve the target at the configured base, and verify MIME types on the production origin. |
| Full install takes too long                            | Use `standard` or `custom`; prepare a private-registry/offline cache when Full is a real requirement.                   |

Related: [modular profiles](/guide/v3-modular-profiles), [on-demand renderers](/guide/on-demand-renderers), [distribution](/guide/distribution), and [format truth](/guide/formats).
