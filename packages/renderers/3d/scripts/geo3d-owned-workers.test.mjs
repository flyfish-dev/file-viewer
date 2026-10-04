import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Worker as Thread } from 'node:worker_threads'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { adaptPointSource, createPointSourceWithCancellation } from './build-geo3d-point-adapters.mjs'
const { Geo3dOwnedWorkerPool } = await import(process.env.GEO3D_POOL_MODULE || '../dist/geo3dOwnedWorkerPool.js')
class FakeWorker {
  listeners = new Map()
  messages = []
  terminated = 0
  addEventListener(type, fn) { const set=this.listeners.get(type)||new Set();set.add(fn);this.listeners.set(type,set) }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn) }
  emit(type, data) { for(const fn of [...(this.listeners.get(type)||[])])fn(data) }
  postMessage(message) { this.messages.push(message) }
  respond(payload, error) { const request=this.messages.at(-1);this.emit('message',{data:{requestId:request.id,...(error?{error}:{payload})}}) }
  terminate() { this.terminated++ }
}
function fixture(t, options={}) {
  const workers=[], releases=[]
  const pool=new Geo3dOwnedWorkerPool({createWorker(){const worker=new FakeWorker();workers.push(worker);return{worker,release:()=>releases.push(worker)}},...options})
  t.after(()=>pool.dispose());return{pool,workers,releases}
}
const rejection = (promise, pattern=/./) => assert.rejects(promise, pattern)

