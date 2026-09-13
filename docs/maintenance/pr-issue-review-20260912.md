# PR and issue review — 2026-09-12

> **Maintainer-only commands:** this page contains complete-workspace release or verification examples that are not part of the public checkout. Public contributors should use the commands in `/README.md` or `/docs/guide/development.md`.

<!-- FILE_VIEWER_MAINTAINER_COMMANDS -->

Scope: all six open PRs and seven open issues in `flyfish-dev/file-viewer`, plus
related DOCX/CAD/spreadsheet upstreams. Source maintenance only: no npm release,
version bump, release tag or automatic issue closure.

## PR disposition

| PR | Decision |
| --- | --- |
| #276 | Merged as `db73a732e4978f2e4d0d573cd0ed7333690fe461`. Exact-head Public CI `34625940086`, Security `34625940222` and corrected PR evidence gate `34679546125` passed. No governance rules were weakened. |
| #275 | Incorporate @p4535992's advanced-configuration direction (comment `5638194837`) on #276's stronger owned-Worker foundation. This change adds data-only importer/Fragments settings and a pre-model runtime hook. Do not merge the separate draft capability/assets packages or duplicate runtime. |
| #270 / #271 / #274 | Combine upgrade intent into the complete **Angular 22.1.6** framework/tooling cohort: common, compiler, core, platform-browser, build, CLI and compiler-cli. Registry metadata confirms matching published versions and exact framework peers. Individual 22.1.0/22.1.1 PRs are superseded by this coordinated change. |
| #261 | Synchronize the thumbnail manifest to **Vitest 4.1.11**, already selected by the workspace security override. Real thumbnail tests verify the result; the runtime was not actually on Vitest 3 before this manifest correction. |

Qualification `34679652404` passed real lock generation, frozen installation,
core/thumbnail builds, thumbnail tests, governance and public-release facts. A
clean Angular consumer passed npm installation, peer-tree validation and `ng build`.
The lockfile required no byte change because Vitest was already overridden and the
Angular fixture is outside the workspace. The full consolidated CI additionally
runs packed Angular browser consumers and all existing rendering/framework gates.

Prevent recurrence: group nested `@angular/*` version and security updates;
deterministic tests reject split framework/tooling versions and thumbnail pin drift.
The IFC gate verifies actual Worker settings effects, original IFC4/IFC4.3 geometry,
picking, reverse-order cleanup and cancellation, rather than only checking types.

## Issue follow-up

All seven issue bodies and available comments were re-read. The table distinguishes
source inclusion, publication and original-report acceptance. No missing sample is
silently replaced by a synthetic fixture, and issues stay open pending acceptance.

| Issue | Evidence / next acceptance condition |
| --- | --- |
| #227 — XLS undefined name | Original sensitive XLS remains unavailable in the thread. WPS re-saving is a workaround, not root-cause proof. Require a sanitized failing file or dated private receipt; MiniFAT fixtures alone do not prove this report fixed. |
| #248 — Vue CLI DOCX/XLS | Latest comment supplies an XLS screenshot, not a project/file. Existing cold Vue CLI tests do not prove the reporter's exact integration. Require lockfile, minimal project, original bytes and failing console/Worker requests. |
| #266 — Word/OFD fidelity | Original-sample repairs are in #273/#276 and upstream docxjs#10. The reviewed npm package is now `@file-viewer/docx@0.3.32`; downstream dependency/Worker/lock synchronization and the original-file browser gate remain required before the File Viewer release. |
| #267 — IFC | Optional viewer foundation is merged; this change incorporates the advanced configuration request. Scope is local visualization/inspection, not full BIM authoring or a promise of arbitrary large-model performance. Preserve self-hosted assets and license notices. |
| #268 — PPTX charts/tables | Reporter supplied `default.pptx` in comment `5628266590`; original-file repairs/evidence are in merged #272. Pending delivery of a new File Viewer package and reporter confirmation, not a claim that the public package is already updated. |
| #269 — CAD Chinese text | Thread still lacks original CAD file, font resources and usable environment/version details. Need original DWG/DXF, SHX/TTF mapping and failing font/network requests. Screenshot alone cannot distinguish encoding from missing fonts. |
| #277 — binary inspector | Separately scoped optional read-only feature proposal, not implemented in this release. Acceptance should require virtual hex/ASCII, bounded terminable parsing, allowlisted build-time templates with per-template license review, and explicit routing that cannot steal dedicated renderers. Editing/arbitrary executable templates are out of initial scope. |

Related upstreams: `flyfish-dev/docxjs` had no open PRs/issues; #10 is merged as
`6dbe15e347459f3707116d531fc9064f2d4c2a95`. The live CAD and styled-exceljs upstream
snapshots likewise had no open items.

## Release handoff

After the maintainer publishes the reviewed upstream DOCX version, run:

```sh
pnpm release:prepare-docx <exact-published-version>
pnpm verify:github-266-browser /path/to/issue-266.zip --require-diagonals
git diff --check
```

The preparation command runs the installed-engine and public-release-fact checks.
Review and commit synchronized dependency, runtime/Worker and lockfile metadata.
The original-file behavioral gate must pass before File Viewer release.

## Lifecycle defect caught during integration

The first real-browser advanced-hook qualification (`34680017521`) passed both
original models and actual importer settings, then failed because a pre-model
cancellation left a Worker alive. Upstream `abort(id)` creates a connection for an
unknown model ID. The adapter now calls it only for a registered model; disposal
before model loading must not create a new Worker. Regression coverage includes
late asynchronous runtime hooks, invalid Fragments settings before load, and a
throwing host cleanup without suppressing remaining hook/Worker/WebGL disposal.
