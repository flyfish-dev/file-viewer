# Third-party notices

- `libwpd` 0.10.3 and `librevenge` 0.0.6 are compiled to WebAssembly under their MPL-2.0 license arm. The complete license is included in `vendor/libwpd-src/LICENSE.MPL-2.0.txt`.
- The callback bridge is derived from the MIT-licensed `xberg-libwpd` shim. Its license is included verbatim in `vendor/libwpd-src/LICENSE.xberg-shim-MIT.txt`.
- A header-only Boost 1.90 subset is present at build time under BSL-1.0. It is checksum-pinned and described in `vendor/libwpd-src/PROVENANCE.md`.
- The native runtime uses Emscripten 6.0.9 (official commit
  `4e4223852a0835923411059a3929907d7df1232e`) and zlib 1.3.2. Its actual system
  link inputs are libc, libc++, libc++abi, compiler-rt builtins, dlmalloc and
  zlib. Their complete upstream grants and notices are retained as
  `vendor/libwpd-src/LICENSE.toolchain-*`; see `NATIVE_PROVENANCE.json` in that
  directory for exact source and output identities. The covered parser and
  bridge sources remain unchanged.

Self-hosted asset copies include this notice, native provenance, and a
`licenses/` directory. Preserve them alongside the Worker, module and WASM.

The runtime distribution excludes source archives and build instructions. The
matching public source archives are available from the fixed Xberg commit
`db5ff1624cb0307ebca7cafb2af8fa6c6f93f2b4`:

- [libwpd 0.10.3 source](https://raw.githubusercontent.com/xberg-io/xberg/db5ff1624cb0307ebca7cafb2af8fa6c6f93f2b4/crates/xberg-libwpd/vendor/libwpd-0.10.3.tar.gz), SHA-256 `ca3575282acff8c952c12160433ad7e73e803ff3f070b8442c7ffa1f3a19f9ae`.
- [librevenge 0.0.6 source](https://raw.githubusercontent.com/xberg-io/xberg/db5ff1624cb0307ebca7cafb2af8fa6c6f93f2b4/crates/xberg-libwpd/vendor/librevenge-0.0.6.tar.gz), SHA-256 `686cc36be3196a0a808761cfd3951a46ff809cb0e028b0902c787261a1389d0f`.
- [Boost 1.90 header subset](https://raw.githubusercontent.com/xberg-io/xberg/db5ff1624cb0307ebca7cafb2af8fa6c6f93f2b4/crates/xberg-libwpd/vendor/boost-subset.tar.gz), SHA-256 `802ee17c5e380efbcbb696468ee3c7090aa409db89c2063b4c9b8d3e3aff1e08`.

The WebAssembly runtime is lazy-loaded by the WordPerfect Worker. The bounded TypeScript signature/text fallback remains separate and is not presented as equivalent fidelity.

## POLE-derived OLE stream original notices

The librevenge OLE stream includes POLE-derived code under BSD-3-Clause.
These grants apply independently of the MPL-2.0 parser license arm. Retain
both original notices in binary-distribution documentation and materials.
They are copied verbatim from `src/lib/RVNGOLEStream.h` and
`src/lib/RVNGOLEStream.cpp` in the pinned librevenge 0.0.6 archive above;
standalone copies are retained as `vendor/libwpd-src/LICENSE.POLE-*`.

### RVNGOLEStream.h

```text
/* librevenge

   Original source: POLE - Portable C++ library to access OLE Storage
   Copyright (C) 2002-2005 Ariya Hidayat <ariya@kde.org>

   Redistribution and use in source and binary forms, with or without
   modification, are permitted provided that the following conditions
   are met:
   * Redistributions of source code must retain the above copyright notice,
     this list of conditions and the following disclaimer.
   * Redistributions in binary form must reproduce the above copyright notice,
     this list of conditions and the following disclaimer in the documentation
     and/or other materials provided with the distribution.
   * Neither the name of the authors nor the names of its contributors may be
     used to endorse or promote products derived from this software without
     specific prior written permission.

   THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
   AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
   IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
   ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
   LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
   CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
   SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
   INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
   CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
   ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF
   THE POSSIBILITY OF SUCH DAMAGE.
*/
```

### RVNGOLEStream.cpp

```text
/* librevenge

   Original source: POLE - Portable C++ library to access OLE Storage
   Copyright (C) 2002-2005 Ariya Hidayat <ariya@kde.org>

   Performance optimization: Dmitry Fedorov
   Copyright 2009 <www.bioimage.ucsb.edu> <www.dimin.net>

   Fix for more than 236 mbat block entries : Michel Boudinot
   Copyright 2010 <Michel.Boudinot@inaf.cnrs-gif.fr>

   Version: 0.4

   Redistribution and use in source and binary forms, with or without
   modification, are permitted provided that the following conditions
   are met:
   * Redistributions of source code must retain the above copyright notice,
     this list of conditions and the following disclaimer.
   * Redistributions in binary form must reproduce the above copyright notice,
     this list of conditions and the following disclaimer in the documentation
     and/or other materials provided with the distribution.
   * Neither the name of the authors nor the names of its contributors may be
     used to endorse or promote products derived from this software without
     specific prior written permission.

   THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
   AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
   IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
   ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
   LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
   CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
   SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
   INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
   CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
   ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF
   THE POSSIBILITY OF SUCH DAMAGE.
*/
```
