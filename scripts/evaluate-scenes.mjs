import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createScene, SCENES } from '../src/scenes.js';
await mkdir('evidence/scenes',{recursive:true});
const comparisons=[];
for(const scene of SCENES){
  const variants=[];
  for(const shoot of [false,true]){
    const {world,battery}=createScene(scene.id);
    for(let i=0;i<240;i++)world.step();
    if(shoot)world.launch(90,550,650,650,45);
    for(let i=0;i<120;i++)world.step();
    battery.enabled=true;
    let explosions=0;
    for(let i=0;i<600;i++){world.step();explosions+=world.events.filter(e=>e.type==='explosion').length;}
    variants.push({shoot,explosions,broken:world.links.filter(l=>l.broken).length,positions:[...world.parts.values()].filter(p=>!p.fixed).map(p=>({id:p.id,x:p.body.position.x,y:p.body.position.y}))});
  }
  const displacement=variants[0].positions.reduce((sum,p)=>{const other=variants[1].positions.find(q=>q.id===p.id);return sum+Math.hypot(p.x-other.x,p.y-other.y);},0);
  comparisons.push({id:scene.id,powerOnly:variants[0].explosions,shotThenPower:variants[1].explosions,totalDisplacement:displacement});
}
const browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:1400,height:1000},recordVideo:{dir:'evidence/scenes/video',size:{width:1400,height:1000}}});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4191/foundry.html');
for(const scene of SCENES){
  await page.getByLabel('実験場').selectOption(scene.id);
  await page.waitForTimeout(500);
  await page.locator('#power').click();
  await page.waitForTimeout(2400);
  await page.screenshot({path:`evidence/scenes/${scene.id}.png`});
}
await page.getByLabel('実験場').selectOption('foundry');
await page.locator('#pause').click();
await page.getByLabel('制作ツール').selectOption('fuel');
const box=await page.locator('canvas').boundingBox();
await page.mouse.click(box.x+box.width*.3,box.y+box.height*.3);
const added=await page.locator('#stats').textContent();
await page.locator('#undo').click();await page.waitForTimeout(50);
const undone=await page.locator('#stats').textContent();
await context.close();await browser.close();
const result={comparisons,errors,added,undone};
await writeFile('evidence/scenes/results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
