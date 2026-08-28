import JSZip from 'jszip'
import renderSignature from '../../dist/signature.js'

const target = document.querySelector('#target')
const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: false })
const hostileMarkup =
  '<img src=x onerror="window.__issue206Sentinel=1"><script>window.__issue206Sentinel=2</script>'

const fixtureUrls = {
  cms: new URL(
    '../fixtures/github-206-contributed/cms/invoice-encapsulated.pdf.p7m',
    import.meta.url
  ),
  detachedCms: new URL(
    '../fixtures/github-206-contributed/cms/invoice-detached.pdf.p7s',
    import.meta.url
  ),
  malformedCms: new URL(
    '../fixtures/github-206-contributed/negative/truncated-signed-data.p7m',
    import.meta.url
  ),
  invoice: new URL('../fixtures/github-206-contributed/originals/invoice.pdf', import.meta.url),
  timestamp: new URL(
    '../fixtures/github-206-contributed/timestamps/invoice-sha256.tst',
    import.meta.url
  ),
  timestampedData: new URL(
    '../fixtures/github-206-contributed/timestamps/invoice-embedded.tsd',
    import.meta.url
  ),
  asics: new URL('../fixtures/structured/issue-206-single.asics', import.meta.url),
  asice: new URL('../fixtures/structured/issue-206-multi.asice', import.meta.url),
  evidenceRecord: new URL('../fixtures/structured/issue-206-invoice.ers', import.meta.url),
  openPgpSignature: new URL('../fixtures/openpgp-synthetic/hello.sig', import.meta.url),
  openPgpKey: new URL('../fixtures/openpgp-synthetic/public-key.asc', import.meta.url),
  openPgpMultiCleartext: new URL(
    '../fixtures/openpgp-synthetic/hello.multi-cleartext.asc',
    import.meta.url
  ),
  openPgpMultiSigned: new URL(
    '../fixtures/openpgp-synthetic/hello.multi-signed.pgp',
    import.meta.url
  ),
  openPgpMultiKeys: new URL('../fixtures/openpgp-synthetic/multi-public-keys.asc', import.meta.url),
  openPgpEncrypted: new URL('../fixtures/openpgp-synthetic/hello.encrypted.pgp', import.meta.url),
  openPgpOriginal: new URL(
    '../fixtures/github-206-contributed/originals/hello.txt',
    import.meta.url
  )
}

const fixtureCache = new Map()
const readFixture = async (name) => {
  if (!fixtureCache.has(name)) {
    fixtureCache.set(
      name,
      fetch(fixtureUrls[name]).then((response) => {
        if (!response.ok) throw new Error(`Fixture ${name} returned HTTP ${response.status}`)
        return response.arrayBuffer()
      })
    )
  }
  return (await fixtureCache.get(name)).slice(0)
}

const nativeWorker = window.Worker
const liveWorkers = new Set()
let createdWorkers = 0
const trackedWorker = new Proxy(nativeWorker, {
  construct(Target, argumentsList) {
    const worker = Reflect.construct(Target, argumentsList, Target)
    const terminate = worker.terminate.bind(worker)
    let terminated = false
    worker.terminate = () => {
      if (!terminated) {
        terminated = true
        liveWorkers.delete(worker)
      }
      terminate()
    }
    createdWorkers += 1
    liveWorkers.add(worker)
    return worker
  }
})
Object.defineProperty(window, 'Worker', { configurable: true, value: trackedWorker })

const trustedTypesPolicy = window.trustedTypes?.createPolicy('file-viewer-test', {
  createScriptURL: (value) => value
})
const workerUrls = {
  container: new URL('../../dist/container.worker.js', import.meta.url),
  openpgp: new URL('../../dist/signature.worker.js', import.meta.url)
}
const createSignatureWorker = (kind) => {
  const url = workerUrls[kind]
  if (!url) throw new Error(`Unknown signature Worker kind: ${kind}`)
  const scriptUrl = trustedTypesPolicy ? trustedTypesPolicy.createScriptURL(url.href) : url
  return new Worker(scriptUrl, { type: 'module', name: `file-viewer-signature-${kind}` })
}

let rendered
let nestedCalls = []
window.__issue206Sentinel = 0

const b64url = (value) => {
  let binary = ''
  for (const byte of value) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '')
}

