import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const packageRoot = resolve(import.meta.dirname, "..");
const repositoryRoot = resolve(packageRoot, "../../..");
const require = createRequire(join(repositoryRoot, "package.json"));
const { chromium, webkit } = require("playwright");
const work = await realpath(
  await mkdtemp(join(tmpdir(), "file-viewer-311-browser-")),
);
const output = join(repositoryRoot, "output/vite-github-311");
const report = { cases: [], passed: false };
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`,
  );
  return result.stdout;
}
await mkdir(output, { recursive: true });
await mkdir(join(work, "pack"));
run("pnpm", ["pack", "--pack-destination", join(work, "pack")], packageRoot);
const tarball = join(
  work,
  "pack",
  (await readdir(join(work, "pack"))).find((name) => name.endsWith(".tgz")),
);
report.pluginSha256 = sha256(await readFile(tarball));
try {
  for (const major of [7, 8]) {
    const app = join(work, "vite-" + major);
    await mkdir(app);
    await writeFile(
      join(app, "package.json"),
      JSON.stringify(
        {
          name: `file-viewer-311-vite-${major}`,
          private: true,
          type: "module",
          dependencies: {
            "@file-viewer/react": "3.1.2",
            "@file-viewer/preset-standard": "3.1.2",
            "@file-viewer/vite-plugin": `file:${tarball}`,
            react: "19.2.7",
            "react-dom": "19.2.7",
            vite: major === 7 ? "7.3.6" : "8.2.2",
          },
        },
        null,
        2,
      ),
    );
    await writeFile(
      join(output, `vite-${major}-install.log`),
      run(
        "pnpm",
        [
          "install",
          "--ignore-scripts",
          "--registry=https://registry.npmjs.org",
        ],
        app,
      ),
    );
    const consumerRequire = createRequire(join(app, "package.json"));
    const pluginPath = await realpath(
      consumerRequire.resolve("@file-viewer/vite-plugin"),
    );
    assert.ok(
      pluginPath.startsWith(app + sep),
      "The tested plugin must be physically installed",
    );
    const { fileViewerRenderers } = await import(
      pathToFileURL(pluginPath).href
    );
    const vite = await import(
      pathToFileURL(consumerRequire.resolve("vite")).href
    );
    await writeFile(
      join(app, "index.html"),
      '<!doctype html><meta charset="utf-8"><div id="root" style="height:600px"></div><script type="module" src="./main.tsx"></script>',
    );
    const variants = [
      { name: "default-with-assets", copyAssets: true },
      { name: "default-without-assets", copyAssets: false },
      {
        name: "explicit-standard-preset",
        copyAssets: false,
        explicitPreset: true,
      },
      { name: "host-manual-chunks", copyAssets: false, manual: true },
    ];
    if (major === 7)
      variants.push({
        name: "opt-out-reproduces-cjs-cycle",
        copyAssets: false,
        optOut: true,
      });
    const previousCwd = process.cwd();
    process.chdir(app);
    try {
      for (const variant of variants) {
        await writeFile(
          join(app, "main.tsx"),
          `
import React from 'react'
import { createRoot } from 'react-dom/client'
import { FileViewer } from '@file-viewer/react'
${variant.explicitPreset ? "import standardRenderers from '@file-viewer/preset-standard'" : ""}
const buffer=new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="90"><rect width="200" height="90" fill="#1565c0"/><text x="10" y="45" fill="white">CJS initialization</text></svg>').buffer
createRoot(document.querySelector('#root')!).render(<FileViewer buffer={buffer} filename="initialization.svg" options={{toolbar:false,${variant.explicitPreset ? "preset:standardRenderers,autoRenderers:false,rendererMode:'replace'" : ""}}}/>)
`,
        );
        const config = {
          configFile: false,
          root: app,
          logLevel: "warn",
          plugins: [
            fileViewerRenderers({
              copyAssets: variant.copyAssets,
              stabilizeInteropChunks: !variant.optOut,
            }),
          ],
          build: {
            outDir: "dist-" + variant.name,
            ...(variant.manual
              ? {
                  rollupOptions: {
                    output: {
                      manualChunks: (id) =>
                        id.includes("/node_modules/")
                          ? "host-vendor"
                          : undefined,
                    },
                  },
                }
              : {}),
          },
        };
        await vite.build(config);
        const preview = await vite.preview({
          ...config,
          preview: { host: "127.0.0.1", port: 0 },
        });
        const origin = `http://127.0.0.1:${preview.httpServer.address().port}`;
        try {
          for (const [name, engine] of [
            ["chromium", chromium],
            ["webkit", webkit],
          ]) {
            const browser = await engine.launch({ headless: true });
            try {
              const page = await browser.newPage({
                viewport: { width: 1000, height: 760 },
              });
              const errors = [];
              page.on("pageerror", (error) => errors.push(error.message));
              await page.goto(origin);
              if (variant.optOut) {
                await page.waitForFunction(
                  () => document.readyState === "complete",
                );
                assert.equal(await page.locator("#root > *").count(), 0);
                assert.ok(
                  errors.some((error) =>
                    /assign|utils.*undefined/i.test(error),
                  ),
                  "The opt-out must reproduce the actual CommonJS initialization failure",
                );
              } else {
                const image = page.locator("#root img").first();
                await image.waitFor({ timeout: 30000 });
                await image.evaluate((image) => image.decode());
                assert.equal(
                  await image.evaluate((image) => image.naturalWidth),
                  200,
                );
                assert.deepEqual(errors, []);
              }
              await page.screenshot({
                path: join(output, `vite-${major}-${variant.name}-${name}.png`),
              });
              report.cases.push({
                vite: major,
                variant: variant.name,
                browser: name,
                errors,
                passed: true,
                negativeControl: !!variant.optOut,
              });
            } catch (error) {
              report.cases.push({
                vite: major,
                variant: variant.name,
                browser: name,
                passed: false,
                failure: String(error),
              });
              throw error;
            } finally {
              await browser.close();
            }
          }
        } finally {
          preview.httpServer.closeAllConnections();
          await new Promise((resolve) => preview.httpServer.close(resolve));
        }
      }
    } finally {
      process.chdir(previousCwd);
    }
  }
  report.passed = true;
} finally {
  await writeFile(
    join(output, "report.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  await rm(work, { recursive: true, force: true });
}
console.log(
  `Issue #311 production CommonJS checks passed: ${report.cases.length} actual browser cases`,
);
