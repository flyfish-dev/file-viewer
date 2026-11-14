// @vitest-environment jsdom

import { expect, it, vi } from 'vitest'
import { createFileViewerI18n } from '@file-viewer/core'
import { SignatureContainerWorkerClient } from '../packages/renderers/signature/src/structured/containerClient'
import renderSignature from '../packages/renderers/signature/src/signature'
import * as jws from '../packages/renderers/signature/src/structured/jws'

it('disposes a late ASiC nested result after signature unmount', async () => {
  const inspect = vi
    .spyOn(SignatureContainerWorkerClient.prototype, 'inspectAsic')
    .mockResolvedValue({
      kind: 'ASiC-S',
      mediaType: 'application/vnd.etsi.asic-s+zip',
      sourceSize: 8,
      entryCount: 1,
      totalUncompressedBytes: 4,
      warnings: [],
      signatures: [],
      documents: [
        {
          name: 'document.pdf',
          uncompressedSize: 4,
          data: new Uint8Array([37, 80, 68, 70])
        }
      ]
    } as never)
  let finish!: (value: { unmount: () => void }) => void
  const childUnmount = vi.fn()
  const pending = new Promise<{ unmount: () => void }>((resolve) => {
    finish = resolve
  })
  const target = document.createElement('div')
  document.body.append(target)
  const result = await renderSignature(new ArrayBuffer(8), target, 'asics', {
    filename: 'documents.asics',
    options: { locale: 'en-US' },
    renderNestedBuffer: () => pending
  })
  await result.unmount()
  finish({ unmount: childUnmount })
  await new Promise((resolve) => setTimeout(resolve, 0))
  inspect.mockRestore()
  target.remove()
  expect(childUnmount).toHaveBeenCalledTimes(1)
})

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))
const fakeAsic = (names = ['first.pdf', 'second.pdf']) => ({
  kind: 'ASiC-S',
  mediaType: 'application/vnd.etsi.asic-s+zip',
  sourceSize: 8,
  entryCount: names.length,
  totalUncompressedBytes: names.length * 4,
  warnings: [],
  signatures: [],
  documents: names.map((name) => ({
    name,
    uncompressedSize: 4,
    data: new Uint8Array([37, 80, 68, 70])
  }))
})

it('keeps live signature and panel copy bounded across selections and releases it on unmount', async () => {
  const inspect = vi
    .spyOn(SignatureContainerWorkerClient.prototype, 'inspectAsic')
    .mockResolvedValue(fakeAsic() as never)
  const messages = (key: string, _params: unknown, locale: string) => `${locale}:${key}`
  const language = createFileViewerI18n({ locale: 'en-US', messages })
  const listeners = new Set<() => void>()
  const subscribe = language.subscribe.bind(language)
  vi.spyOn(language, 'subscribe').mockImplementation((listener) => {
    listeners.add(listener)
    const unsubscribe = subscribe(listener)
    return () => {
      listeners.delete(listener)
      unsubscribe()
    }
  })
  const target = document.createElement('div')
  document.body.append(target)
  const result = await renderSignature(new ArrayBuffer(8), target, 'asics', {
    filename: 'live.asics',
    options: language.options,
    i18n: language
  })
  try {
    await tick()
    const bindingCount = listeners.size
    expect(bindingCount).toBeGreaterThan(0)
    const toggle = target.querySelector('[aria-controls]')!
    language.update({ locale: 'ru-RU', messages })
    expect(toggle.textContent).toBe('ru-RU:signature.panel.hide')
    expect(target.querySelector('.signature-card h3')?.textContent).toBe(
      'ru-RU:signature.ui.asic.package.edd529'
    )
    for (let i = 0; i < 8; i++) {
      const name = i % 2 ? 'first.pdf' : 'second.pdf'
      const button = [...target.querySelectorAll('button')].find((node) => node.textContent === name)!
      button.click()
      await tick()
      expect(listeners.size).toBe(bindingCount)
    }
    await result.unmount()
    expect(listeners.size).toBe(0)
    language.update({ locale: 'de-DE', messages })
    expect(toggle.textContent).toBe('ru-RU:signature.panel.hide')
  } finally {
    await result.unmount()
    language.destroy()
    inspect.mockRestore()
    target.remove()
  }
})

