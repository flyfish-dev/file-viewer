import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'

/** Serve the built Demo without depending on a developer's running Vite server. */
export async function startRegressionDemo(root) {
  if (process.env.CLOSED_ISSUE_DEMO_URL) {
    return { origin: process.env.CLOSED_ISSUE_DEMO_URL.replace(/\/$/, ''), close: async () => {} }
  }
  const dist = resolve(root, 'apps/viewer-demo/dist')
  if (!existsSync(resolve(dist, 'index.html'))) throw new Error('Build the Demo before browser regression checks.')
  const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.mjs': 'application/javascript', '.json': 'application/json', '.wasm': 'application/wasm' }
  const server = createServer((request, response) => {
    let pathname
    try { pathname = decodeURIComponent(new URL(request.url, 'http://local').pathname) }
    catch { response.writeHead(400).end(); return }
    const path = resolve(dist, `.${pathname === '/' ? '/index.html' : pathname}`)
    if (!path.startsWith(`${dist}${sep}`) || !existsSync(path) || !statSync(path).isFile()) {
      response.writeHead(404).end()
      return
    }
    response.setHeader('Content-Type', mime[extname(path)] || 'application/octet-stream')
    createReadStream(path).pipe(response)
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())),
  }
}
