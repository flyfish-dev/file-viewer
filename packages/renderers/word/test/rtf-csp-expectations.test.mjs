import assert from 'node:assert/strict'
import test from 'node:test'
import { assertRtfCspExpectations } from '../scripts/rtf-csp-expectations.mjs'

const event = (phase, sample) => ({
  phase,
  directive: 'script-src-attr',
  blockedURI: 'inline',
  disposition: 'enforce',
  sample
})
const errors = Array(3).fill(
  "console: Executing inline event handler violates the Content Security Policy directive 'script-src'. The action has been blocked."
)
const rejectedInputs = [
  event('parser-probe', 'window.__rtfSecuritySentinel=60'),
  event('untrusted-input', 'window.__rtfSecuritySentinel=20'),
  event('untrusted-input', 'window.__rtfSecuritySentinel=30')
]
test('inert parsers with and without handler-policy enforcement retain explicit expectations', () => {
  assert.deepEqual(assertRtfCspExpectations([], []), {
    parserRejections: 0,
    untrustedInputRejections: 0,
    verifiedErrors: 0
  })
  assert.deepEqual(assertRtfCspExpectations(rejectedInputs, errors), {
    parserRejections: 1,
    untrustedInputRejections: 2,
    verifiedErrors: 3
  })
})
test('unexpected renderer/output CSP violations and altered rejected handlers fail', () => {
  for (const phase of ['renderer', 'sanitized-output', 'done']) {
    assert.throws(() =>
      assertRtfCspExpectations(
        [...rejectedInputs, event(phase, 'unexpected')],
        [...errors, errors[0]]
      )
    )
  }
  const changed = structuredClone(rejectedInputs)
  changed[1].sample = 'unexpected'
  assert.throws(() => assertRtfCspExpectations(changed, errors))
  changed[1] = { ...rejectedInputs[1], disposition: 'report' }
  assert.throws(() => assertRtfCspExpectations(changed, errors))
})
test('missing, extra, unrelated console errors and every page error fail', () => {
  for (const failures of [
    errors.slice(1),
    [...errors, errors[0]],
    [...errors.slice(1), 'console: unexpected'],
    [...errors.slice(1), 'page: unsafe script']
  ]) {
    assert.throws(() => assertRtfCspExpectations(rejectedInputs, failures))
  }
  assert.throws(() => assertRtfCspExpectations([], errors))
  assert.throws(() => assertRtfCspExpectations(rejectedInputs.slice(1), errors.slice(1)))
})
