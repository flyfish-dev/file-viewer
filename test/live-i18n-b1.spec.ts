// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFileViewerI18n, type FileViewerRenderedInstance } from '@file-viewer/core'
import renderCode from '../packages/renderers/text/src/code'
import renderHtml from '../packages/renderers/text/src/html'
import renderAudio from '../packages/renderers/media/src/audio'

const locales = ['en-US', 'zh-CN', 'ja-JP', 'de-DE', 'zh-TW', 'zh-HK', 'ru-RU'] as const
const instances: FileViewerRenderedInstance[] = []
const scopes: ReturnType<typeof createFileViewerI18n>[] = []
const root = () => { const n = document.createElement('div'); document.body.append(n); return n }
const bytes = (s: string) => new TextEncoder().encode(s).buffer
const scope = () => { const c = createFileViewerI18n({locale:'en-US'}, {ownerDocument:document}); scopes.push(c); return c }
beforeEach(() => {
  Object.defineProperty(URL, 'createObjectURL', {configurable:true, value:vi.fn(() => 'blob:b1-unit')})
  Object.defineProperty(URL, 'revokeObjectURL', {configurable:true, value:vi.fn()})
  vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(() => {})
})
afterEach(async () => { for(const i of instances.splice(0)) await i.unmount?.(); scopes.splice(0).forEach(c=>c.destroy()); vi.restoreAllMocks(); document.body.replaceChildren() })
describe('B1 owned UI live bindings', () => {
  it('updates HTML controls without replacing iframe, srcdoc, source tab or selection', async () => {
    const c=scope(), host=root(); instances.push(await renderHtml(bytes('<h1>原文</h1>'),host,'html',{i18n:c,options:{locale:'en-US'}}))
    const frame=host.querySelector('iframe')!, src=frame.srcdoc, preview=host.querySelector<HTMLButtonElement>('button[data-html-view="preview"]')!, source=host.querySelector<HTMLButtonElement>('[data-html-view="source"]')!
    source.click(); await vi.waitFor(()=>expect(host.querySelector('code')?.textContent).toContain('原文'))
    const code=host.querySelector('code')!; const text=code.textContent
    for(const locale of locales) { c.update({locale}); expect(preview.textContent).toBe(c.t('text.html.preview')); expect(frame.title).toBe(c.t('text.html.preview')); expect(host.querySelector('iframe')).toBe(frame); expect(frame.srcdoc).toBe(src); expect(host.querySelector('code')).toBe(code); expect(code.textContent).toBe(text); expect(source.getAttribute('aria-pressed')).toBe('true') }
    const old=preview.textContent; await instances.pop()!.unmount?.(); c.update({locale:'en-US'}); expect(preview.textContent).toBe(old)
  })
  it('updates formatting controls while preserving code text nodes and mode', async () => {
    const c=scope(),host=root(); instances.push(await renderCode(bytes('{"原文":1}'),host,'json',{i18n:c,options:{locale:'en-US',text:{prettyPrint:true}}}))
    const code=host.querySelector('code')!,children=[...code.childNodes], toggle=host.querySelector('.code-format-toggle')!
    for(const locale of locales) { c.update({locale}); expect(toggle.textContent).toBe(c.t('text.code.showOriginal')); expect([...code.childNodes]).toEqual(children); expect(host.querySelector('.code-viewer')?.getAttribute('data-text-representation')).toBe('formatted') }
  })
  it('updates only audio owned text and keeps media time, volume, nodes and URLs', async () => {
    const c=scope(),host=root(); instances.push(await renderAudio(new ArrayBuffer(0),host,'wav',{i18n:c,options:{locale:'en-US'}}))
    const audio=host.querySelector('audio')!, title=host.querySelector('.fv-audio-copy strong')!;audio.currentTime=3;audio.volume=.4;audio.muted=true;const src=audio.src
    for(const locale of locales) { c.update({locale});expect(title.textContent).toBe(c.t('media.audio.title'));expect(audio.textContent).toBe(c.t('media.audio.unsupported'));expect(host.querySelector('audio')).toBe(audio);expect(audio.currentTime).toBe(3);expect(audio.volume).toBe(.4);expect(audio.muted).toBe(true);expect(audio.src).toBe(src) }
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledTimes(0)
  })
})

