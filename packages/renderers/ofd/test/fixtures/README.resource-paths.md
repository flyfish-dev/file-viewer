# OFD resource-path fixtures

`resource-path-fixture.mjs` builds deterministic one-page OFD ZIP files with a
declared font, text, and a PNG image. These are constructed regression files, not
the unavailable original attachment from GitHub issue 57.

The cases vary the document directory, resource XML directory, `BaseLoc`, parent
and absolute media paths, URI encoding, ZIP entry case, and the OFD XML namespace
prefix. Decoy images test that the declared resource wins over compatibility
fallbacks. The combined case is distributed as the Demo's
`ofd-resource-paths.ofd`.

Partial-resource cases omit an image or a resource/font catalog and must retain
readable text. Invalid cases omit a required page, contain malformed page XML,
or contain invalid JBIG2 bytes; they must reject rather than leave a pending
promise. They do not claim to recover corrupt image data or reproduce every
historical OFD layout report.

Run `pnpm test:ofd-resources-github-57` for parser/render checks and
`pnpm verify:closed-issue-regressions` for actual file-upload, visible-text,
image-decode, and error-state checks in the built Demo. The standalone browser
script accepts `OFD_RESOURCE_DEMO_URL` and `OFD_RESOURCE_BROWSER=webkit`.