it('accepts only the newest attachment and disposes each child exactly once', async () => {
  const inspect = vi
    .spyOn(SignatureContainerWorkerClient.prototype, 'inspectAsic')
    .mockResolvedValue(fakeAsic() as never)
  const pending: Array<(value: { unmount: () => void }) => void> = []
  const target = document.createElement('div')
  document.body.append(target)
  const result = await renderSignature(new ArrayBuffer(8), target, 'asics', {
    filename: 'documents.asics',
    renderNestedBuffer: () => new Promise((resolve) => pending.push(resolve))
  })
  await tick()
  const secondButton = [...target.querySelectorAll('button')].find(
    (button) => button.textContent === 'second.pdf'
  )!
  secondButton.click()
  await tick()
  expect(pending).toHaveLength(2)
  const firstUnmount = vi.fn(),
    secondUnmount = vi.fn()
  pending[0]({ unmount: firstUnmount })
  await tick()
  expect(firstUnmount).toHaveBeenCalledTimes(1)
  pending[1]({ unmount: secondUnmount })
  await tick()
  expect(secondUnmount).not.toHaveBeenCalled()
  await result.unmount()
  expect(firstUnmount).toHaveBeenCalledTimes(1)
  expect(secondUnmount).toHaveBeenCalledTimes(1)
  inspect.mockRestore()
  target.remove()
})

it('a late result cannot replace a new document or affect another signature instance', async () => {
  const inspect = vi
    .spyOn(SignatureContainerWorkerClient.prototype, 'inspectAsic')
    .mockResolvedValue(fakeAsic(['doc.pdf']) as never)
  const target = document.createElement('div'),
    other = document.createElement('div')
  document.body.append(target, other)
  let finish!: (value: { unmount: () => void }) => void
  const old = await renderSignature(new ArrayBuffer(8), target, 'asics', {
    filename: 'old.asics',
    renderNestedBuffer: () =>
      new Promise((resolve) => {
        finish = resolve
      })
  })
  const otherUnmount = vi.fn()
  const separate = await renderSignature(new ArrayBuffer(8), other, 'asics', {
    filename: 'separate.asics',
    renderNestedBuffer: async () => ({ unmount: otherUnmount })
  })
  await tick()
  await old.unmount()
  const newUnmount = vi.fn()
  const next = await renderSignature(new ArrayBuffer(8), target, 'asics', {
    filename: 'new.asics',
    renderNestedBuffer: async () => ({ unmount: newUnmount })
  })
  const staleUnmount = vi.fn()
  finish({ unmount: staleUnmount })
  await tick()
  expect(staleUnmount).toHaveBeenCalledTimes(1)
  expect(target.textContent).toContain('new.asics')
  expect(other.textContent).toContain('separate.asics')
  expect(newUnmount).not.toHaveBeenCalled()
  expect(otherUnmount).not.toHaveBeenCalled()
  await next.unmount()
  await separate.unmount()
  expect(newUnmount).toHaveBeenCalledTimes(1)
  expect(otherUnmount).toHaveBeenCalledTimes(1)
  inspect.mockRestore()
  target.remove()
  other.remove()
})

it('routes rejected stale cleanup through existing diagnostics without reviving the UI', async () => {
  const inspect = vi
    .spyOn(SignatureContainerWorkerClient.prototype, 'inspectAsic')
    .mockResolvedValue(fakeAsic(['doc.pdf']) as never)
  const target = document.createElement('div')
  document.body.append(target)
  let finish!: (value: { unmount: () => Promise<void> }) => void
  const diagnostic = vi.fn()
  const result = await renderSignature(new ArrayBuffer(8), target, 'asics', {
    filename: 'doc.asics',
    options: { onDiagnostic: diagnostic },
    renderNestedBuffer: () =>
      new Promise((resolve) => {
        finish = resolve
      })
  })
  await result.unmount()
  finish({
    unmount: async () => {
      throw new Error('test cleanup failure')
    }
  })
  await tick()
  expect(diagnostic).toHaveBeenCalledWith(
    expect.objectContaining({
      code: 'signature-stale-nested-dispose-failed',
      level: 'warning'
    })
  )
  expect(target.childElementCount).toBe(0)
  inspect.mockRestore()
  target.remove()
})

