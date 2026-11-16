// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createFileViewerI18n } from '@file-viewer/core'
import { mountMp4vSoftwarePlayer } from '../packages/renderers/media/src/mp4vPlayer'
import renderAudio from '../packages/renderers/media/src/audio'
import { registerFileViewerMidiLoader } from '../packages/renderers/media/src/optionalCapabilities'
const workers: W[] = []
const cleanups: Array<() => void> = []
class W {
 onmessage?: (e: any) => void; onerror?: (e: any) => void
 terminate = vi.fn(); postMessage = vi.fn(); constructor() { workers.push(this) }
}
const tick = async () => { for (let i=0;i<8;i++) await Promise.resolve() }
const ready = (w: W) => w.onmessage?.({data:{type:'ready',duration:2}})
const deferred = () => { let resolve!: (v:any)=>void, reject!: (e:any)=>void; const promise=new Promise<any>((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject} }
beforeEach(()=>{
 workers.length=0;vi.stubGlobal('Worker',W)
 vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{})
 Object.defineProperty(HTMLCanvasElement.prototype,'transferControlToOffscreen',{configurable:true,value:()=>({})})
})
afterEach(()=>{cleanups.splice(0).reverse().forEach(f=>f());vi.restoreAllMocks();vi.unstubAllGlobals();document.body.replaceChildren();delete (HTMLCanvasElement.prototype as any).transferControlToOffscreen})
function mount(aborted=false, detached=false) {
 const host=document.createElement('div'), video=document.createElement('video');host.append(video);if(!detached)document.body.append(host)
 const scope=createFileViewerI18n({locale:'zh-TW'},{ownerDocument:document});cleanups.push(()=>scope.destroy())
 const controller=new AbortController();if(aborted)controller.abort()
 const promise=mountMp4vSoftwarePlayer(new ArrayBuffer(0),video,{width:2,height:2,duration:2,timescale:1} as any,{signal:controller.signal,i18n:scope})
 return {host,video,scope,controller,promise,worker:workers.at(-1)!}
}
it('already aborted creates no Worker and rejects with the established AbortError',async()=>{const x=mount(true);await expect(x.promise).rejects.toMatchObject({name:'AbortError',message:'The video request was aborted.'});expect(workers).toHaveLength(0)})
it.each(['before-ready','same-turn','error-first'] as const)('settles %s and ignores duplicate abort / late ready / error',async mode=>{
 const x=mount();let result:any;x.promise.catch(e=>result=e)
 if(mode==='same-turn')ready(x.worker)
 if(mode==='error-first')x.worker.onerror?.({message:'Original failure'})
 const label=x.host.querySelector('.fv-video-software-loading')!,old=label.textContent
 x.controller.abort();x.controller.abort();await tick()
 expect(result?.name).toBe(mode==='error-first'?'Error':'AbortError');if(mode==='error-first')expect(result.message).toBe('Original failure')
 ready(x.worker);x.worker.onerror?.({message:'LATE'});await tick();expect(label.textContent).toBe(old);expect(x.worker.terminate).toHaveBeenCalledTimes(1)
})
it('ready succeeds in a detached host and cleanup remains idempotent',async()=>{const x=mount(false,true);ready(x.worker);const inst=await x.promise;inst.cleanup();inst.cleanup();expect(x.worker.terminate).toHaveBeenCalledTimes(1)})
it.each(['raw','empty','late','reentrant','throw','throw-reentrant','success'] as const)('play %s consumes once and preserves ownership',async mode=>{
 const x=mount();ready(x.worker);const inst=await x.promise;cleanups.push(inst.cleanup)
 const gate=deferred();vi.spyOn(x.video,'play').mockReturnValue(gate.promise)
 const label=x.host.querySelector('.fv-video-software-loading')!,before=label.textContent,player=label.parentElement!,beforeState=player.dataset.state
 const button=x.host.querySelector<HTMLButtonElement>('.fv-video-software-button')!
 button.click();let reads=0
 const error=new Error();Object.defineProperty(error,'message',{get(){reads++;if(mode.includes('reentrant'))inst.cleanup();if(mode.startsWith('throw'))throw Error('getter exception');return mode==='empty'?'':'RAW play detail'}})
 if(mode==='late')inst.cleanup()
 if(mode==='success')gate.resolve(undefined);else gate.reject(error)
 await tick()
 expect(reads).toBe(mode==='late'||mode==='success'?0:1)
 expect(label.textContent).toBe(mode==='raw'?'RAW play detail':mode==='empty'?'':before)
 if(!['raw','empty'].includes(mode))expect(player.dataset.state).toBe(beforeState)
 expect(x.video.paused).toBe(true);expect(button.textContent).toBe('▶');expect(button.disabled).toBe(false)
})
it.each(['raw','empty','non-error','late','reentrant','throw','throw-reentrant'] as const)('MIDI rejection %s captures once and never writes retired UI',async mode=>{
 const gate=deferred();registerFileViewerMidiLoader(()=>gate.promise)
 const host=document.createElement('div');document.body.append(host);const scope=createFileViewerI18n({locale:'zh-TW'});cleanups.push(()=>scope.destroy())
 const inst=await renderAudio(new ArrayBuffer(1),host,'mid',{i18n:scope});cleanups.push(()=>{void inst.unmount?.()})
 const label=host.querySelector('.fv-midi-state')!,before=label.textContent,cl=label.className;let reads=0
 const error=new Error();Object.defineProperty(error,'message',{get(){reads++;if(mode.includes('reentrant'))void inst.unmount?.();if(mode.startsWith('throw'))throw Error('getter exception');return mode==='empty'?'':'RAW MIDI detail'}})
 if(mode==='late')await inst.unmount?.();gate.reject(mode==='non-error'?'original non-error':error);await tick()
 expect(reads).toBe(mode==='late'||mode==='non-error'?0:1)
 expect(label.textContent).toBe(mode==='raw'?'RAW MIDI detail':mode==='empty'?'':['non-error','throw'].includes(mode)?scope.t('media.midi.parseFailed'):before)
 if(['late','reentrant','throw-reentrant'].includes(mode))expect(label.className).toBe(cl)
 scope.update({locale:'ja-JP'});if(['non-error','throw'].includes(mode))expect(label.textContent).toBe(scope.t('media.midi.parseFailed'))
})
it.each(['late','reentrant'] as const)('MIDI success %s does not parse or commit after disposal',async mode=>{
 const gate=deferred();registerFileViewerMidiLoader(()=>gate.promise);const host=document.createElement('div');let parses=0
 const inst=await renderAudio(new ArrayBuffer(1),host,'mid');const label=host.querySelector('.fv-midi-state')!,before=label.textContent
 if(mode==='late')await inst.unmount?.()
 gate.resolve({Midi:class{constructor(){parses++}get name(){void inst.unmount?.();return 'Original'}duration=1;header={ppq:1};tracks=[]}});await tick()
 expect(parses).toBe(mode==='late'?0:1);expect(label.textContent).toBe(before);expect(host.children.length).toBe(0)
})
