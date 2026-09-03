import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

type PackageManifest = {
  name: string
  dependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

type WrapperEntry = {
  id: string
  packageName: string
  packageDir: string
  flavor?: string
}

const read = (relativePath: string): unknown =>
  JSON.parse(readFileSync(join(process.cwd(), relativePath), 'utf8'))

const wrappers = (read('ecosystem/wrappers.json') as { wrappers: WrapperEntry[] }).wrappers
const manifestOf = (wrapper: WrapperEntry): PackageManifest =>
  read(`${wrapper.packageDir}/package.json`) as PackageManifest

// Host runtimes are provided by the embedding application. Shipping one as a runtime
// dependency makes package managers install a second copy, which breaks framework
// internals that assume a single module instance (Vue's renderer reads `instance.refs`
// on the copy that owns the component, React loses its dispatcher, and so on).
const hostRuntimes = ['jquery', 'react', 'react-dom', 'svelte', 'vue'] as const

// Explicit contract per wrapper id. Anything missing has to be listed as hostless, so a
// new ecosystem package cannot quietly opt out of this gate.
const expectedHostPeer: Record<string, string> = {
  vue3: 'vue',
  'vue3-full': 'vue',
  'vue2.7': 'vue',
  'vue2.7-full': 'vue',
  'vue2.6': 'vue',
  'vue2.6-full': 'vue',
  react: 'react',
  'react-full': 'react',
  'react-legacy': 'react',
  'react-legacy-full': 'react',
  svelte: 'svelte',
  'svelte-full': 'svelte',
  jquery: 'jquery',
  'jquery-full': 'jquery'
}
const hostlessWrappers = ['web', 'web-full']

// Exact published ranges. These are product promises, not implementation details, so they
// are pinned here instead of being derived from the manifests under test.
const expectedPeerRanges: Record<string, string> = {
  vue3: '>=3.3 <4',
  'vue3-full': '>=3.3 <4',
  'vue2.7': '>=2.7 <3',
  'vue2.7-full': '>=2.7 <3',
  'vue2.6': '>=2.6 <2.7',
  'vue2.6-full': '>=2.6 <2.7',
  react: '>=17 <20',
  'react-full': '>=17 <20',
  'react-legacy': '>=16.8 <18',
  'react-legacy-full': '>=16.8 <18',
  svelte: '>=3.59 <6',
  'svelte-full': '>=3.59 <6',
  jquery: '>=3 <5',
  'jquery-full': '>=3 <5'
}

const installScopes = (manifest: PackageManifest) => ({
  ...(manifest.dependencies || {}),
  ...(manifest.optionalDependencies || {})
})

const parseVersion = (value: string): number[] => value.split('.').map((part) => Number(part) || 0)

// Supports the `>=A <B` range shape used across the ecosystem packages.
const peerRangeBounds = (range: string) => {
  const match = /^>=(\d+(?:\.\d+){0,2})\s+<(\d+(?:\.\d+){0,2})$/.exec(range.trim())
  expect(
    match,
    `peer range "${range}" must use the documented ">=x.y <z" form so it can be compared`
  ).not.toBeNull()
  const [, lower, upper] = match as RegExpMatchArray
  return { lower: parseVersion(lower), upper: parseVersion(upper) }
}

const compareVersions = (left: number[], right: number[]) => {
  for (let index = 0; index < 3; index += 1) {
    const difference = (left[index] || 0) - (right[index] || 0)
    if (difference !== 0) return difference
  }
  return 0
}

const rangesOverlap = (left: string, right: string) => {
  const a = peerRangeBounds(left)
  const b = peerRangeBounds(right)
  // Half-open intervals: [lower, upper).
  return compareVersions(a.lower, b.upper) < 0 && compareVersions(b.lower, a.upper) < 0
}

const versionSatisfiesPeer = (version: string, range: string) => {
  const bounds = peerRangeBounds(range)
  return (
    compareVersions(parseVersion(version), bounds.lower) >= 0 &&
    compareVersions(parseVersion(version), bounds.upper) < 0
  )
}

const frameworkOnly = (id: string) => id.replace(/-full$/, '')

describe('Ecosystem component host runtime contract', () => {
  it('covers every published ecosystem component package', () => {
    const covered = new Set([...Object.keys(expectedHostPeer), ...hostlessWrappers])
    expect(wrappers.map((wrapper) => wrapper.id).sort()).toEqual([...covered].sort())
  })

  for (const wrapper of wrappers) {
    it(`${wrapper.packageName} keeps the host runtime out of its installed dependency set`, () => {
      const manifest = manifestOf(wrapper)
      const installed = installScopes(manifest)
      const leaked = hostRuntimes.filter((host) => host in installed)
      expect(leaked, `${wrapper.packageName} must not ship a host runtime as a dependency`).toEqual(
        []
      )
      // The only runtime dependencies an ecosystem component may carry are File Viewer
      // workspace packages; build-only libraries such as icon sets belong in devDependencies.
      const thirdParty = Object.keys(installed).filter(
        (name) => !name.startsWith('@file-viewer/') && !name.startsWith('file-viewer-')
      )
      expect(thirdParty, `${wrapper.packageName} carries non-File Viewer runtime deps`).toEqual([])
    })
  }

  for (const wrapper of wrappers) {
    const host = expectedHostPeer[wrapper.id]
    if (!host) continue
    it(`${wrapper.packageName} declares ${host} as a peer the application must provide`, () => {
      const manifest = manifestOf(wrapper)
      expect(manifest.peerDependencies?.[host]).toBe(expectedPeerRanges[wrapper.id])
      // When the package builds against its own host copy, that copy must live inside the
      // range it promises consumers, otherwise the published artifact is untested.
      const buildVersion = manifest.devDependencies?.[host]
      if (buildVersion) {
        const digits = /^[~^]?(\d+\.\d+\.\d+)/.exec(buildVersion)
        expect(
          digits,
          `${host} devDependency "${buildVersion}" must pin an exact base version`
        ).not.toBeNull()
        expect(
          versionSatisfiesPeer(digits![1], expectedPeerRanges[wrapper.id]),
          `${wrapper.packageName} builds against ${host}@${digits![1]} outside ${expectedPeerRanges[wrapper.id]}`
        ).toBe(true)
      }
    })
  }

  for (const wrapper of wrappers) {
    if (expectedHostPeer[wrapper.id]) continue
    it(`${wrapper.packageName} stays framework agnostic`, () => {
      const manifest = manifestOf(wrapper)
      const peers = Object.keys(manifest.peerDependencies || {})
      expect(
        peers.filter((peer) => hostRuntimes.includes(peer as (typeof hostRuntimes)[number]))
      ).toEqual([])
    })
  }

  it('keeps the three Vue release lines mutually exclusive so a Vue 2 app cannot resolve a Vue 3 peer', () => {
    const vueWrappers = wrappers.filter((wrapper) => expectedHostPeer[wrapper.id] === 'vue')
    const byReleaseLine = new Map(
      vueWrappers.map((wrapper) => [
        frameworkOnly(wrapper.id),
        manifestOf(wrapper).peerDependencies?.vue as string
      ])
    )
    const ranges = [...byReleaseLine.entries()].map(([id, range]) => ({ id, range }))
    expect(ranges.map((entry) => entry.id).sort()).toEqual(['vue2.6', 'vue2.7', 'vue3'])
    const conflicts: string[] = []
    for (let index = 0; index < ranges.length; index += 1) {
      for (let other = index + 1; other < ranges.length; other += 1) {
        if (rangesOverlap(ranges[index].range, ranges[other].range)) {
          conflicts.push(
            `${ranges[index].id} ${ranges[index].range} vs ${ranges[other].id} ${ranges[other].range}`
          )
        }
      }
    }
    expect(conflicts).toEqual([])
  })
})
