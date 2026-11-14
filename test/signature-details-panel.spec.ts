// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { webcrypto } from 'node:crypto'
import { createFileViewerI18n } from '@file-viewer/core'
import {
  createSignatureDetailsPanel,
  FILE_VIEWER_SIGNATURE_PANEL_CHANGE_EVENT,
  normalizeSignatureDetailsPanelOptions
} from '../packages/renderers/signature/src/detailsPanel'
import { createSignaturePanelReadingState } from '../packages/renderers/signature/src/detailsPanelReadingState'
import renderSignature from '../packages/renderers/signature/src/signature'
import * as inspection from '../packages/renderers/signature/src/signatureAsn1'
import type {
  FileViewerOptions,
  FileViewerI18nContext,
  FileViewerSignatureOptions,
  FileViewerSignatureDetailsPanelOptions
} from '@file-viewer/core'
import type { SignatureParseLimits } from '../packages/renderers/signature/src/openpgp/types'
import type { SignatureContainerLimits } from '../packages/renderers/signature/src/structured/limits'
import type { JwsVerificationKey } from '../packages/renderers/signature/src/structured/types'

type Assert<T extends true> = T
type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
type PgpCompatibility = Assert<
  Equal<FileViewerSignatureOptions['openPgpLimits'], Partial<SignatureParseLimits> | undefined>
>
type ContainerCompatibility = Assert<
  Equal<
    FileViewerSignatureOptions['containerLimits'],
    Partial<SignatureContainerLimits> | undefined
  >
>
type JwsCompatibility = Assert<
  Equal<FileViewerSignatureOptions['jwsVerificationKeys'], JwsVerificationKey[] | undefined>
>

const dispose: Array<() => void | Promise<void>> = []
afterEach(async () => {
  for (const fn of dispose.splice(0)) await fn()
  vi.restoreAllMocks()
  document.body.replaceChildren()
})
const mount = (
  options: FileViewerSignatureDetailsPanelOptions = {},
  checks: (boolean | undefined)[] = [],
  locale: FileViewerOptions['locale'] = 'en-US',
  shadow = false,
  messages?: FileViewerOptions['messages'],
  i18n?: FileViewerI18nContext
) => {
  const host = document.createElement('div')
  document.body.append(host)
  const parent = shadow ? host.attachShadow({ mode: 'open' }) : host
  const shell = document.createElement('section')
  const header = document.createElement('header')
  const sidebar = document.createElement('aside')
  sidebar.innerHTML =
    '<p class="signature-warning">Trust is not established.</p><input aria-label="original"><button>Choose attachment</button>'
  const main = document.createElement('main')
  const detail = document.createElement('section')
  detail.innerHTML = '<span data-state="pending">Not verified</span><button>Inside details</button>'
  const preview = document.createElement('section')
  preview.className = 'signature-preview'
  preview.innerHTML = '<div class="signature-preview-target"><button>Nested search</button></div>'
  main.append(detail, preview)
  shell.append(header, sidebar, main)
  parent.append(shell)
  const changed = vi.fn()
  const controller = createSignatureDetailsPanel({
    shell,
    header,
    sidebar,
    main,
    state: normalizeSignatureDetailsPanelOptions(options),
    options: { locale, messages },
    i18n,
    checks,
    onExpandedChange: changed
  })
  dispose.push(controller.dispose)
  const toggle = header.querySelector<HTMLButtonElement>('[aria-controls]')!
  const panel = main.querySelector<HTMLElement>('.signature-details-panel')!
  return {
    shell,
    header,
    sidebar,
    main,
    preview,
    detail,
    toggle,
    panel,
    changed,
    controller,
    host
  }
}

