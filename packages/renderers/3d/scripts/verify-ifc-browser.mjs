import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve, dirname, extname, sep, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { copyIfcAssets } from "../bin/copy-ifc-assets.mjs";
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../../..");
const require = createRequire(resolve(root, "package.json"));
const { chromium } = require("playwright");
const { build } = createRequire(resolve(here, "../package.json"))("esbuild");
const samples = resolve(process.argv[2] || "output/ifc-samples");
const output = resolve(
  process.env.IFC_EVIDENCE_DIR || join(root, "output/ifc-browser"),
);
await mkdir(output, { recursive: true });
const metadata = [
  [
    "ifc4.ifc",
    "8790a1e193e82b8e7e7f337ec2633cd40f2120590317a1443503a25b079e2e80",
  ],
  [
    "ifc43.ifc",
    "96e7103812b15b65eb1fd7802d36b9962833485dce5ead4f440bbf529530881d",
  ],
];
for (const [file, hash] of metadata)
  assert.equal(
    createHash("sha256")
      .update(await readFile(join(samples, file)))
      .digest("hex"),
    hash,
    file,
  );
await copyIfcAssets(join(output, "assets"));
// Static entry remains small; heavy optional engines must be in a separate lazy chunk.
const built = await build({
  entryPoints: [resolve(here, "../dist/ifc.js")],
  outdir: join(output, "app"),
  splitting: true,
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  metafile: true,
  minify: true,
  logLevel: "silent",
});
const entry = Object.entries(built.metafile.outputs).find(([, value]) =>
  value.entryPoint && resolve(value.entryPoint) === resolve(here, "../dist/ifc.js"),
);
assert.ok(entry);
assert.ok(entry[1].bytes < 10_000, `Entry not lazy: ${entry[1].bytes}`);
const content = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0}#viewer{width:1000px;height:760px}</style><div id="viewer"></div><script type="module">
import {renderFileViewerIfc} from './app/ifc.js';
window.openIfc = async (name, options={}) => {
  window.controller=new AbortController(); window.selections=[]; window.cleanupCount=0;
  const bytes=await (await fetch('/sample/'+name)).arrayBuffer();
  window.instance=await renderFileViewerIfc(bytes,document.getElementById('viewer'),{signal:controller.signal,options:{locale:'en-US'}},{assetBaseUrl:'/assets/',...options,
    onSelectionChange:value=>window.selections.push(value),configure:context=>{window.extension=context;return()=>{window.cleanupCount++}}});
  return {count:Number(instance.$el.dataset.ifcElementCount),first:Number(instance.$el.dataset.ifcFirstElement)};
}; window.entryReady=true;
</script>`;
await writeFile(join(output, "index.html"), content);
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".wasm": "application/wasm",
  ".json": "application/json",
  ".ifc": "application/octet-stream",
};
const server = createServer(async (req, res) => {
  try {
    if (req.url === "/favicon.ico") {
      res.writeHead(204).end();
      return;
    }
    const pathname = decodeURIComponent(
      new URL(req.url, "http://local").pathname,
    );
    const file = pathname.startsWith("/sample/")
      ? resolve(samples, pathname.slice(8))
      : resolve(output, "." + (pathname === "/" ? "/index.html" : pathname));
    if (!file.startsWith(samples + sep) && !file.startsWith(output + sep)) {
      res.writeHead(403).end();
      return;
    }
    const bytes = await readFile(file);
    res
      .writeHead(200, {
        "Content-Type": mime[extname(file)] || "application/octet-stream",
        "Content-Security-Policy":
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; img-src 'self' data: blob:",
      })
      .end(bytes);
  } catch {
    res.writeHead(404).end("Not found");
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  args: ["--enable-unsafe-swiftshader"],
});
const report = { entryBytes: entry[1].bytes, cases: [] };
try {
  const page = await browser.newPage({
    viewport: { width: 1100, height: 820 },
  });
  page.setDefaultTimeout(120_000);
  const errors = [],
    requests = [],
    consoleErrors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
      console.error("[browser]", msg.text());
    }
  });
  page.on("request", (req) =>
    requests.push({ method: req.method(), url: req.url() }),
  );
  await page.addInitScript(() => {
    // Intranet HTTP hosts may not expose this secure-context-only API.
    Object.defineProperty(window.crypto, "randomUUID", { value: undefined, configurable: true });
    const Original = window.Worker;
    window.workerCounts = { created: 0, active: 0 };
    window.Worker = class extends Original {
      constructor(...args) {
        super(...args);
        workerCounts.created++;
        workerCounts.active++;
        this.stopped = false;
      }
      terminate() {
        if (!this.stopped) {
          this.stopped = true;
          workerCounts.active--;
        }
        return super.terminate();
      }
    };
  });
  await page.goto(origin);
  await page.waitForFunction(() => window.entryReady);
  assert.equal(await page.evaluate(() => typeof crypto.randomUUID), "undefined");
  assert.equal(await page.evaluate(() => workerCounts.created), 0);
  assert.ok(
    !requests.some(
      (r) => r.url.includes("ifcRuntime") || r.url.includes(".wasm"),
    ),
    "Heavy entry requested eagerly",
  );
  for (const [name] of metadata) {
    const start = Date.now();
    console.log("Loading", name);
    const loaded = await page.evaluate((name) => openIfc(name), name);
    assert.ok(loaded.count > 0, JSON.stringify(loaded));
    await page.waitForSelector('[data-ifc-status="ready"]');
    const selected = await page.evaluate(async () => {
      const selection = await instance.select(
        Number(instance.$el.dataset.ifcFirstElement),
      );
      return {
        localId: selection.localId,
        name: selection.name,
        globalId: selection.globalId,
        entityType: selection.entityType,
      };
    });
    assert.ok(
      selected.globalId && selected.entityType,
      JSON.stringify(selected),
    );
    await page.getByRole("button", { name: "Clear selection" }).click();
    await page.waitForFunction(
      () =>
        document.querySelector("[data-ifc-selected]")?.dataset.ifcSelected ===
        "",
    );
    // Find a real ray hit without assuming the file's element IDs or geometry.
    const hit = await page.evaluate(async () => {
      const { world, model } = extension,
        canvas = world.renderer.three.domElement,
        r = canvas.getBoundingClientRect();
      for (const fy of [0.5, 0.4, 0.6, 0.3, 0.7])
        for (const fx of [0.5, 0.4, 0.6, 0.3, 0.7]) {
          const x = r.left + r.width * fx,
            y = r.top + r.height * fy;
          const hit = await model.raycast({
            camera: world.camera.three,
            mouse: world.renderer.getSize().clone().set(x, y),
            dom: canvas,
          });
          if (hit) return { x, y, localId: hit.localId };
        }
      return null;
    });
    assert.ok(hit, "No visible IFC geometry can be picked");
    await page.mouse.click(hit.x, hit.y);
    await page.waitForFunction(
      (id) =>
        document.querySelector("[data-ifc-selected]")?.dataset.ifcSelected ===
        String(id),
      hit.localId,
    );
    await page.waitForFunction(() => extension.world.renderer.three.info.render.triangles > 0);
    const drawn = await page.evaluate(() => ({
      calls: extension.world.renderer.three.info.render.calls,
      triangles: extension.world.renderer.three.info.render.triangles,
    }));
    assert.ok(drawn.calls > 0 && drawn.triangles > 0, JSON.stringify(drawn));
    await page.screenshot({ path: join(output, `${name}.png`) });
    await page.getByRole("button", { name: "Fit model" }).click();
    await page.evaluate(async () => {
      await instance.unmount();
      await instance.unmount();
    });
    await page.waitForFunction(() => workerCounts.active === 0);
    assert.equal(await page.locator("canvas").count(), 0);
    assert.equal(await page.evaluate(() => cleanupCount), 1);
    report.cases.push({
      name,
      ...loaded,
      selected,
      picked: hit.localId,
      drawn,
      milliseconds: Date.now() - start,
      workers: await page.evaluate(() => ({ ...workerCounts })),
    });
    console.log("Passed", name, JSON.stringify(report.cases.at(-1)));
  }
  // Input limit is enforced before another worker or transferable copy is allocated.
  const limit = await page.evaluate(async () => {
    const n = workerCounts.created;
    try {
      await openIfc("ifc4.ifc", { maxFileBytes: 1 });
      return false;
    } catch (e) {
      return /size limit/.test(e.message) && workerCounts.created === n;
    }
  });
  assert.ok(limit);
  const aborted = await page.evaluate(async () => {
    const pending = openIfc("ifc4.ifc");
    while (!document.querySelector('[data-ifc-status="loading"]'))
      await new Promise((r) => setTimeout(r, 1));
    controller.abort();
    try {
      await pending;
      return false;
    } catch (e) {
      return e.name === "AbortError";
    }
  });
  assert.ok(aborted);
  await page.waitForFunction(() => workerCounts.active === 0);
  assert.equal(await page.locator("canvas").count(), 0);
  assert.deepEqual(errors, []);
  assert.deepEqual(consoleErrors, []);
  assert.ok(
    requests.every((r) => r.url.startsWith(origin + "/") && r.method === "GET"),
    "External request or file upload",
  );
  report.requests = requests;
  report.errors = errors;
  report.consoleErrors = consoleErrors;
  report.inputLimit = true;
  report.abort = true;
} catch (error) {
  console.error(error);
  await Promise.all(
    browser
      .contexts()
      .flatMap((c) =>
        c
          .pages()
          .map((p) =>
            p.screenshot({ path: join(output, "failure.png") }).catch(() => {}),
          ),
      ),
  );
  throw error;
} finally {
  await writeFile(join(output, "report.json"), JSON.stringify(report, null, 2));
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
console.log("Optional IFC original-file browser checks passed.");
