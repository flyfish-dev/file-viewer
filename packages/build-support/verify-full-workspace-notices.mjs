import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { verifyFullWorkspaceNotices } from './full-workspace-notices.mjs'

assert.equal(process.argv.length, 2, 'Full copyright verification has no skip options')
const result = await verifyFullWorkspaceNotices(resolve(import.meta.dirname, '../..'))
console.log('[full-workspace-notices]', JSON.stringify(result))
