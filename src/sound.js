/** Bounded procedural foley. No samples, network, autoplay, or unbounded nodes. */
export class MachineSound {
  constructor({context=null}={}){this.context=null;this.master=null;this.enabled=false;this.volume=.35;this.voices=0;this.lastImpact=-1;this.active=new Set();if(context)this.setup(context);}
  setup(context){
    this.context=context;this.master=context.createGain();this.master.gain.value=0;
    const limiter=context.createDynamicsCompressor();limiter.threshold.value=-20;limiter.knee.value=18;limiter.ratio.value=12;limiter.attack.value=.002;limiter.release.value=.18;
    this.master.connect(limiter);limiter.connect(context.destination);
    this.noise=context.createBuffer(1,Math.ceil(context.sampleRate*2),context.sampleRate);
    const data=this.noise.getChannelData(0);let seed=31817,low=0;
    for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const white=seed/2147483648-1;low=(low+white*.06)/1.06;data[i]=white*.45+low*2;}
  }
  async enable(){if(!this.context)this.setup(new AudioContext());await this.context.resume();this.enabled=true;this.master.gain.setTargetAtTime(this.volume,this.context.currentTime,.04);}
  mute(){this.enabled=false;if(this.context)this.master.gain.setTargetAtTime(0,this.context.currentTime,.025);}
  setVolume(value){this.volume=Math.max(0,Math.min(.7,Number(value)||0));if(this.enabled)this.master.gain.setTargetAtTime(this.volume,this.context.currentTime,.04);}
  envelope(node,now,duration,peak){
    const gain=this.context.createGain();gain.gain.setValueAtTime(.00001,now);gain.gain.exponentialRampToValueAtTime(peak,now+.003);gain.gain.exponentialRampToValueAtTime(.00001,now+duration);
    node.connect(gain);gain.connect(this.master);return gain;
  }
  finish(source,nodes,now,duration){this.voices++;this.active.add(source);source.onended=()=>{this.voices--;this.active.delete(source);source.disconnect();for(const node of nodes)node.disconnect();};source.start(now);source.stop(now+duration+.01);}
  clear(){if(!this.context)return;for(const source of this.active)try{source.stop(this.context.currentTime+.005);}catch{}this.lastImpact=-1;}
  cue(name,when=this.context?.currentTime){
    if(!this.enabled||!this.context||this.voices>=14)return;
    const now=Math.max(this.context.currentTime,when||0);
    const notes={ready:[440,880,.12,.1],place:[680,350,.055,.08],wire:[640,960,.09,.09],undo:[560,280,.09,.08],powerOn:[80,420,.28,.13],powerOff:[310,65,.2,.12],rewind:[1100,120,.32,.1],pause:[380,330,.06,.07],play:[330,480,.07,.07],water:[900,230,.14,.06]};
    const note=notes[name];if(!note)return;this.tone(now,...note);
    if(name==='powerOn'||name==='powerOff')this.burst(now,.13,.08,1300,220);
    if(name==='water')this.burst(now,.23,.11,2100,500,true);
    if(name==='rewind')this.burst(now,.25,.055,1500,200);
    if(name==='ready'||name==='wire')this.tone(now+.06,note[1],note[1],.08,.06);
  }
  tone(now,start,end,duration,peak=.1){
    if(this.voices>=18)return;
    const o=this.context.createOscillator();o.type='sine';o.frequency.setValueAtTime(start,now);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),now+duration);
    const gain=this.envelope(o,now,duration,peak);this.finish(o,[gain],now,duration);
  }
  burst(now,duration,peak,cutoff,end=cutoff,highpass=false){
    if(this.voices>=18)return;
    const source=this.context.createBufferSource(),filter=this.context.createBiquadFilter();source.buffer=this.noise;
    filter.type=highpass?'highpass':'lowpass';filter.frequency.setValueAtTime(cutoff,now);filter.frequency.exponentialRampToValueAtTime(Math.max(30,end),now+duration);filter.Q.value=.5;
    source.connect(filter);const gain=this.envelope(filter,now,duration,peak);this.finish(source,[gain,filter],now,duration);
  }
  event(event,when=this.context?.currentTime){
    if(!this.enabled||!this.context||this.voices>=18)return;const now=Math.max(this.context.currentTime,when||0);
    if(event.type==='impact'){
      if(event.tick===this.lastImpact||event.speed<2||this.voices>=10)return;this.lastImpact=event.tick;
      const glass=event.material==='glass',fuel=event.material==='fuel';
      const f=glass?1800:fuel?140:250+Math.min(900,(event.speed||3)*24),peak=Math.min(.18,.04+(event.speed||3)*.006);
      this.tone(now,f,f*.94,glass?.22:fuel?.07:.19,peak);if(!fuel)this.tone(now,f*2.71,f*2.68,.09,peak*.24);
    }else if(event.type==='explosion'){
      this.burst(now,1.1,.55,1600,70);this.tone(now,105+Math.min(10,event.depth||0)*5,26,.85,.45);
    }else if(event.type==='fracture'){
      if(this.voices>=14)return;
      if(event.kind==='panel'){for(const [f,d] of [[1450,.3],[2130,.22],[3270,.13]])this.tone(now,f,f*.96,d,.075);this.burst(now,.08,.12,2800,1200,true);}
      else{this.burst(now,.12,.2,1900,300);this.tone(now,410,270,.13,.09);}
    }else if(event.type==='relay'){
      if(this.voices<14){this.burst(now,.025,.18,2600,1200,true);this.tone(now,940,900,.06,.09);}
    }else if(event.type==='shot'){this.burst(now,.1,.3,2200,400);this.tone(now,170,45,.12,.22);}
  }
}
