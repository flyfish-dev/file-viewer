# Spreadsheet coordinate navigation (API proposal)

External search and citations often already know a cell range. Searching for its text is ambiguous when values repeat and cannot address blank cells. The spreadsheet renderer now registers the existing core view-state provider and accepts an optional typed range:

```ts
const result = await viewer.applyViewState({
  spreadsheet: {
    range: { sheetId: 1, startRow: 29, startCol: 3, endRow: 29, endCol: 4 }
  }
})
if (result?.spreadsheet?.status === 'applied') {
  // The renderer switched sheets, loaded the target virtual window and applied the scroll.
}
```

This works through the framework-neutral viewer and the React/Vue handles that already expose `applyViewState`. No framework-specific prop or new dependency is required. `initialViewState` can use the same shape where supported by the wrapper. Coordinates are zero-based, inclusive, and use the parser's workbook sheet id (not the visible-tab index). This API is scoped to the currently loaded workbook, not a durable file identity/revision scheme.

The range is highlighted independently of the grid's copy/edit selection. Existing text search stays separate. The top-left cell is scrolled into view; ranges larger than a viewport are not zoomed to fit. Bounds outside the parsed used rectangle, negative/fractional coordinates, inverted rectangles, and hidden/unknown sheets are rejected. Hidden rows/columns and merged-cell focus normalization need additional design; this is not an Excel editing or selection API.

Awaited status is `applied`, `rejected`, `cancelled`, `failed`, or `disposed`. A new request or manual sheet/search action cancels the old request and clears its highlight. Parse/Worker failure and destruction settle pending operations; stale animation callbacks cannot complete a newer request. No-range view-state updates are a no-op for this provider (scale is observational; use the existing zoom API). `scrollToAnchor` retains its existing behavior.

## Validation

Unit tests: `pnpm exec vitest run test/spreadsheet-range-navigation.spec.ts`.

For the browser reproduction, first build core/spreadsheet packages, then start Vite using the demo's existing Vite dependency:

```sh
pnpm --filter @flyfish-group/file-viewer-demo exec vite --config ../../test/spreadsheet-range.vite.config.mjs
# In another terminal at the repository root:
node test/spreadsheet-range.browser.mjs
```

Set `CHROME_PATH` to use an installed Chrome, or use Playwright's installed Chromium. The fixture is entirely synthetic, with repeated text at D8/D30, a blank D20:E20, a hidden sheet and a separate target at D600 beyond the first 500-row window. Assertions check real target visibility/highlight, three round trips after layout retries, cross-window navigation, invalid/hidden/out-of-bounds rejection, request supersession and existing search. Unit coverage also checks failure/destruction while loading and defensive copies.

Source review target is `release/3.1.2-public` because main distributes runtime artifacts. The API shape is proposed for maintainer review; downstream applications should wait for an official release rather than depend on this branch. No runtime CDN or Worker path changes are introduced.
