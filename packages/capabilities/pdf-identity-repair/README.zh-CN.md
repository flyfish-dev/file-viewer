# @file-viewer/capability-pdf-identity-repair

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/capabilities/pdf-identity-repair/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/capabilities/pdf-identity-repair/README.zh-CN.md)

显式启用 PDF Identity CJK 字体修复。导入本包会向 `@file-viewer/renderer-pdf` 注册修复器；基础 PDF 渲染器不再强制安装 `pdf-lib`。

修复实现与完整上游许可随包提供，无需另外安装 `pdf-lib`。
