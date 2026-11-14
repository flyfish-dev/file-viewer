// Bounded binary controls for the independent review findings. No native UI.
import { parseCFB } from "../../dist/core/cfb.js";
import { parseFib } from "../../dist/msdoc/fib.js";
import { cfb, plc, record, u16, makeTextboxDoc } from "./textbox-fixture.mjs";
export function streams(doc) {
  const c = parseCFB(doc);
  return {
    word: Buffer.from(c.getStream("/WordDocument")),
    table: Buffer.from(c.getStream("/1Table")),
  };
}
export function appendTableField(word, table, name, data) {
  const pair = parseFib(word).fibRgFcLcb._pairs.find((p) => p.name === name);
  word.writeUInt32LE(table.length, 154 + pair.index * 8);
  word.writeUInt32LE(data.length, 158 + pair.index * 8);
  return Buffer.concat([table, data]);
}
export function repeatedSepx(doc, { count = 128, raw } = {}) {
  if (!raw) {
    raw = Buffer.alloc(8192 * 3);
    for (let i = 0; i < 8192; i++) raw.writeUInt16LE(i, i * 3);
  }
  const { word: oldWord, table } = streams(doc),
    word = Buffer.concat([oldWord, u16(raw.length), raw]);
  const sed = Buffer.alloc(12);
  sed.writeUInt32LE(oldWord.length, 2);
  const sec = plc(
    Array.from({ length: count + 1 }, (_, i) => i),
    Array.from({ length: count }, () => sed),
  );
  return cfb({
    WordDocument: word,
    "1Table": appendTableField(word, table, "PlcfSed", sec),
  });
}
export function opaqueSibling(doc) {
  const { word, table } = streams(doc),
    f = parseFib(word).fibRgFcLcb;
  const art = Buffer.from(
    table.subarray(f.fcDggInfo, f.fcDggInfo + f.lcbDggInfo),
  );
  let opaque = record(0xf777, 0, 0, Buffer.from("opaque payload"));
  for (let i = 0; i < 35; i++) opaque = record(0xf777, 15, 0, opaque);
  // Fixture DggContainer is empty, then dgglbl, then the DgContainer.
  const dg = 8 + art.readUInt32LE(4) + 1;
  art.writeUInt32LE(art.readUInt32LE(dg + 4) + opaque.length, dg + 4);
  return cfb({
    WordDocument: word,
    "1Table": appendTableField(
      word,
      table,
      "DggInfo",
      Buffer.concat([art, opaque]),
    ),
  });
}
export const fieldTexts = [
  '\u0013HYPERLINK "https://example.test"\u0014Visible\u0015\r',
  "Second\r",
];
export function invalidSurrogateDoc() {
  return makeTextboxDoc({
    texts: ["😀CD\r", "Second\r"],
    mutate: ({ table, fields }) =>
      table.writeUInt32LE(1, fields.fcPlcftxbxTxt + 4),
  });
}
export function compoundReviewDoc() {
  return repeatedSepx(
    opaqueSibling(
      makeTextboxDoc({
        texts: fieldTexts,
        mutate: ({ table, fields }) =>
          table.writeUInt32LE(4, fields.fcPlcftxbxTxt + 4),
      }),
    ),
  );
}
