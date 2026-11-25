# Issue #518 test workbooks

These synthetic workbooks contain invented budget and staffing cells. The test password is `RenderTest 密码🍀`.

- `plain.xlsx` is the original workbook generated with the repository's styled-exceljs dependency.
- `agile.xlsx` and `standard.xlsx` were encrypted from those bytes using the independent `officecrypto-tool@0.0.19` implementation. They cover Agile AES and Standard AES respectively. The Node-only reference is used to make fixtures and is not a project dependency.
- `unsupported.xlsx` has an altered encryption-version field to exercise explicit rejection of an unsupported encryption format.
