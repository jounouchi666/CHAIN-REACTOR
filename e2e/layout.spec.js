import {test,expect} from '@playwright/test';
for(const width of [320,375,414,768,1440])test(`studio layout at ${width}px`,async({page},info)=>{
  await page.setViewportSize({width,height:1000});await page.goto('/index.html');
  await expect(page.locator('#stats')).toContainText('部品');
  const metrics=await page.evaluate(()=>({
    overflow:document.documentElement.scrollWidth>innerWidth,
    labels:[...document.querySelectorAll('button .button-label')].filter(e=>e.getClientRects().length).map(e=>({text:e.textContent,height:e.getBoundingClientRect().height,line:parseFloat(getComputedStyle(e).lineHeight)||20,width:e.getBoundingClientRect().width})),
    canvas:document.querySelector('canvas').getBoundingClientRect().toJSON(),
  }));
  expect(metrics.overflow).toBe(false);expect(metrics.canvas.width/metrics.canvas.height).toBeCloseTo(1.75,1);
  for(const label of metrics.labels)expect(label.height,`${label.text} wraps`).toBeLessThanOrEqual(label.line+2);
  await page.locator('#log-toggle').click();await expect(page.locator('#inspector')).toBeVisible();
  await page.locator('.close-log').focus();await page.keyboard.press('Escape');await expect(page.locator('#inspector')).toBeHidden();await expect(page.locator('#log-toggle')).toBeFocused();
  await page.screenshot({path:info.outputPath(`studio-${width}.png`),fullPage:true});
});

test('text, control boundaries and focus palette meet contrast thresholds',async({page},info)=>{
  await page.goto('/index.html');
  const contrasts=await page.evaluate(()=>{
    const css=getComputedStyle(document.documentElement),canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');
    const color=name=>{ctx.fillStyle=css.getPropertyValue(name).trim();ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);};
    const ratio=(a,b)=>{const x=color(a),y=color(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
    return {text:ratio('--color-ink','--color-paper-3'),muted:ratio('--color-muted','--color-paper-3'),boundary:ratio('--color-rule','--color-paper-3'),focus:ratio('--color-focus','--color-paper-3'),accent:ratio('--color-accent','--color-paper-3')};
  });
  for(const key of ['text','muted','accent'])expect(contrasts[key],key).toBeGreaterThanOrEqual(4.5);
  for(const key of ['boundary','focus'])expect(contrasts[key],key).toBeGreaterThanOrEqual(3);
  await info.attach('contrast.json',{body:JSON.stringify(contrasts,null,2),contentType:'application/json'});
});
