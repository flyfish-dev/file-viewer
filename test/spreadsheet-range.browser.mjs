import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
const page=await browser.newPage({viewport:{width:1500,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:43141/test/fixtures/spreadsheet-range/index.html');
 await page.getByRole('button',{name:'趋势与占比',exact:true}).waitFor({timeout:20000});

 const range={sheetId:1,startRow:29,startCol:3,endRow:29,endCol:4};
 const apply=r=>page.evaluate(r=>window.rangeTest.applyViewState({spreadsheet:{range:r}}),r);
 assert.equal((await apply(range))?.spreadsheet?.status,'applied');
 const target=page.getByText('第二处：应定位到此范围',{exact:true});
 await target.waitFor({state:'visible'});
 for(let i=0;i<3;i++){
   await page.getByRole('button',{name:'样式与柱状图',exact:true}).click();
   assert.equal((await apply(range))?.spreadsheet?.status,'applied');
   await page.waitForTimeout(900);
   const box=await target.boundingBox();assert.ok(box&&box.y>=0&&box.y+box.height<=900,JSON.stringify(box));
   assert.equal(await target.evaluate(el=>{while(el){if(getComputedStyle(el).backgroundColor==='rgb(255, 191, 71)')return true;el=el.parentElement;}return false;}),true);
 }

 assert.equal((await apply({...range,startRow:19,endRow:19}))?.spreadsheet?.status,'applied');
 for(const r of [{...range,sheetId:2},{...range,startRow:-1},{...range,endRow:700}])assert.equal((await apply(r))?.spreadsheet?.status,'rejected');
 assert.equal((await apply({...range,startRow:599,endRow:599}))?.spreadsheet?.status,'applied');
 await page.getByText('Virtual window target',{exact:true}).waitFor({state:'visible'});
 const virtualBox=await page.getByText('Virtual window target',{exact:true}).boundingBox();assert.ok(virtualBox&&virtualBox.y>=0&&virtualBox.y+virtualBox.height<=900);
 const results=await page.evaluate(async()=>Promise.all([
   window.rangeTest.applyViewState({spreadsheet:{range:{sheetId:0,startRow:4,startCol:1,endRow:4,endCol:2}}}),
   window.rangeTest.applyViewState({spreadsheet:{range:{sheetId:1,startRow:29,startCol:3,endRow:29,endCol:4}}})]));
 assert.deepEqual(results.map(x=>x.spreadsheet.status),['cancelled','applied']);
 const found=await page.evaluate(()=>window.rangeTest.search('定位目标'));assert.equal(found.total,2);
 await page.evaluate(()=>window.rangeTest.nextSearchResult());
 await page.evaluate(()=>window.rangeTest.destroy());
 assert.deepEqual(errors,[]);
 console.log('PASS: exact cross-sheet range, 3 settled-layout round trips, blank cells, invalid/hidden/out-of-bounds rejection, latest request wins, destruction');
}catch(e){console.log('PAGE ERRORS',errors);throw e;}finally{await browser.close();}
