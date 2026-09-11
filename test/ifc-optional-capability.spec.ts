import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderFileViewerModel } from '../packages/renderers/3d/src/index'
import {
  isFileViewerIfcCapabilityEnabled,
  registerFileViewerIfcCapability,
} from '../packages/renderers/3d/src/optionalCapabilities'

const root = process.cwd()
const json = async (path: string) => JSON.parse(await readFile(resolve(root, path), 'utf8'))

afterEach(() => {
  registerFileViewerIfcCapability(false)
})

describe('optional IFC capability boundary', () => {
  it('keeps IFC engines outside the base 3D and preset dependency closure', async () => {
    const renderer = await json('packages/renderers/3d/package.json')
    const capability = await json('packages/capabilities/ifc/package.json')
    const assetsModel = await json('packages/tools/assets-model/package.json')
    const assetsIfc = await json('packages/tools/assets-ifc/package.json')
    const engineering = await json('packages/presets/engineering/package.json')
    const all = await json('packages/presets/all/package.json')

    for (const dependency of ['web-ifc', '@thatopen/components', '@thatopen/fragments']) {
      expect(renderer.dependencies?.[dependency]).toBeUndefined()
      expect(assetsModel.devDependencies?.[dependency]).toBeUndefined()
    }
    expect(capability.dependencies?.['web-ifc']).toBe('0.0.77')
    expect(capability.dependencies?.['@thatopen/components']).toBe('3.4.8')
    expect(capability.dependencies?.['@thatopen/fragments']).toBe('3.4.7')
    expect(assetsIfc.devDependencies?.['web-ifc']).toBe('0.0.77')
    expect(assetsIfc.devDependencies?.['@thatopen/fragments']).toBe('3.4.7')

    for (const preset of [engineering, all]) {
      expect(preset.dependencies?.['@file-viewer/capability-ifc']).toBeUndefined()
      expect(preset.dependencies?.['@file-viewer/assets-ifc']).toBeUndefined()
      expect(preset.dependencies?.['@thatopen/components']).toBeUndefined()
      expect(preset.dependencies?.['@thatopen/fragments']).toBeUndefined()
    }
  })

  it('declares IFC as a heavy explicit enhancement with third-party notices', async () => {
    const manifest = await json('packages/capabilities/ifc/file-viewer.capability.json')
    expect(manifest).toMatchObject({
      id: 'ifc',
      packageName: '@file-viewer/capability-ifc',
      enhancesPackage: '@file-viewer/renderer-3d',
      activation: {
        kind: 'side-effect-import',
        import: '@file-viewer/capability-ifc',
        export: 'enableFileViewerIfc',
      },
      rendererIds: ['model'],
      formats: ['ifc'],
      weight: 'heavy',
      profiles: [],
    })
    expect(manifest.assets.packageName).toBe('@file-viewer/assets-ifc')
    expect(manifest.assets.copyMode).toBe('capability-pack')
    expect(manifest.license.notices).toEqual(expect.arrayContaining([
      expect.objectContaining({ packageName: 'web-ifc', spdx: 'MPL-2.0' }),
      expect.objectContaining({ packageName: '@thatopen/components', spdx: 'MIT' }),
      expect.objectContaining({ packageName: '@thatopen/fragments', spdx: 'MIT' }),
    ]))
  })

  it('requires explicit runtime activation and registers a lazy specialist handler', async () => {
    registerFileViewerIfcCapability(false)
    expect(isFileViewerIfcCapabilityEnabled()).toBe(false)
    registerFileViewerIfcCapability(true)
    expect(isFileViewerIfcCapabilityEnabled()).toBe(true)
    registerFileViewerIfcCapability(false)

    const capabilitySource = await readFile(resolve(root, 'packages/capabilities/ifc/src/index.ts'), 'utf8')
    const rendererSource = await readFile(resolve(root, 'packages/renderers/3d/src/index.ts'), 'utf8')
    expect(capabilitySource).toContain("import('./thatOpenBackend.js')")
    expect(capabilitySource).toContain('registerFileViewerIfcCapability((buffer, target, type, context)')
    expect(rendererSource).toContain('IFC support is opt-in')
    expect(rendererSource).toContain('isFileViewerIfcCapabilityEnabled()')
  })

  it('routes configured large IFCs to the specialist backend without initializing the direct renderer', async () => {
    const specialist = vi.fn(async () => ({
      $el: {} as HTMLDivElement,
      unmount: () => undefined,
    }))
    registerFileViewerIfcCapability(specialist)

    await renderFileViewerModel(
      new ArrayBuffer(2),
      {} as HTMLDivElement,
      'ifc',
      {
        options: {
          ifc: {
            performance: {
              largeModelThresholdBytes: 1,
            },
          },
        },
      } as never
    )

    expect(specialist).toHaveBeenCalledTimes(1)
  })

  it('enforces an application hard source-size limit before invoking any IFC backend', async () => {
    const specialist = vi.fn(async () => ({
      $el: {} as HTMLDivElement,
      unmount: () => undefined,
    }))
    registerFileViewerIfcCapability(specialist)

    await expect(renderFileViewerModel(
      new ArrayBuffer(4),
      {} as HTMLDivElement,
      'ifc',
      {
        options: {
          ifc: {
            backend: 'thatopen',
            performance: {
              maxSourceBytes: 3,
            },
          },
        },
      } as never
    )).rejects.toThrow('maxSourceBytes')
    expect(specialist).not.toHaveBeenCalled()
  })

  it('keeps the That Open compatibility bridge opaque instead of mirroring keys', async () => {
    const typesSource = await readFile(resolve(root, 'packages/renderers/3d/src/ifcTypes.ts'), 'utf8')
    const backendSource = await readFile(resolve(root, 'packages/capabilities/ifc/src/thatOpenBackend.ts'), 'utf8')
    expect(typesSource).toContain('export interface FileViewerIfcOpaqueConfig')
    expect(typesSource).toContain('[key: string]: unknown')
    expect(backendSource).toContain('await loader.setup(options.thatOpen.components)')
    expect(backendSource).toContain('Object.assign(fragments.core.settings, options.thatOpen.fragments)')
    expect(backendSource).toContain('processData: options.thatOpen.importer')
  })

  it('ships attributed open-license IFC fixtures', async () => {
    const license = await readFile(resolve(root, 'test/fixtures/ifc/LICENSE.buildingSMART-CC-BY-4.0.txt'), 'utf8')
    const readme = await readFile(resolve(root, 'test/fixtures/ifc/README.md'), 'utf8')
    expect(license).toContain('Creative Commons Attribution 4.0 International License')
    expect(readme).toContain('buildingSMART')
    expect(readme).toContain('CC BY 4.0')

    for (const filename of ['Building-Architecture.ifc', 'Building-Structural.ifc']) {
      const fixture = await readFile(resolve(root, `test/fixtures/ifc/${filename}`), 'utf8')
      expect(fixture.startsWith('ISO-10303-21;')).toBe(true)
      expect(fixture).toContain("FILE_SCHEMA(('IFC4'))")
    }
  })
})
