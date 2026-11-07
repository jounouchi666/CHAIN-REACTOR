import {createScene} from '../src/scenes.js';
for(const {aimY,dry} of [...[null,260,280,300,320,340].map(aimY=>({aimY,dry:false})),{aimY:320,dry:true}]){
  const {world,battery}=createScene('bridge');
  if(dry)world.coolant=null;
  for(let i=0;i<600;i++)world.step();
  if(aimY!==null)world.launch(90,550,990,aimY,45);
  let beforePower=0;
  for(let i=0;i<900;i++){world.step();beforePower+=world.events.filter(e=>e.type==='explosion').length;}
  const panelBroken=![...world.parts.values()].some(p=>p.material==='glass'&&!p.fragment);
  const escaped=world.coolant?.cells.slice(100*world.coolant.width).filter(Boolean).length||0;
  battery.enabled=true;let explosions=0;
  for(let i=0;i<1800;i++){world.step();explosions+=world.events.filter(e=>e.type==='explosion').length;}
  console.log(JSON.stringify({aimY,dry,panelBroken,escaped,beforePower,explosions,total:beforePower+explosions,waterMass:world.coolant?.mass()||0}));
}