test('construction is lazy and validates hard limits',t=>{
 const f=fixture(t);assert.equal(f.workers.length,0)
 for(const options of[{concurrency:0},{concurrency:17},{concurrency:NaN},{maxQueued:-1},{timeoutMs:0},{timeoutMs:Infinity}])assert.throws(()=>new Geo3dOwnedWorkerPool({createWorker(){throw Error('unused')},...options}),/limits/)
})
test('messages round-trip and idle workers are reused',async t=>{
 const {pool,workers}=fixture(t,{concurrency:1});const a=pool.queue('echo',1);workers[0].respond(2);assert.equal(await a,2)
 const b=pool.queue('echo',3);workers[0].respond(4);assert.equal(await b,4);assert.equal(workers.length,1)
})
test('concurrency is bounded and FIFO work continues',async t=>{
 const {pool,workers}=fixture(t,{concurrency:2});const tasks=[0,1,2,3].map(n=>pool.queue('echo',n))
 assert.equal(workers.length,2);workers[0].respond(0);assert.equal(workers[0].messages.at(-1).payload,2)
 workers[1].respond(1);assert.equal(workers[1].messages.at(-1).payload,3);workers[0].respond(2);workers[1].respond(3)
 assert.deepEqual(await Promise.all(tasks),[0,1,2,3])
})
test('disposal settles running and queued jobs, once',async t=>{
 const {pool,workers,releases}=fixture(t,{concurrency:1});const a=rejection(pool.queue('a',1),/disposed/),b=rejection(pool.queue('b',2),/disposed/)
 pool.dispose();pool.dispose();await Promise.all([a,b]);assert.equal(workers[0].terminated,1);assert.equal(releases.length,1)
 assert.ok([...workers[0].listeners.values()].every(s=>s.size===0));await rejection(pool.queue('c',3),/disposed/)
})
test('two owners do not dispose one another and fresh owners work',async t=>{
 const a=fixture(t),b=fixture(t);const pa=rejection(a.pool.queue('a',1),/disposed/),pb=b.pool.queue('b',2)
 a.pool.dispose();await pa;assert.equal(b.workers[0].terminated,0);b.workers[0].respond('alive');assert.equal(await pb,'alive')
 const c=fixture(t);const pc=c.pool.queue('c',3);c.workers[0].respond('fresh');assert.equal(await pc,'fresh')
})
test('queued cancellation never dispatches that buffer',async t=>{
 const {pool,workers}=fixture(t,{concurrency:1});const first=pool.queue('a',1),controller=new AbortController(),buffer=new ArrayBuffer(8)
 const cancelled=rejection(pool.queue('b',buffer,[buffer],controller.signal),/abort/i);controller.abort();await cancelled
 assert.equal(buffer.byteLength,8);workers[0].respond(1);await first;assert.equal(workers[0].messages.length,0+1)
})
test('running cancellation releases its worker then replaces it',async t=>{
 const {pool,workers}=fixture(t,{concurrency:1});const c=new AbortController(),first=rejection(pool.queue('a',1,[],c.signal),/abort/i),second=pool.queue('b',2)
 c.abort();await first;assert.equal(workers[0].terminated,1);assert.equal(workers.length,2);workers[1].respond(2);assert.equal(await second,2)
})
test('pre-aborted owner and job allocate nothing',async t=>{
 const c=new AbortController();c.abort();const a=fixture(t,{signal:c.signal});await rejection(a.pool.queue('x',0),/abort/i);assert.equal(a.workers.length,0)
 const b=fixture(t);await rejection(b.pool.queue('x',0,[],c.signal),/abort/i);assert.equal(b.workers.length,0)
})
test('owner abort rejects every pending operation',async t=>{
 const c=new AbortController(),f=fixture(t,{signal:c.signal,concurrency:1});const tasks=[1,2,3].map(n=>rejection(f.pool.queue('x',n),/abort/i))
 c.abort();await Promise.all(tasks);assert.equal(f.workers[0].terminated,1)
})
test('worker errors and deserialization errors release their slots',async t=>{
 for(const kind of ['error','messageerror']){
  const {pool,workers}=fixture(t);const p=rejection(pool.queue('x',0),/failed|deserialized/)
  workers[0].emit(kind,{message:'worker failed',preventDefault(){}});await p;assert.equal(workers[0].terminated,1)
 }
})
test('invalid IDs and malformed payloads cannot strand jobs',async t=>{
 for(const data of[null,{}, {requestId:999,payload:0},{requestId:0}]){
  const {pool,workers}=fixture(t);const p=rejection(pool.queue('x',0),/Invalid/);workers[0].emit('message',{data});await p;assert.equal(workers[0].terminated,1)
 }
})
test('decoder-declared errors reject without corrupting reuse',async t=>{
 const {pool,workers}=fixture(t);const p=rejection(pool.queue('bad',1),/bad data/);workers[0].respond(null,'bad data');await p
 const q=pool.queue('good',2);workers[0].respond(2);assert.equal(await q,2)
})
test('synchronous worker construction and post failures settle promises',async t=>{
 const a=fixture(t,{createWorker(){throw Error('factory failed')}});await rejection(a.pool.queue('x',1),/factory failed/)
 const worker=new FakeWorker();worker.postMessage=()=>{throw Error('clone failed')}
 const b=fixture(t,{createWorker:()=>({worker})});await rejection(b.pool.queue('x',1),/clone failed/);assert.equal(worker.terminated,1)
})
test('queue backpressure does not detach rejected input',async t=>{
 const {pool,workers}=fixture(t,{concurrency:1,maxQueued:1});const a=pool.queue('a',1),b=pool.queue('b',2),buf=new ArrayBuffer(8)
 await rejection(pool.queue('overflow',buf,[buf]),/queue limit/);assert.equal(buf.byteLength,8)
 workers[0].respond(1);workers[0].respond(2);await Promise.all([a,b])
})
test('job deadline releases a stalled worker',async t=>{
 const {pool,workers}=fixture(t,{timeoutMs:20});await rejection(pool.queue('stuck',0),/timed out/);assert.equal(workers[0].terminated,1)
})
test('a faulty release callback cannot prevent settlement of other slots',async t=>{
 const workers=[];const {pool}=fixture(t,{createWorker(){const worker=new FakeWorker();workers.push(worker);return{worker,release(){throw Error('release failed')}}}})
 const tasks=[1,2,3].map(n=>rejection(pool.queue('x',n),/disposed/));pool.dispose();await Promise.all(tasks);assert.deepEqual(workers.map(w=>w.terminated),[1,1])
})
test('cancellation reentered by a factory is observed before dispatch',async t=>{
 const c=new AbortController(),worker=new FakeWorker();const {pool}=fixture(t,{createWorker(){c.abort();return{worker}}})
 await rejection(pool.queue('x',0,[],c.signal),/abort/i);assert.equal(worker.messages.length,0)
})
test('real workers transfer bytes and terminate independently',async t=>{
 const code=`const {parentPort}=require('node:worker_threads');parentPort.on('message',m=>{if(m.type==='hold')return;new Uint8Array(m.payload)[0]+=1;parentPort.postMessage({requestId:m.id,payload:m.payload},[m.payload])})`
 const threads=[]
 function factory(){
  const thread=new Thread(code,{eval:true}),listeners=new Map();threads.push(thread)
  return{worker:{postMessage:(m,x)=>thread.postMessage(m,x),terminate:()=>{void thread.terminate()},
   addEventListener(type,fn){const name=type==='messageerror'?'messageerror':type;const listener=value=>fn(type==='message'?{data:value}:{message:String(value),preventDefault(){}});listeners.set(fn,[name,listener]);thread.on(name,listener)},
   removeEventListener(_type,fn){const item=listeners.get(fn);if(item)thread.off(...item);listeners.delete(fn)}}}
 }
 const a=fixture(t,{createWorker:factory}),b=fixture(t,{createWorker:factory});t.after(async()=>{await Promise.all(threads.map(w=>w.terminate()))})
 const buf=new ArrayBuffer(8);new Uint8Array(buf)[0]=9;const done=b.pool.queue('echo',buf,[buf]);assert.equal(buf.byteLength,0)
 const cancelled=rejection(a.pool.queue('hold',new ArrayBuffer(1)),/disposed/);a.pool.dispose();await cancelled
 assert.equal(new Uint8Array(await done)[0],10)
})
test('pinned adapter transformation rejects changes and injects only local ownership',async()=>{
 const require=createRequire(import.meta.url)
 for(const name of['LASSource','COPCSource']){
  const path=process.env.GEO3D_ENGINE_SOURCE?join(process.env.GEO3D_ENGINE_SOURCE,`${name}.js`):require.resolve(`@giro3d/giro3d/sources/${name}.js`)
  const source=await readFile(path,'utf8'),adapted=adaptPointSource(name,source)
  assert.match(adapted,new RegExp(`export function create${name}\\(LASWorkerPool, options\\)`))
  assert.ok(!adapted.includes("import LASWorkerPool from"));assert.match(adapted,/LASWorkerPool\.dispose\(\)/)
  assert.ok(adapted.includes(createPointSourceWithCancellation.toString()))
  assert.ok(adapted.includes(`return createPointSourceWithCancellation(${name}, options);`))
  assert.throws(()=>adaptPointSource(name,source+'\n'),/Unreviewed/)
 }
 assert.throws(()=>adaptPointSource('Other',''),/Unreviewed/)
})
test('runtime unmount latches before abort and host callbacks can reenter',async()=>{
 const source=await readFile(new URL('../src/geo3dRuntime.ts',import.meta.url),'utf8')
 const block=source.slice(source.indexOf('  const cleanup=():Promise<void>=>{'),source.indexOf('  const abort=()=>'))
 assert.ok(block.includes('cleanupPromise=Promise.resolve().then'))
 const require=createRequire(import.meta.url),ts=require(process.env.GEO3D_TYPESCRIPT_PATH||'typescript')
 const setup=`function make(controller,hooks,target){
 let cleanupPromise:Promise<void>|undefined,destroyed=false;
 const context=undefined,abort=()=>{},owned=[],instance=null,controls=null,sourceObject=null,cityObject=null,stopPointRequests=undefined;
 const disposeCityJsonGroup=()=>{};
 ${block}
 return cleanup;
 }`
 const compiled=ts.transpileModule(setup,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText
 const make=new Function(compiled+';return make;')(),controller=new AbortController();let cleanup,hookCalls=0,targetCalls=0
 cleanup=make(controller,[()=>{hookCalls++;void cleanup();throw Error('host cleanup failure')}],{replaceChildren(){targetCalls++}})
 controller.signal.addEventListener('abort',()=>{void cleanup()})
 const first=cleanup();assert.equal(cleanup(),first);await first;assert.equal(hookCalls,1);assert.equal(targetCalls,1)
})

test('point source cancellation preserves the public class and successful results',async()=>{
 const options={decimate:2},data={pointCount:4},request={node:{id:'node'}}
 class Source {
  constructor(input){this.options=input}
  getNodeData(params){assert.equal(params,request);return Promise.resolve(data)}
  getMetadata(){return 'metadata'}
 }
 const source=createPointSourceWithCancellation(Source,options)
 assert.ok(source instanceof Source)
 assert.equal(source.options,options);assert.equal(source.getMetadata(),'metadata')
 assert.equal(await source.getNodeData(request),data)
})
test('cancelled queued point requests never touch a disposed source',async()=>{
 let calls=0
 class Source {getNodeData(){calls++;throw Error('not initialized')}}
 const source=createPointSourceWithCancellation(Source,{})
 for(const reason of['aborted',new DOMException('Node cancelled','AbortError')]){
  const controller=new AbortController();controller.abort(reason)
  await assert.rejects(source.getNodeData({signal:controller.signal}),error=>error===reason)
 }
 assert.equal(calls,0)
})
test('pending point cancellation preserves its own reason and leaves another request alive',async()=>{
 const pending=new Map()
 class Source {getNodeData(params){return new Promise((resolve,reject)=>pending.set(params.node,{resolve,reject}))}}
 const source=createPointSourceWithCancellation(Source,{}),a=new AbortController(),b=new AbortController()
 const cancelled=assert.rejects(source.getNodeData({node:'A',signal:a.signal}),error=>error===a.signal.reason)
 const active=source.getNodeData({node:'B',signal:b.signal})
 a.abort('aborted')
 pending.get('A').reject(new DOMException('Source pool disposed','AbortError'))
 pending.get('B').resolve('survivor')
 await cancelled;assert.equal(await active,'survivor');assert.equal(b.signal.aborted,false)
})
test('late point decode results are rejected after request cancellation',async()=>{
 let resolve
 class Source {getNodeData(){return new Promise(done=>{resolve=done})}}
 const controller=new AbortController(),source=createPointSourceWithCancellation(Source,{})
 const cancelled=assert.rejects(source.getNodeData({signal:controller.signal}),error=>error===controller.signal.reason)
 controller.abort('aborted');resolve({pointCount:10});await cancelled
})
test('point decoder errors without cancellation remain observable',async()=>{
 const failure=new Error('corrupt point data')
 for(const asynchronous of[false,true]){
  class Source {getNodeData(){if(asynchronous)return Promise.reject(failure);throw failure}}
  const source=createPointSourceWithCancellation(Source,{})
  await assert.rejects(source.getNodeData({signal:new AbortController().signal}),error=>error===failure)
 }
})

async function lifecycleFactory(){
 const source=await readFile(new URL('../src/geo3dRuntime.ts',import.meta.url),'utf8')
 const start=source.indexOf('  const cleanup=():Promise<void>=>{')
 const end=source.indexOf("  context?.signal?.addEventListener('abort',abort,{once:true})",start)
 assert.ok(start>=0&&end>start,'Runtime lifecycle boundaries must exist')
 const require=createRequire(import.meta.url),ts=require(process.env.GEO3D_TYPESCRIPT_PATH||'typescript')
 const setup=`function make({controller,context,stopPointRequests,hooks,target,instance,sourceObject,loaded=false}){
 let cleanupPromise:Promise<void>|undefined,destroyed=false;
 const controls=null,cityObject=null,owned=[],disposeCityJsonGroup=()=>{};
 ${source.slice(start,end)}
 return {cleanup,abort};
 }`
 const compiled=ts.transpileModule(setup,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText
 return new Function(compiled+';return make;')()
}
test('runtime stops point requests before pool abort and disposes instance before source',async()=>{
 const make=await lifecycleFactory()
 for(const action of['abort','cleanup']){
  const events=[],controller=new AbortController();let release,stopped=false
  const hook=new Promise(resolve=>{release=resolve})
  const lifecycle=make({controller,context:{signal:new AbortController().signal},
   stopPointRequests(){if(!stopped){stopped=true;events.push('stop')}},
   hooks:[()=>{events.push('hook');return hook}],target:{replaceChildren(){events.push('target')}},
   instance:{view:{setControls(){events.push('controls')}},dispose(){events.push('instance')}},
   sourceObject:{dispose(){events.push('source')}}})
  controller.signal.addEventListener('abort',()=>{events.push('pool-abort')})
  lifecycle[action]()
  assert.deepEqual(events,['stop','pool-abort'],'Requests must stop synchronously before pool cancellation')
  const first=lifecycle.cleanup();assert.equal(lifecycle.cleanup(),first)
  await Promise.resolve();assert.deepEqual(events,['stop','pool-abort','hook'])
  release();await first
  assert.deepEqual(events,['stop','pool-abort','hook','controls','instance','source','target'])
 }
})
test('a failing point stop or host disposer cannot skip source cancellation and cleanup',async()=>{
 const make=await lifecycleFactory(),events=[],controller=new AbortController()
 const lifecycle=make({controller,context:undefined,stopPointRequests(){throw Error('host listener')},
  hooks:[()=>{throw Error('host disposer')}],target:{replaceChildren(){events.push('target')}},
  instance:{view:{setControls(){}},dispose(){events.push('instance')}},
  sourceObject:{dispose(){events.push('source')}}})
 await lifecycle.cleanup();assert.equal(controller.signal.aborted,true)
 assert.deepEqual(events,['instance','source','target'])
})
