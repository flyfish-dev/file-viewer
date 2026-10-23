import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export const publicInternalDocumentPaths = Object.freeze([
  'ecosystem/private-archive',
  'BRANCHES.md',
  'WRAPPER_ECOSYSTEM.md',
  'docs/regressions',
  'docs/maintenance/3.0.3-preparation.md',
  'docs/maintenance/dependency-review-20260912.md',
  'docs/maintenance/docx-upstream-preparation.md',
  'docs/maintenance/issues-3.0.2.md',
  'docs/maintenance/issues-3.0.3-preparation.md',
  'docs/maintenance/issues-unreleased.md',
  'docs/maintenance/issues-v2.3.0.md',
  'docs/maintenance/issues-v2.3.2.md',
  'docs/maintenance/pr-issue-review-20260912.md',
  'docs/maintenance/release-readiness-20260911.md',
  'ecosystem/public-readme',
  'ecosystem/release-matrix.json',
  'ecosystem/release-matrix.schema.json',
  'ecosystem/release-status.schema.json',
  'test/fixtures/pptx-chart-model-3.2.2.png'
])

export function isPathAtOrBelow(path, parent) {
  return path === parent || path.startsWith(`${parent}/`)
}

export function pnpmCommandsInMarkdown(content) {
  const commands = new Set()
  const regions = [
    ...content.matchAll(/```[^\n]*\n([\s\S]*?)```/g),
    ...content.matchAll(/`([^`\n]+)`/g)
  ]
  for (const match of regions) {
    for (const line of match[1].split('\n')) {
      if (line.trimStart().startsWith('#')) continue
      for (const command of line.matchAll(/\bpnpm[ \t]+([a-zA-Z0-9:_-]+)/g)) {
        commands.add(command[1])
      }
    }
  }
  return [...commands]
}

export function publicWrapperManifest(manifest) {
  const result = structuredClone(manifest)
  delete result.corePackage.aggregateRepository
  delete result.corePackage.note
  return result
}

export function assertPublicDocumentationCommands(content, scripts, label) {
  for (const match of content.matchAll(
    /\bpnpm\s+((?:verify|test|build|release|components|branch|renderers|archive):[\w:.-]+|build-only)\b/g
  )) {
    assert(Object.hasOwn(scripts, match[1]), `${label}: unavailable public command ${match[1]}`)
  }
  assert(!content.includes('FILE_VIEWER_MAINTAINER_COMMANDS'), `${label}: stale maintainer notice`)
}

export function verifyPublicDocumentation(root, scripts) {
  for (const path of publicInternalDocumentPaths) {
    assert(
      !existsSync(join(root, path)),
      `Private maintenance material in public checkout: ${path}`
    )
  }
  const pages = ['CONTRIBUTING.md', 'RELEASE_TEMPLATE.md']
  for (const directory of ['docs/guide', 'docs/zh/guide']) {
    for (const name of readdirSync(join(root, directory))) {
      if (name.endsWith('.md')) pages.push(`${directory}/${name}`)
    }
  }
  for (const page of pages) {
    assertPublicDocumentationCommands(readFileSync(join(root, page), 'utf8'), scripts, page)
  }
  const wrappers = JSON.parse(readFileSync(join(root, 'ecosystem/wrappers.json'), 'utf8'))
  assert(
    !Object.hasOwn(wrappers.corePackage, 'aggregateRepository'),
    'Private aggregate URL in public mapping'
  )
  assert(!Object.hasOwn(wrappers.corePackage, 'note'), 'Private workspace note in public mapping')
  return {
    documentationPages: pages.length,
    excludedInternalPaths: publicInternalDocumentPaths.length
  }
}
