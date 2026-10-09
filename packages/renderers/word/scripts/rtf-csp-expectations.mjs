import assert from 'node:assert/strict'

const violation = (sample) => ({
  directive: 'script-src-attr',
  blockedURI: 'inline',
  disposition: 'enforce',
  sample
})

/** Account for every error: only the deliberately parsed handlers may be rejected. */
export function assertRtfCspExpectations(violations, failures) {
  const probe = violations.filter((event) => event.phase === 'parser-probe')
  assert.ok(probe.length <= 1, 'The single-handler inert parser probe emitted extra CSP violations')
  const stripPhase = (events) => events.map(({ phase, ...event }) => event)
  assert.deepEqual(
    stripPhase(probe),
    probe.length ? [violation('window.__rtfSecuritySentinel=60')] : []
  )
  const direct = violations.filter((event) => event.phase === 'untrusted-input')
  assert.deepEqual(
    stripPhase(direct),
    probe.length
      ? [violation('window.__rtfSecuritySentinel=20'), violation('window.__rtfSecuritySentinel=30')]
      : []
  )
  assert.deepEqual(
    violations.filter((event) => !['parser-probe', 'untrusted-input'].includes(event.phase)),
    [],
    'Rendering or mounting sanitized output must not cause a CSP violation'
  )
  assert.equal(
    failures.length,
    probe.length + direct.length,
    'Every console/page error must correspond to one verified negative-input CSP rejection'
  )
  for (const error of failures) {
    assert.match(error, /^console: /, 'Page errors are never expected')
    assert.match(error, /(?:Content Security Policy|Content-Security-Policy)/i)
    assert.match(error, /script-src/i)
    assert.match(error, /(?:inline event handler|event handler|script-src-attr)/i)
    assert.match(error, /(?:blocked|violates|refused)/i)
  }
  return {
    parserRejections: probe.length,
    untrustedInputRejections: direct.length,
    verifiedErrors: failures.length
  }
}
