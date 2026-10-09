# Preparing an ordinary upstream DOCX release

DOCX fixes belong in the owning `flyfish-dev/docxjs` repository. Publish its reviewed stable
package first, then prepare File Viewer's exact dependency update:

```bash
pnpm release:prepare-docx <published-stable-version>
```

This helper does not publish packages. The source still uses the existing `0.3.33`
compatibility distribution until an actual published replacement is prepared and verified.
Changing the helper is not evidence that a new DOCX version has been published or adopted.

## What preparation verifies

The requested version must exist in the public npm registry before any source writes. The helper
updates the Word dependency, core Worker cache version, current documentation, release-age
exception and lockfile. It removes DOCX patch registrations, their distribution files and the
obsolete active compatibility metadata. PPT and other patches, plus historical regression
documents and evidence, remain unchanged. A same-version request performs the same cleanup and
checks; it cannot bypass remaining patches.

After the lockfile update and frozen install, the distribution gate requires an exact, unpatched
DOCX lockfile resolution. It downloads that exact public npm tarball with package scripts disabled,
checks its SHA-512 integrity, and compares the installed package's complete file set and bytes to
the archive. It does not extract files into or modify the installed package. The native DOCX
behavior gate and public release facts must also pass.

`pnpm verify:docx-upstream`, including its existing Public CI invocation, runs the distribution
and native behavior gates. Before migration, the distribution check validates the existing
owning-source compatibility fingerprints and labels the result `compatibility`. After migration,
it requires the ordinary registry package and labels the result `published`. These labels describe
the dependency being tested, not a new File Viewer release.

Preparation requires clean release metadata and patch files. Paths outside the specific DOCX patch
filenames, shared patch paths, symlinks and unsupported workspace YAML forms fail closed. If either
install or any verification fails, every edited or deleted source file and the original lockfile
are restored. Installed dependencies can still reflect the failed attempt; restore them with
`pnpm install --frozen-lockfile` before continuing. A rollback failure is reported explicitly.

## Browser and consumer verification

Run the existing paragraph regression after installing dependencies and Chromium and building Core,
DOC and Word:

```bash
node packages/renderers/word/scripts/verify-paragraph-flow.mjs
```

Its default negative baseline is the integrity-checked ordinary public `@file-viewer/docx@0.3.33`
ESM entry. No private preparation script or historical Git object is required. An explicitly supplied
`DOCX_FLOW_BASE_DIR` remains available for historical baseline reproduction; its hash and local
origin are recorded separately in the report.

The parser's eight OOXML spacing cases, classic Worker parity, page-by-page geometry, body order,
tables, headers, footers, column behavior and layout-count reduction assertions remain in place.
The performance control disables one bulk-transfer call only in a test output copy of the verified
installed engine. The optimized side uses unchanged verified bytes, and the installed entries are
checked again after testing. No test transformation becomes a dependency patch, production hook or
consumer override. Optional original-file checks still use `DOCX_FLOW_CORPUS_DIR`.

Compatibility consumer packing includes DOCX only while the old active compatibility patch exists.
After migration it records registry provenance and leaves DOCX to ordinary registry resolution;
local DOCX candidate tarballs are rejected, including explicitly supplied engine candidates. PPT
compatibility packing remains available.

Finish the relevant original-file browser checks and the normal release rehearsal before committing
or publishing the dependency migration. Passing preparation alone does not establish browser fidelity,
a cold-consumer result, a full workspace build, or release readiness.
