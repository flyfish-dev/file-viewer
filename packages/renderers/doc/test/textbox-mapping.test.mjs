import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { parseMsDoc, renderMsDoc } from "../dist/index.js";
import { buildBlocks } from "../dist/msdoc/parser.js";
import {
  paraPropsToState,
  tablePropsToState,
} from "../dist/msdoc/properties.js";
import { readLayoutPlc } from "../dist/msdoc/layout-binary.js";
import { makeTextboxDoc, plc } from "./helpers/textbox-fixture.mjs";
const text = (m) =>
  m.blocks
    .flatMap((b) =>
      b.type === "paragraph"
        ? b.inlines.filter((i) => i.type === "text").map((i) => i.text)
        : [],
    )
    .join("|");
const parse = (opts) => parseMsDoc(makeTextboxDoc(opts));
test("real CFB synthetic DOC: two independent mapped frames, non-sample coordinates and duplicate text survive once per range", () => {
  const m = parse();
  assert.equal(m.kind, "msdoc");
  assert.equal(m.version, 1);
  assert.equal(m.textboxLayout.frames.length, 2);
  assert.ok(
    m.textboxLayout.frames.every(
      (f) =>
        f.mapping === "mapped" && f.layoutEligibility === "pending-evidence",
    ),
  );
  assert.equal(text(m).split("Duplicate β 中文").length - 1, 2);
  assert.deepEqual(
    m.textboxLayout.frames.map((f) => f.contentBlockIds.length),
    [1, 1],
  );
  assert.equal(m.textboxLayout.frames[0].raw.rectTwips.left, -333);
  assert.deepEqual(
    m.textboxLayout.frames.map((f) => f.anchor.cp),
    [0, 1],
  );
  assert.deepEqual(m.textboxLayout.anchorParagraphs, [
    { storyKind: "main", globalRange: { start: 0, end: 3 } },
  ]);
  assert.equal(m.textboxLayout.sections[0].pageWidthTwips, 12240);
  assert.equal(m.textboxLayout.sections[0].status, "explicit");
  assert.ok(
    m.warnings.some((w) => w.code === "MSDOC_TEXTBOX_STORY_LINEARIZED"),
  );
  assert.deepEqual(structuredClone(m), m);
  assert.deepEqual(renderMsDoc(m).warnings, m.warnings);
  assert.ok(m.textboxLayout.frames.every((f) => !("position" in f)));
  assert.doesNotMatch(renderMsDoc(m).html, /position:absolute/);
});
test("FOPT document defaults and explicit boolean use bits merge without erasing unspecified defaults", () => {
  const m = parse({
    defaults: [
      [129, 76123],
      [191, 0x00030003],
    ],
    properties: [
      [130, 89123],
      [191, 0x00010000],
    ],
  });
  const d = m.textboxLayout.frames[0].raw.drawing;
  const get = (id) => d.properties.find((p) => p.id === id);
  assert.equal(get(129).value, 76123);
  assert.equal(get(129).source, "document-default");
  assert.equal(get(130).source, "shape");
  assert.equal(get(191).value, 0x00030002);
  assert.equal(get(191).useMask, 3);
  assert.equal(d.rawProperties.filter((p) => p.id === 191).length, 2);
});
test("shape/client ID conflicts, rotation, linked chains, invalid drawing and SEPX retain all text", () => {
  const baseline = text(parse());
  for (const opts of [
    { conflict: true },
    { rotation: 65536 },
    { chainCount: 2 },
    { malformedArt: true },
    { negativeSepx: true },
  ]) {
    const m = parse(opts);
    assert.equal(text(m), baseline);
    assert.ok(m.warnings.length > 1);
    assert.ok(
      m.warnings.some((w) => w.code === "MSDOC_TEXTBOX_STORY_LINEARIZED"),
    );
  }
  assert.equal(
    parse({ conflict: true }).textboxLayout.frames[1].mapping,
    "invalid",
  );
  assert.equal(
    parse({ negativeSepx: true }).textboxLayout.sections[0].status,
    "invalid",
  );
});
test("actual malformed empty record is scoped; final reusable record flag zero and oversized sentinel are ignored", () => {
  const m = parse({
    texts: ["\r", "Visible 875\r"],
    mutate: ({ table, fields }) => {
      const p = fields.fcPlcftxbxTxt;
      table.writeInt32LE(0x4000, p + 12);
    },
  });
  assert.equal(m.textboxLayout.frames.length, 2);
  assert.equal(m.textboxLayout.frames[0].mapping, "invalid");
  assert.equal(m.textboxLayout.frames[1].mapping, "mapped");
  assert.match(text(m), /Visible 875/);
});
test("PLC malformed lengths, backwards/negative CP and budget are rejected without a scan", () => {
  for (const b of [
    Buffer.alloc(3),
    Buffer.alloc(10),
    plc([2, 1], [Buffer.alloc(26)]),
    plc([-1, 1], [Buffer.alloc(26)]),
    Buffer.alloc(4 + 30 * 16385),
  ])
    assert.throws(() => readLayoutPlc(b, 26));
});
test("malformed PLCs, duplicate IDs and complex FOPT parent overflow preserve fallback content", () => {
  const baseline = text(parse());
  for (const opts of [
    { ids: [8911, 8911] },
    {
      mutate: ({ word, fields }) => {
        const p = fields._pairs.find((p) => p.name === "PlcftxbxTxt");
        word.writeUInt32LE(p.lcb - 1, 158 + p.index * 8);
      },
    },
    {
      mutate: ({ table, fields }) => {
        table.writeInt32LE(-1, fields.fcPlcftxbxTxt);
      },
    },
    {
      mutate: ({ table, fields }) => {
        const start = fields.fcDggInfo;
        for (let i = start; i < start + fields.lcbDggInfo - 6; i++) {
          if (table.readUInt16LE(i) === 128) {
            table.writeUInt16LE(0x8080, i);
            table.writeUInt32LE(0xffffff00, i + 2);
            break;
          }
        }
      },
    },
  ]) {
    const m = parse(opts);
    assert.equal(text(m), baseline);
    assert.ok(
      m.warnings.some((w) => w.code === "MSDOC_TEXTBOX_MAPPING_INVALID"),
    );
  }
});
test("table builder never merges two textbox instances with identical story kind", () => {
  const p = (id, flowId) => ({
    id,
    cpStart: 0,
    cpEnd: 2,
    text: id,
    inlines: [],
    terminator: "\u0007",
    storyKind: "textbox",
    sourceRange: {
      storyKind: "textbox",
      global: { start: 0, end: 2 },
      story: { start: 0, end: 2 },
      flowId,
    },
    styleId: 0,
    styleName: "",
    rawProperties: [],
    paraProps: [],
    tableProps: [],
    segments: [],
    paraState: { ...paraPropsToState([]), inTable: true },
    tableState: tablePropsToState([]),
  });
  assert.equal(
    buildBlocks([p("a", "textbox-3"), p("b", "textbox-8")]).filter(
      (b) => b.type === "table",
    ).length,
    2,
  );
});
test("public #171 retains all old text, reusable tail and grouped content without claiming layout", () => {
  const m = parseMsDoc(
    readFileSync(
      new URL("./fixtures/github-171-textbox-resume.doc", import.meta.url),
    ),
  );
  assert.equal(m.meta.counts.paragraphs, 28);
  assert.equal(m.textboxLayout.frames.length, 15);
  assert.match(text(m), /求职意向/);
  assert.match(text(m), /实习经历/);
  assert.ok(
    m.textboxLayout.frames.some((f) => f.reasons.includes("group-shape")),
  );
  assert.ok(
    m.warnings.some((w) => w.code === "MSDOC_TEXTBOX_STORY_LINEARIZED"),
  );
  assert.ok(!text(m).includes("\b"));
});
test("unchanged #461 original maps the visible box separately from malformed empty record", () => {
  const m = parseMsDoc(
    readFileSync(
      new URL("./fixtures/github-461-floating-textbox.doc", import.meta.url),
    ),
  );
  assert.equal(m.textboxLayout.frames.length, 2);
  const [empty, visible] = m.textboxLayout.frames;
  assert.equal(empty.mapping, "invalid");
  assert.ok(empty.reasons.includes("invalid-textbox-range"));
  assert.equal(visible.mapping, "mapped");
  assert.equal(visible.shapeId, 1027);
  assert.equal(visible.anchor.cp, 1);
  assert.equal(visible.layoutEligibility, "pending-evidence");
  assert.equal(visible.raw.drawing.parentShapeId, undefined);
  assert.equal(
    visible.raw.drawing.properties.find((p) => p.id === 912).value,
    1,
  );
  assert.equal(visible.raw.bx, 2);
  assert.deepEqual(visible.globalRange, { start: 68, end: 90 });
  assert.equal(visible.contentBlockIds.length, 1);
  assert.equal(text(m).split("FLOATING BOX CONTROL").length - 1, 1);
  assert.equal(m.meta.counts.paragraphs, 4);
  assert.equal(m.textboxLayout.sections[0].pageWidthTwips, 11906);
  assert.equal(m.textboxLayout.sections[0].status, "partial");
  assert.ok(
    m.warnings.some((w) => w.code === "MSDOC_TEXTBOX_STORY_LINEARIZED"),
  );
});
test("row-end recovery also respects per-box flow isolation before table construction", async () => {
  const { normalizeRowEndOnlyTables } = await import("../dist/msdoc/parser.js");
  const base = (flowId) => ({
    id: flowId,
    cpStart: 0,
    cpEnd: 2,
    text: "cell",
    inlines: [],
    terminator: "\u0007",
    storyKind: "textbox",
    sourceRange: { flowId },
    paraState: paraPropsToState([]),
    tableState: tablePropsToState([]),
    tableProps: [],
  });
  const previous = base("textbox-2"),
    end = base("textbox-5");
  end.paraState.tableRowEnd = true;
  end.tableState.defTable = {
    cb: 0,
    numberOfColumns: 1,
    rgdxaCenter: [0, 1137],
    cells: [{ tcgrf: {}, wWidth: 1137, borders: {} }],
  };
  normalizeRowEndOnlyTables([previous, end]);
  assert.equal(previous.paraState.inTable, false);
});
test("strict OfficeArt record version, nesting/record budgets and unknown children are bounded", async () => {
  const { readFloatingDrawings } =
    await import("../dist/msdoc/floating-drawings.js");
  const { record, shape } = await import("./helpers/textbox-fixture.mjs");
  const root = record(0xf000, 15, 0);
  const wrap = (payload) =>
    Buffer.concat([root, Buffer.from([0]), record(0xf002, 15, 0, payload)]);
  const read = (b) => {
    const w = [];
    const s = readFloatingDrawings(
      b,
      { _pairs: [], fcDggInfo: 0, lcbDggInfo: b.length },
      w,
    );
    return { s, w };
  };
  let nested = shape(7111, 1);
  for (let i = 0; i < 35; i++) nested = record(0xf003, 15, 0, nested);
  assert.equal(read(wrap(nested)).s.length, 0);
  assert.ok(read(wrap(nested)).w.length);
  const many = wrap(
    Buffer.concat(Array.from({ length: 16385 }, () => record(0xf100, 0, 0))),
  );
  assert.equal(read(many).s.length, 0);
  const unknown = wrap(record(0xf100, 0, 0, Buffer.alloc(8)));
  assert.deepEqual(read(unknown).s, []);
  assert.deepEqual(read(unknown).w, []);
  const bad = wrap(shape(7111, 1));
  bad.writeUInt16LE(0, 0);
  assert.equal(read(bad).s.length, 0);
  assert.ok(read(bad).w.length);
});
