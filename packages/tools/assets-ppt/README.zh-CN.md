# @file-viewer/assets-ppt

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/tools/assets-ppt/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/tools/assets-ppt/README.zh-CN.md)

二进制 `.ppt` / `.pot` 的自托管资产包，包含原样的 Apache-2.0 TypeScript `@file-viewer/ppt` 编译包、解析 Worker、LICENSE 和 NOTICE.md，无需 native WASM、内置字体或帧缓存模块。

安装器通过事务合并资产，并记录逐文件 SHA-256 收据。Full 包已经提供匹配的默认资产路径；精简 `standard` 安装可以显式添加 PPT capability。引擎开发源码保持私有。
