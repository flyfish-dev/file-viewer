// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {createFileViewerI18n,type FileViewerRenderedInstance} from '@file-viewer/core'
import renderArchive from '../packages/renderers/archive/src/archive'
import * as fallback from '../packages/renderers/archive/src/archiveFallback'
const bytes=(s:string)=>new TextEncoder().encode(s).buffer
const roots:HTMLElement[]=[],scopes:ReturnType<typeof createFileViewerI18n>[]=[]
const deferred=<T,>()=>{let resolve!:(value:T)=>void,reject!:(e:unknown)=>void;const promise=new Promise<T>((r,j)=>{resolve=r;reject=j});return{promise,resolve,reject}}
beforeEach(()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response('',{status:404})))
 vi.spyOn(fallback,'loadArchiveEntriesWithoutWorker').mockImplementation(async()=>['a','b','c'].map(name=>({id:name,name:name+'.txt',path:name+'.txt',extension:'txt',size:1,depth:0,previewable:true,compressedFile:{extract:async()=>({arrayBuffer:async()=>bytes(name)})}})) as any)
})
afterEach(()=>{scopes.splice(0).forEach(s=>s.destroy());roots.splice(0).forEach(n=>n.remove());vi.restoreAllMocks();vi.unstubAllGlobals()})
const setup=async()=>{
 const host=document.createElement('div');roots.push(host);document.body.append(host);const scope=createFileViewerI18n({locale:'en-US'},{ownerDocument:document});scopes.push(scope)
 const requests:Array<{target:HTMLDivElement;context:any;gate:ReturnType<typeof deferred<FileViewerRenderedInstance>>;destroy:ReturnType<typeof vi.fn>}> = []
 const delegate=vi.fn(async(_b:ArrayBuffer,_t:string,target:HTMLDivElement,context:any)=>{const gate=deferred<FileViewerRenderedInstance>(),destroy=vi.fn();requests.push({target,context,gate,destroy});return gate.promise})
 const archive=await renderArchive(bytes('archive'),host,'zip',{i18n:scope,filename:'local.zip',options:{archive:{cache:false}},renderNestedBuffer:delegate})
 await vi.waitFor(()=>expect(host.querySelectorAll('.archive-entry')).toHaveLength(3))
 const click=async(name:string)=>{[...host.querySelectorAll<HTMLButtonElement>('.archive-entry')].find(n=>n.textContent?.includes(name+'.txt'))!.click();await vi.waitFor(()=>expect(requests.length).toBeGreaterThan(0))}
 const resolve=(i:number,unmount= requests[i].destroy)=>{const r=requests[i];r.target.textContent='child '+i;r.gate.resolve({$el:r.target,unmount})}
 return{host,scope,archive,requests,click,resolve,delegate}
}
it('reuses pending parent unmount and disposes an existing child once',async()=>{
 const x=await setup();await x.click('a');x.resolve(0);await vi.waitFor(()=>expect(x.host.querySelector('.archive-nested-content')?.textContent).toBe('child 0'))
 const gate=deferred<void>();const destroy=vi.fn(()=>gate.promise); // A real async nested cleanup remains pending.
 // Replace via next normal child request, then close its held cleanup concurrently.
 await x.click('b');await vi.waitFor(()=>expect(x.requests).toHaveLength(2));x.resolve(1,destroy);await vi.waitFor(()=>expect(x.host.querySelector('.archive-nested-content')?.textContent).toBe('child 1'))
 await vi.waitFor(()=>expect(x.host.querySelector('.archive-state')?.classList.contains('archive-hidden')).toBe(true));const first=x.archive.unmount?.(),second=x.archive.unmount?.();await vi.waitFor(()=>expect(destroy).toHaveBeenCalledTimes(1));gate.resolve();await first;await second;expect(destroy).toHaveBeenCalledTimes(1);expect(x.requests[0].destroy).toHaveBeenCalledTimes(1);expect(x.host.children).toHaveLength(0)
})
it('disposes two out-of-order children once and preserves the newest selection',async()=>{
 const x=await setup();await x.click('a');await x.click('b');await vi.waitFor(()=>expect(x.requests).toHaveLength(2));x.resolve(1);await vi.waitFor(()=>expect(x.host.querySelector('.archive-nested-content')?.textContent).toBe('child 1'));x.resolve(0);await vi.waitFor(()=>expect(x.requests[0].destroy).toHaveBeenCalledTimes(1));expect(x.host.querySelector('.archive-nested-content')?.textContent).toBe('child 1');expect(x.requests[1].destroy).not.toHaveBeenCalled();await x.archive.unmount?.();expect(x.requests[1].destroy).toHaveBeenCalledTimes(1)
})
it('does not mount a child or error UI after parent destroy, including late rejection',async()=>{
 const x=await setup();await x.click('a');const second=setup();await x.archive.unmount?.();x.resolve(0);await vi.waitFor(()=>expect(x.requests[0].destroy).toHaveBeenCalledTimes(1));expect(x.host.children).toHaveLength(0)
 const y=await second;await y.click('a');await y.archive.unmount?.();y.requests[0].gate.reject(new Error('raw late error'));await new Promise(r=>setTimeout(r,20));expect(y.host.children).toHaveLength(0);expect(y.requests[0].destroy).not.toHaveBeenCalled()
})
it('retiring one archive does not change another viewer or its inherited child language',async()=>{
 const a=await setup(),b=await setup();await a.click('a');await b.click('a');b.resolve(0);await vi.waitFor(()=>expect(b.host.querySelector('.archive-nested-content')?.textContent).toBe('child 0'));await a.archive.unmount?.();a.resolve(0);await vi.waitFor(()=>expect(a.requests[0].destroy).toHaveBeenCalledTimes(1));b.scope.update({locale:'zh-HK'});expect(b.requests[0].context.i18n.locale).toBe('zh-HK');expect(b.requests[0].destroy).not.toHaveBeenCalled();expect(b.host.querySelector('.archive-entry.active')?.textContent).toContain('a.txt');await b.archive.unmount?.();expect(b.requests[0].destroy).toHaveBeenCalledTimes(1)
})
it('old held cleanup cannot erase a newer child, and parent teardown returns the same Promise',async()=>{
 const x=await setup();await x.click('a');const gate=deferred<void>();const destroy=vi.fn(()=>gate.promise);x.resolve(0,destroy);await vi.waitFor(()=>expect(x.host.querySelector('.archive-state')?.classList.contains('archive-hidden')).toBe(true))
 // B waits for A cleanup. C claims the new request without re-disposing A.
 x.host.querySelectorAll<HTMLButtonElement>('.archive-entry')[1].click();await vi.waitFor(()=>expect(destroy).toHaveBeenCalledTimes(1));x.host.querySelectorAll<HTMLButtonElement>('.archive-entry')[2].click();await vi.waitFor(()=>expect(x.requests).toHaveLength(2));x.resolve(1);await vi.waitFor(()=>expect(x.host.querySelector('.archive-state')?.classList.contains('archive-hidden')).toBe(true));gate.resolve();await new Promise(r=>setTimeout(r,20));expect(x.host.querySelector('.archive-nested-content')?.textContent).toBe('child 1');expect(x.requests).toHaveLength(2);expect(destroy).toHaveBeenCalledTimes(1);expect(x.host.querySelector('.archive-entry.active')?.textContent).toContain('c.txt')
 const first=x.archive.unmount?.(),second=x.archive.unmount?.();expect(second).toBe(first);await first;expect(x.requests[1].destroy).toHaveBeenCalledTimes(1)
})
it('terminal teardown waits for an already claimed old cleanup while cleaning the current child',async()=>{
 const x=await setup();await x.click('a');const gate=deferred<void>();const old=vi.fn(()=>gate.promise);x.resolve(0,old);await vi.waitFor(()=>expect(x.host.querySelector('.archive-state')?.classList.contains('archive-hidden')).toBe(true));x.host.querySelectorAll<HTMLButtonElement>('.archive-entry')[1].click();await vi.waitFor(()=>expect(old).toHaveBeenCalledTimes(1));x.host.querySelectorAll<HTMLButtonElement>('.archive-entry')[2].click();await vi.waitFor(()=>expect(x.requests).toHaveLength(2));x.resolve(1);await vi.waitFor(()=>expect(x.host.querySelector('.archive-state')?.classList.contains('archive-hidden')).toBe(true));let done=false;const end=x.archive.unmount?.() as Promise<void>;void end.then(()=>{done=true});await vi.waitFor(()=>expect(x.requests[1].destroy).toHaveBeenCalledTimes(1));expect(done).toBe(false);gate.resolve();await end;expect(done).toBe(true);expect(old).toHaveBeenCalledTimes(1);expect(x.host.children).toHaveLength(0);expect(x.requests).toHaveLength(2)
})
for(const mode of ['throw','reject'] as const) it(`preserves ${mode} cleanup reason, finishes own teardown and supports reentrant unmount`,async()=>{
 const x=await setup();await x.click('a');const reason={raw:'cleanup '+mode};let reentrant:unknown;const cleanup=vi.fn(()=>{reentrant=x.archive.unmount?.();if(mode==='throw')throw reason;return Promise.reject(reason)});x.resolve(0,cleanup);await vi.waitFor(()=>expect(x.host.querySelector('.archive-state')?.classList.contains('archive-hidden')).toBe(true));const first=x.archive.unmount?.() as Promise<void>;const second=x.archive.unmount?.();expect(second).toBe(first);await expect(first).rejects.toBe(reason);expect(reentrant).toBe(first);expect(cleanup).toHaveBeenCalledTimes(1);expect(x.host.children).toHaveLength(0);expect(x.archive.unmount?.()).toBe(first)
})
it('retains a known retired cleanup rejection during concurrent parent destroy',async()=>{
 const x=await setup();await x.click('a');const gate=deferred<void>();const reason=new Error('old raw cleanup');x.resolve(0,vi.fn(()=>gate.promise));await vi.waitFor(()=>expect(x.host.querySelector('.archive-state')?.classList.contains('archive-hidden')).toBe(true));x.host.querySelectorAll<HTMLButtonElement>('.archive-entry')[1].click();await new Promise(r=>setTimeout(r,20));const end=x.archive.unmount?.() as Promise<void>;const assertion=expect(end).rejects.toBe(reason);gate.reject(reason);await assertion;expect(x.host.children).toHaveLength(0);expect(x.requests).toHaveLength(1)
})
it('reports late child cleanup failure once without reviving UI or an unhandled rejection',async()=>{
 const x=await setup();await x.click('a');const log=vi.spyOn(console,'error').mockImplementation(()=>{});await x.archive.unmount?.();const reason=new Error('late cleanup');const cleanup=vi.fn(()=>Promise.reject(reason));x.resolve(0,cleanup);await vi.waitFor(()=>expect(log).toHaveBeenCalledWith(reason));await new Promise(r=>setTimeout(r,20));expect(log).toHaveBeenCalledTimes(1);expect(cleanup).toHaveBeenCalledTimes(1);expect(x.host.children).toHaveLength(0)
})
