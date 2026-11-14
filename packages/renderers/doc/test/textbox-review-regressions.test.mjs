import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { parseMsDoc, renderMsDoc } from "../dist/index.js";
import {
  readTextboxSections,
  SECTION_GEOMETRY_LIMITS,
} from "../dist/msdoc/sections.js";
import { readFloatingDrawings } from "../dist/msdoc/floating-drawings.js";
import {
  record,
  shape,
  plc,
  u16,
  makeTextboxDoc,
} from "./helpers/textbox-fixture.mjs";
import {
  repeatedSepx,
  opaqueSibling,
  fieldTexts,
  invalidSurrogateDoc,
  compoundReviewDoc,
} from "./helpers/textbox-review-controls.mjs";
const file = (n) =>
  readFileSync(new URL("./fixtures/textbox-controls/" + n, import.meta.url));
const text = (m) =>
  m.blocks
    .filter((b) => b.type === "paragraph")
    .map((b) =>
      b.inlines
        .filter((i) => i.type === "text")
        .map((i) => i.text)
        .join(""),
    )
    .join("|");
const html = (b) => renderMsDoc(parseMsDoc(b)).html;
function budget(model, kind) {
  const sections = model.textboxLayout.sections,
    warning = model.warnings.filter(
      (w) => w.code === "MSDOC_SECTION_GEOMETRY_BUDGET_EXCEEDED",
    );
  assert.equal(warning.length, 1);
  assert.equal(warning[0].budget, kind);
  for (const [k, v] of Object.entries(SECTION_GEOMETRY_LIMITS))
    assert.ok(warning[0].totals[k] <= v);
  assert.ok(
    sections.reduce((n, s) => n + s.unknownSprms.length, 0) <=
      SECTION_GEOMETRY_LIMITS.unknownSprms,
  );
  assert.ok(
    sections.some((s) => s.budgetExceeded === kind && s.status === "partial"),
  );
  return sections;
}
test("reviewer field and surrogate CFB inputs retain the complete readable baseline interpretation", () => {
  for (const [name, texts, hash, reason] of [
    [
      "field-boundary.doc",
      fieldTexts,
      "5d7a6178b801392b85dfcbef2b45b6f33c7fb424511ad4dcd394f07babfef778",
      "unsafe-field-boundary",
    ],
    [
      "surrogate-boundary.doc",
      ["AB😀CD\r", "Second\r"],
      "dfc65401d1aad7a0ffd29271bc4ccd16a360d8d3399b2b17f3108d0a3d071291",
      "unsafe-utf16-boundary",
    ],
  ]) {
    const bytes = file(name),
      m = parseMsDoc(bytes);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), hash);
    assert.equal(renderMsDoc(m).html, html(makeTextboxDoc({ texts })));
    assert.ok(
      m.textboxLayout.frames.every(
        (f) => f.mapping === "invalid" && f.contentBlockIds.length === 0,
      ),
    );
    assert.ok(m.textboxLayout.frames.some((f) => f.reasons.includes(reason)));
    assert.doesNotMatch(text(m), /HYPERLINK|ERLINK|https:/);
  }
});
test("already-invalid range cannot split a surrogate pair, and plain mid-paragraph cuts also fall back", () => {
  assert.equal(
    html(invalidSurrogateDoc()),
    html(makeTextboxDoc({ texts: ["😀CD\r", "Second\r"] })),
  );
  const texts = ["Ordinary complete paragraph\r", "Second\r"];
  const m = parseMsDoc(
    makeTextboxDoc({
      texts,
      mutate: ({ table, fields }) =>
        table.writeUInt32LE(5, fields.fcPlcftxbxTxt + 4),
    }),
  );
  assert.equal(renderMsDoc(m).html, html(makeTextboxDoc({ texts })));
  assert.ok(
    m.textboxLayout.frames.every((f) =>
      f.reasons.includes("unsafe-flow-boundary"),
    ),
  );
});
test("nested fields, combined field/unicode boundaries, and malformed missing field end preserve fallback", () => {
  const cases = [
    [
      '\u0013HYPERLINK "https://example.test"\u0014Outer \u0013REF target\u0014Nested 😀\u0015 tail\u0015\r',
      4,
    ],
    ["\u0013CODE 😀\u0014Visible\u0015\r", 7],
    ["\u0013UNTERMINATED secret instruction 😀\r", 4],
  ];
  for (const [first, cp] of cases) {
    const texts = [first, "Second\r"];
    const bytes = makeTextboxDoc({
      texts,
      mutate: ({ table, fields }) =>
        table.writeUInt32LE(cp, fields.fcPlcftxbxTxt + 4),
    });
    assert.equal(html(bytes), html(makeTextboxDoc({ texts })));
    assert.ok(
      parseMsDoc(bytes).warnings.some(
        (w) => w.code === "MSDOC_TEXTBOX_MAPPING_INVALID",
      ),
    );
  }
  const valid = makeTextboxDoc({ texts: [cases[0][0], "Second\r"] });
  assert.ok(
    parseMsDoc(valid).textboxLayout.frames.every((f) => f.mapping === "mapped"),
  );
  assert.match(text(parseMsDoc(valid)), /Outer Nested 😀 tail/);
});
test("reviewer repeated SEPX CFB is bounded cumulatively, including repeated-offset structured-clone output", () => {
  const m = parseMsDoc(file("sepx-amplification.doc")),
    sections = budget(m, "unknownSprms");
  assert.equal(sections.length, 128);
  assert.equal(
    sections.reduce((n, s) => n + s.unknownSprms.length, 0),
    65536,
  );
  assert.ok(sections.every((s) => s.sepxOffset === 4096 && s.tableOffset >= 0));
  assert.equal(text(m), text(parseMsDoc(makeTextboxDoc())));
  assert.equal(
    JSON.stringify(structuredClone(m)).length,
    JSON.stringify(m).length,
  );
  const below = parseMsDoc(repeatedSepx(makeTextboxDoc(), { count: 8 }));
  assert.equal(
    below.textboxLayout.sections.reduce((n, s) => n + s.unknownSprms.length, 0),
    65536,
  );
  assert.ok(
    !below.warnings.some(
      (w) => w.code === "MSDOC_SECTION_GEOMETRY_BUDGET_EXCEEDED",
    ),
  );
});
test("aggregate sprm-work and scanned-byte budgets are independent of distinct opcodes or offset caching", () => {
  const repeatedKnown = Buffer.concat(
    Array.from({ length: 4096 }, () =>
      Buffer.concat([u16(0x3009), Buffer.from([2])]),
    ),
  );
  const work = parseMsDoc(
    repeatedSepx(makeTextboxDoc(), { count: 33, raw: repeatedKnown }),
  );
  budget(work, "sprms");
  assert.equal(work.textboxLayout.sections[0].breakKind, 2);
  assert.ok(
    work.textboxLayout.sections.every((s) => s.unknownSprms.length === 0),
  );
  const largeOperand = Buffer.concat(
    Array.from({ length: 100 }, () =>
      Buffer.concat([u16(0xc000), Buffer.from([255]), Buffer.alloc(255)]),
    ),
  );
  budget(
    parseMsDoc(
      repeatedSepx(makeTextboxDoc(), { count: 41, raw: largeOperand }),
    ),
    "scannedBytes",
  );
});
test("legal explicit SEPX values and per-section CP/offset provenance survive repeated references", () => {
  const raw = Buffer.concat(
    [
      [0xb01f, 12240],
      [0xb020, 15840],
      [0xb021, 936],
      [0xb022, 1584],
      [0x9023, 1152],
      [0x9024, 792],
    ].flatMap(([op, n]) => [u16(op), u16(n)]),
  );
  const m = parseMsDoc(repeatedSepx(makeTextboxDoc(), { count: 3, raw }));
  assert.ok(
    m.textboxLayout.sections.every(
      (s) =>
        s.status === "explicit" &&
        s.pageWidthTwips === 12240 &&
        s.marginsTwips.left === 936,
    ),
  );
  assert.deepEqual(
    m.textboxLayout.sections.map((s) => s.mainCpRange),
    [
      { start: 0, end: 1 },
      { start: 1, end: 2 },
      { start: 2, end: 3 },
    ],
  );
  assert.equal(
    new Set(m.textboxLayout.sections.map((s) => s.tableOffset)).size,
    3,
  );
});
test("unknown containers remain opaque even with deep, invalid or known-looking payloads; valid siblings survive", () => {
  const good = shape(6515, 1),
    read = (b) => {
      const w = [];
      const s = readFloatingDrawings(
        b,
        { fcDggInfo: 0, lcbDggInfo: b.length },
        w,
      );
      return { s, w };
    };
  const wrap = (p) =>
    Buffer.concat([
      record(0xf000, 15, 0),
      Buffer.from([0]),
      record(0xf002, 15, 0, Buffer.concat([good, p])),
    ]);
  let deep = record(0xf777, 0, 0);
  for (let i = 0; i < 35; i++) deep = record(0xf777, 15, 0, deep);
  for (const opaque of [
    deep,
    record(0xf777, 15, 0, Buffer.from("not a record")),
    record(0xf777, 15, 0, shape(6516, 2)),
    record(0xf777, 0, 0, Buffer.from("not a record")),
  ]) {
    const { s, w } = read(wrap(opaque));
    assert.deepEqual(
      s.map((x) => x.shapeId),
      [6515],
    );
    assert.deepEqual(w, []);
  }
  const bad = wrap(record(0xf777, 15, 0));
  bad.writeUInt32LE(0xffffffff, bad.length - 4);
  assert.equal(read(bad).s.length, 0);
  assert.ok(read(bad).w.length);
  const doc = parseMsDoc(opaqueSibling(makeTextboxDoc()));
  assert.ok(doc.textboxLayout.frames.every((f) => f.mapping === "mapped"));
  assert.equal(text(doc), text(parseMsDoc(makeTextboxDoc())));
});
test("compound real CFB field/opaque-container/SEPX control keeps text and independently scoped diagnostics", () => {
  const m = parseMsDoc(compoundReviewDoc());
  budget(m, "unknownSprms");
  assert.equal(
    renderMsDoc(m).html,
    html(makeTextboxDoc({ texts: fieldTexts })),
  );
  assert.ok(
    m.textboxLayout.frames.every(
      (f) => f.raw.drawing && f.reasons.includes("unsafe-field-boundary"),
    ),
  );
  assert.ok(!m.warnings.some((w) => w.table === "DggInfo"));
  assert.ok(
    m.warnings.some((w) => w.code === "MSDOC_TEXTBOX_STORY_LINEARIZED"),
  );
});
test("budget exhaustion remains explicitly diagnosed when ordinary metadata diagnostics are saturated", () => {
  const raw = Buffer.alloc(8192 * 3);
  for (let i = 0; i < 8192; i++) raw.writeUInt16LE(i, i * 3);
  const word = Buffer.concat([u16(raw.length), raw]),
    sed = Buffer.alloc(12),
    table = plc(
      Array.from({ length: 10 }, (_, i) => i),
      Array.from({ length: 9 }, () => sed),
    );
  const warnings = Array.from({ length: 256 }, () => ({
    message: "prior bounded metadata warning",
    code: "MSDOC_SECTION_GEOMETRY_INVALID",
  }));
  warnings.unshift(
    {
      message: "preserve table diagnostic",
      code: "MSDOC_TABLE_CSSA_WIDTH_OUT_OF_RANGE",
    },
    { message: "preserve linearized", code: "MSDOC_TEXTBOX_STORY_LINEARIZED" },
  );
  readTextboxSections(
    word,
    table,
    { fcPlcfSed: 0, lcbPlcfSed: table.length },
    warnings,
  );
  assert.equal(warnings.length, 258);
  assert.equal(
    warnings.filter((w) => w.code === "MSDOC_SECTION_GEOMETRY_BUDGET_EXCEEDED")
      .length,
    1,
  );
  assert.equal(warnings[0].code, "MSDOC_TABLE_CSSA_WIDTH_OUT_OF_RANGE");
  assert.equal(warnings[1].code, "MSDOC_TEXTBOX_STORY_LINEARIZED");
});
test("multiple FOPT boolean use masks conflict only on contradictory overlapping bits", async () => {
  const { fopt, u32 } = await import("./helpers/textbox-fixture.mjs");
  const read = (values) => {
    const payload = Buffer.concat([
      record(0xf00a, 2, 202, Buffer.concat([u32(7119), u32(0xa00)])),
      ...values.map((v, i) => fopt([[959, v]], [0xf00b, 0xf121, 0xf122][i])),
    ]);
    const art = Buffer.concat([
      record(0xf000, 15, 0),
      Buffer.from([0]),
      record(0xf002, 15, 0, record(0xf004, 15, 0, payload)),
    ]);
    return readFloatingDrawings(
      art,
      { fcDggInfo: 0, lcbDggInfo: art.length },
      [],
    )[0];
  };
  for (const values of [
    [0x00020000, 0x00040004],
    [0x00020002, 0x00020002],
    [0x00020002, 0x00040004, 0x00080008],
  ])
    assert.ok(!read(values).reasons.includes("conflicting-shape-property"));
  for (const values of [
    [0x00020002, 0x00020000],
    [0x00020002, 0x00040004, 0x00020000],
  ])
    assert.ok(read(values).reasons.includes("conflicting-shape-property"));
});
test("aggregate limits also span distinct SEPX offsets, not only repeated identical offsets", () => {
  const raw = Buffer.alloc(8192 * 3);
  for (let i = 0; i < 8192; i++) raw.writeUInt16LE(i, i * 3);
  const sepx = Buffer.concat([u16(raw.length), raw]),
    word = Buffer.concat([sepx, sepx]);
  const entries = Array.from({ length: 9 }, (_, i) => {
    const sed = Buffer.alloc(12);
    sed.writeUInt32LE(i % 2 ? sepx.length : 0, 2);
    return sed;
  });
  const table = plc(
      Array.from({ length: 10 }, (_, i) => i),
      entries,
    ),
    warnings = [];
  const sections = readTextboxSections(
    word,
    table,
    { fcPlcfSed: 0, lcbPlcfSed: table.length },
    warnings,
  );
  assert.equal(
    sections.reduce((n, s) => n + s.unknownSprms.length, 0),
    65536,
  );
  assert.equal(
    warnings.filter((w) => w.code === "MSDOC_SECTION_GEOMETRY_BUDGET_EXCEEDED")
      .length,
    1,
  );
  assert.deepEqual(
    sections.slice(0, 2).map((s) => s.sepxOffset),
    [0, sepx.length],
  );
});
test("document-default to shape override is legitimate, unlike contradictory same-level explicit use bits", () => {
  const m = parseMsDoc(
    makeTextboxDoc({
      defaults: [
        [129, 76123],
        [191, 0x00030003],
      ],
      properties: [
        [129, 89231],
        [191, 0x00010000],
      ],
    }),
  );
  const d = m.textboxLayout.frames[0].raw.drawing;
  assert.equal(d.properties.find((p) => p.id === 129).value, 89231);
  assert.equal(d.properties.find((p) => p.id === 191).value, 0x00030002);
  assert.ok(!d.reasons.includes("conflicting-shape-property"));
  assert.equal(d.rawProperties.filter((p) => p.id === 129).length, 2);
});
