import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
import { fontFallbacks } from "../dist/render/fonts.js";
import {
  charPropsToState,
  paraPropsToState,
  tablePropsToState,
} from "../dist/msdoc/properties.js";

const root = resolve(import.meta.dirname, "../../../..");
const require = createRequire(join(root, "package.json"));
const { chromium, webkit } = require("playwright");
const { build } = createRequire(
  join(root, "packages/renderers/pptx/package.json"),
)("esbuild");
const output = join(root, "output/doc-font-table");
await mkdir(output, { recursive: true });

assert.equal(fontFallbacks("Missing serif", { ffid: 16 }).generic, "serif");
assert.equal(fontFallbacks("Missing sans", { ffid: 32 }).generic, "sans-serif");
assert.equal(fontFallbacks("Missing mono", { ffid: 48 }).generic, "monospace");
assert.equal(
  fontFallbacks("Missing font", { ffid: 0, panose: [2, 2, 6, 3] }).generic,
  "serif",
);
assert.equal(fontFallbacks("仿宋_GB2312", { ffid: 52 }).generic, "serif");
assert.deepEqual(fontFallbacks("Primary", { altName: "Alternate" }).families, [
  "Primary",
  "Alternate",
]);

const paragraph = (text) => ({
  type: "paragraph",
  id: "paragraph",
  text,
  paraState: { ...paraPropsToState([]), alignment: 1 },
  inlines: [
    {
      type: "text",
      text,
      style: {
        ...charPropsToState([]),
        fontSizeHalfPoints: 32,
        fontFamily: "Times New Roman",
        fontFamilyEastAsia: "仿宋_GB2312",
      },
    },
  ],
});
const state = { ...tablePropsToState([]), rowHeight: 4200 };
const model = {
  blocks: [
    {
      type: "table",
      id: "table",
      depth: 1,
      gridWidthTwips: 5400,
      state,
      rows: [
        {
          id: "row",
          state,
          cells: [
            {
              id: "cell",
              colIndex: 0,
              colspan: 1,
              rowspan: 1,
              meta: {
                leftBoundary: 0,
                rightBoundary: 1800,
                width: 1800,
                textFlow: 5,
                vertAlign: 1,
              },
              paragraphs: [paragraph("示例    竖排")],
            },
            {
              id: "neighbor",
              colIndex: 1,
              colspan: 1,
              rowspan: 1,
              meta: {
                leftBoundary: 1800,
                rightBoundary: 5400,
                width: 3600,
                vertAlign: 1,
              },
              paragraphs: [paragraph("17：15")],
            },
          ],
        },
      ],
    },
  ],
  fonts: [{ name: "Times New Roman", ffid: 4, panose: [2, 2, 6, 3] }],
  assets: [],
  warnings: [],
  metadata: {},
};

