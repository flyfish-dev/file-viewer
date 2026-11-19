import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { constants } from 'node:fs'
import { chmod, copyFile, cp, lstat, mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join, relative, resolve } from 'node:path'

const shouldCopy = source => {
  const name = basename(source)
  return ![
    '.DS_Store',
    '.git',
    '.vercel',
    'dist',
    'node_modules',
    'tsconfig.tsbuildinfo'
  ].includes(name)
}

export async function copyCoreSource({
  sourceRoot, sourceDir, targetDir, rootPackage, corePackage, coreMetadata, workspaceVersions,
  copy = cp, publicProfile = null
}) {
  await rm(targetDir, { recursive: true, force: true })
  await mkdir(targetDir, { recursive: true })
  await copy(sourceDir, targetDir, {
    recursive: true,
    force: true,
    mode: publicProfile ? constants.COPYFILE_FICLONE_FORCE : constants.COPYFILE_FICLONE,
    filter: shouldCopy
  })

  const fileCopyOptions = { force: true, mode: constants.COPYFILE_FICLONE }
  await copy(join(sourceRoot, 'LICENSE'), join(targetDir, 'LICENSE'), fileCopyOptions)
  for (const helper of ['fix-core-esm-extensions.mjs', 'build-locale-exports.mjs']) {
    await copy(join(sourceDir, 'scripts', helper), join(targetDir, 'scripts', helper), fileCopyOptions)
  }

  const packageJson = {
    ...corePackage,
    packageManager: rootPackage.packageManager,
    private: false,
    repository: {
      type: 'git',
      url: `git+${coreMetadata.github}.git`
    },
    homepage: coreMetadata.github,
    bugs: {
      url: `${coreMetadata.github}/issues`
    },
    scripts: {
      ...corePackage.scripts,
      build: 'node scripts/clean-dist.mjs && tsc -b tsconfig.json --force && node scripts/fix-core-esm-extensions.mjs && node scripts/build-locale-exports.mjs'
    }
  }
  const blocks = [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.peerDependencies,
    packageJson.optionalDependencies
  ]
  for (const block of blocks) {
    for (const [name, range] of Object.entries(block || {})) {
      if (!range?.startsWith?.('workspace:')) continue
      const workspaceRange = range.slice('workspace:'.length)
      block[name] = workspaceRange === '*' || workspaceRange === ''
        ? workspaceVersions.get(name) || rootPackage.version
        : workspaceRange
    }
  }
  await writeFile(join(targetDir, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8')
}

// Node's COPYFILE_FICLONE_FORCE is ENOSYS on this macOS toolchain. Use the
// platform clone operation for whole accepted subtrees; never use hard links.
// Inspect the complete tree first so exclusions and symlink rejection apply
// before a directory can be cloned in one operation.
export async function copyPublicSourceTree(from, to, { recursive = false, filter = () => true } = {}) {
  for (let parent = dirname(resolve(to)); ; parent = dirname(parent)) {
    const info = await lstat(parent).catch(error => { if (error.code === 'ENOENT') return null; throw error })
    assert.ok(!info?.isSymbolicLink(), `Public copy destination ancestor is a symlink: ${parent}`)
    if (parent === dirname(parent)) break
  }
  const existing = await lstat(to).catch(error => { if (error.code === 'ENOENT') return null; throw error })
  if (existing?.isDirectory()) await listSourceTreeFiles(to)
  async function inspect(source, target) {
    if (!await filter(source, target)) return null
    const info = await lstat(source)
    assert.ok(!info.isSymbolicLink(), `Public copy source is a symlink: ${source}`)
    if (info.isFile()) return { source, target, info, complete: true }
    assert.ok(info.isDirectory() && recursive, `Public copy source is not a regular file: ${source}`)
    const names = await readdir(source)
    const children = []
    for (const name of names) children.push(await inspect(join(source, name), join(target, name)))
    return { source, target, info, children: children.filter(Boolean), complete: children.every(child => child?.complete) }
  }
  async function copy(node) {
    const existing = await lstat(node.target).catch(error => { if (error.code === 'ENOENT') return null; throw error })
    assert.ok(!existing?.isSymbolicLink(), `Public copy destination is a symlink: ${node.target}`)
    await mkdir(node.info.isDirectory() ? node.target : dirname(node.target), { recursive: true })
    if (node.complete && process.platform === 'darwin') {
      const destinationInfo = await lstat(node.info.isDirectory() ? node.target : dirname(node.target))
      assert.equal(node.info.dev, destinationInfo.dev, 'Public clone copy must remain on the same filesystem')
      execFileSync('/bin/cp', ['-c', ...(node.info.isDirectory() ? ['-R', `${node.source}/.`] : [node.source]), node.target])
    } else if (node.info.isDirectory()) {
      for (const child of node.children) await copy(child)
    } else {
      // Reflink cloning is an optimization, not a correctness requirement:
      // filesystems without copy-on-write support (ext4, tmpfs) reject
      // COPYFILE_FICLONE_FORCE. Fall back to an ordinary byte copy, which
      // keeps the exact-byte and no-hard-link guarantees above.
      try {
        await copyFile(node.source, node.target, constants.COPYFILE_FICLONE_FORCE)
      } catch (error) {
        if (!['ENOSYS', 'ENOTSUP', 'EOPNOTSUPP', 'EXDEV', 'EINVAL'].includes(error?.code)) throw error
        await copyFile(node.source, node.target)
      }
    }
    await chmod(node.target, node.info.mode & 0o777)
  }
  const plan = await inspect(from, to)
  if (plan) await copy(plan)
}
export async function listSourceTreeFiles(root, { skipGit = false, allowNodeModules = false, nodeModulePaths = new Set() } = {}) {
  const result = []
  async function visit(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (skipGit && entry.name === '.git') continue
      const path = join(dir, entry.name)
      if (allowNodeModules && entry.name === 'node_modules') {
        assert.ok(nodeModulePaths.has(relative(root, path).replaceAll('\\', '/')), `Unlisted private metadata resolver: ${path}`)
        continue
      }
      assert.ok(!entry.isSymbolicLink(), `Profile tree contains a symlink: ${path}`)
      if (entry.isDirectory()) await visit(path)
      else { assert.ok(entry.isFile(), `Unsupported profile file: ${path}`); result.push(relative(root, path).replaceAll('\\', '/')) }
    }
  }
  await visit(root)
  return result.sort()
}
