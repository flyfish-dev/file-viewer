import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import {
  access,
  chmod,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  writeFile
} from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import {
  createFileViewerInstallPlan,
  doctorFileViewerProject,
  detectPackageManager,
  executeFileViewerPlanStep,
  fileViewerOfflineTarballFilename,
  generateFileViewerIntegrationModule,
  initializeFileViewerProject,
  inferFileViewerLocalAssetBaseUrl,
  listFileViewerCapabilities,
  normalizeFileViewerConfig,
  patchFileViewerApplicationEntry,
  prepareFileViewerOfflineDirectory,
  reconcileFileViewerManagedDependencies,
  renderFileViewerCapabilityList,
  scaffoldFileViewerQuickstart,
  updateFileViewerProjectSelection
} from '../dist/index.js'
import { installFileViewerStandardAssets } from '@file-viewer/assets-standard'

const releaseCatalog = JSON.parse(
  await readFile(new URL('../catalog/catalog.json', import.meta.url), 'utf8')
)
const cliPackageVersion = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8')
).version
const copyAssetsPackageVersion = JSON.parse(
  await readFile(new URL('../../copy-assets/package.json', import.meta.url), 'utf8')
).version
const currentPackageVersions = new Map(
  [
    releaseCatalog.core,
    releaseCatalog.assetTool,
    ...Object.values(releaseCatalog.frameworks),
    ...Object.values(releaseCatalog.frameworkOverrides.full),
    ...releaseCatalog.profiles,
    ...releaseCatalog.capabilities
  ]
    .filter((item) => item?.packageName && item?.version)
    .map((item) => [item.packageName, item.version])
)
const currentVersionOf = (packageName) => {
  const version = currentPackageVersions.get(packageName)
  assert.ok(version, `Missing ${packageName} from the staged CLI catalog`)
  return version
}
const currentSpec = (packageName) => `${packageName}@${currentVersionOf(packageName)}`

test('offline tarball names cannot collide between scoped packages and compatibility aliases', () => {
  assert.equal(
    fileViewerOfflineTarballFilename('@file-viewer/cli', '2.4.0'),
    '%40file-viewer%2Fcli-2.4.0.tgz'
  )
  assert.equal(
    fileViewerOfflineTarballFilename('file-viewer-cli', '2.4.0'),
    'file-viewer-cli-2.4.0.tgz'
  )
  assert.notEqual(
    fileViewerOfflineTarballFilename('@file-viewer/cli', '2.4.0'),
    fileViewerOfflineTarballFilename('file-viewer-cli', '2.4.0')
  )
  assert.throws(
    () => fileViewerOfflineTarballFilename('@file-viewer/cli\u0000spoofed', '2.4.0'),
    /safe non-empty values/
  )
  assert.throws(
    () => fileViewerOfflineTarballFilename('file-viewer-cli', '2.4.0\\escape'),
    /safe non-empty values/
  )
})

test('standard plan includes PPTX without legacy PPT', async () => {
  const plan = await createFileViewerInstallPlan(
    { framework: 'vue3', profile: 'standard' },
    {
      packageManager: 'pnpm'
    }
  )
  assert.deepEqual(plan.packages, [
    '@file-viewer/core',
    '@file-viewer/vue3',
    '@file-viewer/preset-standard',
    '@file-viewer/assets-standard'
  ])
  assert.equal(plan.packages.includes('@file-viewer/renderer-ppt'), false)
  assert.match(plan.command, /^pnpm add /)
  assert.deepEqual(plan.packageSpecs, [
    currentSpec('@file-viewer/core'),
    currentSpec('@file-viewer/vue3'),
    currentSpec('@file-viewer/preset-standard'),
    currentSpec('@file-viewer/assets-standard')
  ])
  assert.deepEqual(plan.assetRendererIds, [
    'archive',
    'office-presentation',
    'office-word-openxml',
    'pdf',
    'spreadsheet-openxml'
  ])
  assert.deepEqual(plan.steps[0], {
    id: 'install',
    kind: 'install',
    command: 'pnpm',
    args: [
      'add',
      '--save-exact',
      '--ignore-scripts',
      currentSpec('@file-viewer/core'),
      currentSpec('@file-viewer/vue3'),
      currentSpec('@file-viewer/preset-standard'),
      currentSpec('@file-viewer/assets-standard')
    ],
    cwd: process.cwd()
  })
  assert.equal(plan.steps[1].command, 'file-viewer-assets-standard')
  assert.deepEqual(plan.steps[1].args, ['public/file-viewer'])
  assert.deepEqual(plan.steps[1].executableOwner, {
    packageName: '@file-viewer/assets-standard',
    packageVersion: currentVersionOf('@file-viewer/assets-standard'),
    bin: 'file-viewer-assets-standard'
  })
  assert.equal(plan.estimates.packedClosureBytes > 0, true)
  assert.equal(
    plan.licenseNotices.some((item) => item.packageName === '@file-viewer/capability-pptx-charts'),
    true
  )
})

test('explicit full preserves the published preset-all and aggregate asset contract', async () => {
  for (const framework of [
    'web',
    'vue3',
    'vue2.7',
    'vue2.6',
    'react',
    'react-legacy',
    'svelte',
    'jquery'
  ]) {
    const plan = await createFileViewerInstallPlan(
      { framework, profile: 'full' },
      { packageManager: 'npm' }
    )
    assert.deepEqual(plan.packages, [
      '@file-viewer/core',
      `@file-viewer/${framework}-full`,
      '@file-viewer/renderer-dicom',
      '@file-viewer/renderer-signature'
    ])
    assert.equal(plan.heavyCapabilities.includes('dicom'), true)
    assert.equal(plan.heavyCapabilities.includes('signature'), true)
    assert.equal(plan.heavyCapabilities.includes('cad'), true)
    assert.equal(plan.heavyCapabilities.includes('iwork'), true)
    assert.equal(
      plan.licenseNotices.some((item) => item.packageName === '@file-viewer/renderer-ppt'),
      true
    )
    assert.deepEqual(plan.assetPackages, [
      framework === 'web' ? '@file-viewer/web-full' : 'file-viewer-copy-assets'
    ])
    assert.equal(plan.steps.length, 2)
    assert.equal(plan.steps[1].command, 'file-viewer-copy-assets')
    assert.deepEqual(plan.steps[1].args, ['public/file-viewer'])
    assert.equal(
      plan.steps[1].executableOwner.packageName,
      framework === 'web' ? '@file-viewer/web-full' : 'file-viewer-copy-assets'
    )
  }
  const generated = await generateFileViewerIntegrationModule(process.cwd(), {
    framework: 'web',
    profile: 'full'
  })
  assert.match(
    generated.content,
    /fileViewerFullPreset as fileViewerProfilePreset.*@file-viewer\/web-full/
  )
  assert.match(
    generated.content,
    /dicomRenderer as fileViewerRenderer0.*@file-viewer\/renderer-dicom/
  )
  assert.match(
    generated.content,
    /signatureRenderer as fileViewerRenderer1.*@file-viewer\/renderer-signature/
  )

  const baselineSelection = await createFileViewerInstallPlan(
    { framework: 'web', profile: 'full', formats: ['dwg'] },
    { packageManager: 'npm' }
  )
  assert.deepEqual(baselineSelection.packages, [
    '@file-viewer/core',
    '@file-viewer/web-full',
    '@file-viewer/renderer-dicom',
    '@file-viewer/renderer-signature'
  ])
  assert.equal(baselineSelection.packages.includes('@file-viewer/renderer-cad'), false)
  const baselineGenerated = await generateFileViewerIntegrationModule(process.cwd(), {
    framework: 'web',
    profile: 'full',
    formats: ['dwg']
  })
  assert.doesNotMatch(baselineGenerated.content, /cadRenderer/)
})

