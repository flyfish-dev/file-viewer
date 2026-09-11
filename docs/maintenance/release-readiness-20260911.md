# Release preparation: sample regressions

## Source repairs

- File Viewer #272: literal PPTX chart data and horizontal-bar orientation (issue #268).
- File Viewer #273: Word 2003 XML containers, mixed DrawingML anchors and OFD TextCode positions (issue #266).
- docxjs #10: direct cell diagonal borders; merged upstream. The npm dependency must contain that repair before a File Viewer release is qualified.
- OFD SignedData: distinguish PKCS#7 / GM/T ContentInfo from an SES seal. The invoice in #266 contains a digital signature and its visible stamp is already an ordinary page resource. Do not try to extract an SES image from its certificate envelope. Neither SignedData nor a displayed SES image implies cryptographic verification; `VerifyRet` is now `null` and `VerificationStatus` is `not-verified`.

## Publication order

This preparation does not publish either package, create a release, or change issue state.

1. Publish the reviewed, merged `flyfish-dev/docxjs` source under a **new version**. Do not republish the existing 0.3.31 version.
2. In the clean File Viewer checkout, run `pnpm release:prepare-docx <the-published-version>`. This checks registry presence before mutation, synchronizes the dependency, lockfile, core Worker provenance/cache token and current version documentation, then behaviorally verifies the installed package. Metadata is restored if preparation fails.
3. Run `pnpm release:verify`, followed by the normal full Public CI/browser matrix and original-file checks below. Commit the preparation changes with the planned File Viewer version/release metadata before creating the immutable release assets.
4. Publish the new File Viewer packages using the existing release pipeline.

`pnpm verify:docx-upstream` deliberately fails against an old engine that does not render direct cell diagonals. A successful source build is not a substitute for this consumer check. Keeping the currently published dependency until step 2 allows ordinary frozen-lockfile installs to work before the new upstream exists.

## Packed upstream integration

The actual merged upstream source `6dbe15e347459f3707116d531fc9064f2d4c2a95`
was built and packed, then installed into a disposable checkout of File Viewer
`161d81379a8de7e2edf17a87e3f24eb0f3dc063f`. The old public package fails the
behavioral gate; the candidate tarball passes. Original #266 samples passed
through the actual Word renderer with `--require-diagonals`, four stamp anchor
positions and no OFD warnings. The source dependency and lockfile were not changed
by this test. Private upstream CI run: `34620182131` (successful).
This is pre-publication candidate evidence, not proof of a future npm artifact.

## Reproduction evidence

Supply the original public issue #266 ZIP (SHA-256 `57345ed8469bfae8ccb066abb726a551d0c322f5af7527828771035551cff4cb`) and issue #268 PPTX (SHA-256 `4b0dfef0400a6194f86c3deb1234fdf84828f696f2f3915fe940cbb43f5ed30c`). Scripts do not download or upload documents.

```sh
OFD_SIGNATURE_SAMPLE_ZIP=/path/to/issue-266.zip pnpm test:ofd-signatures
node apps/viewer-demo/scripts/verify-issue-266-samples.mjs /path/to/issue-266.zip
node packages/renderers/pptx/scripts/verify-github-268-browser.mjs /path/to/issue-268.pptx
```

The patched #266 gate now requires zero console warnings, not an allowlist for the old invoice warning. The deterministic SignedData tests cover both OIDs, malformed envelopes, unknown OIDs, truncated DER and missing entries. The original-file gate also checks that the existing SES image still contains 12,884 bytes.

## Scope that must not be called fixed without evidence

- #227: the original sensitive XLS is not available in the public issue. The existing MiniFAT regression is synthetic, not the original report.
- #248: the inline component lacks the attachment and the `downloadAttach` implementation. Existing cold Vue CLI/package regression coverage does not prove that private request/response path.
- #269: the screenshot does not include the CAD file or font resources needed for reproduction.
- #267: the optional IFC entry is documented in `packages/renderers/3d/IFC.md`; its official-model browser gate must pass before the optional feature is qualified. The frozen default Full/Office profiles are unchanged.

No issue is closed automatically by these changes.
