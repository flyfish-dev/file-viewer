# CID font decoding regression

The images show the generated `ucs2-h` case from
`../../scripts/verify-cid-fonts.mjs` at the same viewport and scale. The previous
pinned Worker splits multibyte character codes; the patched Worker preserves
the declared CMap and renders the Chinese text.

These are generated review examples, not customer documents or portable pixel
goldens. Font rasterization varies by platform.
