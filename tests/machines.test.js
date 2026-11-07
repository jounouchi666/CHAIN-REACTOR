import test from 'node:test';
import assert from 'node:assert/strict';
import {createScene,SCENES} from '../src/scenes.js';

test('machines are inert until operated; energy remains in the chamber',()=>{
  for(const scene of SCENES){
    const {world,battery}=createScene(scene.id);let explosions=0;
    for(let i=0;i<600;i++){world.step();explosions+=world.events.filter(e=>e.type==='explosion').length;}
    assert.equal(explosions,0,`${scene.id} self ignited`);
    battery.enabled=true;
    for(let i=0;i<900;i++){world.step();explosions+=world.events.filter(e=>e.type==='explosion').length;}
    assert.ok(explosions>0,`${scene.id} failed to start`);
    for(const p of world.parts.values()){
      assert.ok(Number.isFinite(p.body.position.x)&&Number.isFinite(p.body.angle),`${scene.id} diverged`);
      if(!p.fixed)assert.ok(p.body.position.x>=-30&&p.body.position.x<=1430&&p.body.position.y<820,`${scene.id} leaked part ${p.id}`);
    }
  }
});

test('magnetic mass and falling loads are required electrical intermediaries, not scripted explosions',()=>{
  for(const id of ['magnet','rain']){
    const run=(blocked)=>{
      const {world,battery}=createScene(id);battery.enabled=true;
      // Disable relay output without changing the physical initial state.
      if(blocked)for(const p of world.parts.values())if(p.device==='relay')p.device='switch',p.enabled=false;
      let explosions=0,relays=0;
      for(let i=0;i<1200;i++){world.step();explosions+=world.events.filter(e=>e.type==='explosion').length;relays+=world.events.filter(e=>e.type==='relay').length;}
      return {explosions,relays};
    };
    const normal=run(false),blocked=run(true);
    assert.ok(normal.relays>0,`${id}: no mechanical relay`);
    assert.ok(normal.explosions>blocked.explosions,`${id}: relay is decorative`);
  }
});

test('the same tank-breaking shot suppresses the chain only when coolant is present',()=>{
  const run=(dry)=>{
    const {world,battery}=createScene('bridge');if(dry)world.coolant=null;
    for(let i=0;i<600;i++)world.step();world.launch(90,550,990,320,45);
    let before=0,after=0;
    for(let i=0;i<900;i++){world.step();before+=world.events.filter(e=>e.type==='explosion').length;}
    battery.enabled=true;for(let i=0;i<1800;i++){world.step();after+=world.events.filter(e=>e.type==='explosion').length;}
    return {before,after};
  };
  const wet=run(false),dry=run(true);
  assert.equal(wet.before,0);assert.equal(dry.before,0);
  assert.ok(wet.after<dry.after/2,JSON.stringify({wet,dry}));
});
