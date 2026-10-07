import assert from 'node:assert/strict';
import { calPageBox } from '../vendor/dltech/ofd/ofd_render.js';
import { getPageScal, converterDpi } from '../vendor/dltech/ofd/ofd_util.js';

let passed=0;
for(const [paperWidth,paperHeight] of [[230,133.5],[210.016,297.009],[210,297],[297,210],[100,100]]) {
  for(const viewport of [60,320,600,850,1400]) {
    const doc={'ofd:CommonData':{'ofd:PageArea':{'ofd:PhysicalBox':`0 0 ${paperWidth} ${paperHeight}`}}};
    const page={'1':{json:{}}};
    const box=calPageBox(viewport,doc,page),expectedScale=Math.min(5,(viewport-10)/paperWidth);
    assert.ok(Math.abs(box.w-paperWidth*expectedScale)<1e-8,`Paper ${paperWidth} viewport ${viewport}: width ${box.w}`);
    assert.ok(box.w<=viewport-10+1e-8,'Page must fit the available viewport');
    assert.ok(Math.abs(box.h/box.w-paperHeight/paperWidth)<1e-8,'Preserve the original aspect ratio');
    assert.ok(Math.abs(getPageScal()-expectedScale)<1e-8);
    assert.ok(Math.abs(converterDpi(12.34)-12.34*expectedScale)<1e-8,'Content shares the exact page scale');
    passed++;
  }
}
console.log(JSON.stringify({passed,scope:'Five authored paper sizes, five viewport widths, exact geometry and shared content scale; existing maximum zoom is retained.'}));
