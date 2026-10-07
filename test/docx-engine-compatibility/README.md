# DOCX engine integration checks

`pnpm verify:docx-engine-compatibility` builds the actual Word renderer and executes
its ZIP/XML path in Chromium. No DOCX parser is mocked. Fixtures are generated
from structural test data and contain no customer content or fonts.

Checks cover sparse chart indices, missing-value gaps, signed columns, a full
single-category pie, explicit floating coordinates, real Worker `parsed`
responses, browser/ESM parity and exact installed distribution hashes. The
Worker test fails on main-thread fallback even when that fallback renders.

Install dependencies using the frozen pnpm lock. Install Playwright Chromium
first, or provide `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` for a system Chromium.
Evidence is written to `output/docx-engine-compatibility` unless overridden via
`DOCX_ENGINE_EVIDENCE_DIR`. These checks do not certify every DOCX layout or host.
