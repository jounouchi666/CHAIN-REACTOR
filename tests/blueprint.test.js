import test from 'node:test';
import assert from 'node:assert/strict';
import { createScene, SCENES } from '../src/scenes.js';
import { exportBlueprint, importBlueprint } from '../src/blueprint.js';

test('all six machines survive JSON blueprint roundtrip', () => {
  for (const scene of SCENES) {
    const {world}=createScene(scene.id);
    const data=exportBlueprint(world);
    const restored=importBlueprint(JSON.parse(JSON.stringify(data)));
    assert.deepEqual(exportBlueprint(restored),data);
    for(let i=0;i<120;i++) restored.step();
    assert.ok([...restored.parts.values()].every(p=>Number.isFinite(p.body.position.x)));
  }
});
test('blueprints reject duplicate IDs, invalid references and nonfinite geometry', () => {
  const data=exportBlueprint(createScene('bridge').world);
  for(const mutate of [d=>{d.parts[1].id=d.parts[0].id;},d=>{d.wires[0].a=99999;},d=>{d.parts[0].x=Infinity;},d=>{d.parts[0].radius=-1;},d=>{d.coolant.runs=[[0,70001,1]];},d=>{d.coolant.runs=[[1,4,1],[3,4,2]];},d=>{d.parts[1].fragment='yes';}]) {
    const invalid=structuredClone(data);mutate(invalid);assert.throws(()=>importBlueprint(invalid));
  }
});
