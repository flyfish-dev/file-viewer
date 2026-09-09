import { rename } from 'node:fs/promises'

export async function verifyAngularDevelopmentAssetModes({ start, stop, verify, manifest }) {
  async function run(mode) {
    try {
      const port = await start()
      await verify(mode, port)
    } finally {
      await stop()
    }
  }

  await run('development')
  // Angular watches public assets too. Mutate the fixture only while its
  // server is stopped, so HMR cannot replace the document under test.
  const held = `${manifest}.held`
  await rename(manifest, held)
  try {
    await run('development-explicit-worker')
  } finally {
    await rename(held, manifest)
  }
}
