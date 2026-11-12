# Delayed chart-font regression input

`noto-sans-sc-latin-wght-normal.woff2` is copied byte-for-byte from the locally
installed official npm package `@fontsource-variable/noto-sans-sc@5.3.1`, under
`files/`. Its SIL Open Font License is included as `LICENSE`.

The browser regression serves these real font bytes from a local intercepted
request after 800 ms. It checks successful FontFaceSet loading, a real glyph-width
change and automatic chart settlement without a helper flush. CJK glyphs retain
the system fallback; the mixed Latin/CJK labels exercise the changed Latin widths.
No system or private font files are required or distributed.
