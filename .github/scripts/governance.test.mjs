import assert from 'node:assert/strict'
import test from 'node:test'

import { validateIssueReport, validatePullRequest } from './governance.mjs'

const checklist = `
- [x] I added or updated focused automated coverage, or explained why it is not needed.
- [x] I updated user-facing documentation or release notes when behavior or API changed, or marked them not applicable.
- [x] I verified offline/private-deployment paths when changing Worker, WASM, fonts, vendor assets, or URLs.
- [x] I did not commit secrets, customer files, private samples, generated caches, or unrelated changes.
`

const createPullRequestBody = ({ visible = false, format = false } = {}) => `
## Summary

- Preserve real producer dimensions in the spreadsheet image layer.

## Related issue

Closes #178

## Change classification

- [${visible ? 'x' : ' '}] User-visible UI or rendering change
- [${visible ? ' ' : 'x'}] Non-visual change
- [${format ? 'x' : ' '}] File-format or renderer behavior
- [ ] Public API, package, Worker, WASM, or deployment-path change

## Verification

| Check | Result |
| --- | --- |
| \`pnpm verify:spreadsheet\` | Pass |

## Sample / fixture evidence

${format ? '- test/fixtures/issue-178/office365-image.xlsx' : '- N/A: repository policy change only'}

## Visual evidence

${visible ? '![Rendered workbook](https://github.com/user-attachments/assets/1234-5678)' : '- N/A: no rendered output changes'}

## Risk and compatibility

- Affected packages/formats: spreadsheet renderer.
- Compatibility or migration risk: none expected.
- Rollback: revert this focused commit.

## Checklist
${checklist}
`

test('accepts a sample-backed visual format PR', () => {
  const result = validatePullRequest({
    title: 'fix(spreadsheet): preserve embedded image dimensions',
    body: createPullRequestBody({ visible: true, format: true })
  })
  assert.deepEqual(result.errors, [])
})

test('accepts a non-visual PR with explicit not-applicable evidence', () => {
  const result = validatePullRequest({
    title: 'docs(contributing): define reproduction evidence',
    body: createPullRequestBody()
  })
  assert.deepEqual(result.errors, [])
})

test('rejects visual PRs without a screenshot', () => {
  const body = createPullRequestBody({ visible: true, format: true }).replace(
    '![Rendered workbook](https://github.com/user-attachments/assets/1234-5678)',
    '- After: looks correct'
  )
  const result = validatePullRequest({
    title: 'fix(spreadsheet): preserve embedded image dimensions',
    body
  })
  assert(result.errors.some((error) => error.includes('screenshot')))
})

test('rejects format PRs without a fixture', () => {
  const body = createPullRequestBody({ visible: true, format: true }).replace(
    '- test/fixtures/issue-178/office365-image.xlsx',
    '- N/A: sample omitted'
  )
  const result = validatePullRequest({
    title: 'fix(spreadsheet): preserve embedded image dimensions',
    body
  })
  assert(result.errors.some((error) => error.includes('fixture')))
})

test('rejects non-standard PR titles', () => {
  const result = validatePullRequest({ title: 'Fix bug', body: createPullRequestBody() })
  assert(result.errors.some((error) => error.startsWith('Title must use')))
})

test('rejects untouched verification placeholders', () => {
  const body = createPullRequestBody().replace(
    '| `pnpm verify:spreadsheet` | Pass |',
    '| `pnpm <command>` | <result> |'
  )
  const result = validatePullRequest({
    title: 'docs(contributing): define reproduction evidence',
    body
  })
  assert(result.errors.some((error) => error.startsWith('Verification must list')))
})

test('rejects empty risk placeholders', () => {
  const body = createPullRequestBody().replace(
    `- Affected packages/formats: spreadsheet renderer.
- Compatibility or migration risk: none expected.
- Rollback: revert this focused commit.`,
    `- Affected packages/formats:
- Compatibility or migration risk:
- Rollback:`
  )
  const result = validatePullRequest({
    title: 'docs(contributing): define reproduction evidence',
    body
  })
  assert(result.errors.some((error) => error.startsWith('Risk and compatibility')))
})

