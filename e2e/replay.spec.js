import {test,expect} from '@playwright/test';
test('recording seeks and steps without mutating the live experiment',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/index.html');await page.locator('#power').click();
  const tick=()=>page.locator('#stats').textContent().then(s=>Number(s.match(/^T(\d+)/)[1]));
  await expect.poll(tick).toBeGreaterThan(180);
  await page.locator('#pause').click();
  // Let the frame displaying the paused state settle before taking the reference tick.
  await expect(page.locator('#pause')).toHaveText('再開');
  await page.waitForTimeout(50);const live=await tick();
  await page.locator('#replay').click();
  await expect(page.locator('#stats')).toContainText('記録再生');
  await expect(page.locator('#power')).toBeDisabled();
  const slider=page.getByRole('slider',{name:'記録の再生位置'});await slider.focus();await slider.press('Home');
  await expect.poll(tick).toBe(0);
  await page.locator('#step').click();await expect.poll(tick).toBe(1);
  await page.locator('#replay').click();await expect.poll(tick).toBe(live);
  await expect(page.locator('#power')).toBeEnabled();
  await page.locator('#step').click();await expect.poll(tick).toBe(live+1);
  expect(errors).toEqual([]);
});

test('rewind exposes the previous measured future beside an altered experiment',async({page},info)=>{
  await page.goto('/index.html');await page.locator('#power').click();
  const tick=()=>page.locator('#stats').textContent().then(s=>Number(s.match(/^T(\d+)/)[1]));
  await expect.poll(tick,{timeout:10000}).toBeGreaterThan(480);
  await page.locator('#rewind').click();await expect(page.locator('#pause')).toHaveText('再開');
  await expect(page.locator('#ghost')).toBeEnabled();await expect(page.locator('#ghost')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#branch-note')).toContainText('前回の動き');
  const before=await tick(),box=await page.locator('canvas').boundingBox();
  await page.mouse.click(box.x+box.width*420/1400,box.y+box.height*400/800);
  await page.locator('#pause').click();await expect.poll(tick,{timeout:8000}).toBeGreaterThan(before+120);
  await page.locator('#pause').click();await page.screenshot({path:info.outputPath('two-futures.png')});
  await page.locator('#ghost').click();await expect(page.locator('#ghost')).toHaveAttribute('aria-pressed','false');
});