describe('signature panel presentation contract', () => {
  it('defaults to expanded top and safely normalizes malformed JavaScript options', () => {
    expect(normalizeSignatureDetailsPanelOptions()).toEqual({
      expanded: true,
      position: 'top',
      openingBehavior: 'overlay'
    })
    expect(
      normalizeSignatureDetailsPanelOptions({
        initialState: 'wrong',
        position: 'wrong',
        openingBehavior: 'wrong'
      } as unknown as FileViewerSignatureDetailsPanelOptions)
    ).toEqual(normalizeSignatureDetailsPanelOptions())
  })
  it.each([
    { position: 'top', initialState: 'expanded' },
    { position: 'top', initialState: 'collapsed' },
    { position: 'left', openingBehavior: 'overlay', initialState: 'expanded' },
    { position: 'left', openingBehavior: 'overlay', initialState: 'collapsed' },
    { position: 'left', openingBehavior: 'push', initialState: 'expanded' },
    { position: 'left', openingBehavior: 'push', initialState: 'collapsed' }
  ] as FileViewerSignatureDetailsPanelOptions[])(
    'supports $position $openingBehavior $initialState without hiding permanent controls',
    (options) => {
      const m = mount(options)
      expect(m.panel.hidden).toBe(options.initialState === 'collapsed')
      expect(m.panel.contains(m.detail)).toBe(true)
      expect(m.panel.contains(m.preview)).toBe(false)
      expect(m.sidebar.closest('[hidden]')).toBeNull()
      for (let i = 0; i < 30; i++) m.toggle.click()
      expect(m.main.querySelector('.signature-preview')).toBe(m.preview)
      expect(m.sidebar.querySelector('input')).not.toBeNull()
      expect(m.panel.querySelector('section')).toBe(m.detail)
    }
  )
  it('emits only serialized live changes, including through Shadow DOM', () => {
    const m = mount({}, [], 'en-US', true)
    const events: CustomEvent[] = []
    m.host.addEventListener(FILE_VIEWER_SIGNATURE_PANEL_CHANGE_EVENT, (event) =>
      events.push(event as CustomEvent)
    )
    expect(events).toHaveLength(0)
    m.toggle.click()
    expect(events).toHaveLength(1)
    expect(events[0].detail).toEqual({
      expanded: false,
      position: 'top',
      openingBehavior: 'overlay'
    })
    expect(JSON.parse(JSON.stringify(events[0].detail))).toEqual(events[0].detail)
    m.header.querySelectorAll('button')[1].click()
    m.header.querySelectorAll('button')[1].click()
    expect(events).toHaveLength(2)
  })
  it('returns focus on Escape/close but never intercepts nested preview Escape', () => {
    const m = mount({}, [], 'en-US', true)
    m.detail.querySelector('button')!.focus()
    m.detail.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true
      })
    )
    expect(m.panel.hidden).toBe(true)
    expect(m.toggle.getRootNode()).toHaveProperty('activeElement', m.toggle)
    m.toggle.click()
    const nested = m.preview.querySelector('button')!
    nested.focus()
    const escape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true
    })
    nested.dispatchEvent(escape)
    expect(escape.defaultPrevented).toBe(false)
    expect(m.panel.hidden).toBe(false)
    m.toggle.click()
    expect(m.toggle.getRootNode()).toHaveProperty('activeElement', nested)
  })
  it.each([
    [false, 'failed'],
    [undefined, 'incomplete'],
    [true, 'neutral']
  ] as const)('does not turn %s into a trusted/valid summary', (check, expected) => {
    const m = mount({ initialState: 'collapsed' }, [check])
    expect(
      m.header.querySelector('.signature-panel-validation')?.getAttribute('data-state') || 'neutral'
    ).toBe(expected)
    expect(m.header.textContent).not.toMatch(/trusted|signature valid/i)
    expect(m.sidebar.textContent).toContain('Trust is not established')
  })
  it('keeps zero checks neutral and instance IDs unique', () => {
    const a = mount({}, [])
    const b = mount({}, [])
    expect(a.panel.id).not.toBe(b.panel.id)
    a.toggle.click()
    expect(b.panel.hidden).toBe(false)
    expect(a.header.textContent).not.toContain('checks failed')
  })
  it.each(['en-US', 'zh-CN', 'zh-TW', 'zh-HK', 'ja-JP', 'de-DE', 'ru-RU'] as const)(
    'uses its own existing translator for %s',
    (locale) => {
      const m = mount({}, [], locale)
      expect(m.toggle.textContent).not.toBe('signature.panel.hide')
      const before = m.toggle.textContent
      m.toggle.click()
      expect(m.toggle.textContent).not.toBe(before)
    }
  )
  it('removes listeners on disposal', () => {
    const m = mount()
    m.controller.dispose()
    m.toggle.click()
    expect(m.changed).not.toHaveBeenCalled()
    expect(m.panel.hidden).toBe(false)
  })
  it('follows its live context, including Russian, and releases every language binding', () => {
    const messages: FileViewerOptions['messages'] = (key, _params, locale) => `${locale}:${key}`
    const language = createFileViewerI18n({ locale: 'en-US', messages })
    dispose.push(language.destroy)
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
    const m = mount({}, [false], 'en-US', false, undefined, language)
    expect(m.toggle.textContent).toBe('en-US:signature.panel.hide')
    const bindingCount = listeners.size
    expect(bindingCount).toBeGreaterThan(0)
    language.update({ locale: 'ru-RU', messages })
    expect(m.toggle.textContent).toBe('ru-RU:signature.panel.hide')
    expect(m.panel.querySelector('h3')?.textContent).toBe('ru-RU:signature.panel.title')
    expect(m.header.querySelector('.signature-panel-validation')?.textContent).toBe(
      'ru-RU:signature.panel.checksFailed'
    )
    for (let i = 0; i < 31; i++) m.toggle.click()
    expect(m.toggle.textContent).toBe('ru-RU:signature.panel.show')
    expect(listeners.size).toBe(bindingCount)
    m.controller.dispose()
    expect(listeners.size).toBe(0)
    language.update({ locale: 'de-DE', messages })
    expect(m.toggle.textContent).toBe('ru-RU:signature.panel.show')
  })
})

