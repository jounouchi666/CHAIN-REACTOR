import {test,expect} from '@playwright/test';
import {RigidWorld} from '../src/rigid-world.js';
import {exportBlueprint} from '../src/blueprint.js';
import {writeFile} from 'node:fs/promises';
test('600-body liquid experiment keeps the display thread responsive',async({page},info)=>{
  test.setTimeout(45000);
  const w=new RigidWorld();w.add({x:700,y:790,width:1400,height:20,fixed:true});
  for(let i=0;i<600;i++)w.add({x:100+(i%28)*44,y:750-Math.floor(i/28)*30,width:40,height:28,material:i%4===0?'fuel':'steel'});
  const battery=w.add({x:40,y:700,fixed:true});battery.device='battery';battery.enabled=false;
  const fluid=w.enableCoolant();fluid.rasterize(w.parts.values());fluid.seed(20,200,1360,560);
  await page.addInitScript(()=>{
    window.frameIntervals=[];window.longTasks=[];let last=0;
    const track=t=>{if(last)window.frameIntervals.push({at:t,ms:t-last});last=t;requestAnimationFrame(track);};requestAnimationFrame(track);
    new PerformanceObserver(list=>{for(const e of list.getEntries())window.longTasks.push({at:e.startTime,ms:e.duration});}).observe({entryTypes:['longtask']});
  });
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/index.html');
  await page.locator('input[type=file]').setInputFiles({name:'load.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exportBlueprint(w)))});
  await expect(page.getByRole('status').filter({hasText:'読込済み'})).toBeVisible();
  await page.locator('#pause').click();
  const begin=await page.evaluate(()=>performance.now());
  const tick=()=>page.locator('#stats').textContent().then(s=>Number(s.match(/^T(\d+)/)[1]));
  await expect.poll(tick,{timeout:15000}).toBeGreaterThan(600);
  await page.locator('canvas').focus();const start=performance.now();await page.keyboard.press('Equal');
  await expect(page.locator('#stats')).toContainText('1.2x');const inputLatency=performance.now()-start;
  const result=await page.evaluate(begin=>{
    const intervals=window.frameIntervals.filter(f=>f.at>begin+500).map(f=>f.ms).sort((a,b)=>a-b);
    return {samples:intervals.length,p50:intervals[Math.floor(intervals.length*.5)],p95:intervals[Math.floor(intervals.length*.95)],max:intervals.at(-1),longTasks:window.longTasks.filter(t=>t.at>begin+500)};
  },begin);
  result.zoomInputMs=inputLatency;await writeFile(info.outputPath('display-performance.json'),JSON.stringify(result,null,2));await info.attach('display-performance.json',{body:JSON.stringify(result,null,2),contentType:'application/json'});
  expect(result.samples).toBeGreaterThan(100);expect(result.p95).toBeLessThan(40);expect(inputLatency).toBeLessThan(250);expect(errors).toEqual([]);
});
