# Vanilla JS / Script Tag

<div class="doc-kicker">Pure Web Integration</div>

<p class="doc-lead">
  Use <code>@file-viewer/web</code> when you want a framework-free viewer with the same renderer capability as Vue, React, Svelte, and jQuery packages.
</p>

## Install

```bash
npm install @file-viewer/web @file-viewer/preset-office
```

Use the full package when you want the complete matrix immediately:

```bash
npm install @file-viewer/web-full
```

`@file-viewer/web-full` enables the complete format matrix while keeping `<flyfish-file-viewer>`, `mountViewer`, and the same controller APIs. Its CDN / IIFE entry only loads the shell and lazy full preset up front; heavy PDF, Word, Excel, CAD, Typst, archive, and similar renderer bundles are fetched later from `dist/renderers/*.iife.js` when the active file type needs them.

The Full package already includes `preset-all`; do not install or pass another preset. Direct CDN use, or deploying its complete `dist/` directory intact, includes renderer chunks plus Worker/WASM/font/vendor assets and needs no copy command. If a package-aware build emits only the application entry, Vite uses `copyAssets:true`; non-Vite builds use the included same-version CLI shown below.

The historical package name remains synchronized for compatibility:

```bash
npm install @flyfish-group/file-viewer-web
```

## Web Component

```html
<flyfish-file-viewer
  id="viewer"
  src="/files/report.pdf"
  filename="report.pdf"
  locale="en-US"
  theme="light"
  toolbar-position="bottom-right"
  style="display:block;height:720px"
></flyfish-file-viewer>
```

```ts
import { defineFileViewerElement } from '@file-viewer/web'
import officePreset from '@file-viewer/preset-office'

defineFileViewerElement()

const viewer = document.getElementById('viewer') as HTMLElement & {
  options: unknown
}

viewer.options = {
  preset: officePreset,
  rendererMode: 'replace',
  theme: 'light',
  toolbar: { position: 'bottom-right' }
}
```

Keep the host element or parent container at a stable height. The viewer fills that surface.

## Style Isolation And Theme Customization

`<flyfish-file-viewer>`, `@file-viewer/web-full`, and IIFE entries use Shadow DOM by default to isolate the viewer shell, toolbar, and rendered content. This is the recommended path when the host page has global resets, low-code styles, micro-frontend CSS collisions, or legacy admin CSS. To return to the historical light-DOM behavior, set `style-isolation="none"` explicitly:

```html
<flyfish-file-viewer
  src="/files/demo.pdf"
  style-isolation="none"
  style="display:block;height:720px"
></flyfish-file-viewer>
```

Use CSS tokens and Shadow Parts for controlled customization:

```css
flyfish-file-viewer {
  --file-viewer-toolbar-bg: rgba(255, 255, 255, 0.96);
  --file-viewer-button-color: #154b83;
}

flyfish-file-viewer::part(toolbar) {
  border-radius: 999px;
}
```

See [Style Isolation And Customization](/guide/style-isolation) for modes, tokens, parts, and hostile CSS verification.

For Vite projects, add `@file-viewer/vite-plugin`. Installing the package alone does not make Vite run it; register the plugin once in `vite.config.ts`. It auto-discovers installed `@file-viewer/preset-*` packages and injects renderers, so both the Custom Element and `mountViewer` receive the matching format capabilities without manually importing the preset:

```bash
npm install -D @file-viewer/vite-plugin
```

```ts
import { defineConfig } from 'vite'
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default defineConfig({
  plugins: [
    fileViewerRenderers({
      copyAssets: true
    })
  ]
})
```

Installing only `@file-viewer/web` gives you the lightest native web component. Add a preset or renderer package for PDF, Office, CAD, Typst, archives, and other concrete formats. Heavy users can use the full package or keep the standard package with `preset-all`:

```bash
npm install @file-viewer/web @file-viewer/preset-all
```

Use `formats`, `renderers`, `scan:true`, `inject:false`, or `chunkStrategy:'renderer'` only when the product needs exact registry control. The default path stays `fileViewerRenderers({ copyAssets:true })`, with installed presets auto-activated by the plugin.

## Imperative Mount

### Angular With A Deployment Subpath

Use the same Web API from `ngAfterViewInit`, and call `controller.destroy()` in
`ngOnDestroy`. Angular's application builder does not emit Worker files referenced
by dependency JavaScript. With light packages, install `file-viewer-copy-assets`
as a development dependency at the same version as the viewer packages. Full
packages already include this CLI. Copy the installed resources before `ng build`:

```bash
npx file-viewer-copy-assets public/file-viewer
```

Keep the generated `flyfish-viewer-assets.json` with those files. Include the
`public` directory in the build's existing asset configuration, for example:

```json
{
  "baseHref": "/ui/",
  "assets": [{ "glob": "**/*", "input": "public", "output": "/" }]
}
```

PPTX discovers its copied Worker relative to the application base, including
`/ui/file-viewer/vendor/pptx/pptx.worker.js`; no `deployUrl`, optimizer exclusion,
application alias or custom Worker factory is needed. An explicit
`presentation.workerUrl` still takes precedence. `ng serve` without a copied
manifest keeps the package's development Worker resolution.

