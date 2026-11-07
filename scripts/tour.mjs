import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {SCENES} from '../src/catalogue.js';
await mkdir('evidence/tour',{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:'evidence/tour',size:{width:1440,height:1000}}}),page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.location().url.endsWith('/favicon.ico'))errors.push(m.text());});
await page.goto('http://127.0.0.1:4191/');const chapters=[];
const tick=async()=>Number((await page.locator('#stats').textContent()).match(/^T(\d+)/)[1]);
const until=async target=>{const deadline=performance.now()+25000;while(await tick()<target){if(performance.now()>deadline)throw new Error('Tour simulation stalled');await page.waitForTimeout(100);}};
for(const scene of SCENES){
  await page.getByRole('combobox',{name:'実験場',exact:true}).selectOption(scene.id);await page.waitForTimeout(150);
  const start=await tick();await page.locator('#power').click();await until(start+180);await page.screenshot({path:`evidence/tour/${scene.id}-reaction.png`});
  await until(start+(scene.id==='fuse'?1800:900));await page.screenshot({path:`evidence/tour/${scene.id}-result.png`});
  const stats=await page.locator('#stats').textContent();chapters.push({scene:scene.id,stats});console.log(scene.id,stats);
}
await page.getByRole('combobox',{name:'実験場',exact:true}).selectOption('foundry');await page.locator('#power').click();const start=await tick();await until(start+600);await page.locator('#rewind').click();
const box=await page.locator('canvas').boundingBox();await page.mouse.click(box.x+box.width*450/1400,box.y+box.height*440/800);await page.locator('#pause').click();const branch=await tick();await until(branch+180);await page.locator('#pause').click();await page.screenshot({path:'evidence/tour/branch-comparison.png'});
await writeFile('evidence/tour/results.json',JSON.stringify({chapters,errors},null,2));await context.close();await browser.close();if(errors.length)throw new Error(errors.join('\n'));
