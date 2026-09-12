import assert from "node:assert/strict";
import { test } from "node:test";
import { IfcImporter } from "@thatopen/fragments";
import {
  applyIfcSettings,
  copyIfcImporterSettings,
  copyIfcSettings,
} from "../dist/ifcSettings.js";

test("data settings are independent snapshots with native Sets/Maps", () => {
  const source = {
    webIfcSettings: { COORDINATE_TO_ORIGIN: false, CIRCLE_SEGMENTS: 24 },
    attributesToExclude: new Set(["Name"]),
    relations: new Map([[1, { forRelating: "a", forRelated: "b" }]]),
  };
  const copy = copyIfcImporterSettings(source);
  source.attributesToExclude.add("GlobalId");
  source.webIfcSettings.CIRCLE_SEGMENTS = 32;
  assert.deepEqual([...copy.attributesToExclude], ["Name"]);
  assert.equal(copy.webIfcSettings.CIRCLE_SEGMENTS, 24);
  assert.ok(copy.relations instanceof Map);
  assert.deepEqual(copyIfcSettings(undefined), {});
});
test("accessors, functions, classes, cycles and oversized inputs fail closed", () => {
  const cyclic = {};
  cyclic.self = cyclic;
  let called = false;
  const accessor = {
    get webIfcSettings() {
      called = true;
      return {};
    },
  };
  for (const value of [
    accessor,
    cyclic,
    { fn() {} },
    { date: new Date() },
    { value: Infinity },
    { value: undefined },
    { text: "x".repeat(65537) },
    { values: new Set(Array.from({ length: 2049 }, (_, i) => i)) },
    { values: new Array(2049) },
  ])
    assert.throws(() => copyIfcSettings(value));
  assert.equal(called, false);
  let depth = {};
  for (let i = 0; i < 10; i++) depth = { inner: depth };
  assert.throws(() => copyIfcSettings(depth), /limits/);
});
test("prototype/private keys and resource/method overrides are rejected", () => {
  for (const key of [
    "__proto__",
    "constructor",
    "prototype",
    "_builder",
    "wasm",
    "webIfc",
    "workerUrl",
    "process",
    "dispose",
  ])
    assert.throws(() => copyIfcImporterSettings(JSON.parse(`{"${key}":{}}`)));
  assert.throws(() =>
    copyIfcSettings(
      JSON.parse('{"webIfcSettings":{"__proto__":{"polluted":true}}}'),
    ),
  );
  assert.equal({}.polluted, undefined);
});
test("real importer overrides preserve library-owned collections and unrelated defaults", () => {
  const importer = new IfcImporter();
  const excluded = importer.attributesToExclude,
    classes = importer.classes.elements,
    wasm = importer.wasm,
    process = importer.process;
  applyIfcSettings(
    importer,
    copyIfcImporterSettings({
      webIfcSettings: { COORDINATE_TO_ORIGIN: false, CIRCLE_SEGMENTS: 24 },
      geometryProcessSettings: { threshold: 1000 },
      attributesToExclude: new Set(["Name"]),
      classes: { elements: new Set([123]) },
      includeUniqueAttributes: false,
      includeMaterialProperties: true,
    }),
  );
  assert.equal(importer.webIfcSettings.COORDINATE_TO_ORIGIN, false);
  assert.equal(importer.webIfcSettings.CIRCLE_SEGMENTS, 24);
  assert.equal(importer.geometryProcessSettings.threshold, 1000);
  assert.equal(importer.geometryProcessSettings.precision, 1e6);
  assert.equal(importer.attributesToExclude, excluded);
  assert.deepEqual([...excluded], ["Name"]);
  assert.equal(importer.classes.elements, classes);
  assert.deepEqual([...classes], [123]);
  assert.equal(importer.wasm, wasm);
  assert.equal(importer.process, process);
  assert.equal(importer.includeMaterialProperties, true);
  assert.throws(
    () => applyIfcSettings(importer, { typoOption: true }),
    /Unknown/,
  );
  assert.throws(
    () => applyIfcSettings(importer, { includeUniqueAttributes: "false" }),
    /Incompatible/,
  );
  assert.throws(
    () => applyIfcSettings(importer, { attributesToExclude: ["Name"] }),
    /requires a Set/,
  );
});
test("Fragments configuration only assigns own writable data fields", () => {
  const settings = { maxUpdateRate: 100, graphicsQuality: 0 };
  applyIfcSettings(settings, copyIfcSettings({ maxUpdateRate: 80 }));
  assert.equal(settings.maxUpdateRate, 80);
  assert.throws(
    () => applyIfcSettings(settings, { dispose: false }),
    /Unknown/,
  );
  let called = false;
  Object.defineProperty(settings, "accessor", {
    get() {
      called = true;
    },
  });
  assert.throws(() => applyIfcSettings(settings, { accessor: 1 }), /non-data/);
  assert.equal(called, false);
});
test("native collection accessors are rejected without executing application code", () => {
  let called = false;
  const collection = new Set([1]);
  Object.defineProperty(collection, "size", {
    get() {
      called = true;
      return 1;
    },
  });
  assert.throws(() => copyIfcSettings({ collection }), /custom properties/);
  assert.equal(called, false);
});
