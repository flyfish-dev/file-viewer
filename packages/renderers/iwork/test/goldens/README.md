# Apple-native iWork visual baselines

PDF and PNG files in this directory are exported from the Apple applications recorded in `../fixtures/manifest.json`. They are deterministic regression evidence, not runtime dependencies.

- `current-pages-15.3.1.pdf` is the direct Pages export; the matching PNG files were rendered at 144 DPI with Poppler.
- `current-numbers-15.3.1.pdf` is the direct Numbers export with each sheet fit to one page; the matching PNG files were rendered at 144 DPI with Poppler.
- `current-keynote-15.3.1.pdf` is the direct slide-only Keynote export; the matching PNG files were rendered at 144 DPI with Poppler. Speaker notes remain in the native `.key` fixture and are asserted separately.
