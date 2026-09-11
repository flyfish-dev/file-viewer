# @file-viewer/assets-model

`@file-viewer/renderer-3d` 的 STEP / STP、IGES / IGS、BREP 自托管 OCCT Worker / WebAssembly 资产包。

该 capability pack 会把 OCCT Worker、`occt-import-js` runtime/WASM 和对应许可证 staging 到 `wasm/model/`，适用于离线、内网和受限网络部署，不依赖运行时 CDN。

IFC / BIM 已显式拆分。只有需要 `.ifc` 预览时才安装 `@file-viewer/capability-ifc` 与 `@file-viewer/assets-ifc`；这样 MPL-2.0 的 `web-ifc` runtime 不会进入普通 3D/model 资产闭包。
