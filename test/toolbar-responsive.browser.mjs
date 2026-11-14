import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
const output = process.env.TOOLBAR_OUTPUT || "artifacts/toolbar-responsive";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH }
    : {}),
});
const base =
  process.env.TOOLBAR_BASE ||
  "http://127.0.0.1:43143/preview/test/fixtures/spreadsheet-comments/index.html";
const rows = [],
  errors = [],
  external = [];
try {
  for (const { width, hostWidth } of [
    { width: 320, hostWidth: 320 },
    { width: 390, hostWidth: 390 },
    { width: 1440, hostWidth: 1440 },
    { width: 1440, hostWidth: 320 },
  ])
    for (const locale of ["en-US", "zh-CN", "de-DE"])
      for (const alignment of ["top", "top-center", "bottom-right"]) {
        const page = await browser.newPage({
          viewport: { width, height: 900 },
        });
        page.on("pageerror", (e) => errors.push(e.message));
        await page.route("**/*", (route) => {
          const u = new URL(route.request().url());
          if (
            u.origin === new URL(base).origin ||
            ["data:", "blob:"].includes(u.protocol)
          )
            return route.continue();
          external.push(u.href);
          return route.abort();
        });
        await page.goto(base + "?worker=false&locale=" + locale);
        await page
          .locator(".excel-wrapper .loading")
          .waitFor({ state: "hidden" });
        await page.locator(".excel-wrapper").waitFor();
        await page.waitForTimeout(300);
        const geometry = await page.evaluate(
          ({ alignment, hostWidth }) => {
            document.querySelector("#viewer").style.width = hostWidth + "px";
            const root = document.querySelector("#viewer").shadowRoot;
            const toolbar = root.querySelector(".file-viewer-web-toolbar");
            toolbar.dataset.toolbarPosition = alignment;
            const box = (e) => {
              const r = e.getBoundingClientRect();
              return {
                left: r.left,
                right: r.right,
                top: r.top,
                bottom: r.bottom,
                width: r.width,
                height: r.height,
              };
            };
            const controls = [
              ...toolbar.querySelectorAll("button,input"),
            ].filter((e) => e.getBoundingClientRect().width);
            const clip = box(toolbar),
              text = [];
            for (const e of controls) {
              if (
                e.tagName !== "BUTTON" ||
                !e.firstChild ||
                e.firstChild.nodeType !== 3
              )
                continue;
              const range = document.createRange();
              range.selectNodeContents(e);
              const t = range.getBoundingClientRect(),
                r = box(e);
              text.push({
                label: e.textContent,
                inside: t.left >= r.left - 0.5 && t.right <= r.right + 0.5,
              });
            }
            const buttons = controls
              .filter((e) => e.tagName === "BUTTON")
              .map(box);
            let overlaps = 0;
            for (let i = 0; i < buttons.length; i++)
              for (let j = i + 1; j < buttons.length; j++) {
                const a = buttons[i],
                  b = buttons[j];
                if (
                  Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 &&
                  Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5
                )
                  overlaps++;
              }
            return {
              clip,
              host: box(root.querySelector(".file-viewer-web-shell")),
              scrollWidth: toolbar.scrollWidth,
              clientWidth: toolbar.clientWidth,
              controls: controls.map(box),
              text,
              overlaps,
            };
          },
          { alignment, hostWidth },
        );
        assert.ok(
          geometry.clip.left >= geometry.host.left - 0.5 &&
            geometry.clip.right <= geometry.host.right + 0.5,
          `${width}/${locale}/${alignment}: toolbar outside host`,
        );
        assert.ok(
          geometry.scrollWidth <= geometry.clientWidth + 1,
          `${width}/${locale}/${alignment}: horizontal content loss`,
        );
        assert.ok(
          geometry.controls.every(
            (r) =>
              r.left >= geometry.clip.left - 0.5 &&
              r.right <= geometry.clip.right + 0.5,
          ),
        );
        assert.ok(geometry.text.every((r) => r.inside));
        assert.equal(geometry.overlaps, 0);
        const focus = [];
        for (const reverse of [false, true]) {
          const controlCount = await page.evaluate((reverse) => {
            const root = document.querySelector("#viewer").shadowRoot;
            const a = [
              ...root.querySelectorAll(
                ".file-viewer-web-toolbar button,.file-viewer-web-toolbar input",
              ),
            ].filter((e) => !e.disabled && e.getBoundingClientRect().width);
            (reverse ? a.at(-1) : a[0]).focus();
            return a.length;
          }, reverse);
          assert.ok(controlCount > 0);
          const visited = [];
          for (let i = 0; i < controlCount; i++) {
            const state = await page.evaluate(() => {
              const root = document.querySelector("#viewer").shadowRoot,
                e = root.activeElement,
                t = root.querySelector(".file-viewer-web-toolbar"),
                r = e?.getBoundingClientRect(),
                c = t.getBoundingClientRect();
              const controls = [...t.querySelectorAll("button,input")].filter(
                (e) => !e.disabled && e.getBoundingClientRect().width,
              );
              return {
                index: controls.indexOf(e),
                inside: t.contains(e),
                label: e?.getAttribute("aria-label") || e?.textContent,
                visible:
                  !t.contains(e) ||
                  (r.left >= c.left - 0.5 &&
                    r.right <= c.right + 0.5 &&
                    r.top >= c.top - 0.5 &&
                    r.bottom <= c.bottom + 0.5),
              };
            });
            assert.ok(
              state.inside,
              "Keyboard left toolbar before all enabled controls were visited",
            );
            visited.push(state.index);
            assert.ok(state.visible, `keyboard clipped ${state.label}`);
            focus.push(state.label);
            await page.keyboard.press(reverse ? "Shift+Tab" : "Tab");
          }
          assert.deepEqual(
            visited,
            Array.from({ length: controlCount }, (_, i) =>
              reverse ? controlCount - 1 - i : i,
            ),
            "Every enabled toolbar control must be visited in DOM order",
          );
        }
        const download = page.locator('[data-viewer-toolbar-key="download"]');
        const d = await download.boundingBox();
        assert.ok(d);
        const pending = page.waitForEvent("download");
        await page.mouse.click(d.x + d.width / 2, d.y + d.height / 2);
        await pending;
        const theme = page.locator(".file-viewer-web-theme-button");
        const t = await theme.boundingBox();
        assert.ok(t);
        await page.mouse.click(t.x + t.width / 2, t.y + t.height / 2);
        await page.waitForFunction(
          () =>
            document
              .querySelector("#viewer")
              .shadowRoot.querySelector(".file-viewer-web-shell").dataset
              .viewerTheme === "dark",
        );
        if (width === 320 && locale === "en-US" && alignment === "top")
          await page.screenshot({ path: output + "/320-en.png" });
        rows.push({
          width,
          hostWidth,
          locale,
          alignment,
          geometry,
          focus,
          download: true,
          theme: true,
        });
        await page.close();
      }
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log(
    `PASS: ${rows.length} responsive toolbar cases, text and controls contained, no overlap, keyboard and pointer access`,
  );
} finally {
  await browser.close();
  await writeFile(
    output + "/results.json",
    JSON.stringify({ rows, errors, external }, null, 2),
  );
}