describe('real CMS inspection plus nested lifetime contract', () => {
  it('keeps one inspection and one nested instance through 30 toggles', async () => {
    Object.defineProperty(window.crypto, 'subtle', {
      configurable: true,
      value: webcrypto.subtle
    })
    const bytes = readFileSync(
      'packages/renderers/signature/test/fixtures/github-206-contributed/cms/invoice-encapsulated.pdf.p7m'
    )
    const buffer = Uint8Array.from(bytes).buffer
    const inspect = vi.spyOn(inspection, 'inspectSignatureContainer')
    const unmount = vi.fn()
    const nested = vi.fn(async (_bytes, _type, target: HTMLDivElement) => {
      target.textContent = 'Nested placeholder: contract test only, not real PDF rendering.'
      return { $el: target, unmount }
    })
    const target = document.createElement('div')
    document.body.append(target)
    const result = await renderSignature(buffer, target, 'p7m', {
      filename: 'signed-document.pdf.p7m',
      options: {
        locale: 'en-US',
        signature: { detailsPanel: { initialState: 'collapsed' } }
      },
      renderNestedBuffer: nested
    })
    const toggle = target.querySelector<HTMLButtonElement>('[aria-controls]')!
    expect(toggle).not.toBeNull()
    expect(inspect).toHaveBeenCalledTimes(1)
    expect(nested).toHaveBeenCalledTimes(1)
    const preview = target.querySelector('.signature-preview-target')
    for (let i = 0; i < 30; i++) toggle.click()
    expect(inspect).toHaveBeenCalledTimes(1)
    expect(nested).toHaveBeenCalledTimes(1)
    expect(unmount).not.toHaveBeenCalled()
    expect(target.querySelector('.signature-preview-target')).toBe(preview)
    await ('unmount' in result ? result.unmount() : undefined)
    expect(unmount).toHaveBeenCalledTimes(1)
  })
  it('renders without context and never labels certificate-only content trusted', async () => {
    const bytes = readFileSync(
      'packages/renderers/signature/test/fixtures/github-206-contributed/cms/certificate-chain.p7b'
    )
    const target = document.createElement('div')
    document.body.append(target)
    const result = await renderSignature(Uint8Array.from(bytes).buffer, target, 'p7b')
    expect(target.querySelector('[aria-controls]')).not.toBeNull()
    expect(target.querySelector('.signature-panel-validation')).toBeNull()
    dispose.push(() => ('unmount' in result ? result.unmount() : undefined))
  })
})

