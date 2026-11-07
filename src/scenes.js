import { RigidWorld } from './rigid-world.js';
export {SCENES} from './catalogue.js';

export function createChamber() {
  const world = new RigidWorld();
  world.add({ x: 700, y: 800, width: 1500, height: 50, fixed: true });
  // The chamber contains energetic debris; a high ceiling leaves room for ballistic arcs.
  world.add({x:-30,y:150,width:60,height:1300,fixed:true});
  world.add({x:1430,y:150,width:60,height:1300,fixed:true});
  world.add({x:700,y:-500,width:1500,height:60,fixed:true});
  const battery = world.add({ x: 200, y: 730, width: 70, height: 80, fixed: true });
  Object.assign(battery, { device: 'battery', enabled: false });
  for(const p of world.parts.values())p.locked=true;
  return {world,battery};
}
export function createScene(id) {
  const {world,battery}=createChamber();
  const device = (type, x, y, source=battery) => {
    const part = world.add({ x, y, width: type === 'gravity'?80:type === 'magnet' ? 100 : 24, height:type==='gravity'?60:35, fixed: true });
    part.device = type; world.wire(source, part, 1500); return part;
  };
  if (id === 'foundry') {
    for(let tower=0;tower<6;tower++)for(let row=0;row<18;row++)for(let col=0;col<2;col++)
      world.add({x:420+tower*150+col*44,y:761-row*29,width:42,height:27,material:row%6===0?'fuel':'steel'});
    device('igniter',400,730);
    for(let i=0;i<11;i++) world.add({x:440+i*80,y:750,width:38,height:45,material:'fuel'});
  } else if(id === 'bridge') {
    let previous = world.add({x:400,y:350,width:30,height:30,fixed:true});
    for(let i=0;i<14;i++) {
      const part=world.add({x:440+i*52,y:350,width:48,height:20});
      world.connect(previous,part,{strength:12}); previous=part;
      if(i%2===0) world.add({x:440+i*52,y:318,width:32,height:40,material:'fuel'});
    }
    const anchor=world.add({x:1168,y:350,width:30,height:30,fixed:true});world.connect(previous,anchor,{strength:12});
    for(let i=0;i<11;i++) world.add({x:440+i*70,y:750,width:42,height:42,material:'fuel'});
    device('igniter',430,710);
    world.add({x:860,y:230,width:16,height:260,fixed:true});
    world.add({x:1120,y:230,width:16,height:260,fixed:true});
    world.add({x:990,y:365,width:260,height:14,fixed:true,material:'glass'});
    const water=world.enableCoolant();water.rasterize(world.parts.values());water.seed(870,120,240,220);
  } else if(id === 'fuse') {
    for(let row=0;row<4;row++){
      for(let i=0;i<9;i++)world.add({x:420+i*95,y:740-row*150,width:38,height:44,material:'fuel',fixed:true});
      world.add({x:800,y:775-row*150,width:840,height:18,fixed:true});
      if(row<3)world.add({x:row%2===0?1180:420,y:665-row*150,width:38,height:44,material:'fuel',fixed:true});
    }
    device('igniter',380,720);
  } else if(id === 'magnet') {
    device('magnet',780,450);
    const relay=device('relay',780,495);
    device('igniter',1020,730,relay);
    for(let y=0;y<5;y++)for(let x=0;x<9;x++)world.add({x:550+x*48,y:600+y*33,radius:14});
    for(let row=0;row<5;row++)for(let i=0;i<5;i++)world.add({x:1030+i*55,y:750-row*48,width:42,height:45,material:'fuel'});
  } else if(id === 'rain') {
    for(let stage=0;stage<3;stage++) {
      const x=420+stage*350;
      const relay=stage===0?battery:device('relay',x-100,720);
      device('igniter',x,250,relay);
      for(let i=0;i<4;i++) {
        const anchor=world.add({x:x+i*65,y:90,width:12,height:12,fixed:true});
        const load=world.add({x:x+i*65,y:250,width:45,height:50,material:'fuel'});
        world.connect(anchor,load,{strength:8,stiffness:.6});
        for(let row=0;row<7;row++)world.add({x:x+i*55,y:758-row*30,width:50,height:28});
      }
    }
  } else {
    for(let row=0;row<13;row++)for(let col=0;col<18;col++)world.add({x:460+col*43,y:757-row*37,width:40,height:34,material:(row+col)%4===0?'fuel':'steel'});
    device('gravity',850,80);const relay=device('relay',850,135);device('igniter',420,730,relay);
  }
  return { world, battery };
}
