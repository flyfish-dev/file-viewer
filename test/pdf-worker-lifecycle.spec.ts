import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'

const rendererRequire = createRequire(
  new URL('../packages/renderers/pdf/package.json', import.meta.url)
)
const workerSource = readFileSync(
  rendererRequire.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs'),
  'utf8'
)
const parsed = ts.createSourceFile(
  'pdf.worker.mjs',
  workerSource,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.JS
)
const initializers: ts.FunctionDeclaration[] = []
const visit = (node: ts.Node) => {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'setupDoc') initializers.push(node)
  ts.forEachChild(node, visit)
}
visit(parsed)
if (initializers.length !== 1) throw new Error('Pinned PDF.js document initializer changed.')

// Execute the installed, patched implementation rather than a second copy of
// its behavior. Browser coverage also exercises its real message transport.
const createInitializer = new Function(
  'dependencies',
  `
  let { handler, getPdfManager, loadDocument, PasswordException, XRefParseException,
    AbortException, WorkerTask, startWorkerTask, finishWorkerTask, wrapReason } = dependencies;
  let terminated = false;
  let pdfManager = null;
  function ensureNotTerminated() { if (terminated) throw new Error('Worker was terminated'); }
  ${initializers[0].getText(parsed)}
  return { setupDoc, terminate() { terminated = true; handler = null; } };
`
)

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const flush = () => new Promise<void>((resolve) => setImmediate(resolve))
class PasswordException extends Error {}
class XRefParseException extends Error {}

const harness = () => {
  const manager = {
    requestLoadedStream: vi.fn().mockResolvedValue({ bytes: new Uint8Array(4) }),
    terminate: vi.fn(),
    updatePassword: vi.fn()
  }
  const handler = { send: vi.fn(), sendWithPromise: vi.fn() }
  const dependencies = {
    handler,
    getPdfManager: vi.fn().mockResolvedValue(manager),
    loadDocument: vi.fn().mockResolvedValue({ numPages: 3 }),
    PasswordException,
    XRefParseException,
    AbortException: Error,
    WorkerTask: class {},
    startWorkerTask: vi.fn(),
    finishWorkerTask: vi.fn(),
    wrapReason: (error: unknown) => error
  }
  return { manager, ...dependencies, ...createInitializer(dependencies) }
}

describe('PDF.js document startup cancellation', () => {
  it('keeps successful parsing and data delivery', async () => {
    const h = harness()
    h.setupDoc({})
    await flush()
    expect(h.handler.send.mock.calls).toEqual([
      ['DataLoaded', { length: 4 }],
      ['GetDoc', { pdfInfo: { numPages: 3 } }]
    ])
  })

  it('does not initialize an already canceled document', () => {
    const h = harness()
    h.terminate()
    expect(() => h.setupDoc({})).not.toThrow()
    expect(h.getPdfManager).not.toHaveBeenCalled()
  })

  it('releases a manager that arrives after cancellation without starting parsing', async () => {
    const h = harness()
    const pending = deferred<typeof h.manager>()
    h.getPdfManager.mockReturnValue(pending.promise)
    h.setupDoc({})
    h.terminate()
    pending.resolve(h.manager)
    await flush()
    expect(h.manager.terminate).toHaveBeenCalledOnce()
    expect(h.loadDocument).not.toHaveBeenCalled()
    expect(h.manager.requestLoadedStream).not.toHaveBeenCalled()
    expect(h.handler.send).not.toHaveBeenCalled()
  })

  it.each(['resolve', 'reject'] as const)(
    'settles detached parsing after cancellation: %s',
    async (outcome) => {
      const h = harness()
      const pending = deferred<object>()
      const stream = deferred<object>()
      h.loadDocument.mockReturnValue(pending.promise)
      h.manager.requestLoadedStream.mockReturnValue(stream.promise)
      h.setupDoc({})
      await flush()
      h.terminate()
      stream.resolve({ bytes: new Uint8Array(4) })
      if (outcome === 'resolve') pending.resolve({ numPages: 3 })
      else pending.reject(new Error('Parse canceled'))
      await flush()
      expect(h.handler.send).not.toHaveBeenCalled()
    }
  )

  it('reports an active parse failure instead of hiding it', async () => {
    const h = harness()
    const error = new Error('Invalid PDF structure')
    h.loadDocument.mockRejectedValue(error)
    h.setupDoc({})
    await flush()
    expect(h.handler.send).toHaveBeenCalledWith('DocException', error)
    expect(h.handler.send).not.toHaveBeenCalledWith('GetDoc', expect.anything())
  })

  it('keeps cross-reference recovery for an active document', async () => {
    const h = harness()
    h.loadDocument.mockRejectedValueOnce(new XRefParseException())
    h.setupDoc({})
    await flush()
    expect(h.loadDocument.mock.calls).toEqual([[false], [true]])
    expect(h.handler.send).toHaveBeenCalledWith('GetDoc', { pdfInfo: { numPages: 3 } })
  })

  it('does not start recovery after its stream completes following cancellation', async () => {
    const h = harness()
    const recovery = deferred<object>()
    h.loadDocument.mockRejectedValueOnce(new XRefParseException())
    h.manager.requestLoadedStream.mockImplementation((initial?: boolean) =>
      initial ? Promise.resolve({ bytes: new Uint8Array(4) }) : recovery.promise
    )
    h.setupDoc({})
    await flush()
    h.handler.send.mockClear()
    h.terminate()
    recovery.resolve({ bytes: new Uint8Array(4) })
    await flush()
    expect(h.loadDocument.mock.calls).toEqual([[false]])
    expect(h.handler.send).not.toHaveBeenCalled()
  })

  it('reports recovery stream failure without an unhandled rejection', async () => {
    const h = harness()
    const error = new Error('Truncated PDF range')
    h.loadDocument.mockRejectedValueOnce(new XRefParseException())
    h.manager.requestLoadedStream.mockImplementation((initial?: boolean) =>
      initial ? Promise.resolve({ bytes: new Uint8Array(4) }) : Promise.reject(error)
    )
    h.setupDoc({})
    await flush()
    expect(h.handler.send).toHaveBeenCalledWith('DocException', error)
  })

  it.each(['resolve', 'reject'] as const)(
    'finishes a canceled password prompt: %s',
    async (outcome) => {
      const h = harness()
      const prompt = deferred<object>()
      h.handler.sendWithPromise.mockReturnValue(prompt.promise)
      h.loadDocument.mockRejectedValueOnce(new PasswordException())
      h.setupDoc({})
      await flush()
      h.handler.send.mockClear()
      h.terminate()
      if (outcome === 'resolve') prompt.resolve({ password: 'test-only' })
      else prompt.reject(new Error('Prompt canceled'))
      await flush()
      expect(h.finishWorkerTask).toHaveBeenCalledOnce()
      expect(h.manager.updatePassword).not.toHaveBeenCalled()
      expect(h.handler.send).not.toHaveBeenCalled()
    }
  )
})
