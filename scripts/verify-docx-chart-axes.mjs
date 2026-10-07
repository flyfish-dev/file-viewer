/** Browser checks use the actual Word renderer and pinned classic Worker.
 * Originals stay external; reports store counts, dates, coordinates and hashes only.
 */
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import path from "node:path";
import { chromium } from "playwright";
import { makeAxesDocument } from "../test/docx-chart-axes/fixtures.mjs";
const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(
  path.join(root, "packages/renderers/word/package.json"),
);
const { build } = createRequire(
  path.join(root, "packages/renderers/pptx/package.json"),
)("esbuild");
const JSZip = require("jszip"),
  { JSDOM } = require("jsdom");
const engine = path.dirname(require.resolve("@file-viewer/docx/package.json"));
const output = path.resolve(
  process.env.DOCX_AXES_OUTPUT || path.join(root, "output/docx-chart-axes"),
);
const hash = (x) => createHash("sha256").update(x).digest("hex");
await mkdir(output, { recursive: true });
const buffer = await makeAxesDocument(JSZip);
await writeFile(path.join(output, "generated.docx"), buffer);
await build({
  entryPoints: [path.join(root, "test/docx-engine-compatibility/browser.ts")],
  outfile: path.join(output, "browser.js"),
  bundle: true,
  format: "iife",
  platform: "browser",
  logLevel: "warning",
});
const worker = await readFile(
    path.join(engine, "dist/docx-preview.worker.js"),
    "utf8",
  ),
  jszip = await readFile(require.resolve("jszip/dist/jszip.min.js"), "utf8");
const script = await readFile(path.join(output, "browser.js"), "utf8");
const checks = [],
  originals = [],
  errors = [],
  requests = [];
