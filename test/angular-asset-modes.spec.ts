import { describe, expect, it } from 'vitest'
import { verifyAngularDevelopmentAssetModes } from '../apps/component-demo/scripts/lib/angular-asset-modes.mjs'

describe('Angular asset fixture server isolation', () => {
  it.each(['none', 'development', 'development-restart', 'second-start'])(
    'starts every development verification with an intact staged-asset fixture after %s',
    async (failure) => {
      const events: string[] = []
      let running = false
      let starts = 0
      const verification = verifyAngularDevelopmentAssetModes({
        start: async () => {
          expect(running).toBe(false)
          running = true
          starts += 1
          events.push(`start:${starts}`)
          if (starts === 2 && failure === 'second-start') throw new Error(failure)
          return 4000 + starts
        },
        stop: async () => {
          expect(running).toBe(true)
          events.push('stop')
          running = false
        },
        verify: async (mode: string, port: number) => {
          events.push(mode)
          expect(running).toBe(true)
          expect(port).toBe(4000 + starts)
          if (mode === failure) throw new Error(failure)
        }
      })
      if (failure === 'none') await verification
      else await expect(verification).rejects.toThrow(failure)
      expect(running).toBe(false)
      expect(events).toEqual([
        'start:1',
        'development',
        'stop',
        ...(failure === 'development'
          ? []
          : ['start:2', ...(failure === 'second-start' ? [] : ['development-restart']), 'stop'])
      ])
    }
  )
})
