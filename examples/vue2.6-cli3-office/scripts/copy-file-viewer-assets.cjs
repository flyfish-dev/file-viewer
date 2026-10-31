const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const publicAssetRoot = path.join(projectRoot, 'public', 'file-viewer')

function packageRoot(packageName, anchorPackages = []) {
  const resolutionPaths = [projectRoot]
  for (let index = 0; index < anchorPackages.length; index += 1) {
    const anchorPackage = anchorPackages[index]
    try {
      resolutionPaths.push(packageRoot(anchorPackage, anchorPackages.slice(index + 1)))
    } catch (_error) {
      // npm commonly hoists these dependencies; pnpm may keep them beside the
      // renderer package. Try all available anchors before reporting missing assets.
    }
  }
  if (packageName === '@file-viewer/ppt') {
    resolutionPaths.push(packageRoot('@file-viewer/renderer-ppt', ['@file-viewer/renderer-presentation']))
  }

  try {
    return path.dirname(require.resolve(`${packageName}/package.json`, {
      paths: resolutionPaths
    }))
  } catch (error) {
    // Packages may hide package.json and place their public entry below dist/.
    // Find the actual owner instead of treating the entry directory as its root.
    try {
      let directory = path.dirname(require.resolve(packageName, { paths: resolutionPaths }))
      while (true) {
        const manifest = path.join(directory, 'package.json')
        if (fs.existsSync(manifest) && JSON.parse(fs.readFileSync(manifest, 'utf8')).name === packageName) {
          return directory
        }
        const parent = path.dirname(directory)
        if (parent === directory) break
        directory = parent
      }
      throw error
    } catch {
      throw error
    }
  }
}

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function removeDir(dir) {
  if (!fs.existsSync(dir)) {
    return
  }
  for (const entry of fs.readdirSync(dir)) {
    const entryPath = path.join(dir, entry)
    const stat = fs.statSync(entryPath)
    if (stat.isDirectory()) {
      removeDir(entryPath)
    } else {
      fs.unlinkSync(entryPath)
    }
  }
  fs.rmdirSync(dir)
}

function copyFile(packageName, fromRelativePath, toRelativePath, anchorPackages = []) {
  const from = path.join(packageRoot(packageName, anchorPackages), fromRelativePath)
  const to = path.join(publicAssetRoot, toRelativePath)

  if (!fs.existsSync(from)) {
    throw new Error(`Missing File Viewer asset: ${packageName}/${fromRelativePath}`)
  }

  ensureParent(to)
  fs.copyFileSync(from, to)
  return toRelativePath
}

function copyDir(packageName, fromRelativePath, toRelativePath, anchorPackages = []) {
  const from = path.join(packageRoot(packageName, anchorPackages), fromRelativePath)
  const to = path.join(publicAssetRoot, toRelativePath)

  if (!fs.existsSync(from)) {
    throw new Error(`Missing File Viewer asset directory: ${packageName}/${fromRelativePath}`)
  }

  removeDir(to)
  fs.mkdirSync(to, { recursive: true })

  for (const entry of fs.readdirSync(from)) {
    const source = path.join(from, entry)
    const target = path.join(to, entry)
    const stat = fs.statSync(source)
    if (stat.isDirectory()) {
      copyDirFromPath(source, target)
    } else {
      fs.copyFileSync(source, target)
    }
  }

  return `${toRelativePath}/`
}

function copyDirFromPath(from, to) {
  fs.mkdirSync(to, { recursive: true })
  for (const entry of fs.readdirSync(from)) {
    const source = path.join(from, entry)
    const target = path.join(to, entry)
    const stat = fs.statSync(source)
    if (stat.isDirectory()) {
      copyDirFromPath(source, target)
    } else {
      fs.copyFileSync(source, target)
    }
  }
}

const pptRuntimeFiles = [
  'package.json',
  'LICENSE',
  'NOTICE.md',
  'README.md'
]

removeDir(path.join(publicAssetRoot, 'vendor', 'ppt'))
removeDir(path.join(publicAssetRoot, 'vendor', 'xlsx'))
removeDir(path.join(publicAssetRoot, 'vendor', 'pdf', 'fonts'))
removeDir(path.join(publicAssetRoot, 'wasm', 'cad'))
removeDir(path.join(publicAssetRoot, 'wasm', 'model'))