describe('bounded reading adjustment ownership', () => {
  it('does not schedule any work for overlay and cancels push work on disposal or newer input', () => {
    const shell = document.createElement('div')
    const preview = document.createElement('div')
    shell.append(preview)
    document.body.append(shell)
    const callbacks = new Map<number, FrameRequestCallback>()
    let id = 0
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((fn) => {
      callbacks.set(++id, fn)
      return id
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((key) => {
      callbacks.delete(key)
    })
    const state = createSignaturePanelReadingState(shell, preview)
    state.beforeChange('left', 'overlay')()
    expect(callbacks.size).toBe(0)
    state.beforeChange('left', 'push')()
    expect(callbacks.size).toBe(1)
    preview.dispatchEvent(new WheelEvent('wheel', { bubbles: true }))
    expect(callbacks.size).toBe(0)
    state.beforeChange('left', 'push')()
    expect(callbacks.size).toBe(1)
    state.dispose()
    expect(callbacks.size).toBe(0)
  })
})

it('keeps the manual panel choice when a detached CMS original is changed', async () => {
  Object.defineProperty(window.crypto, 'subtle', {
    configurable: true,
    value: webcrypto.subtle
  })
  const fixture = 'packages/renderers/signature/test/fixtures/github-206-contributed/'
  const bytes = Uint8Array.from(readFileSync(fixture + 'cms/invoice-detached.pdf.p7s')).buffer
  const original = Uint8Array.from(readFileSync(fixture + 'originals/invoice.pdf')).buffer
  const inspect = vi.spyOn(inspection, 'inspectSignatureContainer')
  const children: Array<ReturnType<typeof vi.fn>> = []
  const nested = vi.fn(async (_bytes, _type, target: HTMLDivElement) => {
    const unmount = vi.fn()
    children.push(unmount)
    target.textContent = 'Nested fixture lifetime control'
    return { $el: target, unmount }
  })
  const target = document.createElement('div')
  document.body.append(target)
  const result = await renderSignature(bytes, target, 'p7s', {
    filename: 'document.pdf.p7s',
    options: {
      locale: 'en-US',
      signature: { originalContent: original, originalFilename: 'invoice.pdf' }
    },
    renderNestedBuffer: nested
  })
  target.querySelector<HTMLButtonElement>('[aria-controls]')!.click()
  expect(target.querySelector<HTMLElement>('.signature-details-panel')!.hidden).toBe(true)
  const input = target.querySelector('input[type=file]')!
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [
      {
        name: 'replacement.pdf',
        size: original.byteLength,
        arrayBuffer: async () => original.slice(0)
      }
    ]
  })
  input.dispatchEvent(new Event('change'))
  await vi.waitFor(() => expect(nested).toHaveBeenCalledTimes(2))
  expect(inspect).toHaveBeenCalledTimes(2) // Deliberate input change, not the toggle.
  expect(children[0]).toHaveBeenCalledTimes(1)
  expect(target.querySelector<HTMLElement>('.signature-details-panel')!.hidden).toBe(true)
  await ('unmount' in result ? result.unmount() : undefined)
  expect(children[1]).toHaveBeenCalledTimes(1)
})