const createJws = async () => {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: Uint8Array.of(1, 0, 1),
      hash: 'SHA-256'
    },
    true,
    ['sign', 'verify']
  )
  const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
  publicJwk.kid = 'issue-206-browser'
  const protectedSegment = b64url(
    encoder.encode(
      JSON.stringify({
        alg: 'RS256',
        kid: publicJwk.kid,
        typ: 'JWS',
        jku: 'https://example.invalid/must-not-be-fetched'
      })
    )
  )
  const payload = encoder.encode(JSON.stringify({ message: 'issue-206-browser', hostileMarkup }))
  const payloadSegment = b64url(payload)
  const signingInput = encoder.encode(`${protectedSegment}.${payloadSegment}`)
  const signature = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keyPair.privateKey, signingInput)
  )
  return {
    bytes: encoder.encode(`${protectedSegment}.${payloadSegment}.${b64url(signature)}`).buffer,
    options: { jwsVerificationKeys: [{ key: publicJwk, kid: publicJwk.kid }] }
  }
}

const replaceAscii = (buffer, from, to) => {
  if (from.length !== to.length) throw new Error('Replacement strings must have equal length.')
  const bytes = new Uint8Array(buffer.slice(0))
  const needle = encoder.encode(from)
  const replacement = encoder.encode(to)
  for (let offset = 0; offset <= bytes.length - needle.length; offset += 1) {
    let match = true
    for (let index = 0; index < needle.length; index += 1) {
      if (bytes[offset + index] !== needle[index]) {
        match = false
        break
      }
    }
    if (match) bytes.set(replacement, offset)
  }
  return bytes.buffer
}

