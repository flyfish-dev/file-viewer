# Optional image rotation (#298)

## Configuration

```ts
const options = {
  // Preserve the application's existing preset/renderer configuration.
  image: { rotation: false }
}
```

`image.rotation` defaults to `true`. Setting it to `false`:

- Omits the native-image rotation toolbar rather than relying on host CSS.
- Removes TIFF rotation buttons and angle text, but retains the live page count.
- Ignores rotation requests from view-state restoration as well as the buttons.
- Leaves zoom, fitting, image display, lightbox access, and TIFF page restoration
  wired to their existing implementations.

Decoder/EXIF orientation is not disabled. The setting is local to each renderer
instance. Vue3 includes `image` in its renderer-options signature, so changing
this option refreshes the preview without treating unrelated shell options as
renderer changes.

When rotation is disabled, the TIFF page-status container no longer claims to be
an interactive rotation toolbar. The page counter retains `aria-live="polite"`.

## Regression commands

```sh
pnpm build:core
pnpm exec vitest run test/image-rotation-option.spec.ts
pnpm --filter @file-viewer/vue3 type-check
pnpm --filter @file-viewer/vue3 build
pnpm type-check:renderers
pnpm --filter @file-viewer/renderer-image build
```

The new jsdom suite runs actual image/TIFF renderer code with mocked core
registration, dimensions, browser image decoding, and a two-page TIFF decoder.
It tests the switch, existing defaults, viewer-instance isolation, zoom and
page restoration. It does not validate TIFF decoding or pixel fidelity.

## Acceptance still required

Check a small real PNG/JPEG preview and a real multipage TIFF in a browser,
including keyboard/lightbox use, zoom/fit, initial view state, changing the Vue3
option at runtime, and teardown. Verify normal repository CI before merging.

The initial preparation environment ran isolated source-fragment tests only;
it could not run the new jsdom/Vitest suite or the full workspace build.
Prepared from `0c7edec756a86f042c68f94e164340c70c703393`.
