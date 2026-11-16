import { join } from 'node:path'

const coreBrowserEntries = ['index', 'assets', 'headless', 'browser', 'export', 'print-mask']

function browserCoreEntries(root, { built = false } = {}) {
  return coreBrowserEntries.map((entry) => [
    '@file-viewer/core' + (entry === 'index' ? '' : '/' + entry),
    join(root, 'packages/core', built ? 'dist' : 'src', entry + (built ? '.js' : '.ts'))
  ])
}

// Vite string aliases also match subpaths, so every public entry needs an exact match.
export function browserCoreAliases(root, options) {
  return browserCoreEntries(root, options).map(([name, replacement]) => ({
    find: new RegExp('^' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'),
    replacement
  }))
}

// Resolve all public browser entries to the same source or built Core tree.
export function browserCorePlugin(root, options) {
  const entries = new Map(browserCoreEntries(root, options))
  return {
    name: 'workspace-public-core-entries',
    setup(builder) {
      builder.onResolve({ filter: /^@file-viewer\/core(?:\/(?:assets|headless|browser|export|print-mask))?$/ },
        ({ path }) => ({ path: entries.get(path) }))
    }
  }
}

// Runtime-only artifacts must not retain esbuild's physical module-path labels.
// Legal comments remain in the output, and complete grants retain their notices.
export function browserRuntimeOptions(mode = process.env.FILE_VIEWER_DISTRIBUTION_MODE) {
  return { minify: mode === 'runtime-only', legalComments: 'eof' }
}

export function browserLibraryDefines() {
  // Deployment URLs belong to explicit library options, not the host bundler.
  return { 'process.env.PUBLIC_URL': 'undefined' }
}
