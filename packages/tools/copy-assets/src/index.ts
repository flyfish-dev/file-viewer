import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import {
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface CopyFileViewerAssetsOptions {
  /** Target static directory. Defaults to public/file-viewer in the invoking project. */
  targetDir?: string
  /** Clear the dedicated target before copying. Defaults to false. */
  clean?: boolean
  /** Required together with clean for destructive replacement. */
  confirmClean?: boolean
  /** Copy only assets owned by these renderer ids. Omit for the legacy full set. */
  rendererIds?: readonly string[]
  /** Override the bundled asset directory. Used by full-package compatibility bins. */
  sourceDir?: string
  /** Override the receipt version when assets are carried by a full package. */
  packageVersion?: string
}

export interface ViewerAssetValidationItem {
  id: string
  rendererId: string
  kind: string
  target: string
  required: boolean
  relativePath: string
  exists: boolean
  description: string
}

export interface CopyFileViewerAssetsResult {
  sourceDir: string
  targetDir: string
  assetBaseUrl: string
  assetManifestPath: string
  validation: {
    valid: boolean
    checkedAt: string
    assets: ViewerAssetValidationItem[]
    missingRequired: ViewerAssetValidationItem[]
    missingOptional: ViewerAssetValidationItem[]
  }
}

interface BundledAssetManifest {
  schemaVersion: number
  rendererAssetManifests: Array<{
    rendererId: string
    assets: Array<{
      id: string
      rendererId: string
      kind: string
      target: string
      required: boolean
      defaultPath?: string
      description: string
    }>
  }>
}

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const bundledViewerDir = resolve(packageDir, 'viewer')
const manifestFilename = 'flyfish-viewer-assets.json'
const selectedManifestFilename = 'file-viewer-copy-assets.manifest.json'
const receiptFilename = 'file-viewer-copy-assets.receipt.json'
const packageJson = JSON.parse(await readFile(resolve(packageDir, 'package.json'), 'utf8')) as {
  version: string
}
const sha256 = (content: Uint8Array) => createHash('sha256').update(content).digest('hex')
const sha256File = async (path: string) => sha256(await readFile(path))

const normalizeRelativePath = (value: string) => {
  const normalized = value.split(sep).join('/').replace(/^\.\//, '')
  if (!normalized || normalized.startsWith('/') || normalized.includes('../')) {
    throw new Error(`Unsafe asset path: ${value}`)
  }
  return normalized
}

const containedPath = (root: string, path: string) => {
  const target = resolve(root, normalizeRelativePath(path))
  const relation = relative(root, target)
  if (!relation || relation.startsWith('..')) throw new Error(`Asset path escapes target: ${path}`)
  return target
}

const listFilePaths = async (root: string, current = root): Promise<string[]> => {
  const result: string[] = []
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const path = resolve(current, entry.name)
    if (entry.isDirectory()) result.push(...(await listFilePaths(root, path)))
    else if (entry.isFile()) result.push(normalizeRelativePath(relative(root, path)))
  }
  return result.sort()
}

const isExpectedAssetKind = (
  kind: string,
  pathStat: { isDirectory(): boolean; isFile(): boolean }
) => {
  return kind === 'directory' || kind === 'wasm-directory'
    ? pathStat.isDirectory()
    : pathStat.isFile()
}

const validateCopiedAssets = async (
  targetDir: string,
  manifest: BundledAssetManifest
): Promise<CopyFileViewerAssetsResult['validation']> => {
  const assets = await Promise.all(
    manifest.rendererAssetManifests
      .flatMap((renderer) => renderer.assets)
      .filter((asset) => asset.target === 'public' && asset.defaultPath)
      .map(async (asset) => {
        const relativePath = asset.defaultPath || ''
        let exists: boolean
        try {
          exists = isExpectedAssetKind(asset.kind, await stat(resolve(targetDir, relativePath)))
        } catch {
          exists = false
        }
        return {
          id: asset.id,
          rendererId: asset.rendererId,
          kind: asset.kind,
          target: asset.target,
          required: asset.required,
          relativePath,
          exists,
          description: asset.description
        }
      })
  )
  const missingRequired = assets.filter((asset) => asset.required && !asset.exists)
  const missingOptional = assets.filter((asset) => !asset.required && !asset.exists)
  return {
    valid: missingRequired.length === 0,
    checkedAt: new Date().toISOString(),
    assets,
    missingRequired,
    missingOptional
  }
}

interface AggregateAssetReceiptFile {
  path: string
  size: number
  sha256: string
  ownership: 'managed' | 'shared'
  copyGroups: string[]
}

interface AggregateAssetReceipt {
  schemaVersion: 1
  packageName: 'file-viewer-copy-assets'
  packageVersion: string
  copyGroups: string[]
  installedAt: string
  files: AggregateAssetReceiptFile[]
  /** Added after the original schema-1 release; absent receipts remain upgradeable. */
  assetManifestSha256?: string
}

const readAggregateReceipt = async (targetDir: string): Promise<AggregateAssetReceipt | null> => {
  try {
    const receipt = JSON.parse(
      await readFile(resolve(targetDir, receiptFilename), 'utf8')
    ) as AggregateAssetReceipt
    if (
      receipt.schemaVersion !== 1 ||
      receipt.packageName !== 'file-viewer-copy-assets' ||
      !Array.isArray(receipt.files) ||
      typeof receipt.packageVersion !== 'string' ||
      !Array.isArray(receipt.copyGroups) ||
      receipt.copyGroups.some((group) => typeof group !== 'string' || !group) ||
      typeof receipt.installedAt !== 'string' ||
      (receipt.assetManifestSha256 !== undefined &&
        !/^[a-f0-9]{64}$/.test(receipt.assetManifestSha256)) ||
      receipt.files.some(
        (file) =>
          typeof file?.path !== 'string' ||
          normalizeRelativePath(file.path) !== file.path ||
          !Number.isSafeInteger(file.size) ||
          file.size < 0 ||
          !/^[a-f0-9]{64}$/.test(file.sha256) ||
          (file.ownership !== 'managed' && file.ownership !== 'shared') ||
          !Array.isArray(file.copyGroups) ||
          file.copyGroups.some((group) => typeof group !== 'string' || !group)
      )
    ) {
      throw new Error(`Invalid ${receiptFilename}`)
    }
    return receipt
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

const atomicWrite = async (path: string, content: string) => {
  const temporary = `${path}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temporary, content, 'utf8')
  await rename(temporary, path)
}
const readTextIfPresent = async (path: string) => {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

const assertTrustedTargetAncestors = async (target: string) => {
  const targetPath = resolve(target)
  const projectRoot = resolve(process.env.INIT_CWD || process.cwd())
  const projectRelation = relative(projectRoot, targetPath)
  const withinProject =
    !isAbsolute(projectRelation) &&
    projectRelation !== '..' &&
    !projectRelation.startsWith(`..${sep}`)
  const paths = withinProject
    ? projectRelation
        .split(sep)
        .filter(Boolean)
        .reduce<string[]>((items, part) => {
          items.push(resolve(items.at(-1) || projectRoot, part))
          return items
        }, [])
    : [dirname(targetPath), targetPath]
  for (const path of [...new Set(paths)]) {
    try {
      if ((await lstat(path)).isSymbolicLink())
        throw new Error(`Refusing symbolic-link asset path: ${path}`)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }
}

const assertNoSymlinkPath = async (root: string, relativePath = '') => {
  const rootPath = resolve(root)
  await assertTrustedTargetAncestors(rootPath)
  const parts = relativePath ? normalizeRelativePath(relativePath).split('/') : []
  let cursor = rootPath
  for (const part of ['', ...parts]) {
    if (part) cursor = resolve(cursor, part)
    try {
      if ((await lstat(cursor)).isSymbolicLink())
        throw new Error(`Refusing symbolic-link asset path: ${cursor}`)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }
}

const copySelectedAssetsTransactionally = async (
  targetDir: string,
  sourceDir: string,
  packageVersion: string,
  manifest: BundledAssetManifest,
  selectedManifest: BundledAssetManifest,
  selectedRendererIds: Set<string>
): Promise<CopyFileViewerAssetsResult> => {
  await mkdir(targetDir, { recursive: true })
  await assertNoSymlinkPath(targetDir)
  const previous = await readAggregateReceipt(targetDir)
  const previousByPath = new Map(previous?.files.map((file) => [file.path, file]) || [])
  const selectedFiles = new Map<
    string,
    { path: string; size: number; sha256: string; copyGroups: Set<string> }
  >()

  for (const renderer of selectedManifest.rendererAssetManifests) {
    for (const asset of renderer.assets) {
      if (asset.target !== 'public' || !asset.defaultPath) continue
      const sourcePath = containedPath(sourceDir, asset.defaultPath)
      if (!existsSync(sourcePath)) {
        if (asset.required) throw new Error(`Missing bundled viewer asset: ${sourcePath}`)
        continue
      }
      const info = await stat(sourcePath)
      const paths = info.isDirectory()
        ? (await listFilePaths(sourcePath)).map((path) =>
            normalizeRelativePath(`${asset.defaultPath}/${path}`)
          )
        : [normalizeRelativePath(asset.defaultPath)]
      for (const path of paths) {
        const contentPath = containedPath(sourceDir, path)
        const content = await readFile(contentPath)
        const current = selectedFiles.get(path) || {
          path,
          size: content.byteLength,
          sha256: sha256(content),
          copyGroups: new Set<string>()
        }
        current.copyGroups.add(renderer.rendererId)
        selectedFiles.set(path, current)
      }
    }
  }
  for (const metadataName of ['flyfish-viewer-manifest.json']) {
    const source = resolve(sourceDir, metadataName)
    if (!existsSync(source)) continue
    const content = await readFile(source)
    selectedFiles.set(metadataName, {
      path: metadataName,
      size: content.byteLength,
      sha256: sha256(content),
      copyGroups: new Set(selectedRendererIds)
    })
  }

  const ownership = new Map<string, 'managed' | 'shared'>()
  const unchanged = new Set<string>()
  for (const file of selectedFiles.values()) {
    const destination = containedPath(targetDir, file.path)
    if (!existsSync(destination)) {
      ownership.set(file.path, 'managed')
      continue
    }
    const destinationHash = await sha256File(destination)
    const previousFile = previousByPath.get(file.path)
    if (previousFile?.ownership === 'managed') {
      if (destinationHash !== previousFile.sha256 && destinationHash !== file.sha256) {
        throw new Error(`Managed asset was modified outside File Viewer: ${file.path}`)
      }
      ownership.set(file.path, 'managed')
      if (destinationHash === file.sha256) unchanged.add(file.path)
    } else if (destinationHash === file.sha256) {
      ownership.set(file.path, 'shared')
      unchanged.add(file.path)
    } else {
      throw new Error(`Refusing to overwrite an unowned asset: ${file.path}`)
    }
  }

  const operationRoot = await mkdtemp(resolve(tmpdir(), 'file-viewer-copy-assets-'))
  const backupRoot = resolve(operationRoot, 'backup')
  const touched: string[] = []
  const metadataPaths = [receiptFilename, selectedManifestFilename, manifestFilename].map((name) =>
    resolve(targetDir, name)
  )
  const metadataBefore = new Map<string, string | null>()
  try {
    for (const path of metadataPaths) metadataBefore.set(path, await readTextIfPresent(path))
    for (const file of selectedFiles.values()) {
      await assertNoSymlinkPath(targetDir, file.path)
      if (unchanged.has(file.path)) continue
      const destination = containedPath(targetDir, file.path)
      if (existsSync(destination)) {
        const backup = containedPath(backupRoot, file.path)
        await mkdir(dirname(backup), { recursive: true })
        await copyFile(destination, backup)
      }
      await mkdir(dirname(destination), { recursive: true })
      await copyFile(containedPath(sourceDir, file.path), destination)
      touched.push(file.path)
    }

    const nextByPath = new Map(previous?.files.map((file) => [file.path, file]) || [])
    for (const file of selectedFiles.values()) {
      const oldGroups = previousByPath.get(file.path)?.copyGroups || []
      nextByPath.set(file.path, {
        path: file.path,
        size: file.size,
        sha256: file.sha256,
        ownership: ownership.get(file.path) || 'managed',
        copyGroups: [...new Set([...oldGroups, ...file.copyGroups])].sort()
      })
    }
    const files = [...nextByPath.values()].sort((left, right) =>
      left.path.localeCompare(right.path)
    )
    const copyGroups = [
      ...new Set([...(previous?.copyGroups || []), ...selectedRendererIds])
    ].sort()
    const installedRendererAssetManifests = manifest.rendererAssetManifests.filter((renderer) =>
      copyGroups.includes(renderer.rendererId)
    )
    const installedValidation = await validateCopiedAssets(targetDir, {
      schemaVersion: 1,
      rendererAssetManifests: installedRendererAssetManifests
    })
    if (!installedValidation.valid) {
      throw new Error(
        `Viewer static assets are missing required resources: ${installedValidation.missingRequired.map((asset) => `${asset.rendererId}:${asset.relativePath}`).join(', ')}`
      )
    }
    const validationWithoutTimestamp = {
      valid: installedValidation.valid,
      assets: installedValidation.assets,
      missingRequired: installedValidation.missingRequired,
      missingOptional: installedValidation.missingOptional
    }
    const samePayload =
      previous?.packageVersion === packageVersion &&
      JSON.stringify(previous.copyGroups) === JSON.stringify(copyGroups) &&
      JSON.stringify(previous.files) === JSON.stringify(files)
    let checkedAt = installedValidation.checkedAt
    const previousManifestText = metadataBefore.get(resolve(targetDir, manifestFilename))
    const previousSelectedManifestText = metadataBefore.get(
      resolve(targetDir, selectedManifestFilename)
    )
    const previousMetadataTrusted = Boolean(
      previous?.assetManifestSha256 &&
      previousManifestText &&
      previousSelectedManifestText === previousManifestText &&
      sha256(Buffer.from(previousManifestText)) === previous.assetManifestSha256
    )
    if (samePayload && previousMetadataTrusted && previousManifestText) {
      try {
        const previousManifest = JSON.parse(previousManifestText) as {
          validation?: CopyFileViewerAssetsResult['validation']
        }
        const previousValidation = previousManifest.validation
        if (
          previousValidation &&
          typeof previousValidation.checkedAt === 'string' &&
          JSON.stringify({
            valid: previousValidation.valid,
            assets: previousValidation.assets,
            missingRequired: previousValidation.missingRequired,
            missingOptional: previousValidation.missingOptional
          }) === JSON.stringify(validationWithoutTimestamp)
        ) {
          checkedAt = previousValidation.checkedAt
        }
      } catch {
        // A stale or invalid runtime manifest is replaced by the verified payload below.
      }
    }
    const installedManifestObject = {
      schemaVersion: 1,
      generatedAt: checkedAt,
      packageName: 'file-viewer-copy-assets',
      packageVersion,
      rendererAssetManifests: installedRendererAssetManifests,
      validation: {
        ...validationWithoutTimestamp,
        checkedAt
      }
    }
    const installedManifest = `${JSON.stringify(installedManifestObject, null, 2)}\n`
    const installedManifestSha256 = sha256(Buffer.from(installedManifest))
    const same =
      samePayload &&
      previousMetadataTrusted &&
      previousManifestText === installedManifest &&
      previousSelectedManifestText === installedManifest &&
      previous?.assetManifestSha256 === installedManifestSha256
    const receipt: AggregateAssetReceipt = {
      schemaVersion: 1,
      packageName: 'file-viewer-copy-assets',
      packageVersion,
      copyGroups,
      installedAt: same ? previous.installedAt : checkedAt,
      files,
      assetManifestSha256: installedManifestSha256
    }
    if (!same) {
      await atomicWrite(
        resolve(targetDir, receiptFilename),
        `${JSON.stringify(receipt, null, 2)}\n`
      )
      await atomicWrite(resolve(targetDir, selectedManifestFilename), installedManifest)
      await atomicWrite(resolve(targetDir, manifestFilename), installedManifest)
    }
    return {
      sourceDir,
      targetDir,
      assetBaseUrl: '/file-viewer/',
      assetManifestPath: resolve(targetDir, manifestFilename),
      validation: installedValidation
    }
  } catch (error) {
    for (const path of touched.reverse()) {
      const destination = containedPath(targetDir, path)
      const backup = containedPath(backupRoot, path)
      if (existsSync(backup)) {
        await mkdir(dirname(destination), { recursive: true })
        await copyFile(backup, destination)
      } else {
        await rm(destination, { force: true })
      }
    }
    for (const [path, content] of metadataBefore) {
      if (content === null) await rm(path, { force: true })
      else await atomicWrite(path, content)
    }
    throw error
  } finally {
    await rm(operationRoot, { recursive: true, force: true })
  }
}

export interface ParsedCopyAssetsCliArguments {
  mode: 'copy' | 'help' | 'version'
  targetDir?: string
  clean: boolean
  confirmClean: boolean
  rendererIds: string[]
  json: boolean
}

export const parseCopyAssetsCliArguments = (args: string[]): ParsedCopyAssetsCliArguments => {
  let mode: ParsedCopyAssetsCliArguments['mode'] = 'copy'
  let targetDir: string | undefined
  let clean = false
  let confirmClean = false
  let rendererIds: string[] = []
  let json = false

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '--help' || argument === '-h') {
      mode = 'help'
      continue
    }
    if (argument === '--version' || argument === '-v') {
      mode = 'version'
      continue
    }
    if (argument === '--no-clean') {
      clean = false
      continue
    }
    if (argument === '--clean') {
      clean = true
      continue
    }
    if (argument === '--confirm') {
      confirmClean = true
      continue
    }
    if (argument === '--json') {
      json = true
      continue
    }
    if (argument === '--renderers') {
      const value = args[++index]
      if (!value) throw new Error('--renderers requires a comma-separated value')
      rendererIds = [
        ...new Set(
          value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
        )
      ].sort()
      continue
    }
    if (argument.startsWith('-')) {
      throw new Error(`Unknown option: ${argument}`)
    }
    if (targetDir) {
      throw new Error(`Only one target directory is supported, received: ${argument}`)
    }
    targetDir = argument
  }

  return { mode, targetDir, clean, confirmClean, rendererIds, json }
}

export const copyFileViewerAssets = async (
  options: CopyFileViewerAssetsOptions = {}
): Promise<CopyFileViewerAssetsResult> => {
  const sourceDir = resolve(options.sourceDir || bundledViewerDir)
  const packageVersion = options.packageVersion || packageJson.version
  const configuredTarget = options.targetDir || process.env.FILE_VIEWER_PUBLIC_DIR
  const targetDir = resolve(
    configuredTarget || resolve(process.env.INIT_CWD || process.cwd(), 'public/file-viewer')
  )
  await assertTrustedTargetAncestors(targetDir)
  if (!existsSync(sourceDir)) {
    throw new Error(`Missing bundled viewer assets: ${sourceDir}`)
  }

  const manifest = JSON.parse(
    await readFile(resolve(sourceDir, manifestFilename), 'utf8')
  ) as BundledAssetManifest
  if (manifest.schemaVersion !== 1) {
    throw new Error(`Unsupported viewer asset manifest schema: ${manifest.schemaVersion}`)
  }
  const requestedRendererIds = new Set(options.rendererIds || [])
  const selectedRendererIds = requestedRendererIds.size
    ? requestedRendererIds
    : new Set(manifest.rendererAssetManifests.map((renderer) => renderer.rendererId))
  const selectedManifest: BundledAssetManifest = requestedRendererIds.size
    ? {
        ...manifest,
        rendererAssetManifests: manifest.rendererAssetManifests.filter((renderer) =>
          selectedRendererIds.has(renderer.rendererId)
        )
      }
    : manifest
  if (requestedRendererIds.size) {
    const availableRendererIds = new Set(
      manifest.rendererAssetManifests.map((renderer) => renderer.rendererId)
    )
    const unknown = [...selectedRendererIds].filter(
      (rendererId) => !availableRendererIds.has(rendererId)
    )
    if (unknown.length) throw new Error(`Unknown renderer asset ids: ${unknown.join(', ')}`)
  }

  if (options.clean && !options.confirmClean) {
    throw new Error('Full asset cleanup requires both --clean and --confirm')
  }
  if (options.clean) {
    if (
      targetDir === resolve('/') ||
      targetDir === resolve(process.cwd()) ||
      targetDir === resolve(process.env.HOME || '/nonexistent') ||
      targetDir.split(sep).pop() !== 'file-viewer'
    ) {
      throw new Error(`Refusing to clean unsafe target: ${targetDir}`)
    }
    await assertNoSymlinkPath(targetDir)
    const operationRoot = await mkdtemp(resolve(tmpdir(), 'file-viewer-copy-assets-clean-'))
    const backup = resolve(operationRoot, 'backup')
    let moved = false
    try {
      if (existsSync(targetDir)) {
        await rename(targetDir, backup)
        moved = true
      }
      return await copySelectedAssetsTransactionally(
        targetDir,
        sourceDir,
        packageVersion,
        manifest,
        selectedManifest,
        selectedRendererIds
      )
    } catch (error) {
      await rm(targetDir, { recursive: true, force: true })
      if (moved) await rename(backup, targetDir)
      throw error
    } finally {
      await rm(operationRoot, { recursive: true, force: true })
    }
  }
  return copySelectedAssetsTransactionally(
    targetDir,
    sourceDir,
    packageVersion,
    manifest,
    selectedManifest,
    selectedRendererIds
  )
}
