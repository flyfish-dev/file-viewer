import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { build } from "esbuild";
import { chromium, webkit } from "playwright";
import { makeTextboxDoc } from "../test/helpers/textbox-fixture.mjs";
import {
  invalidSurrogateDoc,
  compoundReviewDoc,
} from "../test/helpers/textbox-review-controls.mjs";
const output = resolve(
  process.env.DOC_TEXTBOX_OUTPUT || "output/doc-textbox-browser",
);
const packageDir = resolve(
  process.env.DOC_PACKAGE_DIR || new URL("..", import.meta.url).pathname,
);
await mkdir(output, { recursive: true });
const entry = String.raw`
import {parseMsDoc,renderMsDoc,parseMsDocToHtml,MsDocWorkerClient,mountMsDoc} from '${packageDir}/dist/index.js';
window.run=async(name)=>{
 const bytes=await (await fetch('/samples/'+name)).arrayBuffer();
 const worker=MsDocWorkerClient.create(new URL('/worker.js',location.href));
 const base=parseMsDoc(bytes),a=renderMsDoc(base),b=await parseMsDocToHtml(bytes),c=renderMsDoc(await worker.parse(bytes)),d=await worker.parseToHtml(bytes);
 const e=await worker.render(base),old=structuredClone(base);delete old.textboxLayout;
 const strip=b=>{delete b.sourceRange;if(b.type==='table')for(const r of b.rows)for(const c of r.cells)for(const x of c.blocks||c.paragraphs)strip(x);};old.blocks.forEach(strip);
 const oldRender=await worker.render(old);worker.destroy();
 const routes=[];
 for(const [route,result] of Object.entries({mainParseRender:a,mainParseToHtml:b,workerParseMainRender:c,workerParseToHtml:d,workerRender:e,workerOldModelRender:oldRender})){
  const target=document.createElement('div');document.body.appendChild(target);mountMsDoc(target,result);
  routes.push({route,html:result.html,css:result.css,warnings:result.warnings,model:result.parsed,text:target.innerText,tables:[...target.querySelectorAll('table')].map(t=>({height:t.getBoundingClientRect().height,width:t.getBoundingClientRect().width})),paragraphs:[...target.querySelectorAll('p')].map(p=>({text:p.innerText,position:getComputedStyle(p).position}))});target.remove();
 }
 return routes;
};`;
const bundle = await build({
  stdin: { contents: entry, resolveDir: packageDir },
  bundle: true,
  format: "esm",
  platform: "browser",
  write: false,
});
const worker = await build({
  entryPoints: [resolve(packageDir, "dist/worker.js")],
  bundle: true,
  format: "esm",
  platform: "browser",
  write: false,
});
const samples = new Map();
for (const file of [
  "github-461-floating-textbox.doc",
  "github-171-textbox-resume.doc",
  "github-34-wps-table.doc",
  "github-236-wps-save.doc",
  "github-255-revisions.doc",
  "image-embedded.doc",
  "image-linked.doc",
])
  samples.set(
    file,
    await readFile(new URL("../test/fixtures/" + file, import.meta.url)),
  );
for (const file of [
  "field-boundary.doc",
  "surrogate-boundary.doc",
  "sepx-amplification.doc",
])
  samples.set(
    file,
    await readFile(
      new URL("../test/fixtures/textbox-controls/" + file, import.meta.url),
    ),
  );
samples.set("invalid-surrogate.doc", invalidSurrogateDoc());
samples.set("compound-review.doc", compoundReviewDoc());
samples.set("synthetic-multiple.doc", makeTextboxDoc());
samples.set("synthetic-conflict.doc", makeTextboxDoc({ conflict: true }));
const malformed = Buffer.from(samples.get("github-34-wps-table.doc"));
let n = 0;
for (let i = 0; i < malformed.length - 9 && n < 12; i++) {
  if (
    malformed[i] === 0x34 &&
    malformed[i + 1] === 0xd6 &&
    malformed[i + 2] === 6 &&
    malformed[i + 3] === 0 &&
    malformed[i + 4] === 1 &&
    malformed[i + 6] === 3 &&
    malformed[i + 7] === 15 &&
    malformed[i + 8] === 0
  ) {
    malformed[i + 7] = 255;
    malformed[i + 8] = 255;
    n++;
  }
}
assert.equal(n, 12);
samples.set("malformed-cssa.doc", malformed);
const files = new Map([
  [
    "/index.html",
    Buffer.from(
      '<!doctype html><meta charset="utf-8"><script type="module" src="/main.js"></script>',
    ),
  ],
  ["/main.js", bundle.outputFiles[0].contents],
  ["/worker.js", worker.outputFiles[0].contents],
  ...[...samples].map(([name, b]) => ["/samples/" + name, b]),
]);
const resources = [],
  results = [];
