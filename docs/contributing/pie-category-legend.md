# Pie and doughnut category legends

A pie or doughnut uses the first series' values as slices. Each legend item therefore names a category, with the same palette index as the corresponding slice. Cartesian charts continue to name series.

The focused synthetic reproduction is `test/spreadsheet-pie-legend.spec.ts`: one Revenue series with Hardware / Software / Services and 50 / 30 / 20. Before this fix, only Revenue appears in the legend. Afterward all three categories appear, colored blue / orange / green like their slices.

Run `pnpm exec vitest run test/spreadsheet-pie-legend.spec.ts`. Coverage includes missing category names (one-based fallback), empty series, zero and negative values (original category indexes preserved), and bar/line series legends. This change deliberately keeps the existing eight-entry cap and text truncation. It does not change slice geometry or add per-point OOXML colors.
