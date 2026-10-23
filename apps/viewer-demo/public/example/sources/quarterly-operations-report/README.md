# Quarterly operations and risk review

This is an original File Viewer sample under the repository's Apache License 2.0. Example Operations, its business data and the proposed decisions are fictional. No real company identity, customer document or commercial result is reproduced.

The downloadable [DOCX](../../en/quarterly-operations-report.docx) contains native, editable text, tables, internal hyperlinks, headings, headers, footers and PAGE/NUMPAGES fields. Its two original figures are embedded as high resolution PNGs; their editable SVG sources are retained here. The report uses nine authored pages with a cover, contents, executive review, delivery and quality measures, risk register, action plan, scenarios and definitions.

To rebuild from the repository root with Node 24, the existing Playwright dependency and `office-cli` 1.0.157 installed:

```sh
node apps/viewer-demo/scripts/generate-business-report.mjs
pnpm build-only
DEMO_SAMPLE_PREVIEW_IDS=business-report node apps/viewer-demo/scripts/generate-sample-previews.mjs
node apps/viewer-demo/scripts/verify-sample-previews.mjs
```

Run the preview generator against a local built Demo at `http://127.0.0.1:18780/`, or set `DEMO_SAMPLE_PREVIEW_URL` to its local address. The generator captures the actual first document page and binds its PNG to the DOCX's SHA-256; it retains other verified previews. `source.json` records the original document and figure hashes. Authoring tools are not needed to view or download the checked-in sample.
