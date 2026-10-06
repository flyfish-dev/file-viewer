import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { chromium, webkit } from "playwright";

const root = resolve(import.meta.dirname, "../../../..");
const { build } = createRequire(
  join(root, "packages/renderers/pptx/package.json"),
)("esbuild");
const output = join(root, "output/issue-325-markdown");
await mkdir(output, { recursive: true });
const bundle = await build({
  stdin: {
    resolveDir: root,
    loader: "ts",
    contents: `
import {mountViewer} from './packages/components/web/src/index.ts'
import {textRenderer} from './packages/renderers/text/src/index.ts'
window.mountMarkdown=(host,file,enabled,theme)=>mountViewer(host,{file,filename:'example.md',onStateChange:state=>{window.previewComplete=state.ready;window.previewError=state.error?String(state.error):null},options:{autoRenderers:false,rendererMode:'replace',renderers:[textRenderer],theme,text:{markdownHighlight:enabled}}})
`,
  },
  bundle: true,
  platform: "browser",
  format: "iife",
  write: false,
  logLevel: "warning",
});
const fence = "`".repeat(3);
const block = (language, content) =>
  [fence + language, content, fence].join("\n");
const source = [
  "# Fenced source",
  block("js", "const count = 42; // scoped code"),
  block(
    "html",
    '<img src="https://highlight.invalid/pixel" onerror="window.sentinel++">',
  ),
  block("unknown-language", "unknown <tag> & text"),
  block("", "untagged code"),
  block("mermaid", "flowchart LR\nA --> B"),
  block("js", "x".repeat(100 * 1024 + 1)),
].join("\n\n");
const report = { cases: [], status: "in_progress" };
try {
  for (const [browserName, engine] of [
    ["chromium", chromium],
    ["webkit", webkit],
  ]) {
    const browser = await engine.launch({ headless: true });
    try {
      for (const [enabled, theme] of [
        [undefined, "light"],
        [undefined, "dark"],
        [false, "light"],
        [false, "dark"],
      ]) {
        const page = await browser.newPage({
          viewport: { width: 1100, height: 850 },
        });
        const errors = [],
          requests = [];
        page.on("pageerror", (error) => errors.push(String(error)));
        await page.route(/^https?:/, (route) => {
          requests.push(route.request().url());
          return route.abort();
        });
        try {
          await page.setContent(
            '<!doctype html><meta charset="utf-8"><div id="outside"><pre><code class="language-js">const outside = 1;</code></pre></div><div id="host" style="width:950px;height:700px"></div>',
          );
          await page.addScriptTag({ content: bundle.outputFiles[0].text });
          await page.evaluate(
            ({ source, enabled, theme }) => {
              window.sentinel = 0;
              window.previewComplete = false;
              window.previewError = null;
              window.controller = window.mountMarkdown(
                document.querySelector("#host"),
                new Blob([source]),
                enabled,
                theme,
              );
            },
            { source, enabled, theme },
          );
          await page.waitForFunction(
            () =>
              document
                .querySelector("#host")
                ?.shadowRoot?.querySelector(".markdown-body")
                ?.querySelectorAll("pre > code").length === 6,
          );
          // Observe completion through the public controller after highlighting.
          await page.waitForFunction(
            () => window.previewComplete || window.previewError,
          );
          assert.equal(await page.evaluate(() => window.previewError), null);
          const result = await page.evaluate(() => {
            const shadow = document.querySelector("#host").shadowRoot;
            const codes = [
              ...shadow.querySelectorAll(".markdown-body pre > code"),
            ];
            const keyword = codes[0].querySelector(".hljs-keyword");
            return {
              shadow: true,
              classes: codes.map((code) => code.className),
              source: codes.map((code) => code.textContent),
              keywordCount: codes[0].querySelectorAll(".hljs-keyword").length,
              htmlImageElements: codes[1].querySelectorAll("img").length,
              dangerousAttributes: shadow.querySelectorAll(
                "[onerror],[onclick],script",
              ).length,
              outsideHtml: document.querySelector("#outside code").innerHTML,
              keywordColor: keyword ? getComputedStyle(keyword).color : null,
              codeColor: getComputedStyle(codes[0]).color,
              sentinel: window.sentinel,
            };
          });
          report.cases.push({
            browserName,
            theme,
            enabled: enabled ?? "default",
            ...result,
          });
          assert.equal(result.source[0], "const count = 42; // scoped code\n");
          assert.equal(
            result.source[1],
            '<img src="https://highlight.invalid/pixel" onerror="window.sentinel++">\n',
          );
          assert.equal(result.htmlImageElements, 0);
          assert.equal(result.dangerousAttributes, 0);
          assert.equal(result.sentinel, 0);
          assert.equal(result.outsideHtml, "const outside = 1;");
          if (enabled === false) assert.equal(result.keywordCount, 0);
          else {
            assert.ok(
              result.keywordCount > 0,
              "Built-in highlighting must reach the real Web component ShadowRoot",
            );
            assert.notEqual(result.keywordColor, result.codeColor);
            assert.equal(
              result.keywordColor,
              theme === "dark" ? "rgb(255, 123, 114)" : "rgb(207, 34, 46)",
            );
          }
          assert.ok(
            result.classes.slice(2).every((name) => !/\bhljs\b/.test(name)),
            "Unknown, untagged, Mermaid and oversized blocks must stay plain",
          );
          assert.deepEqual(errors, []);
          assert.deepEqual(requests, []);
          await page.screenshot({
            path: join(
              output,
              `${browserName}-${theme}-${enabled === false ? "disabled" : "default"}.png`,
            ),
          });
          await page.evaluate(() => window.controller.destroy());
          assert.equal(
            await page.evaluate(() =>
              document
                .querySelector("#host")
                .shadowRoot.querySelector(".markdown-body"),
            ),
            null,
          );
        } finally {
          await page.close();
        }
      }
    } finally {
      await browser.close();
    }
  }
  report.status = "passed";
} catch (error) {
  report.status = "failed";
  report.failure = String(error);
  throw error;
} finally {
  await writeFile(
    join(output, "report.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
}
console.log(
  "Markdown highlighting passed: actual ShadowRoot, aliases, escaping, opt-out, bounded fallback and teardown in Chromium/WebKit.",
);
