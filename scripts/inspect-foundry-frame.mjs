import {chromium} from '@playwright/test';
const browser=await chromium.launch();const context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:'evidence/frame-probe-video'}}),page=await context.newPage();
await page.goto('http://127.0.0.1:4191/index.html');await page.locator('input[type=file]').setInputFiles('evidence/foundry-frame-32.json');await page.getByRole('status').filter({hasText:'読込済み'}).waitFor();
await page.locator('#pause').click();
const until=async tick=>{while(Number((await page.locator('#stats').textContent()).match(/^T(\d+)/)[1])<tick)await page.waitForTimeout(100);};
await until(600);await page.screenshot({path:'evidence/frame-probe-before.png'});await page.locator('#power').click();await until(780);await page.screenshot({path:'evidence/frame-probe-during.png'});await until(1200);await page.screenshot({path:'evidence/frame-probe-after.png'});
console.log(await page.locator('#stats').textContent());await context.close();await browser.close();
