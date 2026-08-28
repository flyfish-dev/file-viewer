# GitHub Issue #96 chart fixtures

These small synthetic Office files reproduce the chart regressions reported in
[`flyfish-dev/file-viewer#96`](https://github.com/flyfish-dev/file-viewer/issues/96):

- `chart.xlsx` contains a worksheet-anchored clustered column chart.
- `chart.docx` contains a line chart whose series names use literal `<c:v>` values.

The reporter attached both files publicly to the issue. They are kept here so
the parser and browser regressions remain deterministic and offline-capable.
