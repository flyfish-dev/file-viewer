import assert from 'node:assert/strict'
import { test } from 'node:test'
import { setImmediate as turn } from 'node:timers/promises'
import { readFile } from 'node:fs/promises'
import { runGeo3dHook, reportGeo3dExtensionError } from '../dist/geo3dHooks.js'

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
function owner() {
  const controller = new AbortController(),
    slots = [],
    errors = []
  return {
    controller,
    slots,
    errors,
    run(hook) {
      return runGeo3dHook(
        hook,
        controller.signal,
        (cleanup) => slots.push(cleanup),
        (error) => errors.push(error)
      )
    },
    async close() {
      for (const release of [...slots].reverse()) await release()
    }
  }
}

test(
  'hook cancellation finishes even when application work never settles',
  { timeout: 1000 },
  async () => {
    const a = owner(),
      entered = deferred(),
      reason = new DOMException('exact owner reason', 'AbortError')
    const pending = a.run(() => {
      entered.resolve()
      return new Promise(() => {})
    })
    const rejected = assert.rejects(pending, (error) => error === reason)
    await entered.promise
    a.controller.abort(reason)
    await rejected
    await a.close()
    assert.deepEqual(a.errors, [])
  }
)
test('pre-aborted hooks allocate no release slot and execute no application callback', async () => {
  const a = owner(),
    reason = new Error('already cancelled')
  a.controller.abort(reason)
  await assert.rejects(
    a.run(() => {
      throw new Error('must not execute')
    }),
    (error) => error === reason
  )
  assert.equal(a.slots.length, 0)
})
test('abort before the scheduled callback prevents application execution', async () => {
  const a = owner()
  let calls = 0
  const pending = a.run(() => {
    calls++
  })
  const rejected = assert.rejects(pending, (error) => error === a.controller.signal.reason)
  a.controller.abort()
  await rejected
  await a.close()
  await turn()
  assert.equal(calls, 0)
  assert.deepEqual(a.errors, [])
})
test('normal hooks retain cleanup and release once in reverse registration order', async () => {
  const a = owner(),
    events = []
  await a.run(() => () => events.push('instance'))
  await a.run(async () => async () => {
    await turn()
    events.push('configure')
  })
  assert.deepEqual(events, [])
  await a.close()
  await a.close()
  assert.deepEqual(events, ['configure', 'instance'])
})
test(
  'late cleanup is released once without waiting for the cancelled hook',
  { timeout: 1000 },
  async () => {
    const a = owner(),
      gate = deferred(),
      entered = deferred()
    let releases = 0
    const pending = a.run(() => {
      entered.resolve()
      return gate.promise
    })
    const rejected = assert.rejects(pending, (error) => error === a.controller.signal.reason)
    await entered.promise
    a.controller.abort()
    await rejected
    await a.close()
    assert.equal(releases, 0)
    gate.resolve(() => {
      releases++
    })
    await turn()
    await a.close()
    assert.equal(releases, 1)
    assert.deepEqual(a.errors, [])
  }
)
test('a cleanup returned in the abort turn is not lost or invoked twice', async () => {
  const a = owner(),
    gate = deferred()
  let releases = 0
  const pending = a.run(() => gate.promise)
  const rejected = assert.rejects(pending, (error) => error === a.controller.signal.reason)
  await turn()
  a.controller.abort()
  gate.resolve(() => {
    releases++
  })
  await rejected
  await a.close()
  await turn()
  await a.close()
  assert.equal(releases, 1)
})
test('late rejection is observable and cannot invalidate a different owner', async () => {
  const a = owner(),
    b = owner(),
    gate = deferred(),
    failure = new Error('late hook failed')
  const pending = a.run(() => gate.promise)
  const rejected = assert.rejects(pending, (error) => error === a.controller.signal.reason)
  await turn()
  a.controller.abort()
  await rejected
  await a.close()
  let bReleased = 0
  await b.run(() => () => {
    bReleased++
  })
  gate.reject(failure)
  await turn()
  assert.deepEqual(a.errors, [failure])
  assert.deepEqual(b.errors, [])
  assert.equal(b.controller.signal.aborted, false)
  assert.equal(bReleased, 0)
  await b.close()
  assert.equal(bReleased, 1)
})
test('the exact abort reason is not misreported as a late application failure', async () => {
  const a = owner(),
    gate = deferred()
  const pending = a.run(() => gate.promise)
  const rejected = assert.rejects(pending, (error) => error === a.controller.signal.reason)
  await turn()
  a.controller.abort()
  await rejected
  await a.close()
  gate.reject(a.controller.signal.reason)
  await turn()
  assert.deepEqual(a.errors, [])
})
test('invalid synchronous and asynchronous hook return values reject visibly', async () => {
  for (const value of [null, false, 1, 'cleanup', {}, []]) {
    for (const asynchronous of [false, true]) {
      const a = owner()
      await assert.rejects(
        a.run(() => (asynchronous ? Promise.resolve(value) : value)),
        TypeError
      )
      await a.close()
      assert.deepEqual(a.errors, [])
    }
  }
})
test('invalid late hook values are reported after cancellation', async () => {
  const a = owner(),
    gate = deferred()
  const pending = a.run(() => gate.promise)
  const rejected = assert.rejects(pending, (error) => error === a.controller.signal.reason)
  await turn()
  a.controller.abort()
  await rejected
  await a.close()
  gate.resolve({ not: 'a cleanup function' })
  await turn()
  assert.equal(a.errors.length, 1)
  assert.ok(a.errors[0] instanceof TypeError)
})
test('synchronous and asynchronous application failures preserve identity', async () => {
  for (const asynchronous of [false, true]) {
    const a = owner(),
      failure = new Error('application failure')
    await assert.rejects(
      a.run(() => {
        if (asynchronous) return Promise.reject(failure)
        throw failure
      }),
      (error) => error === failure
    )
    await a.close()
    assert.deepEqual(a.errors, [])
  }
})
test('throwing and rejected cleanups are observable and do not prevent other releases', async () => {
  for (const asynchronous of [false, true]) {
    const a = owner(),
      failure = new Error('cleanup failed'),
      events = []
    await a.run(() => () => {
      events.push('first')
    })
    await a.run(() => () => {
      events.push('second')
      if (asynchronous) return Promise.reject(failure)
      throw failure
    })
    await a.close()
    await a.close()
    assert.deepEqual(a.errors, [failure])
    assert.deepEqual(events, ['second', 'first'])
  }
})
test('throwing late cleanup is reported once with no detached rejection', async () => {
  const a = owner(),
    gate = deferred(),
    failure = new Error('late cleanup failed')
  const pending = a.run(() => gate.promise)
  const rejected = assert.rejects(pending, (error) => error === a.controller.signal.reason)
  await turn()
  a.controller.abort()
  await rejected
  await a.close()
  gate.resolve(async () => {
    throw failure
  })
  await turn()
  await turn()
  await a.close()
  assert.deepEqual(a.errors, [failure])
})
test('reentrant release is latched before application code runs', async () => {
  const a = owner()
  let calls = 0
  await a.run(() => () => {
    calls++
    a.slots[0]()
  })
  await a.close()
  assert.equal(calls, 1)
})
test('error observer failure reports both errors rather than swallowing either', () => {
  const previous = globalThis.reportError,
    reported = [],
    failure = new Error('original'),
    observerFailure = new Error('observer')
  globalThis.reportError = (error) => reported.push(error)
  try {
    reportGeo3dExtensionError(failure, () => {
      throw observerFailure
    })
    assert.equal(reported.length, 1)
    assert.ok(reported[0] instanceof AggregateError)
    assert.deepEqual(reported[0].errors, [failure, observerFailure])
    reportGeo3dExtensionError(failure)
    assert.equal(reported[1], failure)
  } finally {
    if (previous === undefined) delete globalThis.reportError
    else globalThis.reportError = previous
  }
})
test('both runtime hooks use the cancellable ownership helper', async () => {
  const runtime = (
    await readFile(new URL('../src/geo3dRuntime.ts', import.meta.url), 'utf8')
  ).replace(/\s+/g, '')
  assert.match(runtime, /runGeo3dHook\(\(\)=>options\.configureInstance!\(runtimeContext\)/)
  assert.match(runtime, /runGeo3dHook\(\(\)=>options\.configure!\(extensionContext\)/)
  assert.doesNotMatch(runtime, /await options\.(?:configureInstance|configure)\?\./)
})
test(
  'cooperative abort preserves reverse cleanup order without a timer or grace period',
  { timeout: 1000 },
  async () => {
    const a = owner(),
      entered = deferred(),
      events = []
    await a.run(() => () => {
      events.push('instance')
    })
    const render = (async () => {
      try {
        await a.run(async () => {
          const aborted = new Promise((resolve) =>
            a.controller.signal.addEventListener('abort', resolve, { once: true })
          )
          entered.resolve()
          await aborted
          return () => {
            events.push('configure')
          }
        })
      } catch (error) {
        // The runtime registers its complete cleanup promise before callbacks.
        await Promise.resolve().then(() => a.close())
        throw error
      }
    })()
    const rejected = assert.rejects(render, (error) => error === a.controller.signal.reason)
    await entered.promise
    a.controller.abort()
    await rejected
    assert.deepEqual(events, ['configure', 'instance'])
    await a.close()
    assert.deepEqual(events, ['configure', 'instance'])
    assert.deepEqual(a.errors, [])
  }
)
