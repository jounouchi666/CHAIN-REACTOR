import {test,expect} from '@playwright/test';
test('a real aimed shot releases coolant; later power leaves most floor charges alive',async({page},info)=>{
  test.setTimeout(60000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/index.html');await page.getByRole('combobox',{name:'実験場',exact:true}).selectOption('bridge');
  const stats=page.locator('#stats');const tick=()=>stats.textContent().then(s=>Number(s.match(/^T(\d+)/)[1]));
  await expect.poll(tick,{timeout:10000}).toBeGreaterThan(600);
  await expect(stats).toContainText('0 爆発');await page.screenshot({path:info.outputPath('sealed.png')});
  const box=await page.locator('canvas').boundingBox();
  await page.mouse.click(box.x+box.width*990/1400,box.y+box.height*320/800);
  await expect(stats).toContainText('47 部品');
  const shot=await tick();await expect.poll(tick,{timeout:12000}).toBeGreaterThan(shot+900);
  await expect(stats).toContainText('0 爆発');await page.screenshot({path:info.outputPath('released.png')});
  await page.locator('#power').click();const powered=await tick();
  await expect.poll(tick,{timeout:18000}).toBeGreaterThan(powered+1600);
  const count=Number((await stats.textContent()).match(/\/ (\d+) 爆発/)[1]);
  expect(count).toBeGreaterThan(0);expect(count).toBeLessThan(8);
  await page.screenshot({path:info.outputPath('cooled.png')});expect(errors).toEqual([]);
});
