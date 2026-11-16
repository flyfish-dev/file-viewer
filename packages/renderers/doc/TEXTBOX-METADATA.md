# Legacy textbox metadata (stage A)

`parseMsDoc` still returns model version 1 and the same paragraph/table/attachments block union. For binary DOCs with textbox stories/tables it may additionally return `textboxLayout` (schemaVersion 1). Paragraph blocks may carry `sourceRange`, with explicitly separated document-global and story-local CP ranges and a flow ID. These are optional, structured-cloneable data. Worker envelopes and existing parse/render methods are unchanged.

Frames contain FTXBXS indices, story ranges, raw SPA twip rectangles and flags, shape IDs/OfficeArt raw properties, anchor CPs, and references to canonical content block IDs. There is no text copy in this metadata. The parser preserves omitted anchor-only paragraph ranges. Tables and row-end recovery do not cross textbox flow boundaries. All visible content remains in the old linear block sequence.

The strict floating OfficeArt reader is separate from inline-image recovery. It bounds records and FOPT complex data by their parent, limits depth/count/byte/property output budgets, applies document defaults, and merges boolean use bits individually. Both raw and effective properties are retained. Unknown legal records are skipped by length, not byte-scanned. Duplicate IDs, conflicting client IDs, invalid ranges and incomplete/grouped mappings are diagnosed conservatively. A malformed independent record need not invalidate a separately mapped textbox.

SEPX extraction is an explicit subset: page width/height, four margins/gutter, column count/spacing, section break kind and orientation. Missing values are not assigned A4/Letter defaults. Unknown sprms remain listed; invalid signed lengths/bounds are diagnosed. `status: explicit` only describes explicitly recognized fields, not complete Word section or pagination support.

No normalized page rectangle, CSS placement, Word pagination, wrap exclusion, rotation, group transform, linked text allocation or header placement is supported by this stage. SPA bx/by and OfficeArt posrelh/v remain raw because independent native controls are still required to settle coordinate precedence and compatibility enum semantics. `layoutEligibility` can only be `pending-evidence` or `unsupported`. `MSDOC_TEXTBOX_STORY_LINEARIZED` remains; existing #460 table recovery diagnostics remain unchanged.

Tests run from normal `build` (`test/*.test.mjs`). `verify:textbox-layout` checks the public legacy fixture; `verify:textbox-browser` exercises Chromium/WebKit main and actual module-Worker parse/render/parseToHtml routes. `DOC_PACKAGE_DIR` can point that browser test at an installed real tgz consumer; `DOC_TEXTBOX_OUTPUT` selects its evidence directory. Synthetic CFB/DOC controls are independent binary-structure tests, not native-Word visual truth. The original #461 fixture has a documented repair caveat.

Format basis: MS-DOC 2.3.6, 2.8.27, 2.8.32, 2.9.105–106, 2.9.170–172, 2.9.253, 2.9.312 and 2.8.26/2.9.245; MS-ODRAW 2.2.14 and 2.3. Third-party interoperability implementations were not copied.

## Review hardening

SEPX limits apply cumulatively per document and are charged again for repeated SED references: 1 MiB scanned bytes (including SEPX length fields), 131,072 decoded sprms, and 65,536 emitted unknown opcode entries. These are independent limits, not an offset cache. On exhaustion, section source ranges/offsets remain, incomplete geometry carries `budgetExceeded`, and one bounded `MSDOC_SECTION_GEOMETRY_BUDGET_EXCEEDED` diagnostic remains visible even if ordinary metadata diagnostics filled their cap. No page geometry is inferred from a truncated prefix.

Only mapped frames with UTF-16, nested-field and paragraph/cell-flow-safe endpoints may divide the canonical story. Unsafe metadata is diagnosed and left unassociated with content IDs; the old paragraph/field interpretation is retained. Unknown OfficeArt containers are opaque already during record reading, so their internal bytes cannot consume known-record recursion budgets. Boolean values in separate shape FOPT records conflict only where their explicit-use masks overlap with contradictory values; document-default overrides remain separate from same-level conflicts.
