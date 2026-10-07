import { describe, expect, it } from 'vitest'
import {
  preparePackedConsumerManifest,
  summarizeConsumerAudit
} from '../apps/component-demo/scripts/build-packed-issue-consumer.mjs'
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

describe('packed consumer dependency policy', () => {
  it('keeps explicit fixture overrides without mutating the fixture', () => {
    const fixture = {
      dependencies: {
        '@file-viewer/core': '3.1.2',
        'file-viewer-copy-assets': '3.1.2',
        vue: '3.5.43'
      },
      overrides: {
        '@angular/build': { piscina: '5.3.2' },
        '@angular/cli': { '@modelcontextprotocol/sdk': '1.31.0' }
      }
    }
    const manifest = preparePackedConsumerManifest(fixture, '3.1.3')
    expect(manifest.dependencies).toEqual({
      '@file-viewer/core': '3.1.3',
      'file-viewer-copy-assets': '3.1.3',
      vue: '3.5.43'
    })
    expect(manifest.overrides).toEqual(fixture.overrides)
    manifest.overrides['@angular/build'].piscina = 'changed'
    expect(fixture.overrides['@angular/build'].piscina).toBe('5.3.2')
    expect(fixture.dependencies['@file-viewer/core']).toBe('3.1.2')
  })

  it('does not inject workspace policy into a fixture without overrides', () => {
    const fixture = { dependencies: { '@file-viewer/core': '3.1.2' } }
    const manifest = preparePackedConsumerManifest(fixture, '3.1.3')
    expect(manifest.overrides).toEqual({})
    expect(fixture).not.toHaveProperty('overrides')
  })
})

describe('packed consumer audit evidence', () => {
  const cleanReport = {
    auditReportVersion: 2,
    vulnerabilities: {},
    metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 } }
  }

  it('separates propagated affected entries from distinct advisories', () => {
    const advisory = { url: 'https://github.com/advisories/GHSA-test' }
    const report = {
      auditReportVersion: 2,
      vulnerabilities: {
        direct: { via: [advisory] },
        indirect: { via: ['direct', advisory] }
      },
      metadata: { vulnerabilities: { ...cleanReport.metadata.vulnerabilities, high: 2, total: 2 } }
    }
    expect(summarizeConsumerAudit(report, 1)).toEqual({
      affectedEntries: report.metadata.vulnerabilities,
      distinctAdvisories: [advisory.url]
    })
  })

  it('accepts a completed clean audit but rejects missing data and audit errors', () => {
    const report = cleanReport
    expect(summarizeConsumerAudit(report, 0).distinctAdvisories).toEqual([])
    expect(() => summarizeConsumerAudit(report, 2)).toThrow('npm audit failed')
    expect(() => summarizeConsumerAudit({ error: { code: 'ENOAUDIT' } }, 1)).toThrow(
      'npm audit error'
    )
    expect(() => summarizeConsumerAudit({}, 0)).toThrow('Missing npm audit data')
    expect(() =>
      summarizeConsumerAudit({ ...report, vulnerabilities: { missing: {} } }, 1)
    ).toThrow()
  })

  it('rejects malformed zero-finding reports and incomplete severity totals', () => {
    expect(() => summarizeConsumerAudit({ ...cleanReport, vulnerabilities: [] }, 0)).toThrow(
      'Invalid npm audit vulnerabilities'
    )
    expect(() => summarizeConsumerAudit({ ...cleanReport, auditReportVersion: 3 }, 0)).toThrow(
      'Unsupported npm audit report version'
    )
    expect(() =>
      summarizeConsumerAudit(
        {
          ...cleanReport,
          metadata: { vulnerabilities: { total: 0 } }
        },
        0
      )
    ).toThrow('Invalid npm audit info count')
    expect(() =>
      summarizeConsumerAudit(
        {
          ...cleanReport,
          metadata: { vulnerabilities: { ...cleanReport.metadata.vulnerabilities, high: 1 } }
        },
        0
      )
    ).toThrow('Inconsistent npm audit severity counts')
  })
})
