import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
function angularCohort(manifest) {
  const dependencies = { ...manifest.dependencies, ...manifest.devDependencies }
  for (const name of [
    'common',
    'compiler',
    'core',
    'platform-browser',
    'build',
    'cli',
    'compiler-cli'
  ])
    assert.ok(dependencies[`@angular/${name}`], `Missing Angular cohort member: ${name}`)
  const versions = Object.entries(dependencies)
    .filter(([name]) => name.startsWith('@angular/'))
    .map(([, version]) => version)
  assert.equal(new Set(versions).size, 1, 'Angular framework and tooling must use one exact cohort')
  assert.match(versions[0], /^\d+\.\d+\.\d+$/, 'Angular fixture must pin stable exact versions')
}
const fixture = JSON.parse(read('apps/component-demo/test/angular-pptx/package.json'))
test('cold Angular consumer pins a complete aligned cohort', () => angularCohort(fixture))
test('a single-package Angular bump fails before installation', () => {
  const changed = structuredClone(fixture)
  changed.dependencies['@angular/core'] = '0.0.0'
  assert.throws(() => angularCohort(changed), /one exact cohort/)
})
test('thumbnail manifest agrees with workspace Vitest security override', () => {
  const thumbnail = JSON.parse(read('packages/thumbnail/package.json'))
  const override = read('pnpm-workspace.yaml').match(/^  vitest: (\S+)$/m)?.[1]
  assert.ok(override)
  assert.equal(thumbnail.devDependencies.vitest, override)
})
test('Dependabot groups version and security Angular updates in the nested fixture', () => {
  const entry = read('.github/dependabot.yml')
    .split('  - package-ecosystem: npm')
    .find((part) => part.includes('directory: /apps/component-demo/test/angular-pptx'))
  assert.ok(entry)
  assert.match(
    entry,
    /angular-version-cohort:\s+applies-to: version-updates\s+patterns:\s+- '@angular\/\*'/
  )
  assert.match(
    entry,
    /angular-security-cohort:\s+applies-to: security-updates\s+patterns:\s+- '@angular\/\*'/
  )
})