it('bounds scroll/anchor discovery and expires queued work even when animation frames pause', () => {
  vi.useFakeTimers()
  try {
    const shell = document.createElement('div'),
      preview = document.createElement('div')
    preview.style.overflowY = 'auto'
    Object.defineProperties(preview, {
      scrollHeight: { value: 2000 },
      clientHeight: { value: 500 }
    })
    const fragment = document.createDocumentFragment()
    for (let i = 0; i < 2000; i++) {
      const line = document.createElement('span')
      line.dataset.line = String(i)
      fragment.append(line)
    }
    preview.append(fragment)
    shell.append(preview)
    document.body.append(shell)
    const all = vi.spyOn(preview, 'querySelectorAll')
    const callbacks = new Map<number, FrameRequestCallback>()
    let id = 0
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((fn) => {
      callbacks.set(++id, fn)
      return id
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((key) => {
      callbacks.delete(key)
    })
    const state = createSignaturePanelReadingState(shell, preview)
    state.beforeChange('left', 'push')()
    expect(all).not.toHaveBeenCalled()
    expect(callbacks.size).toBe(1)
    vi.advanceTimersByTime(250)
    expect(callbacks.size).toBe(0)
    state.dispose()
  } finally {
    vi.useRealTimers()
  }
})

it('tracks a delayed nested reflow only within its bounded window and rejects stale callbacks', () => {
  vi.useFakeTimers()
  try {
    const shell = document.createElement('div'),
      preview = document.createElement('div')
    preview.style.overflowY = 'auto'
    let height = 2000
    Object.defineProperties(preview, {
      scrollHeight: { get: () => height },
      clientHeight: { value: 500 },
      clientWidth: { value: 400 }
    })
    shell.append(preview)
    document.body.append(shell)
    preview.scrollTop = 750
    const callbacks = new Map<number, FrameRequestCallback>()
    let id = 0
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((fn) => {
      callbacks.set(++id, fn)
      return id
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((key) => {
      callbacks.delete(key)
    })
    vi.spyOn(window.performance, 'now').mockImplementation(() => Date.now())
    const tick = () => {
      vi.advanceTimersByTime(16)
      const batch = [...callbacks.values()]
      callbacks.clear()
      batch.forEach((fn) => fn(Date.now()))
    }
    const state = createSignaturePanelReadingState(shell, preview)
    state.beforeChange('left', 'push')()
    tick()
    tick()
    tick()
    expect(preview.scrollTop).toBe(750)
    height = 4000
    tick()
    tick()
    tick()
    expect(preview.scrollTop).toBe(1750)
    const stale = [...callbacks.values()]
    state.dispose()
    preview.scrollTop = 2200
    height = 6000
    stale.forEach((fn) => fn(Date.now()))
    expect(preview.scrollTop).toBe(2200)
    expect(callbacks.size).toBe(0)
  } finally {
    vi.useRealTimers()
  }
})

it('accepts the inline public createViewer signature options and keeps the loaded nested session', async () => {
  Object.defineProperty(window.crypto, 'subtle', { configurable: true, value: webcrypto.subtle })
  const { createViewer } = await import('@file-viewer/core')
  const { signatureRenderer } = await import('../packages/renderers/signature/src/index')
  const { textRenderer } = await import('../packages/renderers/text/src/index')
  const host = document.createElement('div')
  document.body.append(host)
  const viewer = createViewer(host, {
    options: {
      styleIsolation: 'none',
      renderers: [signatureRenderer, textRenderer],
      signature: {
        detailsPanel: { initialState: 'collapsed', position: 'left', openingBehavior: 'push' }
      }
    }
  })
  const bytes = Uint8Array.from(
    readFileSync(
      'packages/renderers/signature/test/fixtures/github-206-contributed/cms/xml-encapsulated-but-named.p7s'
    )
  ).buffer
  await viewer.load({ buffer: bytes, filename: 'signed.xml.p7s' })
  const panel = host.querySelector<HTMLElement>('.signature-details-panel')!,
    code = host.querySelector('.code-viewer')
  expect(panel?.hidden).toBe(true)
  expect(code).not.toBeNull()
  host.querySelector<HTMLButtonElement>('.signature-header [aria-controls]')!.click()
  expect(panel.hidden).toBe(false)
  expect(host.querySelector('.code-viewer')).toBe(code)
  await viewer.destroy()
})

it('keeps custom messages and separate instance locales without global locale state', () => {
  const custom = mount({}, [], 'de-DE', false, {
    'signature.panel.hide': 'Custom close',
    'signature.panel.show': 'Custom open'
  })
  const japanese = mount({}, [], 'ja-JP')
  expect(custom.toggle.textContent).toBe('Custom close')
  expect(japanese.toggle.textContent).toBe('署名の詳細を非表示')
  custom.toggle.click()
  expect(custom.toggle.textContent).toBe('Custom open')
  expect(japanese.toggle.textContent).toBe('署名の詳細を非表示')
})

it('owns scheduled fallback work in the shell document window', () => {
  const iframe = document.createElement('iframe')
  document.body.append(iframe)
  const doc = iframe.contentDocument!,
    owner = iframe.contentWindow!
  const shell = doc.createElement('div'),
    preview = doc.createElement('div')
  shell.append(preview)
  doc.body.append(shell)
  Object.defineProperty(owner, 'requestAnimationFrame', { configurable: true, value: undefined })
  let id = 0
  const timeout = vi.spyOn(owner, 'setTimeout').mockImplementation(() => ++id)
  const clear = vi.spyOn(owner, 'clearTimeout').mockImplementation(() => {})
  const state = createSignaturePanelReadingState(shell, preview)
  state.beforeChange('left', 'push')()
  expect(timeout).toHaveBeenCalledTimes(2)
  state.dispose()
  expect(clear).toHaveBeenCalledTimes(2)
  iframe.remove()
})

const rect = (top: number, height: number, left = 0, width = 320) =>
  ({
    top,
    bottom: top + height,
    left,
    right: left + width,
    x: left,
    y: top,
    width,
    height,
    toJSON: () => ({})
  }) as DOMRect
const sizedShell = (m: ReturnType<typeof mount>) => {
  m.shell.style.overflowY = 'auto'
  Object.defineProperties(m.shell, { clientHeight: { value: 400 }, clientWidth: { value: 320 } })
  vi.spyOn(m.shell, 'getBoundingClientRect').mockImplementation(() => rect(0, 400))
}
it('Review reveals the original finding in the owning top shell, including fractional pixels', () => {
  const m = mount({ initialState: 'collapsed' })
  sizedShell(m)
  const finding = m.panel.querySelector<HTMLElement>('[data-state]')!
  vi.spyOn(finding, 'getBoundingClientRect').mockImplementation(() =>
    rect(1374.1875 - m.shell.scrollTop, 24)
  )
  m.header.querySelectorAll('button')[1].click()
  expect(document.activeElement).toBe(finding)
  expect(m.shell.scrollTop).toBe(999)
  expect(finding.getBoundingClientRect().bottom).toBeLessThanOrEqual(400)
  expect(m.panel.scrollTop).toBe(0)
  m.header.querySelectorAll('button')[1].click()
  expect(m.shell.scrollTop).toBe(999)
})
it('Review reveals through the panel and then shell without touching the nested scroller', () => {
  const m = mount({ position: 'left', initialState: 'collapsed' })
  sizedShell(m)
  m.panel.style.overflowY = 'auto'
  Object.defineProperties(m.panel, { clientHeight: { value: 180 }, clientWidth: { value: 320 } })
  const finding = m.panel.querySelector<HTMLElement>('[data-state]')!
  vi.spyOn(m.panel, 'getBoundingClientRect').mockImplementation(() =>
    rect(500 - m.shell.scrollTop, 180)
  )
  vi.spyOn(finding, 'getBoundingClientRect').mockImplementation(() =>
    rect(900 - m.shell.scrollTop - m.panel.scrollTop, 24)
  )
  m.preview.scrollTop = 70
  m.header.querySelectorAll('button')[1].click()
  expect(document.activeElement).toBe(finding)
  expect(m.panel.scrollTop).toBe(244)
  expect(m.shell.scrollTop).toBe(280)
  expect(m.preview.scrollTop).toBe(70)
})
it('Review avoids the owning sticky header and falls back to its heading with no finding', () => {
  const m = mount()
  sizedShell(m)
  m.header.style.position = 'sticky'
  vi.spyOn(m.header, 'getBoundingClientRect').mockImplementation(() => rect(0, 130))
  m.panel.querySelector('[data-state]')!.removeAttribute('data-state')
  const heading = m.panel.querySelector<HTMLElement>('h3')!
  m.shell.scrollTop = 1000
  vi.spyOn(heading, 'getBoundingClientRect').mockImplementation(() =>
    rect(1100 - m.shell.scrollTop, 24)
  )
  m.header.querySelectorAll('button')[1].click()
  expect(document.activeElement).toBe(heading)
  expect(m.shell.scrollTop).toBe(970)
  expect(heading.getBoundingClientRect().top).toBe(130)
})
it('Review does not focus a detached finding if the change event disposes its viewer', () => {
  const m = mount({ initialState: 'collapsed' })
  const finding = m.panel.querySelector<HTMLElement>('[data-state]')!,
    focus = vi.spyOn(finding, 'focus')
  m.host.addEventListener(FILE_VIEWER_SIGNATURE_PANEL_CHANGE_EVENT, () => {
    m.controller.dispose()
    m.shell.remove()
  })
  m.header.querySelectorAll('button')[1].click()
  expect(focus).not.toHaveBeenCalled()
})
