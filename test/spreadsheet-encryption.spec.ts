import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { decryptSpreadsheetPackage } from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/encryption'
import {
  createSpreadsheetParserContext,
  handleSpreadsheetWorkerRequest
} from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/parser'

const root = new URL('../packages/renderers/spreadsheet/', import.meta.url)
const { CFB } = createRequire(new URL('package.json', root))('styled-exceljs')
const fixture = (name: string) => Uint8Array.from(
  readFileSync(new URL(`test/fixtures/issue-518/${name}.xlsx`, root))
).buffer
const password = 'RenderTest 密码🍀'

describe('spreadsheet passwords', () => {
  it.each(['agile', 'standard'])('recovers the exact workbook bytes with %s encryption', async (scheme) => {
    const workbook = fixture(scheme)
    const plain = await decryptSpreadsheetPackage(workbook, 'xlsx', password)
    expect(Buffer.from(plain).equals(Buffer.from(fixture('plain')))).toBe(true)
  })

  it('reports wrong credentials and retries on the same Worker parser context', async () => {
    const workbook = fixture('agile')
    const context = createSpreadsheetParserContext()
    const parse = async (attempted?: string) => handleSpreadsheetWorkerRequest(context, {
      type: 'parseWorkbook',
      payload: { workbook, fileType: 'xlsx', password: attempted },
    })
    expect(await parse()).toMatchObject([{ type: 'parseError', payload: { code: 'encrypted' } }])
    expect(await parse('incorrect')).toMatchObject([{ type: 'parseError', payload: { code: 'invalid-password' } }])
    expect(context.workbook).toBeNull()
    expect(await parse(password)).toMatchObject([{ type: 'sheets', payload: {
      sheets: [{ name: 'Budget' }, { name: 'Staff' }],
    } }])
    expect(await handleSpreadsheetWorkerRequest(context, {
      type: 'searchWorkbook', payload: { query: 'Second sheet marker team' },
    })).toMatchObject([{ payload: { matches: [{ sheetName: 'Staff', row: 0, col: 0 }] } }])
    expect(Buffer.from(workbook).equals(Buffer.from(fixture('agile')))).toBe(true)
  })

  it('reports unsupported encryption before asking for a password', async () => {
    await expect(decryptSpreadsheetPackage(fixture('unsupported'), 'xlsx'))
      .rejects.toMatchObject({ code: 'unsupported-encryption' })
  })

  it('passes through unencrypted workbooks unchanged', async () => {
    const workbook = fixture('plain')
    expect(await decryptSpreadsheetPackage(workbook, 'xlsx')).toBe(workbook)
  })

  it('rejects altered Agile ciphertext after the password is verified', async () => {
    const compound = CFB.read(new Uint8Array(fixture('agile')), { type: 'array' })
    const encrypted = CFB.find(compound, '/EncryptedPackage').content
    encrypted[32] ^= 1
    const damaged = Uint8Array.from(CFB.write(compound, { type: 'array' })).buffer
    await expect(decryptSpreadsheetPackage(damaged, 'xlsx', password)).rejects.toThrow(/integrity/i)
  })

  it('rejects Agile packages with missing integrity metadata', async () => {
    const compound = CFB.read(new Uint8Array(fixture('agile')), { type: 'array' })
    const info = CFB.find(compound, '/EncryptionInfo')
    const header = Buffer.from(info.content).subarray(0, 8)
    const xml = Buffer.from(info.content).subarray(8).toString('utf8')
    const stripped = xml.replace(/<dataIntegrity\b[^>]*\/\s*>/, '')
    expect(stripped).not.toBe(xml)
    info.content = Buffer.concat([header, Buffer.from(stripped)])
    info.size = info.content.length
    const damaged = Uint8Array.from(CFB.write(compound, { type: 'array' })).buffer
    await expect(decryptSpreadsheetPackage(damaged, 'xlsx', password)).rejects.toThrow()
  })

  it('rejects incompatible Standard encryption flags before asking for a password', async () => {
    const compound = CFB.read(new Uint8Array(fixture('standard')), { type: 'array' })
    const content = CFB.find(compound, '/EncryptionInfo').content
    content[4] |= 0x10
    content[12] |= 0x10
    const unsupported = Uint8Array.from(CFB.write(compound, { type: 'array' })).buffer
    await expect(decryptSpreadsheetPackage(unsupported, 'xlsx'))
      .rejects.toMatchObject({ code: 'unsupported-encryption' })
  })
})
