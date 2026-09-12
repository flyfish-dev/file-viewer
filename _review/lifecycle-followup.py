from pathlib import Path
p=Path('packages/renderers/3d/src/ifcRuntime.ts')
s=p.read_text();old='            currentFragments.abort(id);';assert s.count(old)==1
s=s.replace(old,'''            // abort() routes through the upstream connection and creates a Worker
            // for an unknown model ID. Before load(), there is nothing to abort.
            if (currentFragments.models.list.has(id)) currentFragments.abort(id);''')
p.write_text(s)
p=Path('packages/renderers/3d/scripts/verify-ifc-browser.mjs');s=p.read_text()
s=s.replace('while(!runtimeEntered)await new Promise(resolve=>setTimeout(resolve,1));','''const deadline=Date.now()+20000;
    while(!runtimeEntered){if(Date.now()>deadline)throw new Error("Runtime hook was not reached");await new Promise(resolve=>setTimeout(resolve,1));}''')
needle='  // Input limit is enforced before another worker or transferable copy is allocated.'
assert s.count(needle)==1
s=s.replace(needle,'''  const badFragments=await page.evaluate(async()=>{
    try{await openIfc("ifc4.ifc",{thatOpen:{fragments:{settings:{typoOption:true}}}});return false;}
    catch(error){return /Unknown or non-data/.test(error.message);}
  });
  assert.ok(badFragments);await page.waitForFunction(()=>workerCounts.active===0);
  const throwingCleanup=await page.evaluate(async()=>{
    window.cleanupOrder=[];
    await openIfc("ifc4.ifc",{
      configureRuntime(){return()=>cleanupOrder.push("runtime");},
      configure(){return()=>{cleanupOrder.push("model");throw new Error("Expected host cleanup failure");};}
    });
    let rejected=false;try{await instance.unmount();}catch(error){rejected=error instanceof AggregateError;}
    return{rejected,order:cleanupOrder};
  });
  assert.deepEqual(throwingCleanup,{rejected:true,order:["model","runtime"]});
  await page.waitForFunction(()=>workerCounts.active===0);assert.equal(await page.locator("canvas").count(),0);
  report.badFragments=badFragments;report.throwingCleanup=throwingCleanup;
'''+needle)
p.write_text(s)
p=Path('docs/maintenance/pr-issue-review-20260912.md')
s=p.read_text();s += '''
## Lifecycle defect caught during integration

The first real-browser advanced-hook qualification (`34680017521`) passed both
original models and actual importer settings, then failed because a pre-model
cancellation left a Worker alive. Upstream `abort(id)` creates a connection for an
unknown model ID. The adapter now calls it only for a registered model; disposal
before model loading must not create a new Worker. Regression coverage includes
late asynchronous runtime hooks, invalid Fragments settings before load, and a
throwing host cleanup without suppressing remaining hook/Worker/WebGL disposal.
''';p.write_text(s)
print('Guarded abort before model registration and added bounded cleanup regressions')
