// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, ref } from 'vue'
import DemoWelcomeCard from '../apps/viewer-demo/src/components/demo/DemoWelcomeCard.vue'
import type { DemoWelcomeSample } from '../apps/viewer-demo/src/components/demo/DemoWelcomeCard.vue'
import { demoWelcomeCopy, dismissDemoWelcome, shouldShowDemoWelcome } from '../apps/viewer-demo/src/composables/useDemoWelcome'

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('first-visit welcome', () => {
  it('uses the same first-visit and dismissal behavior in automated browsers', () => {
    Object.defineProperty(navigator, 'webdriver', { configurable: true, value: true })
    expect(shouldShowDemoWelcome('')).toBe(true)
    dismissDemoWelcome()
    expect(shouldShowDemoWelcome('')).toBe(false)
    expect(shouldShowDemoWelcome('?welcome=1')).toBe(true)
    expect(shouldShowDemoWelcome('?welcome=0')).toBe(false)
  })

  it('remains usable when persistent storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked') })
    expect(shouldShowDemoWelcome('')).toBe(true)
    expect(() => dismissDemoWelcome()).not.toThrow()
  })

  it('provides complete, nonempty welcome copy in all four supported locales', () => {
    const keys = Object.keys(demoWelcomeCopy['en-US']).sort()
    for (const copy of Object.values(demoWelcomeCopy)) {
      expect(Object.keys(copy).sort()).toEqual(keys)
      expect(Object.values(copy).filter(value => typeof value === 'string').every(text => text.trim())).toBe(true)
      expect(Object.keys(copy.examples).sort()).toEqual(['document', 'drawing', 'model', 'presentation', 'workbook'])
      for (const example of Object.values(copy.examples)) {
        expect(example.title.trim()).toBeTruthy()
        expect(example.description.trim()).toBeTruthy()
      }
    }
  })

  it('opens the selected real file and keeps that action usable when its preview fails', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const onSample = vi.fn()
    const sample: DemoWelcomeSample = { url: '/example/fox.glb', name: 'Low-poly fox', filename: 'fox.glb', kind: 'model',
      preview: './sample-previews/model.png', bytes: 162852, family: 'model', icon: 'Box' }
    const app = createApp({ render: () => h(DemoWelcomeCard, { copy: demoWelcomeCopy['en-US'], samples: [sample], onSample }) })
    try {
      app.mount(host)
      await nextTick()
      expect(host.querySelector('input[type=file]')).toBeNull()
      const image = host.querySelector('img')!
      expect(image.getAttribute('src')).toBe(sample.preview)
      image.dispatchEvent(new Event('error'))
      await nextTick()
      expect(host.querySelector('img')).toBeNull()
      expect(host.textContent).toContain('Preview unavailable')
      host.querySelector<HTMLButtonElement>('.demo-welcome__file')!.click()
      expect(onSample).toHaveBeenCalledWith(sample.url)
    } finally { app.unmount(); host.remove() }
  })

  it('focuses the nonmodal card and restores focus after Escape', async () => {
    const previous = document.createElement('button')
    const host = document.createElement('div')
    document.body.append(previous, host)
    previous.focus()
    const open = ref(true)
    const app = createApp({ render: () => open.value ? h(DemoWelcomeCard, {
      copy: demoWelcomeCopy['en-US'], samples: [], onClose: () => { open.value = false }
    }) : null })
    try {
      app.mount(host)
      await nextTick()
      const dialog = host.querySelector<HTMLElement>('[role=dialog]')!
      expect(dialog.getAttribute('aria-modal')).toBe('false')
      expect(document.activeElement).toBe(dialog)
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await nextTick()
      expect(host.querySelector('[role=dialog]')).toBeNull()
      expect(document.activeElement).toBe(previous)
    } finally { app.unmount(); host.remove(); previous.remove() }
  })
})
