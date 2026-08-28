import { createHash, randomUUID } from 'node:crypto';
import { constants, existsSync } from 'node:fs';
import { cp, link, lstat, mkdir, mkdtemp, open, readdir, realpath, rename, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, relative, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

export interface CapabilityAssetPackMetadata {
  packageName: string;
  packageVersion: string;
  packRoot: string;
  receiptFilename: string;
  manifestFilename?: string;
  profile?: string;
}

export interface InstallCapabilityAssetPackOptions {
  targetDir?: string;
  clean?: boolean;
  confirmClean?: boolean;
}

export interface CapabilityAssetReceiptFile {
  path: string;
  size: number;
  sha256: string;
  /** managed includes a path shared by two File Viewer asset owners. */
  ownership: 'managed' | 'shared';
}

export interface CapabilityAssetReceipt {
  schemaVersion: 1;
  packageName: string;
  packageVersion: string;
  assetManifestSha256: string;
  copyGroups: string[];
  profile?: string;
  profileManifestSha256?: string;
  installedAt: string;
  files: CapabilityAssetReceiptFile[];
}

export interface FileViewerAssetManifestOwnerInput {
  targetDir: string;
  ownerPackage: string;
  ownerVersion: string;
  receiptFilename: string;
  rendererAssetManifests: Array<{ rendererId: string; [key: string]: unknown }>;
  files: CapabilityAssetReceiptFile[];
}

export interface FileViewerAssetLedgerEntry {
  rendererId: string;
  ownerPackage: string;
  ownerVersion: string;
  receiptFilename: string;
  sha256: string;
  manifest: { rendererId: string; [key: string]: unknown };
}

export interface FileViewerAssetLedgerPathOwner {
  packageName: string;
  receiptFilename: string;
  ownership: 'managed' | 'shared';
}

export interface FileViewerAssetLedgerPath {
  path: string;
  size: number;
  sha256: string;
  owners: FileViewerAssetLedgerPathOwner[];
}

export interface FileViewerAssetLedger {
  schemaVersion: 1;
  entries: FileViewerAssetLedgerEntry[];
  paths: FileViewerAssetLedgerPath[];
}

export const runtimeManifestFilename = 'flyfish-viewer-assets.json';
export const assetLedgerFilename = 'file-viewer-assets.ledger.json';
export const assetLockFilename = '.file-viewer-assets.lock';
const assetLockReaperFilename = '.file-viewer-assets.lock.reaper';
const assetLockWaitMs = 30_000;

const sha256 = (value: Uint8Array | string) => createHash('sha256').update(value).digest('hex');
const normalizePath = (value: string) => {
  const normalized = String(value).replace(/\\/g, '/').replace(/^\.\//, '');
  if (!normalized || normalized.startsWith('/') || normalized.split('/').includes('..')) {
    throw new Error(`Unsafe capability asset path ${JSON.stringify(value)}.`);
  }
  return normalized;
};
const contained = (root: string, path: string) => {
  const target = resolve(root, normalizePath(path));
  const relation = relative(root, target);
  if (!relation || relation.startsWith('..') || resolve(root, relation) !== target) {
    throw new Error(`Capability asset path escapes target: ${path}.`);
  }
  return target;
};

const nearestExistingParent = async (path: string): Promise<{ existing: string; missing: string[] }> => {
  const missing: string[] = [];
  let cursor = resolve(path);
  while (true) {
    try {
      const info = await lstat(cursor);
      if (info.isSymbolicLink()) throw new Error(`Refusing symbolic-link asset path ${cursor}.`);
      if (!info.isDirectory()) throw new Error(`Asset target parent is not a directory: ${cursor}.`);
      return { existing: cursor, missing };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      const parent = dirname(cursor);
      if (parent === cursor) throw error;
      missing.unshift(basename(cursor));
      cursor = parent;
    }
  }
};

/** Resolve through the nearest existing ancestor once, then keep every later path inside that canonical root. */
const prepareTargetDir = async (targetDirInput: string) => {
  const requested = resolve(targetDirInput);
  const { existing, missing } = await nearestExistingParent(requested);
  const canonicalParent = await realpath(existing);
  const canonicalTarget = missing.reduce((path, segment) => resolve(path, segment), canonicalParent);
  await mkdir(canonicalTarget, { recursive: true });
  const info = await lstat(canonicalTarget);
  if (info.isSymbolicLink() || !info.isDirectory()) throw new Error(`Refusing non-directory asset target ${canonicalTarget}.`);
  return realpath(canonicalTarget);
};

const assertNoSymlinkPath = async (root: string, path: string) => {
  let cursor = root;
  for (const segment of normalizePath(path).split('/')) {
    cursor = resolve(cursor, segment);
    try {
      if ((await lstat(cursor)).isSymbolicLink()) {
        throw new Error(`Refusing to follow symbolic link inside asset target: ${relative(root, cursor)}.`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
  }
};

const listFiles = async (root: string, current = root): Promise<string[]> => {
  const files: string[] = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const path = resolve(current, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Capability asset pack contains a symbolic link: ${relative(root, path)}.`);
    if (entry.isDirectory()) files.push(...await listFiles(root, path));
    else if (entry.isFile()) files.push(normalizePath(relative(root, path)));
  }
  return files.sort();
};

const readNoFollow = async (path: string) => {
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    return await handle.readFile();
  } finally {
    await handle.close();
  }
};
const readTextNoFollow = async (path: string): Promise<string | null> => {
  try {
    return (await readNoFollow(path)).toString('utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
};
const hashFile = async (path: string) => sha256(await readNoFollow(path));
const inspectFile = async (root: string, path: string) => {
  const absolute = contained(root, path);
  const handle = await open(absolute, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const info = await handle.stat();
    if (!info.isFile()) throw new Error(`Capability asset is not a regular file: ${path}.`);
    return { path, size: info.size, sha256: sha256(await handle.readFile()) };
  } finally {
    await handle.close();
  }
};
const copyFileNoFollow = async (source: string, destination: string) => {
  const sourceHandle = await open(source, constants.O_RDONLY | constants.O_NOFOLLOW);
  let destinationHandle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    const info = await sourceHandle.stat();
    if (!info.isFile()) throw new Error(`Asset source is not a regular file: ${source}.`);
    destinationHandle = await open(
      destination,
      constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW,
      info.mode & 0o777,
    );
    await destinationHandle.writeFile(await sourceHandle.readFile());
    await destinationHandle.sync();
  } finally {
    await destinationHandle?.close();
    await sourceHandle.close();
  }
};
const atomicWrite = async (root: string, path: string, value: string) => {
  await assertNoSymlinkPath(root, normalizePath(relative(root, path)));
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`;
  const handle = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o644);
  try {
    await handle.writeFile(value, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temporary, path);
};

interface AssetLock {
  path: string;
  token: string;
  content: string;
}
const processIsAlive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
};
const parseLockState = async (path: string) => {
  const info = await lstat(path);
  if (info.isSymbolicLink() || !info.isFile()) throw new Error(`Invalid File Viewer asset lock at ${path}.`);
  let parsed: { pid?: number; createdAt?: string };
  try {
    parsed = JSON.parse((await readNoFollow(path)).toString('utf8')) as { pid?: number; createdAt?: string };
  } catch (error) {
    if (Date.now() - info.mtimeMs > 5 * 60_000) return { stale: true, dev: info.dev, ino: info.ino };
    throw new Error(`Invalid active File Viewer asset lock at ${path}: ${(error as Error).message}`, { cause: error });
  }
  const createdAt = typeof parsed.createdAt === 'string' ? Date.parse(parsed.createdAt) : Number.NaN;
  const age = Date.now() - Math.max(info.mtimeMs, Number.isFinite(createdAt) ? createdAt : 0);
  return {
    stale: age > 5 * 60_000 && (!Number.isSafeInteger(parsed.pid) || !processIsAlive(parsed.pid!)),
    dev: info.dev,
    ino: info.ino,
  };
};

interface AuxiliaryAssetLock {
  path: string;
  token: string;
}

const restoreQuarantinedLock = async (quarantinePath: string, originalPath: string) => {
  try {
    // An atomic no-replace restore cannot overwrite a newer claimant.
    await link(quarantinePath, originalPath);
    await rm(quarantinePath, { force: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error(`A live File Viewer asset lock replaced ${originalPath} while its stale predecessor was quarantined.`, { cause: error });
    }
    throw error;
  }
};

const reclaimStaleAuxiliaryLock = async (targetDir: string, path: string) => {
  const before = await parseLockState(path);
  if (!before.stale) return false;
  const quarantinePath = resolve(targetDir, `${basename(path)}.stale.${process.pid}.${Date.now()}.${randomUUID()}`);
  try {
    await rename(path, quarantinePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
  try {
    const after = await parseLockState(quarantinePath);
    if (after.dev !== before.dev || after.ino !== before.ino || !after.stale) {
      await restoreQuarantinedLock(quarantinePath, path);
      return false;
    }
    await rm(quarantinePath, { force: true });
    return true;
  } catch (error) {
    if (existsSync(quarantinePath)) {
      try {
        await restoreQuarantinedLock(quarantinePath, path);
      } catch {
        // Keep the quarantined inode and fail closed if another process won.
      }
    }
    throw error;
  }
};

const acquireAuxiliaryAssetLock = async (targetDir: string, path: string): Promise<AuxiliaryAssetLock | null> => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = randomUUID();
    const content = `${JSON.stringify({
      schemaVersion: 1,
      pid: process.pid,
      createdAt: new Date().toISOString(),
      token,
    })}\n`;
    let handle: Awaited<ReturnType<typeof open>> | undefined;
    try {
      handle = await open(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
      await handle.writeFile(content, 'utf8');
      await handle.sync();
      await handle.close();
      return { path, token };
    } catch (error) {
      await handle?.close();
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      await assertNoSymlinkPath(targetDir, normalizePath(relative(targetDir, path)));
      try {
        if ((await parseLockState(path)).stale && await reclaimStaleAuxiliaryLock(targetDir, path)) continue;
      } catch (readError) {
        if ((readError as NodeJS.ErrnoException).code === 'ENOENT') continue;
        throw readError;
      }
      return null;
    }
  }
  return null;
};

const releaseAuxiliaryAssetLock = async (lock: AuxiliaryAssetLock) => {
  try {
    const parsed = JSON.parse((await readNoFollow(lock.path)).toString('utf8')) as { token?: string };
    if (parsed.token === lock.token) await rm(lock.path, { force: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
};

const quarantineStaleAssetLock = async (targetDir: string, lockPath: string) => {
  const claimPath = resolve(targetDir, assetLockReaperFilename);
  await assertNoSymlinkPath(targetDir, assetLockReaperFilename);
  const claim = await acquireAuxiliaryAssetLock(targetDir, claimPath);
  if (!claim) return false;
  const quarantinePath = resolve(
    targetDir,
    `${assetLockFilename}.stale.${process.pid}.${Date.now()}.${randomUUID()}`,
  );
  try {
    try {
      if (!(await parseLockState(lockPath)).stale) return false;
      // The reaper claim ensures no second stale branch can race this rename.
      // New contenders may create a fresh lock after the rename, but cleanup only
      // touches the uniquely named quarantined inode.
      await rename(lockPath, quarantinePath);
      await rm(quarantinePath, { force: true });
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
  } finally {
    await releaseAuxiliaryAssetLock(claim);
  }
};
const acquireAssetLock = async (targetDir: string): Promise<AssetLock> => {
  const path = resolve(targetDir, assetLockFilename);
  await assertNoSymlinkPath(targetDir, assetLockFilename);
  const token = randomUUID();
  const content = `${JSON.stringify({ schemaVersion: 1, pid: process.pid, createdAt: new Date().toISOString(), token })}\n`;
  const deadline = Date.now() + assetLockWaitMs;
  let attempt = 0;
  while (Date.now() < deadline) {
    try {
      const handle = await open(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
      try {
        await handle.writeFile(content, 'utf8');
        await handle.sync();
      } finally {
        await handle.close();
      }
      return { path, token, content };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      await assertNoSymlinkPath(targetDir, assetLockFilename);
      try {
        if ((await parseLockState(path)).stale && await quarantineStaleAssetLock(targetDir, path)) continue;
      } catch (readError) {
        if ((readError as NodeJS.ErrnoException).code === 'ENOENT') continue;
        throw readError;
      }
      await delay(Math.min(250, 25 * (2 ** Math.min(attempt, 4))));
      attempt += 1;
    }
  }
  throw new Error(`Timed out after ${assetLockWaitMs / 1000}s waiting for the File Viewer asset lock in ${targetDir}.`);
};
const releaseAssetLock = async (lock: AssetLock) => {
  try {
    const parsed = JSON.parse((await readNoFollow(lock.path)).toString('utf8')) as { token?: string };
    if (parsed.token !== lock.token) throw new Error(`File Viewer asset lock ownership changed at ${lock.path}.`);
    await rm(lock.path, { force: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
};

const stableJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
};
const sha256Pattern = /^[a-f0-9]{64}$/;
const rendererIdPattern = /^[a-z0-9-]+$/;
const unsafeObjectKeys = new Set(['__proto__', 'prototype', 'constructor']);
const validateJsonValue = (value: unknown, label: string, seen = new Set<object>()): void => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`${label} contains a non-finite number.`);
    return;
  }
  if (typeof value !== 'object') throw new Error(`${label} contains a non-JSON value.`);
  if (seen.has(value)) throw new Error(`${label} contains a cycle.`);
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) validateJsonValue(item, label, seen);
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) throw new Error(`${label} has an unsafe prototype.`);
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (unsafeObjectKeys.has(key)) throw new Error(`${label} contains unsafe key ${key}.`);
      validateJsonValue(item, label, seen);
    }
  }
  seen.delete(value);
};
const validateRendererManifest = (
  manifest: unknown,
  label: string,
): { rendererId: string; [key: string]: unknown } => {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  validateJsonValue(manifest, label);
  const record = manifest as Record<string, unknown>;
  if (typeof record.rendererId !== 'string' || !rendererIdPattern.test(record.rendererId)) {
    throw new Error(`${label} has an invalid rendererId.`);
  }
  return record as { rendererId: string; [key: string]: unknown };
};
const validateReceipt = (receipt: CapabilityAssetReceipt, path: string) => {
  if (receipt.schemaVersion !== 1 || typeof receipt.packageName !== 'string' || !receipt.packageName ||
      typeof receipt.packageVersion !== 'string' || !receipt.packageVersion ||
      !sha256Pattern.test(receipt.assetManifestSha256) || !Array.isArray(receipt.copyGroups) ||
      !Array.isArray(receipt.files)) {
    throw new Error(`Invalid File Viewer asset receipt: ${path}.`);
  }
  if (receipt.copyGroups.some(group => typeof group !== 'string' || !group) ||
      new Set(receipt.copyGroups).size !== receipt.copyGroups.length ||
      (receipt.profile !== undefined && (typeof receipt.profile !== 'string' || !receipt.profile)) ||
      (receipt.profileManifestSha256 !== undefined && !sha256Pattern.test(receipt.profileManifestSha256)) ||
      typeof receipt.installedAt !== 'string' || !Number.isFinite(Date.parse(receipt.installedAt))) {
    throw new Error(`Invalid File Viewer asset receipt metadata: ${path}.`);
  }
  const seen = new Set<string>();
  for (const file of receipt.files) {
    const normalized = normalizePath(file.path);
    if (normalized !== file.path || seen.has(normalized) || !Number.isSafeInteger(file.size) || file.size < 0 ||
        !sha256Pattern.test(file.sha256) || !['managed', 'shared'].includes(file.ownership)) {
      throw new Error(`Invalid File Viewer asset receipt file entry in ${path}: ${String(file.path)}.`);
    }
    seen.add(normalized);
  }
  return receipt;
};
const readReceipt = async (path: string): Promise<CapabilityAssetReceipt | null> => {
  try {
    const receipt = JSON.parse((await readNoFollow(path)).toString('utf8')) as CapabilityAssetReceipt;
    return validateReceipt(receipt, path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
};

const validateLedger = (ledger: FileViewerAssetLedger, path: string): FileViewerAssetLedger => {
  if (ledger.schemaVersion !== 1 || !Array.isArray(ledger.entries) || !Array.isArray(ledger.paths)) {
    throw new Error(`Invalid File Viewer asset ledger: ${path}.`);
  }
  const seenEntries = new Set<string>();
  for (const entry of ledger.entries) {
    const manifestIsObject = Boolean(entry.manifest) && typeof entry.manifest === 'object' && !Array.isArray(entry.manifest);
    if (typeof entry.rendererId !== 'string' || !entry.rendererId ||
        typeof entry.ownerPackage !== 'string' || !entry.ownerPackage ||
        typeof entry.ownerVersion !== 'string' || !entry.ownerVersion ||
        typeof entry.receiptFilename !== 'string' || !entry.receiptFilename ||
        !sha256Pattern.test(entry.sha256) || !manifestIsObject || entry.manifest.rendererId !== entry.rendererId ||
        entry.sha256 !== sha256(stableJson(entry.manifest))) {
      throw new Error(`Invalid File Viewer asset ledger entry in ${path}.`);
    }
    if (normalizePath(entry.receiptFilename) !== entry.receiptFilename) {
      throw new Error(`Invalid File Viewer asset ledger receipt path in ${path}.`);
    }
    validateRendererManifest(entry.manifest, `File Viewer asset ledger entry ${entry.rendererId}`);
    if (seenEntries.has(entry.rendererId)) throw new Error(`Duplicate File Viewer asset ledger renderer in ${path}.`);
    seenEntries.add(entry.rendererId);
  }
  const seenPaths = new Set<string>();
  for (const item of ledger.paths) {
    if (normalizePath(item.path) !== item.path || seenPaths.has(item.path) || !Number.isSafeInteger(item.size) || item.size < 0 ||
        !sha256Pattern.test(item.sha256) || !Array.isArray(item.owners) || !item.owners.length) {
      throw new Error(`Invalid File Viewer asset ledger path in ${path}: ${String(item.path)}.`);
    }
    seenPaths.add(item.path);
    const seenOwners = new Set<string>();
    for (const owner of item.owners) {
      if (typeof owner.packageName !== 'string' || !owner.packageName ||
          typeof owner.receiptFilename !== 'string' || !owner.receiptFilename ||
          !['managed', 'shared'].includes(owner.ownership)) {
        throw new Error(`Invalid File Viewer asset ledger owner in ${path}: ${item.path}.`);
      }
      if (normalizePath(owner.receiptFilename) !== owner.receiptFilename || seenOwners.has(owner.packageName)) {
        throw new Error(`Invalid or duplicate File Viewer asset ledger owner in ${path}: ${item.path}.`);
      }
      seenOwners.add(owner.packageName);
    }
  }
  return ledger;
};

const resolveExistingTargetDir = async (targetDirInput: string): Promise<string | null> => {
  const requested = resolve(targetDirInput);
  try {
    const info = await lstat(requested);
    if (info.isSymbolicLink()) throw new Error(`Refusing symbolic-link asset target ${requested}.`);
    if (!info.isDirectory()) throw new Error(`Asset target is not a directory: ${requested}.`);
    return realpath(requested);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
};

export const readFileViewerAssetLedger = async (targetDirInput: string): Promise<FileViewerAssetLedger> => {
  const targetDir = await resolveExistingTargetDir(targetDirInput);
  if (!targetDir) return { schemaVersion: 1, entries: [], paths: [] };
  await assertNoSymlinkPath(targetDir, assetLedgerFilename);
  try {
    const ledger = JSON.parse((await readNoFollow(resolve(targetDir, assetLedgerFilename))).toString('utf8')) as Partial<FileViewerAssetLedger>;
    if (ledger.schemaVersion === 1 && Array.isArray(ledger.entries) && !Array.isArray(ledger.paths)) {
      return validateLedger({ schemaVersion: 1, entries: ledger.entries, paths: [] }, resolve(targetDir, assetLedgerFilename));
    }
    return validateLedger(ledger as FileViewerAssetLedger, resolve(targetDir, assetLedgerFilename));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  await assertNoSymlinkPath(targetDir, runtimeManifestFilename);
  try {
    const manifest = JSON.parse((await readNoFollow(resolve(targetDir, runtimeManifestFilename))).toString('utf8')) as {
      schemaVersion?: unknown;
      rendererAssetManifests?: Array<{ rendererId: string; [key: string]: unknown }>;
    };
    if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.rendererAssetManifests)) {
      throw new Error(`Invalid legacy File Viewer runtime asset manifest in ${targetDir}.`);
    }
    const seen = new Set<string>();
    const rendererAssetManifests = manifest.rendererAssetManifests.map(item => {
      const validated = validateRendererManifest(item, 'Legacy File Viewer runtime asset manifest');
      if (seen.has(validated.rendererId)) throw new Error(`Duplicate legacy asset renderer ${validated.rendererId}.`);
      seen.add(validated.rendererId);
      return validated;
    });
    return {
      schemaVersion: 1,
      entries: rendererAssetManifests.map(item => ({
        rendererId: item.rendererId,
        ownerPackage: '@file-viewer/assets-standard',
        ownerVersion: 'unknown',
        receiptFilename: 'file-viewer-assets-standard.receipt.json',
        sha256: sha256(stableJson(item)),
        manifest: item,
      })),
      paths: [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return { schemaVersion: 1, entries: [], paths: [] };
  }
};

export async function verifyFileViewerAssetState(targetDirInput: string) {
  const targetDir = await resolveExistingTargetDir(targetDirInput);
  if (!targetDir) {
    return {
      ok: false,
      errors: [`Missing asset target ${resolve(targetDirInput)}.`],
      ledger: null as FileViewerAssetLedger | null,
    };
  }
  const errors: string[] = [];
  let ledger: FileViewerAssetLedger | null = null;
  try {
    for (const path of [assetLedgerFilename, runtimeManifestFilename]) await assertNoSymlinkPath(targetDir, path);
    const ledgerSource = await readTextNoFollow(resolve(targetDir, assetLedgerFilename));
    if (ledgerSource === null) throw new Error(`Missing ${assetLedgerFilename}.`);
    ledger = validateLedger(JSON.parse(ledgerSource) as FileViewerAssetLedger, resolve(targetDir, assetLedgerFilename));
    const runtimeSource = await readTextNoFollow(resolve(targetDir, runtimeManifestFilename));
    if (runtimeSource === null) throw new Error(`Missing ${runtimeManifestFilename}.`);
    const actualRuntime = JSON.parse(runtimeSource) as unknown;
    const expectedRuntime = runtimeManifestFromLedger(ledger);
    if (stableJson(actualRuntime) !== stableJson(expectedRuntime)) {
      errors.push(`${runtimeManifestFilename} does not match the signed owner ledger.`);
    }
    for (const item of ledger.paths) {
      try {
        await assertNoSymlinkPath(targetDir, item.path);
        const inspected = await inspectFile(targetDir, item.path);
        if (inspected.size !== item.size || inspected.sha256 !== item.sha256) {
          errors.push(`Asset ledger integrity verification failed: ${item.path}.`);
        }
      } catch {
        errors.push(`Missing or unsafe ledger asset: ${item.path}.`);
      }
    }
  } catch (error) {
    errors.push((error as Error).message);
  }
  return { ok: errors.length === 0, errors, ledger };
}

const nextLedgerForOwner = (ledger: FileViewerAssetLedger, input: FileViewerAssetManifestOwnerInput): FileViewerAssetLedger => {
  if (typeof input.ownerPackage !== 'string' || !input.ownerPackage ||
      typeof input.ownerVersion !== 'string' || !input.ownerVersion ||
      typeof input.receiptFilename !== 'string' || normalizePath(input.receiptFilename) !== input.receiptFilename ||
      !Array.isArray(input.rendererAssetManifests) || !Array.isArray(input.files)) {
    throw new Error('Invalid File Viewer asset owner input.');
  }
  const seenIncoming = new Set<string>();
  const rendererAssetManifests = input.rendererAssetManifests.map(manifest => {
    const validated = validateRendererManifest(manifest, `Asset owner ${input.ownerPackage}`);
    if (seenIncoming.has(validated.rendererId)) throw new Error(`Duplicate asset renderer ${validated.rendererId} for ${input.ownerPackage}.`);
    seenIncoming.add(validated.rendererId);
    return validated;
  });
  const seenFiles = new Set<string>();
  for (const file of input.files) {
    if (typeof file.path !== 'string' || normalizePath(file.path) !== file.path || seenFiles.has(file.path) ||
        !Number.isSafeInteger(file.size) || file.size < 0 || !sha256Pattern.test(file.sha256) ||
        !['managed', 'shared'].includes(file.ownership)) {
      throw new Error(`Invalid asset file input for ${input.ownerPackage}: ${String(file.path)}.`);
    }
    seenFiles.add(file.path);
  }
  const retainedEntries = ledger.entries.filter(entry => entry.ownerPackage !== input.ownerPackage);
  const incomingEntries: FileViewerAssetLedgerEntry[] = rendererAssetManifests.map(manifest => ({
    rendererId: manifest.rendererId,
    ownerPackage: input.ownerPackage,
    ownerVersion: input.ownerVersion,
    receiptFilename: input.receiptFilename,
    sha256: sha256(stableJson(manifest)),
    manifest,
  }));
  for (const entry of incomingEntries) {
    const conflict = retainedEntries.find(item => item.rendererId === entry.rendererId);
    if (conflict) throw new Error(`Asset manifest group ${entry.rendererId} conflicts with ${conflict.ownerPackage}.`);
  }

  const pathMap = new Map<string, FileViewerAssetLedgerPath>();
  for (const item of ledger.paths) {
    const owners = item.owners.filter(owner => owner.packageName !== input.ownerPackage);
    if (owners.length) pathMap.set(item.path, { ...item, owners });
  }
  for (const file of input.files) {
    const current = pathMap.get(file.path);
    if (current && (current.sha256 !== file.sha256 || current.size !== file.size)) {
      throw new Error(`Asset path ${file.path} conflicts with ${current.owners[0]?.packageName || 'another owner'}.`);
    }
    const owners = [
      ...(current?.owners || []),
      { packageName: input.ownerPackage, receiptFilename: input.receiptFilename, ownership: file.ownership },
    ].sort((left, right) => left.packageName.localeCompare(right.packageName));
    pathMap.set(file.path, { path: file.path, size: file.size, sha256: file.sha256, owners });
  }
  return {
    schemaVersion: 1,
    entries: [...retainedEntries, ...incomingEntries].sort((left, right) =>
      left.rendererId.localeCompare(right.rendererId) || left.ownerPackage.localeCompare(right.ownerPackage)),
    paths: [...pathMap.values()].sort((left, right) => left.path.localeCompare(right.path)),
  };
};
const runtimeManifestFromLedger = (ledger: FileViewerAssetLedger) => {
  const byRendererId = new Map<string, FileViewerAssetLedgerEntry>();
  for (const entry of ledger.entries) {
    const existing = byRendererId.get(entry.rendererId);
    if (existing && existing.sha256 !== entry.sha256) throw new Error(`Asset manifest group ${entry.rendererId} has conflicting owners.`);
    if (!existing) byRendererId.set(entry.rendererId, entry);
  }
  return {
    schemaVersion: 1,
    rendererAssetManifests: [...byRendererId.values()]
      .sort((left, right) => left.rendererId.localeCompare(right.rendererId))
      .map(entry => entry.manifest),
  };
};

const mergeFileViewerAssetManifestOwnerUnlocked = async (
  input: FileViewerAssetManifestOwnerInput,
  targetDir: string,
) => {
  for (const path of [assetLedgerFilename, runtimeManifestFilename]) await assertNoSymlinkPath(targetDir, path);
  const ledgerPath = resolve(targetDir, assetLedgerFilename);
  const manifestPath = resolve(targetDir, runtimeManifestFilename);
  const nextLedger = nextLedgerForOwner(await readFileViewerAssetLedger(targetDir), input);
  const previousLedger = await readTextNoFollow(ledgerPath);
  const previousManifest = await readTextNoFollow(manifestPath);
  try {
    await atomicWrite(targetDir, ledgerPath, `${JSON.stringify(nextLedger, null, 2)}\n`);
    await atomicWrite(targetDir, manifestPath, `${JSON.stringify(runtimeManifestFromLedger(nextLedger), null, 2)}\n`);
  } catch (error) {
    if (previousLedger === null) await rm(ledgerPath, { force: true });
    else await atomicWrite(targetDir, ledgerPath, previousLedger);
    if (previousManifest === null) await rm(manifestPath, { force: true });
    else await atomicWrite(targetDir, manifestPath, previousManifest);
    throw error;
  }
  return { ledgerPath, manifestPath, ledger: nextLedger };
};

export async function mergeFileViewerAssetManifestOwner(input: FileViewerAssetManifestOwnerInput) {
  const targetDir = await prepareTargetDir(input.targetDir);
  const lock = await acquireAssetLock(targetDir);
  try {
    return await mergeFileViewerAssetManifestOwnerUnlocked(input, targetDir);
  } finally {
    await releaseAssetLock(lock);
  }
}

const assertCleanTarget = (targetDir: string) => {
  if (targetDir === resolve('/') || targetDir === resolve(process.cwd()) ||
      targetDir === resolve(process.env.HOME || '/nonexistent') || basename(targetDir) !== 'file-viewer') {
    throw new Error(`Refusing to clean unsafe target ${targetDir}.`);
  }
};
const restoreTextSnapshot = async (root: string, path: string, value: string | null) => {
  if (value === null) await rm(path, { force: true });
  else await atomicWrite(root, path, value);
};

export async function installFileViewerCapabilityAssetPack(
  metadata: CapabilityAssetPackMetadata,
  options: InstallCapabilityAssetPackOptions = {},
) {
  const requestedTargetDir = resolve(
    options.targetDir || process.env.FILE_VIEWER_PUBLIC_DIR || resolve(process.env.INIT_CWD || process.cwd(), 'public/file-viewer'),
  );
  if (options.clean && !options.confirmClean) throw new Error('Full asset cleanup requires both --clean and --confirm.');
  if (options.clean) assertCleanTarget(requestedTargetDir);
  const targetDir = await prepareTargetDir(requestedTargetDir);
  const bundledRoot = resolve(metadata.packRoot, 'viewer');
  const manifestFilename = metadata.manifestFilename || 'file-viewer-asset-pack.json';
  const manifestPath = contained(bundledRoot, manifestFilename);
  let manifestContent: Uint8Array;
  try {
    manifestContent = await readNoFollow(manifestPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Missing capability asset pack manifest: ${manifestPath}.`, { cause: error });
    }
    throw error;
  }
  const manifest = JSON.parse(Buffer.from(manifestContent).toString('utf8')) as {
    schemaVersion: number;
    packageName?: string;
    packageVersion?: string;
    profile?: string;
    profileManifestSha256?: string;
    copyGroups?: string[];
    rendererAssetManifests: Array<{ rendererId: string; [key: string]: unknown }>;
  };
  validateJsonValue(manifest, `Capability asset pack manifest for ${metadata.packageName}`);
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.rendererAssetManifests)) {
    throw new Error(`Capability asset pack manifest is invalid for ${metadata.packageName}.`);
  }
  const seenManifestRendererIds = new Set<string>();
  manifest.rendererAssetManifests = manifest.rendererAssetManifests.map(item => {
    const validated = validateRendererManifest(item, `Capability asset pack manifest for ${metadata.packageName}`);
    if (seenManifestRendererIds.has(validated.rendererId)) {
      throw new Error(`Capability asset pack ${metadata.packageName} repeats renderer ${validated.rendererId}.`);
    }
    seenManifestRendererIds.add(validated.rendererId);
    return validated;
  });
  if (manifest.copyGroups && (manifest.copyGroups.some(group => typeof group !== 'string' || !rendererIdPattern.test(group)) ||
      new Set(manifest.copyGroups).size !== manifest.copyGroups.length)) {
    throw new Error(`Capability asset pack ${metadata.packageName} has invalid copyGroups.`);
  }
  if ((manifest.packageName && manifest.packageName !== metadata.packageName) ||
      (manifest.packageVersion && manifest.packageVersion !== metadata.packageVersion)) {
    throw new Error(`Capability asset pack metadata drifted for ${metadata.packageName}.`);
  }
  if (metadata.profile && manifest.profile !== metadata.profile) {
    throw new Error(`Capability asset pack profile drifted for ${metadata.packageName}.`);
  }

  const operationRoot = await mkdtemp(resolve(tmpdir(), 'file-viewer-capability-assets-'));
  const stagedRoot = resolve(operationRoot, 'staged');
  const backupRoot = resolve(operationRoot, 'backup');
  const touched: string[] = [];
  let cleanMoved = false;
  const metadataBefore = new Map<string, string | null>();
  const lock = await acquireAssetLock(targetDir);
  try {
    await listFiles(bundledRoot);
    await cp(bundledRoot, stagedRoot, { recursive: true, force: true, dereference: false });
    const stagedPaths = (await listFiles(stagedRoot)).filter(path => path !== manifestFilename);
    const stagedFiles = await Promise.all(stagedPaths.map(path => inspectFile(stagedRoot, path)));
    const receiptPath = resolve(targetDir, metadata.receiptFilename);
    const ledgerPath = resolve(targetDir, assetLedgerFilename);
    const runtimePath = resolve(targetDir, runtimeManifestFilename);
    for (const path of [metadata.receiptFilename, assetLedgerFilename, runtimeManifestFilename]) await assertNoSymlinkPath(targetDir, path);
    const previous = await readReceipt(receiptPath);
    for (const path of [receiptPath, ledgerPath, runtimePath]) metadataBefore.set(path, await readTextNoFollow(path));

    let files: CapabilityAssetReceiptFile[];
    if (options.clean) {
      await rm(contained(stagedRoot, manifestFilename), { force: true });
      await atomicWrite(stagedRoot, resolve(stagedRoot, assetLockFilename), lock.content);
      if (existsSync(targetDir)) {
        await rename(targetDir, backupRoot);
        cleanMoved = true;
      }
      await rename(stagedRoot, targetDir);
      files = stagedFiles.map(file => ({ ...file, ownership: 'managed' as const }));
    } else {
      await mkdir(backupRoot, { recursive: true });
      const ledger = await readFileViewerAssetLedger(targetDir);
      const previousByPath = new Map(previous?.files.map(file => [file.path, file]) || []);
      const ledgerByPath = new Map(ledger.paths.map(path => [path.path, path]));
      const stagedByPath = new Set(stagedFiles.map(file => file.path));
      const ownership = new Map<string, 'managed' | 'shared'>();
      const unchanged = new Set<string>();
      for (const file of stagedFiles) {
        await assertNoSymlinkPath(targetDir, file.path);
        const destination = contained(targetDir, file.path);
        if (!existsSync(destination)) {
          ownership.set(file.path, 'managed');
          continue;
        }
        const destinationHash = await hashFile(destination);
        const old = previousByPath.get(file.path);
        const ledgerPathEntry = ledgerByPath.get(file.path);
        const isManaged = old?.ownership === 'managed' || ledgerPathEntry?.owners.some(owner => owner.ownership === 'managed');
        if (isManaged) {
          if ((old && destinationHash !== old.sha256) ||
              (ledgerPathEntry && destinationHash !== ledgerPathEntry.sha256)) {
            throw new Error(`Managed asset was modified outside File Viewer: ${file.path}.`);
          }
          const otherOwners = ledgerPathEntry?.owners.filter(owner => owner.packageName !== metadata.packageName) || [];
          if (destinationHash !== file.sha256 && otherOwners.length) {
            throw new Error(`Asset path ${file.path} is still required by ${otherOwners[0].packageName}.`);
          }
          ownership.set(file.path, 'managed');
          if (destinationHash === file.sha256) unchanged.add(file.path);
        } else if (destinationHash === file.sha256) {
          ownership.set(file.path, 'shared');
          unchanged.add(file.path);
        } else {
          throw new Error(`Refusing to overwrite an unowned asset: ${file.path}.`);
        }
      }
      for (const old of previous?.files || []) {
        if (old.ownership !== 'managed' || stagedByPath.has(old.path)) continue;
        await assertNoSymlinkPath(targetDir, old.path);
        const destination = contained(targetDir, old.path);
        if (existsSync(destination) && await hashFile(destination) !== old.sha256) {
          throw new Error(`Stale managed asset was modified outside File Viewer: ${old.path}.`);
        }
      }
      for (const file of stagedFiles) {
        if (unchanged.has(file.path)) continue;
        await assertNoSymlinkPath(targetDir, file.path);
        const destination = contained(targetDir, file.path);
        if (existsSync(destination)) {
          const backup = contained(backupRoot, file.path);
          await mkdir(dirname(backup), { recursive: true });
          await copyFileNoFollow(destination, backup);
        }
        await mkdir(dirname(destination), { recursive: true });
        await assertNoSymlinkPath(targetDir, file.path);
        await copyFileNoFollow(contained(stagedRoot, file.path), destination);
        touched.push(file.path);
      }
      for (const old of previous?.files || []) {
        if (old.ownership !== 'managed' || stagedByPath.has(old.path)) continue;
        if (ledgerByPath.get(old.path)?.owners.some(owner => owner.packageName !== metadata.packageName)) continue;
        const destination = contained(targetDir, old.path);
        if (!existsSync(destination)) continue;
        const backup = contained(backupRoot, old.path);
        await mkdir(dirname(backup), { recursive: true });
        await copyFileNoFollow(destination, backup);
        await rm(destination, { force: true });
        touched.push(old.path);
      }
      files = stagedFiles.map(file => ({ ...file, ownership: ownership.get(file.path) || 'managed' }));
    }

    const assetManifestSha256 = sha256(manifestContent);
    const copyGroups = [...(manifest.copyGroups || manifest.rendererAssetManifests.map(item => item.rendererId))].sort();
    const same = !options.clean && previous?.packageVersion === metadata.packageVersion &&
      previous.assetManifestSha256 === assetManifestSha256 && JSON.stringify(previous.files) === JSON.stringify(files);
    const receipt: CapabilityAssetReceipt = {
      schemaVersion: 1,
      packageName: metadata.packageName,
      packageVersion: metadata.packageVersion,
      assetManifestSha256,
      copyGroups,
      ...(metadata.profile ? { profile: metadata.profile } : {}),
      ...(manifest.profileManifestSha256 ? { profileManifestSha256: manifest.profileManifestSha256 } : {}),
      installedAt: same ? previous!.installedAt : new Date().toISOString(),
      files,
    };
    if (!same || options.clean) await atomicWrite(targetDir, resolve(targetDir, metadata.receiptFilename), `${JSON.stringify(receipt, null, 2)}\n`);
    await mergeFileViewerAssetManifestOwnerUnlocked({
      targetDir,
      ownerPackage: metadata.packageName,
      ownerVersion: metadata.packageVersion,
      receiptFilename: metadata.receiptFilename,
      rendererAssetManifests: manifest.rendererAssetManifests,
      files,
    }, targetDir);
    return {
      targetDir,
      receiptPath: resolve(targetDir, metadata.receiptFilename),
      copyGroups,
      changed: !same || Boolean(options.clean) || touched.length > 0,
    };
  } catch (error) {
    if (options.clean) {
      await rm(targetDir, { recursive: true, force: true });
      if (cleanMoved && existsSync(backupRoot)) await rename(backupRoot, targetDir);
    } else {
      for (const path of [...touched].reverse()) {
        const destination = contained(targetDir, path);
        const backup = contained(backupRoot, path);
        if (existsSync(backup)) {
          await mkdir(dirname(destination), { recursive: true });
          await copyFileNoFollow(backup, destination);
        } else await rm(destination, { force: true });
      }
      for (const [path, value] of metadataBefore) await restoreTextSnapshot(targetDir, path, value);
    }
    throw error;
  } finally {
    try {
      await releaseAssetLock(lock);
    } finally {
      await rm(operationRoot, { recursive: true, force: true });
    }
  }
}

export async function verifyFileViewerCapabilityAssetReceipt(targetDirInput: string, receiptFilename: string) {
  const targetDir = await resolveExistingTargetDir(targetDirInput);
  if (!targetDir) return { ok: false, errors: [`Missing asset target ${resolve(targetDirInput)}.`], receipt: null };
  await assertNoSymlinkPath(targetDir, receiptFilename);
  const receipt = await readReceipt(resolve(targetDir, receiptFilename));
  if (!receipt) return { ok: false, errors: [`Missing ${receiptFilename}.`], receipt: null };
  const errors: string[] = [];
  for (const file of receipt.files) {
    try {
      await assertNoSymlinkPath(targetDir, file.path);
      const inspected = await inspectFile(targetDir, file.path);
      if (inspected.size !== file.size || inspected.sha256 !== file.sha256) {
        errors.push(`Asset failed integrity verification: ${file.path}.`);
      }
    } catch {
      errors.push(`Missing or unsafe asset: ${file.path}.`);
    }
  }
  return { ok: errors.length === 0, errors, receipt };
}

export async function uninstallFileViewerCapabilityAssetPack(
  targetDirInput: string,
  ownerPackage: string,
  receiptFilename: string,
) {
  const targetDir = await resolveExistingTargetDir(targetDirInput);
  if (!targetDir) return { changed: false, targetDir: resolve(targetDirInput), removedFiles: [] as string[] };
  const lock = await acquireAssetLock(targetDir);
  try {
  for (const path of [receiptFilename, assetLedgerFilename, runtimeManifestFilename]) await assertNoSymlinkPath(targetDir, path);
  const receiptPath = resolve(targetDir, receiptFilename);
  const receipt = await readReceipt(receiptPath);
  if (!receipt) return { changed: false, targetDir, removedFiles: [] as string[] };
  if (receipt.packageName !== ownerPackage) throw new Error(`Receipt ${receiptFilename} belongs to ${receipt.packageName}.`);
  const ledger = await readFileViewerAssetLedger(targetDir);
  const removable = receipt.files.filter(file => file.ownership === 'managed' &&
    !ledger.paths.find(item => item.path === file.path)?.owners.some(owner => owner.packageName !== ownerPackage));
  for (const file of removable) {
    await assertNoSymlinkPath(targetDir, file.path);
    const path = contained(targetDir, file.path);
    if (existsSync(path) && await hashFile(path) !== file.sha256) {
      throw new Error(`Refusing to remove modified managed asset: ${file.path}.`);
    }
  }

  const operationRoot = await mkdtemp(resolve(tmpdir(), 'file-viewer-capability-remove-'));
  const backupRoot = resolve(operationRoot, 'backup');
  const metadataPaths = [receiptPath, resolve(targetDir, assetLedgerFilename), resolve(targetDir, runtimeManifestFilename)];
  const metadataBefore = new Map<string, string | null>();
  for (const path of metadataPaths) metadataBefore.set(path, await readTextNoFollow(path));
  const removedFiles: string[] = [];
  try {
    for (const file of removable) {
      const path = contained(targetDir, file.path);
      if (!existsSync(path)) continue;
      const backup = contained(backupRoot, file.path);
      await mkdir(dirname(backup), { recursive: true });
      await copyFileNoFollow(path, backup);
      await rm(path, { force: true });
      removedFiles.push(file.path);
    }
    await rm(receiptPath, { force: true });
    await mergeFileViewerAssetManifestOwnerUnlocked({
      targetDir,
      ownerPackage,
      ownerVersion: receipt.packageVersion,
      receiptFilename,
      rendererAssetManifests: [],
      files: [],
    }, targetDir);
    return { changed: true, targetDir, removedFiles };
  } catch (error) {
    for (const path of removedFiles) {
      const destination = contained(targetDir, path);
      const backup = contained(backupRoot, path);
      if (existsSync(backup)) {
        await mkdir(dirname(destination), { recursive: true });
        await copyFileNoFollow(backup, destination);
      }
    }
    for (const [path, value] of metadataBefore) await restoreTextSnapshot(targetDir, path, value);
    throw error;
  } finally {
    await rm(operationRoot, { recursive: true, force: true });
  }
  } finally {
    await releaseAssetLock(lock);
  }
}

/** Shared implementation for the stable bin shipped by each independent asset-owner package. */
export async function runFileViewerAssetPackCli(packRootInput: string, args: string[]) {
  const packRoot = resolve(packRootInput);
  const packageJson = JSON.parse((await readNoFollow(resolve(packRoot, 'package.json'))).toString('utf8')) as {
    name: string;
    version: string;
  };
  const config = JSON.parse((await readNoFollow(resolve(packRoot, 'file-viewer.asset-pack.json'))).toString('utf8')) as {
    packageName: string;
    receiptFilename: string;
  };
  if (config.packageName !== packageJson.name) throw new Error(`Asset pack config drifted for ${packageJson.name}.`);
  let targetDir: string | undefined;
  let clean = false;
  let confirmClean = false;
  for (const arg of args) {
    if (arg === '--clean') clean = true;
    else if (arg === '--confirm') confirmClean = true;
    else if (arg === '--help' || arg === '-h') {
      return { help: true as const, text: `${packageJson.name} [target-directory] [--clean --confirm]\n` };
    } else if (arg.startsWith('-')) throw new Error(`Unknown option ${arg}.`);
    else if (targetDir) throw new Error('Only one target directory is supported.');
    else targetDir = arg;
  }
  const result = await installFileViewerCapabilityAssetPack({
    packageName: packageJson.name,
    packageVersion: packageJson.version,
    packRoot,
    receiptFilename: config.receiptFilename,
  }, { targetDir, clean, confirmClean });
  return { help: false as const, result };
}