const copied = [
  copyFile('pdfjs-dist', 'legacy/build/pdf.worker.mjs', 'vendor/pdf/pdf.worker.mjs'),
  copyDir('pdfjs-dist', 'cmaps', 'vendor/pdf/cmaps'),
  copyDir('pdfjs-dist', 'wasm', 'vendor/pdf/wasm'),
  copyDir('pdfjs-dist', 'standard_fonts', 'vendor/pdf/standard_fonts'),
  copyDir(
    '@fontsource-variable/noto-sans-sc',
    'files',
    'vendor/pdf/fonts/files',
    ['@file-viewer/renderer-pdf']
  ),
  copyFile(
    '@fontsource-variable/noto-sans-sc',
    'wght.css',
    'vendor/pdf/fonts/noto-sans-sc.css',
    ['@file-viewer/renderer-pdf']
  ),
  copyFile(
    '@fontsource-variable/noto-sans-sc',
    'LICENSE',
    'vendor/pdf/fonts/OFL-1.1.txt',
    ['@file-viewer/renderer-pdf']
  ),
  copyFile('@file-viewer/docx', 'dist/docx-preview.worker.js', 'vendor/docx/docx.worker.js'),
  copyFile('@file-viewer/docx', 'dist/jszip.min.js', 'vendor/docx/jszip.min.js'),
  ...pptRuntimeFiles.map(file => copyFile('@file-viewer/ppt', file, `vendor/ppt/${file}`)),
  copyDir('@file-viewer/ppt', 'dist', 'vendor/ppt/dist'),
  copyFile('@file-viewer/pptx', 'dist/worker/pptx.worker.js', 'vendor/pptx/pptx.worker.js'),
  copyFile(
    '@file-viewer/renderer-spreadsheet',
    'dist/worker/sheet.worker.js',
    'vendor/xlsx/sheet.worker.js'
  ),
  copyFile(
    '@flyfish-dev/cad-viewer',
    'dist/wasm/dwg-worker.js',
    'wasm/cad/dwg-worker.js',
    ['@file-viewer/renderer-cad']
  ),
  copyFile(
    '@flyfish-dev/cad-viewer',
    'dist/wasm/libredwg-web.js',
    'wasm/cad/libredwg-web.js',
    ['@file-viewer/renderer-cad']
  ),
  copyFile(
    '@flyfish-dev/cad-viewer',
    'dist/wasm/libredwg-web.wasm',
    'wasm/cad/libredwg-web.wasm',
    ['@file-viewer/renderer-cad']
  ),
  copyFile(
    '@flyfish-dev/cad-viewer',
    'dist/wasm/dwfv-render.wasm',
    'wasm/cad/dwfv-render.wasm',
    ['@file-viewer/renderer-cad']
  ),
  copyFile(
    '@flyfish-dev/cad-viewer',
    'LICENSE',
    'wasm/cad/LICENSE.cad-viewer.txt',
    ['@file-viewer/renderer-cad']
  ),
  copyFile(
    '@flyfish-dev/cad-viewer',
    'NOTICE',
    'wasm/cad/NOTICE.cad-viewer.txt',
    ['@file-viewer/renderer-cad']
  ),
  copyFile(
    '@file-viewer/geometry-engine',
    'assets/occt-worker.js',
    'wasm/model/occt-worker.js',
    ['@file-viewer/renderer-3d']
  ),
  copyFile(
    'occt-import-js',
    'dist/occt-import-js.js',
    'wasm/model/occt-import-js.js',
    ['@file-viewer/geometry-engine', '@file-viewer/renderer-3d']
  ),
  copyFile(
    'occt-import-js',
    'dist/occt-import-js.wasm',
    'wasm/model/occt-import-js.wasm',
    ['@file-viewer/geometry-engine', '@file-viewer/renderer-3d']
  ),
  copyFile(
    'occt-import-js',
    'dist/license.occt.txt',
    'wasm/model/LICENSE.occt.txt',
    ['@file-viewer/geometry-engine', '@file-viewer/renderer-3d']
  ),
  copyFile(
    'occt-import-js',
    'dist/license.occt-import-js.txt',
    'wasm/model/LICENSE.occt-import-js.txt',
    ['@file-viewer/geometry-engine', '@file-viewer/renderer-3d']
  )
]

console.log(`Copied ${copied.length} File Viewer asset entries to ${path.relative(projectRoot, publicAssetRoot)}`)
