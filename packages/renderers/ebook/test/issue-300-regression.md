# EPUB flicker regression: GitHub #300

Report: https://github.com/flyfish-dev/file-viewer/issues/300

## Original sample

The issue's `moby-dick.epub.txt` attachment is a real EPUB ZIP. Keep its bytes
local at `.release/issue-300/moby-dick.epub`; do not commit the attachment.
Its SHA-256 is
`1d4b0c88dbd9457f71695a862b71460d21104e827a720aa6c820293f5789c988`.

Download from the repository root, without sending account credentials to an
attachment redirect:

```sh
mkdir -p .release/issue-300
curl --fail --location --output .release/issue-300/moby-dick.epub https://github.com/user-attachments/files/32370159/moby-dick.epub.txt
```

The browser harness blocks off-origin HTTP requests and checks that every
chapter iframe has `sandbox="allow-same-origin"`, without `allow-scripts`.

## Reproduction and cause

Before changing the renderer, the original sample reproduced both reported
paths in desktop Chrome:

- At a 1920 x 1000 browser viewport, initial Chapter 1 rendering continued to
  change after settling: 60 layout changes in the final two seconds of a
  3.5-second observation.
- At 1728 x 1000, selecting Chapter 2 and returning to Chapter 1 produced 61
  changes in the same observation interval.

The book switches paragraph fonts in `orientation` media queries. The
continuous EPUB engine sizes each iframe to its content height. At the first
reproduction width, Chapter 1 alternated between 1619 and 1831 pixels high in
a 1644-pixel-wide iframe. Each resize changed the iframe's orientation, which
changed the font and caused the opposite resize. This is a layout feedback
loop, independent of the sample filename or chapter text.

There was also a separate position jump: browser scroll anchoring duplicated
epub.js's scroll compensation when it prepended/resized preceding chapters.
Chapter navigation could land mid-chapter or even in the following chapter.

## Fix

Evaluate orientation media features against the stable reader viewport instead
of the expanding chapter iframe. Preserve the rest of each media query and
its boolean operators. Traverse stylesheet media, nested grouping rules, and
imports; retain original queries weakly so resizing can switch orientation
again. Content hooks handle newly rendered chapters; a reader ResizeObserver
updates existing chapters. Disconnect the observer and hook before destroying
the rendition. Unreadable cross-origin CSS rules remain untouched.

Disable browser scroll anchoring on the EPUB scroll container because the
continuous manager already compensates chapter insertions and size changes.
Continuous scrolling, author styles, and the chapter script sandbox remain in
use. No upstream engine bundle, dependency, or package version was changed.

## Verification

Run from the repository root with the existing dependencies, bundled EPUB
engine, and installed Google Chrome:

```sh
node node_modules/vitest/vitest.mjs run --config packages/renderers/ebook/test/issue-300-vitest.config.ts
EPUB_300_OUTPUT=.release/issue-300/verified-1728 node packages/renderers/ebook/test/issue-300-epub-browser.mjs
EPUB_300_WIDTH=1920 EPUB_300_OUTPUT=.release/issue-300/verified-1920 node packages/renderers/ebook/test/issue-300-epub-browser.mjs
EPUB_300_WIDTH=1920 EPUB_300_OUTPUT=.release/issue-300/demo-1920 node packages/renderers/ebook/test/issue-300-epub-browser.mjs --demo
node node_modules/typescript/bin/tsc -p packages/renderers/ebook/tsconfig.json --noEmit --incremental false --composite false
```

`EPUB_300_SAMPLE` can point to another local copy of the same original sample.
`--headed` opens a visible test browser; `--record-only` records measurements
without enforcing layout stability or chapter-position assertions.

The isolated browser run uses the renderer source with the existing bundled
engine. It checks first load, Chapter 2, return to Chapter 1, the TOC toggle,
next/previous page, portrait/landscape reader resizing, and unmount/remount.
All nine phases passed at both widths, with zero continuing layout changes
after the settling interval. It also checks readable content, chapter-start
alignment, the author font changing with the reader's orientation, sandbox
flags, browser exceptions, and external requests.

`--demo` starts a separate Vue 3 + Vite Demo server with its cache under the
output directory, uploads the local sample through the existing upload UI,
and checks the three original reproduction phases inside the component's
Shadow DOM. All three passed. The harness closes only its own browser and
servers. The eight unit tests cover module/navigation behavior, compound
queries, nested/imported media, reversible resize, hidden/square viewports,
cross-origin CSS errors, and observer/hook cleanup.

Each browser run writes screenshots and `CURRENT.json` with its actual browser,
source/sample hashes, phase measurements, errors, and outcome. Baseline traces
are local in `.release/issue-300/baseline-1728` and `baseline-1920`.

## Limits

This verifies the local current desktop Chrome and local Vite Demo, not the
reporter's exact Chrome build, other browsers, iOS, deployed sites, or published
packages. No simulator, commit, push, release, or issue-state change was made.
This fix addresses orientation-driven reflow; other viewport-dependent CSS
features and inaccessible cross-origin stylesheet rules are not normalized.
