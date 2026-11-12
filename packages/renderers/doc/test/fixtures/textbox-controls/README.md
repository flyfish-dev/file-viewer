# Independent textbox review controls

These are synthetic CFB/DOC byte-structure controls independently prepared during review of the first stage-A candidate. They are not native Word documents or visual positioning truth. Original issue inputs were not altered.

- field-boundary.doc: FTXBXS boundary inside a HYPERLINK field instruction. SHA256 5d7a6178b801392b85dfcbef2b45b6f33c7fb424511ad4dcd394f07babfef778.
- surrogate-boundary.doc: boundary splitting the UTF-16 pair in AB😀CD. SHA256 dfc65401d1aad7a0ffd29271bc4ccd16a360d8d3399b2b17f3108d0a3d071291.
- sepx-amplification.doc: 128 SED references to one 24,576-byte SEPX containing 8,192 distinct unknown opcodes; 37,376-byte complete CFB/DOC. The normal tests assert aggregate work/output bounds, not a large memory or timing benchmark. The 134-million-item theoretical attack is never constructed.

The helper and compound controls extend these cases without relying on file names or visible text in product code.
