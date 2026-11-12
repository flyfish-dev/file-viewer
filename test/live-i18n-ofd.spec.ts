// @vitest-environment jsdom
import {beforeEach,afterEach,it,expect,vi} from 'vitest'
import {createFileViewerI18n} from '@file-viewer/core'
const model=vi.hoisted(()=>({success:null as any,fail:null as any,parses:0,renders:0,throws:false,error:undefined as unknown}))
vi.mock('../packages/renderers/ofd/vendor/dltech/ofd/ofd.js',()=>({parseOfdDocument:({success,fail}:any)=>{model.parses++;model.success=success;model.fail=fail},renderOfd:()=>{model.renders++;if(model.throws)throw model.error;const page=document.createElement('div');page.textContent='原始 OFD BODY';return [page,page.cloneNode(true)]}}))
import renderOfd from '../packages/renderers/ofd/src/ofd'
const locales=['en-US','zh-CN','ja-JP','de-DE','zh-TW','zh-HK'] as const
const ends:Array<()=>void>=[]
class RO {static all:RO[]=[];constructor(public cb:ResizeObserverCallback){RO.all.push(this)}observe(){}disconnect(){}trigger(){this.cb([],this as any)}}
beforeEach(()=>{model.success=null;model.fail=null;model.parses=0;model.renders=0;model.throws=false;model.error=undefined;RO.all=[];vi.stubGlobal('ResizeObserver',RO);vi.spyOn(console,'error').mockImplementation(()=>{});vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockReturnValue({width:700,height:400,top:0,bottom:400,left:0,right:700,x:0,y:0,toJSON(){}});vi.spyOn(window,'requestAnimationFrame').mockImplementation(cb=>setTimeout(()=>cb(0),0) as any)})
afterEach(()=>{ends.splice(0).reverse().forEach(fn=>fn());vi.restoreAllMocks();vi.unstubAllGlobals();document.body.replaceChildren()})
function begin(locale:typeof locales[number]='en-US',extra:any={}){model.success=null;model.fail=null;const target=document.createElement('div');document.body.append(target);const scope=createFileViewerI18n({locale},{ownerDocument:document});ends.push(()=>scope.destroy());const releases:Array<ReturnType<typeof vi.fn>>=[];const subscribe=scope.subscribe;scope.subscribe=fn=>{const release=vi.fn(subscribe(fn));releases.push(release);return release};const promise=renderOfd(new ArrayBuffer(1),target,{i18n:scope,...extra});return {target,scope,promise,releases}}
async function complete(x:ReturnType<typeof begin>){await vi.waitFor(()=>expect(model.success).toBeTypeOf('function'));model.success([{}]);const instance=await x.promise;ends.push(()=>instance.unmount());return {...x,instance}}
const label=(x:any)=>x.target.querySelector('.ofd-state') as HTMLElement
it.each(locales)('pending and ready labels from %s update without touching page nodes',async locale=>{
 const x=begin(locale);await vi.waitFor(()=>expect(model.success).toBeTypeOf('function'));const state=label(x),text=state.firstChild;for(const locale of locales){x.scope.update({locale});expect(state.textContent).toBe(x.scope.t('ofd.state.loading'));expect(state.firstChild).toBe(text)}
 const y=await complete(x),page=x.target.querySelector('.ofd-page'),frame=x.target.querySelector('.ofd-page-frame');const before=page?.textContent
 for(const locale of locales){x.scope.update({locale});expect(x.target.querySelector('.ofd-toolbar')?.getAttribute('aria-label')).toBe(x.scope.t('ofd.toolbar.pageNavigation'));expect(x.target.querySelector('.ofd-stage')?.getAttribute('aria-label')).toBe(x.scope.t('ofd.toolbar.documentPages'));expect(x.target.querySelector('.ofd-page-meter')?.getAttribute('aria-label')).toBe(x.scope.t('ofd.toolbar.pageStatus',{current:1,total:2}));expect(x.target.querySelector('.ofd-page')).toBe(page);expect(x.target.querySelector('.ofd-page-frame')).toBe(frame);expect(page?.textContent).toBe(before)}
 expect(model.parses).toBe(1);expect(model.renders).toBe(1);y.instance.unmount();const old=state.textContent;x.scope.update({locale:'en-US'});expect(state.textContent).toBe(old)
})
it('respects legacy and explicit child overrides including custom strings',async()=>{
 const target=document.createElement('div');const promise=renderOfd(new ArrayBuffer(0),target,{options:{locale:'zh-HK',messages:{'ofd.toolbar.previousPage':'Custom 原文'}}});await vi.waitFor(()=>expect(model.success).toBeTruthy());model.success([{}]);const inst=await promise;expect(target.querySelector('button')?.title).toBe('Custom 原文');inst.unmount()
 const x=await complete(begin('zh-TW'));x.scope.update({locale:'ja-JP',messages:{'ofd.toolbar.previousPage':'<i>Custom</i>'}});expect(x.target.querySelector('button')?.title).toBe('<i>Custom</i>');x.scope.update({locale:'ja-JP'});expect(x.target.querySelector('button')?.title).toBe(x.scope.t('ofd.toolbar.previousPage'))
})
it.each(['raw','fallback','reentrant'] as const)('resize failure %s captures once and preserves ownership',async mode=>{
 const x=await complete(begin('zh-TW'));const state=label(x),before=state.textContent;let reads=0;const error=new Error();Object.defineProperty(error,'message',{get(){reads++;if(mode==='reentrant')x.instance.unmount();return 'RAW 原文'}});model.throws=true;model.error=mode==='fallback'?undefined:error
 x.instance.$el.getBoundingClientRect=()=>({width:900} as DOMRect);RO.all[0].trigger();await vi.waitFor(()=>expect(model.renders).toBe(2));
 if(mode==='reentrant'){expect(state.textContent).toBe(before);expect(reads).toBe(1)}else {for(const locale of locales){x.scope.update({locale});expect(state.textContent).toBe(mode==='raw'?'RAW 原文':x.scope.t('ofd.error.parseFailed'))};expect(reads).toBe(mode==='raw'?1:0)}
 expect(model.parses).toBe(1)
})
it('initial failure retains the reject object and releases all live bindings',async()=>{
 const x=begin('zh-TW');let reads=0;const failure=new Error();Object.defineProperty(failure,'message',{get(){reads++;return 'RAW initial'}});const assertion=expect(x.promise).rejects.toBe(failure);await vi.waitFor(()=>expect(model.fail).toBeTruthy());model.fail(failure);await assertion;expect(reads).toBe(0);expect(x.releases.length).toBe(8);expect(x.releases.every(fn=>fn.mock.calls.length===1)).toBe(true);const state=label(x),before=state.textContent;x.scope.update({locale:'ja-JP'});expect(state.textContent).toBe(before)
})

it('initial empty document preserves the owned Error reason but retires the generic wrapper state',async()=>{const x=begin('zh-HK');let failure:any;const result=x.promise.catch(error=>{failure=error});await vi.waitFor(()=>expect(model.success).toBeTruthy());model.success([]);await result;expect(failure).toBeInstanceOf(Error);expect(failure.message).toBe(x.scope.t('ofd.error.empty'));expect(label(x).textContent).toBe(x.scope.t('ofd.error.parseFailed'));expect(x.releases.every(fn=>fn.mock.calls.length===1)).toBe(true)})

it('late parse after abort rejects the original reason without changing cancelled UI',async()=>{const controller=new AbortController(),x=begin('zh-TW',{signal:controller.signal});const reason={original:'abort reason'};const outcome=expect(x.promise).rejects.toBe(reason);await vi.waitFor(()=>expect(model.success).toBeTruthy());const state=label(x),before=state.textContent,cl=state.className;controller.abort(reason);model.success([{}]);await outcome;expect(state.textContent).toBe(before);expect(state.className).toBe(cl);expect(x.releases.every(fn=>fn.mock.calls.length===1)).toBe(true)})
