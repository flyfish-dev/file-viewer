import assert from 'node:assert/strict'
import {join} from 'node:path'
import {writeFile} from 'node:fs/promises'

// Each workload reuses ONE page and its unmodified GlobalCache for six mounts.
// Measurements, not a production benchmark or a universal no-leak assertion.
export async function verifyMemoryCases({browser,origin,output,report,transfers}){
  for(const item of [{name:'memory-las-262144',format:'las',file:'memory-262144.las',pointCount:262144},{name:'memory-raster-1048576',format:'geotiff',file:'memory-1048576.tif',sampleCount:1048576}]){
    const result={name:item.name,status:'running',cycles:[],interpretation:'Main-isolate heap after forced GC; excludes Worker heaps, native/GPU allocations and production-scale guarantees. The test never clears the cache; source disposal must release its own regions.'}
    const page=await browser.newPage({viewport:{width:640,height:480}}),errors=[]
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
    await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(origin+'/')||url.startsWith('blob:')||url.startsWith('data:'))return route.continue();errors.push('External request '+url);return route.abort()})
    const cdp=await page.context().newCDPSession(page)
    const sample=async()=>{
      await cdp.send('HeapProfiler.collectGarbage')
      const heap=await cdp.send('Runtime.getHeapUsage'),dom=await cdp.send('Memory.getDOMCounters'),cache=await page.evaluate(()=>api.cache())
      assert.ok(Number.isFinite(heap.usedSize)&&heap.usedSize>=0)
      assert.ok(Number.isFinite(cache.size)&&cache.size>=0)
      assert.ok(Number.isFinite(cache.maxSize)&&cache.size<=cache.maxSize,'Cache exceeded its configured byte capacity')
      assert.ok(Number.isFinite(cache.count)&&cache.count<=cache.capacity,'Cache exceeded its configured entry capacity')
      return {heap,dom,cache}
    }
    try{
      await page.goto(origin+'/nested/app/');await page.waitForFunction(()=>window.entryReady)
      const baseline=await page.evaluate(()=>window.prepare());result.baseline=await sample()
      for(let cycle=0;cycle<6;cycle++){
        const begin=performance.now(),startTransfer=transfers.length
        const opened=await page.evaluate(args=>api.open(args),{...item,crs:'EPSG:32632'});assert.equal(opened.ok,true,opened.error)
        await page.waitForFunction(()=>{const state=api.state();return state&&!state.loading&&(state.render.points>0||state.render.triangles>0)},null,{timeout:45000})
        const live=await page.evaluate(()=>api.measure()),loaded=await sample()
        if(item.pointCount)assert.equal(live.pointCount,item.pointCount,'The larger LAS must contain the complete point count')
        if(item.sampleCount){
          assert.equal(live.extent.width,1024);assert.equal(live.extent.height,1024)
          assert.ok(loaded.cache.size>result.baseline.cache.size,'The raster must actually use the shared region cache while mounted')
        }
        assert.ok(live.resources.workers>0,'Larger workload must exercise real Workers')
        const frameMs=performance.now()-begin
        if(cycle===0||cycle===5)await page.screenshot({path:join(output,item.name+'-'+cycle+'.png')})
        const cleanup=await page.evaluate(()=>api.close());assert.deepEqual(cleanup,baseline)
        const closed=await sample(),requests=transfers.slice(startTransfer).filter(t=>t.path==='/datasets/'+item.file)
        assert.ok(requests.length>0,'Each new source must request the actual larger fixture')
        const entry={cycle,frameMs,live,loaded,closed,cleanup,requests};result.cycles.push(entry)
        console.log('GEO3D_MEMORY_CYCLE',JSON.stringify({name:item.name,...entry}))
        assert.equal(closed.cache.size,result.baseline.cache.size,'Disposed source retained region bytes in the shared cache')
        assert.equal(closed.cache.count,result.baseline.cache.count,'Disposed source retained shared cache entries')
      }
      const heap=result.cycles.slice(1).map(c=>c.closed.heap.usedSize),cache=result.cycles.map(c=>c.closed.cache.size)
      const mean=heap.reduce((a,b)=>a+b,0)/heap.length,mid=(heap.length-1)/2
      result.observed={heapAfterWarmupBytes:heap,heapLastMinusFirstBytes:heap.at(-1)-heap[0],heapSlopeBytesPerCycle:heap.reduce((sum,value,i)=>sum+(i-mid)*(value-mean),0)/heap.reduce((sum,_,i)=>sum+(i-mid)**2,0),heapStrictlyIncreasing:heap.every((value,i)=>!i||value>heap[i-1]),cacheBytes:cache,cacheLastMinusFirstBytes:cache.at(-1)-cache[0]}
      assert.deepEqual(errors,[]);result.status='passed'
    }catch(error){result.status='failed';result.failure=String(error);await page.evaluate(()=>api.close()).catch(()=>{});throw error}
    finally{
      result.errors=errors;report.cases.push(result)
      await writeFile(join(output,item.name+'.json'),JSON.stringify(result,null,2)+'\n')
      console.log('GEO3D_MEMORY_RESULT',JSON.stringify({name:result.name,status:result.status,failure:result.failure,observed:result.observed}))
      await cdp.detach();await page.close()
    }
  }
}
