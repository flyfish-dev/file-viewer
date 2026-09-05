import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const EPUBJS_VERSION = '0.3.93';
const XMLDOM_VERSION = '0.9.12';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const packageRootArg = args.find(arg => arg.startsWith('--package-root='))?.split('=').slice(1).join('=');
const packageRoot = packageRootArg
  ? resolve(process.cwd(), packageRootArg)
  : resolve(scriptDir, '..');
const requireFromPackage = createRequire(join(packageRoot, 'package.json'));

const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const resolvePackageJson = packageName => requireFromPackage.resolve(`${packageName}/package.json`);

const epubPackagePath = resolvePackageJson('epubjs');
const xmlDomPackagePath = resolvePackageJson('@xmldom/xmldom');
const epubPackage = await readJson(epubPackagePath);
const xmlDomPackage = await readJson(xmlDomPackagePath);

if (epubPackage.version !== EPUBJS_VERSION) {
  throw new Error(`Expected epubjs ${EPUBJS_VERSION}, resolved ${epubPackage.version}.`);
}
if (xmlDomPackage.version !== XMLDOM_VERSION) {
  throw new Error(`Expected @xmldom/xmldom ${XMLDOM_VERSION}, resolved ${xmlDomPackage.version}.`);
}

const epubRoot = dirname(epubPackagePath);
const xmlDomRoot = await realpath(dirname(xmlDomPackagePath));
const epubEntry = resolve(epubRoot, epubPackage.module || epubPackage.main);
const xmlDomEntry = requireFromPackage.resolve('@xmldom/xmldom');
const esbuildEntry = requireFromPackage.resolve('esbuild');
const { build } = await import(pathToFileURL(esbuildEntry).href);

const outputDir = join(packageRoot, 'dist', 'vendor');
const outputPath = join(outputDir, 'epubjs.js');
const manifestPath = join(outputDir, 'epubjs.manifest.json');
const noticesPath = join(outputDir, 'epubjs.NOTICE.txt');
await mkdir(outputDir, { recursive: true });

const result = await build({
  absWorkingDir: packageRoot,
  banner: {
    js: `/* epubjs ${EPUBJS_VERSION} + @xmldom/xmldom ${XMLDOM_VERSION}; bundled for offline browser use */`,
  },
  bundle: true,
  entryPoints: [epubEntry],
  format: 'esm',
  legalComments: 'none',
  mainFields: ['browser', 'module', 'main'],
  metafile: true,
  minify: true,
  outfile: outputPath,
  platform: 'browser',
  plugins: [{
    name: 'pinned-xmldom',
    setup(buildContext) {
      buildContext.onResolve({ filter: /^@xmldom\/xmldom$/ }, () => ({ path: xmlDomEntry }));
    },
  }],
  sourcemap: false,
  target: ['es2019'],
  treeShaking: true,
});

const normalize = path => path.split(sep).join('/');
const xmlDomInputs = [];
const physicalInputs = [];
for (const input of Object.keys(result.metafile.inputs)) {
  const inputPath = isAbsolute(input) ? input : resolve(packageRoot, input);
  let resolvedInput = inputPath;
  try {
    resolvedInput = await realpath(inputPath);
    physicalInputs.push(resolvedInput);
  } catch {
    // esbuild can report virtual inputs; only physical xmldom files matter here.
  }
  const normalizedInput = normalize(resolvedInput);
  if (normalizedInput.includes('/@xmldom/xmldom/')) {
    xmlDomInputs.push(resolvedInput);
  }
}

if (!xmlDomInputs.length) {
  throw new Error('The bundled EPUB engine did not include @xmldom/xmldom.');
}
for (const input of xmlDomInputs) {
  const relativeInput = relative(xmlDomRoot, input);
  if (relativeInput.startsWith('..') || isAbsolute(relativeInput)) {
    throw new Error(`Unexpected @xmldom/xmldom input outside ${xmlDomRoot}: ${input}`);
  }
}

const externalImports = Object.values(result.metafile.outputs)
  .flatMap(output => output.imports)
  .filter(imported => imported.external);
if (externalImports.length) {
  throw new Error(`Bundled EPUB engine has external imports: ${externalImports.map(item => item.path).join(', ')}`);
}