test('Yarn Classic and Berry use generation-correct install settings and scaffolds', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-yarn-generations-'))
  try {
    const source = {
      kind: 'registry',
      registry: 'https://registry.example.test',
      cacheDir: '.cache/file-viewer',
      concurrency: 6
    }
    const classic = await createFileViewerInstallPlan(
      {
        framework: 'web',
        profile: 'custom',
        formats: ['svg'],
        packageManager: 'yarn',
        packageManagerVersion: '1.22.22',
        source
      },
      { projectRoot: root }
    )
    assert.equal(classic.packageManagerVersion, '1.22.22')
    assert.equal(classic.steps[0].command, 'yarn')
    assert.equal(classic.steps[0].expectedExecutableVersion, '1.22.22')
    assert.equal(classic.steps[0].args.includes('--registry'), true)
    assert.equal(
      classic.steps[0].args[classic.steps[0].args.indexOf('--registry') + 1],
      'https://registry.example.test/'
    )
    assert.equal(classic.steps[0].args.includes('--network-concurrency'), true)
    assert.match(classic.steps[0].env.YARN_CACHE_FOLDER, /\.cache\/file-viewer$/)
    assert.equal(classic.steps[0].env.YARN_NETWORK_CONCURRENCY, undefined)

    const loopbackClassic = await createFileViewerInstallPlan(
      {
        framework: 'web',
        profile: 'lite',
        packageManager: 'yarn',
        packageManagerVersion: '1.22.22',
        source: { kind: 'registry', registry: 'http://127.0.0.1:4873' }
      },
      { projectRoot: root }
    )
    assert.deepEqual(loopbackClassic.steps[0].args.slice(2, 4), [
      '--registry',
      'http://127.0.0.1:4873/'
    ])
    for (const name of [
      'npm_config_proxy',
      'npm_config_https_proxy',
      'HTTP_PROXY',
      'HTTPS_PROXY',
      'ALL_PROXY',
      'http_proxy',
      'https_proxy',
      'all_proxy'
    ])
      assert.equal(loopbackClassic.steps[0].env[name], '')
    assert.match(loopbackClassic.steps[0].env.NO_PROXY, /127\.0\.0\.1/)
    assert.equal(loopbackClassic.steps[0].env.no_proxy, loopbackClassic.steps[0].env.NO_PROXY)
    assert.equal(classic.steps[0].env.npm_config_proxy, undefined)
    assert.equal(classic.steps[0].env.NO_PROXY, undefined)

    const berryConfig = {
      framework: 'web',
      profile: 'custom',
      formats: ['svg'],
      packageManager: 'yarn',
      packageManagerVersion: '4.9.2',
      source
    }
    const berry = await createFileViewerInstallPlan(berryConfig, { projectRoot: root })
    assert.equal(berry.packageManagerVersion, '4.9.2')
    assert.equal(berry.steps[0].expectedExecutableVersion, '4.9.2')
    assert.equal(berry.steps[0].args.includes('--registry'), false)
    assert.equal(berry.steps[0].args.includes('--network-concurrency'), false)
    assert.equal(berry.steps[0].env.YARN_NETWORK_CONCURRENCY, '6')
    assert.equal(berry.steps[0].env.YARN_CHILD_CONCURRENCY, undefined)
    assert.equal(berry.steps[0].env.YARN_ENABLE_GLOBAL_CACHE, 'true')
    assert.match(berry.steps[0].env.YARN_GLOBAL_FOLDER, /\.cache\/file-viewer$/)
    assert.equal(berry.steps[0].env.YARN_CACHE_FOLDER, undefined)
    assert.equal(berry.steps[0].env.npm_config_proxy, undefined)
    assert.equal(berry.steps[0].env.NO_PROXY, undefined)

    await scaffoldFileViewerQuickstart(root, berryConfig, { write: true })
    assert.equal(
      JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).packageManager,
      'yarn@4.9.2'
    )
    assert.match(await readFile(join(root, '.yarnrc.yml'), 'utf8'), /nodeLinker: node-modules/)

    const acceptedCalls = []
    const accepted = executeFileViewerPlanStep(berry.steps[0], {
      confirmed: true,
      runner: (command, args) => {
        acceptedCalls.push({ command, args })
        return args[0] === '--version'
          ? { status: 0, stdout: '4.9.2\n', error: undefined }
          : { status: 0, stdout: '', error: undefined }
      }
    })
    assert.equal(accepted.executed, true)
    assert.deepEqual(
      acceptedCalls.map((call) => call.args[0]),
      ['--version', 'add']
    )
    let mismatchedCalls = 0
    assert.throws(
      () =>
        executeFileViewerPlanStep(berry.steps[0], {
          confirmed: true,
          runner: () => {
            mismatchedCalls += 1
            return { status: 0, stdout: '1.22.22\n', error: undefined }
          }
        }),
      /resolved to 1\.22\.22; expected exact 4\.9\.2/
    )
    assert.equal(mismatchedCalls, 1)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('registry preparation is bounded and uses explicit cache settings without a shell', async () => {
  const plan = await createFileViewerInstallPlan(
    {
      framework: 'react',
      profile: 'standard',
      source: {
        kind: 'registry',
        registry: 'https://registry.example.invalid/npm',
        cacheDir: '.cache/file-viewer',
        concurrency: 4
      }
    },
    { packageManager: 'pnpm', projectRoot: '/tmp/file-viewer-project' }
  )
  assert.deepEqual(plan.steps[0].args.slice(0, 9), [
    'add',
    '--save-exact',
    '--ignore-scripts',
    '--registry',
    'https://registry.example.invalid/npm/',
    '--store-dir',
    '/tmp/file-viewer-project/.cache/file-viewer',
    '--network-concurrency',
    '4'
  ])
  const yarnPlan = await createFileViewerInstallPlan(
    {
      framework: 'react',
      profile: 'standard',
      source: {
        kind: 'registry',
        registry: 'https://registry.example.invalid/npm',
        cacheDir: '.cache/yarn',
        concurrency: 3
      }
    },
    { packageManager: 'yarn', projectRoot: '/tmp/file-viewer-yarn-project' }
  )
  assert.equal(yarnPlan.steps[0].args.includes('--registry'), true)
  assert.equal(
    yarnPlan.steps[0].args[yarnPlan.steps[0].args.indexOf('--registry') + 1],
    'https://registry.example.invalid/npm/'
  )
  assert.equal(yarnPlan.steps[0].args.includes('--cache-folder'), false)
  assert.equal(yarnPlan.steps[0].env.npm_config_registry, 'https://registry.example.invalid/npm/')
  assert.equal(
    yarnPlan.steps[0].env.YARN_NPM_REGISTRY_SERVER,
    'https://registry.example.invalid/npm/'
  )
  assert.equal(yarnPlan.steps[0].env.YARN_CACHE_FOLDER, '/tmp/file-viewer-yarn-project/.cache/yarn')
})

test('quickstart scaffold is runnable-shaped, idempotent, and fails before partial writes on conflicts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-create-'))
  try {
    const first = await scaffoldFileViewerQuickstart(
      root,
      { framework: 'web', profile: 'standard' },
      { write: true }
    )
    assert.equal(
      first.files.every((file) => file.written),
      true
    )
    assert.match(await readFile(join(root, 'src/main.mjs'), 'utf8'), /flyfish-file-viewer/)
    assert.match(
      await readFile(join(root, 'src/main.mjs'), 'utf8'),
      /setAttribute\('src', "\/sample\.pdf"\)/
    )
    assert.match(await readFile(join(root, 'public/sample.pdf'), 'ascii'), /^%PDF-1\.4/)
    const second = await scaffoldFileViewerQuickstart(
      root,
      { framework: 'web', profile: 'standard' },
      { write: true }
    )
    assert.equal(
      second.files.every((file) => !file.changed),
      true
    )
    await writeFile(join(root, 'index.html'), 'user-owned')
    await rm(join(root, 'package.json'))
    await assert.rejects(
      scaffoldFileViewerQuickstart(
        root,
        { framework: 'web', profile: 'standard' },
        { write: true }
      ),
      /No files were written/
    )
    assert.equal(await readFile(join(root, 'index.html'), 'utf8'), 'user-owned')
    await assert.rejects(access(join(root, 'package.json')))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('quickstart samples match lite, engineering, custom, and PDF-capable profiles', async () => {
  const cases = [
    [{ framework: 'web', profile: 'standard' }, 'sample.pdf', /^%PDF-1\.4/],
    [{ framework: 'web', profile: 'office' }, 'sample.pdf', /^%PDF-1\.4/],
    [{ framework: 'web', profile: 'all' }, 'sample.pdf', /^%PDF-1\.4/],
    [{ framework: 'web', profile: 'full' }, 'sample.pdf', /^%PDF-1\.4/],
    [{ framework: 'web', profile: 'lite' }, 'sample.svg', /<svg[^>]+File Viewer|<svg/],
    [
      { framework: 'web', profile: 'engineering' },
      'sample.obj',
      /^# File Viewer quickstart triangle/
    ],
    [
      { framework: 'web', profile: 'custom', formats: ['md'] },
      'sample.md',
      /^# File Viewer quickstart/
    ],
    [
      { framework: 'web', profile: 'custom', capabilities: ['cad'] },
      'sample.dxf',
      /SECTION[\s\S]+ENTITIES/
    ]
  ]
  for (const [config, filename, contentPattern] of cases) {
    const root = await mkdtemp(join(tmpdir(), `file-viewer-sample-${config.profile}-`))
    try {
      const result = await scaffoldFileViewerQuickstart(root, config, { write: true })
      assert.equal(result.sample.filename, filename)
      assert.match(
        await readFile(join(root, 'src/main.mjs'), 'utf8'),
        new RegExp(`/${filename.replace('.', '\\.')}`)
      )
      assert.match(await readFile(join(root, 'public', filename), 'utf8'), contentPattern)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }
})

test('empty custom quickstart and plan fail before writing any file', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-empty-custom-'))
  try {
    await assert.rejects(
      createFileViewerInstallPlan({ framework: 'web', profile: 'custom' }),
      /requires at least one --format or --capability.*No files were written/
    )
    await assert.rejects(
      scaffoldFileViewerQuickstart(root, { framework: 'web', profile: 'custom' }, { write: true }),
      /requires at least one --format or --capability.*No files were written/
    )
    assert.deepEqual(await readdir(root), [])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('custom capabilities without bundled fixtures generate a runnable matching file picker', async () => {
  for (const format of ['docx', 'xlsx', 'pptx', 'dcm', 'zip', 'mp4']) {
    const root = await mkdtemp(join(tmpdir(), `file-viewer-custom-picker-${format}-`))
    try {
      const result = await scaffoldFileViewerQuickstart(
        root,
        { framework: 'web', profile: 'custom', formats: [format] },
        { write: true }
      )
      assert.equal(result.sample.picker.accept.split(',').includes(`.${format}`), true)
      const entry = await readFile(join(root, 'src/main.mjs'), 'utf8')
      assert.match(entry, /input\.type = 'file'/)
      assert.match(entry, /viewer\.file = file/)
      assert.equal((await readdir(join(root, 'public')).catch(() => [])).length, 0)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }
})

test('framework versions are catalog-validated and generate major-correct Svelte templates', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-framework-version-'))
  try {
    const classic = await scaffoldFileViewerQuickstart(
      root,
      { framework: 'svelte', frameworkVersion: '4.2.20' },
      { write: true }
    )
    assert.equal(classic.frameworkVersion, '4.2.20')
    assert.match(await readFile(join(root, 'src/main.mjs'), 'utf8'), /new App/)
    assert.match(
      await readFile(join(root, 'src/App.svelte'), 'utf8'),
      /@file-viewer\/svelte\/action/
    )
    assert.match(await readFile(join(root, 'vite.config.mjs'), 'utf8'), /vite-plugin-svelte/)
    const classicPackage = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
    assert.equal(classicPackage.devDependencies['@sveltejs/vite-plugin-svelte'], '3.1.2')
    assert.equal(classicPackage.devDependencies.vite, '5.4.21')
    await assert.rejects(
      scaffoldFileViewerQuickstart(root, { framework: 'svelte', frameworkVersion: '4.0.0' }),
      /Validated versions: 3\.59\.2, 4\.2\.20, 5\.56\.3/
    )
    await rm(join(root, 'src'), { recursive: true, force: true })
    await rm(join(root, 'package.json'), { force: true })
    await rm(join(root, 'index.html'), { force: true })
    const modern = await scaffoldFileViewerQuickstart(
      root,
      { framework: 'svelte', frameworkVersion: '5.56.3' },
      { write: true }
    )
    assert.equal(modern.frameworkVersion, '5.56.3')
    assert.match(
      await readFile(join(root, 'src/main.mjs'), 'utf8'),
      /import \{ mount \} from 'svelte'/
    )
    const modernPackage = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
    assert.equal(modernPackage.devDependencies['@sveltejs/vite-plugin-svelte'], '7.0.0')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('quickstart templates use the actual public component contracts', async () => {
  for (const [framework, expected] of [
    ['web', /defineFileViewerElement\(\)/],
    ['vue2.6', /import \{ FileViewer \} from "@file-viewer\/vue2\.6"/],
    ['vue2.7', /import \{ FileViewer \} from "@file-viewer\/vue2\.7"/]
  ]) {
    const root = await mkdtemp(join(tmpdir(), `file-viewer-${framework}-`))
    try {
      await scaffoldFileViewerQuickstart(root, { framework, profile: 'standard' }, { write: true })
      const entry = await readFile(join(root, 'src/main.mjs'), 'utf8')
      assert.match(entry, expected)
      assert.match(entry, /\/sample\.pdf/)
      assert.match(await readFile(join(root, 'public/sample.pdf'), 'ascii'), /^%PDF-1\.4/)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }
})

test('Svelte full generated preset imports the action entry', async () => {
  const generated = await generateFileViewerIntegrationModule(process.cwd(), {
    framework: 'svelte',
    profile: 'full'
  })
  assert.match(generated.content, /@file-viewer\/svelte-full\/action/)
  assert.doesNotMatch(generated.content, /from "@file-viewer\/svelte-full"/)
})

test('explicit asset base URL is validated, normalized, persisted, and generated through the core API', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-asset-base-'))
  try {
    const initialized = await initializeFileViewerProject(
      root,
      { assetBaseUrl: 'https://cdn.example.test/viewer' },
      { write: true }
    )
    assert.equal(initialized.config.assetBaseUrl, 'https://cdn.example.test/viewer/')
    const generated = await generateFileViewerIntegrationModule(root, initialized.config)
    assert.match(
      generated.content,
      /setDefaultFileViewerAssetBaseUrl\("https:\/\/cdn\.example\.test\/viewer\/"\)/
    )
    assert.throws(
      () => normalizeFileViewerConfig({ assetBaseUrl: 'javascript:alert(1)' }),
      /assetBaseUrl/
    )
    assert.throws(
      () => normalizeFileViewerConfig({ assetBaseUrl: '//evil.example/viewer' }),
      /assetBaseUrl/
    )
    assert.throws(
      () =>
        normalizeFileViewerConfig({ assetBaseUrl: 'https://user:pass@cdn.example.test/viewer' }),
      /assetBaseUrl/
    )
    assert.throws(() => normalizeFileViewerConfig({ assetBaseUrl: '/safe\\evil' }), /assetBaseUrl/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('local asset targets generate their deterministic public browser base URL', async () => {
  assert.equal(inferFileViewerLocalAssetBaseUrl('public/file-viewer'), '/file-viewer/')
  assert.equal(
    inferFileViewerLocalAssetBaseUrl(
      'client/public-assets/nested/file-viewer',
      'client/public-assets'
    ),
    '/nested/file-viewer/'
  )
  assert.equal(inferFileViewerLocalAssetBaseUrl('dist/file-viewer'), undefined)
  const generated = await generateFileViewerIntegrationModule(process.cwd(), {
    framework: 'web',
    profile: 'standard',
    assetTarget: 'public/file-viewer'
  })
  assert.match(
    generated.content,
    /setDefaultFileViewerAssetBaseUrl\("\/file-viewer\/"\)/
  )
})

test('config and generated module writes stay contained and preserve user-owned files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-contained-config-'))
  try {
    await assert.rejects(
      initializeFileViewerProject(root, {}, { configFile: '../outside.json', write: true }),
      /configFile must be a contained project-relative path/
    )
    await writeFile(join(root, 'file-viewer.generated.mjs'), 'export const userOwned = true\n')
    await assert.rejects(
      generateFileViewerIntegrationModule(root, {}, { write: true }),
      /Refusing to overwrite user-owned generatedModule/
    )
    const forced = await generateFileViewerIntegrationModule(root, {}, { write: true, force: true })
    assert.equal(forced.written, true)
    assert.match(
      await readFile(join(root, 'file-viewer.generated.mjs'), 'utf8'),
      /^\/\/ Generated by @file-viewer\/cli\./
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('local tarball source verifies sha512 and resolves the complete File Viewer closure without registry fallback', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-offline-'))
  const offline = join(root, 'offline')
  const coreVersion = currentVersionOf('@file-viewer/core')
  const webVersion = currentVersionOf('@file-viewer/web')
  const imageVersion = currentVersionOf('@file-viewer/renderer-image')
  const copyAssetsVersion = copyAssetsPackageVersion
  const webArchiveName = `file-viewer-web-${webVersion}.tgz`
  const carrierArchiveName = `file-viewer-copy-assets-${copyAssetsVersion}.tgz`
  try {
    await mkdir(offline, { recursive: true })
    const files = {}
    for (const manifest of [
      { name: '@file-viewer/core', version: coreVersion },
      {
        name: '@file-viewer/web',
        version: webVersion,
        dependencies: {
          '@file-viewer/core': `^${coreVersion}`,
          'file-viewer-copy-assets': copyAssetsVersion
        }
      },
      {
        name: '@file-viewer/renderer-image',
        version: imageVersion,
        dependencies: { '@file-viewer/core': `^${coreVersion}` }
      },
      {
        name: 'file-viewer-copy-assets',
        version: copyAssetsVersion,
        type: 'module',
        exports: { '.': './dist/index.js', './package.json': './package.json' }
      }
    ]) {
      const stageName = manifest.name.endsWith('/core')
        ? 'core-stage'
        : manifest.name.endsWith('/renderer-image')
          ? 'image-stage'
          : manifest.name === 'file-viewer-copy-assets'
            ? 'copy-stage'
            : 'web-stage'
      const stage = join(root, stageName, 'package')
      await mkdir(stage, { recursive: true })
      await writeFile(join(stage, 'package.json'), JSON.stringify(manifest))
      if (manifest.name === 'file-viewer-copy-assets') {
        await mkdir(join(stage, 'dist'), { recursive: true })
        await writeFile(
          join(stage, 'dist/index.js'),
          `import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
export const parseCopyAssetsCliArguments = (argv) => ({ mode: 'copy', targetDir: argv.find((item) => !item.startsWith('-')), rendererIds: [] })
export const copyFileViewerAssets = async ({ targetDir }) => {
  const target = resolve(targetDir)
  await mkdir(target, { recursive: true })
  await writeFile(resolve(target, 'offline-carrier.txt'), 'verified')
  return { targetDir: target, assetManifestPath: resolve(target, 'flyfish-viewer-assets.json'), validation: { missingOptional: [] } }
}
`
        )
      }
      const filename = manifest.name.endsWith('/core')
        ? `file-viewer-core-${manifest.version}.tgz`
        : manifest.name.endsWith('/renderer-image')
          ? `file-viewer-renderer-image-${manifest.version}.tgz`
          : manifest.name === 'file-viewer-copy-assets'
            ? `file-viewer-copy-assets-${manifest.version}.tgz`
            : `file-viewer-web-${manifest.version}.tgz`
      const archive = join(offline, filename)
      const packed = spawnSync('tar', ['-czf', archive, '-C', join(stage, '..'), 'package'], {
        encoding: 'utf8'
      })
      assert.equal(packed.status, 0, packed.stderr)
      files[filename] = {
        integrity: `sha512-${createHash('sha512')
          .update(await readFile(archive))
          .digest('base64')}`,
        packageName: manifest.name,
        version: manifest.version,
        dependencies: manifest.dependencies ?? {}
      }
    }
    await writeFile(
      join(offline, 'file-viewer-offline-manifest.json'),
      JSON.stringify({ schemaVersion: 1, files })
    )
    const plan = await createFileViewerInstallPlan(
      {
        framework: 'web',
        profile: 'custom',
        formats: ['svg'],
        source: { kind: 'offline-directory', directory: 'offline' }
      },
      { projectRoot: root, packageManager: 'npm' }
    )
    assert.equal(plan.packageSpecs.length, 4)
    assert.equal(
      plan.packageSpecs.some((spec) =>
        spec.endsWith(`file-viewer-copy-assets-${copyAssetsVersion}.tgz`)
      ),
      true
    )
    assert(plan.steps[0].args.includes('--offline'))
    const bunPlan = await createFileViewerInstallPlan(
      {
        framework: 'web',
        profile: 'custom',
        formats: ['svg'],
        source: { kind: 'offline-directory', directory: 'offline' }
      },
      { projectRoot: root, packageManager: 'bun' }
    )
    assert.equal(bunPlan.steps[0].args.includes('--offline'), false)
    const classicPlan = await createFileViewerInstallPlan(
      {
        framework: 'web',
        profile: 'custom',
        formats: ['svg'],
        packageManager: 'yarn',
        packageManagerVersion: '1.22.22',
        source: { kind: 'offline-directory', directory: 'offline' }
      },
      { projectRoot: root }
    )
    assert.equal(classicPlan.steps[0].args.includes('--offline'), true)
    const berryPlan = await createFileViewerInstallPlan(
      {
        framework: 'web',
        profile: 'custom',
        formats: ['svg'],
        packageManager: 'yarn',
        packageManagerVersion: '4.9.2',
        source: { kind: 'offline-directory', directory: 'offline' }
      },
      { projectRoot: root }
    )
    assert.equal(berryPlan.steps[0].args.includes('--offline'), false)
    assert.equal(berryPlan.steps[0].env.YARN_ENABLE_NETWORK, 'false')

    await initializeFileViewerProject(
      root,
      {
        framework: 'web',
        profile: 'custom',
        formats: ['svg'],
        packageManager: 'npm',
        source: { kind: 'offline-directory', directory: 'offline' }
      },
      { write: true }
    )
    const offlineDependencies = Object.fromEntries(
      plan.requiredPackages.map((required) => {
        const archive = Object.entries(files).find(
          ([, metadata]) => metadata.packageName === required.packageName
        )?.[0]
        assert(archive, `Missing offline fixture for ${required.packageName}`)
        return [required.packageName, `file:${join(offline, archive)}`]
      })
    )
    await writeFile(join(root, 'package.json'), JSON.stringify({ dependencies: offlineDependencies }))
    await mockResolvedPackages(root, plan)
    const offlineDoctor = await doctorFileViewerProject(root)
    assert.equal(
      offlineDoctor.errors.some(
        (error) => error.startsWith('Dependency ') || error.startsWith('Could not resolve installed ')
      ),
      false,
      offlineDoctor.errors.join('\n')
    )
    const firstRequired = plan.requiredPackages[0]
    const wrongArchive = Object.entries(files).find(
      ([, metadata]) => metadata.packageName !== firstRequired.packageName
    )?.[0]
    assert(wrongArchive)
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({
        dependencies: {
          ...offlineDependencies,
          [firstRequired.packageName]: `file:${join(offline, wrongArchive)}`
        }
      })
    )
    const wrongOfflineTarball = await doctorFileViewerProject(root)
    assert.equal(wrongOfflineTarball.ok, false)
    assert.equal(
      wrongOfflineTarball.errors.some((error) =>
        error.includes('must reference its verified offline tarball')
      ),
      true
    )
    await writeFile(join(root, 'package.json'), JSON.stringify({ dependencies: offlineDependencies }))
    const cli = new URL('../dist/cli.js', import.meta.url)
    const tuned = spawnSync(
      process.execPath,
      [
        cli.pathname,
        'install',
        '--project',
        root,
        '--concurrency',
        '4',
        '--cache-dir',
        '.cache/offline',
        '--yes',
        '--dry-run',
        '--json'
      ],
      { cwd: root, encoding: 'utf8', shell: false }
    )
    assert.equal(tuned.status, 0, tuned.stderr)
    const tunedResult = JSON.parse(tuned.stdout)
    assert.equal(
      tunedResult.plan.packageSpecs.every((spec) => spec.startsWith('/')),
      true
    )
    assert.equal(tunedResult.plan.steps[0].args.includes('--offline'), true)

    const offlineTarget = join(root, 'offline-copy-target')
    const offlineCopy = spawnSync(
      process.execPath,
      [cli.pathname, 'copy-assets', '--project', root, '--offline-dir', offline, offlineTarget],
      {
        cwd: root,
        encoding: 'utf8',
        shell: false,
        env: {
          ...process.env,
          npm_config_registry: 'http://127.0.0.1:9',
          npm_config_proxy: 'http://127.0.0.1:9',
          npm_config_https_proxy: 'http://127.0.0.1:9'
        }
      }
    )
    assert.equal(offlineCopy.status, 0, offlineCopy.stderr)
    assert.equal(await readFile(join(offlineTarget, 'offline-carrier.txt'), 'utf8'), 'verified')

    const offlineLink = join(root, 'offline-link')
    await symlink(offline, offlineLink)
    const linkedDirectory = spawnSync(
      process.execPath,
      [cli.pathname, 'copy-assets', '--project', root, '--offline-dir', offlineLink, offlineTarget],
      { cwd: root, encoding: 'utf8', shell: false }
    )
    assert.equal(linkedDirectory.status, 1)
    assert.match(linkedDirectory.stderr, /Offline directory is not a regular directory/)

    const manifestPath = join(offline, 'file-viewer-offline-manifest.json')
    const physicalManifestPath = join(offline, 'file-viewer-offline-manifest.real.json')
    await rename(manifestPath, physicalManifestPath)
    await symlink(physicalManifestPath, manifestPath)
    const linkedManifest = spawnSync(
      process.execPath,
      [cli.pathname, 'copy-assets', '--project', root, '--offline-dir', offline, offlineTarget],
      { cwd: root, encoding: 'utf8', shell: false }
    )
    assert.equal(linkedManifest.status, 1)
    assert.match(linkedManifest.stderr, /Offline manifest is not a regular file/)
    await rm(manifestPath)
    await rename(physicalManifestPath, manifestPath)

    const webArchive = join(offline, webArchiveName)
    const physicalWebArchive = join(offline, `file-viewer-web-${webVersion}.real`)
    await rename(webArchive, physicalWebArchive)
    await symlink(physicalWebArchive, webArchive)
    await assert.rejects(
      createFileViewerInstallPlan(
        {
          framework: 'web',
          profile: 'custom',
          formats: ['svg'],
          source: { kind: 'offline-directory', directory: 'offline' }
        },
        { projectRoot: root }
      ),
      /not a regular file/
    )
    await rm(webArchive)
    await rename(physicalWebArchive, webArchive)

    const carrierArchive = join(offline, carrierArchiveName)
    const physicalCarrierArchive = join(
      offline,
      `file-viewer-copy-assets-${copyAssetsVersion}.real`
    )
    await rename(carrierArchive, physicalCarrierArchive)
    await symlink(physicalCarrierArchive, carrierArchive)
    const linkedCarrier = spawnSync(
      process.execPath,
      [cli.pathname, 'copy-assets', '--project', root, '--offline-dir', offline, offlineTarget],
      { cwd: root, encoding: 'utf8', shell: false }
    )
    assert.equal(linkedCarrier.status, 1)
    assert.match(linkedCarrier.stderr, /not a regular file/)
    await rm(carrierArchive)
    await rename(physicalCarrierArchive, carrierArchive)

    await writeFile(
      manifestPath,
      JSON.stringify({
        schemaVersion: 1,
        files: {
          ...files,
          [carrierArchiveName]: {
            ...files[carrierArchiveName],
            dependencies: { '@file-viewer/untrusted': coreVersion }
          }
        }
      })
    )
    const dependencyMismatch = spawnSync(
      process.execPath,
      [cli.pathname, 'copy-assets', '--project', root, '--offline-dir', offline, offlineTarget],
      { cwd: root, encoding: 'utf8', shell: false }
    )
    assert.equal(dependencyMismatch.status, 1)
    assert.match(dependencyMismatch.stderr, /dependency metadata mismatch/)

    await writeFile(
      manifestPath,
      JSON.stringify({
        schemaVersion: 1,
        files: {
          ...files,
          [webArchiveName]: {
            ...files[webArchiveName],
            packageName: '@file-viewer/not-web'
          }
        }
      })
    )
    await assert.rejects(
      createFileViewerInstallPlan(
        {
          framework: 'web',
          profile: 'custom',
          formats: ['svg'],
          source: { kind: 'offline-directory', directory: 'offline' }
        },
        { projectRoot: root }
      ),
      /identity mismatch/
    )
    await writeFile(
      manifestPath,
      JSON.stringify({
        schemaVersion: 1,
        files: { ...files, [webArchiveName]: { integrity: 'sha512-invalid' } }
      })
    )
    await assert.rejects(
      createFileViewerInstallPlan(
        {
          framework: 'web',
          profile: 'custom',
          formats: ['svg'],
          source: { kind: 'offline-directory', directory: 'offline' }
        },
        { projectRoot: root }
      ),
      /integrity mismatch/
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('prepare builds and reuses an atomic verified File Viewer-owned closure', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-prepare-'))
  const fixtureDir = join(root, 'fixtures')
  const binDir = join(root, 'bin')
  const previousPath = process.env.PATH
  const previousFixtureDir = process.env.FILE_VIEWER_TEST_PACK_FIXTURES
  try {
    await mkdir(fixtureDir, { recursive: true })
    await mkdir(binDir, { recursive: true })
    for (const manifest of [
      {
        name: '@file-viewer/web',
        version: '2.4.0',
        dependencies: { 'file-viewer-copy-assets': '2.4.0' }
      },
      { name: 'file-viewer-copy-assets', version: '2.4.0' }
    ]) {
      const key = manifest.name === '@file-viewer/web' ? 'web' : 'copy'
      const stage = join(root, `${key}-stage`, 'package')
      await mkdir(stage, { recursive: true })
      await writeFile(join(stage, 'package.json'), JSON.stringify(manifest))
      const filename = `${key}-2.4.0.tgz`
      const packed = spawnSync(
        'tar',
        ['-czf', join(fixtureDir, filename), '-C', join(stage, '..'), 'package'],
        { encoding: 'utf8' }
      )
      assert.equal(packed.status, 0, packed.stderr)
    }
    const fakeNpm = join(binDir, 'npm')
    await writeFile(
      fakeNpm,
      `#!/usr/bin/env node
const { copyFileSync } = require('node:fs');
const { join } = require('node:path');
const args = process.argv.slice(2);
const spec = args[0] === 'view' ? args[1] : args.at(-1);
const manifest = spec.startsWith('@file-viewer/web@')
  ? { name: '@file-viewer/web', version: '2.4.0', dependencies: { 'file-viewer-copy-assets': '2.4.0' } }
  : spec.startsWith('file-viewer-copy-assets@')
    ? { name: 'file-viewer-copy-assets', version: '2.4.0', dependencies: {} }
    : null;
if (!manifest) process.exit(9);
if (args[0] === 'view') {
  process.stdout.write(JSON.stringify(manifest));
} else {
  const destination = args[args.indexOf('--pack-destination') + 1];
  const filename = manifest.name === '@file-viewer/web' ? 'web-2.4.0.tgz' : 'copy-2.4.0.tgz';
  copyFileSync(join(process.env.FILE_VIEWER_TEST_PACK_FIXTURES, filename), join(destination, filename));
  process.stdout.write(JSON.stringify([{ filename, name: manifest.name, version: manifest.version }]));
}
`
    )
    await chmod(fakeNpm, 0o755)
    process.env.PATH = `${binDir}:${previousPath}`
    process.env.FILE_VIEWER_TEST_PACK_FIXTURES = fixtureDir
    const options = {
      projectRoot: root,
      directory: 'offline',
      registry: 'https://registry.example.test/npm',
      concurrency: 2
    }
    const first = await prepareFileViewerOfflineDirectory(
      [{ packageName: '@file-viewer/web', version: '2.4.0' }],
      options
    )
    assert.equal(first.reused, false)
    assert.deepEqual(
      Object.values(first.manifest.files)
        .map((item) => item.packageName)
        .sort(),
      ['@file-viewer/web', 'file-viewer-copy-assets']
    )
    const second = await prepareFileViewerOfflineDirectory(
      [{ packageName: '@file-viewer/web', version: '2.4.0' }],
      options
    )
    assert.equal(second.reused, true)
    assert.equal(
      await access(join(root, 'offline', 'file-viewer-offline-manifest.json')).then(() => true),
      true
    )
    await writeFile(join(root, 'offline', 'unexpected.tgz'), 'not part of the signed manifest')
    await assert.rejects(
      prepareFileViewerOfflineDirectory(
        [{ packageName: '@file-viewer/web', version: '2.4.0' }],
        options
      ),
      /Refusing to replace non-matching offline directory/
    )
    await rm(join(root, 'offline', 'unexpected.tgz'))
    await assert.rejects(
      prepareFileViewerOfflineDirectory(
        [{ packageName: '@file-viewer/missing', version: '2.4.0' }],
        { ...options, directory: 'offline-fail' }
      ),
      /failed with status 9/
    )
    assert.equal(existsSync(join(root, 'offline-fail')), false)
    assert.equal(
      (await readdir(root)).some((name) => name.startsWith('.file-viewer-offline-')),
      false
    )
  } finally {
    process.env.PATH = previousPath
    if (previousFixtureDir === undefined) delete process.env.FILE_VIEWER_TEST_PACK_FIXTURES
    else process.env.FILE_VIEWER_TEST_PACK_FIXTURES = previousFixtureDir
    await rm(root, { recursive: true, force: true })
  }
})

test('lists deterministic opt-in metadata without installing anything', async () => {
  const listed = await listFileViewerCapabilities()
  const ids = listed.capabilities.map((item) => item.id)
  assert.deepEqual(ids, [...ids].sort())
  const cad = listed.capabilities.find((item) => item.id === 'cad')
  assert.equal(cad.weight, 'heavy')
  assert.match(cad.packageSpec, /^@file-viewer\/renderer-cad@/)
  assert.match(cad.assetPackageSpec, /^@file-viewer\/assets-cad@/)
  const dicom = listed.capabilities.find((item) => item.id === 'dicom')
  assert.ok(dicom)
  assert.equal(dicom.packageSpec, currentSpec('@file-viewer/renderer-dicom'))
  assert.equal(dicom.weight, 'heavy')
  assert.equal(dicom.availability, 'explicit opt-in')
  assert.equal(dicom.assetPackageSpec, null)
  const signature = listed.capabilities.find((item) => item.id === 'signature')
  assert.ok(signature)
  assert.equal(signature.packageSpec, currentSpec('@file-viewer/renderer-signature'))
  assert.equal(signature.weight, 'heavy')
  assert.equal(signature.availability, 'explicit opt-in')
  assert.equal(signature.assetPackageSpec, null)
  assert.match(renderFileViewerCapabilityList(listed), /weight=heavy/)
})

test('DICOM stays outside standard until explicitly selected and generates its exact renderer export', async () => {
  const plan = await createFileViewerInstallPlan(
    { framework: 'web', profile: 'standard', formats: ['dcm'] },
    {
      packageManager: 'npm'
    }
  )
  assert.deepEqual(plan.capabilityPackages, ['@file-viewer/renderer-dicom'])
  assert.deepEqual(plan.heavyCapabilities, ['dicom'])
  assert.deepEqual(plan.assetPackages, ['@file-viewer/assets-standard'])
  assert.equal(plan.packageSpecs.includes(currentSpec('@file-viewer/renderer-dicom')), true)
  assert.equal(plan.steps.filter((step) => step.kind === 'assets').length, 1)

  const generated = await generateFileViewerIntegrationModule(process.cwd(), {
    framework: 'web',
    profile: 'standard',
    formats: ['dcm']
  })
  assert.match(
    generated.content,
    /import \{ dicomRenderer as fileViewerRenderer0 \} from ["']@file-viewer\/renderer-dicom["']/
  )
  assert.match(
    generated.content,
    /import fileViewerProfilePreset from ["']@file-viewer\/preset-standard["']/
  )
  assert.doesNotMatch(generated.content, /preset-all/)
})

test('signature formats stay outside standard until explicitly selected and generate their exact renderer export', async () => {
  const plan = await createFileViewerInstallPlan(
    { framework: 'web', profile: 'standard', formats: ['p7m'] },
    { packageManager: 'npm' }
  )
  assert.deepEqual(plan.capabilityPackages, ['@file-viewer/renderer-signature'])
  assert.deepEqual(plan.heavyCapabilities, ['signature'])
  assert.deepEqual(plan.assetPackages, ['@file-viewer/assets-standard'])
  assert.equal(plan.packageSpecs.includes(currentSpec('@file-viewer/renderer-signature')), true)

  const generated = await generateFileViewerIntegrationModule(process.cwd(), {
    framework: 'web',
    profile: 'standard',
    formats: ['p7m']
  })
  assert.match(
    generated.content,
    /import \{ signatureRenderer as fileViewerRenderer0 \} from ["']@file-viewer\/renderer-signature["']/
  )
  assert.match(
    generated.content,
    /import fileViewerProfilePreset from ["']@file-viewer\/preset-standard["']/
  )
  assert.doesNotMatch(generated.content, /preset-all/)
})

test('heavy capability is explicit and init is idempotent', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-cli-'))
  try {
    const input = { framework: 'web', profile: 'standard', formats: ['dwg'] }
    const plan = await createFileViewerInstallPlan(input, { packageManager: 'npm' })
    assert.deepEqual(plan.capabilityPackages, ['@file-viewer/renderer-cad'])
    assert.deepEqual(plan.heavyCapabilities, ['cad'])
    assert.deepEqual(plan.assetPackages, [
      '@file-viewer/assets-cad',
      '@file-viewer/assets-standard'
    ])
    assert.equal(plan.packages.includes('file-viewer-copy-assets'), false)
    assert.equal(plan.missingAssetRendererIds.length, 0)
    assert.equal(plan.steps.filter((step) => step.kind === 'assets').length, 2)
    const first = await initializeFileViewerProject(root, input, { write: true })
    const second = await initializeFileViewerProject(root, input, { write: true })
    assert.equal(first.written, true)
    assert.equal(second.changed, false)
    assert.equal(
      await readFile(first.configPath, 'utf8'),
      await readFile(second.configPath, 'utf8')
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('doctor verifies declared project dependencies', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-doctor-'))
  try {
    await initializeFileViewerProject(
      root,
      { framework: 'react', profile: 'standard', entry: 'src/main.ts' },
      { write: true }
    )
    await mkdir(join(root, 'src'), { recursive: true })
    await writeFile(join(root, 'src/main.ts'), 'console.log("app")\n')
    await generateFileViewerIntegrationModule(
      root,
      { framework: 'react', profile: 'standard', entry: 'src/main.ts' },
      { write: true }
    )
    await patchFileViewerApplicationEntry(root, 'file-viewer.generated.mjs', {
      write: true,
      entry: 'src/main.ts'
    })
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({
        dependencies: {
          '@file-viewer/core': currentVersionOf('@file-viewer/core'),
          '@file-viewer/react': currentVersionOf('@file-viewer/react'),
          '@file-viewer/preset-standard': currentVersionOf('@file-viewer/preset-standard'),
          '@file-viewer/assets-standard': currentVersionOf('@file-viewer/assets-standard')
        }
      })
    )
    const plan = await createFileViewerInstallPlan(
      { framework: 'react', profile: 'standard' },
      { projectRoot: root }
    )
    await mockResolvedPackages(root, plan)
    await installFileViewerStandardAssets({ targetDir: join(root, 'public/file-viewer') })
    assert.equal((await doctorFileViewerProject(root)).ok, true)
    await writeFile(join(root, 'src/main.ts'), 'console.log("entry drift")\n')
    const entryDrift = await doctorFileViewerProject(root)
    assert.equal(entryDrift.ok, false)
    assert.equal(
      entryDrift.errors.some((error) => error.includes('does not import')),
      true
    )
    await patchFileViewerApplicationEntry(root, 'file-viewer.generated.mjs', {
      write: true,
      entry: 'src/main.ts'
    })
    await writeFile(join(root, 'file-viewer.generated.mjs'), '// stale generated module\n')
    const generatedDrift = await doctorFileViewerProject(root)
    assert.equal(generatedDrift.ok, false)
    assert.equal(
      generatedDrift.errors.some((error) => error.includes('does not match')),
      true
    )
    await generateFileViewerIntegrationModule(
      root,
      { framework: 'react', profile: 'standard', entry: 'src/main.ts' },
      { write: true, force: true }
    )
    const receipt = JSON.parse(
      await readFile(
        join(root, 'public/file-viewer/file-viewer-assets-standard.receipt.json'),
        'utf8'
      )
    )
    await writeFile(join(root, 'public/file-viewer', receipt.files[0].path), 'tampered')
    assert.equal((await doctorFileViewerProject(root)).ok, false)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('plan execution is dry-run until explicitly confirmed and never uses a shell', async () => {
  const plan = await createFileViewerInstallPlan(
    { framework: 'vue3', profile: 'standard' },
    {
      packageManager: 'npm'
    }
  )
  const calls = []
  const runner = (command, args, options) => {
    calls.push({ command, args, options })
    return { status: 0, error: undefined }
  }
  assert.equal(executeFileViewerPlanStep(plan.steps[0], { runner }).executed, false)
  assert.equal(calls.length, 0)
  assert.equal(executeFileViewerPlanStep(plan.steps[0], { runner, confirmed: true }).executed, true)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].options.shell, false)
  assert.equal(calls[0].options.env, process.env)
  assert.deepEqual(calls[0].args, [
    'install',
    '--save-exact',
    '--ignore-scripts',
    currentSpec('@file-viewer/core'),
    currentSpec('@file-viewer/vue3'),
    currentSpec('@file-viewer/preset-standard'),
    currentSpec('@file-viewer/assets-standard')
  ])
})

test('missing modular asset executables fail locally without invoking a registry-capable runner', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-local-assets-only-'))
  try {
    await writeFile(join(root, 'package.json'), '{"private":true}\n')
    const plan = await createFileViewerInstallPlan(
      { framework: 'web', profile: 'standard' },
      { packageManager: 'npm', projectRoot: root }
    )
    let calls = 0
    assert.throws(
      () =>
        executeFileViewerPlanStep(
          plan.steps.find((step) => step.kind === 'assets'),
          {
            confirmed: true,
            runner: () => {
              calls += 1
              return { status: 0, error: undefined }
            }
          }
        ),
      /not installed; refusing registry fallback/
    )
    assert.equal(calls, 0)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('packageManager metadata wins over lockfiles and add detects an existing full integration', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-detection-'))
  try {
    await mkdir(join(root, 'src'), { recursive: true })
    await writeFile(join(root, 'src/main.ts'), 'console.log("app")\n')
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({
        private: true,
        packageManager: 'pnpm@11.0.9',
        dependencies: {
          vue: '3.5.31',
          '@file-viewer/vue3-full': '2.4.0'
        }
      })
    )
    await writeFile(join(root, 'package-lock.json'), '{}')
    assert.equal(detectPackageManager(root), 'pnpm')
    const cli = new URL('../dist/cli.js', import.meta.url)
    const inspected = spawnSync(
      process.execPath,
      [cli.pathname, 'add', root, '--non-interactive', '--json'],
      {
        cwd: root,
        encoding: 'utf8',
        shell: false
      }
    )
    assert.equal(inspected.status, 0, inspected.stderr)
    const result = JSON.parse(inspected.stdout)
    assert.equal(result.inspection.framework, 'vue3')
    assert.equal(result.inspection.detectedProfile, 'full')
    assert.equal(result.inspection.packageManager, 'pnpm')
    assert.equal(result.config.profile, 'full')
    assert.equal(result.plan.profile, 'full')
    assert.equal(result.plan.packageManager, 'pnpm')
    assert.equal(result.dryRun, true)
    assert.equal(result.config.frameworkVersion, undefined)
    assert.match(
      result.inspection.warnings.join('\n'),
      /3\.5\.31 does not exactly match a validated scaffold runtime/
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('multiple package-manager lockfiles fail closed until the manager is explicit', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-lockfile-choice-'))
  try {
    await writeFile(join(root, 'package.json'), JSON.stringify({ private: true }))
    await writeFile(join(root, 'package-lock.json'), '{}\n')
    await writeFile(join(root, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n')
    assert.throws(
      () => detectPackageManager(root),
      /Multiple package-manager lockfiles.*--package-manager explicitly/
    )

    const cli = new URL('../dist/cli.js', import.meta.url)
    const explicit = spawnSync(
      process.execPath,
      [
        cli.pathname,
        'plan',
        '--project',
        root,
        '--framework',
        'web',
        '--profile',
        'custom',
        '--formats',
        'svg',
        '--package-manager',
        'npm',
        '--json'
      ],
      { cwd: root, encoding: 'utf8', shell: false }
    )
    assert.equal(explicit.status, 0, explicit.stderr)
    assert.equal(JSON.parse(explicit.stdout).packageManager, 'npm')

    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ private: true, packageManager: 'pnpm@11.0.9' })
    )
    assert.equal(detectPackageManager(root), 'pnpm')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('existing Yarn Berry without packageManager metadata stays Berry', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-existing-yarn-berry-'))
  try {
    await mkdir(join(root, 'src'), { recursive: true })
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ private: true, dependencies: { '@file-viewer/web': '2.4.0' } })
    )
    await writeFile(join(root, 'yarn.lock'), '')
    await writeFile(
      join(root, '.yarnrc.yml'),
      'nodeLinker: node-modules\nyarnPath: .yarn/releases/yarn-4.9.2.cjs\n'
    )
    await mkdir(join(root, '.yarn/releases'), { recursive: true })
    await writeFile(join(root, '.yarn/releases/yarn-4.8.0.cjs'), '// stale release\n')
    await writeFile(join(root, '.yarn/releases/yarn-4.9.2.cjs'), '// selected release\n')
    await writeFile(join(root, 'src/main.mjs'), 'console.log("berry")\n')
    await initializeFileViewerProject(
      root,
      {
        framework: 'web',
        profile: 'custom',
        formats: ['svg'],
        entry: 'src/main.mjs',
        source: {
          kind: 'registry',
          registry: 'https://registry.example.test',
          cacheDir: '.cache/file-viewer',
          concurrency: 4
        }
      },
      { write: true }
    )
    const cli = new URL('../dist/cli.js', import.meta.url)
    const result = spawnSync(
      process.execPath,
      [
        cli.pathname,
        'add',
        root,
        '--asset-target',
        'public/file-viewer',
        '--non-interactive',
        '--json'
      ],
      { cwd: root, encoding: 'utf8', shell: false }
    )
    assert.equal(result.status, 0, result.stderr)
    const parsed = JSON.parse(result.stdout)
    assert.equal(parsed.config.packageManager, 'yarn')
    assert.equal(parsed.config.packageManagerVersion, undefined)
    assert.equal(parsed.plan.packageManagerVersion, undefined)
    assert.equal(parsed.plan.steps[0].args.includes('--network-concurrency'), false)
    assert.equal(parsed.plan.steps[0].env.YARN_NETWORK_CONCURRENCY, '4')
    assert.equal(parsed.plan.steps[0].env.YARN_ENABLE_SCRIPTS, 'false')
    assert.equal(parsed.plan.steps[0].expectedExecutableVersion, '4.9.2')

    await writeFile(join(root, '.yarnrc.yml'), 'nodeLinker: node-modules\n')
    const ambiguous = spawnSync(
      process.execPath,
      [
        cli.pathname,
        'add',
        root,
        '--asset-target',
        'public/file-viewer',
        '--non-interactive',
        '--json'
      ],
      { cwd: root, encoding: 'utf8', shell: false }
    )
    assert.equal(ambiguous.status, 1)
    assert.match(ambiguous.stderr, /exact version could not be determined/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('add inspection preserves configured defaults before any non-interactive plan is created', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-add-defaults-'))
  try {
    await mkdir(join(root, 'src'), { recursive: true })
    await writeFile(join(root, 'src/main.ts'), '"use client";\nconsole.log("existing")\n')
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({
        private: true,
        packageManager: 'yarn@1.22.22',
        dependencies: { vue: '3.5.31', '@file-viewer/vue3-full': '2.4.0' }
      })
    )
    await writeFile(
      join(root, 'file-viewer.config.json'),
      JSON.stringify({
        schemaVersion: 1,
        framework: 'vue3',
        profile: 'full',
        formats: ['dcm'],
        capabilities: [],
        assetTarget: 'static/private-viewer',
        generatedModule: 'src/file-viewer.generated.mjs',
        entry: 'src/main.ts',
        source: { kind: 'registry', registry: 'https://registry.example.test/npm/' },
        frameworkVersion: '3.5.31',
        assetBaseUrl: 'https://cdn.example.test/file-viewer/'
      })
    )
    const cli = new URL('../dist/cli.js', import.meta.url)
    const result = spawnSync(
      process.execPath,
      [cli.pathname, 'add', root, '--non-interactive', '--json'],
      {
        cwd: root,
        encoding: 'utf8',
        shell: false
      }
    )
    assert.equal(result.status, 0, result.stderr)
    const parsed = JSON.parse(result.stdout)
    assert.equal(parsed.config.profile, 'full')
    assert.equal(parsed.config.frameworkVersion, '3.5.31')
    assert.equal(parsed.config.assetTarget, 'static/private-viewer')
    assert.equal(parsed.config.entry, 'src/main.ts')
    assert.equal(parsed.config.source.registry, 'https://registry.example.test/npm/')
    assert.equal(parsed.config.assetBaseUrl, 'https://cdn.example.test/file-viewer/')
    assert.equal(parsed.plan.packageManager, 'yarn')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test(
  'interactive add keeps an existing Full profile and detected manager when defaults are accepted',
  { skip: process.platform !== 'darwin' || !existsSync('/usr/bin/expect') },
  async () => {
    const root = await mkdtemp(join(tmpdir(), 'file-viewer-add-pty-defaults-'))
    try {
      await mkdir(join(root, 'src'), { recursive: true })
      await writeFile(join(root, 'src/main.ts'), 'console.log("interactive")\n')
      await writeFile(
        join(root, 'package.json'),
        JSON.stringify({
          private: true,
          packageManager: 'pnpm@11.0.9',
          dependencies: { vue: '3.5.31', '@file-viewer/vue3-full': '2.4.0' }
        })
      )
      const cli = new URL('../dist/cli.js', import.meta.url)
      const expectProgram = `
set timeout 20
log_user 1
spawn $env(FILE_VIEWER_TEST_NODE) $env(FILE_VIEWER_TEST_CLI) add $env(FILE_VIEWER_TEST_ROOT) --json
expect {
  -re {Choose a number[^\\r\\n]*: $} { send "\\r"; exp_continue }
  -re {\\([^\\r\\n]*b=back[^\\r\\n]*\\): $} { send "\\r"; exp_continue }
  -re {\\(y/N\\) $} { send "\\r"; exp_continue }
  eof
  timeout { exit 124 }
}
catch wait result
exit [lindex $result 3]
`
      const interactive = spawnSync('/usr/bin/expect', ['-c', expectProgram], {
        cwd: root,
        encoding: 'utf8',
        shell: false,
        timeout: 25_000,
        env: {
          ...process.env,
          FILE_VIEWER_TEST_NODE: process.execPath,
          FILE_VIEWER_TEST_CLI: cli.pathname,
          FILE_VIEWER_TEST_ROOT: root
        }
      })
      assert.equal(interactive.status, 0, interactive.stderr)
      assert.match(interactive.stdout, /"profile"\s*:\s*"full"/)
      assert.match(interactive.stdout, /"packageManager"\s*:\s*"pnpm"/)
      assert.equal(existsSync(join(root, 'file-viewer.config.json')), false)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }
)

test('explicit asset target unblocks target-only adapters while unresolved adapters fail before side effects', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-adapter-write-'))
  const bin = join(root, 'bin')
  const fakeNpm = join(bin, 'npm')
  try {
    await mkdir(bin)
    await writeFile(
      fakeNpm,
      `#!/usr/bin/env node
const { appendFileSync } = require('node:fs');
appendFileSync(process.env.FILE_VIEWER_NPM_CALLS, process.argv.slice(2).join(' ') + '\\n');
process.exit(7);
`
    )
    await chmod(fakeNpm, 0o755)
    const cli = new URL('../dist/cli.js', import.meta.url)
    for (const [name, manifest, configFile] of [
      ['unknown', { private: true }, null],
      [
        'webpack',
        { private: true, scripts: { build: 'webpack' }, devDependencies: { webpack: '5.105.4' } },
        ['webpack.config.js', 'module.exports = {}\n']
      ],
      [
        'dynamic-vite',
        { private: true, scripts: { build: 'vite' }, devDependencies: { vite: '8.0.16' } },
        ['vite.config.js', 'export default { publicDir: process.env.PUBLIC_DIR }\n']
      ],
      [
        'multi-build',
        {
          private: true,
          scripts: { build: 'vite', dev: 'webpack' },
          devDependencies: { vite: '8.0.16', webpack: '5.105.4' }
        },
        null
      ]
    ]) {
      const project = join(root, name)
      const calls = join(project, 'npm-calls.log')
      await mkdir(join(project, 'src'), { recursive: true })
      await writeFile(join(project, 'package.json'), JSON.stringify(manifest))
      await writeFile(join(project, 'src/main.ts'), '"use client";\nconsole.log("keep")\n')
      if (configFile) await writeFile(join(project, configFile[0]), configFile[1])
      const common = [
        'add',
        project,
        '--framework',
        'web',
        '--profile',
        'custom',
        '--formats',
        'svg',
        '--package-manager',
        'npm',
        '--entry',
        'src/main.ts',
        '--non-interactive',
        '--yes',
        '--json'
      ]
      const env = {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        FILE_VIEWER_NPM_CALLS: calls
      }
      const blocked = spawnSync(process.execPath, [cli.pathname, ...common], {
        cwd: project,
        encoding: 'utf8',
        shell: false,
        env
      })
      assert.equal(blocked.status, 1)
      assert.match(blocked.stderr, /cannot safely complete this project integration automatically/)
      assert.equal(existsSync(calls), false)
      assert.equal(existsSync(join(project, 'file-viewer.config.json')), false)
      assert.doesNotMatch(
        await readFile(join(project, 'src/main.ts'), 'utf8'),
        /file-viewer:generated-integration/
      )

      const continued = spawnSync(
        process.execPath,
        [cli.pathname, ...common, '--asset-target', 'public/file-viewer'],
        { cwd: project, encoding: 'utf8', shell: false, env }
      )
      assert.equal(continued.status, 1)
      assert.match(continued.stderr, /exited with status 7/)
      assert.equal((await readFile(calls, 'utf8')).trim().length > 0, true)
      assert.equal(existsSync(join(project, 'file-viewer.config.json')), false)
      assert.doesNotMatch(
        await readFile(join(project, 'src/main.ts'), 'utf8'),
        /file-viewer:generated-integration/
      )
    }
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('non-interactive add fails closed on unresolved framework, profile, and entry ambiguity', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-add-ambiguity-'))
  try {
    await mkdir(join(root, 'src'), { recursive: true })
    await writeFile(join(root, 'src/main.ts'), 'console.log("main")\n')
    await writeFile(join(root, 'src/index.ts'), 'console.log("index")\n')
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({
        private: true,
        dependencies: {
          vue: '3.5.31',
          react: '19.2.4',
          '@file-viewer/preset-standard': '2.4.0',
          '@file-viewer/preset-lite': '2.4.0'
        }
      })
    )
    const cli = new URL('../dist/cli.js', import.meta.url)
    const invoke = (extra) =>
      spawnSync(
        process.execPath,
        [cli.pathname, 'add', root, '--non-interactive', '--json', ...extra],
        {
          cwd: root,
          encoding: 'utf8',
          shell: false
        }
      )
    const framework = invoke([])
    assert.equal(framework.status, 1)
    assert.match(framework.stderr, /Multiple framework runtimes.*--framework/)
    const profile = invoke(['--framework', 'vue3'])
    assert.equal(profile.status, 1)
    assert.match(profile.stderr, /Multiple existing File Viewer profiles.*--profile/)
    const entry = invoke(['--framework', 'vue3', '--profile', 'standard'])
    assert.equal(entry.status, 1)
    assert.match(entry.stderr, /Multiple application entries.*--entry/)
    const resolved = invoke([
      '--framework',
      'vue3',
      '--profile',
      'standard',
      '--entry',
      'src/main.ts'
    ])
    assert.equal(resolved.status, 0, resolved.stderr)
    assert.equal(JSON.parse(resolved.stdout).config.entry, 'src/main.ts')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('all four help locales expose the same flags and global version is command-independent', async () => {
  const cli = new URL('../dist/cli.js', import.meta.url)
  const copyAssetsBin = new URL('../dist/copy-assets.js', import.meta.url)
  const flagSets = []
  const semanticMarkers = {
    en: ['Project root', 'Offline preparation', 'Force mutating workflows'],
    'zh-CN': ['项目根目录', '离线准备', '强制所有变更流程'],
    'ja-JP': ['プロジェクトルート', 'オフライン準備', '変更処理の書き込み'],
    'de-DE': ['Projektwurzel', 'Offline-Vorbereitung', 'Erzwingt für Änderungen']
  }
  for (const locale of ['en', 'zh-CN', 'ja-JP', 'de-DE']) {
    const help = spawnSync(process.execPath, [cli.pathname, '--help', '--lang', locale], {
      encoding: 'utf8',
      shell: false
    })
    assert.equal(help.status, 0, help.stderr)
    for (const marker of semanticMarkers[locale]) assert.match(help.stdout, new RegExp(marker))
    for (const command of [
      'create',
      'add',
      'install',
      'assets',
      'prepare',
      'cache',
      'copy-assets',
      'doctor',
      'verify'
    ])
      assert.match(help.stdout, new RegExp(`^  ${command.replace('-', '\\-')}\\s`, 'm'))
    const flags = [...new Set(help.stdout.match(/--[a-z][a-z-]*/g) ?? [])].sort()
    flagSets.push(flags)
    for (const required of [
      '--entry',
      '--package-manager',
      '--asset-target',
      '--package-manager-version',
      '--registry',
      '--offline-dir',
      '--asset-base-url',
      '--version'
    ]) {
      assert.equal(flags.includes(required), true, `${locale} help is missing ${required}`)
    }

    const legacyHelp = spawnSync(
      process.execPath,
      [cli.pathname, 'copy-assets', '--help', '--lang', locale],
      { encoding: 'utf8', shell: false }
    )
    assert.equal(legacyHelp.status, 0, legacyHelp.stderr)
    assert.equal(legacyHelp.stdout.startsWith(`file-viewer-copy-assets ${cliPackageVersion}\n`), true)
    for (const token of [
      '--renderers',
      '--clean',
      '--confirm',
      '--no-clean',
      '--lang',
      'FILE_VIEWER_PUBLIC_DIR',
      'FILE_VIEWER_SKIP_ASSET_COPY',
      'INIT_CWD'
    ])
      assert.equal(
        legacyHelp.stdout.includes(token),
        true,
        `${locale} legacy help is missing ${token}`
      )

    const directLegacyHelp = spawnSync(
      process.execPath,
      [copyAssetsBin.pathname, '--help', '--lang', locale],
      { encoding: 'utf8', shell: false }
    )
    assert.equal(directLegacyHelp.status, 0, directLegacyHelp.stderr)
    assert.equal(directLegacyHelp.stdout, legacyHelp.stdout)
  }
  for (const flags of flagSets.slice(1)) assert.deepEqual(flags, flagSets[0])
  for (const [alias, marker] of [
    ['zh', '项目根目录'],
    ['zh_Hans', '项目根目录'],
    ['ja', 'プロジェクトルート'],
    ['de', 'Projektwurzel'],
    ['en-US', 'Project root']
  ]) {
    const help = spawnSync(process.execPath, [cli.pathname, '--lang', alias, '--help'], {
      encoding: 'utf8',
      shell: false
    })
    assert.equal(help.status, 0, help.stderr)
    assert.match(help.stdout, new RegExp(marker))
  }
  const unsupportedLocale = spawnSync(process.execPath, [cli.pathname, '--help', '--lang', 'fr'], {
    encoding: 'utf8',
    shell: false
  })
  assert.equal(unsupportedLocale.status, 1)
  assert.match(unsupportedLocale.stderr, /Unsupported language fr/)
  assert.doesNotMatch(unsupportedLocale.stderr, /TypeError/)
  for (const argv of [['--version'], ['create', '--version'], ['doctor', '--version']]) {
    const version = spawnSync(process.execPath, [cli.pathname, ...argv], {
      encoding: 'utf8',
      shell: false
    })
    assert.equal(version.status, 0, version.stderr)
    assert.equal(version.stdout.trim(), cliPackageVersion)
  }
  const assetsHelp = spawnSync(process.execPath, [cli.pathname, 'assets', '--help'], {
    encoding: 'utf8',
    shell: false
  })
  assert.equal(assetsHelp.status, 0, assetsHelp.stderr)
  assert.match(assetsHelp.stdout, /assets: Install or repair selected assets/)
  assert.match(assetsHelp.stdout, /Without config, preserves the legacy copy-assets contract/)
})

test('prepare rejects concurrency above eight before registry access while installs retain one-to-thirty-two', async () => {
  const cli = new URL('../dist/cli.js', import.meta.url)
  const rejected = spawnSync(
    process.execPath,
    [cli.pathname, 'prepare', '--registry', 'http://127.0.0.1:9', '--concurrency', '9', '--yes'],
    {
      encoding: 'utf8',
      shell: false
    }
  )
  assert.equal(rejected.status, 1)
  assert.match(rejected.stderr, /prepare --concurrency must be an integer from 1 to 8/)
  const preview = spawnSync(
    process.execPath,
    [cli.pathname, 'prepare', '--registry', 'https://registry.example.test', '--json'],
    { encoding: 'utf8', shell: false }
  )
  assert.equal(preview.status, 0, preview.stderr)
  const previewPlan = JSON.parse(preview.stdout).plan
  assert.deepEqual(
    previewPlan.requiredPackages.filter((item) => item.packageName === '@file-viewer/cli'),
    [{ packageName: '@file-viewer/cli', version: cliPackageVersion }]
  )
  const installPlan = await createFileViewerInstallPlan(
    {
      framework: 'web',
      profile: 'standard',
      source: { kind: 'registry', registry: 'https://registry.example.test', concurrency: 32 }
    },
    { packageManager: 'npm' }
  )
  assert.equal(installPlan.steps[0].args.includes('32'), true)
  assert.equal(installPlan.steps[0].args.includes('--ignore-scripts'), true)
  const bunPlan = await createFileViewerInstallPlan(
    {
      framework: 'web',
      profile: 'custom',
      formats: ['svg'],
      source: { kind: 'registry', registry: 'https://registry.example.test', concurrency: 7 }
    },
    { packageManager: 'bun' }
  )
  assert.deepEqual(bunPlan.steps[0].args.slice(0, 8), [
    'add',
    '--exact',
    '--ignore-scripts',
    '--registry',
    'https://registry.example.test/',
    '--network-concurrency',
    '7',
    '--concurrent-scripts'
  ])
})

test('--dry-run wins over mutation flags for every mutating workflow', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-dry-run-'))
  const bin = join(root, 'bin')
  const calls = join(root, 'calls.log')
  const cli = new URL('../dist/cli.js', import.meta.url)
  try {
    await mkdir(bin)
    await writeFile(
      join(bin, 'npm'),
      '#!/usr/bin/env node\nrequire("node:fs").appendFileSync(process.env.FILE_VIEWER_DRY_RUN_CALLS,"called\\n");process.exit(99)\n'
    )
    await chmod(join(bin, 'npm'), 0o755)
    const env = {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      FILE_VIEWER_DRY_RUN_CALLS: calls
    }
    const fresh = join(root, 'fresh')
    const created = spawnSync(
      process.execPath,
      [
        cli.pathname,
        'create',
        fresh,
        '--framework',
        'web',
        '--profile',
        'custom',
        '--formats',
        'svg',
        '--package-manager',
        'npm',
        '--yes',
        '--dry-run',
        '--non-interactive',
        '--json'
      ],
      { cwd: root, encoding: 'utf8', shell: false, env }
    )
    assert.equal(created.status, 0, created.stderr)
    assert.equal(JSON.parse(created.stdout).dryRun, true)
    assert.equal(existsSync(fresh), false)

    const existing = join(root, 'existing')
    await mkdir(join(existing, 'src'), { recursive: true })
    await writeFile(
      join(existing, 'package.json'),
      JSON.stringify({ private: true, dependencies: { '@file-viewer/web': '2.4.0' } })
    )
    await writeFile(join(existing, 'src/main.mjs'), 'console.log("existing")\n')
    await initializeFileViewerProject(
      existing,
      {
        framework: 'web',
        profile: 'custom',
        formats: ['svg'],
        entry: 'src/main.mjs',
        packageManager: 'npm'
      },
      { write: true }
    )
    const beforeEntry = await readFile(join(existing, 'src/main.mjs'), 'utf8')
    for (const command of [
      [
        'add',
        existing,
        '--asset-target',
        'public/file-viewer',
        '--yes',
        '--dry-run',
        '--non-interactive',
        '--json'
      ],
      ['install', '--project', existing, '--yes', '--dry-run', '--json'],
      ['assets', '--project', existing, '--write', '--dry-run', '--json'],
      [
        'prepare',
        '--project',
        existing,
        '--registry',
        'https://registry.example.test',
        '--offline-dir',
        'prepared',
        '--yes',
        '--dry-run',
        '--json'
      ]
    ]) {
      const result = spawnSync(process.execPath, [cli.pathname, ...command], {
        cwd: existing,
        encoding: 'utf8',
        shell: false,
        env
      })
      assert.equal(result.status, 0, `${command[0]}: ${result.stderr}`)
      assert.equal(JSON.parse(result.stdout).dryRun, true, command[0])
    }
    const bare = join(root, 'bare-assets')
    await mkdir(bare)
    const bareAssets = spawnSync(
      process.execPath,
      [cli.pathname, 'assets', '--project', bare, '--write', '--dry-run', '--json'],
      { cwd: bare, encoding: 'utf8', shell: false, env }
    )
    assert.equal(bareAssets.status, 0, bareAssets.stderr)
    assert.equal(JSON.parse(bareAssets.stdout).mode, 'legacy-copy-assets')
    assert.equal(await readFile(join(existing, 'src/main.mjs'), 'utf8'), beforeEntry)
    assert.equal(existsSync(join(existing, 'file-viewer.generated.mjs')), false)
    assert.equal(existsSync(join(existing, 'prepared')), false)
    assert.equal(existsSync(calls), false)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('failed create removes only a brand-new partially scaffolded target', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-create-rollback-'))
  const bin = join(root, 'bin')
  const target = join(root, 'new-project')
  try {
    await mkdir(bin)
    const fakeNpm = join(bin, 'npm')
    await writeFile(fakeNpm, '#!/usr/bin/env node\nprocess.exit(7)\n')
    await chmod(fakeNpm, 0o755)
    const cli = new URL('../dist/cli.js', import.meta.url)
    const failed = spawnSync(
      process.execPath,
      [
        cli.pathname,
        'create',
        target,
        '--framework',
        'web',
        '--profile',
        'custom',
        '--package-manager',
        'npm',
        '--formats',
        'svg',
        '--non-interactive',
        '--yes',
        '--json'
      ],
      {
        cwd: root,
        encoding: 'utf8',
        shell: false,
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}` }
      }
    )
    assert.equal(failed.status, 1)
    assert.match(failed.stderr, /exited with status 7/)
    assert.equal(existsSync(target), false)

    const existing = join(root, 'existing-project')
    await mkdir(existing)
    await writeFile(join(existing, 'keep.txt'), 'keep')
    const preserved = spawnSync(
      process.execPath,
      [
        cli.pathname,
        'create',
        existing,
        '--framework',
        'web',
        '--profile',
        'custom',
        '--package-manager',
        'npm',
        '--formats',
        'svg',
        '--non-interactive',
        '--yes',
        '--json'
      ],
      {
        cwd: root,
        encoding: 'utf8',
        shell: false,
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}` }
      }
    )
    assert.equal(preserved.status, 1)
    assert.equal(await readFile(join(existing, 'keep.txt'), 'utf8'), 'keep')
    assert.deepEqual(await readdir(existing), ['keep.txt'])

    const empty = join(root, 'empty-project')
    await mkdir(empty)
    const emptyFailure = spawnSync(
      process.execPath,
      [
        cli.pathname,
        'create',
        empty,
        '--framework',
        'web',
        '--profile',
        'custom',
        '--package-manager',
        'npm',
        '--formats',
        'svg',
        '--non-interactive',
        '--yes',
        '--json'
      ],
      {
        cwd: root,
        encoding: 'utf8',
        shell: false,
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}` }
      }
    )
    assert.equal(emptyFailure.status, 1)
    assert.deepEqual(await readdir(empty), [])

    const forced = join(root, 'forced-project')
    const originalManifest = '{"name":"user-project","private":true}\n'
    const originalEntry = '"use strict";\nconsole.log("user")\n'
    await mkdir(join(forced, 'src'), { recursive: true })
    await writeFile(join(forced, 'package.json'), originalManifest)
    await writeFile(join(forced, 'src/main.mjs'), originalEntry)
    const forceFailure = spawnSync(
      process.execPath,
      [
        cli.pathname,
        'create',
        forced,
        '--framework',
        'web',
        '--profile',
        'custom',
        '--package-manager',
        'npm',
        '--formats',
        'svg',
        '--force',
        '--non-interactive',
        '--yes',
        '--json'
      ],
      {
        cwd: root,
        encoding: 'utf8',
        shell: false,
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}` }
      }
    )
    assert.equal(forceFailure.status, 1)
    assert.equal(await readFile(join(forced, 'package.json'), 'utf8'), originalManifest)
    assert.equal(await readFile(join(forced, 'src/main.mjs'), 'utf8'), originalEntry)
    assert.deepEqual((await readdir(forced)).sort(), ['package.json', 'src'])

    const assetsBin = join(root, 'assets-bin')
    const assetsTarget = join(root, 'assets-failure-project')
    await mkdir(assetsBin)
    await mkdir(join(assetsTarget, 'src'), { recursive: true })
    const assetsOriginalManifest = '{"name":"asset-user-project","private":true}\n'
    const assetsOriginalLock = '{"name":"asset-user-project","lockfileVersion":3}\n'
    await writeFile(join(assetsTarget, 'package.json'), assetsOriginalManifest)
    await writeFile(join(assetsTarget, 'package-lock.json'), assetsOriginalLock)
    await writeFile(join(assetsTarget, 'src/main.mjs'), 'console.log("asset user")\n')
    await mkdir(join(assetsTarget, 'public/file-viewer'), { recursive: true })
    await writeFile(join(assetsTarget, 'public/file-viewer/keep.txt'), 'keep asset bytes')
    await mkdir(join(assetsTarget, 'node_modules/user-owned'), { recursive: true })
    await writeFile(join(assetsTarget, 'node_modules/user-owned/keep.txt'), 'old node_modules')
    await mkdir(join(assetsTarget, '.yarn/cache'), { recursive: true })
    await mkdir(join(assetsTarget, '.yarn/unplugged/user-owned'), { recursive: true })
    await writeFile(join(assetsTarget, '.yarn/cache/keep.zip'), 'old yarn cache')
    await writeFile(join(assetsTarget, '.yarn/unplugged/user-owned/keep.txt'), 'old unplugged')
    await writeFile(join(assetsTarget, '.yarn/install-state.gz'), 'old install state')
    await writeFile(join(assetsTarget, '.pnp.cjs'), 'old pnp cjs')
    await writeFile(join(assetsTarget, '.pnp.loader.mjs'), 'old pnp loader')
    await writeFile(join(assetsTarget, '.pnp.data.json'), 'old pnp data')
    const installThenFail = join(assetsBin, 'npm')
    await writeFile(
      installThenFail,
      `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
if (process.argv[2] !== 'install') process.exit(98);
const manifestPath = path.resolve('package.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.mutatedByInstall = true;
fs.writeFileSync(manifestPath, JSON.stringify(manifest));
fs.writeFileSync(path.resolve('package-lock.json'), '{"mutated":true}');
fs.writeFileSync(path.resolve('.pnp.cjs'), 'new pnp cjs');
fs.writeFileSync(path.resolve('.pnp.loader.mjs'), 'new pnp loader');
fs.writeFileSync(path.resolve('.pnp.data.json'), 'new pnp data');
fs.mkdirSync(path.resolve('.yarn/unplugged/generated'), { recursive: true });
fs.writeFileSync(path.resolve('.yarn/unplugged/generated/new.txt'), 'new unplugged');
fs.writeFileSync(path.resolve('.yarn/install-state.gz'), 'new install state');
const owner = path.resolve('node_modules/@file-viewer/assets-standard');
fs.mkdirSync(path.join(owner, 'dist'), { recursive: true });
fs.writeFileSync(path.join(owner, 'package.json'), JSON.stringify({ name: '@file-viewer/assets-standard', version: '${currentVersionOf('@file-viewer/assets-standard')}', bin: { 'file-viewer-assets-standard': './dist/cli.js' } }));
fs.writeFileSync(path.join(owner, 'dist/cli.js'), String.raw\`const fs = require('node:fs'); const path = require('node:path'); const target = path.resolve(process.argv.at(-1)); fs.rmSync(path.join(target, 'keep.txt'), { force: true }); fs.mkdirSync(target, { recursive: true }); fs.writeFileSync(path.join(target, 'partial.txt'), 'partial'); process.exit(9);\`);
process.exit(0);
`
    )
    await chmod(installThenFail, 0o755)
    const assetsFailure = spawnSync(
      process.execPath,
      [
        cli.pathname,
        'create',
        assetsTarget,
        '--framework',
        'web',
        '--profile',
        'standard',
        '--package-manager',
        'npm',
        '--force',
        '--non-interactive',
        '--yes',
        '--json'
      ],
      {
        cwd: root,
        encoding: 'utf8',
        shell: false,
        env: { ...process.env, PATH: `${assetsBin}:${process.env.PATH}` }
      }
    )
    assert.equal(assetsFailure.status, 1)
    assert.match(assetsFailure.stderr, /exited with status 9/)
    assert.equal(await readFile(join(assetsTarget, 'package.json'), 'utf8'), assetsOriginalManifest)
    assert.equal(
      await readFile(join(assetsTarget, 'package-lock.json'), 'utf8'),
      assetsOriginalLock
    )
    assert.equal(
      await readFile(join(assetsTarget, 'node_modules/user-owned/keep.txt'), 'utf8'),
      'old node_modules'
    )
    assert.equal(existsSync(join(assetsTarget, 'node_modules/@file-viewer')), false)
    assert.equal(
      await readFile(join(assetsTarget, '.yarn/cache/keep.zip'), 'utf8'),
      'old yarn cache'
    )
    assert.equal(
      await readFile(join(assetsTarget, '.yarn/unplugged/user-owned/keep.txt'), 'utf8'),
      'old unplugged'
    )
    assert.equal(existsSync(join(assetsTarget, '.yarn/unplugged/generated')), false)
    assert.equal(
      await readFile(join(assetsTarget, '.yarn/install-state.gz'), 'utf8'),
      'old install state'
    )
    assert.equal(await readFile(join(assetsTarget, '.pnp.cjs'), 'utf8'), 'old pnp cjs')
    assert.equal(await readFile(join(assetsTarget, '.pnp.loader.mjs'), 'utf8'), 'old pnp loader')
    assert.equal(await readFile(join(assetsTarget, '.pnp.data.json'), 'utf8'), 'old pnp data')
    assert.equal(
      await readFile(join(assetsTarget, 'src/main.mjs'), 'utf8'),
      'console.log("asset user")\n'
    )
    assert.equal(
      await readFile(join(assetsTarget, 'public/file-viewer/keep.txt'), 'utf8'),
      'keep asset bytes'
    )
    assert.equal(existsSync(join(assetsTarget, 'public/file-viewer/partial.txt')), false)

    await writeFile(
      join(assetsTarget, 'file-viewer.config.json'),
      JSON.stringify({
        schemaVersion: 1,
        framework: 'web',
        profile: 'standard',
        formats: [],
        capabilities: [],
        assetTarget: 'public/file-viewer',
        generatedModule: 'file-viewer.generated.mjs',
        entry: 'src/main.mjs',
        packageManager: 'npm'
      })
    )
    const installAssetsFailure = spawnSync(
      process.execPath,
      [cli.pathname, 'install', '--project', assetsTarget, '--yes', '--json'],
      {
        cwd: root,
        encoding: 'utf8',
        shell: false,
        env: { ...process.env, PATH: `${assetsBin}:${process.env.PATH}` }
      }
    )
    assert.equal(installAssetsFailure.status, 1)
    assert.match(installAssetsFailure.stderr, /exited with status 9/)
    assert.equal(await readFile(join(assetsTarget, 'package.json'), 'utf8'), assetsOriginalManifest)
    assert.equal(
      await readFile(join(assetsTarget, 'package-lock.json'), 'utf8'),
      assetsOriginalLock
    )
    assert.equal(
      await readFile(join(assetsTarget, 'node_modules/user-owned/keep.txt'), 'utf8'),
      'old node_modules'
    )
    assert.equal(existsSync(join(assetsTarget, 'node_modules/@file-viewer')), false)
    assert.equal(
      await readFile(join(assetsTarget, '.yarn/cache/keep.zip'), 'utf8'),
      'old yarn cache'
    )
    assert.equal(
      await readFile(join(assetsTarget, '.yarn/unplugged/user-owned/keep.txt'), 'utf8'),
      'old unplugged'
    )
    assert.equal(existsSync(join(assetsTarget, '.yarn/unplugged/generated')), false)
    assert.equal(
      await readFile(join(assetsTarget, '.yarn/install-state.gz'), 'utf8'),
      'old install state'
    )
    assert.equal(await readFile(join(assetsTarget, '.pnp.cjs'), 'utf8'), 'old pnp cjs')
    assert.equal(await readFile(join(assetsTarget, '.pnp.loader.mjs'), 'utf8'), 'old pnp loader')
    assert.equal(await readFile(join(assetsTarget, '.pnp.data.json'), 'utf8'), 'old pnp data')
    assert.equal(
      await readFile(join(assetsTarget, 'public/file-viewer/keep.txt'), 'utf8'),
      'keep asset bytes'
    )
    assert.equal(existsSync(join(assetsTarget, 'public/file-viewer/partial.txt')), false)
    assert.equal(
      (await readdir(root)).some((name) =>
        name.startsWith('.assets-failure-project.file-viewer-install-')
      ),
      false
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('copy-assets alias uses the embedded web-full carrier when the standalone package is absent', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-web-full-carrier-'))
  const webFullVersion = currentVersionOf('@file-viewer/web-full')
  try {
    const packageRoot = join(root, 'node_modules/@file-viewer/web-full')
    await mkdir(join(packageRoot, 'scripts'), { recursive: true })
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ private: true, dependencies: { '@file-viewer/web-full': webFullVersion } })
    )
    await writeFile(
      join(packageRoot, 'package.json'),
      JSON.stringify({
        name: '@file-viewer/web-full',
        version: webFullVersion,
        type: 'module',
        exports: { './package.json': './package.json' },
        bin: { 'file-viewer-copy-assets': './scripts/copy-assets.mjs' }
      })
    )
    await writeFile(
      join(packageRoot, 'scripts/copy-assets.mjs'),
      '#!/usr/bin/env node\nprocess.stdout.write(JSON.stringify({ source: "embedded-web-full", args: process.argv.slice(2) }) + "\\n")\n'
    )
    const cli = new URL('../dist/cli.js', import.meta.url)
    const result = spawnSync(
      process.execPath,
      [cli.pathname, 'copy-assets', '--project', root, 'static/file-viewer'],
      {
        cwd: root,
        encoding: 'utf8',
        shell: false
      }
    )
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(JSON.parse(result.stdout), {
      source: 'embedded-web-full',
      args: ['static/file-viewer', '--json'],
      mode: 'copy'
    })
    const protectedBareAssets = spawnSync(
      process.execPath,
      [cli.pathname, 'assets', '--project', root],
      { cwd: root, encoding: 'utf8', shell: false }
    )
    assert.equal(protectedBareAssets.status, 0, protectedBareAssets.stderr)
    assert.deepEqual(JSON.parse(protectedBareAssets.stdout), {
      source: 'embedded-web-full',
      args: ['--json'],
      mode: 'copy'
    })

    const embeddedBin = join(packageRoot, 'scripts/copy-assets.mjs')
    const outsideBin = join(root, 'outside-copy-assets.mjs')
    await rename(embeddedBin, outsideBin)
    await symlink(outsideBin, embeddedBin)
    const symlinkedBin = spawnSync(
      process.execPath,
      [cli.pathname, 'copy-assets', '--project', root, 'static/file-viewer'],
      { cwd: root, encoding: 'utf8', shell: false }
    )
    assert.equal(symlinkedBin.status, 1)
    assert.match(symlinkedBin.stderr, /bin is not a regular file/)
    await rm(embeddedBin)
    await rename(outsideBin, embeddedBin)

    const manifestPath = join(packageRoot, 'package.json')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    manifest.bin['file-viewer-copy-assets'] = '../outside-copy-assets.mjs'
    await writeFile(manifestPath, JSON.stringify(manifest))
    const escapingBin = spawnSync(
      process.execPath,
      [cli.pathname, 'copy-assets', '--project', root, 'static/file-viewer'],
      { cwd: root, encoding: 'utf8', shell: false }
    )
    assert.equal(escapingBin.status, 1)
    assert.match(escapingBin.stderr, /has no safe file-viewer-copy-assets compatibility bin/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('dependency reconciliation removes only obsolete heavy packages previously managed by the CLI', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-managed-dependencies-'))
  try {
    const original = {
      private: true,
      dependencies: {
        '@file-viewer/web': '2.4.0',
        '@file-viewer/renderer-cad': '2.4.0',
        '@file-viewer/assets-cad': '2.4.0',
        '@file-viewer/renderer-iwork': '2.4.0',
        '@file-viewer/renderer-image': '2.4.0'
      }
    }
    await writeFile(join(root, 'package.json'), `${JSON.stringify(original, null, 2)}\n`)
    const plan = await createFileViewerInstallPlan(
      { framework: 'web', profile: 'custom', formats: ['svg'] },
      { projectRoot: root, packageManager: 'npm' }
    )
    const config = {
      framework: 'web',
      profile: 'custom',
      formats: ['svg'],
      managedPackages: [
        '@file-viewer/renderer-cad',
        '@file-viewer/assets-cad',
        '@file-viewer/renderer-image'
      ]
    }
    const before = await readFile(join(root, 'package.json'), 'utf8')
    const preview = await reconcileFileViewerManagedDependencies(root, config, plan)
    assert.deepEqual(preview.removedDeclarations, [
      '@file-viewer/assets-cad',
      '@file-viewer/renderer-cad'
    ])
    assert.equal(preview.manifestWritten, false)
    assert.equal(await readFile(join(root, 'package.json'), 'utf8'), before)

    const applied = await reconcileFileViewerManagedDependencies(root, config, plan, {
      write: true
    })
    const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
    assert.equal(manifest.dependencies['@file-viewer/renderer-cad'], undefined)
    assert.equal(manifest.dependencies['@file-viewer/assets-cad'], undefined)
    assert.equal(manifest.dependencies['@file-viewer/renderer-iwork'], '2.4.0')
    assert.equal(manifest.dependencies['@file-viewer/renderer-image'], '2.4.0')
    assert.equal(applied.config.managedPackages.includes('@file-viewer/renderer-cad'), false)
    assert.equal(applied.config.managedPackages.includes('@file-viewer/assets-cad'), false)

    await writeFile(join(root, 'package.json'), `${JSON.stringify(original, null, 2)}\n`)
    const unowned = await reconcileFileViewerManagedDependencies(
      root,
      { framework: 'web', profile: 'custom', formats: ['svg'], managedPackages: [] },
      plan,
      { write: true }
    )
    assert.deepEqual(unowned.removedDeclarations, [])
    assert.equal(
      JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).dependencies[
        '@file-viewer/renderer-cad'
      ],
      '2.4.0'
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('custom profile has no implicit asset owner and all profile plans each declared owner', async () => {
  const custom = await createFileViewerInstallPlan(
    { framework: 'web', profile: 'custom', formats: ['svg'] },
    { packageManager: 'npm' }
  )
  assert.deepEqual(custom.assetPackages, [])
  assert.equal(custom.steps.filter((step) => step.kind === 'assets').length, 0)
  const all = await createFileViewerInstallPlan(
    { framework: 'web', profile: 'all' },
    { packageManager: 'npm' }
  )
  assert.deepEqual(all.assetPackages, [
    '@file-viewer/assets-cad',
    '@file-viewer/assets-chm',
    '@file-viewer/assets-data',
    '@file-viewer/assets-drawing',
    '@file-viewer/assets-hangul',
    '@file-viewer/assets-iwork',
    '@file-viewer/assets-model',
    '@file-viewer/assets-ppt',
    '@file-viewer/assets-standard',
    '@file-viewer/assets-typst',
    '@file-viewer/assets-wordperfect'
  ])
  assert.equal(all.steps.filter((step) => step.kind === 'assets').length, 11)
  assert.equal(all.packages.includes('file-viewer-copy-assets'), false)
})

test('add/remove updates only explicit selections and is dry-run by default', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-cli-selection-'))
  try {
    await initializeFileViewerProject(
      root,
      { framework: 'web', profile: 'standard' },
      { write: true }
    )
    const preview = await updateFileViewerProjectSelection(root, 'dwg', 'add')
    assert.equal(preview.changed, true)
    assert.deepEqual((await readFileViewerConfig(root)).formats, [])
    await updateFileViewerProjectSelection(root, 'dwg', 'add', { write: true })
    assert.deepEqual((await readFileViewerConfig(root)).formats, ['dwg'])
    await updateFileViewerProjectSelection(root, 'dwg', 'remove', { write: true })
    assert.deepEqual((await readFileViewerConfig(root)).formats, [])
    await assert.rejects(
      updateFileViewerProjectSelection(root, 'pdf', 'remove', { write: true }),
      /fixed standard profile/
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('asset target is contained, persisted, and threaded into every asset command', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-cli-target-'))
  try {
    const config = { framework: 'web', profile: 'standard', assetTarget: 'static/file-viewer' }
    await initializeFileViewerProject(root, config, { write: true })
    const plan = await createFileViewerInstallPlan(config, {
      projectRoot: root,
      packageManager: 'npm'
    })
    assert.equal(plan.assetTarget, 'static/file-viewer')
    assert.equal(
      plan.steps
        .filter((step) => step.kind === 'assets')
        .every((step) => step.args.at(-1) === 'static/file-viewer'),
      true
    )
    assert.equal((await readFileViewerConfig(root)).assetTarget, 'static/file-viewer')
    await assert.rejects(
      createFileViewerInstallPlan({ ...config, assetTarget: '../escape' }, { projectRoot: root }),
      /contained project-relative path/
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('generated custom module activates the exact renderer export and is idempotent', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-cli-generate-'))
  try {
    const input = {
      framework: 'web',
      profile: 'custom',
      formats: ['dwg'],
      generatedModule: 'src/file-viewer.generated.mjs'
    }
    const preview = await generateFileViewerIntegrationModule(root, input)
    assert.equal(preview.written, false)
    assert.match(preview.content, /cadRenderer as fileViewerRenderer0/)
    assert.match(preview.content, /registerFileViewerAutoRendererPreset/)
    const first = await generateFileViewerIntegrationModule(root, input, { write: true })
    const second = await generateFileViewerIntegrationModule(root, input, { write: true })
    assert.equal(first.written, true)
    assert.equal(second.changed, false)
    assert.equal(await readFile(first.outputPath, 'utf8'), preview.content)

    const nestedEntry = {
      ...input,
      entry: 'src/main.ts',
      generatedModule: 'file-viewer.generated.mjs'
    }
    assert.equal(
      (await generateFileViewerIntegrationModule(root, nestedEntry)).importStatement,
      'import "../file-viewer.generated.mjs";'
    )
    assert.equal(
      (await createFileViewerInstallPlan(nestedEntry, { projectRoot: root })).integrationImport,
      'import "../file-viewer.generated.mjs";'
    )
    assert.equal(
      (await createFileViewerInstallPlan(input, { projectRoot: root })).integrationImport,
      'Import src/file-viewer.generated.mjs from your application entry.'
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('managed application entry import is previewable, idempotent, and preserves user code', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-entry-'))
  try {
    await mkdir(join(root, 'src'), { recursive: true })
    await writeFile(join(root, 'src/main.ts'), 'console.log("user code")\n')
    const preview = await patchFileViewerApplicationEntry(root, 'file-viewer.generated.mjs')
    assert.equal(preview.changed, true)
    assert.match(preview.content, /file-viewer:generated-integration/)
    assert.match(preview.content, /console\.log\("user code"\)/)
    assert.equal(await readFile(join(root, 'src/main.ts'), 'utf8'), 'console.log("user code")\n')
    const written = await patchFileViewerApplicationEntry(root, 'file-viewer.generated.mjs', {
      write: true
    })
    assert.equal(written.written, true)
    const repeated = await patchFileViewerApplicationEntry(root, 'file-viewer.generated.mjs', {
      write: true
    })
    assert.equal(repeated.changed, false)
    assert.equal(
      (await readFile(join(root, 'src/main.ts'), 'utf8')).match(
        /file-viewer:generated-integration/g
      )?.length,
      1
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('managed entry repair preserves prologues, repairs stale markers, and requires an explicit multi-entry choice', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-entry-repair-'))
  try {
    await mkdir(join(root, 'src'), { recursive: true })
    const prologue = '\uFEFF#!/usr/bin/env node\n"use client";\n\'use strict\';\n'
    await writeFile(
      join(root, 'src/main.ts'),
      `${prologue}// file-viewer:generated-integration\nimport "./old-file-viewer.generated.mjs";\nimport "./user.js";\nconsole.log("app")\n`
    )
    await writeFile(join(root, 'src/index.ts'), 'console.log("second entry")\n')
    await assert.rejects(
      patchFileViewerApplicationEntry(root, 'file-viewer.generated.mjs'),
      /Multiple application entries were found.*--entry/
    )
    const repaired = await patchFileViewerApplicationEntry(root, 'file-viewer.generated.mjs', {
      entry: 'src/main.ts',
      write: true
    })
    assert.equal(repaired.written, true)
    const content = await readFile(join(root, 'src/main.ts'), 'utf8')
    assert.match(
      content,
      /^\uFEFF#!\/usr\/bin\/env node\n"use client";\n'use strict';\n\/\/ file-viewer:generated-integration\nimport "\.\.\/file-viewer\.generated\.mjs";/
    )
    assert.doesNotMatch(content, /old-file-viewer/)
    assert.match(content, /import "\.\/user\.js";/)

    await writeFile(
      join(root, 'src/index.ts'),
      '\'use client\';\n// file-viewer:generated-integration\nimport "./user-owned.js";\n'
    )
    const markerOnly = await patchFileViewerApplicationEntry(root, 'file-viewer.generated.mjs', {
      entry: 'src/index.ts',
      write: true
    })
    assert.equal(markerOnly.written, true)
    const markerOnlyContent = await readFile(join(root, 'src/index.ts'), 'utf8')
    assert.match(
      markerOnlyContent,
      /^'use client';\n\/\/ file-viewer:generated-integration\nimport "\.\.\/file-viewer\.generated\.mjs";/
    )
    assert.match(markerOnlyContent, /import "\.\/user-owned\.js";/)
    const verified = await patchFileViewerApplicationEntry(root, 'file-viewer.generated.mjs', {
      entry: 'src/index.ts'
    })
    assert.equal(verified.changed, false)

    await writeFile(
      join(root, 'src/banner.ts'),
      '/* License banner */\r\n// product banner\r\n\r\n"use client";\r\n\'use strict\';\r\nconsole.log("crlf")\r\n'
    )
    await patchFileViewerApplicationEntry(root, 'file-viewer.generated.mjs', {
      entry: 'src/banner.ts',
      write: true
    })
    const banner = await readFile(join(root, 'src/banner.ts'), 'utf8')
    assert.match(
      banner,
      /^\/\* License banner \*\/\r\n\/\/ product banner\r\n\r\n"use client";\r\n'use strict';\r\n\/\/ file-viewer:generated-integration\r\nimport "\.\.\/file-viewer\.generated\.mjs";/
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('doctor rejects stale declared and resolved package versions', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-cli-version-'))
  try {
    const config = { framework: 'web', profile: 'custom', formats: ['svg'] }
    await initializeFileViewerProject(root, config, { write: true })
    const plan = await createFileViewerInstallPlan(config, {
      projectRoot: root,
      packageManager: 'npm'
    })
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({
        dependencies: { '@file-viewer/web': '^2.4.0', '@file-viewer/renderer-image': '2.4.0' }
      })
    )
    await mockResolvedPackages(root, plan)
    const declared = await doctorFileViewerProject(root)
    assert.equal(declared.ok, false)
    assert.equal(
      declared.errors.some((error) => error.includes('must be pinned')),
      true
    )
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({
        dependencies: { '@file-viewer/web': '2.4.0', '@file-viewer/renderer-image': '2.4.0' }
      })
    )
    await writeFile(
      join(root, 'node_modules/@file-viewer/web/package.json'),
      JSON.stringify({ name: '@file-viewer/web', version: '9.9.9' })
    )
    const resolved = await doctorFileViewerProject(root)
    assert.equal(resolved.ok, false)
    assert.equal(
      resolved.errors.some((error) => error.includes('Resolved @file-viewer/web@9.9.9')),
      true
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

const readFileViewerConfig = async (root) =>
  JSON.parse(await readFile(join(root, 'file-viewer.config.json'), 'utf8'))

const mockResolvedPackages = async (root, plan) => {
  const require = createRequire(import.meta.url)
  for (const item of plan.requiredPackages) {
    const path = join(root, 'node_modules', ...item.packageName.split('/'), 'package.json')
    await mkdir(join(path, '..'), { recursive: true })
    await writeFile(path, JSON.stringify({ name: item.packageName, version: item.version }))
    if (item.packageName.startsWith('@file-viewer/assets-')) {
      const sourceRoot = dirname(require.resolve(`${item.packageName}/package.json`))
      for (const filename of ['file-viewer-asset-pack.json', 'flyfish-viewer-assets.json']) {
        const source = join(sourceRoot, 'viewer', filename)
        try {
          await access(source)
          await mkdir(join(path, '..', 'viewer'), { recursive: true })
          await cp(source, join(path, '..', 'viewer', filename))
        } catch (error) {
          if (error.code !== 'ENOENT') throw error
        }
      }
    }
  }
}
