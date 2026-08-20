# v2.3.0 issue reproduction and release plan

Last audited: 2026-08-20 (Asia/Shanghai)

This ledger is the release source of truth for every open issue in
`flyfish-dev/file-viewer`. An issue is closed only after its original attachment, or a
documented equivalent fixture, passes the owning project's automated test and a real browser
check. A screenshot without the source document is not sufficient evidence for closure.

## Current inventory

| Issue | Target | Reproduction evidence | Required result | Status |
| --- | --- | --- | --- | --- |
| [#174](https://github.com/flyfish-dev/file-viewer/issues/174) Keynote | `packages/renderers/iwork` in File Viewer | The current tree contains Keynote IWA/iWork 09/current fixtures, parser goldens, and browser coverage. The original request has no attachment. | Re-run the Keynote fixture and browser gates from the release candidate. Close only after the published v2.3.0 package and Demo expose the tested route. | Local parser, pixel, and three-generation browser verification passed; release pending |
| [#179](https://github.com/flyfish-dev/file-viewer/issues/179) PPT runtime dynamic import | Demo/runtime wiring in File Viewer | v2.2.5 configured `vendor/ppt/index.mjs` as a native dynamic-import override. Static servers that return a non-JavaScript MIME type reproduce `Failed to fetch dynamically imported module`. Vite development also reproduced a MIME failure when dependency prebundling expanded the package's dynamic font URL into a broad asset glob. | Bundle the public ESM module and keep only Worker/WASM/font files as URL assets. Apply the asset rewrite in build and development, exclude the package from dependency prebundling, and verify both modes in a browser. | Fixed; production and development Vite browser verification passed; release pending |
| [#195](https://github.com/flyfish-dev/file-viewer/issues/195) GBK text | Text renderer in File Viewer; spreadsheet text import is a separate path | The public `1.txt` attachment is four bytes (`b2 e2 ca d4`, SHA-256 `5111b58e…`) and decodes to `测试` as GBK. The spreadsheet CSV/TSV path already detects GBK, but a plain `.txt` must still be tested through its own renderer. | Preserve UTF-8/UTF-16 handling, add GBK/GB18030 detection to normal and virtual text paths, and verify the exact attachment in a browser. | Fixed; exact attachment unit and browser verification passed; release pending |
| [#198](https://github.com/flyfish-dev/file-viewer/issues/198) CAD Worker path | CAD asset packaging in File Viewer | Current source and full-package asset trees contain both `wasm/cad/dwg-worker.js` and `wasm/cad/0.8.0/dwg-worker.js`; commits `0b382c5b` and `ea157344` introduced and revalidated the versioned runtime. | Cold-install the release tarball, request the exact versioned URL, and render a DWG in a browser before closing. No change is required in `@flyfish-dev/cad-viewer` unless that validation fails. | Asset contract and real DWG browser verification passed; release-tarball check pending |
| [#200](https://github.com/flyfish-dev/file-viewer/issues/200) PPTX layout | Normally `@file-viewer/pptx`; ownership cannot be finalized without the PPTX | The report contains two screenshots but no source presentation. The screenshots alone cannot reproduce the responsible XML, fonts, SmartArt, table, or text-box path. | Keep open and request the original PPTX. A separately constructed fixture may improve a known parser path but cannot prove this report fixed. | Not reproducible; retain open |
| [#201](https://github.com/flyfish-dev/file-viewer/issues/201) German locale | Core locale contract plus Demo/ecosystem components in File Viewer | Locale inventory currently exposes Chinese, English, and Japanese; `de-DE` is absent. The issue includes the requested translation catalog. | Add the complete `de-DE` catalog, locale normalization/selection, type coverage, and browser/API regressions without changing existing locale fallbacks. | Implemented; 449-key contract, type checks, and real `de-DE` browser verification passed; release pending |
| [#202](https://github.com/flyfish-dev/file-viewer/issues/202) complex DOCX layout | `@file-viewer/docx` in `/Users/wangyu/WebProjects/office/docxjs`, then File Viewer integration | The public DOCX (SHA-256 `a09d1df0…`) contains 20 sections, 241 frames, 18 text boxes, 38 drawings and 4 tables. The current browser renderer creates 19 articles with heights from 1 px to 3133 px, proving collapsed positioned/page content. | Fix the page/frame/section behavior in the DOCX engine, publish an exact dependency version, integrate it here, and compare the original 20-page attachment in a browser. | Dependency PRs #3 and #4 merged; 26 engine regressions and original-file browser integration passed; `@file-viewer/docx@0.3.27` published, cold-installed, integrated, and covered by the full release preflight; v2.3.0 deployment pending |
| [#203](https://github.com/flyfish-dev/file-viewer/issues/203) Excel charts and widths | Spreadsheet renderer and the maintained `styled-exceljs` patch in File Viewer | Both public XLSX files were parsed. Their chart XML uses formulas without usable cached points, so the current chart parser returns no definitions. The supply-chain workbook also makes the current MDW inference render `明细台账` at only 326 px including row headers, while the same workbook's sheets receive incompatible width scales. A final browser audit additionally reproduced enabled column resizing failing inside Shadow DOM because retargeted global mouse events no longer passed e-virt-table's containment check. | Resolve chart series/title/category formulas from workbook cells when caches are absent. Make OOXML column-width conversion stable for one workbook and across sequential opens. Preserve interactive column resizing in Shadow DOM and verify both original files plus a real header drag in a browser. | Fixed; both exact workbooks passed parser and browser chart/width verification, and the browser regression moved a real Excel boundary from 54 px to 102 px; release pending |

GitHub had eight open issues at the audit point. Gitee returned no open issues. GitHub
Dependabot and secret-scanning both returned zero open alerts; code scanning has no analysis
configured, which is recorded as unavailable rather than reported as a passing scan.

## Execution order

1. Add immutable issue fixtures (original URL, SHA-256, expected behavior) and failing unit/browser regressions.
2. Fix self-developed engines in their owning repositories first, publish exact versions, then update File Viewer. Do not hide engine defects with outer-viewer coordinate or filename patches.
3. Fix File Viewer-owned parsing, localization, asset, and Demo wiring defects.
4. Run targeted tests, type checks, package builds, real browser checks, and cold-install asset checks for every issue.
5. Reply briefly in English with `gh` only. Close only the issues whose original or equivalent fixture passed; leave non-reproducible reports open with the missing evidence stated.
6. If the repository and release-channel gates are clean, commit and push the private source, generate and push the GitHub public boundary, publish the full v2.3.0 npm ecosystem and GitHub Release, deploy Demo/docs/site/component demos and Docker, then run production-domain and strict post-release checks.

## Release stop conditions

The v2.3.0 release must stop rather than be claimed complete if npm authentication/MFA,
GitHub Release assets, Cloudflare production checks, Docker multi-architecture publication, or
the strict channel postcheck cannot be completed. Optional Gitee mirror limitations are recorded
but do not block the core GitHub/npm/Docker/Cloudflare release.