const createCompressionBomb = async () => {
  const zip = new JSZip()
  const date = new Date('2026-08-24T00:00:00.000Z')
  zip.file('mimetype', 'application/vnd.etsi.asic-s+zip', {
    compression: 'STORE',
    createFolders: false,
    date
  })
  zip.file('zeros.bin', new Uint8Array(1024 * 1024), {
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
    createFolders: false,
    date
  })
  return (await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', platform: 'UNIX' }))
    .buffer
}

const getScenario = async (name) => {
  switch (name) {
    case 'cms':
      return {
        buffer: await readFixture('cms'),
        filename: 'invoice.pdf.p7m',
        type: 'p7m',
        waitNested: true
      }
    case 'detached-cms':
      return {
        buffer: await readFixture('detachedCms'),
        filename: 'invoice.pdf.p7s',
        type: 'p7s',
        options: { originalContent: await readFixture('invoice'), originalFilename: 'invoice.pdf' },
        waitNested: true
      }
    case 'timestamp':
      return {
        buffer: await readFixture('timestamp'),
        filename: 'invoice.tst',
        type: 'tst',
        options: { originalContent: await readFixture('invoice'), originalFilename: 'invoice.pdf' },
        waitNested: true
      }
    case 'timestamped-data':
      return {
        buffer: await readFixture('timestampedData'),
        filename: 'invoice.tsd',
        type: 'tsd',
        waitNested: true
      }
    case 'asics':
      return {
        buffer: await readFixture('asics'),
        filename: 'issue-206.asics',
        type: 'asics',
        waitNested: true
      }
    case 'asice':
      return {
        buffer: await readFixture('asice'),
        filename: 'issue-206.asice',
        type: 'asice',
        waitNested: true
      }
    case 'evidence-record':
      return {
        buffer: await readFixture('evidenceRecord'),
        filename: 'invoice.ers',
        type: 'ers',
        options: { originalContent: await readFixture('invoice'), originalFilename: 'invoice.pdf' }
      }
    case 'jws': {
      const jws = await createJws()
      return {
        buffer: jws.bytes,
        filename: `${hostileMarkup}.jws`,
        type: 'jws',
        options: jws.options,
        waitNested: true
      }
    }
    case 'openpgp':
      return {
        buffer: await readFixture('openPgpSignature'),
        filename: 'hello.sig',
        type: 'sig',
        options: {
          originalContent: await readFixture('openPgpOriginal'),
          originalFilename: 'hello.txt',
          openPgpPublicKeys: [await readFixture('openPgpKey')]
        }
      }
    case 'openpgp-cleartext':
      return {
        buffer: await readFixture('openPgpMultiCleartext'),
        filename: 'hello.multi-cleartext.asc',
        type: 'asc',
        options: { openPgpPublicKeys: [await readFixture('openPgpMultiKeys')] },
        waitNested: true
      }
    case 'openpgp-embedded':
      return {
        buffer: await readFixture('openPgpMultiSigned'),
        filename: 'hello.multi-signed.pgp',
        type: 'pgp',
        options: { openPgpPublicKeys: [await readFixture('openPgpMultiKeys')] },
        waitNested: true
      }
    case 'openpgp-encrypted':
      return {
        buffer: await readFixture('openPgpEncrypted'),
        filename: 'hello.encrypted.pgp',
        type: 'pgp'
      }
    case 'malformed-cms':
      return { buffer: await readFixture('malformedCms'), filename: 'truncated.p7m', type: 'p7m' }
    case 'unsafe-asics':
      return {
        buffer: replaceAscii(await readFixture('asics'), 'invoice.pdf', '../evil.pdf'),
        filename: 'unsafe.asics',
        type: 'asics'
      }
    case 'compression-bomb':
      return {
        buffer: await createCompressionBomb(),
        filename: 'bomb.asics',
        type: 'asics',
        options: { containerLimits: { maxCompressionRatio: 10 } }
      }
    case 'oversized':
      return {
        buffer: await readFixture('cms'),
        filename: 'oversized.p7m',
        type: 'p7m',
        options: { maxContainerSize: 32 },
        expectThrow: true
      }
    default:
      throw new Error(`Unknown issue #206 browser scenario: ${name}`)
  }
}

const dispose = async () => {
  await rendered?.unmount?.()
  rendered = undefined
  target.replaceChildren()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

const waitFor = async (predicate, message, timeout = 20_000) => {
  const deadline = performance.now() + timeout
  while (!predicate()) {
    if (performance.now() >= deadline) throw new Error(message)
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}

const snapshot = (error) => ({
  error: error ? String(error instanceof Error ? error.message : error) : '',
  text: target.innerText,
  html: target.innerHTML,
  activeWorkers: liveWorkers.size,
  createdWorkers,
  nestedCalls: nestedCalls.map((call) => ({ ...call })),
  sentinel: window.__issue206Sentinel,
  imageCount: target.querySelectorAll('img').length,
  scriptCount: target.querySelectorAll('script').length,
  eventAttributeCount: Array.from(target.querySelectorAll('*')).reduce(
    (count, element) =>
      count +
      Array.from(element.attributes).filter((attribute) => /^on/iu.test(attribute.name)).length,
    0
  ),
  errorCount: target.querySelectorAll('.signature-error').length,
  signatureItemCount: target.querySelectorAll('.signature-item').length,
  validStatusCount: target.querySelectorAll('.signature-status[data-state="valid"]').length,
  buttons: Array.from(target.querySelectorAll('button')).map((button) => button.textContent || '')
})

const run = async (name) => {
  await dispose()
  nestedCalls = []
  window.__issue206Sentinel = 0
  const scenario = await getScenario(name)
  try {
    rendered = await renderSignature(scenario.buffer, target, scenario.type, {
      filename: scenario.filename,
      options: {
        ui: { density: 'compact' },
        signature: { ...(scenario.options || {}), workerFactory: createSignatureWorker }
      },
      async renderNestedBuffer(buffer, extension, nestedTarget, context) {
        const prefix = decoder.decode(new Uint8Array(buffer).subarray(0, 256))
        const pre = document.createElement('pre')
        pre.className = 'issue-206-nested-preview'
        pre.textContent = `${context.filename || 'nested'}.${extension}\n${prefix}`
        nestedTarget.replaceChildren(pre)
        nestedCalls.push({ filename: context.filename || '', extension, size: buffer.byteLength })
        return {
          $el: pre,
          unmount() {
            pre.remove()
          }
        }
      }
    })
    await waitFor(
      () =>
        !target.querySelector('.signature-loading') &&
        (!scenario.waitNested ||
          nestedCalls.length > 0 ||
          Boolean(target.querySelector('.signature-error'))),
      `Timed out rendering issue #206 scenario ${name}`
    )
    if (scenario.expectThrow) throw new Error(`Scenario ${name} was expected to reject.`)
    return snapshot()
  } catch (error) {
    if (!scenario.expectThrow) throw error
    return snapshot(error)
  }
}

const openContainedDocument = async (filename) => {
  const button = Array.from(target.querySelectorAll('button')).find(
    (candidate) => candidate.textContent === filename
  )
  if (!button) throw new Error(`Contained document button ${filename} was not found.`)
  const previousCalls = nestedCalls.length
  button.click()
  await waitFor(
    () => nestedCalls.length > previousCalls,
    `Timed out opening contained document ${filename}`
  )
  return snapshot()
}

window.__issue206Harness = {
  ready: true,
  run,
  dispose,
  snapshot: () => snapshot(),
  openContainedDocument
}
