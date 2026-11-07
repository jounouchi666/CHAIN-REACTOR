import test from 'node:test';
import assert from 'node:assert/strict';
import {RigidWorld} from '../src/rigid-world.js';
import {createScene} from '../src/scenes.js';
test('gravity attracts fuel while the magnetic field is material selective',()=>{
  const run=device=>{
    const w=new RigidWorld();w.engine.gravity.y=0;
    const battery=w.add({x:50,y:50,fixed:true});Object.assign(battery,{device:'battery',enabled:true});
    const field=w.add({x:200,y:100,fixed:true});field.device=device;w.wire(battery,field,1000);
    const fuel=w.add({x:100,y:100,material:'fuel'});w.step();return fuel.body.velocity.x;
  };
  assert.equal(run('magnet'),0);assert.ok(run('gravity')>0);
});
test('a short gravity pulse stays below the mechanical ignition threshold',()=>{
  const run=off=>{
    const {world,battery}=createScene('core');for(let i=0;i<600;i++)world.step();battery.enabled=true;let explosions=0;
    for(let i=0;i<1200;i++){if(off&&i===30)battery.enabled=false;world.step();explosions+=world.events.filter(e=>e.type==='explosion').length;}
    return explosions;
  };
  assert.ok(run(false)>20);assert.equal(run(true),0);
});
