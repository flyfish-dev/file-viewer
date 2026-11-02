# PDF annotation regression

`annotations.pdf` is generated entirely by `generate.mjs` using pdf-lib. Its
content and metadata are synthetic, its dates are fixed, and it reads no input
files or external resources. It is distributed under the repository license.

The first page contains two FreeText annotations with normal appearance streams
and text contents, a highlight with an explicitly closed popup, an editable
text field, and a link to the second page. One FreeText annotation is read-only.

Regenerate the committed PDF:

```sh
node packages/renderers/pdf/test/fixtures/annotations/generate.mjs
```

Build the renderer and run the regression:

```sh
pnpm --filter @file-viewer/core build
pnpm --filter @file-viewer/renderer-pdf build
pnpm --filter @file-viewer/renderer-pdf verify:annotations
```

The test checks the committed bytes against the generator, then runs real local
PDF Workers in Chromium and WebKit, in ordinary DOM and an open Shadow DOM, at
40%, 100% and 200% zoom. It verifies invisible HTML annotation text, the visible
authored appearance and its geometry, popup hover/hide and click pin/unpin,
scaled popup text and wrapping, editable fields, internal links and teardown.
No remote resources are required. Reports and screenshots go to
`output/pdf-annotations/` (or `PDF_ANNOTATIONS_OUTPUT`).

These matched examples use the generated PDF at 40% zoom and a 1100 x 880
viewport. They illustrate the regression and are not portable pixel goldens.

| Before | After |
| --- | --- |
| ![Duplicate annotation text before the fix](before.png) | ![Authored annotation appearance after the fix](after.png) |
