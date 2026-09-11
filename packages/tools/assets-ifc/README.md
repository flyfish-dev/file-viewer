# @file-viewer/assets-ifc

显式 `@file-viewer/capability-ifc` 的自托管 runtime 资产包。本包固定 `web-ifc@0.0.77`，并固定可选大模型路径使用的 `@thatopen/fragments@3.4.7` 匹配 Worker。

staging 结果包含：

```text
wasm/model/web-ifc-api.js
wasm/model/web-ifc.wasm
wasm/model/web-ifc-mt.wasm
wasm/model/fragments-worker.mjs
wasm/model/LICENSE.web-ifc-MPL-2.0.md
wasm/model/LICENSE.thatopen-fragments-MIT.txt
```

通过本包安装器或 File Viewer CLI 把资产复制到应用的 `public/file-viewer` 根目录。安装由 `@file-viewer/asset-installer` 事务式合并，并记录逐文件 SHA-256 receipt。

普通 3D renderer、Engineering preset 与 Full 基线不会自动安装本资产包；它只属于显式 IFC capability 的依赖 / 资产闭包。

`web-ifc` 使用 MPL-2.0，`@thatopen/fragments` 使用 MIT。重新分发其 runtime 文件时应保留对应的 staged license / notice。两个 IFC backend 都不会使用公共 CDN fallback。
