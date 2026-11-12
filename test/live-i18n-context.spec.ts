// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createFileViewerI18n, createFileViewerNestedI18n, createFileViewerI18nBindings, createFileViewerTranslator, type FileViewerI18nContext } from '../packages/core/src'
import { effectScope, reactive, nextTick } from 'vue'
import { useViewerI18n } from '../packages/components/vue3/src/package/components/FileViewer/hooks/useViewerI18n'
import { useViewerPreviewLifecycle } from '../packages/components/vue3/src/package/components/FileViewer/hooks/useViewerPreviewLifecycle'

const cleanups: Array<() => void> = []
const language = (...args: Parameters<typeof createFileViewerI18n>) => {
  const value = createFileViewerI18n(...args); cleanups.push(() => value.destroy()); return value
}
afterEach(() => { cleanups.splice(0).reverse().forEach(fn => fn()); vi.restoreAllMocks(); document.body.replaceChildren() })
describe('explicit live language contexts', () => {
  it.each([['zh_Hant_TW','zh-TW'], ['zh-Hant-HK','zh-HK'], ['zh-MO','zh-HK'], ['zh-Hans-TW','zh-CN'], ['ja','ja-JP'], ['de','de-DE'], ['fr','en-US']])('preserves alias %s', (locale, expected) => {
    expect(language({ locale }).locale).toBe(expected)
  })
  it('snapshots language maps, respects nested precedence, and falls back on empty values', () => {
    const source = { locale: 'en-US', messages: { 'toolbar.print': 'Top' }, i18n: { locale: 'zh-TW', messages: { 'toolbar.print': 'Nested' } } }
    const scope = language(source); const subscriber = vi.fn(); scope.subscribe(subscriber)
    expect(scope.t('toolbar.print')).toBe('Nested')
    source.i18n.messages['toolbar.print'] = 'Changed'
    expect(scope.t('toolbar.print')).toBe('Nested')
    scope.update(source)
    expect(scope.t('toolbar.print')).toBe('Changed'); expect(subscriber).toHaveBeenCalledTimes(1)
    scope.update({ locale: 'zh-TW', messages: { 'toolbar.print': '' } })
    expect(scope.t('toolbar.print')).toBe('列印')
    expect(source.i18n.messages['toolbar.print']).toBe('Changed')
  })
  it('reevaluates an explicitly updated resolver without inferring closure changes', () => {
    let value = 'One'; const messages = () => value
    const scope = language({ locale: 'en-US', messages }); const notify = vi.fn(); scope.subscribe(notify)
    value = 'Two'; scope.update({ locale: 'en-US', messages }); expect(notify).toHaveBeenCalledTimes(1)
    expect(scope.t('toolbar.print')).toBe('Two')
  })
  it('does not notify for equivalent aliases or unrelated options', () => {
    const scope = language({ locale: 'zh-Hant' }); const notify = vi.fn(); scope.subscribe(notify)
    scope.update({ locale: 'zh-TW', theme: 'dark' }); expect(notify).not.toHaveBeenCalled()
  })
  it('uses a structural context across independent module boundaries and isolates viewers', () => {
    const left = language({ locale: 'en-US' }); const right = language({ locale: 'de-DE' })
    const foreign: FileViewerI18nContext = { get locale() { return left.locale }, get options() { return left.options }, t: (...args) => left.t(...args), subscribe: fn => left.subscribe(fn) }
    const t = createFileViewerTranslator(foreign); left.update({ locale: 'zh-HK' })
    expect(t('toolbar.print')).toBe('打印'); expect(right.t('toolbar.print')).toBe('Drucken')
  })
  it('retains explicit same-value nested locale and messages instead of guessing inheritance', () => {
    const messages = { 'toolbar.print': 'Same initial text' };
    const parent = language({ locale: 'en-US', messages });
    const inherited = createFileViewerNestedI18n({}, parent, document);
    const fixed = createFileViewerNestedI18n({ options: { locale: 'en-US', messages } }, parent, document);
    cleanups.push(() => inherited.destroy(), () => fixed.destroy());
    parent.update({ locale: 'zh-TW', messages: { 'toolbar.print': 'New parent text' } });
    expect(inherited.locale).toBe('zh-TW'); expect(inherited.t('toolbar.print')).toBe('New parent text');
    expect(fixed.locale).toBe('en-US'); expect(fixed.t('toolbar.print')).toBe('Same initial text');
  })
  it('keeps parent/siblings alive when child aborts, including already-aborted signals', () => {
    const parent = language({ locale: 'en-US' }); const abort = new AbortController()
    const child = language(undefined, { parent, signal: abort.signal }); const sibling = language(undefined, { parent })
    const notify = vi.fn(); child.subscribe(notify); abort.abort(); child.destroy(); parent.update({ locale: 'ja-JP' })
    expect(notify).not.toHaveBeenCalled(); expect(sibling.locale).toBe('ja-JP')
    const dead = language(undefined, { parent, signal: abort.signal }); const late = vi.fn(); dead.subscribe(late)
    parent.update({ locale: 'zh-TW' }); expect(late).not.toHaveBeenCalled()
  })
  it('notifies surviving subscribers after a failure and reports through the owner error route', () => {
    const onError = vi.fn(); const scope = language({ locale: 'en-US' }, { onError }); const last = vi.fn(); const added = vi.fn()
    let off = () => {}; off = scope.subscribe(() => { off(); scope.subscribe(added); throw new Error('label failure') })
    scope.subscribe(last); scope.update({ locale: 'zh-TW' }); expect(onError).toHaveBeenCalledOnce(); expect(last).toHaveBeenCalledOnce(); expect(added).not.toHaveBeenCalled()
    scope.update({ locale: 'ja-JP' }); expect(added).toHaveBeenCalledOnce(); expect(onError).toHaveBeenCalledOnce()
  })
  it('resolves auto from ownerDocument and removes language listeners on destroy', () => {
    const iframe = document.createElement('iframe'); document.body.append(iframe); const doc = iframe.contentDocument!; const win = doc.defaultView!
    Object.defineProperty(win.navigator, 'languages', { configurable: true, value: ['fr-FR', 'zh-HK'] })
    const remove = vi.spyOn(win, 'removeEventListener'); const scope = language({ locale: 'auto' }, { ownerDocument: doc })
    expect(scope.locale).toBe('zh-HK')
    Object.defineProperty(win.navigator, 'languages', { configurable: true, value: ['ja-JP'] }); win.dispatchEvent(new win.Event('languagechange'))
    expect(scope.locale).toBe('ja-JP'); scope.update({ locale: 'de-DE' }); win.dispatchEvent(new win.Event('languagechange')); expect(scope.locale).toBe('de-DE')
    scope.destroy(); expect(remove).toHaveBeenCalledWith('languagechange', expect.any(Function))
  })
  it('inherits unspecified language while retaining explicit nested overrides and an explicit foreign context', () => {
    const original = { locale: 'en-US' }; const parent = language(original)
    const child = createFileViewerNestedI18n({ options: { text: { toolbar: false } }, i18n: parent }, parent, document)
    const fixed = createFileViewerNestedI18n({ options: { locale: 'ja-JP' }, i18n: parent }, parent, document)
    const independent = language({ locale: 'de-DE' }); const other = createFileViewerNestedI18n({ i18n: independent }, parent, document)
    cleanups.push(() => child.destroy(), () => fixed.destroy(), () => other.destroy()); parent.update({ locale: 'zh-HK' })
    expect(child.locale).toBe('zh-HK'); expect(fixed.locale).toBe('ja-JP'); expect(other.locale).toBe('de-DE')
  })
})

