import {createScene} from '../src/scenes.js';
for(const offAt of [null,30,120]){
  const {world,battery}=createScene('core');
  for(let i=0;i<600;i++)world.step();battery.enabled=true;
  let explosions=0,first=null,minMeanY=1000;
  for(let i=0;i<2400;i++){
    if(offAt!==null&&i===offAt)battery.enabled=false;
    world.step();const es=world.events.filter(e=>e.type==='explosion');explosions+=es.length;if(es.length&&first===null)first=i;
    const mean=[...world.parts.values()].filter(p=>!p.fixed).reduce((s,p)=>s+p.body.position.y,0)/234;minMeanY=Math.min(minMeanY,mean);
  }
  const meanY=[...world.parts.values()].filter(p=>!p.fixed).reduce((s,p)=>s+p.body.position.y,0)/234;
  console.log(JSON.stringify({offAt,explosions,first,minMeanY,meanY}));
}
