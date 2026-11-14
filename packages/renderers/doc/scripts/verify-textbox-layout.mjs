// Public-binary regression; synthetic CFB and adversarial structures run in the
// normal build's test/textbox-mapping.test.mjs entry point.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseMsDoc, renderMsDoc } from "../dist/index.js";
const parsed = parseMsDoc(
  await readFile(
    new URL("../test/fixtures/github-171-textbox-resume.doc", import.meta.url),
  ),
);
assert.equal(parsed.textboxLayout.frames.length, 15);
assert.ok(
  parsed.warnings.some((w) => w.code === "MSDOC_TEXTBOX_STORY_LINEARIZED"),
);
assert.deepEqual(renderMsDoc(parsed).warnings, parsed.warnings);
assert.deepEqual(structuredClone(parsed), parsed);
assert.ok(parsed.textboxLayout.frames.every((f) => !("position" in f)));
console.log(
  "[doc] Textbox raw mapping and fallback contract verified; visual placement remains unsupported.",
);
