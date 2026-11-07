import {test,expect} from '@playwright/test';
test('a stepped pulse is cut before the levitated core reaches the ignition relay',async({page},info)=>{
  test.setTimeout(30000);await page.goto('/index.html');await page.getByRole('combobox',{name:'実験場',exact:true}).selectOption('core');
  const tick=()=>page.locator('#stats').textContent().then(s=>Number(s.match(/^T(\d+)/)[1]));
  await expect.poll(tick,{timeout:10000}).toBeGreaterThan(600);await page.locator('#pause').click();await expect(page.locator('#pause')).toHaveText('再開');
  await page.locator('#power').click();for(let i=0;i<25;i++)await page.locator('#step').click();await page.locator('#power').click();
  const before=await tick();await page.locator('#pause').click();await expect.poll(tick,{timeout:12000}).toBeGreaterThan(before+900);
  await expect(page.locator('#stats')).toContainText('0 爆発');await page.screenshot({path:info.outputPath('pulse-survived.png')});
});
