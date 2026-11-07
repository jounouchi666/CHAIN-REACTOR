import test from 'node:test';
import assert from 'node:assert/strict';
import {RigidWorld} from '../src/rigid-world.js';

test('mechanical collision latches a relay, then electricity reaches a remote igniter',()=>{
  const w=new RigidWorld();
  const battery=w.add({x:50,y:100,fixed:true});Object.assign(battery,{device:'battery',enabled:true});
  const relay=w.add({x:250,y:100,fixed:true,width:40,height:100});relay.device='relay';
  const igniter=w.add({x:700,y:100,fixed:true});igniter.device='igniter';
  const fuel=w.add({x:750,y:100,material:'fuel',fixed:true});
  w.wire(battery,relay,1000);w.wire(relay,igniter,1000);
  for(let i=0;i<60;i++)w.step();
  assert.equal(fuel.burning,undefined);assert.equal(igniter.powered,false);
  w.launch(100,100,250,100,30);
  let relayEvents=0,explosions=0;
  for(let i=0;i<180;i++){w.step();relayEvents+=w.events.filter(e=>e.type==='relay').length;explosions+=w.events.filter(e=>e.type==='explosion').length;}
  assert.equal(relay.latched,true);assert.equal(relayEvents,1);assert.equal(explosions,1);
});

test('contact heat transfers between touching bodies and survives exact checkpoint replay',()=>{
  const w=new RigidWorld();w.engine.gravity.y=0;
  const hot=w.add({x:100,y:100,fixed:true,width:50});
  const cold=w.add({x:149,y:100,width:50});hot.heat=1;
  for(let i=0;i<10;i++)w.step();
  assert.ok(cold.heat>0);const snapshot=w.snapshot();
  for(let i=0;i<30;i++)w.step();const expected=[hot.heat,cold.heat];
  w.restore(snapshot);for(let i=0;i<30;i++)w.step();
  assert.deepEqual([...w.parts.values()].map(p=>p.heat),expected);
});
