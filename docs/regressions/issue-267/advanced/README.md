# Advanced IFC regression evidence

This directory records the real-browser qualification of PR #278's combined
advanced configuration and lifecycle work. Source fixes are in
`0b84e9d5dec5344b990511558c07013d2e1e98e0`; this evidence note does not change runtime
or dependency bytes. No package was published by these qualifications.

## Qualified scenarios

- Official, checksum-pinned IFC4 and IFC4.3 Building-Architecture samples still
  render 13 geometric items and 1,143 triangles in the tested scene.
- Data-only importer settings cross the real Worker boundary: excluding `Name`
  changes the actual selected model data rather than merely a configuration mock.
- Fragments settings are applied to the real instance. The pre-model hook runs
  before any model is registered; the existing post-model hook is preserved.
- Invalid importer settings fail before file copying/Worker allocation. Unknown
  importer and Fragments fields fail explicitly and clean up their resources.
- A late asynchronous runtime hook cleans up once after cancellation. Cleanup
  functions execute in reverse registration order, and a throwing cleanup does
  not prevent remaining hooks, Workers or WebGL resources from being released.
- Reentrant `unmount()` calls from both an abort listener and a cleanup callback
  return the exact same Promise. Once it resolves, zero tracked Workers remain.

## Failure-before-fix evidence

The initial advanced integration run `34680017521` caught an orphan Worker on
pre-model cancellation. Upstream `abort(id)` creates a connection for an unknown
model ID, so the adapter now calls it only for an already registered model. The
corrected integration run `34680261413` passed without weakening the assertions.

The reentrant teardown qualification `34680829005` first ran the new regression
against source `5fbbf5bb575c94fc7c15ce4698ae9f5ebfc46026` and required failure on the
promise-identity assertion. It then assigned the shared disposal Promise before
notifying abort/cleanup callbacks, rebuilt the actual renderer, and passed the
same real-browser assertions plus all preceding advanced/original-model checks.
The corrected source was pushed only after those checks and governance passed.

`report.json` is the resulting browser measurement record. Run IDs identify the
GitHub Actions evidence; the initial failed runs are not counted as passing gates.
The current PR's full CI and Security remain separate required merge gates.

## Reproduce

```sh
pnpm install --frozen-lockfile
pnpm --filter @file-viewer/core build
pnpm --filter @file-viewer/geometry-engine build
pnpm --filter @file-viewer/renderer-3d build
pnpm --filter @file-viewer/renderer-3d verify:ifc
pnpm exec playwright install chromium
node packages/renderers/3d/scripts/download-ifc-fixtures.mjs /tmp/ifc-samples
pnpm --filter @file-viewer/renderer-3d verify:ifc-browser /tmp/ifc-samples
```

Fixture provenance and CC BY 4.0 attribution are in the downloader and
`packages/renderers/3d/IFC.md`. The tests do not claim arbitrary-model fidelity,
full BIM authoring, or performance on every device. Advanced settings remain
upstream-version-coupled application configuration, not executable document data.