The maintained example is `apps/component-demo/test/angular-pptx`. Its browser
regression cold-installs packages and checks real slides and Worker MIME in
development and production; it does not replace Worker with a recorder.

### Mount And Clean Up

```ts
import { mountViewer } from '@file-viewer/web'
import officePreset from '@file-viewer/preset-office'

const controller = mountViewer(document.getElementById('viewer')!, {
  url: '/files/report.docx',
  options: {
    preset: officePreset,
    rendererMode: 'replace',
    theme: 'light',
    toolbar: { position: 'bottom-right' },
    archive: { cache: true }
  },
  onEvent(event) {
    console.log(event.type, event.payload)
  }
})

controller.reload()
```

With the full package, imperative code does not need to import a preset:

```ts
import { mountViewer } from '@file-viewer/web-full'

const controller = mountViewer(document.getElementById('viewer')!, {
  url: '/files/demo.dwg',
  options: {
    theme: 'light',
    toolbar: { position: 'bottom-right' }
  }
})

controller.zoomIn()
```

## Authenticated Files

When the business system must authenticate first, fetch the file in the host page and pass a named `File`:

```ts
const blob = await fetch('/api/files/contract', {
  credentials: 'include'
}).then(response => response.blob())

const file = new File([blob], 'contract.pdf', { type: blob.type })

document.querySelector('flyfish-file-viewer')!.file = file
```

## Script Tag Without A Bundler

Use the IIFE bundle for pages that do not run Vite, Webpack, Rspack, Rollup, or another package-aware bundler:

```bash
cp ./node_modules/@file-viewer/web/dist/flyfish-file-viewer-web.iife.js ./public/vendor/file-viewer-web/flyfish-file-viewer-web.iife.js
```

```html
<script src="/vendor/file-viewer-web/flyfish-file-viewer-web.iife.js"></script>

<flyfish-file-viewer
  src="/files/demo.docx"
  filename="demo.docx"
  theme="light"
  toolbar-position="bottom-right"
  style="display:block;height:720px"
></flyfish-file-viewer>
```

The IIFE registers the default custom element and exposes `window.FlyfishFileViewerWeb.mountViewer(container, options)`.

### CDN Full Bundle

For no-build pages that need the complete format matrix without local installation, use the `@file-viewer/web-full` CDN entry. jsDelivr / unpkg distribute the complete IIFE directly from npm and expose `window.FlyfishFileViewerWebFull`. The first script only loads the shell and lazy full preset; PDF, Word, Excel, CAD, Typst, archive, and similar renderers are fetched later from `dist/renderers/*.iife.js` when the active file type needs them. Worker, WASM, font, and vendor assets still resolve relative to the script URL:

```html
<div id="viewer" style="height:720px"></div>

<script src="https://unpkg.com/@file-viewer/web-full@latest/dist/flyfish-file-viewer-web-full.iife.js"></script>
<script>
  FlyfishFileViewerWebFull.mountViewer(document.getElementById('viewer'), {
    url: '/files/demo.pdf',
    options: {
      theme: 'light',
      toolbar: { position: 'bottom-right' }
    }
  })
</script>
```

The Custom Element route uses the same full bundle:

```html
<script src="https://unpkg.com/@file-viewer/web-full@latest/dist/flyfish-file-viewer-web-full.iife.js"></script>
<flyfish-file-viewer
  src="/files/demo.xlsx"
  theme="light"
  toolbar-position="bottom-right"
  style="display:block;height:720px"
></flyfish-file-viewer>
```

The CDN full bundle is ideal for POCs, classic admin pages, and public production pages that want complete capability quickly. For intranet, strict-CSP, fully offline, or private Cloudflare / cdnjs-style static domains, mirror `@file-viewer/web-full/dist` or the assets generated by `file-viewer-copy-assets` to your own CDN. cdnjs.com does not automatically host arbitrary npm packages, so a cdnjs URL only exists after the library is accepted there.

## Offline Assets

For intranet or strict-CSP deployments, copy runtime assets into your own public directory:

```bash
# @file-viewer/web-full (same-version CLI included)
npx --no-install file-viewer-copy-assets ./public/file-viewer

# Standard @file-viewer/web deployment
npx --yes file-viewer-copy-assets ./public/file-viewer
```

Run one matching command only for an entry-only or non-Vite npm build; an intact `web-full/dist/` deployment already contains the same payload. The command verifies worker, WASM, PDF, CAD, Typst, Archive, Data, DOCX, Spreadsheet, PPTX, and Draw.io assets. Runtime options such as `options.pdf.workerUrl`, `options.presentation.workerUrl`, `options.archive.wasmUrl`, `options.docx.workerUrl`, `options.typst.compilerWasmUrl`, and `options.drawing.viewerScriptUrl` can point to self-hosted URLs.

## Internationalization

The Web Component accepts `locale` as an HTML attribute or JS property. Use `options.messages` / `options.i18n` for custom copy:

```html
<flyfish-file-viewer src="/files/report.pdf" locale="en-US"></flyfish-file-viewer>
```

```ts
const viewer = document.querySelector('flyfish-file-viewer')!
viewer.locale = 'zh-CN'
viewer.options = {
  i18n: {
    locale: 'zh-CN',
    messages: {
      'toolbar.print': 'Print document'
    }
  }
}
```
