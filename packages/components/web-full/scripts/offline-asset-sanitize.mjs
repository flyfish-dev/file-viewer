import { existsSync } from 'node:fs'
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

const textAssetExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.mjs',
  '.svg',
  '.txt',
  '.xml'
])
const ignoredTextDirectories = new Set(['example'])
const ignoredMetadataFileNames = new Set([
  'llms-full.txt',
  'llms.txt',
  'robots.txt',
  'sitemap.txt',
  'sitemap.xml'
])

const replacements = [
  {
    pattern: /https:\/\/cdn\.jsdelivr\.net\/npm\/@mathjax/g,
    replacement: '[mathjax]/fonts',
    reason: 'MathJax font path must resolve from vendored Draw.io assets'
  },
  {
    pattern: /https:\/\/viewer\.diagrams\.net\/math4\/es5/g,
    replacement: './math4/es5',
    reason: 'Draw.io MathJax assets must resolve from the vendored viewer bundle'
  },
  {
    pattern: /https:\/\/viewer\.diagrams\.net\/mxgraph\//g,
    replacement: './mxgraph/',
    reason: 'Draw.io mxgraph assets must resolve from the vendored viewer bundle'
  },
  {
    pattern: /https:\/\/viewer\.diagrams\.net\/(proxy|styles|shapes|stencils|img)\b/g,
    replacement: './$1',
    reason: 'Draw.io runtime asset paths must stay inside the vendored viewer bundle'
  },
  {
    pattern: /https:\/\/viewer\.diagrams\.net/g,
    replacement: './',
    reason: 'Draw.io viewer origin fallback must stay local'
  },
  {
    pattern: /https:\/\/app\.diagrams\.net/g,
    replacement: './',
    reason: 'Draw.io app origin fallback must stay local'
  },
  {
    pattern: /https:\/\/fonts\.googleapis\.com\/css2\?family=/g,
    replacement: 'file-viewer-offline-fonts?family=',
    reason: 'Google Fonts CSS endpoints are not available in offline deployments'
  },
  {
    pattern: /https:\/\/fonts\.googleapis\.com\/css\?family=/g,
    replacement: 'file-viewer-offline-fonts?family=',
    reason: 'Google Fonts CSS endpoints are not available in offline deployments'
  },
  {
    pattern: /https%3A%2F%2Ffonts\.googleapis\.com%2Fcss%3Ffamily=/gi,
    replacement: 'file-viewer-offline-fonts%3Ffamily=',
    reason: 'encoded Google Fonts CSS endpoints are not available in offline deployments'
  },
  {
    pattern: /https%3A%2F%2Ffonts\.googleapis\.com%2Fcss%3Ffamily%3D/gi,
    replacement: 'file-viewer-offline-fonts%3Ffamily%3D',
    reason: 'encoded Google Fonts CSS endpoints are not available in offline deployments'
  },
  {
    pattern: /https:\/\/fonts\.gstatic\.com/g,
    replacement: 'file-viewer-offline-fonts-static',
    reason: 'Google Fonts static endpoints are not available in offline deployments'
  },
  {
    pattern: /https:\/\/generativelanguage\.googleapis\.com/g,
    replacement: 'file-viewer-offline-ai-endpoint',
    reason: 'AI service endpoints must not remain in offline viewer assets'
  },
  {
    pattern: /https:\/\/cdn3\.iconfinder\.com\/data\/icons\/user-avatars-1\/512\//g,
    replacement: 'file-viewer-offline-avatars/',
    reason: 'Draw.io sample avatars must not point to public image CDNs'
  },
  {
    pattern: /https:\/\/www\.drawio\.com\/(?:doc|blog)\/[A-Za-z0-9_./?&=%+#-]+/g,
    replacement: 'file-viewer-offline-drawio-help',
    reason: 'Draw.io help links must not remain in offline viewer assets'
  },
  {
    pattern: /https:\/\/(?:test|www)\.draw\.io/g,
    replacement: 'file-viewer-offline-diagram-host',
    reason: 'Draw.io host checks must not depend on public domains'
  },
  {
    pattern: /https:\/\/embed\.diagrams\.net/g,
    replacement: 'file-viewer-offline-diagram-host',
    reason: 'Draw.io host checks must not depend on public domains'
  },
  {
    pattern: /https:\/\/jgraph\.github\.io/g,
    replacement: 'file-viewer-offline-diagram-host',
    reason: 'Draw.io host checks must not depend on public domains'
  },
  {
    pattern: /wss:\/\/(?:app\.diagrams\.net|viewer\.diagrams\.net|(?:test|www)\.draw\.io|embed\.diagrams\.net)/g,
    replacement: 'file-viewer-offline-diagram-ws',
    reason: 'Draw.io realtime websocket fallbacks must not point to public domains'
  },
  {
    pattern: /\b(?:test|www)\.draw\.io\b/g,
    replacement: 'file-viewer-offline-diagram-host',
    reason: 'Draw.io host checks must not depend on public domains'
  },
  {
    pattern: /\bembed\.diagrams\.net\b/g,
    replacement: 'file-viewer-offline-diagram-host',
    reason: 'Draw.io host checks must not depend on public domains'
  },
  {
    pattern: /\bjgraph\.github\.io\b/g,
    replacement: 'file-viewer-offline-diagram-host',
    reason: 'Draw.io host checks must not depend on public domains'
  },
  {
    pattern: /\bapp\.diagrams\.net\b/g,
    replacement: 'file-viewer-offline-diagram-host',
    reason: 'Draw.io host checks must not depend on public domains'
  },
  {
    pattern: /\bviewer\.diagrams\.net\b/g,
    replacement: 'file-viewer-offline-diagram-host',
    reason: 'Draw.io host checks must not depend on public domains'
  },
  {
    pattern: /\bwww\.drawio\.com\b/g,
    replacement: 'file-viewer-offline-drawio-help',
    reason: 'Draw.io help links must not remain in offline viewer assets'
  },
  {
    pattern: /https:\/\/drawio\.googleusercontent\.com/g,
    replacement: 'file-viewer-offline-drawio-assets',
    reason: 'Draw.io public asset origins are not available in offline deployments'
  },
  {
    pattern: /https:\/\/fonts\.googleapis\.com\//g,
    replacement: 'file-viewer-offline-fonts/',
    reason: 'Google Fonts CSS endpoints are not available in offline deployments'
  },
  {
    pattern: /\bfonts\.googleapis\.com\b/g,
    replacement: 'file-viewer-offline-fonts',
    reason: 'Google Fonts CSS endpoints are not available in offline deployments'
  },
  {
    pattern: /https:\/\/packages\.typst\.org/g,
    replacement: 'file-viewer-offline-typst-packages',
    reason: 'Typst package registry fallbacks must not reach the public network'
  },
  {
    pattern: /https:\/\/api\.github\.com/g,
    replacement: 'file-viewer-offline-github-api',
    reason: 'GitHub API fallbacks must not reach the public network'
  },
  {
    pattern: /https:\/\/cdn\.jsdelivr\.net/g,
    replacement: 'file-viewer-offline-cdn',
    reason: 'runtime CDN fallback markers are forbidden in release assets'
  },
  {
    pattern: /https:\/\/unpkg\.com/g,
    replacement: 'file-viewer-offline-cdn',
    reason: 'runtime CDN fallback markers are forbidden in release assets'
  },
  {
    pattern: /\bunpkg\.com\b/g,
    replacement: 'file-viewer-offline-cdn',
    reason: 'runtime CDN fallback markers are forbidden in release assets'
  },
  {
    pattern: /http:\/\/localhost\//g,
    replacement: './',
    reason: 'runtime fallback base URL must stay inside the deployed asset tree'
  },
  {
    pattern: /http:\/\/127\.0\.0\.1(?::\d+)?\/?/g,
    replacement: './',
    reason: 'runtime fallback base URL must stay inside the deployed asset tree'
  },
  {
    pattern: /http:\/\/0\.0\.0\.0(?::\d+)?\/?/g,
    replacement: './',
    reason: 'runtime fallback base URL must stay inside the deployed asset tree'
  },
  {
    pattern: /https:\/\/(?:demo\.|doc\.)?file-viewer\.app\/?/g,
    replacement: './',
    reason: 'official site origins must not be used as runtime fallback bases',
    skipFile: file => /\/apps\/viewer-demo\/dist\/(?:index|compare|iframe)\.html$/.test(file.replaceAll('\\', '/'))
  }
]

async function collectTextFiles(root, files = []) {
  if (!existsSync(root)) {
    return files
  }
  const info = await stat(root)
  if (info.isFile()) {
    const fileName = root.replaceAll('\\', '/').split('/').pop() || ''
    if (textAssetExtensions.has(extname(root)) && !ignoredMetadataFileNames.has(fileName)) {
      files.push(root)
    }
    return files
  }
  if (!info.isDirectory()) {
    return files
  }
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredTextDirectories.has(entry.name)) {
      continue
    }
    await collectTextFiles(join(root, entry.name), files)
  }
  return files
}

export async function sanitizeOfflineViewerAssetTree(root) {
  const files = await collectTextFiles(root)
  const touchedFiles = []
  let replacementCount = 0

  for (const file of files) {
    let text = await readFile(file, 'utf8')
    const original = text
    for (const item of replacements) {
      if (item.skipFile?.(file)) {
        continue
      }
      text = text.replace(item.pattern, () => {
        replacementCount += 1
        return item.replacement
      })
    }
    if (text !== original) {
      await writeFile(file, text, 'utf8')
      touchedFiles.push(file)
    }
  }

  return {
    root,
    checkedFiles: files.length,
    touchedFiles,
    replacementCount
  }
}

export function createOfflineAssetSanitizerPlugin(outputDir, options = {}) {
  return {
    name: 'file-viewer-offline-asset-sanitizer',
    apply: 'build',
    enforce: 'post',
    async closeBundle() {
      const result = await sanitizeOfflineViewerAssetTree(outputDir)
      if (options.log === false) {
        return
      }
      const label = options.label || 'vite-build'
      console.log(
        `[${label}] Sanitized ${result.checkedFiles} shipped text assets; ` +
        `localized ${result.replacementCount} public runtime fallback markers in ` +
        `${result.touchedFiles.length} files`
      )
    }
  }
}
