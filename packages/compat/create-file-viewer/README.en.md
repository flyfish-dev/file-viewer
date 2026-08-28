# create-file-viewer

Official scaffold entry point for `npm create file-viewer`, `pnpm create file-viewer`, `yarn create file-viewer`, and `bun create file-viewer`.

It delegates to the exact matching `@file-viewer/cli` catalog. The default `standard` profile keeps large specialist renderers opt-in; use the prompts or deterministic CLI flags to choose a framework, validated framework version, profile, formats, package source, and self-hosted asset location.

```bash
npm create file-viewer@latest
npx file-viewer-cli create --help
```

The npm package selector and CLI catalog always stay aligned. A fixed invocation such as `npm create file-viewer@3.0.0` uses `@file-viewer/cli@3.0.0`; `@latest` uses the current stable pair. To choose among releases from a private or mirrored registry, provide the credential-free registry URL explicitly:

```bash
npm create file-viewer@latest -- my-viewer \
  --registry https://registry.example.com/npm/ \
  --file-viewer-version 3.0.0

npm create file-viewer@latest -- my-viewer \
  --registry https://registry.example.com/npm/ \
  --file-viewer-version latest \
  --non-interactive --yes
```

For air-gapped use, `--offline-dir` accepts either one integrity-manifested release directory or a parent containing direct version subdirectories. Each selectable directory must contain `file-viewer-offline-manifest.json`, the exact `@file-viewer/cli` tarball, and its File Viewer-owned dependency closure. Every declared tarball is SHA-512 checked before the selected CLI is installed.

```bash
npm create file-viewer@latest -- my-viewer \
  --offline-dir ./file-viewer-releases \
  --file-viewer-version 3.0.0 \
  --non-interactive --yes
```

Interactive terminals receive a numbered stable-version menu. Non-interactive multi-version runs must specify an exact version or `latest`. Registry URLs containing credentials are rejected; npm credentials remain in the user's npm configuration and are never copied into the generated project or printed command arguments. Registry environment variables are not used as a silent version-discovery fallback.

The package contains no renderer, Worker, WASM, font, or static-asset payload of its own. The recommended `standard` profile keeps specialist formats opt-in while the eight existing Full packages preserve their previous format matrix and asset behavior.

- [CLI home](https://file-viewer.app/en/cli/)
- [Complete CLI guide](https://doc.file-viewer.app/guide/cli)
