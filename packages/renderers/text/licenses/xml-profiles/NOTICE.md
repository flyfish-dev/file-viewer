# Optional XML profile runtimes

Retain this directory when redistributing the runtime assets. File Viewer's own
adapter is Apache-2.0; upstream engines retain their original licenses.
The asset helper copies engine files unchanged. During XSLT execution the adapter
limits the WASM memory declaration to 64 MiB before compilation; it does not change
the engine's instructions or data, nor install the automatic page polyfill.

| Component | Verified upstream notice | Included notice |
| --- | --- | --- |
| xslt-polyfill 1.0.31 | [BSD-3-Clause](https://github.com/mfreed7/xslt_polyfill/blob/main/LICENSE) | xslt-polyfill-LICENSE.txt |
| xmllint-wasm 5.3.0 | [MIT](https://github.com/noppa/xmllint-wasm/blob/master/COPYING) | xmllint-wasm-COPYING.txt |
| XSLT libxml2 submodule | [Copyright at c34742f](https://github.com/GNOME/libxml2/blob/c34742f3017f6d39f3e4ccae4f70172238160ef8/Copyright) | libxml2-xslt-Copyright.txt |
| XSD libxml2 submodule | [Copyright at eb0a2f2](https://github.com/GNOME/libxml2/blob/eb0a2f2b91566384f378d870ffcd69c0a24162cc/Copyright) | libxml2-xsd-Copyright.txt |
| libxslt and libexslt | [Copyright at 923903c](https://github.com/GNOME/libxslt/blob/923903c59d668af42e3144bc623c9190a0f65988/Copyright) | libxslt-Copyright.txt |
| zlib | [Upstream notice](https://github.com/madler/zlib/blob/develop/LICENSE) | zlib-LICENSE.txt |

The xmllint [build command](https://github.com/noppa/xmllint-wasm/blob/master/script/compile)
links its repository's `libz.a`. Its precise zlib version is not identified in the
published npm metadata; the upstream zlib notice is included conservatively.

API evidence: xmllint's published browser module contains the Emscripten `Module`
factory used by its Worker wrapper; the adapter supplies in-memory XML/schema
files, `--nonet --noout --schema`, a WASM binary and bounded imported memory.
The XSLT package's `dist/xslt-wasm.js` exposes `createXSLTTransformModule`,
`cwrap('transform', ...)`, `_malloc`, `_free`, and `wasmMemory`; its
[C entry point](https://github.com/mfreed7/xslt_polyfill/blob/main/src/transform.c)
accepts input/style byte pointers and lengths and returns an allocated result.
Both factories run in disposable workers with network access disabled. These
adapters are pinned to the exact package versions above; review the ABI and
rerun the browser tests before upgrading.
