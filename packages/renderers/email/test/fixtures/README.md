# MSG regression fixture provenance

`msg-fixture.mjs` creates original, deterministic compound files in memory. It is not a renamed EML or a copy of a customer message. All identities use `example.test`; the 24 x 24 PNG is a generated solid-color image. The code and generated samples use this package's Apache-2.0 license.

The writer models the Microsoft MS-CFB and MS-OXMSG structures used by these regressions: v3/v4 sectors, FAT/DIFAT/MiniFAT, directory red-black trees, property streams, Unicode/ANSI strings, recipients, binary attachments and embedded message storages. Its RTF envelope helper models MS-OXRTFCP MELA/LZFu with CRC and end-of-stream reference. It is test-only, not a supported production MSG writer.

`msg.test.mjs` tests structural corruption, codepages, binary HTML, RTF decompression, metadata, exact attachment bytes and resource cleanup. Five default-on cases run through the real installed `@kenjiuno/msgreader`, including extraction and reparsing of an embedded MSG. A separate Reader-shaped normalization fixture makes boundary behavior deterministic.

`verify-msg-browser.mjs` deliberately uses Reader/RTF API fixtures with real Chromium and the emitted email renderer. Screenshots show a synthetic UI regression, not an Outlook screenshot or a real-parser end-to-end capture. It verifies binary HTML presentation, CID raster decode, table layout, recipient groups, downloads, narrow layout, sandbox/CSP, body switching, races and disposal. No runtime network server or CDN is needed by this gate.

Required before declaring full integration verified: run `pnpm --filter @file-viewer/renderer-email verify:email` without `MSG_UNIT_ONLY`, build/type-check the actual package against workspace dependencies, and compare representative Outlook-produced messages and real RTF output where fidelity is claimed. Public or privately supplied real messages must retain their actual privacy restrictions; none are included here.
