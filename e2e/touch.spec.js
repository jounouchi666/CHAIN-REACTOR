import {test,expect} from '@playwright/test';
test.use({viewport:{width:375,height:900},hasTouch:true,isMobile:true});
test('two-finger zoom does not fire the cannon; a single tap does',async({page,context})=>{
  await page.goto('/index.html');await expect(page.locator('#stats')).toContainText('233 部品');
  const box=await page.locator('canvas').boundingBox(),cdp=await context.newCDPSession(page);
  const a={x:box.x+box.width*.35,y:box.y+box.height*.5,id:1},b={x:box.x+box.width*.65,y:a.y,id:2};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a,b]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...a,x:a.x-35},{...b,x:b.x+35}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect(page.locator('#stats')).not.toContainText('1.0x');await expect(page.locator('#stats')).toContainText('233 部品');
  await page.locator('#settings-toggle').click();await page.locator('#camera-reset').click();await page.keyboard.press('Escape');
  await page.touchscreen.tap(box.x+box.width*.5,box.y+box.height*.5);
  await expect(page.locator('#stats')).toContainText('234 部品');
});

test('compact tools choose a material; dismissing the chooser does not edit the world',async({page})=>{
  await page.goto('/index.html');await expect(page.locator('#stats')).toContainText('233 部品');
  await page.locator('#tool-picker').click();await expect(page.locator('#tool-options')).toBeVisible();
  await page.getByRole('button',{name:'燃料を置く',exact:true}).click();await expect(page.locator('#tool-options')).toBeHidden();await expect(page.locator('canvas')).toBeFocused();
  const box=await page.locator('canvas').boundingBox();await page.touchscreen.tap(box.x+box.width*.5,box.y+box.height*.4);await expect(page.locator('#stats')).toContainText('234 部品');
  await page.locator('#tool-picker').click();await page.touchscreen.tap(box.x+box.width-2,box.y+10);
  await expect(page.locator('#tool-options')).toBeHidden();await expect(page.locator('#stats')).toContainText('234 部品');
});
