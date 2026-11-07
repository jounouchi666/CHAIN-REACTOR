import {MachineSound} from '../src/sound.js';
export async function checkCues(){
  const results={};
  for(const name of ['ready','place','wire','undo','powerOn','powerOff','rewind','pause','play','water']){
    const context=new OfflineAudioContext(1,48000,48000),sound=new MachineSound({context});sound.enabled=true;sound.master.gain.value=.35;sound.cue(name,.05);
    const voices=sound.voices,buffer=await context.startRendering();let peak=0,power=0,crossings=0,last=0;
    for(const v of buffer.getChannelData(0)){peak=Math.max(peak,Math.abs(v));power+=v*v;if((v>=0)!==(last>=0))crossings++;last=v;}
    if(voices===0||peak<.001||peak>=.95)throw Error(`Invalid cue ${name}: ${voices} voices, peak ${peak}`);
    results[name]={voices,peak,rms:Math.sqrt(power/buffer.length),crossings};
  }
  const muted=new MachineSound({context:new OfflineAudioContext(1,48000,48000)});muted.cue('ready');if(muted.voices!==0)throw Error('Muted cue created a voice');
  return results;
}
