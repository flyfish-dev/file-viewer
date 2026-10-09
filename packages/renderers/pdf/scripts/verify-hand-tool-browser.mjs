import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { createPdfReviewHarness } from "./pdf-review-harness.mjs";

const root = path.resolve(import.meta.dirname, "../../../..");
const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, StandardFonts } = require("pdf-lib");
const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
const first = pdf.addPage([800, 1200]);
const second = pdf.addPage([800, 1200]);
first.drawText("SELECTABLE PDF TEXT", { x: 50, y: 1100, size: 22, font });
first.drawText("GO TO SECOND PAGE", { x: 50, y: 1150, size: 20, font });
second.drawText("SECOND PAGE", { x: 50, y: 1100, size: 22, font });
const link = pdf.context.register(
  pdf.context.obj({
    Type: "Annot",
    Subtype: "Link",
    Rect: [45, 1140, 300, 1180],
    Border: [0, 0, 0],
    Dest: [second.ref, PDFName.of("Fit")],
  }),
);
first.node.set(PDFName.of("Annots"), pdf.context.obj([link]));
const bytes = Buffer.from(await pdf.save());
const installedRoot = process.env.PDF_HAND_INSTALLED_ROOT;
assert.notEqual(process.env.PDF_REVIEW_IN_MEMORY, "1", "Hand-tool verification requires the real HTTP PDF Worker");
const output = process.env.PDF_HAND_OUTPUT ? path.resolve(process.env.PDF_HAND_OUTPUT) : path.join(
  root,
  "output/pdf-hand-tool",
  installedRoot ? "installed" : "source",
);
await mkdir(output, { recursive: true });
await writeFile(path.join(output, "hand-tool.pdf"), bytes);
const report = {
  checks: [],
  passed: false,
  installedRoot: installedRoot || null,
};
const check = async (name, fn) => {
  try {
    const evidence = await fn();
    report.checks.push({ name, passed: true, evidence });
  } catch (error) {
    report.checks.push({ name, passed: false, error: String(error) });
    throw error;
  }
};
async function scroll(page) {
  return page.evaluate(() => {
    const node = document.querySelector(".pdf-wrapper");
    return {
      left: node.scrollLeft,
      top: node.scrollTop,
      cursor: getComputedStyle(node).cursor,
    };
  });
}
async function prepare(page) {
  await page.evaluate(async () => {
    await provider.applyState({ scale: 2 });
  });
  await page.waitForFunction(() => {
    const node = document.querySelector(".pdf-wrapper");
    return (
      node.scrollWidth > node.clientWidth + 200 &&
      node.scrollHeight > node.clientHeight + 200
    );
  });
  await page.evaluate(() => {
    const node = document.querySelector(".pdf-wrapper");
    node.scrollLeft = 150;
    node.scrollTop = 300;
  });
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
}
async function drag(page, dx = -70, dy = -80, modifier) {
  const rect = await page.locator(".pdf-wrapper").boundingBox();
  const x = rect.x + rect.width * 0.7,
    y = rect.y + rect.height * 0.7;
  if (modifier) await page.keyboard.down(modifier);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 8 });
  await page.mouse.up();
  if (modifier) await page.keyboard.up(modifier);
}
try {
  for (const browserName of ["chromium", "webkit"]) {
    const h = await createPdfReviewHarness({
      output: path.join(output, browserName),
      fixtures: new Map([["hand.pdf", bytes]]),
      browserName,
      installedRoot,
    });
    try {
      const page = await h.newPage();
      {
        await check(
          `${browserName}: default mode selects real PDF text`,
          async () => {
            await h.mount(page, { id: "hand.pdf", width: 620, height: 520 });
            await page.evaluate(async () => {
              await provider.applyState({ scale: 1 });
            });
            const text = page
              .locator(".textLayer span")
              .filter({ hasText: "SELECTABLE PDF TEXT" })
              .first();
            await text.waitFor();
            await text.scrollIntoViewIfNeeded();
            const box = await text.boundingBox();
            await page.mouse.move(box.x + 2, box.y + box.height / 2);
            await page.mouse.down();
            await page.mouse.move(
              box.x + box.width - 2,
              box.y + box.height / 2,
              { steps: 12 },
            );
            await page.mouse.up();
            const selection = await page.evaluate(() => String(getSelection()));
            const geometry = await text.evaluate((node) => {
              const rect = node.getBoundingClientRect();
              const hit = document.elementFromPoint(
                rect.x + 2,
                rect.y + rect.height / 2,
              );
              return {
                rect: rect.toJSON(),
                userSelect: getComputedStyle(node).userSelect,
                hit: hit?.outerHTML.slice(0, 300),
                layerSelect: getComputedStyle(node.parentElement).userSelect,
              };
            });
            await page.screenshot({
              path: path.join(
                output,
                browserName,
                "default-text-selection.png",
              ),
            });
            assert.ok(
              selection.includes("SELECTABLE PDF TEXT"),
              JSON.stringify({ selection, geometry }),
            );
            return { selection };
          },
        );
      }
      for (const handTool of [false, true]) {
        await check(
          `${browserName}: actual PDF mouse drag with handTool=${handTool}`,
          async () => {
            await h.mount(page, {
              id: "hand.pdf",
              width: 620,
              height: 520,
              options: { handTool },
            });
            await prepare(page);
            const before = await scroll(page);
            await drag(page);
            const after = await scroll(page);
            const shouldPan = handTool;
            assert.ok(
              shouldPan
                ? after.left - before.left > 60
                : Math.abs(after.left - before.left) < 1,
            );
            assert.ok(
              shouldPan
                ? after.top - before.top > 70
                : Math.abs(after.top - before.top) < 1,
            );
            if (shouldPan) assert.equal(after.cursor, "grab");
            return { before, after, shouldPan };
          },
        );
      }
      {
        await check(
          `${browserName}: right-button drag does not pan`,
          async () => {
            await prepare(page);
            const before = await scroll(page);
            const rect = await page.locator(".pdf-wrapper").boundingBox();
            await page.mouse.move(rect.x + 300, rect.y + 300);
            await page.mouse.down({ button: "right" });
            await page.mouse.move(rect.x + 230, rect.y + 220, { steps: 8 });
            await page.mouse.up({ button: "right" });
            await page.keyboard.press("Escape");
            const after = await scroll(page);
            assert.ok(
              Math.abs(after.left - before.left) < 1 &&
                Math.abs(after.top - before.top) < 1,
            );
            return { before, after };
          },
        );
        for (const modifier of ["Shift", "Control", "Alt", "Meta"])
          await check(
            `${browserName}: ${modifier} drag retains native behavior`,
            async () => {
              await prepare(page);
              const before = await scroll(page);
              await drag(page, -70, -80, modifier);
              const after = await scroll(page);
              assert.ok(
                Math.abs(after.left - before.left) < 1 &&
                  Math.abs(after.top - before.top) < 1,
              );
              return { before, after };
            },
          );
        await check(
          `${browserName}: CSS-scaled viewport pans in scroll coordinates`,
          async () => {
            await prepare(page);
            await page.locator("#host").evaluate((host) => {
              host.style.transformOrigin = "top left";
              host.style.transform = "scale(.75)";
            });
            const before = await scroll(page);
            await drag(page, -60, -60);
            const after = await scroll(page);
            assert.ok(
              Math.abs(after.left - before.left - 80) <= 2 &&
                Math.abs(after.top - before.top - 80) <= 2,
            );
            await page.locator("#host").evaluate((host) => {
              host.style.transform = "";
            });
            return { before, after };
          },
        );
        await check(
          `${browserName}: real annotation link remains clickable`,
          async () => {
            await page.evaluate(() => {
              document.querySelector(".pdf-wrapper").scrollTop = 0;
              document.querySelector(".pdf-wrapper").scrollLeft = 0;
            });
            const link = page
              .locator(".annotationLayer .linkAnnotation a")
              .first();
            await link.click();
            await page.waitForFunction(() => provider.getState().page === 2);
            return {
              page: await page.evaluate(() => provider.getState().page),
            };
          },
        );
        for (const cancellation of ["blur", "pointercancel"]) {
          await check(
            `${browserName}: ${cancellation} ends an actual active mouse drag`,
            async () => {
              await prepare(page);
              await page.evaluate(() => {
                document.querySelector(".pdf-wrapper").addEventListener(
                  "pointerdown",
                  (event) => {
                    window.handPointerId = event.pointerId;
                  },
                  { once: true },
                );
              });
              const rect = await page.locator(".pdf-wrapper").boundingBox();
              await page.mouse.move(rect.x + 300, rect.y + 300);
              await page.mouse.down();
              assert.equal((await scroll(page)).cursor, "grabbing");
              // Dispatch the cancellation itself; the preceding input is a real mouse drag.
              await page.evaluate((kind) => {
                dispatchEvent(
                  kind === "blur"
                    ? new Event("blur")
                    : new PointerEvent("pointercancel", {
                        pointerId: window.handPointerId,
                        pointerType: "mouse",
                      }),
                );
              }, cancellation);
              const before = await scroll(page);
              assert.equal(before.cursor, "grab");
              assert.equal(
                await page
                  .locator(".pdf-wrapper")
                  .evaluate((node) => node.style.userSelect),
                "",
              );
              await page.mouse.move(rect.x + 230, rect.y + 220, { steps: 8 });
              await page.mouse.up();
              const after = await scroll(page);
              assert.ok(
                Math.abs(after.left - before.left) < 1 &&
                  Math.abs(after.top - before.top) < 1,
              );
              return { before, after, cancellationDispatched: true };
            },
          );
        }
        await check(
          `${browserName}: unmount during an active drag releases listeners and styles`,
          async () => {
            await h.mount(page, {
              id: "hand.pdf",
              width: 620,
              height: 520,
              options: { handTool: true },
            });
            await prepare(page);
            const rect = await page.locator(".pdf-wrapper").boundingBox();
            await page.mouse.move(rect.x + 300, rect.y + 300);
            await page.mouse.down();
            assert.equal((await scroll(page)).cursor, "grabbing");
            const result = await page.evaluate(() => {
              const old = document.querySelector(".pdf-wrapper");
              instance.unmount();
              window.oldPdfViewport = old;
              return {
                connected: old.isConnected,
                cursor: old.style.cursor,
                selection: old.style.userSelect,
                left: old.scrollLeft,
                top: old.scrollTop,
              };
            });
            assert.equal(result.connected, false);
            assert.equal(result.cursor, "");
            assert.equal(result.selection, "");
            await page.mouse.move(rect.x + 200, rect.y + 200);
            await page.mouse.up();
            assert.deepEqual(
              await page.evaluate(() => ({ left: oldPdfViewport.scrollLeft, top: oldPdfViewport.scrollTop })),
              { left: result.left, top: result.top },
              "Detached viewport must not keep reacting to mouse movement",
            );
            assert.equal(await page.locator("#host > *").count(), 0);
            return result;
          },
        );
      }
      await check(
        `${browserName}: native PDF Worker and local resources`,
        () => {
          assert.ok(h.workers.some((url) => url.endsWith("pdf.worker.mjs")));
          assert.deepEqual(h.errors, []);
          assert.deepEqual(h.external, []);
          assert.deepEqual(h.requests.filter(request => request.status >= 400), []);
          return { workerUrls: h.workers, external: h.external, failedRequests: [] };
        },
      );
      await page.close();
    } finally {
      await h.close();
    }
  }
  report.passed = true;
} catch (error) {
  report.error = String(error);
  throw error;
} finally {
  await writeFile(
    path.join(output, "report.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
}
console.log(
  `Real PDF hand-tool checks passed: ${report.checks.length}, ${installedRoot ? "installed candidate" : "source candidate"}`,
);
