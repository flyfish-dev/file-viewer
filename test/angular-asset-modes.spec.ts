import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { verifyAngularDevelopmentAssetModes } from '../apps/component-demo/scripts/lib/angular-asset-modes.mjs'

describe('Angular asset fixture server isolation', () => {
  it.each(['none', 'development', 'development-package-worker', 'second-start'])(
    'stops before fixture changes and restores the manifest after %s',
    async (failure) => {
      const directory = await mkdtemp(join(tmpdir(), 'file-viewer-angular-assets-'))
      const manifest = join(directory, 'flyfish-viewer-assets.json')
      const events: string[] = []
      let running = false
      let starts = 0
      await writeFile(manifest, '{"fixture":true}\n')
      try {
        const verification = verifyAngularDevelopmentAssetModes({
          manifest,
          start: async () => {
            expect(running).toBe(false)
            events.push(`start:${existsSync(manifest)}`)
            running = true
            if (++starts === 2 && failure === 'second-start') throw new Error(failure)
            return 4000 + starts
          },
          stop: async () => {
            expect(existsSync(manifest)).toBe(starts === 1)
            events.push('stop')
            running = false
          },
          verify: async (mode: string, port: number) => {
            events.push(mode)
            expect(running).toBe(true)
            expect(port).toBe(4000 + starts)
            expect(existsSync(manifest)).toBe(mode === 'development')
            if (mode === failure) throw new Error(failure)
          }
        })
        if (failure === 'none') await verification
        else await expect(verification).rejects.toThrow(failure)
        expect(running).toBe(false)
        expect(await readFile(manifest, 'utf8')).toBe('{"fixture":true}\n')
        expect(existsSync(`${manifest}.held`)).toBe(false)
        expect(events).toEqual([
          'start:true', 'development', 'stop',
          ...(failure === 'development' ? [] : [
            'start:false',
            ...(failure === 'second-start' ? [] : ['development-package-worker']),
            'stop'
          ])
        ])
      } finally {
        await rm(directory, { recursive: true, force: true })
      }
    }
  )
})
