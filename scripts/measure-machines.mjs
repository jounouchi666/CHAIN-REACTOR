import {createScene,SCENES} from '../src/scenes.js';
for(const scene of SCENES){
  const {world,battery}=createScene(scene.id);
  let idle=0,explosions=0,relays=0,maxDepth=0;
  for(let i=0;i<600;i++){world.step();idle+=world.events.filter(e=>e.type==='explosion').length;}
  battery.enabled=true;
  const started=performance.now();
  let first=null,last=null;
  for(let i=0;i<2400;i++){
    world.step();
    for(const e of world.events){
      if(e.type==='relay')relays++;
      if(e.type==='explosion'){explosions++;first??=i;last=i;maxDepth=Math.max(maxDepth,e.depth);}
    }
  }
  console.log(JSON.stringify({scene:scene.id,parts:world.parts.size,idle,explosions,relays,maxDepth,first,last,ms:Math.round(performance.now()-started),outside:[...world.parts.values()].filter(p=>!p.fixed&&(p.body.position.x<0||p.body.position.x>1400||p.body.position.y>800)).length}));
}