import renderXml from '../packages/renderers/text/src/xml'
import renderPatch from '../packages/renderers/text/src/patch'
import renderArchive from '../packages/renderers/archive/src/archive'
import { buildArchiveNestedRenderContext } from '../packages/renderers/archive/src/archiveShared'
import { createFileViewerNestedI18n, translateFileViewerMessage } from '@file-viewer/core'
import { registerFileViewerMidiLoader } from '../packages/renderers/media/src/optionalCapabilities'

describe('B1 defaults, ownership and late mounting', () => {
  it.each(locales)('has count/key/placeholder parity for %s, counts 0/1/2', locale => {
    for(const count of [0,1,2]) for(const key of ['text.code.lineCount','text.patch.summary'] as const) {
      const value=translateFileViewerMessage({locale},key,{count});expect(value).toContain(String(count));expect(value).not.toMatch(/\{.*\}/);expect(value).not.toBe(key)
    }
    for(const key of ['text.xml.viewSource','text.xml.viewRendered','text.xml.diagnostics','text.xml.renderedTitle','media.midi.instrumentFallback'] as const) expect(translateFileViewerMessage({locale},key)).not.toBe(key)
    expect(translateFileViewerMessage({locale},'media.midi.trackFallback',{index:2})).toContain('2')
  })
  it.each([undefined, {viewSource:'View Source',viewRendered:'',diagnostics:'User-owned title'}])('preserves XML custom labels and raw diagnostics %j', async labels => {
    const c=scope(),host=root();const rendered=await renderXml(bytes('<r>原文</r>'),host,{i18n:c,options:{xml:{labels}}});instances.push(rendered)
    const source=host.querySelector<HTMLButtonElement>('[data-xml-view="source"]') || host.querySelector<HTMLButtonElement>('button')!;
    const all=host.querySelectorAll('button'), summary=host.querySelector('summary')!, body=host.querySelector('code')!, diagnostic=host.querySelector('.xml-profile-diagnostics div')!;const raw=diagnostic.textContent, content=body.textContent
    for(const locale of locales) {c.update({locale});expect(all[0].textContent).toBe(labels?.viewRendered??c.t('xml.viewRendered'));expect(all[1].textContent).toBe(labels?.viewSource??c.t('xml.viewSource'));expect(summary.textContent).toBe(labels?.diagnostics??c.t('xml.diagnostics'));expect(host.querySelector('code')).toBe(body);expect(body.textContent).toBe(content);expect(diagnostic.textContent).toBe(raw)}
  })
  it('retains patch source/content and updates only owned summary', async()=> {
    const c=scope(),host=root(),raw='--- a/x\n+++ b/x\n@@ -1 +1 @@\n-old\n+原文\n';instances.push(await renderPatch(bytes(raw),host,'patch',{i18n:c}))
    const body=host.querySelector('.patch-body')!,content=body.innerHTML;for(const locale of locales){c.update({locale});expect(host.querySelector('.patch-toolbar strong')?.textContent).toBe(c.t('text.patch.summary',{count:1}));expect(host.querySelector('.patch-body')).toBe(body);expect(body.innerHTML).toBe(content)}
  })
  it('keeps archive input focus/draft and callback counts during owned error/title updates',async()=>{
    const c=scope(),host=root(),download=vi.fn(()=>true);instances.push(await renderArchive(bytes('too big'),host,'zip',{i18n:c,filename:'原文.zip',options:{archive:{maxArchiveSize:0,entryActions:{download}}}}))
    const input=host.querySelector<HTMLInputElement>('input')!, paragraph=host.querySelector('.archive-error p')!,dialog=host.querySelector('.archive-password-dialog');input.value='draft';input.focus();input.setSelectionRange(2,4);const calls=download.mock.calls.length
    for(const locale of locales){c.update({locale});expect(input.placeholder).toBe(c.t('archive.search.placeholder'));expect(host.querySelector('input')).toBe(input);expect(input.value).toBe('draft');expect(document.activeElement).toBe(input);expect(host.querySelector('.archive-error strong')?.textContent).toBe(c.t('archive.error.title'));expect(paragraph.textContent).toContain('7 B');expect(host.querySelector('.archive-password-dialog')).toBe(dialog);expect(download).toHaveBeenCalledTimes(calls);expect(host.textContent).toContain('原文.zip')}
  })
  it('strips only internal live archive inheritance, preserving legacy and explicit equal child overrides',()=>{
    const c=scope(),messages={'toolbar.print':'Original'};const options={locale:'en-US',messages,i18n:{locale:'en-US',messages},text:{toolbar:false}};const entry={name:'原文.txt'}
    const legacy=buildArchiveNestedRenderContext({options},entry,undefined);expect(legacy.options?.locale).toBe('en-US');expect(legacy.options?.messages).toBe(messages);expect(legacy.options?.i18n).toBe(options.i18n)
    const inherited=buildArchiveNestedRenderContext({options,i18n:c},entry,undefined);expect(inherited.options?.locale).toBeUndefined();expect(inherited.options?.messages).toBeUndefined();expect(inherited.options?.i18n).toBeUndefined();expect(inherited.options?.text).toBe(options.text)
    const child=createFileViewerNestedI18n(inherited,c,document),fixed=createFileViewerNestedI18n({i18n:c,options:{locale:'en-US'}},c,document);scopes.push(child,fixed);c.update({locale:'zh-TW'});expect(child.locale).toBe('zh-TW');expect(fixed.locale).toBe('en-US')
  })
  it('mounts MIDI after locale change once, keeping authored Track/Unknown strings distinct from fallback',async()=>{
    const c=scope(),host=root();let resolve!: (v:any)=>void;const load=vi.fn(()=>new Promise<any>(r=>resolve=r)),parse=vi.fn();registerFileViewerMidiLoader(load)
    try {
      instances.push(await renderAudio(new ArrayBuffer(0),host,'mid',{i18n:c}));const pending=host.querySelector('.fv-midi-state')!;c.update({locale:'zh-TW'});expect(pending.textContent).toBe(c.t('media.midi.loading'))
      resolve({Midi:class {name='';duration=1;header={ppq:1};tracks=[{name:'',instrument:{},channel:0,notes:[],duration:1},{name:'Track 2',instrument:{name:'Unknown'},channel:1,notes:[],duration:1}];constructor(){parse()}}})
      await vi.waitFor(()=>expect(host.querySelectorAll('tbody tr')).toHaveLength(2));const table=host.querySelector('table'),rows=host.querySelectorAll('tbody tr');
      for(const locale of locales){c.update({locale});expect(rows[0].children[0].textContent).toBe(c.t('media.midi.trackFallback',{index:1}));expect(rows[0].children[1].textContent).toBe(c.t('media.midi.unknownInstrument'));expect(rows[1].children[0].textContent).toBe('Track 2');expect(rows[1].children[1].textContent).toBe('Unknown');expect(host.querySelector('table')).toBe(table)}expect(load).toHaveBeenCalledTimes(1);expect(parse).toHaveBeenCalledTimes(1)
    } finally {registerFileViewerMidiLoader(null)}
  })
  it('captures raw MIDI errors once and retires bindings on destroy before late resolution',async()=>{
    const c=scope(),host=root();let reads=0;const error=new Error();Object.defineProperty(error,'message',{get(){reads++;return 'Original raw error'}});registerFileViewerMidiLoader(async()=>{throw error})
    try {instances.push(await renderAudio(new ArrayBuffer(0),host,'mid',{i18n:c}));await vi.waitFor(()=>expect(host.querySelector('.fv-midi-error')).not.toBeNull());const label=host.querySelector('.fv-midi-error')!;for(const locale of locales){c.update({locale});expect(label.textContent).toBe('Original raw error')}expect(reads).toBe(1)}finally{registerFileViewerMidiLoader(null)}
    const late=root();let resolve!: (v:any)=>void;const parse=vi.fn();registerFileViewerMidiLoader(()=>new Promise<any>(r=>resolve=r));const instance=await renderAudio(new ArrayBuffer(0),late,'mid',{i18n:c});const label=late.querySelector('.fv-midi-state')!,text=label.textContent;await instance.unmount?.();c.update({locale:'en-US'});resolve({Midi:class{constructor(){parse()}}});await Promise.resolve();await Promise.resolve();expect(late.children).toHaveLength(0);expect(label.textContent).toBe(text);registerFileViewerMidiLoader(null)
  })
  it('keeps independent and legacy options-only audio labels separate',async()=>{
    const a=scope(),b=scope(),h1=root(),h2=root(),h3=root();instances.push(await renderAudio(new ArrayBuffer(0),h1,'wav',{i18n:a}),await renderAudio(new ArrayBuffer(0),h2,'wav',{i18n:b}),await renderAudio(new ArrayBuffer(0),h3,'wav',{options:{locale:'de-DE'}}));a.update({locale:'zh-HK'});expect(h1.querySelector('strong')!.textContent).toBe(a.t('media.audio.title'));expect(h2.querySelector('strong')!.textContent).toBe(b.t('media.audio.title'));expect(h3.querySelector('strong')!.textContent).toBe(translateFileViewerMessage({locale:'de-DE'},'media.audio.title'))
  })
})

