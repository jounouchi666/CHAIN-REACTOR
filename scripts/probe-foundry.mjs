import {createChamber} from '../src/scenes.js';
import {exportBlueprint} from '../src/blueprint.js';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('evidence',{recursive:true});
for(const height of [27,32,38]){
  const build=()=>{
    const {world,battery}=createChamber();let target;
    for(let tower=0;tower<6;tower++){
      let previous=[];
      for(let row=0;row<18;row++){
        const current=[];
        for(let col=0;col<2;col++){
          const p=world.add({x:420+tower*150+col*44,y:774.5-height/2-row*(height+2),width:42,height,material:row%6===0?'fuel':'steel'});if(tower===0&&row===6&&col===0)target=p;
          if(previous[col])world.connect(previous[col],p,{strength:8});current.push(p);
        }
        world.connect(current[0],current[1],{strength:10});previous=current;
      }
    }
    for(let i=0;i<5;i++)world.add({x:518+i*150,y:752,width:38,height:45,material:'fuel'});
    const igniter=world.add({x:400,y:730,width:24,height:35,fixed:true});igniter.device='igniter';world.wire(battery,igniter,1500);
    return {world,battery,target};
  };
  const result=[];
  if(height===32)await writeFile('evidence/foundry-frame-32.json',JSON.stringify(exportBlueprint(build().world)));
  for(const shoot of [false,true]){
    const {world,battery,target}=build();let idle=0;
    for(let i=0;i<600;i++){world.step();idle+=world.events.filter(e=>e.type==='explosion').length;}
    const maxAngle=Math.max(...[...world.parts.values()].filter(p=>p.width===42).map(p=>Math.abs(p.body.angle))),idleBroken=world.links.filter(l=>l.broken).length,events=[];
    const step=()=>{world.step();events.push(...world.events.filter(e=>e.type==='explosion'));};
    if(shoot){world.launch(90,550,target.body.position.x,target.body.position.y-10,45);for(let i=0;i<360;i++)step();}
    battery.enabled=true;for(let i=0;i<2400;i++)step();
    result.push({shoot,idle,idleBroken,maxAngle,explosions:events.length,firstY:events[0]?.y,firstTick:events[0]?.tick,lastTick:events.at(-1)?.tick});
  }
  console.log(JSON.stringify({height,result}));
}