const server = createServer((req, res) => {
  const b = files.get(req.url);
  if (!b) {
    res.writeHead(404);
    res.end();
    return;
  }
  const mime = req.url.endsWith(".js")
    ? "text/javascript"
    : req.url.endsWith(".doc")
      ? "application/msword"
      : "text/html";
  res.writeHead(200, { "Content-Type": mime });
  res.end(b);
  resources.push({
    path: req.url,
    bytes: b.length,
    mime,
    sha256: createHash("sha256").update(b).digest("hex"),
  });
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;
function normalize(value) {
  const ids = new Map();
  const visit = (v, key = "") => {
    if (
      typeof v === "string" &&
      ["id", "contentBlockIds", "paragraphBlockId"].includes(key) &&
      /^(para|table|row|cell|attachments|asset-img|asset-ole|asset-pkg)-\d+$/.test(
        v,
      )
    ) {
      if (!ids.has(v)) ids.set(v, `generated-${ids.size}`);
      return ids.get(v);
    }
    if (Array.isArray(v)) return v.map((x) => visit(x, key));
    if (v && typeof v === "object")
      return Object.fromEntries(
        Object.entries(v).map(([k, x]) => [k, visit(x, k)]),
      );
    return v;
  };
  return visit(value);
}

try {
  for (const [name, type] of Object.entries({ chromium, webkit })) {
    const browser = await type.launch({ headless: true });
    try {
      const context = await browser.newContext();
      const external = [],
        errors = [];
      await context.route("**/*", (r) => {
        if (
          r
            .request()
            .url()
            .startsWith(origin + "/")
        )
          return r.continue();
        external.push(r.request().url());
        return r.abort();
      });
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.goto(origin + "/index.html");
      await page.waitForFunction(() => window.run);
      for (const sample of samples.keys()) {
        const routes = await page.evaluate(
          (sample) => window.run(sample),
          sample,
        );
        const baseline = routes[0];
        for (const r of routes) {
          assert.deepEqual(r.warnings, baseline.warnings);
          assert.equal(r.text, baseline.text);
          assert.equal(r.css, baseline.css);
          assert.equal(r.html, baseline.html);
          assert.deepEqual(r.tables, baseline.tables);
          if (r.route !== "workerOldModelRender")
            assert.deepEqual(normalize(r.model), normalize(baseline.model));
        }
        if (sample.includes("461")) {
          assert.equal(
            baseline.text.split("FLOATING BOX CONTROL").length - 1,
            1,
          );
          assert.ok(
            baseline.warnings.some(
              (w) => w.code === "MSDOC_TEXTBOX_STORY_LINEARIZED",
            ),
          );
          assert.equal(
            baseline.model.textboxLayout.frames[1].mapping,
            "mapped",
          );
        }
        if (sample === "synthetic-multiple.doc")
          assert.equal(baseline.text.split("Duplicate β 中文").length - 1, 2);
        if (sample === "malformed-cssa.doc") {
          assert.equal(
            baseline.warnings.filter(
              (w) => w.code === "MSDOC_TABLE_CSSA_WIDTH_OUT_OF_RANGE",
            ).length,
            1,
          );
          assert.ok(baseline.tables.every((t) => t.height < 5000));
        }
        if (["field-boundary.doc", "compound-review.doc"].includes(sample)) {
          assert.match(baseline.text, /Visible/);
          assert.doesNotMatch(baseline.text, /HYPERLINK|ERLINK|https:/);
          assert.ok(
            baseline.model.textboxLayout.frames.every(
              (f) => f.mapping === "invalid" && f.contentBlockIds.length === 0,
            ),
          );
        }
        if (
          ["surrogate-boundary.doc", "invalid-surrogate.doc"].includes(sample)
        ) {
          assert.match(baseline.text, /😀CD/);
          assert.ok(
            !Array.from(baseline.text).some(
              (ch) =>
                ch.codePointAt(0) >= 0xd800 && ch.codePointAt(0) <= 0xdfff,
            ),
          );
        }
        if (
          ["sepx-amplification.doc", "compound-review.doc"].includes(sample)
        ) {
          assert.ok(
            baseline.model.textboxLayout.sections.reduce(
              (n, sec) => n + sec.unknownSprms.length,
              0,
            ) <= 65536,
          );
          assert.equal(
            baseline.warnings.filter(
              (w) => w.code === "MSDOC_SECTION_GEOMETRY_BUDGET_EXCEEDED",
            ).length,
            1,
          );
        }
        results.push({
          browser: name,
          version: browser.version(),
          sample,
          routes,
        });
        console.log(name, sample, "6 routes pass");
      }
      assert.deepEqual(errors, []);
      assert.deepEqual(external, []);
      await context.close();
    } finally {
      await browser.close();
    }
  }
} finally {
  server.close();
  await writeFile(
    resolve(output, "results.json"),
    JSON.stringify(results, null, 2),
  );
  await writeFile(
    resolve(output, "resources.json"),
    JSON.stringify(resources, null, 2),
  );
  await writeFile(
    resolve(output, "consumer-input.json"),
    JSON.stringify(
      {
        packageDir,
        origin,
        samples: [...samples].map(([name, b]) => ({
          name,
          bytes: b.length,
          sha256: createHash("sha256").update(b).digest("hex"),
        })),
      },
      null,
      2,
    ),
  );
}