import renderLargeText from '../packages/renderers/text/src/largeText'
import renderImage from '../packages/renderers/image/src/image'
import renderCoreImage from '../packages/core/src/renderers/image'
import { renderTiffWithDecoder } from '../packages/renderers/image/src/tiff'
import { readFileSync } from 'node:fs'

describe('B1 virtual/image ownership',()=>{
  it('keeps virtual line/window/selection and segment identity without reindexing on locale',async()=>{
    const c=scope(),host=root();const progress=vi.fn();instances.push(await renderLargeText(bytes('原文'+ 'a'.repeat(10000)+'\n'+ 'hello\n'.repeat(1000)),host,'txt',{i18n:c,onProgressiveRender:progress,options:{text:{maxRenderedLineBytes:1024}}}))
    const window=host.querySelector('.code-virtual-window')!,rows=[...window.children],button=window.querySelector('button')!,content=window.querySelector('.code-virtual-content')!,text=content.textContent,viewport=host.querySelector('.code-virtual-scroll')!;const prior=progress.mock.calls.length
    for(const locale of locales){c.update({locale});expect(host.querySelector('.code-virtual-window')).toBe(window);expect([...window.children]).toEqual(rows);expect(window.querySelector('button')).toBe(button);expect(button.title).toBe(c.t('text.code.firstSegment'));expect(content.textContent).toBe(text);expect(host.querySelector('.code-virtual-scroll')).toBe(viewport);expect(progress).toHaveBeenCalledTimes(prior)}
    const label=button.title;await instances.pop()!.unmount?.();c.update({locale:'en-US'});expect(button.title).toBe(label)
  })
  it.each(['core','image','tiff'] as const)('updates %s owned alt/aria without replacing image/lightbox or calling decoder again',async kind=>{
    vi.stubGlobal('ResizeObserver',class {observe(){}unobserve(){}disconnect(){}})
    vi.spyOn(HTMLImageElement.prototype,'complete','get').mockReturnValue(true);vi.spyOn(HTMLImageElement.prototype,'naturalWidth','get').mockReturnValue(40);vi.spyOn(HTMLImageElement.prototype,'naturalHeight','get').mockReturnValue(20)
    vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({createImageData:(w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}} as any)
    vi.spyOn(HTMLCanvasElement.prototype,'toBlob').mockImplementation(cb=>cb(new Blob(['png'],{type:'image/png'})))
    const c=scope(),host=root(),context={i18n:c,options:{image:{rotation:true}}};const decode=vi.fn(()=>[{width:2,height:2},{width:2,height:2}]),decodeImage=vi.fn(),rgba=vi.fn(()=>new Uint8Array(16));const b=new Uint8Array(readFileSync(process.cwd() + '/apps/viewer-demo/public/example/pic.tiff')).buffer
    const instance=kind==='core'?await renderCoreImage(b,host,'png',context):kind==='image'?await renderImage(b,host,'png',context):await renderTiffWithDecoder(b,host,{decode,decodeImage,toRGBA8:rgba},context);instances.push(instance)
    const images=[...host.querySelectorAll('img')],dialog=host.querySelector(kind==='tiff'?'.tiff-lightbox':'.image-lightbox')!,button=dialog.querySelector('button')!,oldsrc=images.map(i=>i.src);const count=decodeImage.mock.calls.length
    for(const locale of locales){c.update({locale});expect([...host.querySelectorAll('img')]).toEqual(images);expect(images.map(i=>i.src)).toEqual(oldsrc);expect(button.getAttribute('aria-label')).toBe(c.t('image.lightbox.close'));expect(dialog.querySelector('img')!.alt).toBe(c.t('image.lightbox.alt'));expect(images[0].alt).toBe(c.t('image.alt')+(kind==='tiff'?' 1':''));expect(decodeImage).toHaveBeenCalledTimes(count)}
    const label=button.getAttribute('aria-label');await instances.pop()!.unmount?.();c.update({locale:'en-US'});expect(button.getAttribute('aria-label')).toBe(label);vi.unstubAllGlobals()
  })
})

