# @file-viewer/assets-ppt

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/tools/assets-ppt/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/tools/assets-ppt/README.zh-CN.md)

Self-hosted assets for the binary `.ppt` / `.pot` renderer: the unmodified Apache-2.0 TypeScript `@file-viewer/ppt` package, including its parsing Worker, compiled modules, LICENSE and NOTICE.md. No native WASM, embedded fonts or frame-cache helper is required.

The installer merges assets transactionally and records a per-file SHA-256 receipt. Full packages already provide the matching asset route; minimal `standard` installations can add the PPT capability explicitly. The engine development source remains private.
