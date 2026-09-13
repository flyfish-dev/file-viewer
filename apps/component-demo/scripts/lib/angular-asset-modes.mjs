export async function verifyAngularDevelopmentAssetModes({ start, stop, verify }) {
  async function run(mode) {
    try {
      const port = await start()
      await verify(mode, port)
    } finally {
      await stop()
    }
  }

  await run('development')
  await run('development-restart')
}
