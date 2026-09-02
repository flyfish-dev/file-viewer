# CHM Rust/WASM notices

The File Viewer-specific wrapper, limits, metadata model, and browser API are licensed
under Apache License 2.0; see `LICENSE`.

The ITSF/ITSP reader and LZX decoder were adapted and hardened from these permissively
licensed clean-room projects:

1. RustChm 0.1.2
   - Source: https://github.com/yeroo/RustChm
   - Commit: `5418439a40812079b479acec40719cddedcb583c`
   - Files studied/adapted: `src/chmreader.rs`, `src/lzxdecode.rs`,
     `src/sitemap.rs`, and format writers used as independent test oracles.
   - License: MIT
   - Copyright (c) 2026 yeroo

2. FastChm
   - Source: https://github.com/yeroo/FastChm
   - Commit: `2c22935ba0a1fc7a5a3d3d9785c970058c4d00f0`
   - Files studied: `src/chmreader.cpp`, `src/lzxdecode.cpp`, and binary navigation
     writers used to corroborate RustChm's documented clean-room format behavior.
   - License: MIT
   - Copyright (c) 2026 yeroo

The full upstream MIT notice follows and applies to both projects:

> MIT License
>
> Copyright (c) 2026 yeroo
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all
> copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.