it('transfers ownership before an asynchronous child disposal during rapid selection', async () => {
  const inspect = vi
    .spyOn(SignatureContainerWorkerClient.prototype, 'inspectAsic')
    .mockResolvedValue(fakeAsic() as never)
  const target = document.createElement('div')
  document.body.append(target)
  let finish!: () => void
  const oldUnmount = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      })
  )
  const nextUnmount = vi.fn()
  let calls = 0
  const result = await renderSignature(new ArrayBuffer(8), target, 'asics', {
    filename: 'rapid.asics',
    renderNestedBuffer: async () => ({ unmount: ++calls === 1 ? oldUnmount : nextUnmount })
  })
  await tick()
  const button = (name: string) =>
    [...target.querySelectorAll('button')].find((b) => b.textContent === name)!
  button('second.pdf').click()
  button('first.pdf').click()
  await tick()
  const oldCalls = oldUnmount.mock.calls.length
  finish()
  await tick()
  await result.unmount()
  inspect.mockRestore()
  target.remove()
  expect(oldCalls).toBe(1)
  expect(nextUnmount).toHaveBeenCalledTimes(1)
})

it('an old pending disposal cannot erase a newly mounted child or replacement document', async () => {
  const inspect = vi
    .spyOn(SignatureContainerWorkerClient.prototype, 'inspectAsic')
    .mockResolvedValue(fakeAsic() as never)
  const target = document.createElement('div')
  document.body.append(target)
  let finish!: () => void
  const oldUnmount = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      })
  )
  const newestUnmount = vi.fn()
  let calls = 0
  const old = await renderSignature(new ArrayBuffer(8), target, 'asics', {
    filename: 'old.asics',
    renderNestedBuffer: async () => ({ unmount: ++calls === 1 ? oldUnmount : newestUnmount })
  })
  await tick()
  const buttons = [...target.querySelectorAll('button')]
  buttons.find((b) => b.textContent === 'second.pdf')!.click()
  await tick()
  buttons.find((b) => b.textContent === 'first.pdf')!.click()
  await tick()
  expect(calls).toBe(2)
  finish()
  await tick()
  const destroy = old.unmount()
  await destroy
  expect(oldUnmount).toHaveBeenCalledTimes(1)
  expect(newestUnmount).toHaveBeenCalledTimes(1)
  // Separate delayed teardown must remove only its own old root.
  let finishDispose!: () => void
  const delayed = await renderSignature(new ArrayBuffer(8), target, 'asics', {
    filename: 'delayed.asics',
    renderNestedBuffer: async () => ({
      unmount: () =>
        new Promise<void>((r) => {
          finishDispose = r
        })
    })
  })
  await tick()
  const pendingDestroy = delayed.unmount()
  const next = await renderSignature(new ArrayBuffer(8), target, 'asics', {
    filename: 'replacement.asics',
    renderNestedBuffer: async () => ({ unmount: vi.fn() })
  })
  await tick()
  finishDispose()
  await pendingDestroy
  expect(target.textContent).toContain('replacement.asics')
  await next.unmount()
  inspect.mockRestore()
  target.remove()
})

