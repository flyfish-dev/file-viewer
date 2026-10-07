# Packed Consumer Regressions

This fixture uses Vue CLI 5, its TypeScript plugin, Element Plus Drawer, and
React Full. There is no custom Webpack configuration, source alias, or consumer
polyfill. The build helper installs actual tarballs in a fresh npm project.

```sh
PACKED_ISSUE_PACKAGE_DIR=/absolute/path/to/release-tarballs pnpm verify:issue-consumer:build
# Use the project path printed by the build helper.
PACKED_ISSUE_CONSUMER_DIR=/absolute/path/to/project pnpm verify:issue-consumer:browser
```

The default registry baseline matches the workspace version. For a deliberately
partial candidate set only, `PACKED_ISSUE_BASE_VERSION` selects an existing
registry baseline. That is not proof of the complete next release.

The browser gate uploads the original public DOC, XLS, and DOCX fixtures through
a native file input. It checks visible revisions and all/final/original modes,
page-relative cover geometry at the public `load-complete` event, repeated
destroy-on-close cycles with geometry rechecks, and all three
offscreen spreadsheet search results with exact highlight color and viewport
bounds. React Full also renders PSD pixels, deflate-compressed Avro rows, STEP
geometry, XMind nodes, and all 25 PPT pages. It rejects browser errors and failed
asset responses, and writes screenshots plus `regression-evidence/report.json`.

Both Vue and React also download actual black-on-white CAD PNG/JPEG pixels and
cancel a download through the owning component's `beforeOperation` hook. This
checks the installed package boundary, not a Demo-only button or source alias.

DOCX progressively inserts visible elements before its layout is complete. The
fixture records both load lifecycle events so an early SVG does not masquerade
as a finished document. The original coordinate tolerances remain unchanged.

## Consumer dependency policy

Vue and `@vue/compiler-sfc` are aligned at 3.5.43, a patch update that includes
the server-renderer security fix. The Vue CLI 5 and React fixture versions are
preserved.
[`ts-loader` 9.6.2](https://github.com/TypeStrong/ts-loader/releases/tag/v9.6.2) replaces
its `micromatch` dependency with `picomatch` and removes that route to the
unpatched `braces` advisory. The loader's declared Node.js minimum remains 12.
This fixture uses TypeScript 5.9.3; upstream notes changed resolver behavior
in some older TypeScript scenarios.

This fixture does not inherit the repository's pnpm overrides and
does not override Mermaid or KaTeX. Its legacy development-tooling advisories
and the transitive KaTeX advisory must be reported separately; a passing build
or browser regression is not a clean security audit.
