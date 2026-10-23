const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const { gunzipSync } = require('node:zlib')
const { syncBuiltinESMExports } = require('node:module')
const endpoint = 'https://registry.npmjs.org/-/npm/v1/security/advisories/bulk'

function auditPayloadSha256(value) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value))
  const entries = Object.entries(value)
  assert.ok(entries.length)
  for (const [name, versions] of entries) {
    assert.ok(/^(@[a-z0-9._-]+\/)?[a-z0-9._-]+$/.test(name))
    assert.ok(
      Array.isArray(versions) &&
        versions.length &&
        versions.every(
          (version) =>
            typeof version === 'string' && /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)
        )
    )
  }
  const canonical = JSON.stringify(
    Object.fromEntries(
      entries
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([name, versions]) => [name, [...new Set(versions)].sort()])
    )
  )
  return createHash('sha256').update(canonical).digest('hex')
}

function resolvedAuditScope(body, referenceSha256, standingApproval) {
  assert.match(referenceSha256, /^[a-f0-9]{64}$/)
  const actualSha256 = auditPayloadSha256(body)
  assert.ok(
    actualSha256 === referenceSha256 || standingApproval === 'true',
    'Resolved audit differences are not authorized'
  )
  return {
    referenceSha256,
    actualSha256,
    matchesReference: actualSha256 === referenceSha256,
    names: Object.keys(body).length,
    pairs: Object.values(body).reduce((sum, versions) => sum + new Set(versions).size, 0)
  }
}

function verifyAuditRequest(target, method, headers, body, expectedSha256) {
  assert.equal(target.href, endpoint, 'Audit fallback or receiver is not approved')
  assert.equal(method, 'POST')
  assert.equal(target.username + target.password, '', 'Audit URL credentials are forbidden')
  const names =
    typeof headers === 'string'
      ? headers
          .split('\r\n')
          .filter(Boolean)
          .map((line) => line.split(':', 1)[0])
      : Array.isArray(headers)
        ? headers.filter((_, index) => index % 2 === 0)
        : Object.keys(headers || {})
  assert.ok(
    names.every((name) => !/^(?:authorization|proxy-authorization|cookie|set-cookie)$/i.test(name)),
    'Audit credential headers are forbidden'
  )
  assert.ok(typeof body === 'string' || Buffer.isBuffer(body) || body instanceof Uint8Array)
  let bytes = Buffer.from(body)
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) bytes = gunzipSync(bytes)
  assert.ok(bytes.length <= 512 * 1024)
  assert.equal(
    auditPayloadSha256(JSON.parse(bytes.toString('utf8'))),
    expectedSha256,
    'Actual audit body differs from the approved case digest; no dependency payload was sent'
  )
}

function installAuditScopeGuard(expectedSha256) {
  assert.ok(
    /^[a-f0-9]{64}$/.test(expectedSha256 || ''),
    'An approved case audit digest is required'
  )
  const channel = require('node:diagnostics_channel').channel('undici:request:create')
  channel.subscribe(() => {})
  const publish = channel.publish
  channel.publish = function (data) {
    const request = data.request,
      target = new URL(request.path, request.origin)
    if (target.pathname.includes('/-/npm/v1/security/') || request.method === 'POST') {
      assert.equal(target.href, endpoint, 'Unexpected audit receiver or redirect is forbidden')
      const body = request.body
      if (body && typeof body[Symbol.asyncIterator] === 'function' && !Buffer.isBuffer(body)) {
        request.body = (async function* () {
          const chunks = []
          let size = 0
          for await (const chunk of body) {
            size += chunk.length
            assert.ok(size <= 512 * 1024)
            chunks.push(Buffer.from(chunk))
          }
          const bytes = Buffer.concat(chunks)
          verifyAuditRequest(target, request.method, request.headers, bytes, expectedSha256)
          yield bytes
        })()
      } else verifyAuditRequest(target, request.method, request.headers, body, expectedSha256)
    }
    return publish.call(this, data)
  }
  const responseChannel = require('node:diagnostics_channel').channel('undici:request:headers')
  responseChannel.subscribe(() => {})
  const publishResponse = responseChannel.publish
  responseChannel.publish = function (data) {
    const target = new URL(data.request.path, data.request.origin)
    if (target.href === endpoint)
      assert.ok(
        data.response.statusCode < 300 || data.response.statusCode >= 400,
        'Audit redirects are forbidden'
      )
    return publishResponse.call(this, data)
  }
  for (const name of ['node:http', 'node:https']) {
    const api = require(name),
      original = api.request
    api.request = function (...args) {
      const input = args[0]
      const options =
        typeof input === 'string' || input instanceof URL
          ? typeof args[1] === 'object'
            ? args[1]
            : {}
          : input
      const target =
        typeof input === 'string' || input instanceof URL
          ? new URL(input)
          : new URL(
              `${input.protocol || (name === 'node:https' ? 'https:' : 'http:')}//${input.hostname || input.host}${input.port ? ':' + input.port : ''}${input.path || '/'}`
            )
      if (!target.pathname.includes('/-/npm/v1/security/') && options.method !== 'POST')
        return original.apply(this, args)
      assert.equal(target.href, endpoint, 'Audit fallback is forbidden')
      assert.ok(!options.auth)
      assert.ok(
        Object.keys(options.headers || {}).every(
          (key) => !/^(?:authorization|proxy-authorization|cookie)$/i.test(key)
        )
      )
      const request = original.apply(this, args),
        chunks = []
      const emit = request.emit.bind(request)
      request.emit = function (event, ...values) {
        if (event === 'response' && values[0].statusCode >= 300 && values[0].statusCode < 400) {
          values[0].destroy()
          request.destroy(new Error('Audit redirects are forbidden'))
          return false
        }
        return emit(event, ...values)
      }
      const write = request.write.bind(request),
        end = request.end.bind(request)
      request.write = function (chunk, encoding, callback) {
        chunks.push(Buffer.from(chunk, typeof encoding === 'string' ? encoding : undefined))
        const done = typeof encoding === 'function' ? encoding : callback
        if (done) queueMicrotask(done)
        return true
      }
      request.end = function (chunk, encoding, callback) {
        if (chunk && typeof chunk !== 'function')
          chunks.push(Buffer.from(chunk, typeof encoding === 'string' ? encoding : undefined))
        try {
          verifyAuditRequest(
            target,
            options.method || 'GET',
            request.getHeaders(),
            Buffer.concat(chunks),
            expectedSha256
          )
        } catch (error) {
          request.destroy(error)
          return request
        }
        for (const bytes of chunks) write(bytes)
        return end(
          typeof chunk === 'function' ? chunk : typeof encoding === 'function' ? encoding : callback
        )
      }
      return request
    }
  }
  syncBuiltinESMExports()
}

module.exports = {
  auditPayloadSha256,
  resolvedAuditScope,
  verifyAuditRequest,
  installAuditScopeGuard
}
