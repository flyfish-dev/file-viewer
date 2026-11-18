import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import * as fs from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { build } from 'esbuild'
import { buildLocaleExports } from '../packages/core/scripts/build-locale-exports.mjs'
import { copyCoreSource, copyPublicSourceTree } from '../packages/build-support/core-source-export.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(root, 'package.json'))
let temporary: string, consumer: string, core: string

function compilePackage(packageDirectory: string, output: string) {
  const config = ts.readConfigFile(join(packageDirectory, 'tsconfig.json'), ts.sys.readFile)
  expect(config.error).toBeUndefined()
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, packageDirectory)
  const program = ts.createProgram(parsed.fileNames, { ...parsed.options, composite: false, incremental: false, outDir: output })
  const emitted = program.emit()
  const diagnostics = [...ts.getPreEmitDiagnostics(program), ...emitted.diagnostics]
  expect(diagnostics.map(row => ts.flattenDiagnosticMessageText(row.messageText, '\n'))).toEqual([])
}

function provider(name: string) {
  const local = createRequire(join(root, 'packages/core/package.json'))
  let directory = dirname(realpathSync(local.resolve(name)))
  while (!existsSync(join(directory, 'package.json')) || JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')).name !== name) {
    const parent = dirname(directory)
    assert.notEqual(parent, directory)
    directory = parent
  }
  return directory
}

function runProbe(name: string, source: string, custom = false) {
  const file = join(consumer, name + '.mjs')
  writeFileSync(file, source)
  return JSON.parse(execFileSync(process.execPath, [...(custom ? ['--conditions=file-viewer-custom-locales'] : []), file], {
    cwd: consumer, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024,
  }))
}

describe('published locale dictionary boundaries', () => {
  beforeAll(async () => {
    temporary = mkdtempSync(join(tmpdir(), 'file-viewer-locale-exports-'))
    consumer = join(temporary, 'consumer')
    core = join(consumer, 'node_modules/@file-viewer/core')
    const react = join(consumer, 'node_modules/@file-viewer/react')
    mkdirSync(core, { recursive: true }); mkdirSync(react, { recursive: true })
    writeFileSync(join(consumer, 'package.json'), '{"private":true,"type":"module"}\n')
    compilePackage(join(root, 'packages/core'), join(core, 'dist'))
    execFileSync(process.execPath, [join(root, 'packages/core/scripts/fix-core-esm-extensions.mjs'), '--dist-dir', join(core, 'dist')])
    await buildLocaleExports(join(core, 'dist'))
    compilePackage(join(root, 'packages/components/react'), join(react, 'dist'))
    copyFileSync(join(root, 'packages/core/package.json'), join(core, 'package.json'))
    copyFileSync(join(root, 'packages/components/react/package.json'), join(react, 'package.json'))
    symlinkSync(provider('dompurify'), join(consumer, 'node_modules/dompurify'))
  }, 30_000)
  afterAll(() => { if (temporary) rmSync(temporary, { recursive: true, force: true }) })

  it('keeps default synchronous catalogs and generates all domain messages and plural forms per locale', () => {
    expect(runProbe('default-catalogs', `
      import assert from 'node:assert/strict';
      import * as core from '@file-viewer/core';
      import { FILE_VIEWER_BUILTIN_MESSAGES as maintained } from './node_modules/@file-viewer/core/dist/i18n/builtin-messages.js';
      import { FILE_VIEWER_DEFAULT_PLURAL_MESSAGES as plurals } from './node_modules/@file-viewer/core/dist/i18n/builtin-plurals.js';
      import { getFileViewerLocalePluralForms } from './node_modules/@file-viewer/core/dist/i18n/locale-registry.js';
      assert.deepEqual(core.FILE_VIEWER_BUILTIN_MESSAGES, maintained);
      for (const locale of core.FILE_VIEWER_SUPPORTED_LOCALES) {
        const leaf = await import('@file-viewer/core/locales/' + locale);
        assert.deepEqual(leaf.default, maintained[locale]);
        const remove = core.registerFileViewerLocale(locale, leaf.default);
        assert.deepEqual(getFileViewerLocalePluralForms(locale), plurals[locale] || {});
        remove();
      }
      console.log(JSON.stringify({locales:core.FILE_VIEWER_SUPPORTED_LOCALES.length,complete:true}));
    `)).toEqual({ locales: 7, complete: true })
  })

  it('bundles the compiled React public entry with only the explicitly registered English dictionary', async () => {
    const result = await build({ stdin: { contents: `
      import { FileViewer } from '@file-viewer/react';
      import { registerFileViewerLocale } from '@file-viewer/core';
      import enUS from '@file-viewer/core/locales/en-US';
      import * as browser from '@file-viewer/core/browser';
      import * as headless from '@file-viewer/core/headless';
      import * as output from '@file-viewer/core/export';
      import * as printMask from '@file-viewer/core/print-mask';
      registerFileViewerLocale('en-US',enUS);
      globalThis.consumer={FileViewer,browser,headless,output,printMask};
    `, resolveDir: consumer }, absWorkingDir: consumer, bundle: true, format: 'esm', platform: 'browser',
      conditions: ['file-viewer-custom-locales'], external: ['react', 'react/jsx-runtime', 'react-dom'],
      metafile: true, write: false,
    })
    const inputs = Object.keys(result.metafile!.inputs)
    expect(inputs.some(path => path.endsWith('locales/en-US.js'))).toBe(true)
    expect(inputs.filter(path => /i18n\/(?:defaults|builtin-messages|builtin-plurals|messages\.(?:ja|de|zh-Hant|ru)|domains\/)/.test(path))).toEqual([])
    expect(inputs.some(path => path.includes('/src/'))).toBe(false)
  })

  it('shares one registry across public subpaths and uses English, custom copy and later locale registrations', () => {
    expect(runProbe('custom-registry', `
      import assert from 'node:assert/strict';
      import * as core from '@file-viewer/core';
      import * as browser from '@file-viewer/core/browser';
      import * as headless from '@file-viewer/core/headless';
      import '@file-viewer/core/export'; import '@file-viewer/core/print-mask';
      import enUS from '@file-viewer/core/locales/en-US';
      assert.equal(core.registerFileViewerLocale,browser.registerFileViewerLocale);
      assert.equal(core.registerFileViewerLocale,headless.registerFileViewerLocale);
      assert(Object.values(core.FILE_VIEWER_BUILTIN_MESSAGES).every(dict=>!Object.keys(dict).length));
      const removeEn=core.registerFileViewerLocale('en-US',enUS);
      const context=core.createFileViewerI18n({locale:'ja-JP'}),options=context.options;
      assert.equal(context.t('toolbar.print'),'Print');
      assert.equal(context.t('pdf.nav.pageCount',{count:1}),'1 page');
      const removePartial=headless.registerFileViewerLocale('de-DE',{'toolbar.print':'Drucken'});
      assert.equal(core.createFileViewerTranslator({locale:'de-DE'})('pdf.nav.pageCount',{count:1}),'1 page');
      removePartial();
      assert.equal(core.createFileViewerTranslator({locale:'ja-JP',messages:{'toolbar.print':'App print'}})('toolbar.print'),'App print');
      let changed=0;context.subscribe(()=>changed++);
      const ja=await import('@file-viewer/core/locales/ja-JP');
      const removeJa=headless.registerFileViewerLocale('ja-JP',ja.default);
      assert.equal(context.t('toolbar.print'),ja.default['toolbar.print']);
      assert.equal(changed,1);assert.equal(context.options,options);
      context.destroy();removeJa();removeEn();
      console.log(JSON.stringify({shared:true,fallback:true,liveUpdate:true}));
    `, true)).toEqual({ shared: true, fallback: true, liveUpdate: true })
  })
})

