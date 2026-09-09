import { readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

export async function writeBundleNotices(metafile, output, { readmeLicensePackages = [] } = {}) {
  const packages = new Map()
  for (const input of Object.keys(metafile.inputs)) {
    if (!input.includes('node_modules/')) continue
    let directory = dirname(resolve(input))
    while (dirname(directory) !== directory) {
      try {
        const metadata = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))
        if (metadata.name && metadata.version) {
          packages.set(`${metadata.name}@${metadata.version}`, { directory, metadata })
          break
        }
      } catch (error) {
        if (error.code !== 'ENOENT') throw error
      }
      directory = dirname(directory)
    }
  }
  const notices = []
  for (const [id, { directory, metadata }] of [...packages].sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    const filenames = (await readdir(directory))
      .filter((name) => /^(licen[cs]e|copying|notice)(\.|$)/i.test(name))
      .sort()
    const sections = [id, `License: ${metadata.license || 'See upstream notices'}`]
    if (metadata.repository)
      sections.push(`Source: ${metadata.repository.url || metadata.repository}`)
    for (const filename of filenames) {
      sections.push(`--- ${filename} ---\n${await readFile(join(directory, filename), 'utf8')}`)
    }
    if (!filenames.length) {
      if (!readmeLicensePackages.includes(metadata.name))
        throw new Error(`Missing license text for bundled ${id}`)
      // This published package declares MIT only in its metadata and README.
      // Preserve that actual declaration and attribution rather than inventing a license file.
      sections.push(
        `Author: ${typeof metadata.author === 'string' ? metadata.author : metadata.author?.name}`
      )
      sections.push(
        `--- Upstream README (no separate license file was published) ---\n${await readFile(join(directory, 'README.md'), 'utf8')}`
      )
    }
    notices.push(sections.join('\n\n'))
  }
  await writeFile(output, notices.join('\n\n========================================\n\n') + '\n')
}
