import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const githubRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repositoryRoot = resolve(githubRoot, '..')

const read = (path) => readFile(resolve(repositoryRoot, path), 'utf8')
const includesAll = (content, values, label) => {
  for (const value of values) {
    assert(content.includes(value), `${label} is missing: ${value}`)
  }
}

const [
  bugForm,
  compatibilityForm,
  issueConfig,
  pullRequestTemplate,
  prWorkflow,
  issueWorkflow,
  contributing,
  support
] = await Promise.all([
  read('.github/ISSUE_TEMPLATE/bug_report.yml'),
  read('.github/ISSUE_TEMPLATE/compatibility.yml'),
  read('.github/ISSUE_TEMPLATE/config.yml'),
  read('.github/PULL_REQUEST_TEMPLATE.md'),
  read('.github/workflows/pr-governance.yml'),
  read('.github/workflows/issue-governance.yml'),
  read('CONTRIBUTING.md'),
  read('SUPPORT.md')
])

await read('.github/prettier-governance.json')

for (const [label, form] of [
  ['bug form', bugForm],
  ['compatibility form', compatibilityForm]
]) {
  includesAll(
    form,
    [
      'Sample sharing method',
      'admin@flyfish.dev',
      'required: true',
      'screenshots',
      'safe to redistribute for regression testing'
    ],
    label
  )
}

assert(issueConfig.includes('blank_issues_enabled: false'), 'Blank issues must stay disabled.')

includesAll(
  pullRequestTemplate,
  [
    '## Summary',
    '## Related issue',
    '## Change classification',
    '## Verification',
    '## Sample / fixture evidence',
    '## Visual evidence',
    '## Risk and compatibility',
    '## Checklist',
    'admin@flyfish.dev'
  ],
  'pull request template'
)

includesAll(
  prWorkflow,
  [
    'pull_request_target:',
    'Validate PR title and evidence',
    'governance.mjs',
    'contents: read',
    'pull-requests: read',
    'ref: ${{ github.event.repository.default_branch }}',
    'persist-credentials: false'
  ],
  'PR governance workflow'
)
assert(
  !prWorkflow.includes('pull_request.head') && !prWorkflow.includes('.head.sha'),
  'PR governance must never check out or execute the untrusted pull request head.'
)
includesAll(
  issueWorkflow,
  [
    'issues:',
    'status:needs-sample',
    'governance.mjs',
    'contents: read',
    'issues: write',
    'persist-credentials: false'
  ],
  'issue governance workflow'
)
includesAll(
  contributing,
  ['admin@flyfish.dev', 'pnpm verify:github-governance', 'Visual evidence'],
  'CONTRIBUTING.md'
)
includesAll(support, ['admin@flyfish.dev', 'A screenshot alone is not sufficient'], 'SUPPORT.md')

console.log(
  'Verified issue forms, PR evidence contract, contributor guidance, and governance workflows.'
)
