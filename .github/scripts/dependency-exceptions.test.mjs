import assert from 'node:assert/strict'
import test from 'node:test'
import { verifyDcmjsZipBoundary } from './verify-dependency-exceptions.mjs'

test('unused ZIP exception remains version, caller and code bounded', () => {
  const sources = ['export const DicomMessage = {}', 'module.exports = {}', 'export default {}']
  verifyDcmjsZipBoundary({ version: '0.52.0' }, sources, ['dcmjs@0.52.0'])
  assert.throws(() => verifyDcmjsZipBoundary({ version: '0.53.0' }, sources, ['dcmjs@0.52.0']))
  assert.throws(() =>
    verifyDcmjsZipBoundary({ version: '0.52.0' }, sources, ['dcmjs@0.52.0', 'new-caller@1.0.0'])
  )
  assert.throws(() =>
    verifyDcmjsZipBoundary(
      { version: '0.52.0' },
      ["require('adm-zip')", ...sources.slice(1)],
      ['dcmjs@0.52.0']
    )
  )
  assert.throws(() =>
    verifyDcmjsZipBoundary(
      { version: '0.52.0' },
      ['zip.extractAllTo(dir)', ...sources.slice(1)],
      ['dcmjs@0.52.0']
    )
  )
})