test('requires renderer paths to declare format behavior', () => {
  const result = validatePullRequest({
    title: 'refactor(pdf): simplify worker probing',
    body: createPullRequestBody(),
    files: ['packages/renderers/pdf/src/pdf.ts']
  })
  assert(result.errors.some((error) => error.includes('Renderer source/package changes')))
})

test('requires visual component paths to provide visual evidence', () => {
  const result = validatePullRequest({
    title: 'fix(vue3): align toolbar buttons',
    body: createPullRequestBody(),
    files: ['packages/components/vue3/src/toolbar.css']
  })
  assert(result.errors.some((error) => error.includes('UI stylesheet/component changes')))
})

test('accepts a public sample in a bug form', () => {
  const result = validateIssueReport({
    title: '[bug]: pptx table is clipped',
    labels: ['bug'],
    body: `
### Sample sharing method

Public download or minimal reproduction link provided below

### Sample or reproduction artifact

https://github.com/user-attachments/files/12345/sample.pptx
`
  })
  assert.deepEqual(result.errors, [])
})

const inlineIntegrationReport = `
### Affected area
Worker / WASM / fonts / deployed assets
### File type and extension
N/A
### Package names and exact versions
@file-viewer/vite-plugin@3.0.2, @file-viewer/vue3-full@3.0.2
### Sample sharing method
Inline configuration and commands (no file involved)
### Sample or reproduction artifact
none
### Minimal reproduction steps
1. Add \`fileViewerRenderers({ copyAssets: true })\` in vite.config.ts.
2. Run pnpm start from a nested Vite project.
3. The Worker is copied to public/vendor instead of public/file-viewer/vendor.
### Actual behavior
Worker request returns text/html from the SPA fallback.
### Expected behavior
The copied Worker should return JavaScript at its configured URL.
`

test('accepts complete inline config reproduction without demanding a document', () => {
  for (const body of [
    inlineIntegrationReport,
    inlineIntegrationReport.replace(
      'Inline configuration and commands (no file involved)',
      'Public or sanitized sample attached to this issue'
    )
  ]) {
    assert.deepEqual(validateIssueReport({ title: '[bug]: asset copy path', body }).errors, [])
  }
})

test('inline exception does not admit file fidelity reports or incomplete setup', () => {
  for (const body of [
    inlineIntegrationReport.replace('\nN/A\n', '\npptx\n'),
    inlineIntegrationReport.replace(
      'Worker / WASM / fonts / deployed assets',
      'File rendering or format fidelity'
    ),
    inlineIntegrationReport.replaceAll('@3.0.2', '@latest'),
    inlineIntegrationReport.replace('pnpm start', 'open the browser'),
    inlineIntegrationReport.replace('`fileViewerRenderers({ copyAssets: true })`', 'the plugin')
  ])
    assert.equal(validateIssueReport({ title: '[bug]: asset copy path', body }).ok, false)
})

test('accepts a dated private sample receipt in a bug form', () => {
  const result = validateIssueReport({
    title: '[compatibility]: private WPS workbook',
    labels: ['bug'],
    body: `
### Sample sharing method

Private sample sent to admin@flyfish.dev

### Sample file

Sent to admin@flyfish.dev on 2026-08-24: sanitized-wps.xlsx
`
  })
  assert.deepEqual(result.errors, [])
})

test('rejects a screenshot-only bug report', () => {
  const result = validateIssueReport({
    title: '[bug]: image looks wrong',
    labels: ['bug'],
    body: `
### Sample sharing method

Public or sanitized sample attached to this issue

### Sample or reproduction artifact

See screenshot below.
`
  })
  assert(result.errors.some((error) => error.includes('attachment URL')))
})

test('does not accept a GitHub image attachment as the required bug sample', () => {
  const result = validateIssueReport({
    title: '[bug]: image looks wrong',
    labels: ['bug'],
    body: `
### Sample sharing method

Public or sanitized sample attached to this issue

### Sample or reproduction artifact

https://github.com/user-attachments/assets/1234-5678
`
  })
  assert(result.errors.some((error) => error.includes('attachment URL')))
})
