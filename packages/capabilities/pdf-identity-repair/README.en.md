# @file-viewer/capability-pdf-identity-repair

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/capabilities/pdf-identity-repair/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/capabilities/pdf-identity-repair/README.zh-CN.md)

Explicitly enables malformed Identity CJK font repair for PDF files. Importing this package registers the repair implementation with `@file-viewer/renderer-pdf`; the base PDF renderer does not require `pdf-lib`.

The repair implementation is bundled with its complete upstream license texts. No separate `pdf-lib` installation is needed for this capability.