async function check(name, fn) {
  try {
    await fn();
    checks.push({ name, status: "pass" });
    console.log("PASS", name);
  } catch (e) {
    checks.push({ name, status: "fail", error: e.message });
    console.error("FAIL", name, e.message.slice(0, 240));
  }
}
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
});
let completed = false;
try {
  for (const dpr of [1, 2]) {
    const page = await browser.newPage({
      viewport: { width: 1100, height: 950 },
      deviceScaleFactor: dpr,
    });
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (/^https?:/.test(r.url())) requests.push(r.url());
    });
    await page.route("**/*", (r) =>
      /^https?:/.test(r.request().url()) ? r.abort() : r.continue(),
    );
    await page.setContent(
      '<!doctype html><meta charset="utf-8"><style>body{margin:0}#host{width:1000px;height:900px;overflow:auto}</style><div id="host"></div>',
    );
    await page.addScriptTag({ content: script });
    await page.evaluate(
      ({ worker, jszip }) => {
        window.workerUrl = URL.createObjectURL(
          new Blob([worker], { type: "application/javascript" }),
        );
        window.zipUrl = URL.createObjectURL(
          new Blob([jszip], { type: "application/javascript" }),
        );
        const W = Worker;
        window.messages = [];
        window.Worker = class extends W {
          constructor(...args) {
            super(...args);
            this.addEventListener("message", (e) =>
              messages.push(e.data?.type),
            );
          }
        };
      },
      { worker, jszip },
    );
    const mount = async (bytes, name) =>
      page.evaluate(
        async ({ base, name }) => {
          window.handle?.unmount();
          window.messages = [];
          window.handle = await docxCompatibility.renderFileViewerWordDoc(
            Uint8Array.from(atob(base), (c) => c.charCodeAt(0)).buffer,
            document.querySelector("#host"),
            "docx",
            {
              filename: name,
              options: {
                docx: {
                  worker: true,
                  workerUrl,
                  workerJsZipUrl: zipUrl,
                  visualPagination: false,
                },
              },
            },
          );
          await document.fonts.ready;
          return document.querySelectorAll(".docx-chart > svg").length;
        },
        { base: Buffer.from(bytes).toString("base64"), name },
      );
    const inspect = () =>
      page.evaluate(() =>
        [...document.querySelectorAll(".docx-chart > svg")].map((s) => ({
          title:
            s.querySelector("[data-docx-chart-title]")?.textContent ?? null,
          titles: [...s.querySelectorAll("[data-docx-chart-axis-title]")].map(
            (t) => ({
              id: t.getAttribute("data-docx-chart-axis-title"),
              text: t.textContent,
              x: +t.getAttribute("x"),
              y: +t.getAttribute("y"),
            }),
          ),
          groups: [...s.querySelectorAll("[data-docx-chart-axis-group]")].map(
            (g) => ({
              type: g.getAttribute("data-docx-chart-axis-group"),
              xRange: g.getAttribute("data-docx-chart-x-range"),
              yRange: g.getAttribute("data-docx-chart-y-range"),
              values: [
                ...g.querySelectorAll("[data-docx-chart-value-tick]"),
              ].map((t) => t.textContent),
            }),
          ),
          xRange: s.getAttribute("data-docx-chart-x-range"),
          yRange: s.getAttribute("data-docx-chart-y-range"),
          dates: [...s.querySelectorAll("[data-docx-chart-date-tick]")].map(
            (t) => ({
              value: +t.getAttribute("data-docx-chart-date-tick"),
              text: t.textContent,
              x: +t.getAttribute("x"),
            }),
          ),
          values: [...s.querySelectorAll("[data-docx-chart-value-tick]")].map(
            (t) => +t.getAttribute("data-docx-chart-value-tick"),
          ),
          points: [...s.querySelectorAll("[data-docx-chart-point-index]")].map(
            (p) => ({
              i: +p.getAttribute("data-docx-chart-point-index"),
              si: +p.getAttribute("data-docx-chart-series-index"),
              d: +p.getAttribute("data-docx-chart-date-value"),
              x: +(
                p.getAttribute("data-docx-chart-center-x") ??
                p.getAttribute("cx")
              ),
              y: +(
                p.getAttribute("data-docx-chart-center-y") ??
                p.getAttribute("cy")
              ),
              tag: p.localName,
            }),
          ),
          paths: [...s.querySelectorAll("path")].map((p) =>
            p.getAttribute("d"),
          ),
          clipped: !!s.querySelector(
            '[data-docx-chart-date-plot][overflow="hidden"]',
          ),
          invalid: /NaN|Infinity/.test(s.outerHTML),
        })),
      );
    await check(
      `DPR ${dpr}: generated charts load through actual Worker`,
      async () => {
        assert.equal(await mount(buffer, "generated.docx"), 5);
        assert.ok((await page.evaluate(() => messages)).includes("parsed"));
      },
    );
    const charts = await inspect();
    await check(
      `DPR ${dpr}: date intervals follow serial coordinates without closing gaps`,
      () => {
        const c = charts[0];
        assert.equal(c.xRange, "44927,44938");
        assert.deepEqual(
          c.points.map((p) => p.i),
          [0, 1, 3],
        );
        assert.ok(Math.abs(c.points[1].x - 60 - 540 / 11) < 1e-6);
        assert.equal(c.paths.length, 2);
        assert.equal(c.points[2].x, 600);
      },
    );
    await check(
      `DPR ${dpr}: axis title and chart title stay separate, rich runs keep spacing`,
      () => {
        assert.equal(charts[0].title, null);
        assert.deepEqual(
          charts[0].titles.map((t) => t.text),
          ["(days)", "(units)"],
        );
        assert.equal(charts[1].title, "Timeline");
      },
    );
    await check(
      `DPR ${dpr}: dates obey format and 1904 flag with omitted value`,
      () => {
        assert.ok(charts[0].dates.some((t) => t.text === "2023/01/01"));
        assert.ok(charts[1].dates.some((t) => t.text === "1904/01/01"));
        assert.ok(charts[1].dates.every((t) => /^1904\/01\//.test(t.text)));
      },
    );
    await check(
      `DPR ${dpr}: authored scaling, major ticks and reversed axes are retained`,
      () => {
        assert.equal(charts[1].yRange, "-10,10");
        assert.deepEqual(charts[1].values, [-10, -5, 0, 5, 10]);
        assert.equal(charts[1].points[0].x, 600);
        assert.equal(charts[1].points[3].x, 60);
        assert.ok(charts[1].points[0].y < charts[1].points[3].y);
        assert.ok(charts[1].clipped);
      },
    );
    await check(
      `DPR ${dpr}: month steps preserve calendar progression and deleted axes stay hidden`,
      () => {
        assert.deepEqual(
          charts[2].dates.map((t) => t.text),
          ["2023/01/31", "2023/02/28", "2023/03/31", "2023/04/30"],
        );
        assert.equal(charts[3].dates.length, 0);
        assert.equal(charts[3].titles.length, 1);
      },
    );
    await check(
      `DPR ${dpr}: geometry is finite and independent of host width`,
      async () => {
        assert.ok(charts.every((c) => !c.invalid));
        for (const width of [320, 1000]) {
          await page.evaluate((w) => {
            document.querySelector("#host").style.width = w + "px";
          }, width);
          await page.waitForTimeout(100);
          assert.deepEqual(await inspect(), charts);
        }
      },
    );
    await check(
      `DPR ${dpr}: combined column and line retain separate series and value axes`,
      () => {
        const c = charts[4];
        assert.deepEqual(
          c.groups.map((g) => g.type),
          ["barChart", "lineChart"],
        );
        assert.equal(c.points.length, 7);
        assert.equal(c.points.filter((p) => p.tag === "rect").length, 4);
        assert.equal(c.points.filter((p) => p.tag === "circle").length, 3);
        assert.deepEqual(
          c.groups.map((g) => g.yRange),
          ["-10,10", "-1,1"],
        );
        assert.deepEqual(c.groups[1].values, [
          "-100%",
          "-50%",
          "0%",
          "50%",
          "100%",
        ]);
      },
    );
    if (dpr === 1)
      await page.screenshot({ path: path.join(output, "generated.png") });
    if (process.env.DOCX_AXES_ORIGINAL) {
      const bytes = await readFile(process.env.DOCX_AXES_ORIGINAL);
      assert.equal(
        hash(bytes),
        "ca47e0507cb803f920aa88aac9a1600d568a7c66ff24c6142d509484b55e7571",
        "C034 identity",
      );
      const zip = await JSZip.loadAsync(bytes),
        win = new JSDOM("").window;
      const parse = (text) =>
        new win.DOMParser().parseFromString(text, "application/xml");
      const ns = "http://schemas.openxmlformats.org/drawingml/2006/chart";
      const q = (e, n) => e?.getElementsByTagNameNS(ns, n)[0];
      const direct = (e, n) =>
        [...e.children].find((c) => c.localName === n && c.namespaceURI === ns);
      const originalDoc = parse(
        await zip.file("word/document.xml").async("string"),
      );
      const wn = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
      for (const ac of [
        ...originalDoc.getElementsByTagNameNS(
          "http://schemas.openxmlformats.org/markup-compatibility/2006",
          "AlternateContent",
        ),
      ]) {
        const choice =
          [...ac.children].find((n) => n.localName === "Choice") ??
          [...ac.children].find((n) => n.localName === "Fallback");
        for (const node of [...ac.children]) if (node !== choice) node.remove();
      }
      const expectedText = [...originalDoc.getElementsByTagNameNS(wn, "t")]
        .map((t) => t.textContent)
        .join("");
      const rel = parse(
        await zip.file("word/_rels/document.xml.rels").async("string"),
      );
      const refs = [...originalDoc.getElementsByTagNameNS(ns, "chart")].map(
        (c) =>
          c.getAttributeNS(
            "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
            "id",
          ),
      );
      const models = [];
      for (const id of refs) {
        const r = [...rel.documentElement.children].find(
          (r) => r.getAttribute("Id") === id,
        );
        const target = path.posix.normalize("word/" + r.getAttribute("Target"));
        const xml = parse(await zip.file(target).async("string"));
        const plot = q(xml, "plotArea");
        const groups = [...plot.children].filter((n) =>
          ["lineChart", "barChart"].includes(n.localName),
        );
        const model = { groups: [], titles: [] };
        let offset = 0;
        for (const group of groups) {
          const ids = [...group.children]
            .filter((n) => n.localName === "axId")
            .map((n) => n.getAttribute("val"));
          const axes = [...plot.children].filter(
            (n) =>
              n.localName.endsWith("Ax") &&
              ids.includes(q(n, "axId")?.getAttribute("val")),
          );
          const cat = axes.find((n) =>
              ["dateAx", "catAx"].includes(n.localName),
            ),
            val = axes.find((n) => n.localName === "valAx");
          const points = [];
          [...group.children]
            .filter((n) => n.localName === "ser")
            .forEach((s, si) => {
              const xs = new Map(
                [...q(s, "cat").getElementsByTagNameNS(ns, "pt")].map((p) => [
                  +p.getAttribute("idx"),
                  Number(q(p, "v").textContent),
                ]),
              );
              for (const p of q(s, "val").getElementsByTagNameNS(ns, "pt")) {
                const i = +p.getAttribute("idx"),
                  v = q(p, "v").textContent;
                if (
                  v.trim() &&
                  Number.isFinite(Number(v)) &&
                  Number.isFinite(xs.get(i))
                )
                  points.push({
                    i,
                    si: si + offset,
                    x: xs.get(i),
                    v: Number(v),
                  });
              }
            });
          const number = (e, n) =>
            q(e, n) ? +q(e, n).getAttribute("val") : null;
          const xt = points.map((p) => p.x);
          const category = cat.localName === "catAx";
          const count = +q(q(group, "cat"), "ptCount").getAttribute("val");
          model.groups.push({
            type: group.localName,
            category,
            count,
            points,
            xmin: category
              ? 0
              : (number(q(cat, "scaling"), "min") ?? Math.min(...xt)),
            xmax: category
              ? count
              : (number(q(cat, "scaling"), "max") ?? Math.max(...xt)),
            ymin: number(q(val, "scaling"), "min"),
            ymax: number(q(val, "scaling"), "max"),
          });
          for (const ax of axes) {
            const title = q(ax, "title");
            if (!title) continue;
            const manual = q(title, "manualLayout");
            model.titles.push({
              text: [
                ...title.getElementsByTagNameNS(
                  "http://schemas.openxmlformats.org/drawingml/2006/main",
                  "t",
                ),
              ]
                .map((t) => t.textContent)
                .join(""),
              xy: manual
                ? [number(manual, "x") * 640, number(manual, "y") * 360]
                : null,
            });
          }
          offset += [...group.children].filter(
            (n) => n.localName === "ser",
          ).length;
        }
        models.push(model);
      }
      await check(
        `DPR ${dpr}: C034 renders all original chart relationships in the real Worker`,
        async () => {
          assert.equal(await mount(bytes, "C034.docx"), 12);
          assert.equal(refs.length, 12);
          assert.ok((await page.evaluate(() => messages)).includes("parsed"));
        },
      );
      const rendered = await inspect();
      await writeFile(
        path.join(output, `original-chart-geometry-${dpr}.json`),
        JSON.stringify(rendered, null, 2),
      );
      await check(
        `DPR ${dpr}: C034 retains every date/value index and both combination series`,
        () => {
          models.forEach((m, i) => {
            const c = rendered[i];
            assert.equal(
              c.points.length,
              m.groups.reduce((n, g) => n + g.points.length, 0),
            );
            m.groups.forEach((g, k) => {
              const drawn = m.groups.length > 1 ? c.groups[k] : c;
              assert.deepEqual(drawn.xRange.split(",").map(Number), [
                g.xmin,
                g.xmax,
              ]);
              const yr = drawn.yRange.split(",").map(Number);
              if (g.ymin != null) assert.equal(yr[0], g.ymin);
              if (g.ymax != null) assert.equal(yr[1], g.ymax);
              for (const p of g.points) {
                const a = c.points.find((t) => t.i === p.i && t.si === p.si);
                assert.ok(a);
                assert.equal(a.d, p.x);
                const x = g.category
                  ? 60 + (540 * (p.i + 0.5)) / g.count
                  : 60 + (540 * (p.x - g.xmin)) / (g.xmax - g.xmin);
                assert.ok(Math.abs(a.x - x) < 1e-5);
                assert.ok(
                  Math.abs(
                    a.y - (300 - (230 * (p.v - yr[0])) / (yr[1] - yr[0])),
                  ) < 1e-5,
                );
              }
            });
          });
        },
      );
      await check(
        `DPR ${dpr}: C034 date labels and manually positioned unit titles stay distinct`,
        () => {
          rendered.forEach((c, i) => {
            assert.equal(c.title, null);
            assert.ok(c.dates.length > 0);
            assert.ok(c.dates.every((t) => t.text.includes("/")));
            assert.equal(c.titles.length, models[i].titles.length);
            models[i].titles.forEach((t, j) => {
              assert.equal(c.titles[j].text, t.text);
              if (t.xy) {
                assert.ok(Math.abs(c.titles[j].x - t.xy[0]) < 1e-6);
                assert.ok(Math.abs(c.titles[j].y - t.xy[1]) < 1e-6);
              }
            });
          });
        },
      );
      const headerGeometry = await page.evaluate(() =>
        [...document.querySelectorAll("header img")].map((img) => {
          const h = img.closest("header"),
            p = img.closest("p"),
            r = img.getBoundingClientRect(),
            hr = h.getBoundingClientRect(),
            pr = p.getBoundingClientRect(),
            sec = h.closest("section.docx"),
            sr = sec.getBoundingClientRect(),
            scale = sr.width / parseFloat(getComputedStyle(sec).width);
          return {
            x: (r.x - hr.x) / scale,
            y: (r.y - pr.y) / scale,
            width: r.width / scale,
            height: r.height / scale,
          };
        }),
      );
      await check(
        `DPR ${dpr}: C034 header logo retains authored paragraph and column offsets`,
        async () => {
          const h = parse(await zip.file("word/header1.xml").async("string")),
            wp =
              "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
          const anchor = h.getElementsByTagNameNS(wp, "anchor")[0];
          const pos = (n) =>
            Number(
              anchor
                .getElementsByTagNameNS(wp, n)[0]
                .getElementsByTagNameNS(wp, "posOffset")[0].textContent,
            ) / 9525;
          const ext = anchor.getElementsByTagNameNS(wp, "extent")[0];
          assert.ok(headerGeometry.length > 0);
          for (const g of headerGeometry) {
            for (const [a, b] of [
              [g.x, pos("positionH")],
              [g.y, pos("positionV")],
              [g.width, +ext.getAttribute("cx") / 9525],
              [g.height, +ext.getAttribute("cy") / 9525],
            ])
              assert.ok(Math.abs(a - b) < 0.15);
          }
        },
      );
      await writeFile(
        path.join(output, `original-header-${dpr}.json`),
        JSON.stringify(headerGeometry, null, 2),
      );
      const content = await page.evaluate(async () => {
        const root = document.querySelector("#host");
        const articles = [...root.querySelectorAll("article")];
        const text = articles
          .map((a) => {
            const copy = a.cloneNode(true);
            for (const e of copy.querySelectorAll(".docx-chart,style,svg"))
              e.remove();
            return copy.textContent;
          })
          .join("");
        const imgs = [...root.querySelectorAll("img")];
        await Promise.all(imgs.map((i) => i.decode().catch(() => null)));
        return {
          text,
          images: imgs.length,
          decoded: imgs.filter((i) => i.naturalWidth > 0).length,
          articles: articles.length,
          headers: root.querySelectorAll("header").length,
        };
      });
      await check(
        `DPR ${dpr}: C034 body text is complete and original images decode`,
        () => {
          assert.equal(
            hash(content.text.replace(/\s/g, "")),
            hash(expectedText.replace(/\s/g, "")),
            "body text normalized sequence checksum",
          );
          assert.ok(content.images > 0);
          assert.equal(content.decoded, content.images);
        },
      );
      originals.push({
        id: "C034",
        sha256: hash(bytes),
        charts: rendered.length,
        points: models.reduce(
          (n, m) => n + m.groups.reduce((a, g) => a + g.points.length, 0),
          0,
        ),
        dates: rendered.map((c) => c.dates.length),
        bodyCharacters: expectedText.length,
        bodyTextSha256: hash(expectedText),
        images: content.images,
        headers: content.headers,
        dpr,
      });
    }
    await check(
      `DPR ${dpr}: renderer unmount and blob cleanup finish`,
      async () => {
        await page.evaluate(() => {
          handle.unmount();
          URL.revokeObjectURL(workerUrl);
          URL.revokeObjectURL(zipUrl);
        });
        assert.equal(await page.locator(".docx-chart").count(), 0);
      },
    );
    await page.close();
  }
  await check("No unhandled errors or network requests", () => {
    assert.deepEqual(errors, []);
    assert.deepEqual(requests, []);
  });
  completed = true;
} finally {
  await browser.close();
  const failed = checks.filter((c) => c.status === "fail").length;
  await writeFile(
    path.join(output, "report.json"),
    JSON.stringify(
      { completed, checks, passed: checks.length - failed, failed, originals },
      null,
      2,
    ) + "\n",
  );
  if (failed || !completed) process.exitCode = 1;
}