it('preserves the locale producer and package metadata in both Core source export copy modes', async () => {
  const owned = await fs.realpath(await fs.mkdtemp(join(tmpdir(), 'file-viewer-core-source-export-')))
  try {
    const sourceRoot = join(owned, 'source')
    await fs.mkdir(sourceRoot)
    await fs.copyFile(join(root, 'LICENSE'), join(sourceRoot, 'LICENSE'))
    await fs.writeFile(join(sourceRoot, 'pnpm-workspace.yaml'), 'packages:\n  - private-workspace-sentinel\n')
    const maintainedPackage = JSON.parse(readFileSync(join(root, 'packages/core/package.json'), 'utf8'))
    const rootPackage = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    const coreMetadata = JSON.parse(readFileSync(join(root, 'ecosystem/wrappers.json'), 'utf8')).corePackage
    for (const publicProfile of [null, {}]) {
      const targetDir = join(owned, publicProfile ? 'profile-core' : 'normal-core')
      await copyCoreSource({
        sourceRoot, targetDir, sourceDir: join(root, 'packages/core'),
        rootPackage, coreMetadata, corePackage: structuredClone(maintainedPackage),
        workspaceVersions: new Map([[maintainedPackage.name, maintainedPackage.version]]),
        publicProfile, copy: publicProfile ? copyPublicSourceTree : fs.cp,
      })
      const metadata = JSON.parse(await fs.readFile(join(targetDir, 'package.json'), 'utf8'))
      expect(metadata.name).toBe(maintainedPackage.name)
      expect(metadata.type).toBe('module')
      expect(metadata.exports).toEqual(maintainedPackage.exports)
      expect(metadata.scripts.build).toBe(maintainedPackage.scripts.build)
      for (const helper of ['clean-dist.mjs', 'fix-core-esm-extensions.mjs', 'build-locale-exports.mjs']) {
        expect(await fs.readFile(join(targetDir, 'scripts', helper), 'utf8')).toBe(await fs.readFile(join(root, 'packages/core/scripts', helper), 'utf8'))
      }
      for (const path of await fs.readdir(targetDir, { recursive: true })) {
        expect(basename(path)).not.toBe('pnpm-workspace.yaml')
        const info = await fs.stat(join(targetDir, path))
        if (info.isFile()) expect((await fs.readFile(join(targetDir, path))).includes(Buffer.from('private-workspace-sentinel'))).toBe(false)
      }
    }
  } finally {
    await fs.rm(owned, { recursive: true, force: true })
  }
})
