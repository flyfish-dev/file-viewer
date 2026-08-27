import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(packageDir, "../../..");
const read = (path) => readFile(resolve(repositoryRoot, path), "utf8");
const readJson = async (path) => JSON.parse(await read(path));

const readWorkspacePackages = async () => {
  const packagesRoot = resolve(repositoryRoot, "packages");
  const packages = [];
  for (const entry of await readdir(packagesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const directManifest = resolve(packagesRoot, entry.name, "package.json");
    try {
      packages.push(JSON.parse(await readFile(directManifest, "utf8")));
      continue;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    for (const child of await readdir(resolve(packagesRoot, entry.name), {
      withFileTypes: true,
    })) {
      if (!child.isDirectory()) continue;
      const manifest = resolve(
        packagesRoot,
        entry.name,
        child.name,
        "package.json",
      );
      try {
        packages.push(JSON.parse(await readFile(manifest, "utf8")));
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    }
  }
  return packages;
};

const dependencyNames = (manifest) =>
  ["dependencies", "optionalDependencies"].flatMap((section) =>
    Object.keys(manifest[section] || {}),
  );

const [
  presetPackage,
  presetSource,
  rootPackage,
  rendererSource,
  rendererReadme,
  formatsGuide,
  workspacePackages,
] = await Promise.all([
  readJson("packages/presets/all/package.json"),
  read("packages/presets/all/src/index.ts"),
  readJson("package.json"),
  read("packages/renderers/signature/src/index.ts"),
  read("packages/renderers/signature/README.en.md"),
  read("docs/guide/formats.md"),
  readWorkspacePackages(),
]);

const packageByName = new Map(
  workspacePackages.map((manifest) => [manifest.name, manifest]),
);
const fullPackages = workspacePackages
  .filter((manifest) => manifest.name?.endsWith("-full"))
  .sort((left, right) => left.name.localeCompare(right.name));
const expectedFullPackages = [
  "@file-viewer/jquery-full",
  "@file-viewer/react-full",
  "@file-viewer/react-legacy-full",
  "@file-viewer/svelte-full",
  "@file-viewer/vue2.6-full",
  "@file-viewer/vue2.7-full",
  "@file-viewer/vue3-full",
  "@file-viewer/web-full",
];

assert.deepEqual(
  fullPackages.map((manifest) => manifest.name),
  expectedFullPackages,
  "The opt-in boundary must cover every published Full package.",
);

for (const fullPackage of fullPackages) {
  const queue = [fullPackage.name];
  const visited = new Set();
  while (queue.length > 0) {
    const currentName = queue.shift();
    if (visited.has(currentName)) continue;
    visited.add(currentName);
    assert.notEqual(
      currentName,
      "@file-viewer/renderer-signature",
      `${fullPackage.name} must not pull renderer-signature through its runtime dependency closure.`,
    );
    const manifest = packageByName.get(currentName);
    if (!manifest) continue;
    queue.push(
      ...dependencyNames(manifest).filter((name) => packageByName.has(name)),
    );
  }
}

assert(
  !presetPackage.dependencies?.["@file-viewer/renderer-signature"],
  "preset-all must not depend on renderer-signature.",
);
assert(
  rootPackage.scripts?.["build:renderers"]?.includes(
    "!@file-viewer/renderer-signature",
  ),
  "The default renderer build must leave the optional Rust/WASM package out of the standard path.",
);
assert(
  !presetSource.includes("@file-viewer/renderer-signature"),
  "preset-all must not import renderer-signature.",
);
assert(
  !presetSource.includes("signatureRenderer"),
  "preset-all must not register signatureRenderer.",
);
assert.match(
  rendererSource,
  /presets:\s*\[\s*\]/,
  "renderer-signature must declare no default preset membership.",
);
assert(
  rendererReadme.includes("explicit opt-in"),
  "renderer README must describe the package as explicit opt-in.",
);
assert(
  formatsGuide.includes("Digital signatures (explicit opt-in, experimental)"),
  "format guide must list the optional signature pipeline.",
);
assert(
  formatsGuide.includes("not included in `preset-all` or `*-full` packages"),
  "format guide must state the default Full boundary.",
);

console.log(
  "Verified renderer-signature remains an explicit opt-in outside preset-all and Full package dependencies.",
);
