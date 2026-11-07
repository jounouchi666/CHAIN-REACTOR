import {createScene} from '../src/scenes.js';
const {world}=createScene('foundry');for(let i=0;i<600;i++)world.step();const snapshot=world.snapshot(),results=[];
for(let aimY=340;aimY<=650;aimY+=5){
  world.restore(snapshot);world.launch(90,550,450,aimY,45);let first=null;
  for(let i=0;i<180;i++){world.step();const event=world.events.find(e=>e.type==='explosion');if(event&&!first)first={source:event.source,y:event.y,afterTicks:i};}
  if(first)results.push({aimY,...first});
}
console.log(JSON.stringify(results,null,2));