const bundle = await build({
  stdin: {
    contents: `
import { renderMsDoc } from ${JSON.stringify(join(root, "packages/renderers/doc/dist/index.js"))}
import { mountWordDocument } from ${JSON.stringify(join(root, "packages/renderers/word/src/wordDoc.ts"))}
import { renderFileViewerWordDoc } from ${JSON.stringify(join(root, "packages/renderers/word/src/index.ts"))}
window.mountModel = model => { window.handle = mountWordDocument(renderMsDoc(model), document.querySelector('#host')) }
window.mountFile = async bytes => { window.handle = await renderFileViewerWordDoc(Uint8Array.from(bytes).buffer, document.querySelector('#host'), 'doc') }
`,
    resolveDir: root,
  },
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  target: "es2022",
});
const server = createServer((request, response) => {
  if (request.url === "/entry.js")
    return response
      .writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" })
      .end(bundle.outputFiles[0].contents);
  if (request.url === "/")
    return response
      .writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
      .end(
        '<!doctype html><meta charset="utf-8"><div id="host" style="width:1000px;height:1200px"></div><script src="/entry.js"></script>',
      );
  response.writeHead(404).end();
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const original = process.argv[2]
  ? await readFile(resolve(process.argv[2]))
  : null;
const report = {
  cases: [],
  passed: false,
  originalSha256:
    original && createHash("sha256").update(original).digest("hex"),
};
try {
  for (const [name, engine] of [
    ["chromium", chromium],
    ["webkit", webkit],
  ]) {
    const browser = await engine.launch({ headless: true });
    try {
      for (const kind of original ? ["generated", "original"] : ["generated"]) {
        const page = await browser.newPage();
        const row = { browser: name, kind, errors: [], external: [] };
        report.cases.push(row);
        page.on("pageerror", (error) => row.errors.push(error.message));
        page.on("request", (request) => {
          if (!request.url().startsWith(origin + "/"))
            row.external.push(request.url());
        });
        await page.goto(origin);
        await page.evaluate(
          async ({ model, bytes }) => {
            if (bytes) await window.mountFile(bytes);
            else window.mountModel(model);
            await document.fonts.ready;
            await new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            );
          },
          { model, bytes: kind === "original" ? [...original] : null },
        );
        row.tables = await page.evaluate(() =>
          [...document.querySelectorAll(".msdoc-cell-vertical")].map(
            (element) => {
              const cell = element.closest("td").getBoundingClientRect();
              const walker = document.createTreeWalker(
                element,
                NodeFilter.SHOW_TEXT,
              );
              const glyphs = [];
              let node;
              while ((node = walker.nextNode()))
                for (let i = 0; i < node.data.length; i++) {
                  if (!/\p{Script=Han}/u.test(node.data[i])) continue;
                  const range = document.createRange();
                  range.setStart(node, i);
                  range.setEnd(node, i + 1);
                  const rect = range.getBoundingClientRect();
                  glyphs.push({
                    character: node.data[i],
                    x: rect.x,
                    y: rect.y,
                    right: rect.right,
                    bottom: rect.bottom,
                    width: rect.width,
                    height: rect.height,
                  });
                }
              const style = getComputedStyle(element);
              return {
                writingMode: style.writingMode,
                inlineSize: style.inlineSize,
                blockSize: style.blockSize,
                fontFamily: style.fontFamily,
                cell: {
                  x: cell.x,
                  y: cell.y,
                  right: cell.right,
                  bottom: cell.bottom,
                },
                glyphs,
              };
            },
          ),
        );
        if (name === "chromium") {
          // CSS families describe the fallback list; DevTools reports which
          // installed font actually supplied each glyph on this platform.
          const session = await page.context().newCDPSession(page);
          await session.send("DOM.enable");
          await session.send("CSS.enable");
          const { root } = await session.send("DOM.getDocument");
          const { nodeIds } = await session.send("DOM.querySelectorAll", {
            nodeId: root.nodeId,
            selector: ".msdoc-cell span",
          });
          const texts = await page.locator(".msdoc-cell span").allTextContents();
          row.platformFonts = await Promise.all(
            nodeIds.map(async (nodeId, index) => ({
              text: texts[index],
              ...(await session.send("CSS.getPlatformFontsForNode", { nodeId })),
            })),
          );
          await session.detach();
        }
        // Capture native pixels before assertions so a platform-specific failure
        // retains the actual layout, rather than only a boolean assertion.
        await page.screenshot({
          path: join(output, `${name}-${kind}.png`),
          fullPage: true,
        });
        assert.ok(row.tables.length > 0);
        for (const { cell, glyphs } of row.tables) {
          assert.ok(glyphs.length > 1);
          for (const [index, glyph] of glyphs.entries()) {
            assert.ok(
              glyph.width > 0 && glyph.height > 0,
              "Vertical glyph has no advance or visible bounds",
            );
            assert.ok(
              glyph.x >= cell.x - 1 && glyph.right <= cell.right + 1,
              "Vertical glyph escaped its cell",
            );
            assert.ok(
              glyph.y >= cell.y - 1 && glyph.bottom <= cell.bottom + 1,
              "Vertical glyph escaped its row",
            );
            if (index)
              assert.ok(
                glyph.y > glyphs[index - 1].y,
                `Vertical glyphs overlap or have no vertical advance: ${JSON.stringify(row)}`,
              );
          }
        }
        assert.match(
          await page
            .locator(".msdoc-cell span")
            .first()
            .evaluate((element) => getComputedStyle(element).fontFamily),
          /serif$/,
        );
        assert.deepEqual(row.errors, []);
        assert.deepEqual(row.external, []);
        await page.evaluate(() => window.handle.unmount());
        assert.equal(await page.locator("#host > *").count(), 0);
        row.passed = true;
        await page.close();
      }
    } finally {
      await browser.close();
    }
  }
  report.passed = true;
} finally {
  await writeFile(
    join(output, "report.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
console.log(
  `DOC font substitution and vertical-table geometry passed: ${report.cases.length} real browser cases`,
);
