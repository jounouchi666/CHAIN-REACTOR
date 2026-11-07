import {test,expect} from '@playwright/test';
test('guide pauses time, traps keyboard focus, and restores it on dismissal',async({page})=>{
  await page.goto('/index.html');await expect(page.locator('#stats')).toContainText('部品');
  await page.locator('#help').click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
  await expect(page.locator('#pause')).toHaveText('再開');
  for(let i=0;i<4;i++)await page.keyboard.press('Tab');
  expect(await page.evaluate(()=>document.querySelector('dialog').contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(page.locator('#help')).toBeFocused();await expect(page.locator('#pause')).toHaveText('停止');
  await page.locator('#motion').click();await expect(page.locator('#motion')).toHaveAttribute('aria-pressed','true');
  await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('#motion')).toBeDisabled();await expect(page.locator('#motion')).toHaveAttribute('aria-pressed','true');
  await page.emulateMedia({reducedMotion:'no-preference'});await expect(page.locator('#motion')).toBeEnabled();await page.locator('#motion').click();await expect(page.locator('#motion')).toHaveAttribute('aria-pressed','false');
});
