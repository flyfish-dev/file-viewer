# Licensed native iWork regression fixtures

The `libetonyek-*` documents in this directory are unmodified native Apple
iWork regression files from
[`LibreOffice/libetonyek`](https://github.com/LibreOffice/libetonyek), pinned to
upstream commit `37704aa6ac808fe7f7a14b4515503c3de3bc0dbf` (2026-08-12 checkout).

They are distributed under the upstream MPL-2.0 license copied as
`LICENSE.libetonyek.txt`. The local names make the application generation
explicit while preserving the original file bytes:

| Local fixture | Upstream path | Container generation |
| --- | --- | --- |
| `pages/libetonyek-pages4-iwork09.pages` | `src/test/data/pages4-file.pages` | Pages 4 / iWork '09 XML |
| `pages/libetonyek-pages5-2015.pages` | `src/test/data/pages5-file.pages` | Pages 5 / historical IWA |
| `numbers/libetonyek-numbers2-iwork09.numbers` | `src/test/data/numbers2-file.numbers` | Numbers 2 / iWork '09 XML |
| `numbers/libetonyek-numbers3-2015.numbers` | `src/test/data/numbers3-file.numbers` | Numbers 3 / historical IWA |
| `keynote/libetonyek-keynote5-iwork09.key` | `src/test/data/keynote5-file.key` | Keynote 5 / iWork '09 APXL |
| `keynote/libetonyek-keynote6-2015.key` | `src/test/data/keynote6-file.key` | Keynote 6 / historical IWA |

The SHA-256 digests and structural expectations are pinned in `manifest.json`.
These files are parser and rendering evidence only; they must not be copied into
the public Demo until the associated renderer passes its declared structural
and visual gates.
