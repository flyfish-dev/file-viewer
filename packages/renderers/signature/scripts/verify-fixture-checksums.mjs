import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const fixturesRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../test/fixtures/github-206-contributed",
);
const manifest = await readFile(resolve(fixturesRoot, "SHA256SUMS"), "utf8");
const entries = manifest.split(/\r?\n/u).filter(Boolean);

assert(
  entries.length > 0,
  "The contributed fixture checksum manifest must not be empty.",
);

for (const line of entries) {
  const match = line.match(/^([a-f0-9]{64})  \.\/(.+)$/u);
  assert(match, `Invalid SHA256SUMS entry: ${line}`);
  const [, expected, relativePath] = match;
  const absolutePath = resolve(fixturesRoot, relativePath);
  assert(
    absolutePath.startsWith(`${fixturesRoot}${sep}`),
    `Fixture checksum path escapes the corpus root: ${relativePath}`,
  );
  const actual = createHash("sha256")
    .update(await readFile(absolutePath))
    .digest("hex");
  assert.equal(actual, expected, `Fixture checksum mismatch: ${relativePath}`);
}

console.log(
  `Verified ${entries.length} immutable Issue #206 fixture checksums.`,
);
