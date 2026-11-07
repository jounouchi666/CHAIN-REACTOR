import {serialize} from 'node:v8';
import {RigidWorld} from '../src/rigid-world.js';
import {Tape} from '../src/tape.js';
for(const count of [240,600]){
  const w=new RigidWorld(),tape=new Tape();
  w.add({x:700,y:790,width:1400,height:20,fixed:true});
  for(let i=0;i<count;i++)w.add({x:100+(i%28)*44,y:750-Math.floor(i/28)*30,width:40,height:28,material:i%4===0?'fuel':'steel'});
  const fluid=w.enableCoolant();fluid.rasterize(w.parts.values());fluid.seed(20,200,1360,560);const mass=fluid.mass();
  w.ignite(140,740);const physics=[],recording=[],clone=[],history=[];
  for(let i=0;i<1200;i++){
    let time=performance.now();w.step();physics.push(performance.now()-time);
    time=performance.now();tape.capture(w);recording.push(performance.now()-time);
    if(i%30===0){time=performance.now();history.push(w.snapshot());clone.push(performance.now()-time);}
  }
  const p95=values=>values.sort((a,b)=>a-b)[Math.floor(values.length*.95)];
  console.log(JSON.stringify({parts:count,fluidMass:mass,massAfter:fluid.mass(),physicsP95ms:p95(physics),captureP95ms:p95(recording),checkpointP95ms:p95(clone),historyMB:serialize(history).byteLength/1048576,tapeMB:serialize(tape).byteLength/1048576,heapMB:process.memoryUsage().heapUsed/1048576,arrayBuffersMB:process.memoryUsage().arrayBuffers/1048576}));
}
