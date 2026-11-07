import {serialize} from 'node:v8';
import {createScene} from '../src/scenes.js';
for(const id of ['foundry','core']){
  const {world,battery}=createScene(id);battery.enabled=true;
  const checkpoints=[];const times=[];let bytes=0;
  for(let i=0;i<1200;i++){
    world.step();if(world.tick%30)continue;
    const start=performance.now(),snapshot=world.snapshot();times.push(performance.now()-start);
    bytes+=serialize(snapshot).byteLength;checkpoints.push(snapshot);
  }
  times.sort((a,b)=>a-b);
  console.log(JSON.stringify({scene:id,checkpoints:checkpoints.length,serializedMB:bytes/1048576,p95CloneMs:times[Math.floor(times.length*.95)],heapMB:process.memoryUsage().heapUsed/1048576}));
}
