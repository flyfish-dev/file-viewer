import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, normalize, relative, resolve } from 'node:path'

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.dcm', 'application/dicom'],
  ['.eml', 'message/rfc822'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.otf', 'font/otf'],
  ['.pdf', 'application/pdf'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.ttf', 'font/ttf'],
  ['.wasm', 'application/wasm'],
  ['.woff2', 'font/woff2']
])

export const startLocalStaticServer = async (rootDirectory, { basePath = '/' } = {}) => {
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(basePath)) throw new Error('Invalid local static server base path')
  const root = resolve(rootDirectory)
  const server = createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1')
    let decoded
    try { decoded = decodeURIComponent(url.pathname) } catch {
      response.writeHead(400).end('Bad Request')
      return
    }
    if (!decoded.startsWith(basePath)) {
      response.writeHead(404).end('Not Found')
      return
    }
    decoded = '/' + decoded.slice(basePath.length)
    const normalized = normalize(decoded).replace(/^(?:\.\.(?:\/|\\|$))+/, '')
    const requested = normalized === '/' ? 'index.html' : normalized.replace(/^[/\\]+/, '')
    const filePath = resolve(root, requested)
    if (
      !filePath.startsWith(root) ||
      relative(root, filePath).startsWith('..') ||
      !existsSync(filePath) ||
      !statSync(filePath).isFile()
    ) {
      response.writeHead(404).end('Not Found')
      return
    }
    response.writeHead(200, {
      'Content-Type': mimeTypes.get(extname(filePath).toLowerCase()) || 'application/octet-stream'
    })
    createReadStream(filePath).pipe(response)
  })
  await new Promise((resolveServer, rejectServer) => {
    server.once('error', rejectServer)
    server.listen(0, '127.0.0.1', resolveServer)
  })
  const address = server.address()
  if (!address || typeof address === 'string')
    throw new Error('Unable to resolve static server address.')
  return {
    close: () => new Promise((resolveServer) => server.close(resolveServer)),
    origin: `http://127.0.0.1:${address.port}`
  }
}
