import {test,expect} from '@playwright/test';
test('an empty chamber can be built into a working electrical explosion circuit',async({page})=>{
  await page.goto('/index.html');await page.locator('#blank').click();
  await expect(page.locator('#stats')).toContainText('5 部品');await expect(page.locator('#pause')).toHaveText('再開');
  const box=await page.locator('canvas').boundingBox();
  const at=(x,y)=>page.mouse.click(box.x+box.width*x/1400,box.y+box.height*y/800);
  await page.getByRole('button',{name:'燃料を置く',exact:true}).click();await at(650,730);
  await expect(page.locator('#stats')).toContainText('6 部品');
  await page.getByRole('button',{name:'点火器を置く',exact:true}).click();await at(600,730);
  await expect(page.locator('#stats')).toContainText('7 部品');
  await page.getByRole('button',{name:'配線する',exact:true}).click();await at(200,730);await at(600,730);
  await page.locator('#power').click();await page.locator('#pause').click();
  await expect(page.locator('#stats')).toContainText('1 爆発',{timeout:8000});
  await page.locator('#reset').click();await expect(page.locator('#stats')).toContainText('5 部品');
  await expect(page.getByRole('combobox',{name:'実験場',exact:true})).toHaveValue('custom');
});