import { FILE_VIEWER_BUILTIN_MESSAGES, renderFileViewerImage as publicCoreImage } from '@file-viewer/core'
it('retains seven-catalog key parity, nonempty values and exact new-key placeholders',()=>{
  const keys=['text.code.lineCount','text.patch.summary','text.xml.viewSource','text.xml.viewRendered','text.xml.diagnostics','text.xml.renderedTitle','media.midi.trackFallback','media.midi.instrumentFallback'] as const
  const en=FILE_VIEWER_BUILTIN_MESSAGES['en-US'];const tokens=(s:string)=>[...s.matchAll(/\{(\w+)\}/g)].map(x=>x[1]).sort()
  for(const locale of locales){const catalog=FILE_VIEWER_BUILTIN_MESSAGES[locale];expect(Object.keys(catalog).sort()).toEqual(Object.keys(en).sort());for(const key of keys){expect(catalog[key].trim()).not.toBe('');expect(tokens(catalog[key])).toEqual(tokens(en[key]))}}
  expect(publicCoreImage.length).toBe(3)
})

import * as archiveFallback from '../packages/renderers/archive/src/archiveFallback'
it('disposes a nested child returned after archive unmount exactly once and retires its language scope',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('',{status:404})))
  vi.spyOn(archiveFallback,'loadArchiveEntriesWithoutWorker').mockResolvedValue([{id:'late',name:'late.txt',path:'late.txt',extension:'txt',size:5,depth:0,previewable:true,compressedFile:{extract:async()=>({arrayBuffer:async()=>bytes('child')})}}] as any)
  const c=scope(),host=root();let release!:()=>void;const hold=new Promise<void>(r=>release=r),unmount=vi.fn();let label:HTMLElement|undefined
  const delegate=vi.fn(async(_b:ArrayBuffer,_t:string,target:HTMLDivElement,context:any)=>{await hold;label=document.createElement('span');target.append(label);const bindings=await import('@file-viewer/core').then(core=>core.createFileViewerI18nBindings(context.i18n));bindings.text(label,()=>context.i18n.t('image.alt'));return{$el:target,unmount(){bindings.destroy();unmount();target.replaceChildren()}}})
  const instance=await renderArchive(bytes('fixture'),host,'zip',{i18n:c,filename:'fixture.zip',options:{archive:{cache:false}},renderNestedBuffer:delegate})
  await vi.waitFor(()=>expect(host.querySelector('.archive-entry')).not.toBeNull());host.querySelector<HTMLButtonElement>('.archive-entry')!.click();await vi.waitFor(()=>expect(delegate).toHaveBeenCalledTimes(1));await instance.unmount?.();release();await vi.waitFor(()=>expect(unmount).toHaveBeenCalledTimes(1));const text=label!.textContent;c.update({locale:'zh-TW'});expect(label!.textContent).toBe(text);expect(host.children).toHaveLength(0);vi.unstubAllGlobals()
})
