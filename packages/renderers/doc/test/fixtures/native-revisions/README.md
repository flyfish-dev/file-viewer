# Native Word revision fixtures

These are maintainer-created files, not customer attachments. Microsoft Word
for Mac 16.112.2 authored the tracked changes and saved both DOCX and actual
Word 97-2004 binary DOC files. The DOC files are not renamed DOCX files.

## Reproduction

1. Create a baseline with the paragraphs in `native-oracle.json`'s original
   reference and a three-row, two-column table. Make only `BETA` bold in the
   mixed-format paragraph. Tabs and soft line breaks are real controls.
2. In Word, enable Track Changes. Replace the first full CJK company phrase,
   leaving the repeated company name unchanged. Replace `ALPHA BETA GAMMA`
   with `DELTA EPSILON`. Delete `REMOVE_TAB^t` and `REMOVE_BREAK^l` using
   Word's Find and Replace control codes.
3. Replace `FIRST^pSECOND` with `JOINED`, and replace
   `LEFT_SPLIT RIGHT_SPLIT` with `LEFT_SPLIT^pRIGHT_SPLIT`. Replace both table
   occurrences of `OLD_AMOUNT` with `NEW_AMOUNT`.
4. Stop tracking and save as DOCX and Word 97-2004 DOC. On separate copies,
   run Word's Accept All Changes and Reject All Changes, then save both
   formats as the `final` and `original` reference files.
5. Read the saved DOCX references with `officecli view <file> text --json`
   and `officecli query <file> revision --json`. Both references must have
   zero remaining revisions; the tracked DOCX contains 18 revision records.

The manifest pins each file's size and SHA-256, native producer, reference
paragraphs, and coverage. File Viewer is not used to generate the expected
text. The reference DOC files additionally test binary parsing equivalence.

The fixtures reproduce the missing deletion-mark behavior reported in #236
and extend #255 to paragraph and break revisions. They do not establish the
contents of #236's unavailable attachment. Format-only revisions, tracked
table structure, moves, and comments are not covered by these fixtures.

The initial automation attempt could not pass Word's file-access dialog;
the successful authoring and accept/reject operations used the native UI.
No failed automation output is used as a reference.