describe('owned UI bindings', () => {
  it('changes only registered text/attributes, retaining node identities, icons and body selection', () => {
    const scope = language({ locale: 'en-US' }); const bindings = createFileViewerI18nBindings(scope); cleanups.push(bindings.destroy)
    const button = document.createElement('button'); const icon = document.createElement('svg'); const label = document.createTextNode(''); button.append(icon, label)
    const body = document.createElement('p'); body.textContent = 'Original toolbar.print <img onerror="bad">'; document.body.append(button, body)
    bindings.text(label, () => scope.t('toolbar.print')); bindings.attr(button, 'aria-label', () => scope.t('toolbar.print'))
    const range = document.createRange(); range.setStart(body.firstChild!, 0); range.setEnd(body.firstChild!, 8); document.getSelection()!.addRange(range)
    scope.update({ locale: 'zh-TW' }); expect(label.data).toBe('列印'); expect(button.firstChild).toBe(icon); expect(document.getSelection()!.toString()).toBe('Original'); expect(body.textContent).toContain('toolbar.print')
    expect(() => bindings.text(button, () => 'No')).toThrow('text-only'); expect(() => bindings.attr(button, 'onclick', () => 'bad')).toThrow()
  })
  it('deduplicates/retires bindings and treats custom messages as text', () => {
    const scope = language({ locale: 'en-US' }); const bindings = createFileViewerI18nBindings(scope); const label = document.createElement('span'); const old = vi.fn(() => 'old')
    bindings.text(label, old); bindings.text(label, () => scope.t('toolbar.print'))
    scope.update({ locale: 'zh-HK', messages: { 'toolbar.print': '<img src=x onerror=bad>' } })
    expect(old).toHaveBeenCalledOnce(); expect(label.childElementCount).toBe(0); expect(label.textContent).toContain('<img')
    bindings.release(label); scope.update({ locale: 'de-DE' }); expect(label.textContent).toContain('<img'); bindings.destroy(); bindings.destroy()
  })
})

describe('Vue language-only watch', () => {
  it('updates synchronous deep mutations without reloading the current document', async () => {
    const scope = effectScope(); const options = reactive({ locale: 'en-US', messages: { 'toolbar.print': 'First' }, text: { toolbar: true } }); const render = vi.fn()
    let language!: ReturnType<typeof useViewerI18n>
    scope.run(() => {
      language = useViewerI18n(() => options, () => document, vi.fn())
      useViewerPreviewLifecycle({ getFile: () => 'same.lrc', getUrl: () => undefined, getRenderOptions: () => options.text, refreshPreview: render, cancelPreview: vi.fn(), clearRenderedContent: vi.fn(), resetLoading: vi.fn(), stopZoomObserver: vi.fn(), stopFitObserver: vi.fn(), stopViewStateObserver: vi.fn() })
    })
    options.locale = 'zh-TW'; expect(language.i18n.locale).toBe('zh-TW'); options.messages['toolbar.print'] = 'Changed'; expect(language.i18n.t('toolbar.print')).toBe('Changed')
    await nextTick(); expect(render).toHaveBeenCalledOnce(); const revision = language.revision.value; scope.stop(); options.locale = 'de-DE'; expect(language.revision.value).toBe(revision)
  })
})
