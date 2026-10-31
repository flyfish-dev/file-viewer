import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

const script = new URL('./prepare-browser-apt.py', import.meta.url).pathname
const archive = 'https://archive.ubuntu.com/ubuntu/'
const security = 'https://security.ubuntu.com/ubuntu/'
const original = `http://azure.archive.ubuntu.com/ubuntu/\tpriority:1\n${archive}\tpriority:2\n${security}\tpriority:3\n`

function fixture(t, source = original) {
  const directory = mkdtempSync(join(tmpdir(), 'file-viewer-apt-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const mirrors = join(directory, 'apt-mirrors.txt')
  const config = join(directory, '80-file-viewer-browser')
  writeFileSync(mirrors, source)
  writeFileSync(config, '// original config\n')
  return {
    directory,
    mirrors,
    config,
    run: () =>
      spawnSync('python3', [script, '--mirror-list', mirrors, '--apt-config', config], {
        encoding: 'utf8'
      })
  }
}

test('the actual runner mirror list selects its official HTTPS alternatives and retains trust inputs', (t) => {
  const f = fixture(t)
  const sources = join(f.directory, 'ubuntu.sources')
  const keyring = join(f.directory, 'ubuntu-archive-keyring.gpg')
  const source =
    'URIs: mirror+file:/etc/apt/apt-mirrors.txt\nSuites: noble noble-security\nSigned-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg\n'
  writeFileSync(sources, source)
  writeFileSync(keyring, 'unchanged signing key fixture')
  const result = f.run()
  assert.equal(result.status, 0, result.stderr)
  assert.equal(readFileSync(f.mirrors, 'utf8'), `${archive}\tpriority:1\n${security}\tpriority:2\n`)
  const options = readFileSync(f.config, 'utf8')
  assert.match(options, /Acquire::Retries "2"/)
  assert.match(options, /Acquire::http::Timeout "30"/)
  assert.match(options, /Acquire::https::Timeout "30"/)
  assert.doesNotMatch(
    options,
    /AllowUnauthenticated|AllowInsecure|Verify-Peer|Verify-Host|Check-Valid-Until/
  )
  assert.equal(readFileSync(sources, 'utf8'), source)
  assert.equal(readFileSync(keyring, 'utf8'), 'unchanged signing key fixture')
  assert.equal(f.run().status, 0)
  assert.equal(readFileSync(f.mirrors, 'utf8'), `${archive}\tpriority:1\n${security}\tpriority:2\n`)
})

for (const [name, source] of [
  ['unknown mirror', original + 'https://example.invalid/ubuntu/ priority:4\n'],
  ['missing HTTPS archive', `${security} priority:1\n`],
  ['insecure alternative', original.replace(archive, 'http://archive.ubuntu.com/ubuntu/')],
  ['duplicate archive', original + `${archive} priority:4\n`],
  ['unknown mirror metadata', original.replace('priority:2', 'priority:2 arch:amd64')]
]) {
  test(`an ${name} fails before changing either configuration file`, (t) => {
    const f = fixture(t, source)
    assert.notEqual(f.run().status, 0)
    assert.equal(readFileSync(f.mirrors, 'utf8'), source)
    assert.equal(readFileSync(f.config, 'utf8'), '// original config\n')
  })
}

test('a symlink cannot redirect the privileged config write', (t) => {
  const f = fixture(t)
  const outside = join(f.directory, 'unrelated-config')
  writeFileSync(outside, 'unchanged')
  rmSync(f.config)
  symlinkSync(outside, f.config)
  assert.notEqual(f.run().status, 0)
  assert.equal(readFileSync(outside, 'utf8'), 'unchanged')
  assert.equal(readFileSync(f.mirrors, 'utf8'), original)
})

test('all Oracle browser CI entrypoints use provisioned dependencies and bounded browser downloads', () => {
  for (const file of [
    'public-ci.yml',
    'geo3d-focused-validation.yml',
    'geo3d-branch-validation.yml'
  ]) {
    const source = readFileSync(new URL(`../workflows/${file}`, import.meta.url), 'utf8')
    assert.match(source, /runs-on: \[self-hosted, Linux, ARM64, oracle, file-viewer-public\]/)
    const steps = source.split(/\n\s+- name: /)
    const downloads = steps.filter((step) => step.includes('pnpm exec playwright install'))
    assert.ok(downloads.length > 0, `${file} must retain its real browser installation`)
    for (const step of downloads) {
      assert.match(step, /timeout-minutes: 10/)
      assert.match(step, /pnpm exec playwright install chromium (?:firefox )?webkit/)
      assert.doesNotMatch(step, /--with-deps|sudo|apt-get/)
    }
  }
  const workflow = readFileSync(new URL('../workflows/public-ci.yml', import.meta.url), 'utf8')
  const fonts = workflow
    .split('- name: Verify the provisioned Noto CJK font cohort')[1]
    ?.split('- name:')[0]
  assert.ok(fonts)
  assert.match(fonts, /timeout-minutes: 10/)
  assert.match(fonts, /dpkg-query.*fonts-noto-cjk/)
  assert.match(fonts, /grep -Fxq 'install ok installed'/)
  assert.doesNotMatch(fonts, /sudo|apt-get/)
  assert.match(fonts, /grep -q 'Noto Serif CJK SC'/)
  assert.match(fonts, /font-cohort\.log/)
  const browsers = workflow
    .split('- name: Verify PDF hand tool and native DOC font table in Chromium and WebKit')[1]
    ?.split('- name:')[0]
  assert.match(browsers, /renderer-pdf verify:hand-tool/)
  assert.match(browsers, /@file-viewer\/doc verify:font-table-browser/)
  assert.ok(
    workflow.indexOf('- name: Verify the provisioned Noto CJK font cohort') <
      workflow.indexOf('- name: Verify PDF hand tool')
  )
})
