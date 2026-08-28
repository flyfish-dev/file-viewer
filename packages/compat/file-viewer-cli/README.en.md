# file-viewer-cli

Friendly single-bin entry for running the File Viewer CLI with `npx`:

```bash
npx file-viewer-cli@latest add .
npx file-viewer-cli@latest plan --profile standard
```

The package contains no renderer or asset payload. It delegates to the exact same-version `@file-viewer/cli` dependency. After installing the scoped package in a project, use its primary `file-viewer` command directly. The historical `file-viewer-copy-assets` command and the unified `copy-assets` subcommand remain available.

- [CLI home](https://file-viewer.app/en/cli/)
- [Complete guide](https://doc.file-viewer.app/guide/cli)
- [简体中文](./README.md)
