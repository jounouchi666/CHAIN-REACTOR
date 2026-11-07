import {Simulation} from './simulation.js';
const simulation=new Simulation();
let last=performance.now(),lastFrame=-1,fatal=false;
function publish(){
  const state=simulation.view(),buffers=state.world.coolant?[state.world.coolant.cells.buffer]:[];
  postMessage({type:'state',state},buffers);lastFrame=performance.now();
}
self.onmessage=event=>{
  const {id,command}=event.data||{};
  try{
    const value=simulation.execute(command);if(['reset','scene','import','blank'].includes(command.type)){fatal=false;last=performance.now();}postMessage({type:'reply',id,ok:true,value});if(command.type!=='drag'||!simulation.playing)publish();
  }catch(error){postMessage({type:'reply',id,ok:false,error:error.message});}
};
setInterval(()=>{
  if(fatal)return;
  const now=performance.now(),elapsed=now-last;last=now;
  if(simulation.suspended||!(simulation.replay?simulation.replay.playing:simulation.playing))return;
  try{
    simulation.update(elapsed);
    if(now-lastFrame>=16)publish();
  }catch(error){fatal=true;postMessage({type:'fatal',error:`物理計算が停止しました: ${error.message}`});}
},8);
publish();
