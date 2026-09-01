import assert from 'node:assert/strict'
import test from 'node:test'
import { createFileViewerCustomEvent } from '../dist/custom-event.js'

test('uses the owning document realm CustomEvent constructor', () => {
  class RealmCustomEvent {
    constructor(type, init) {
      this.type = type
      Object.assign(this, init)
    }
  }
  const event = createFileViewerCustomEvent(
    { ownerDocument: { defaultView: { CustomEvent: RealmCustomEvent } } },
    'viewer-ready',
    { ready: true }
  )
  assert.equal(event.constructor, RealmCustomEvent)
  assert.equal(event.type, 'viewer-ready')
  assert.deepEqual(event.detail, { ready: true })
  assert.equal(event.bubbles, true)
  assert.equal(event.composed, true)
})

test('falls back to document.createEvent when realm and global constructors are unavailable', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'CustomEvent')
  Object.defineProperty(globalThis, 'CustomEvent', {
    configurable: true,
    writable: true,
    value: undefined,
  })
  try {
    const legacyEvent = {
      initCustomEvent(type, bubbles, cancelable, detail) {
        Object.assign(this, { type, bubbles, cancelable, detail })
      },
    }
    const event = createFileViewerCustomEvent(
      {
        ownerDocument: {
          defaultView: { CustomEvent: {} },
          createEvent(type) {
            assert.equal(type, 'CustomEvent')
            return legacyEvent
          },
        },
      },
      'viewer-error',
      { message: 'boom' }
    )
    assert.equal(event, legacyEvent)
    assert.equal(event.type, 'viewer-error')
    assert.equal(event.bubbles, true)
    assert.equal(event.cancelable, false)
    assert.deepEqual(event.detail, { message: 'boom' })
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'CustomEvent', descriptor)
    else delete globalThis.CustomEvent
  }
})