const findOwnerPackage = async inputPath => {
  let current = dirname(inputPath);
  while (current !== dirname(current)) {
    const packagePath = join(current, 'package.json');
    try {
      const packageMetadata = await readJson(packagePath);
      if (packageMetadata.name && packageMetadata.version) {
        return { root: current, metadata: packageMetadata };
      }
    } catch {
      // Keep walking until the package owning this bundled source file is found.
    }
    current = dirname(current);
  }
  return null;
};

const bundledPackages = new Map();
for (const input of physicalInputs) {
  const owner = await findOwnerPackage(input);
  if (!owner || !normalize(owner.root).includes('/node_modules/')) {
    continue;
  }
  const key = `${owner.metadata.name}@${owner.metadata.version}`;
  if (bundledPackages.has(key)) {
    continue;
  }
  const entries = await readdir(owner.root, { withFileTypes: true });
  const licenseFiles = entries
    .filter(entry => entry.isFile() && /^(?:licen[cs]e|copying|notice)(?:[._-].*)?$/i.test(entry.name))
    .map(entry => entry.name)
    .sort((left, right) => left.localeCompare(right));
  const licenses = [];
  for (const filename of licenseFiles) {
    licenses.push({
      filename,
      text: (await readFile(join(owner.root, filename), 'utf8')).trim(),
    });
  }
  const repository = typeof owner.metadata.repository === 'string'
    ? owner.metadata.repository
    : owner.metadata.repository?.url;
  bundledPackages.set(key, {
    name: owner.metadata.name,
    version: owner.metadata.version,
    license: owner.metadata.license || 'UNSPECIFIED',
    repository: repository || owner.metadata.homepage || '',
    licenses,
  });
}

const sortedPackages = [...bundledPackages.values()].sort((left, right) => {
  return left.name.localeCompare(right.name) || left.version.localeCompare(right.version);
});
for (const requiredPackage of [
  ['epubjs', EPUBJS_VERSION],
  ['@xmldom/xmldom', XMLDOM_VERSION],
]) {
  const bundledPackage = sortedPackages.find(item => {
    return item.name === requiredPackage[0] && item.version === requiredPackage[1];
  });
  if (!bundledPackage?.licenses.length) {
    throw new Error(`Missing bundled license text for ${requiredPackage.join('@')}.`);
  }
}

const noticeSections = sortedPackages.map(item => {
  const header = [
    '='.repeat(72),
    `${item.name}@${item.version}`,
    `License: ${item.license}`,
    item.repository ? `Source: ${item.repository}` : null,
  ].filter(Boolean);
  const licenseSections = item.licenses.length
    ? item.licenses.flatMap(license => [
      '',
      `--- ${license.filename} ---`,
      license.text,
    ])
    : ['', 'No license file was present in the installed package; see the package metadata above.'];
  return [...header, ...licenseSections].join('\n');
});
const notices = [
  'File Viewer bundled EPUB engine: third-party notices',
  '',
  `This artifact bundles ${sortedPackages.length} npm packages for offline browser use.`,
  'The following notices are generated deterministically from the exact build inputs.',
  '',
  ...noticeSections,
  '',
].join('\n');
await writeFile(noticesPath, notices, 'utf8');

const output = await readFile(outputPath);
const sha256 = createHash('sha256').update(output).digest('hex');
const noticesSha256 = createHash('sha256').update(notices).digest('hex');
const packageJson = await readJson(join(packageRoot, 'package.json'));
const manifest = {
  schemaVersion: 1,
  packageName: packageJson.name,
  engine: 'epubjs',
  engineVersion: EPUBJS_VERSION,
  xmlDomVersion: XMLDOM_VERSION,
  bundled: true,
  lazyModule: './epubjs.js',
  thirdPartyNotices: './epubjs.NOTICE.txt',
  bytes: output.byteLength,
  sha256,
  noticesSha256,
  bundledPackages: sortedPackages.map(item => ({
    name: item.name,
    version: item.version,
    license: item.license,
  })),
};
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(
  `[epub-engine] Built ${packageJson.name} ${normalize(relative(packageRoot, outputPath))} ` +
  `(${output.byteLength} bytes, sha256 ${sha256.slice(0, 12)}, xmldom ${XMLDOM_VERSION}).`
);
