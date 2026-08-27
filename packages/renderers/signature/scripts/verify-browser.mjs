import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { delimiter, dirname, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(packageRoot, "../../..");
const require = createRequire(import.meta.url);

const importPlaywright = async () => {
  for (const binDir of (process.env.PATH || "")
    .split(delimiter)
    .filter((entry) => entry.endsWith(`${sep}node_modules${sep}.bin`))) {
    try {
      const entry = require.resolve("playwright", {
        paths: [resolve(binDir, "..")],
      });
      return await import(pathToFileURL(entry).href);
    } catch {
      // npm exec exposes its temporary package root through PATH.
    }
  }
  return import("playwright");
};

const startServer = async () => {
  const appRequire = createRequire(
    resolve(repositoryRoot, "apps/viewer-demo/package.json"),
  );
  const vite = await import(pathToFileURL(appRequire.resolve("vite")).href);
  const server = await vite.createServer({
    root: packageRoot,
    logLevel: "error",
    server: {
      host: "127.0.0.1",
      port: 0,
      hmr: false,
      fs: { allow: [repositoryRoot, packageRoot] },
      headers: {
        "Content-Security-Policy": [
          "default-src 'self'",
          "script-src 'self' 'wasm-unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob:",
          "connect-src 'self'",
          "worker-src 'self' blob:",
          "object-src 'none'",
          "base-uri 'none'",
          "require-trusted-types-for 'script'",
          "trusted-types file-viewer-test",
        ].join("; "),
      },
    },
  });
  await server.listen();
  const address = server.httpServer?.address();
  assert(
    address && typeof address !== "string",
    "Unable to resolve the browser test URL.",
  );
  return { server, origin: `http://127.0.0.1:${address.port}` };
};

const verifyBrowser = async (browserType, browserName, origin) => {
  const browser = await browserType.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1024 },
    });
    const failures = [];
    const externalRequests = [];
    page.on("console", (message) => {
      if (message.type() === "error")
        failures.push(`console: ${message.text()}`);
    });
    page.on("pageerror", (error) =>
      failures.push(`pageerror: ${error.message}`),
    );
    page.on("request", (request) => {
      const url = request.url();
      if (
        !url.startsWith(origin) &&
        !url.startsWith("data:") &&
        !url.startsWith("blob:")
      ) {
        externalRequests.push(url);
      }
    });

    await page.goto(`${origin}/README.md`, { waitUntil: "domcontentloaded" });
    const state = await page.evaluate(async () => {
      document.head.replaceChildren();
      const target = document.createElement("div");
      target.id = "signature-browser-test";
      target.style.width = "100vw";
      target.style.height = "100vh";
      document.body.style.margin = "0";
      document.body.replaceChildren(target);

      const [{ default: renderSignature }, response] = await Promise.all([
        import("/dist/signature.js"),
        fetch(
          "/test/fixtures/github-206-contributed/cms/invoice-encapsulated.pdf.p7m",
        ),
      ]);
      if (!response.ok)
        throw new Error(`Fixture returned HTTP ${response.status}`);
      const rendered = await renderSignature(
        await response.arrayBuffer(),
        target,
        "p7m",
        {
          filename: "invoice-encapsulated.pdf.p7m",
          options: {},
          renderNestedBuffer: async (_buffer, extension, nestedTarget) => {
            nestedTarget.textContent = `Nested ${extension.toUpperCase()} preview verified`;
            return { destroy() {} };
          },
        },
      );
      const snapshot = {
        text: target.innerText,
        signerCount: target.querySelectorAll(".signature-item").length,
        validStatusCount: target.querySelectorAll(
          ".signature-status[data-state='valid']",
        ).length,
        errorCount: target.querySelectorAll(".signature-error").length,
        eventAttributeCount: target.querySelectorAll(
          "[onabort],[onerror],[onload],[onclick],[onmouseover]",
        ).length,
      };
      await rendered.unmount?.();
      return { ...snapshot, remainingChildren: target.childElementCount };
    });

    assert.match(
      state.text,
      /CMS \/ PKCS#7 SignedData/u,
      `[${browserName}] CMS was not rendered.`,
    );
    assert.match(
      state.text,
      /Signature: valid/u,
      `[${browserName}] signature was not verified.`,
    );
    assert.match(
      state.text,
      /Content digest: valid/u,
      `[${browserName}] digest was not verified.`,
    );
    assert(
      state.signerCount >= 1,
      `[${browserName}] signer metadata is missing.`,
    );
    assert(
      state.validStatusCount >= 2,
      `[${browserName}] expected two valid status badges.`,
    );
    assert.equal(
      state.errorCount,
      0,
      `[${browserName}] renderer reported an error.`,
    );
    assert.equal(
      state.eventAttributeCount,
      0,
      `[${browserName}] unsafe event attributes reached the DOM.`,
    );
    assert.equal(
      state.remainingChildren,
      0,
      `[${browserName}] unmount left rendered DOM behind.`,
    );
    assert.deepEqual(
      externalRequests,
      [],
      `[${browserName}] renderer attempted an external request.`,
    );
    assert.deepEqual(
      failures,
      [],
      `[${browserName}] browser failures: ${failures.join("; ")}`,
    );
    console.log(
      `[signature-browser] ${browserName}: CMS render, verification, CSP, offline and cleanup passed.`,
    );
  } finally {
    await browser.close();
  }
};

const playwrightModule = await importPlaywright();
const { chromium, firefox, webkit } = playwrightModule.chromium
  ? playwrightModule
  : playwrightModule.default;
const { server, origin } = await startServer();
try {
  await verifyBrowser(chromium, "chromium", origin);
  await verifyBrowser(firefox, "firefox", origin);
  await verifyBrowser(webkit, "webkit", origin);
} finally {
  await server.close();
}
