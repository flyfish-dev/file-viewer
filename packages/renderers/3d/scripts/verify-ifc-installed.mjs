/** Verify the normal packed IFC entry and asset CLI outside the source checkout. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import {
  copyFile, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../../..");
const samples = resolve(process.argv[2] || join(root, "output/ifc-samples"));
const proof = resolve(process.env.IFC_INSTALLED_EVIDENCE_DIR || join(root, "output/ifc-installed"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const inside = (path, directory) => path === directory || path.startsWith(directory + sep);
await mkdir(proof, { recursive: true });
const temp = await realpath(await mkdtemp(join(tmpdir(), "file-viewer-ifc-installed-")));
assert.ok(!inside(temp, await realpath(root)), "Consumer must be outside the checkout");
const consumer = join(temp, "consumer");
const tarballs = join(temp, "tarballs");
await mkdir(consumer);
await mkdir(tarballs);
await mkdir(join(proof, "tarballs"), { recursive: true });
const report = { status: "running", packages: [], commands: [], checks: [] };

async function packageDir(name, resolver) {
  let path = dirname(resolver.resolve(name));
  for (;;) {
    try {
      const metadata = JSON.parse(await readFile(join(path, "package.json"), "utf8"));
      if (metadata.name === name) return { path, metadata };
    } catch {}
    const parent = dirname(path);
    if (parent === path) throw new Error(`Cannot locate ${name} package root`);
    path = parent;
  }
}

async function run(label, command, args, cwd, env = process.env, expectFailure = false) {
  const logPath = join(proof, `${label}.log`);
  const log = createWriteStream(logPath);
  let tail = "", spawnError, logError, timedOut = false;
  log.on("error", (error) => { logError = error; });
  const child = spawn(command, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
  const capture = (bytes) => {
    log.write(bytes);
    tail = (tail + bytes.toString()).slice(-10000);
  };
  child.stdout.on("data", capture);
  child.stderr.on("data", capture);
  child.on("error", (error) => { spawnError = error; });
  const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, 10 * 60 * 1000);
  const exit = await new Promise((done) => child.on("close", (code, signal) => done({ code, signal })));
  clearTimeout(timer);
  await new Promise((done) => { log.on("close", done); log.end(); });
  report.commands.push({ label, command, args, exit, timedOut, expectFailure, log: basename(logPath) });
  if (spawnError || logError || timedOut || exit.signal || (expectFailure ? exit.code === 0 : exit.code !== 0))
    throw new Error(`${label} failed: ${spawnError || logError || exit.code}\n${tail}`);
  console.log(`IFC_INSTALLED_STEP ${label} passed`);
  return tail;
}

try {
  for (const path of ["packages/core", "packages/renderers/geometry-engine", "packages/renderers/3d"]) {
    const folder = join(root, path);
    const metadata = JSON.parse(await readFile(join(folder, "package.json"), "utf8"));
    const before = new Set(await readdir(tarballs));
    await run(`pack-${metadata.name.split("/").pop()}`, "pnpm", ["pack", "--pack-destination", tarballs], folder,
      { ...process.env, npm_config_ignore_scripts: "true" });
    const added = (await readdir(tarballs)).filter((name) => name.endsWith(".tgz") && !before.has(name));
    assert.equal(added.length, 1);
    const bytes = await readFile(join(tarballs, added[0]));
    report.packages.push({ name: metadata.name, version: metadata.version, tarball: added[0], bytes: bytes.length, sha256: sha256(bytes) });
    await copyFile(join(tarballs, added[0]), join(proof, "tarballs", added[0]));
  }
  await writeFile(join(consumer, "package.json"), JSON.stringify({ name: "ifc-installed-consumer-proof", version: "1.0.0", private: true, type: "module" }, null, 2));
  await writeFile(join(temp, "user.npmrc"), "");
  await writeFile(join(temp, "global.npmrc"), "");
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^npm_config_/i.test(key) && !["NODE_PATH", "NPM_TOKEN", "NODE_AUTH_TOKEN"].includes(key)));
  Object.assign(env, {
    npm_config_userconfig: join(temp, "user.npmrc"),
    npm_config_globalconfig: join(temp, "global.npmrc"),
    npm_config_cache: join(temp, "npm-cache"),
    npm_config_fetch_retries: "0", npm_config_fetch_timeout: "30000",
  });
  const rendererRequire = createRequire(join(here, "../package.json"));
  const metadata = JSON.parse(await readFile(join(here, "../package.json"), "utf8"));
  const flags = ["--ignore-scripts", "--no-audit", "--no-fund", "--strict-peer-deps", "--registry=https://registry.npmjs.org/"];
  const peers = ["@thatopen/components", "@thatopen/fragments", "web-ifc"].map((name) => `${name}@${metadata.peerDependencies[name]}`);
  for (const name of ["three", "esbuild"])
    peers.push(`${name}@${(await packageDir(name, rendererRequire)).metadata.version}`);
  await run("normal-install", "npm", ["install", "--save-exact", ...flags, ...report.packages.map((pkg) => join(tarballs, pkg.tarball)), ...peers], consumer, env);
  await run("frozen-consumer-install", "npm", ["ci", ...flags], consumer, env);
  for (const name of ["package.json", "package-lock.json"])
    await copyFile(join(consumer, name), join(proof, name));
  report.lockSha256 = sha256(await readFile(join(consumer, "package-lock.json")));
  for (const pkg of report.packages) {
    const folder = join(consumer, "node_modules", pkg.name);
    assert.equal((await lstat(folder)).isSymbolicLink(), false);
    assert.ok(inside(await realpath(folder), consumer));
    assert.equal(JSON.parse(await readFile(join(folder, "package.json"), "utf8")).version, pkg.version);
  }
  const installed = join(consumer, "node_modules/@file-viewer/renderer-3d");
  for (const path of ["src", "scripts"])
    await assert.rejects(lstat(join(installed, path)), { code: "ENOENT" });
  assert.ok((await lstat(join(installed, "dist/ifc-import.worker.js"))).isFile());
  const bin = join(consumer, "node_modules/.bin/file-viewer-ifc-assets");
  assert.ok((await lstat(bin)).isSymbolicLink(), "Exercise the actual npm bin link");
  const assets = join(consumer, "deployment with spaces/嵌套/assets/ifc");
  await mkdir(assets, { recursive: true });
  await writeFile(join(assets, "host-owned.txt"), "keep host data");
  await run("installed-asset-copy-cli", process.execPath, [bin, assets], consumer, env);
  assert.equal(await readFile(join(assets, "host-owned.txt"), "utf8"), "keep host data");
  const assetManifest = JSON.parse(await readFile(join(assets, "manifest.json"), "utf8"));
  for (const [name, record] of Object.entries(assetManifest.files)) {
    const bytes = await readFile(join(assets, name));
    assert.equal(bytes.length, record.bytes);
    assert.equal(sha256(bytes), record.sha256);
  }
  for (const name of ["web-ifc.wasm", "web-ifc-mt.wasm", "fragments.worker.mjs", "ifc-import.worker.js"])
    assert.ok(assetManifest.files[name].bytes > 0);
  const consumerRequire = createRequire(join(consumer, "package.json"));
  const fragments = await packageDir("@thatopen/fragments", consumerRequire);
  const fragmentRequire = createRequire(join(fragments.path, "package.json"));
  const webIfc = await packageDir("web-ifc", consumerRequire);
  for (const name of ["web-ifc.wasm", "web-ifc-mt.wasm"])
    assert.equal(sha256(await readFile(join(assets, name))),
      sha256(await readFile(join(webIfc.path, name))));
  assert.equal(sha256(await readFile(join(assets, "fragments.worker.mjs"))),
    sha256(await readFile(join(fragments.path, "dist/Worker/worker.mjs"))));
  for (const pkg of assetManifest.packages) {
    const resolver = ["web-ifc", "@thatopen/fragments", "three"].includes(pkg.name) ? consumerRequire : fragmentRequire;
    const original = await packageDir(pkg.name, resolver);
    assert.equal(original.metadata.version, pkg.version);
    if (["web-ifc", "@thatopen/fragments"].includes(pkg.name))
      assert.equal(pkg.version, metadata.peerDependencies[pkg.name]);
    for (const name of (await readdir(original.path)).filter((name) => /^licen[cs]e(?:[.-]|$)/i.test(name))) {
      const copied = join(assets, "licenses", `${pkg.name.replace(/[@/]/g, "_")}-${name}`);
      assert.equal(sha256(await readFile(copied)), sha256(await readFile(join(original.path, name))));
    }
  }
  assert.equal(sha256(await readFile(join(assets, "licenses/thatopen-fragments-MIT.txt"))),
    sha256(await readFile(join(installed, "licenses/thatopen-fragments-MIT.txt"))));
  report.checks.push({ name: "physical installed CLI, compiled worker, complete assets and licences", status: "passed", sourceAbsent: true, assetManifest });

  const outside = join(consumer, "host-file.txt");
  await writeFile(outside, "untouched outside destination");
  const redirects = [
    ["root-link", async (path) => { const target = join(consumer, "host-directory"); await mkdir(target); await symlink(target, path, "dir"); }],
    ["licenses-link", async (path) => { await mkdir(path); await symlink(consumer, join(path, "licenses"), "dir"); }],
    ["asset-link", async (path) => { await mkdir(path); await symlink(outside, join(path, "web-ifc.wasm")); }],
    ["asset-directory", async (path) => { await mkdir(join(path, "web-ifc.wasm"), { recursive: true }); }],
    ["license-link", async (path) => { await mkdir(join(path, "licenses"), { recursive: true }); await symlink(outside, join(path, "licenses/thatopen-fragments-MIT.txt")); }],
  ];
  for (const [name, setup] of redirects) {
    const path = join(consumer, "path-cases", name);
    await mkdir(dirname(path), { recursive: true });
    await setup(path);
    const sentinel = name === "root-link" ? join(consumer, "host-directory/NOTICE.txt") : join(path, "NOTICE.txt");
    await writeFile(sentinel, "previous owned asset");
    const output = await run(`reject-${name}`, process.execPath, [bin, path], consumer, env, true);
    assert.match(output, /IFC asset destination must be a regular/);
    assert.equal(await readFile(outside, "utf8"), "untouched outside destination");
    assert.equal(await readFile(sentinel, "utf8"), "previous owned asset");
    await assert.rejects(lstat(join(path, "manifest.json")), { code: "ENOENT" });
    report.checks.push({ name: `reject-${name}`, status: "passed", hostBytesPreserved: true });
  }
  const invalid = await run("reject-unknown-flag", process.execPath, [bin, "--unknown"], consumer, env, true);
  assert.match(invalid, /Expected one destination directory/);
  await assert.rejects(lstat(join(consumer, "public")), { code: "ENOENT" });
  report.checks.push({ name: "reject-unknown-flag", status: "passed" });
  await run("installed-asset-copy-repeat", process.execPath, [bin, assets], consumer, env);
  assert.equal(await readFile(join(assets, "host-owned.txt"), "utf8"), "keep host data");

  const browserOutput = join(proof, "browser");
  await run("installed-browser", process.execPath, [join(here, "verify-ifc-browser.mjs"), samples], consumer,
    { ...env, IFC_TEST_PACKAGE_ROOT: installed, IFC_EVIDENCE_DIR: browserOutput });
  report.browser = JSON.parse(await readFile(join(browserOutput, "report.json"), "utf8"));
  report.status = "passed";
  console.log(JSON.stringify({ status: report.status, packages: report.packages, checks: report.checks.map(({ name, status }) => ({ name, status })), lockSha256: report.lockSha256 }));
} catch (error) {
  report.status = "failed";
  report.error = error.message;
  throw error;
} finally {
  await writeFile(join(proof, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await rm(temp, { recursive: true, force: true });
}
