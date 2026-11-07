import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
test('procedural foley renders bounded, distinct signals and honors mute',async({page},info)=>{
  await page.goto('/index.html');
  const result=await page.evaluate(async()=>{
    const {MachineSound}=await import('/src/sound.js');
    async function render(muted){
      const context=new OfflineAudioContext(1,48000*3,48000),sound=new MachineSound({context});sound.enabled=!muted;sound.master.gain.value=.35;
      sound.event({type:'explosion',tick:1,depth:3},.1);sound.event({type:'fracture',kind:'panel',tick:2},1.35);sound.event({type:'relay',tick:3},2);sound.event({type:'impact',material:'steel',speed:9,tick:4},2.5);
      const voices=sound.voices,buffer=await context.startRendering(),samples=buffer.getChannelData(0);
      let peak=0,power=0;for(const v of samples){peak=Math.max(peak,Math.abs(v));power+=v*v;}
      const crossings=(a,b)=>{let count=0;for(let i=Math.floor(a*48000)+1;i<Math.floor(b*48000);i++)if((samples[i]>=0)!==(samples[i-1]>=0))count++;return count;};
      return {samples:muted?[]:[...samples],peak,rms:Math.sqrt(power/samples.length),voices,glassCrossings:crossings(1.4,1.5),metalCrossings:crossings(2.55,2.65)};
    }
    const normal=await render(false),muted=await render(true);
    const stressContext=new OfflineAudioContext(1,48000,48000),stressSound=new MachineSound({context:stressContext});stressSound.enabled=true;stressSound.master.gain.value=.7;
    for(let i=0;i<64;i++)stressSound.event({type:'explosion',depth:i,tick:i},.05);
    const voices=stressSound.voices,stressBuffer=await stressContext.startRendering();let peak=0;for(const v of stressBuffer.getChannelData(0))peak=Math.max(peak,Math.abs(v));
    return {normal,muted,stress:{voices,peak}};
  });
  expect(result.normal.peak).toBeGreaterThan(.01);expect(result.normal.peak).toBeLessThan(.95);expect(result.normal.voices).toBeLessThanOrEqual(18);expect(result.muted.peak).toBe(0);
  expect(result.normal.glassCrossings).toBeGreaterThan(result.normal.metalCrossings*1.25);expect(result.stress.voices).toBe(18);expect(result.stress.peak).toBeLessThan(.95);
  const samples=result.normal.samples,buffer=Buffer.alloc(44+samples.length*2);
  buffer.write('RIFF',0);buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(48000,24);buffer.writeUInt32LE(96000,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(samples.length*2,40);samples.forEach((v,i)=>buffer.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*32767),44+i*2));
  await writeFile(info.outputPath('foley.wav'),buffer);delete result.normal.samples;await writeFile(info.outputPath('metrics.json'),JSON.stringify(result,null,2));
  await page.locator('#sound').click();await expect(page.locator('#sound')).toHaveAttribute('aria-pressed','true');await page.locator('#sound').click();await expect(page.locator('#sound')).toHaveAttribute('aria-pressed','false');
});
