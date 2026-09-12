import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
function angularCohort(manifest) {
  const dependencies = { ...manifest.dependencies, ...manifest.devDependencies }
  const toolingNames = new Set(['@angular/build', '@angular/cli'])
  for (const name of ['common', 'compiler', 'core', 'platform-browser', 'compiler-cli', 'build', 'cli']) {
    assert.ok(dependencies[`@angular/${name}`], `Missing Angular cohort member: ${name}`)
  }
  const entries = Object.entries(dependencies).filter(([name]) => name.startsWith('@angular/'))
  for (const [name, version] of entries) {
    assert.match(version, /^\d+\.\d+\.\d+$/, `${name} must pin a stable exact version`)
  }
  const framework = entries.filter(([name]) => !toolingNames.has(name)).map(([, version]) => version)
  const tooling = [...toolingNames].map((name) => dependencies[name])
  // Framework packages have exact compiler/core peers; CLI/build publish patches separately.
  assert.equal(new Set(framework).size, 1, 'Angular framework and compiler must use one exact cohort')
  assert.equal(new Set(tooling).size, 1, 'Angular build and CLI must use one exact tooling cohort')
  // Keep this fixture on a reviewed release line. npm install/ls verifies actual peer ranges.
  assert.equal(framework[0].split('.').slice(0, 2).join('.'), tooling[0].split('.').slice(0, 2).join('.'), 'Angular framework/tooling release lines must match')
}
const fixture = JSON.parse(read('apps/component-demo/test/angular-pptx/package.json'))
test('cold Angular consumer pins coherent framework and tooling groups', () => angularCohort(fixture))
test('independently released tooling patches are accepted', () => {
  const changed = structuredClone(fixture)
  for (const section of ['dependencies', 'devDependencies']) for (const key of Object.keys(changed[section] || {})) {
    if (key.startsWith('@angular/')) changed[section][key] = ['@angular/build', '@angular/cli'].includes(key) ? '22.1.7' : '22.1.6'
  }
  angularCohort(changed)
})
test('split framework peers still fail before installation', () => {
  const changed = structuredClone(fixture)
  changed.dependencies['@angular/core'] = '0.0.0'
  assert.throws(() => angularCohort(changed), /framework and compiler/)
})
test('split tooling releases and mixed release lines fail', () => {
  const changed = structuredClone(fixture)
  changed.devDependencies['@angular/cli'] = '0.0.0'
  assert.throws(() => angularCohort(changed), /tooling cohort/)
  changed.devDependencies['@angular/build'] = '0.0.0'
  assert.throws(() => angularCohort(changed), /release lines/)
})
test('missing members, ranges and prerelease versions are rejected', () => {
  for (const invalid of ['^22.1.7', 'latest', '22.1.7-rc.1']) {
    const changed = structuredClone(fixture)
    changed.devDependencies['@angular/cli'] = invalid
    assert.throws(() => angularCohort(changed), /stable exact version/)
  }
  const changed = structuredClone(fixture)
  delete changed.devDependencies['@angular/compiler-cli']
  assert.throws(() => angularCohort(changed), /Missing Angular/)
})
test('thumbnail manifest agrees with workspace Vitest security override', () => {
  const thumbnail = JSON.parse(read('packages/thumbnail/package.json'))
  const override = read('pnpm-workspace.yaml').match(/^  vitest: (\S+)$/m)?.[1]
  assert.ok(override)
  assert.equal(thumbnail.devDependencies.vitest, override)
})
test('Dependabot groups version and security Angular updates in the nested fixture', () => {
  const entry = read('.github/dependabot.yml').split('  - package-ecosystem: npm').find((part) => part.includes('directory: /apps/component-demo/test/angular-pptx'))
  assert.ok(entry)
  assert.match(entry, /angular-version-cohort:\s+applies-to: version-updates\s+patterns:\s+- '@angular\/\*'/)
  assert.match(entry, /angular-security-cohort:\s+applies-to: security-updates\s+patterns:\s+- '@angular\/\*'/)
})
