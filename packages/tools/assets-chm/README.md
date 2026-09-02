# @file-viewer/assets-chm

CHM Worker 与 Rust/WASM 离线运行时。该包用于按需安装 CHM 能力所需的自托管资源；安装器会事务化复制文件，并写入逐文件 SHA-256 收据。

包根目录和安装后的 `vendor/chm` 均附带 Apache-2.0 许可证、解析器来源声明，以及按 Cargo.lock 固定的完整 Rust 依赖许可证清单。
