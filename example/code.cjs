const fs = require('node:fs')
const path = require('node:path')

const rootDir = path.resolve(__dirname, '..', '..')
const distDir = path.join(rootDir, 'dist')

function readManifest() {
  const manifestPath = path.join(distDir, '.vite', 'manifest.json')
  if (!fs.existsSync(manifestPath)) {
    return {}
  }
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
}

function pickAssets(manifest) {
  return Object.entries(manifest)
    .filter(([, entry]) => entry.isEntry || entry.file.endsWith('.css'))
    .map(([source, entry]) => ({
      source,
      file: entry.file,
      css: entry.css || []
    }))
}

module.exports = {
  rootDir,
  distDir,
  readManifest,
  pickAssets,
  createReport() {
    const assets = pickAssets(readManifest())
    return {
      generatedAt: new Date().toISOString(),
      assetCount: assets.length,
      assets
    }
  }
}
