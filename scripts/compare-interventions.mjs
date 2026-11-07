import {mkdir,writeFile} from 'node:fs/promises';
import {createScene,SCENES} from '../src/scenes.js';
import {Editor} from '../src/editor.js';
const experiments={
  foundry:{action:'塔群へ斜めに一発 → 3秒後に通電',apply:w=>{w.launch(90,550,450,440,45);return 360;}},
  bridge:{action:'槽の底へ一発 → 7.5秒排水 → 通電',apply:w=>{w.launch(90,550,990,320,45);return 900;}},
  fuse:{action:'下段中央の爆薬1個を削除 → 通電',apply:w=>{const p=[...w.parts.values()].find(p=>p.material==='fuel'&&p.body.position.x===800&&p.body.position.y===740);new Editor(w).remove(p.id);return 0;}},
  magnet:{action:'衝撃リレーを外す → 通電（鋼球は通常通り上昇）',apply:w=>{new Editor(w).remove([...w.parts.values()].find(p=>p.device==='relay').id);return 0;}},
  rain:{action:'2段目のリレーを外す → 通電',apply:w=>{new Editor(w).remove([...w.parts.values()].find(p=>p.device==='relay').id);return 0;}},
  core:{action:'0.25秒だけ通電 → 接点到達前に切る',apply:()=>0,offAt:30},
};
const results=[];
for(const scene of SCENES){
  const run=intervene=>{
    const {world,battery}=createScene(scene.id);for(let i=0;i<600;i++)world.step();
    const start=world.tick,events=[];const collect=()=>{world.step();for(const e of world.events)if(e.type==='explosion'||e.type==='relay')events.push(e);};
    if(intervene)for(let i=0,delay=experiments[scene.id].apply(world);i<delay;i++)collect();
    battery.enabled=true;for(let i=0;i<2400;i++){if(intervene&&experiments[scene.id].offAt===i)battery.enabled=false;collect();}
    const explosions=events.filter(e=>e.type==='explosion');
    return {explosions:explosions.length,relays:events.filter(e=>e.type==='relay').length,maxDepth:Math.max(0,...explosions.map(e=>e.depth)),firstAt:explosions.length?{x:explosions[0].x,y:explosions[0].y}:null,firstSeconds:explosions.length?(explosions[0].tick-start)/120:null,lastSeconds:explosions.length?(explosions.at(-1).tick-start)/120:null,remainingFuel:[...world.parts.values()].filter(p=>p.material==='fuel'&&!p.spent).length};
  };
  const result={id:scene.id,action:experiments[scene.id].action,baseline:run(false),intervention:run(true)};results.push(result);console.log(JSON.stringify(result));
}
await mkdir('evidence',{recursive:true});await writeFile('evidence/interventions.json',JSON.stringify(results,null,2));
