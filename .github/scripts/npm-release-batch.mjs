import { spawn } from 'node:child_process'

export function positiveInteger(value, label, maximum = 16) {
  const number = Number(value)
  if (!Number.isInteger(number) || number < 1 || number > maximum) {
    throw new Error(`${label} must be an integer from 1 to ${maximum}`)
  }
  return number
}

export async function mapLimit(values, concurrency, action) {
  positiveInteger(concurrency, 'concurrency')
  const results = new Array(values.length)
  let next = 0
  let failure
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, async () => {
      while (!failure && next < values.length) {
        const index = next++
        try {
          results[index] = await action(values[index], index)
        } catch (error) {
          failure ||= { error }
        }
      }
    })
  )
  // Drain active children before reporting failure; do not leave publishing in the background.
  if (failure) throw failure.error
  return results
}

export function captureCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env || process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false
    })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8').on('data', (data) => (stdout += data))
    child.stderr.setEncoding('utf8').on('data', (data) => (stderr += data))
    const timer = setTimeout(() => child.kill('SIGKILL'), options.timeout ?? 120_000)
    timer.unref()
    child.once('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.once('close', (status, signal) => {
      clearTimeout(timer)
      resolve({ status, signal, stdout, stderr })
    })
  })
}

export function publicationLayers(records) {
  const names = new Set()
  for (const record of records) {
    if (!record.packageName || names.has(record.packageName)) {
      throw new Error(`Missing or duplicate release package: ${record.packageName}`)
    }
    names.add(record.packageName)
  }
  const dependencies = new Map(
    records.map((record) => [
      record.packageName,
      ['dependencies', 'optionalDependencies', 'peerDependencies'].flatMap((field) =>
        Object.keys(record.packageJson?.[field] || {}).filter((name) => names.has(name))
      )
    ])
  )
  let remaining = [...records]
  const completed = new Set()
  const layers = []
  while (remaining.length) {
    const layer = remaining.filter((record) =>
      dependencies.get(record.packageName).every((name) => completed.has(name))
    )
    if (!layer.length) {
      throw new Error(`Release dependency cycle: ${remaining.map((r) => r.packageName).join(', ')}`)
    }
    layers.push(layer)
    for (const record of layer) completed.add(record.packageName)
    remaining = remaining.filter((record) => !completed.has(record.packageName))
  }
  return layers
}

export async function registryMetadata(record, options = {}) {
  const registry = options.registry || 'https://registry.npmjs.org/'
  const attempts = options.attempts ?? 5
  const command = options.command || captureCommand
  const sleep = options.sleep || ((ms) => new Promise((done) => setTimeout(done, ms)))
  const spec = `${record.packageName}@${record.version}`
  let lastResult
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const result = await command('npm', [
      'view',
      spec,
      'name',
      'version',
      'dist.integrity',
      'dist.tarball',
      'dist-tags',
      '--json',
      '--registry',
      registry,
      '--prefer-online',
      '--fetch-retries=0',
      '--fetch-timeout=60000'
    ])
    lastResult = result
    if (result.status === 0) {
      const metadata = JSON.parse(result.stdout)
      if (metadata.name !== record.packageName || metadata.version !== record.version) {
        throw new Error(`Unexpected registry identity for ${spec}`)
      }
      const integrity = metadata.dist?.integrity || metadata['dist.integrity']
      const tarball = metadata.dist?.tarball || metadata['dist.tarball']
      if (!integrity || !tarball)
        throw new Error(`Missing registry integrity or tarball for ${spec}`)
      return { ...metadata, integrity, tarball }
    }
    const output = `${result.stdout}\n${result.stderr}`
    if (
      result.status === 1 &&
      /\bE404\b/.test(output) &&
      /No match found for version|is not in this registry|was not found|could not be found/i.test(
        output
      )
    ) {
      return null
    }
    if (/\bE40[13]\b|\bENEEDAUTH\b/.test(output)) {
      throw new Error(`Registry authentication or permission failure for ${spec}: ${output}`)
    }
    if (attempt < attempts) await sleep(Math.min(5_000, attempt * 1_000))
  }
  throw new Error(
    `Registry lookup failed for ${spec}; refusing to treat it as unpublished: ` +
      `${lastResult?.stderr || lastResult?.stdout || lastResult?.signal || 'no response'}`
  )
}

export function verifyRegistryIntegrity(record, metadata) {
  if (!metadata || metadata.name !== record.packageName || metadata.version !== record.version) {
    throw new Error(`Registry identity mismatch for ${record.packageName}@${record.version}`)
  }
  if (record.integrity && metadata.integrity !== record.integrity) {
    throw new Error(`Registry integrity mismatch for ${record.packageName}@${record.version}`)
  }
}

export async function waitForRegistry(record, options = {}) {
  const query = options.query || registryMetadata
  const sleep = options.sleep || ((ms) => new Promise((done) => setTimeout(done, ms)))
  const attempts = options.attempts ?? 90
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const metadata = await query(record)
    if (metadata) {
      verifyRegistryIntegrity(record, metadata)
      return metadata
    }
    if (attempt < attempts) await sleep(options.delayMs ?? 10_000)
  }
  throw new Error(
    `${record.packageName}@${record.version} is still pending registry propagation. ` +
      'Keep the frozen artifacts and rerun this release; do not allocate another version.'
  )
}
