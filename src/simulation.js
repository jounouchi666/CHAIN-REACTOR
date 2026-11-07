import {createScene,createChamber,SCENES} from './scenes.js';
import {STEP_MS} from './rigid-world.js';
import {Editor} from './editor.js';
import {Tape} from './tape.js';
import {exportBlueprint,importBlueprint} from './blueprint.js';
const TOOLS=new Set(['fire','move','delete','joint','wire','steel','fuel','glass','magnet','gravity','igniter','relay','water']);
function point(input){
  const {x,y}=input||{};
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>1400||y< -480||y>800)throw new Error('実験槽の内側を選んでください');
  return {x,y};
}

/** Sole owner of mutable simulation state. Both worker and unit tests use this
 * exact command boundary; the display thread receives render data, never bodies.
 */
export class Simulation {
  constructor(scene='foundry'){this.revision=0;this.speed=1;this.suspended=false;this.reset(scene);}
  reset(scene){
    if(!SCENES.some(s=>s.id===scene))throw new Error('実験場がありません');
    this.scene=scene;Object.assign(this,createScene(scene));this.editor=new Editor(this.world);
    this.originBlueprint=null;this.designName=null;
    this.ghost=null;this.ghostEnabled=true;this.ghostCutoff=0;this.forkTick=0;
    this.tape=new Tape();this.tape.capture(this.world);this.history=[];this.scars=[];this.events=[];
    this.replay=null;this.connectionStart=null;this.dragging=null;this.playing=true;this.acc=0;this.revision++;
  }
  advance(){
    const interval=this.world.parts.size>180||this.world.coolant?120:30;
    if(this.world.tick%interval===0){
      this.history.push({tick:this.world.tick,snapshot:this.world.snapshot(),scars:structuredClone(this.scars)});
      const limit=interval===120?12:40;while(this.history.length>limit)this.history.shift();
    }
    this.world.step();this.tape.capture(this.world);
    if(this.ghost&&this.world.tick>this.ghost.end)this.ghost=null;
    this.events.push(...this.world.events);
    for(const e of this.world.events)if(e.type==='explosion')this.scars.push(e);
    if(this.scars.length>512)this.scars.splice(0,this.scars.length-512);
    if(this.connectionStart&&!this.world.parts.has(this.connectionStart))this.connectionStart=null;
  }
  update(elapsed){
    if(!Number.isFinite(elapsed)||elapsed<0)throw new Error('Invalid elapsed time');
    if(this.suspended)return;
    if(this.replay){
      if(this.replay.playing){
        const old=this.replay.tick;this.replay.tick=Math.min(this.tape.end,old+Math.min(elapsed,100)*.12*this.speed);
        for(const e of this.tape.sample(this.replay.tick).events)if(e.tick>old)this.events.push(e);
        if(this.replay.tick===this.tape.end)this.replay.playing=false;
      }return;
    }
    if(!this.playing){this.acc=0;return;}
    this.acc=Math.min(120,this.acc+Math.min(elapsed,40)*this.speed);
    let budget=8;while(this.acc>=STEP_MS&&budget-->0){this.advance();this.acc-=STEP_MS;}
  }
  execute(command){
    if(!command||typeof command.type!=='string')throw new Error('Invalid command');
    const {type}=command;
    if(type==='scene'){this.reset(command.id);return;}
    if(type==='reset'){
      if(this.originBlueprint){this.loadBlueprint(this.originBlueprint,this.designName);this.playing=true;this.battery.enabled=false;}
      else this.reset(this.scene);return;
    }
    if(type==='blank'){this.loadBlueprint(exportBlueprint(createChamber().world),'自由制作');return;}
    if(type==='suspend'){this.suspended=Boolean(command.value);this.acc=0;return;}
    if(type==='pause'){if(this.replay)this.replay.playing=!this.replay.playing;else this.playing=!this.playing;return;}
    if(type==='speed'){this.speed=this.speed===1?.25:1;return;}
    if(type==='ghost'){if(this.ghost)this.ghostEnabled=!this.ghostEnabled;return;}
    if(type==='step'){
      if(this.replay){this.replay.playing=false;this.replay.tick=Math.min(this.tape.end,this.replay.tick+1);}
      else{this.playing=false;this.advance();}return;
    }
    if(type==='replay'){
      if(this.replay)this.replay=null;
      else if(this.tape.frames.length>1)this.replay={tick:this.tape.start,playing:true};
      this.events=[];this.acc=0;return;
    }
    if(type==='seek'){
      if(!Number.isFinite(command.tick)||this.tape.frames.length<2)throw new Error('再生できる記録がありません');
      this.replay={tick:Math.max(this.tape.start,Math.min(this.tape.end,command.tick)),playing:false};this.events=[];this.revision++;return;
    }
    if(type==='rewind'){
      if(this.replay){this.replay.tick=Math.max(this.tape.start,this.replay.tick-360);this.events=[];this.revision++;return;}
      const target=[...this.history].reverse().find(h=>h.tick<=this.world.tick-360)||this.history[0];if(!target)return;
      const previousTape=this.tape;
      if(!this.ghost||this.tape.end>this.forkTick)this.ghost=previousTape;
      this.ghostEnabled=true;this.tape=new Tape();this.tape.frames=previousTape.frames.filter(f=>f.tick<=target.tick);this.forkTick=target.tick;
      this.world.restore(target.snapshot);this.battery=[...this.world.parts.values()].find(p=>p.device==='battery');
      this.ghostCutoff=this.world.nextId;
      this.editor=new Editor(this.world);this.connectionStart=null;this.dragging=null;this.scars=structuredClone(target.scars);
      this.history=this.history.filter(h=>h.tick<=target.tick);this.tape.truncate(target.tick);this.events=[];this.acc=0;this.playing=false;this.revision++;return;
    }
    if(type==='export')return exportBlueprint(this.world);
    if(type==='import'){
      this.loadBlueprint(command.blueprint);return;
    }
    if(type==='release'){this.dragging=null;return;}
    if(type==='clear-selection'){this.dragging=null;this.connectionStart=null;return;}
    if(this.replay)throw new Error('記録再生中です。「実験に戻る」で操作を再開できます');
    if(type==='power'){this.battery.enabled=!this.battery.enabled;return;}
    if(type==='drag'){const p=point(command);if(this.dragging)this.editor.move(this.dragging,p.x,p.y);return;}
    if(type==='undo'){
      if(this.editor.undo()){
        this.battery=[...this.world.parts.values()].find(p=>p.device==='battery');this.history=[];this.scars=[];this.events=[];
        this.tape.clear();this.tape.capture(this.world);this.dragging=null;this.connectionStart=null;this.revision++;
      }return;
    }
    if(type==='rotate'||type==='anchor'){
      const {x,y}=point(command),p=this.editor.pick(x,y);if(!p)return {notice:'先に実験槽で部品を狙ってください'};
      if(p.locked||p===this.battery)throw new Error('外枠と電源は保護されています');
      if(type==='rotate'&&(!Number.isFinite(command.delta)||Math.abs(command.delta)>Math.PI/2))throw new Error('回転角が範囲外です');
      this.editor.checkpoint();this.playing=false;
      if(type==='rotate'){this.editor.rotate(p.id,command.delta);return {notice:'15度回転・停止中'};}
      const fixed=this.editor.anchor(p.id);return {notice:fixed?'部品を固定・停止中':'部品の固定を解除・停止中'};
    }
    if(type!=='tool'||!TOOLS.has(command.kind))throw new Error('操作がありません');
    const {x,y}=point(command),kind=command.kind;
    if(kind==='fire'){
      if(this.world.parts.size>=800)throw new Error('部品上限800です。削除か再実験で空きを作れます');
      this.world.launch(90,550,x,y,45);this.events.push({type:'shot',x:90,y:550,tick:this.world.tick});return;
    }
    if(kind==='move'||kind==='delete'){
      if(kind==='move'&&this.dragging){this.dragging=null;return;}
      const p=this.editor.pick(x,y);if(!p)return;if(p.locked||p===this.battery)throw new Error('外枠と電源は保護されています');
      this.editor.checkpoint();
      if(kind==='delete'){this.editor.remove(p.id);if(this.connectionStart===p.id)this.connectionStart=null;}
      else{this.dragging=p.id;this.playing=false;}return;
    }
    if(kind==='water'){
      this.editor.checkpoint();const fluid=this.world.enableCoolant();fluid.rasterize(this.world.parts.values());fluid.seed(x-24,y-24,48,48);return;
    }
    if(kind==='wire'||kind==='joint'){
      const near=[...this.world.parts.values()].sort((a,b)=>Math.hypot(a.body.position.x-x,a.body.position.y-y)-Math.hypot(b.body.position.x-x,b.body.position.y-y))[0];
      if(!near||Math.hypot(near.body.position.x-x,near.body.position.y-y)>65)return;
      const first=this.world.parts.get(this.connectionStart);
      if(first&&first!==near){
        if((kind==='wire'?this.world.wires:this.world.links).length>=1200)throw new Error('接続の上限1200です');
        this.editor.checkpoint();if(kind==='wire')this.world.wire(first,near,Math.min(5000,Math.max(80,Math.hypot(first.body.position.x-near.body.position.x,first.body.position.y-near.body.position.y)*1.15+20)));else this.world.connect(first,near);this.connectionStart=null;
      }else this.connectionStart=near.id;return;
    }
    if(this.world.parts.size>=600)throw new Error('制作上限600です。削除して空きを作れます');
    this.editor.checkpoint();const device=['magnet','gravity','igniter','relay'].includes(kind);
    const p=this.world.add({x,y,width:kind==='glass'?160:kind==='gravity'?80:48,height:kind==='glass'?14:kind==='gravity'?60:40,material:['fuel','glass'].includes(kind)?kind:'steel',fixed:device||kind==='glass'});
    if(device)p.device=kind;
  }
  loadBlueprint(blueprint,name='読込んだ設計図'){
    const restored=importBlueprint(blueprint),battery=[...restored.parts.values()].find(p=>p.device==='battery');
    if(!battery)throw new Error('設計図に電池が必要です');
    const origin=exportBlueprint(restored);
    this.world=restored;this.battery=battery;this.originBlueprint=origin;this.designName=name;this.editor=new Editor(restored);this.history=[];this.scars=[];this.events=[];
    this.ghost=null;this.ghostEnabled=true;
    this.tape.clear();this.tape.capture(restored);this.replay=null;this.playing=false;this.acc=0;this.connectionStart=null;this.dragging=null;this.revision++;
  }
  view(){
    const display=this.replay?this.tape.sample(this.replay.tick):this.world;
    const scars=this.replay?display.events.filter(e=>e.type==='explosion'):this.scars;
    const ghostFrame=this.ghost&&this.ghostEnabled&&!this.replay&&this.world.tick>=this.ghost.start&&this.world.tick<=this.ghost.end?this.ghost.sample(this.world.tick):null;
    const differences=[],survivors=[];
    if(ghostFrame)for(const p of ghostFrame.parts.values()){
      const current=this.world.parts.get(p.id);if(!current||p.id>=this.ghostCutoff||p.width!==current.width||p.height!==current.height||p.material!==current.material)continue;
      const a=current.body.position,b=p.body.position,distance=Math.hypot(a.x-b.x,a.y-b.y);
      if(distance>35)differences.push({a:{...a},b:{...b},distance});
      if(p.material==='fuel'&&p.spent&&!current.spent)survivors.push(p.id);
    }
    differences.sort((a,b)=>b.distance-a.distance);
    const pose=p=>({id:p.id,width:p.width,height:p.height,radius:p.radius,fixed:p.fixed,material:p.material,heat:p.heat,burning:p.burning,spent:p.spent,powered:p.powered,device:p.device,latched:p.latched,body:{position:{...p.body.position},angle:p.body.angle}});
    return {revision:this.revision,scene:this.scene,custom:Boolean(this.originBlueprint),designName:this.designName,replaying:Boolean(this.replay),playing:this.replay?this.replay.playing:this.playing,speed:this.speed,
      ghost:{available:Boolean(this.ghost),enabled:this.ghostEnabled,start:this.ghost?.start||0,end:this.ghost?.end||0,frame:ghostFrame?{tick:ghostFrame.tick,parts:[...ghostFrame.parts.values()].map(pose),survivors,differences:this.playing?[]:differences.slice(0,12),explosions:ghostFrame.events.filter(e=>e.type==='explosion'&&ghostFrame.tick-e.tick<60)}:null},
      batteryEnabled:this.battery.enabled,selected:this.dragging||this.connectionStart,dragging:this.dragging,
      tape:{start:this.tape.start,end:this.tape.end,frames:this.tape.frames.length},canUndo:this.editor.undoStack.length>0,
      world:{tick:display.tick,parts:[...display.parts.values()].map(pose),
        wires:display.wires.map(w=>({...w})),links:display.links.map(l=>({a:l.a,b:l.b,broken:l.broken})),
        coolant:display.coolant?{width:display.coolant.width,height:display.coolant.height,cell:display.coolant.cell,cells:display.coolant.cells.slice()}:null},
      explosionCount:this.replay?display.explosionCount:this.tape.explosionCount,
      scars:scars.slice(),events:this.events.splice(0),log:scars.slice(-8)};
  }
}
