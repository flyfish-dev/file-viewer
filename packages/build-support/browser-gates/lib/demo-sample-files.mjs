import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

// These roots preserve the original grants and preferred inputs for the
// actual fixtures. They are shipped, but are not Demo preview samples.
const supportingRoots = new Set(['licenses', 'sources'])

export function collectDemoSampleFiles(directory, { includeSupportingMaterials = false } = {}) {
  if (!existsSync(directory) || !statSync(directory).isDirectory()) {
    throw new Error(`Missing demo sample directory ${directory}.`)
  }
  const files = []
  const walk = currentDirectory => {
    for (const entry of readdirSync(currentDirectory, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue
      const entryPath = join(currentDirectory, entry.name)
      if (entry.isDirectory()) {
        if (currentDirectory === directory && supportingRoots.has(entry.name) && !includeSupportingMaterials) continue
        walk(entryPath)
      } else if (entry.isFile()) {
        files.push(relative(directory, entryPath).split(sep).join('/'))
      }
    }
  }
  walk(directory)
  return files.sort((left, right) => left.localeCompare(right, 'en'))
}
