# Vue3 error event (#299)

## Change

The Vue3 content component now emits `error` for failures routed through its
existing `showError` action. The public wrapper forwards the event in both
Shadow DOM and light-DOM modes. Both layers declare the event, preventing it
from being accidentally treated as a listener on the outer HTML element.

The event payload is the **localized display-message string**, not a native
`Error` object. Existing loading/error presentation is retained. An occurrence
is reported for every call, including consecutive identical messages. Clear,
reset, and progress actions do not emit errors.

```vue
<FileViewer :file="file" @error="handlePreviewError" />
```

```ts
function handlePreviewError(message: string) {
  // Switch to the application's fallback UI, or offer the original download.
  previewError.value = message
}
```

The callback sees updated error state. This is a Vue3 component event; it does
not introduce a cross-framework core error event or promise that errors hidden
inside a renderer's own fallback are now reported. Existing request-version and
cancellation handling is unchanged. No new hook is attached to abort/reset.

The Vue3-full wrapper already forwards attributes/listeners to this component;
no additional full-wrapper code change is made. Its runtime behavior must still
be checked in the normal integration environment.

## Regression commands

```sh
pnpm build:core
pnpm exec vitest run test/vue3-error-event.spec.ts
pnpm --filter @file-viewer/vue3 type-check
pnpm --filter @file-viewer/vue3 build
```

The suite tests the real Vue/core loading hook and source-level forwarding
contracts. Browser-mounted Shadow DOM/light DOM, a failed real download,
unsupported-browser rendering, successful retry, and the packed Vue3-full
consumer remain required acceptance checks.

## Initial preparation evidence

Prepared from commit `0c7edec756a86f042c68f94e164340c70c703393`.
The original complete `useLoading.ts` matched Git blob
`cd3851bd199ada17c8762e90333f135176f3677c`. The preparation environment could
run isolated source-fragment tests, but could not install the repository's
Vue/Vitest dependencies, perform a complete checkout/build, or publish a PR.
Do not interpret those isolated tests as browser or full-workspace acceptance.
