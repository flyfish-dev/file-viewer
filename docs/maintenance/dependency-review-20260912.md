# Dependency review and release handoff — 2026-09-12

This follow-up reviews the six dependency PRs opened after the merged #278.
The earlier IFC/issue review remains in `pr-issue-review-20260912.md`. No npm
publication, package version bump, release tag or issue closure is performed.

## Decisions

| Proposal | Disposition in this integration |
| --- | --- |
| #279 | Adopt the pinned pnpm/action-setup 6.1.0 and upload-artifact 7.0.1 revisions. Keep pnpm 11.0.9, Node 24, archive format and all audit thresholds unchanged. Both Actions have executed in the qualification, including a real artifact upload and subsequent download. |
| #280 | Adopt Angular CLI/build 22.1.7 with framework/compiler 22.1.6. Repair the overly strict test that incorrectly required framework and tooling patch numbers to match. |
| #282 | Adopt the reviewed grouped dependency updates, regenerate the frozen workspace lock, and synchronize both affected license ledgers. Validate the resulting combination, not just the individual bot PR. |
| #283 and #284 | Adopt assert 2.1.0 and Buffer 6.0.3 together. Although declared as build dependencies, these are bundled into the shipped Avro browser decoder, so a browser regression is required. |
| #285 | Not adopted: declarations move to Vitest 5 while the workspace still resolves the reviewed 4.1.11 override. A major migration must update declarations, override, configuration and the complete test matrix together. Keep Vitest 4.1.11 for this release; no new advisory exception is added. |

The five adopted proposals are consolidated rather than merging divergent lockfiles.
Their original PRs can be closed as superseded only after the integration passes
its exact-head checks and merges. No original bot commit is represented as merged.

## Correct Angular dependency constraints

Angular framework/compiler packages use exact peer relationships. CLI/build publish
patches independently: the reviewed `@angular/build@22.1.7` accepts framework and
compiler `^22.0.0`, while `@angular/core@22.1.6` requires compiler `22.1.6`.

The corrected guard retains stable exact versions, a single framework/compiler
cohort, a single CLI/build cohort, and the same reviewed major/minor release line.
It allows different patch numbers between those two groups. Negative tests still
reject split framework peers, split tooling, mixed release lines, missing members,
ranges and prereleases. A fresh npm install and `npm ls` (without force or legacy
peer overrides) validate the real peer constraints; `ng build` validates compilation.

## Actual browser coverage

`packages/renderers/data/scripts/verify-avro-browser.mjs` exercises the actual built
`dist/vendor/avsc.cjs`, using the same `createBlobDecoder(new Blob(...))` path as the
renderer. Each null/deflate container has 37 records, including Chinese/Japanese,
emoji, binary bytes, numeric values, arrays and nullable strings. Empty containers
are covered and invalid magic is rejected. No external HTTP requests or page errors
are allowed; Buffer/process/require must not leak into the consumer's global scope.

The existing complete IFC browser gate is rerun with the updated dependency tree,
including official IFC4/IFC4.3, picking, advanced settings across the Worker boundary,
invalid configuration, late hooks, throwing cleanup, reentrant unmount and zero live
Workers after disposal. The Avro check is now a permanent Public CI step.

## License and audit findings

#282 failed its security job on a stale DICOM license ledger, not a newly suppressed
advisory. The canonical generator changes `baseline-browser-mapping` from 2.11.19
to 2.11.22 in the ledger/notices. The signature ledger must also follow JSZip 3.10.2
and its installed pako 1.0.11 dependency, preserving the actual MIT/Zlib metadata and
license texts. Both generators and their strict check modes have run; their policy
and the dependency-review allowlist are unchanged.

The audit still reports two existing, explicitly bounded ignored advisories (one
low and one moderate). The existing unused-adm-zip verifier passes. This is not a
claim of zero advisories, and this integration does not broaden any exception.

Focused clean-checkout qualification and actual Actions artifact round-trip:
https://github.com/flyfish-dev/file-viewer/actions/runs/34685836777

The complete Public CI, Security and PR Governance must succeed on the final
integration head before merge; the qualification above does not replace them.

## Issue status and publication

All seven tracked issues were fetched individually with their current comments.
#227, #248 and #269 remain open without new source files or complete reproductions;
no speculative fix or acceptance claim is made. #266/#268 have the earlier sample
fixes, #267 has the optional IFC implementation, and #277 remains a separate optional
read-only binary-inspector proposal. No issue reply was posted by this review.

`docxjs#10` and File Viewer #272/#273/#276/#278 are merged. The registry still exposed
`@file-viewer/docx@0.3.31` at this review, so source integration is distinct from
publishing a package with the upstream diagonal-border fix. After the maintainer
publishes the reviewed upstream version:

```sh
pnpm release:prepare-docx <exact-published-version>
pnpm release:verify
git diff --check
```

Review and commit the synchronized dependency, lockfile and Worker metadata before
publishing File Viewer. Do not bypass the installed-engine behavioral gate or claim
that a future upstream package is already available.
