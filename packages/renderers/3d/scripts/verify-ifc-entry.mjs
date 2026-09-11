import assert from "node:assert/strict";
import { readFile, mkdtemp, symlink, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createRendererRegistry,
  installFileViewerRendererPlugins,
} from "@file-viewer/core";
import { createIfcRenderer } from "../dist/ifc.js";
const registry = createRendererRegistry();
const handlers = [];
await installFileViewerRendererPlugins({
  registry,
  plugins: [createIfcRenderer()],
  registerHandler: (item) => handlers.push(item),
});
assert.equal(registry.getByExtension("ifc")?.id, "ifc");
assert.equal(registry.getByExtension("glb")?.id, "model");
assert.ok(handlers.some((item) => item.rendererId === "ifc"));
const entry = await readFile(
  new URL("../dist/ifc.js", import.meta.url),
  "utf8",
);
assert.ok(!/from\s+['"](?:three|@thatopen|web-ifc)/.test(entry));
const main = await readFile(
  new URL("../src/index.ts", import.meta.url),
  "utf8",
);
assert.ok(
  !main.includes("./ifc"),
  "Optional IFC must not enter the ordinary entry",
);
const pkg = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
for (const name of [
  "@thatopen/components",
  "@thatopen/fragments",
  "web-ifc",
  "esbuild",
]) {
  assert.ok(!pkg.dependencies[name]);
  assert.equal(pkg.peerDependenciesMeta[name]?.optional, true);
}
assert.equal(pkg.exports["./ifc"].import, "./dist/ifc.js");
console.log(
  "IFC enhancement ownership, optional dependencies and lazy entry passed.",
);

const cli = fileURLToPath(new URL("../bin/copy-ifc-assets.mjs", import.meta.url));
const temp = await mkdtemp(join(tmpdir(), "file-viewer-ifc-cli-"));
try {
  const alias = join(temp, "file-viewer-ifc-assets");
  await symlink(cli, alias);
  for (const command of [cli, alias]) {
    const help = spawnSync(process.execPath, [command, "--help"], { encoding: "utf8" });
    assert.equal(help.status, 0, help.stderr);
    assert.match(help.stdout, /Usage: file-viewer-ifc-assets/);
    const invalid = spawnSync(process.execPath, [command, "--unknown"], { encoding: "utf8" });
    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /Expected one destination directory/);
  }
  const moduleUrl = new URL("../bin/copy-ifc-assets.mjs", import.meta.url).href;
  const imported = spawnSync(process.execPath, ["--input-type=module", "-e",
    `import {copyIfcAssets} from ${JSON.stringify(moduleUrl)}; if (typeof copyIfcAssets !== 'function') process.exit(1)`,
    join(temp, "nonexistent-entry")], { encoding: "utf8" });
  assert.equal(imported.status, 0, imported.stderr);
  assert.equal(imported.stdout, "");
} finally {
  await rm(temp, { recursive: true, force: true });
}
console.log("Installed CLI symlink execution and side-effect-free helper import passed.");
