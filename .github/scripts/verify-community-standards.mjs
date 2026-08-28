import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
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
  support,
  dependabot,
  securityWorkflow,
  gitleaksScript,
  gitleaksConfig,
  gitleaksIgnore
] = await Promise.all([
  read('.github/ISSUE_TEMPLATE/bug_report.yml'),
  read('.github/ISSUE_TEMPLATE/compatibility.yml'),
  read('.github/ISSUE_TEMPLATE/config.yml'),
  read('.github/PULL_REQUEST_TEMPLATE.md'),
  read('.github/workflows/pr-governance.yml'),
  read('.github/workflows/issue-governance.yml'),
  read('CONTRIBUTING.md'),
  read('SUPPORT.md'),
  read('.github/dependabot.yml'),
  read('.github/workflows/security.yml'),
  read('.github/scripts/run-gitleaks.sh'),
  read('.gitleaks.toml'),
  read('.gitleaksignore')
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

includesAll(
  dependabot,
  ['package-ecosystem: npm', 'package-ecosystem: github-actions', 'applies-to: security-updates'],
  'Dependabot configuration'
)
includesAll(
  securityWorkflow,
  [
    'Scan repository history with Gitleaks',
    'Audit the complete lockfile',
    'Review dependency changes',
    'verify:dicom-license-ledger',
    'renderer-signature verify:licenses'
  ],
  'security workflow'
)
includesAll(
  gitleaksScript,
  [
    'GITLEAKS_VERSION="8.30.1"',
    'GITLEAKS_PLATFORM="darwin_arm64"',
    'GITLEAKS_PLATFORM="darwin_x64"',
    'GITLEAKS_PLATFORM="linux_arm64"',
    'GITLEAKS_PLATFORM="linux_x64"',
    'GITLEAKS_SHA256="b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5"',
    'GITLEAKS_SHA256="dfe101a4db2255fc85120ac7f3d25e4342c3c20cf749f2c20a18081af1952709"',
    'GITLEAKS_SHA256="e4a487ee7ccd7d3a7f7ec08657610aa3606637dab924210b3aee62570fb4b080"',
    'GITLEAKS_SHA256="551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb"',
    'actual_sha256="$(sha256sum',
    'actual_sha256="$(shasum -a 256',
    '[[ "${actual_sha256}" != "${GITLEAKS_SHA256}" ]]',
    'gitleaks" git',
    '--redact',
    '--timeout 1500',
    '--config .gitleaks.toml'
  ],
  'Gitleaks runner'
)
includesAll(
  gitleaksConfig,
  [
    'useDefault = true',
    'targetRules = ["dropbox-api-token"]',
    '^third_party/drawio/viewer-static\\.min\\.js$'
  ],
  'Gitleaks allowlist'
)

const reviewedGitleaksFingerprints = gitleaksIgnore
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'))
assert.equal(
  reviewedGitleaksFingerprints.length,
  43,
  'Gitleaks historical review baseline changed without updating the governance evidence'
)
assert.equal(
  new Set(reviewedGitleaksFingerprints).size,
  reviewedGitleaksFingerprints.length,
  'Gitleaks historical review baseline contains duplicate fingerprints'
)
for (const fingerprint of reviewedGitleaksFingerprints) {
  assert.match(
    fingerprint,
    /^[0-9a-f]{40}:.+:[a-z0-9-]+:\d+$/,
    `Invalid Gitleaks historical fingerprint: ${fingerprint}`
  )
}

const workflowDirectory = resolve(githubRoot, 'workflows')
const workflowNames = (await readdir(workflowDirectory))
  .filter((name) => /\.ya?ml$/i.test(name))
  .sort()
const workflows = await Promise.all(
  workflowNames.map(async (name) => [name, await read(`.github/workflows/${name}`)])
)
const unpinnedActions = []
for (const [name, workflow] of workflows) {
  for (const [index, line] of workflow.split('\n').entries()) {
    const action = line.match(/\buses:\s*([^\s#]+)/)?.[1]
    if (!action || action.startsWith('./')) continue
    if (!/@[0-9a-f]{40}$/.test(action)) {
      unpinnedActions.push(`${name}:${index + 1}:${action}`)
    }
  }
}
assert.deepEqual(
  unpinnedActions,
  [],
  `Every third-party action must be pinned to a full commit SHA:\n${unpinnedActions.join('\n')}`
)

console.log(
  'Verified issue forms, PR evidence, security automation, pinned Actions, and contributor guidance.'
)
