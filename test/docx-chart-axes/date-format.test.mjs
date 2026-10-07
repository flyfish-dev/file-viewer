import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  ChartAxes,
  transformChartAxes,
} from "../../scripts/lib/docx-chart-axes.mjs";
const { JSDOM } = createRequire(
  new URL("../../packages/renderers/word/package.json", import.meta.url),
)("jsdom");
const win = new JSDOM("").window;
const c = new ChartAxes();
const xml = (s) => new win.DOMParser().parseFromString(s, "application/xml");
const ns = "http://schemas.openxmlformats.org/drawingml/2006/chart";
for (const [raw, fmt, epoch, expected] of [
  ["1", "yyyy/mm/dd", false, "1900/01/01"],
  ["59", "yyyy-mm-dd", false, "1900-02-28"],
  ["60", "yyyy-mm-dd", false, "1900-02-29"],
  ["61", "yyyy-mm-dd", false, "1900-03-01"],
  ["44708", "yyyy/m", false, "2022/5"],
  ["44708", "yyyy/m;@", false, "2022/5"],
  ["0", "yyyy-mm-dd", true, "1904-01-01"],
  ["0.5", "yyyy/mm/dd hh:mm:ss", true, "1904/01/01 12:00:00"],
  ["44708.5625", "m/d/yyyy h:mm AM/PM", false, "5/27/2022 1:30 PM"],
  ["44708", 'yyyy"年"mm"月"dd"日"', false, "2022年05月27日"],
  ["44708", "yyyy\\;mm;@", false, "2022;05"],
  ["44708", "mmm d, yyyy", false, "May 27, 2022"],
  ["44708", "dddd, mmmm d", false, "Friday, May 27"],
  ["44708", "[$-409]m/d/yyyy", false, "5/27/2022"],
  ["2958465", "yyyy-mm-dd", false, "9999-12-31"],
  ["NaN", "yyyy/m", false, "NaN"],
  ["", "yyyy/m", false, ""],
  ["A", "yyyy/m", false, "A"],
  ["44708", "0.00", false, "44708"],
  ["44708", "[$-804]yyyy/m", false, "44708"],
  ["44708", '"unterminated', false, "44708"],
  ["-1", "yyyy/m", false, "-1"],
  ["999999999", "yyyy/m", false, "999999999"],
])
  test(`UTC chart date ${JSON.stringify(raw)}, ${fmt}, ${epoch}`, () =>
    assert.equal(c.formatChartDateLabel(raw, fmt, epoch), expected));
test("Direct chart title does not steal a nested axis title or split rich runs", () => {
  const root = xml(
    `<c:chartSpace xmlns:c="${ns}" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><c:chart><c:plotArea><c:dateAx><c:title><c:tx><c:rich><a:p><a:r><a:t>Axis</a:t></a:r></a:p></c:rich></c:tx></c:title></c:dateAx></c:plotArea></c:chart></c:chartSpace>`,
  ).documentElement;
  assert.equal(c.extractChartTitle(root), "");
  const title = xml(
    `<c:title xmlns:c="${ns}" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><c:tx><c:rich><a:p><a:r><a:t>(</a:t></a:r><a:r><a:t>units</a:t></a:r><a:r><a:t>)</a:t></a:r></a:p></c:rich></c:tx></c:title>`,
  ).documentElement;
  root.firstElementChild.prepend(title);
  assert.equal(c.extractChartTitle(root), "(units)");
});
test("Only axes referenced by the active chart group are selected", () => {
  const root = xml(
    `<c:chartSpace xmlns:c="${ns}"><c:date1904/><c:chart><c:plotArea><c:dateAx><c:axId val="99"/></c:dateAx><c:lineChart><c:axId val="1"/><c:axId val="2"/></c:lineChart><c:dateAx><c:axId val="1"/><c:crossAx val="2"/></c:dateAx><c:valAx><c:axId val="2"/></c:valAx></c:plotArea></c:chart></c:chartSpace>`,
  ).documentElement;
  const a = c.resolveChartAxes(root, "lineChart");
  assert.equal(a.category.firstElementChild.getAttribute("val"), "1");
  assert.equal(a.value.firstElementChild.getAttribute("val"), "2");
  assert.equal(a.date1904, true);
  root.firstElementChild.setAttribute("val", "false");
  assert.equal(c.resolveChartAxes(root, "lineChart").date1904, false);
});
test("Major unit iteration is bounded and respects months at month end", () => {
  const axis = xml(
    `<c:dateAx xmlns:c="${ns}"><c:majorUnit val="1"/><c:majorTimeUnit val="months"/></c:dateAx>`,
  ).documentElement;
  assert.deepEqual(
    c
      .chartDateTicks(axis, [44957, 45046], 44957, 45046, false)
      .map((n) => c.formatChartDateLabel(String(n), "yyyy-mm-dd")),
    ["2023-01-31", "2023-02-28", "2023-03-31", "2023-04-30"],
  );
  axis.lastElementChild.setAttribute("val", "days");
  axis.firstElementChild.setAttribute("val", "0.00000000001");
  assert.deepEqual(c.chartDateTicks(axis, [1, 2], 1, 200000, false), [1, 2]);
});
test("Method transformation is fail-closed for missing and duplicate methods", () => {
  assert.throws(() => transformChartAxes("class A {}"));
  assert.throws(() =>
    transformChartAxes(
      "class A {renderChartSvg(){}} class B {renderChartSvg(){}}",
    ),
  );
  const result = transformChartAxes(
    "class A {renderChartSvg(){} extractChartTitle(){}}",
  );
  assert.match(result, /drawDateLineChart/);
  assert.throws(() => transformChartAxes(result));
});
