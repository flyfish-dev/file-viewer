import assert from 'node:assert/strict'
import { lstat, readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'

export const docxPackage = '@file-viewer/docx'
export const docxManifestPath = 'packages/renderers/word/package.json'
export const docxCompatibilityPath = 'patches/docx-engine-compatibility.json'
export const stableVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/
const docxPatchFile = /^@file-viewer__docx@\d+\.\d+\.\d+\.patch$/

function scalar(value) {
  const text = value.trim()
  if (text.startsWith('"')) {
    const match = /^"(?:[^"\\]|\\.)*"/.exec(text)
    assert.ok(match && /^(?:\s*#.*)?$/.test(text.slice(match[0].length)), 'Unsupported YAML scalar')
    return JSON.parse(match[0])
  }
  if (text.startsWith("'")) {
    const match = /^'(?:[^']|'')*'/.exec(text)
    assert.ok(match && /^(?:\s*#.*)?$/.test(text.slice(match[0].length)), 'Unsupported YAML scalar')
    return match[0].slice(1, -1).replaceAll("''", "'")
  }
  assert.ok(!/[{}[\]&*!|>]/.test(text), 'Unsupported YAML scalar')
  return text.replace(/\s+#.*$/, '').trim()
}

function sectionLines(text, name) {
  const lines = text.split(/(?<=\n)/)
  const starts = lines.flatMap((line, index) => {
    if (/^(?:\s|#|$)/.test(line)) return []
    const match = /^('(?:[^']|'')*'|"(?:[^"\\]|\\.)*"|[^:]+):/.exec(line)
    assert.ok(match && !match[1].startsWith('?'), 'Unsupported top-level YAML mapping')
    const key = scalar(match[1])
    assert.notEqual(key, '<<', 'Merged workspace mappings are unsupported')
    if (key !== name) return []
    assert.match(
      line.slice(match[0].length).trim(),
      /^(?:#.*)?$/,
      `Use a block ${name} workspace section`
    )
    return [index]
  })
  assert.ok(starts.length <= 1, `Duplicate ${name} workspace section`)
  if (!starts.length) return { lines, start: -1, end: -1 }
  const start = starts[0]
  let end = start + 1
  while (end < lines.length && !/^[^\s#]/.test(lines[end])) end++
  return { lines, start, end }
}

// Deliberately accept only the plain block forms we can preserve losslessly.
// Unsupported YAML must fail before writing or deleting anything.
function patchRegistrations(workspace) {
  const { lines, start, end } = sectionLines(workspace, 'patchedDependencies')
  const entries = []
  if (start < 0) return entries
  for (let index = start + 1; index < end; index++) {
    const line = lines[index]
    if (/^\s*(?:#|$)/.test(line)) continue
    const match = /^  ('(?:[^']|'')*'|"(?:[^"\\]|\\.)*"|[^:]+):\s*(.+?)\s*$/.exec(line)
    assert.ok(match, 'Unsupported patch registration; use a plain block mapping')
    const key = scalar(match[1])
    assert.notEqual(key, '<<', 'Merged patch registrations are unsupported')
    entries.push({ key, path: scalar(match[2]), index })
  }
  return entries
}

function isDocxKey(key) {
  return key === docxPackage || key.startsWith(`${docxPackage}@`)
}

export function docxPatchEntries(workspace) {
  const registrations = patchRegistrations(workspace)
  const entries = registrations.filter(({ key }) => isDocxKey(key))
  for (const { key, path } of entries) {
    const version = key.slice(`${docxPackage}@`.length)
    assert.ok(
      key.startsWith(`${docxPackage}@`) && stableVersion.test(version),
      'Unsupported DOCX patch key'
    )
    assert.equal(
      path,
      `patches/@file-viewer__docx@${version}.patch`,
      'Unsafe or unexpected DOCX patch path'
    )
    assert.equal(
      entries.filter((entry) => entry.key === key).length,
      1,
      'Duplicate DOCX patch registration'
    )
    // Never remove a file still used by another package's patch registration.
    assert.equal(
      registrations.filter((entry) => entry.path === path).length,
      1,
      'DOCX patch path is shared with another registration'
    )
  }
  return entries
}

export function assertDocxPatchDeletions(workspace, paths) {
  for (const { key, path } of patchRegistrations(workspace)) {
    assert.ok(
      isDocxKey(key) || !paths.includes(path),
      'A DOCX-named patch file is still used by another package'
    )
  }
}

export function prepareDocxWorkspace(workspace, version) {
  const entries = docxPatchEntries(workspace)
  const removed = new Set(entries.map((entry) => entry.index))
  let text = workspace
    .split(/(?<=\n)/)
    .filter((_, index) => !removed.has(index))
    .join('')
  const { lines, start, end } = sectionLines(text, 'minimumReleaseAgeExclude')
  for (let index = start + 1; start >= 0 && index < end; index++) {
    if (/^\s*(?:#|$)/.test(lines[index])) continue
    const match = /^  -\s+('(?:[^']|'')*'|"(?:[^"\\]|\\.)*"|[^\s#]+)(?:\s*#.*)?\s*$/.exec(
      lines[index]
    )
    assert.ok(match, 'Unsupported DOCX release-age exception')
    const key = scalar(match[1])
    if (!isDocxKey(key)) continue
    assert.ok(
      key.startsWith(`${docxPackage}@`) && stableVersion.test(key.slice(`${docxPackage}@`.length)),
      'Unsupported DOCX release-age version'
    )
    const replacement = match[1].startsWith('"')
      ? JSON.stringify(`${docxPackage}@${version}`)
      : `'${docxPackage}@${version}'`
    lines[index] = lines[index].replace(match[1], replacement)
  }
  text = lines.join('')
  assert.equal(docxPatchEntries(text).length, 0)
  return { text, patchPaths: entries.map((entry) => entry.path) }
}

export function assertPublishedDocxLock(lockfile, version) {
  assert.ok(
    !patchRegistrations(lockfile).some(({ key }) => isDocxKey(key)),
    'Lockfile still registers a DOCX patch'
  )
  const importers = lockfile
    .split(/(?=^  \S)/m)
    .filter((block) =>
      /^  (?:'packages\/renderers\/word'|"packages\/renderers\/word"|packages\/renderers\/word):\r?\n/.test(
        block
      )
    )
  assert.equal(importers.length, 1, 'Missing or duplicate Word lockfile importer')
  const entries = [
    ...importers[0].matchAll(/^      (['"])@file-viewer\/docx\1:\r?\n((?:        .*\r?\n?)+)/gm)
  ]
  assert.equal(entries.length, 1, 'Missing or duplicate locked DOCX dependency')
  const fields = Object.fromEntries(
    entries[0][2]
      .trim()
      .split(/\r?\n/)
      .map((line) => {
        const match = /^\s*(specifier|version):\s*(.+)$/.exec(line)
        assert.ok(match, 'Unsupported locked DOCX dependency')
        return [match[1], scalar(match[2])]
      })
  )
  assert.equal(
    fields.specifier,
    version,
    'DOCX lockfile specifier differs from the exact registry dependency'
  )
  assert.equal(
    fields.version,
    version,
    'DOCX lockfile resolution must be the ordinary unpatched registry version'
  )
}

export async function docxPatchFiles(root) {
  let names
  try {
    const stat = await lstat(join(root, 'patches'))
    assert.ok(!stat.isSymbolicLink(), 'DOCX patch directory must not use symlinks')
    assert.ok(stat.isDirectory(), 'DOCX patch directory must be a directory')
    names = await readdir(join(root, 'patches'))
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
  return names
    .filter((name) => {
      if (!name.startsWith('@file-viewer__docx@')) return false
      assert.match(name, docxPatchFile, 'Unexpected DOCX patch filename; review it manually')
      return true
    })
    .map((name) => `patches/${name}`)
}

export async function assertSafeSourcePath(root, path) {
  assert.ok(
    path &&
      !path.includes('\\') &&
      path.split('/').every((part) => part && part !== '.' && part !== '..'),
    'Unsafe release source path'
  )
  let current = resolve(root)
  const parts = path.split('/')
  for (let index = 0; index < parts.length; index++) {
    current = join(current, parts[index])
    try {
      const stat = await lstat(current)
      assert.ok(!stat.isSymbolicLink(), `Release source path must not use symlinks: ${path}`)
      assert.ok(
        index === parts.length - 1 ? stat.isFile() : stat.isDirectory(),
        `Unexpected release source path type: ${path}`
      )
    } catch (error) {
      if (error.code === 'ENOENT' && index === parts.length - 1) return
      throw error
    }
  }
}
