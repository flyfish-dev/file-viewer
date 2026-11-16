import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { delimiter, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
// BEGIN PREPACK COMPLETION OBSERVATION
import { appendFile, mkdir } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import { createHash } from 'node:crypto'
const fixtureObservations = new Map()
// END PREPACK COMPLETION OBSERVATION

const require = createRequire(import.meta.url)

export const importPlaywright = async () => {
  try {
    return await import('playwright')
  } catch (originalError) {
    const roots =
      process.env.PATH?.split(delimiter)
        .filter((entry) => entry.endsWith(`${sep}node_modules${sep}.bin`))
        .map((entry) => resolve(entry, '..'))
        .filter(existsSync) || []
    for (const root of roots) {
      try {
        const entry = require.resolve('playwright', { paths: [root] })
        return await import(pathToFileURL(entry).href)
      } catch {
        // Continue probing npm-exec package roots.
      }
    }
    throw originalError
  }
}
// BEGIN PREPACK COMPLETION OBSERVATION
export const recordBrowserGateCompletion = async event => {
  const directory = process.env.FILE_VIEWER_PREPACK_TRACE_DIR
  if (!directory) return
  if (!isAbsolute(directory)) throw new Error('Prepack browser trace directory must be absolute')
  if (!event || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(event.gateId || '') ||
      !['chromium', 'firefox', 'webkit'].includes(event.engine) ||
      typeof event.phase !== 'string' || !event.phase ||
      !Array.isArray(event.caseIds) || event.caseIds.length === 0 ||
      event.caseIds.some(id => typeof id !== 'string' || !id) ||
      new Set(event.caseIds).size !== event.caseIds.length ||
      !Array.isArray(event.fixtures) || event.fixtures.some(id => typeof id !== 'string' || !id)) {
    throw new Error('Incomplete prepack browser engine completion')
  }
  const fixtureKey = `${resolve(directory)}\0${event.gateId}`
  const record = { ...event, fixtureIds: event.fixtures, fixtures: [...(fixtureObservations.get(fixtureKey)?.values() || [])],
    schemaVersion: 1, kind: 'browser-gate-engine-complete', completedAt: new Date().toISOString(), pid: process.pid }
  const line = JSON.stringify(record) + '\n'
  await mkdir(directory, { recursive: true })
  await appendFile(join(directory, `gate-completions-${process.pid}.jsonl`), line, { encoding: 'utf8', mode: 0o600 })
}

export const recordBrowserGateFixture = async (gateId, path, data) => {
  const directory = process.env.FILE_VIEWER_PREPACK_TRACE_DIR
  if (!directory) return
  if (!isAbsolute(directory)) throw new Error('Prepack browser trace directory must be absolute')
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(gateId || '') || typeof path !== 'string' || !path ||
      isAbsolute(path) || path.includes('\\') || path.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error('Invalid logical prepack fixture path')
  }
  const bytes = data instanceof ArrayBuffer ? Buffer.from(data)
    : ArrayBuffer.isView(data) ? Buffer.from(data.buffer, data.byteOffset, data.byteLength) : undefined
  if (!bytes) throw new Error('Prepack fixture observation needs actual document bytes')
  const fixture = { path, bytes: bytes.byteLength, sha256: createHash('sha256').update(bytes).digest('hex') }
  const fixtureKey = `${resolve(directory)}\0${gateId}`
  const observations = fixtureObservations.get(fixtureKey) || new Map()
  observations.set(`${path}:${fixture.sha256}`, fixture)
  fixtureObservations.set(fixtureKey, observations)
  await mkdir(directory, { recursive: true })
  const record = { schemaVersion: 1, kind: 'browser-gate-fixture', gateId, fixture, observedAt: new Date().toISOString(), pid: process.pid }
  await appendFile(join(directory, `gate-fixtures-${process.pid}.jsonl`), JSON.stringify(record) + '\n', { encoding: 'utf8', mode: 0o600 })
  return fixture
}
// END PREPACK COMPLETION OBSERVATION