it('propagates destroy cleanup rejection, reports it, and never removes a replacement root', async () => {
  const inspect = vi
    .spyOn(SignatureContainerWorkerClient.prototype, 'inspectAsic')
    .mockResolvedValue(fakeAsic() as never)
  const target = document.createElement('div')
  document.body.append(target)
  let rejectDispose!: (error: Error) => void
  const unmount = vi.fn(
    () =>
      new Promise<void>((_, reject) => {
        rejectDispose = reject
      })
  )
  const diagnostic = vi.fn()
  const result = await renderSignature(new ArrayBuffer(8), target, 'asics', {
    filename: 'reject.asics',
    options: { onDiagnostic: diagnostic },
    renderNestedBuffer: async () => ({ unmount })
  })
  await tick()
  const rejected = expect(result.unmount()).rejects.toThrow('cleanup rejected')
  const replacement = document.createElement('p')
  replacement.textContent = 'Replacement document'
  target.replaceChildren(replacement)
  rejectDispose(new Error('cleanup rejected'))
  await rejected
  expect(target.firstChild).toBe(replacement)
  expect(diagnostic).toHaveBeenCalledTimes(1)
  await result.unmount()
  expect(unmount).toHaveBeenCalledTimes(1)
  inspect.mockRestore()
  target.remove()
})

it.each(['original', 'key'])(
  'only the newest %s reload survives an asynchronous disposal',
  async (mode) => {
    const inspection = vi
      .spyOn(jws, 'inspectJws')
      .mockResolvedValue({
        serialization: 'compact',
        detached: true,
        payloadEncoded: true,
        payload: new TextEncoder().encode('<synthetic/>'),
        warnings: [],
        signatures: []
      } as never)
    const target = document.createElement('div')
    document.body.append(target)
    let finish!: () => void
    const oldUnmount = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        })
    )
    const nextUnmount = vi.fn()
    let calls = 0
    const result = await renderSignature(
      new TextEncoder().encode('e30.e30.YQ').buffer,
      target,
      'jws',
      {
        filename: 'reload.jws',
        renderNestedBuffer: async () => ({ unmount: ++calls === 1 ? oldUnmount : nextUnmount })
      }
    )
    const input = target.querySelectorAll('input')[mode === 'key' ? 1 : 0]
    const bytes = new TextEncoder().encode(
      mode === 'key' ? '{"kty":"RSA","n":"AQ","e":"AQAB"}' : '<replacement/>'
    ).buffer
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [
        {
          name: mode === 'key' ? 'public.jwk' : 'original.xml',
          size: bytes.byteLength,
          arrayBuffer: async () => bytes.slice(0)
        }
      ]
    })
    input.dispatchEvent(new Event('change'))
    await tick()
    input.dispatchEvent(new Event('change'))
    await tick()
    expect(calls).toBe(2)
    expect(oldUnmount).toHaveBeenCalledTimes(1)
    finish()
    await tick()
    expect(calls).toBe(2)
    expect(nextUnmount).not.toHaveBeenCalled()
    await result.unmount()
    expect(nextUnmount).toHaveBeenCalledTimes(1)
    inspection.mockRestore()
    target.remove()
  }
)

it('reports an asynchronous reload disposal failure through the existing error UI', async () => {
  const inspection = vi
    .spyOn(jws, 'inspectJws')
    .mockResolvedValue({
      serialization: 'compact',
      detached: true,
      payloadEncoded: true,
      payload: new TextEncoder().encode('<synthetic/>'),
      warnings: [],
      signatures: []
    } as never)
  const target = document.createElement('div')
  document.body.append(target)
  const diagnostic = vi.fn(),
    unmount = vi.fn(async () => {
      throw new Error('reload cleanup rejected')
    })
  const result = await renderSignature(
    new TextEncoder().encode('e30.e30.YQ').buffer,
    target,
    'jws',
    {
      filename: 'reload.jws',
      options: { onDiagnostic: diagnostic },
      renderNestedBuffer: async () => ({ unmount })
    }
  )
  const input = target.querySelector('input')!,
    bytes = new TextEncoder().encode('<replacement/>').buffer
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [{ name: 'original.xml', size: bytes.byteLength, arrayBuffer: async () => bytes }]
  })
  input.dispatchEvent(new Event('change'))
  await tick()
  expect(target.querySelector('.signature-error')?.textContent).toBe('reload cleanup rejected')
  expect(diagnostic).toHaveBeenCalledTimes(1)
  await result.unmount()
  expect(unmount).toHaveBeenCalledTimes(1)
  inspection.mockRestore()
  target.remove()
})
