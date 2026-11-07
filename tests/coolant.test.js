import test from 'node:test';
import assert from 'node:assert/strict';
import {Coolant,WATER,STEAM} from '../src/coolant.js';
import {RigidWorld} from '../src/rigid-world.js';

test('coolant mass survives flow, displacement, blast, boiling and condensation',()=>{
  const f=new Coolant(50,40,4);f.seed(20,20,80,40);const mass=f.mass();
  for(let i=0;i<40;i++)f.step();
  f.blast(70,140);assert.equal(f.mass(),mass);
  f.solid.fill(1);for(let i=0;i<10;i++)f.step();assert.equal(f.mass(),mass);
  f.solid.fill(0);for(let i=0;i<400;i++)f.step();assert.equal(f.mass(),mass);
  assert.equal(f.cells.filter(c=>c===STEAM).length,0);
  assert.ok(f.cells.some(c=>c===WATER));
});

test('liquid levels instead of retaining a granular heap',()=>{
  const f=new Coolant(100,50,4);f.seed(160,80,40,80);const mass=f.mass();
  for(let i=0;i<300;i++)f.step();
  assert.equal(f.mass(),mass);
  const rows=[];for(let y=0;y<50;y++)if(f.cells.slice(y*100,(y+1)*100).some(Boolean))rows.push(y);
  assert.ok(rows[0]>=47,`water still forms a pile at row ${rows[0]}`);
});

test('water cools a burning fuel body and exact rewind includes the cellular state',()=>{
  const w=new RigidWorld();w.engine.gravity.y=0;
  const fuel=w.add({x:100,y:100,width:20,height:20,material:'fuel',fixed:true});
  Object.assign(fuel,{heat:1,burning:true});
  const f=w.enableCoolant();f.seed(80,80,40,40);
  w.step();assert.equal(fuel.burning,false);assert.ok(fuel.heat<.6);
  const s=w.snapshot();for(let i=0;i<80;i++)w.step();
  const cells=w.coolant.cells.slice(),heat=fuel.heat;
  w.restore(s);for(let i=0;i<80;i++)w.step();
  assert.deepEqual(w.coolant.cells,cells);assert.equal(w.parts.get(fuel.id).heat,heat);
});

test('an impact breaks a sealed panel into conserved-area moving pieces and releases water',()=>{
  const w=new RigidWorld();
  w.add({x:300,y:400,width:400,height:20,fixed:true});
  const panel=w.add({x:300,y:180,width:160,height:12,fixed:true,material:'glass'});
  w.add({x:215,y:120,width:12,height:120,fixed:true});w.add({x:385,y:120,width:12,height:120,fixed:true});
  const f=w.enableCoolant();f.rasterize(w.parts.values());f.seed(225,80,150,85);const mass=f.mass();
  for(let i=0;i<120;i++)w.step();
  assert.equal(w.parts.has(panel.id),true);assert.equal(f.cells.slice(50*f.width).filter(Boolean).length,0);
  w.launch(300,300,300,100,30);
  for(let i=0;i<180;i++)w.step();
  assert.equal(w.parts.has(panel.id),false);
  const fragments=[...w.parts.values()].filter(p=>p.fragment);
  assert.equal(fragments.length,4);assert.equal(fragments.reduce((s,p)=>s+p.width*p.height,0),panel.width*panel.height);
  assert.equal(f.mass(),mass);assert.ok(f.cells.slice(60*f.width).some(Boolean),'water did not leave the tank');
});
