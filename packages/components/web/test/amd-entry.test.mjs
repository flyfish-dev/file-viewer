import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import { createAmdEntry, isolateAmd } from '../scripts/amd-entry.mjs'

const bundledVendor = `${isolateAmd.banner}
if (typeof define === 'function' && define.amd) define([], function () { return 'wrong-vendor'; });
globalThis.Viewer = { mountViewer: function () {} };
${isolateAmd.footer}`

test('AMD entry defines exactly one anonymous API and leaves host define unchanged', () => {
  const definitions = []
  const define = (dependencies, factory) => definitions.push({ dependencies, factory })
  define.amd = {}
  const context = { define }
  runInNewContext(createAmdEntry(bundledVendor, 'Viewer'), context)
  assert.equal(definitions.length, 1)
  assert.equal(definitions[0].dependencies.length, 0)
  const api = context.Viewer
  context.Viewer = { anotherContext: true }
  assert.equal(definitions[0].factory(), api, 'Capture the API before another loader context overwrites the global')
  assert.equal(context.define, define)
  assert.equal(typeof api.mountViewer, 'function')
})

test('script-tag build does not leave anonymous modules in RequireJS', () => {
  const define = () => assert.fail('A lazy script must not call host define')
  define.amd = {}
  const context = { define }
  runInNewContext(bundledVendor, context)
  assert.equal(context.define, define)
  assert.equal(typeof context.Viewer.mountViewer, 'function')
})

test('AMD artifact retains its browser global without an AMD host', () => {
  const context = {}
  runInNewContext(createAmdEntry(bundledVendor, 'Viewer'), context)
  assert.equal(typeof context.Viewer.mountViewer, 'function')
  assert.equal(context.define, undefined)
})

test('isolated IIFE preserves its global this when evaluated in strict mode', () => {
  const context = {}
  runInNewContext(`'use strict';\n${isolateAmd.banner}\nthis.Viewer = { ready: true };\n${isolateAmd.footer}`, context)
  assert.equal(context.Viewer.ready, true)
})
