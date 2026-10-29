export const maintainedReadmeFiles = Object.freeze(['README.md', 'README.en.md', 'README.zh-CN.md'])
export const legacyReadmeFiles = Object.freeze(['README.md', 'README.en.md'])

export function readmeLanguageLinks(text, packageDir) {
  const base = `https://github.com/flyfish-dev/file-viewer/blob/main/${packageDir}`
  const links = `[English](${base}/README.md) · [简体中文](${base}/README.zh-CN.md)`
  // Keep badges, screenshots, prose, code examples and generated sections intact.
  const normalized = text
    .replace(/^\[English\]\([^\n]+\) · \[简体中文\]\([^\n]+\)\n*/m, '')
    .replace(/\[简体中文\]\(\.\/README(?:\.en)?\.md\)/g, '[简体中文](./README.zh-CN.md)')
    .replace(/README\.md(?=">简体中文<\/a>)/g, 'README.zh-CN.md')
    .replace(/README\.en\.md(?=">English<\/a>)/g, 'README.md')
  if (!/^# .+$/m.test(normalized)) throw new Error(`Missing README title: ${packageDir}`)
  return normalized.replace(/^(# .+)\n+/, `$1\n\n${links}\n\n`)
}

export function packageReadmeHeader(text) {
  if (!text.includes('<!-- FILE_VIEWER_PACKAGE_HEADER -->')) return ''
  const header = text.match(/<!-- FILE_VIEWER_PACKAGE_HEADER -->[\s\S]*?^> ⭐[^\n]*(?:\n|$)/m)?.[0]
  if (!header) throw new Error('Cannot safely preserve the maintained package header')
  return header.trimEnd()
}

export function assertEnglishPackageReadme(text, label) {
  const header = packageReadmeHeader(text)
  const withoutLanguageLinks = value => value
    .replace(/<a\b[^>]*>简体中文<\/a>/g, '')
    .replace(/\[简体中文\]\([^\n)]+\)/g, '')
  if (/\p{Script=Han}/u.test(withoutLanguageLinks(header))) {
    throw new Error(`${label}: the default package header must be English`)
  }
  const introduction = text.replace(header, '').split(/\n\s*\n/)
    .map(block => withoutLanguageLinks(block).trim())
    .find(block => block && !/^(?:#|\[|!\[|<|```)/.test(block))
  if (!introduction || /\p{Script=Han}/u.test(introduction)) {
    throw new Error(`${label}: the default package introduction must be English`)
  }
}
