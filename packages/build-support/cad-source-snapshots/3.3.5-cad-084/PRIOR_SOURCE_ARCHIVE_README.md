# CAD corresponding source for File Viewer 3.2.0

This archive provides the preferred TypeScript source, build scripts, dependency lock and original license texts for the CAD integration distributed with File Viewer 3.2.0.

Use Node.js 26.8.2 and npm 11.17.0. Run npm ci --ignore-scripts --no-audit --no-fund, then npm run build. The generated runtime is dist/cad.iife.js (622,502 bytes; SHA-256 9d548ef213c59c2ffe81070c7410b1825093817f684ee5353486f409e913f3f5).

The integration source follows the public File Viewer commit c4cbee1b42ef1a7357e08c222da7451bf0ef2c31. The version-specific change adds 39 asset-license path descriptors in packages/core/src/platform/assets.ts. The build compiles the preferred source, repairs ESM extension paths and applies the public offline asset sanitizer.

The File Viewer source files retain their original Apache-2.0 grants. The CAD runtime also incorporates @flyfish-dev/cad-viewer 0.8.3 and dwf-viewer 0.6.7 under AGPL-3.0-only, and LibreDWG bindings under GPL-3.0-only. Retain the complete license texts and upstream attribution notices. The File Viewer grant does not replace these component terms.

upstream-sources.json records exact public source commits, download locations and SHA-256 values for CAD, DWF and LibreDWG bindings. Their native build scripts are in those source archives. This archive reconstructs the JavaScript integration; upstream native WebAssembly rebuilding uses those projects' own toolchains.

Release source archive:
https://github.com/flyfish-dev/file-viewer/releases/download/v3.2.0/file-viewer-cad-corresponding-source-3.2.0.tar.gz
