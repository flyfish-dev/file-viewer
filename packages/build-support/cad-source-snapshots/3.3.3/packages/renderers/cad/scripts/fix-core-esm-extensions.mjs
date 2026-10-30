import { existsSync } from 'node:fs'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(scriptDir, '..')
const coreDistDir = join(packageRoot, 'dist')

const relativeSpecifierPattern = /(\bfrom\s*['"]|\bimport\s*\(\s*['"])(\.{1,2}\/[^'"]+)(['"])/g
const runtimeExtensions = new Set(['.js', '.mjs', '.cjs', '.json', '.node'])

// A dotted source basename such as `messages.ja` is not a JavaScript runtime
// extension. TypeScript emits it as `messages.ja.js`, so only extensions that
// Node ESM can load directly should prevent the `.js` resolution probe.
const hasRuntimeExtension = specifier => runtimeExtensions.has(extname(specifier).toLowerCase())

const resolveJsSpecifier = (fileDir, specifier) => {
  if (hasRuntimeExtension(specifier)) {
    return specifier
  }

  const candidate = resolve(fileDir, `${specifier}.js`)
  if (existsSync(candidate)) {
    return `${specifier}.js`
  }

  const indexCandidate = resolve(fileDir, specifier, 'index.js')
  return existsSync(indexCandidate) ? `${specifier}/index.js` : specifier
}

async function fixFile(filePath) {
  const source = await readFile(filePath, 'utf8')
  const fileDir = dirname(filePath)
  const fixed = source.replace(relativeSpecifierPattern, (_match, prefix, specifier, suffix) => {
    return `${prefix}${resolveJsSpecifier(fileDir, specifier)}${suffix}`
  })

  if (fixed !== source) {
    await writeFile(filePath, fixed, 'utf8')
    return true
  }
  return false
}

async function collectJsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectJsFiles(path))
      continue
    }
    if (entry.isFile() && extname(entry.name) === '.js') {
      files.push(path)
    }
  }

  return files
}

const files = await collectJsFiles(coreDistDir)
let changedCount = 0

for (const file of files) {
  const changed = await fixFile(file)
  if (changed) {
    changedCount += 1
  }
}

console.log(`[core-esm] Normalized relative import extensions in ${changedCount} file${changedCount === 1 ? '' : 's'}.`)
