# Issue #461 original DOC

Source: existing public issue #461 attachment, independently retained by the local validation run. SHA256: `8b872772d353fbea03d92e3c785d8e8249b04e9d4d0df49391ee8bfc83f5aab3`. This is the original 10,240-byte OLE DOC, not its DOCX source or a conversion.

Native Word displayed an empty repair list when opening this input. Its existing PDF/screenshot reference is an in-memory-repaired view, not a pristine parser oracle. The parser test deliberately preserves the malformed one-character first textbox record and separately maps the visible second textbox. It makes no assertion about the cause of Word's repair and does not assert page placement.
