#!/usr/bin/env node
import { createRequire } from "node:module";
import { realpathSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  mkdir,
  copyFile,
  readFile,
  writeFile,
  mkdtemp,
  rm,
  readdir,
  lstat,
  rename,
} from "node:fs/promises";
import { createHash } from "node:crypto";

const require = createRequire(import.meta.url);
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
async function packageDir(name, resolver = require) {
  let current = dirname(resolver.resolve(name));
  for (;;) {
    try {
      const metadata = JSON.parse(
        await readFile(join(current, "package.json"), "utf8"),
      );
      if (metadata.name === name) return { path: current, metadata };
    } catch {}
    const parent = dirname(current);
    if (parent === current)
      throw new Error(`Cannot locate ${name} package root`);
    current = parent;
  }
}
async function checkOutputPath(path, directory = false) {
  let info;
  try {
    info = await lstat(path);
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  if (
    info.isSymbolicLink() ||
    !(directory ? info.isDirectory() : info.isFile())
  )
    throw new Error(
      `IFC asset destination must be a regular ${directory ? "directory" : "file"}: ${path}`,
    );
}
export async function copyIfcAssets(destination) {
  const [webIfc, fragments, components, three] = await Promise.all(
    ["web-ifc", "@thatopen/fragments", "@thatopen/components", "three"].map((name) => packageDir(name)),
  );
  const fragmentRequire = createRequire(join(fragments.path, "package.json"));
  const importerWebIfc = await packageDir("web-ifc", fragmentRequire);
  const componentRequire = createRequire(join(components.path, "package.json"));
  const componentFragments = await packageDir("@thatopen/fragments", componentRequire);
  const packages = [
    webIfc,
    fragments,
    components,
    three,
    ...(await Promise.all(
      ["earcut", "flatbuffers", "lru-cache", "pako"].map((name) =>
        packageDir(name, fragmentRequire),
      ),
    )),
  ];
  if (
    webIfc.metadata.version !== "0.0.77" ||
    fragments.metadata.version !== "3.4.8" ||
    components.metadata.version !== "3.4.9" ||
    realpathSync(importerWebIfc.path) !== realpathSync(webIfc.path) ||
    realpathSync(componentFragments.path) !== realpathSync(fragments.path)
  )
    throw new Error(
      "IFC assets and importer must share the tested web-ifc@0.0.77, @thatopen/fragments@3.4.8 and @thatopen/components@3.4.9 engines",
    );
  const { build } = await import("esbuild");
  destination = resolve(destination);
  await checkOutputPath(destination, true);
  await checkOutputPath(join(destination, "licenses"), true);
  await mkdir(dirname(destination), { recursive: true });
  const stage = await mkdtemp(join(dirname(destination), ".ifc-assets-"));
  try {
    await copyFile(
      join(webIfc.path, "web-ifc.wasm"),
      join(stage, "web-ifc.wasm"),
    );
    await copyFile(
      join(webIfc.path, "web-ifc-mt.wasm"),
      join(stage, "web-ifc-mt.wasm"),
    );
    await copyFile(
      join(fragments.path, "dist/Worker/worker.mjs"),
      join(stage, "fragments.worker.mjs"),
    );
    await build({
      entryPoints: [join(packageRoot, "dist/ifc-import.worker.js")],
      outfile: join(stage, "ifc-import.worker.js"),
      bundle: true,
      format: "esm",
      platform: "browser",
      target: "es2022",
      legalComments: "linked",
      minify: true,
      logLevel: "silent",
    });
    const licenses = join(stage, "licenses");
    await mkdir(licenses);
    await copyFile(
      join(packageRoot, "licenses/thatopen-fragments-MIT.txt"),
      join(licenses, "thatopen-fragments-MIT.txt"),
    );
    await copyFile(
      join(packageRoot, "licenses/thatopen-components-MIT.txt"),
      join(licenses, "thatopen-components-MIT.txt"),
    );
    for (const pkg of packages) {
      const names = (await readdir(pkg.path)).filter((name) =>
        /^licen[cs]e(?:[.-]|$)/i.test(name),
      );
      for (const name of names)
        await copyFile(
          join(pkg.path, name),
          join(licenses, `${pkg.metadata.name.replace(/[@/]/g, "_")}-${name}`),
        );
    }
    const notice = [
      "Optional IFC runtime assets for File Viewer.",
      "These assets are not loaded by the ordinary model/Office entry.",
      "web-ifc is MPL-2.0. Its WASM and bundled import code are unmodified upstream implementations.",
      "Corresponding source and build instructions: https://github.com/ThatOpen/engine_web-ifc/tree/f26c4beef0a668ebdb180d2b95a94097a1e21cef (release 0.0.77).",
      "Fragments is MIT: https://github.com/ThatOpen/engine_fragment/tree/2ba7e9ddbc02689b8c1044e31daed26f3005f3c5 (release 3.4.8).",
      "Components is MIT: https://github.com/ThatOpen/engine_components/tree/8479a7c5c6a3c0cf8c7ceab1d1fb329a3f7d1922 (release 3.4.9).",
      "Preserve licenses/, the linked worker legal notices and this notice when redistributing.",
      ...packages.map(
        (pkg) =>
          `${pkg.metadata.name}@${pkg.metadata.version}: ${pkg.metadata.license || "See package license"}`,
      ),
      "",
    ].join("\n");
    await writeFile(join(stage, "NOTICE.txt"), notice);
    const files = {};
    for (const name of await readdir(stage)) {
      if (name === "licenses") continue;
      const bytes = await readFile(join(stage, name));
      files[name] = {
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      };
    }
    await writeFile(
      join(stage, "manifest.json"),
      JSON.stringify(
        {
          schema: 1,
          packages: packages.map((pkg) => ({
            name: pkg.metadata.name,
            version: pkg.metadata.version,
            license: pkg.metadata.license,
          })),
          files,
        },
        null,
        2,
      ) + "\n",
    );
    // Check every owned path before changing any existing asset. Host files stay intact.
    const assetNames = (await readdir(stage)).filter((name) => name !== "licenses");
    const licenseNames = await readdir(licenses);
    for (const name of assetNames)
      await checkOutputPath(join(destination, name));
    for (const name of licenseNames)
      await checkOutputPath(join(destination, "licenses", name));
    await mkdir(join(destination, "licenses"), { recursive: true });
    await checkOutputPath(destination, true);
    await checkOutputPath(join(destination, "licenses"), true);
    // Rename complete staged files so a final file link is replaced rather than followed.
    for (const name of assetNames)
      await rename(join(stage, name), join(destination, name));
    for (const name of licenseNames)
      await rename(join(licenses, name), join(destination, "licenses", name));
    return { destination, files };
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}
function isEntryPoint() {
  try {
    // npm/pnpm execute bin entries through a symlink; import.meta.url points
    // at the real module. Do not silently skip the installed CLI in that case.
    return Boolean(process.argv[1]) &&
      realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    // Importing this helper from eval/another program is not CLI execution.
    return false;
  }
}
if (isEntryPoint()) {
  if (process.argv.includes("--help")) {
    console.log("Usage: file-viewer-ifc-assets [destination-directory]");
    process.exit(0);
  }
  if (process.argv.length > 3 || process.argv[2]?.startsWith("-")) {
    console.error("Expected one destination directory");
    process.exit(1);
  }
  copyIfcAssets(process.argv[2] || "public/file-viewer/vendor/ifc")
    .then((result) =>
      console.log(`IFC assets installed: ${result.destination}`),
    )
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
