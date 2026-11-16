import { execFileSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
const root = path.resolve(import.meta.dirname, '../../../../..')
const output = path.resolve(
  process.env.SIGNATURE_PANEL_SUITE_OUTPUT || path.join(root, 'output/signature-panel')
)
await mkdir(output, { recursive: true })
const run = (script, env = {}) =>
  execFileSync(process.execPath, [path.join(import.meta.dirname, script)], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...env }
  })
run('issue-458-panel.browser.mjs', { SIGNATURE_PANEL_OUTPUT: path.join(output, 'originals') })
run('generate-panel-fixtures.mjs', { SIGNATURE_PANEL_FIXTURES: path.join(output, 'fixtures') })
run('issue-458-panel.browser.mjs', {
  SIGNATURE_PANEL_OUTPUT: path.join(output, 'deep-reading'),
  SIGNATURE_PANEL_DEEP_FIXTURES: path.join(output, 'fixtures')
})
for (const width of [1400, 360])
  for (const largeText of [false, true]) {
    run('issue-458-panel.browser.mjs', {
      SIGNATURE_PANEL_OUTPUT: path.join(
        output,
        `narrow-${width}-${largeText ? 'large' : 'normal'}`
      ),
      SIGNATURE_PANEL_HOST_WIDTH: '320',
      SIGNATURE_PANEL_VIEWPORT_WIDTH: String(width),
      SIGNATURE_PANEL_LARGE_TEXT: largeText ? '1' : '0',
      SIGNATURE_PANEL_POSITION: 'left',
      SIGNATURE_PANEL_FORMATS: 'pdf',
      SIGNATURE_PANEL_DOM: 'light'
    })
  }
run('issue-458-formats.browser.mjs', { SIGNATURE_FORMATS_OUTPUT: path.join(output, 'formats') })

run('issue-458-hosts.browser.mjs', {
  SIGNATURE_HOSTS_OUTPUT: path.join(output, 'hosts'),
  SIGNATURE_PANEL_DEEP_FIXTURES: path.join(output, 'fixtures')
})

// Synthetic long certificate subject plus large text in an actual narrow host.
for (const width of [1400, 360])
  run('issue-458-panel.browser.mjs', {
    SIGNATURE_PANEL_OUTPUT: path.join(output, `narrow-long-${width}`),
    SIGNATURE_PANEL_DEEP_FIXTURES: path.join(output, 'fixtures'),
    SIGNATURE_PANEL_HOST_WIDTH: '320',
    SIGNATURE_PANEL_VIEWPORT_WIDTH: String(width),
    SIGNATURE_PANEL_LARGE_TEXT: '1',
    SIGNATURE_PANEL_POSITION: 'left',
    SIGNATURE_PANEL_FORMATS: 'pdf',
    SIGNATURE_PANEL_DOM: 'light'
  })

run('issue-458-focus.browser.mjs', { SIGNATURE_FOCUS_OUTPUT: path.join(output, 'focus') })
