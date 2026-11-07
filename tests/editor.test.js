import test from 'node:test';import assert from 'node:assert/strict';
import {createScene} from '../src/scenes.js';import {Editor} from '../src/editor.js';
import {RigidWorld} from '../src/rigid-world.js';
test('deleting and undoing a connected device restores references',()=>{
  const {world,battery}=createScene('foundry');const editor=new Editor(world);
  const wires=world.wires.length;editor.checkpoint();editor.remove(battery.id);
  assert.equal(world.wires.length,0);assert.equal(world.parts.has(battery.id),false);
  editor.undo();assert.equal(world.wires.length,wires);assert.ok(world.parts.has(battery.id));
  world.step();assert.ok(world.parts.get(battery.id).body===world.engine.world.bodies.find(b=>b.plugin.partId===battery.id));
});

test('moving a body clears obsolete contacts before thermal transfer',()=>{
  const world=new RigidWorld();world.engine.gravity.y=0;
  const hot=world.add({x:100,y:100,width:50,fixed:true}),cold=world.add({x:149,y:100,width:50});
  world.step();assert.ok(world.engine.pairs.list.length);hot.heat=1;
  new Editor(world).move(cold.id,500,100);world.step();assert.equal(cold.heat,0);
});
