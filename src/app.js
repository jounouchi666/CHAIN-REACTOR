import {SCENES} from './catalogue.js';
import {Camera} from './camera.js';
import {Effects} from './effects.js';
import {MachineSound} from './sound.js';
import {createMachineSprites} from './symbols.js';
import {CoolantPainter} from './coolant-painter.js';
import {drawWorld,studioPalette} from './world-renderer.js';
import {freeFlight} from './trajectory.js';
import {arrangeWorkspace} from './layout.js';
import {studioUI} from './studio-ui.js';
import {labelButton} from './icons.js';
import {installGuide} from './guide.js';

const canvas=document.querySelector('#view'),ctx=canvas.getContext('2d'),header=document.querySelector('header');
const palette=studioPalette();
const camera=new Camera(),effects=new Effects(),sound=new MachineSound(),sprites=createMachineSprites(palette.ink),coolantPainter=new CoolantPainter(palette);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let manualReduced=false;
let state=null,previousState=null,received=performance.now(),lastFrame=received,aim={x:700,y:450},panPoint=null,down=false,pendingDrag=null,serial=0;
const pointers=new Map();let pinch=null,touchFire=false,gestureBlocked=false;
const pending=new Map(),worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
const feedback=document.createElement('span');feedback.setAttribute('role','status');feedback.textContent='計算機を準備中';header.append(feedback);
function error(message){feedback.textContent=message;}
function send(command){
  if(pending.size>=64)return Promise.reject(new Error('計算が追い付いていません。少し待って再操作してください'));
  const id=++serial;return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});worker.postMessage({id,command});});
}
function act(command){send(command).then(value=>{if(value?.notice)feedback.textContent=value.notice;}).catch(e=>error(e.message));}
function button(id,label,action){const b=document.createElement('button');b.id=id;b.textContent=label;b.onclick=action;header.append(b);return b;}
const scenes=document.createElement('select');scenes.setAttribute('aria-label','実験場');
for(const s of SCENES){const o=document.createElement('option');o.value=s.id;o.textContent=s.name;scenes.append(o);}header.prepend(scenes);
const customOption=document.createElement('option');customOption.value='custom';customOption.textContent='読込んだ設計図';customOption.disabled=true;customOption.hidden=true;scenes.append(customOption);
scenes.onchange=()=>act({type:'scene',id:scenes.value});
const tools=document.createElement('select');tools.setAttribute('aria-label','制作ツール');
for(const [value,label] of [['fire','発射'],['move','掴んで移動'],['delete','削除'],['joint','接合する'],['steel','鋼材を置く'],['fuel','燃料を置く'],['glass','割れる隔壁'],['water','冷却水を注ぐ'],['magnet','磁石を置く'],['gravity','重力井戸を置く'],['igniter','点火器を置く'],['relay','衝撃リレーを置く'],['wire','配線する'],['pan','視点を動かす']]){const o=document.createElement('option');o.value=value;o.textContent=label;tools.append(o);}header.append(tools);
tools.onchange=()=>act({type:'clear-selection'});
for(const id of ['reset','power','pause'])document.getElementById(id).onclick=()=>act({type:id});
for(const [id,label] of [['undo','編集を戻す'],['step','1step'],['speed','1倍'],['rewind','3秒前'],['replay','再生']])button(id,label,()=>act({type:id}));
button('camera-reset','視点を戻す',()=>camera.reset());
button('blank','自由制作',()=>act({type:'blank'}));
button('ghost','前回比較',()=>act({type:'ghost'}));
button('zoomIn','拡大',()=>camera.zoomAt(700,400,1.2));button('zoomOut','縮小',()=>camera.zoomAt(700,400,1/1.2));
button('rotate','回転',()=>act({type:'rotate',...aim,delta:Math.PI/12}));button('anchor','固定',()=>act({type:'anchor',...aim}));
const motionButton=button('motion','動き軽減',()=>{manualReduced=!manualReduced;syncMotion();});
function syncMotion(){motionButton.disabled=reduced.matches;motionButton.setAttribute('aria-pressed',String(manualReduced||reduced.matches));labelButton(motionButton,reduced.matches?'動き軽減(OS)':'動き軽減','motion');document.body.classList.toggle('reduce-motion',manualReduced||reduced.matches);}
reduced.addEventListener('change',syncMotion);syncMotion();
const timeline=document.createElement('input');Object.assign(timeline,{type:'range',id:'timeline',min:'0',max:'0',step:'1',value:'0'});timeline.setAttribute('aria-label','記録の再生位置');timeline.oninput=()=>act({type:'seek',tick:Number(timeline.value)});header.append(timeline);
const log=document.createElement('ol');log.id='reaction-log';log.setAttribute('aria-label','反応履歴');document.body.append(log);
let logSignature='';
function updateControls(){
  syncMotion();
  labelButton(document.querySelector('#pause'),state.playing?'停止':'再開',state.playing?'pause':'play');
  document.querySelector('#power').setAttribute('aria-pressed',String(state.batteryEnabled));
  document.querySelector('#power').disabled=state.replaying;
  labelButton(document.querySelector('#speed'),`${state.speed}倍`,'speed');document.querySelector('#speed').setAttribute('aria-label',`実験速度 ${state.speed}倍（切替）`);
  labelButton(document.querySelector('#replay'),state.replaying?'実験へ':'再生',state.replaying?'back':'replay');document.querySelector('#replay').setAttribute('aria-label',state.replaying?'実験に戻る':'結果を再生');
  document.querySelector('#replay').setAttribute('aria-pressed',String(state.replaying));
  document.querySelector('#replay').disabled=!state.replaying&&state.tape.frames<2;
  document.querySelector('#undo').disabled=state.replaying||!state.canUndo;
  document.querySelector('#ghost').disabled=state.replaying||!state.ghost.available;document.querySelector('#ghost').setAttribute('aria-pressed',String(state.ghost.available&&state.ghost.enabled));
  document.querySelector('#branch-note').textContent=state.ghost.available?`点線輪郭: 前回の動き（${(state.ghost.end/120).toFixed(1)}秒まで）${state.ghost.frame?.survivors.length?` / 前回より残った爆薬 ${state.ghost.frame.survivors.length}個`:''}`:'';
  timeline.min=String(state.tape.start);timeline.max=String(state.tape.end);timeline.value=String(state.replaying?state.world.tick:state.tape.end);timeline.disabled=state.tape.frames<2;
  timeline.setAttribute('aria-valuetext',`${((state.replaying?state.world.tick:state.tape.end)/120).toFixed(2)}秒`);
  customOption.hidden=!state.custom;customOption.textContent=state.designName||'読込んだ設計図';scenes.value=state.custom?'custom':state.scene;document.querySelector('#mission').textContent=state.custom?(state.designName==='自由制作'?'点火器と爆薬を置き、電源から配線。通電して、自分の連鎖を作る。':'読込んだ設計図。組み替えて試す。「再実験」で読込直後の配置に戻る。'):SCENES.find(s=>s.id===state.scene).prompt;
  const signature=state.log.map(e=>`${e.tick}:${e.source}`).join(',');
  if(signature!==logSignature){
    logSignature=signature;log.replaceChildren();
    for(const e of [...state.log].reverse()){
      const line=document.createElement('li');const cause=e.parent?.type==='electric'?'通電点火':e.parent?.type==='explosion'?`部品${e.parent.source}から延焼`:e.parent?.type==='impact'?'衝撃着火':e.parent?.type==='contact'?'接触伝熱':'点火';
      line.textContent=`${(e.tick/120).toFixed(2)}s — 部品${e.source} 爆発 / ${cause} / ${e.depth}段目`;log.append(line);
    }
  }
}
worker.onmessage=({data})=>{
  if(data.type==='reply'){
    const request=pending.get(data.id);if(!request)return;pending.delete(data.id);
    if(data.ok)request.resolve(data.value);else request.reject(new Error(data.error));return;
  }
  if(data.type==='fatal'){error(`${data.error}。「再実験」で初期化できます`);return;}
  if(data.type!=='state')return;
  const incoming=data.state;
  if(!state||incoming.revision!==state.revision||incoming.replaying!==state.replaying){previousState=null;effects.clear();sound.clear();panPoint=null;pendingDrag=null;down=false;touchFire=false;gestureBlocked=false;pinch=null;pointers.clear();}
  else {previousState=state;effects.reduced=reduced.matches||manualReduced;effects.update(Math.max(0,incoming.world.tick-state.world.tick)/120);}
  if(state&&incoming.scene!==state.scene)camera.reset();
  state=incoming;state.world.parts=new Map(state.world.parts.map(p=>[p.id,p]));received=performance.now();
  for(const e of state.events){sound.event(e);effects.emit(e,state.world);}
  updateControls();
  if(feedback.textContent==='計算機を準備中')feedback.textContent='';
};
worker.onerror=event=>{error(`計算機を起動できません: ${event.message}。ページを再読込してください`);for(const p of pending.values())p.reject(new Error('計算機が停止しました'));pending.clear();};
document.addEventListener('visibilitychange',()=>act({type:'suspend',value:document.hidden}));

const soundButton=button('sound','音を開く',async()=>{
  try{if(sound.enabled){sound.mute();labelButton(soundButton,'音を開く','sound');}else{await sound.enable();labelButton(soundButton,'無音にする','muted');}soundButton.setAttribute('aria-pressed',String(sound.enabled));}
  catch(e){error(`音を開始できません: ${e.message}`);}
});soundButton.setAttribute('aria-pressed','false');
const volume=document.createElement('input');Object.assign(volume,{type:'range',min:'0',max:'.7',step:'.01',value:'.35'});volume.setAttribute('aria-label','音量');volume.oninput=()=>sound.setVolume(volume.value);header.append(volume);
button('save','設計図を保存',async()=>{
  try{
    const blueprint=await send({type:'export'}),url=URL.createObjectURL(new Blob([JSON.stringify(blueprint,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='chain-reactor-blueprint.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(e){error(e.message);}
});
const file=document.createElement('input');file.type='file';file.accept='.json';file.hidden=true;document.body.append(file);
button('load','設計図を読込',()=>file.click());
file.onchange=async()=>{
  const selected=file.files[0];file.value='';if(!selected)return;
  try{
    if(selected.size>2000000)throw new Error('設計図は2MB以内にしてください');
    const revision=state?.revision,text=await selected.text();if(state?.revision!==revision)throw new Error('実験が切り替わりました。もう一度読み込んでください');
    await send({type:'import',blueprint:JSON.parse(text)});camera.reset();feedback.textContent='読込済み・停止中';
  }catch(e){error(`読込失敗: ${e.message}`);}
};

function pointer(e){const b=canvas.getBoundingClientRect();return camera.world((e.clientX-b.left)/b.width*1400,(e.clientY-b.top)/b.height*800);}
function useTool(kind=tools.value){if(!state)return;if(kind!=='pan')act({type:'tool',kind,...aim});}
function gesture(){const p=[...pointers.values()];return {x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2,distance:Math.max(1,Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y))};}
canvas.onpointerdown=e=>{
  const popover=document.querySelector('[popover]:popover-open');if(popover){popover.hidePopover();e.preventDefault();return;}
  canvas.focus({preventScroll:true});pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);
  if(pointers.size===2){pinch=gesture();gestureBlocked=true;touchFire=false;down=false;panPoint=null;pendingDrag=null;act({type:'release'});return;}
  aim=pointer(e);down=true;if(tools.value==='pan'){panPoint={x:e.clientX,y:e.clientY};return;}
  if(e.pointerType==='touch'&&tools.value==='fire'){touchFire=true;return;}useTool();
};
canvas.onpointermove=e=>{
  if(pointers.has(e.pointerId))pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size>=2&&pinch){const next=gesture(),b=canvas.getBoundingClientRect();camera.zoomAt((next.x-b.left)/b.width*1400,(next.y-b.top)/b.height*800,next.distance/pinch.distance);camera.pan((next.x-pinch.x)/b.width*1400,(next.y-pinch.y)/b.height*800);pinch=next;return;}
  if(panPoint){const b=canvas.getBoundingClientRect();camera.pan((e.clientX-panPoint.x)/b.width*1400,(e.clientY-panPoint.y)/b.height*800);panPoint={x:e.clientX,y:e.clientY};return;}
  aim=pointer(e);if(down&&tools.value==='move')pendingDrag={...aim};
};
canvas.onpointerup=canvas.onpointercancel=e=>{
  if(touchFire&&!gestureBlocked&&e.type==='pointerup'){aim=pointer(e);useTool('fire');}
  if(down&&tools.value==='move'){if(pendingDrag)act({type:'drag',...pendingDrag});act({type:'release'});}
  pointers.delete(e.pointerId);if(!pointers.size){pinch=null;gestureBlocked=false;touchFire=false;}
  down=false;pendingDrag=null;panPoint=null;
};
canvas.addEventListener('wheel',e=>{e.preventDefault();const b=canvas.getBoundingClientRect();camera.zoomAt((e.clientX-b.left)/b.width*1400,(e.clientY-b.top)/b.height*800,Math.exp(-e.deltaY*.001));},{passive:false});
canvas.onkeydown=e=>{
  const arrows={ArrowLeft:[-25,0],ArrowRight:[25,0],ArrowUp:[0,-25],ArrowDown:[0,25]};
  if(arrows[e.code]){e.preventDefault();const [x,y]=arrows[e.code];if(e.shiftKey)camera.pan(-x,-y);else{aim.x+=x;aim.y+=y;if(state?.dragging)act({type:'drag',...aim});}return;}
  if(e.code==='Enter'){e.preventDefault();useTool();}if(e.code==='Space'){e.preventDefault();useTool('fire');}
  if(e.code==='Equal')camera.zoomAt(700,400,1.2);if(e.code==='Minus')camera.zoomAt(700,400,1/1.2);
  if(e.code==='BracketLeft'||e.code==='BracketRight'){e.preventDefault();act({type:'rotate',...aim,delta:(e.code==='BracketLeft'?-1:1)*Math.PI/12});}if(e.code==='KeyF')act({type:'anchor',...aim});
  if(e.code==='KeyR')act({type:'reset'});if(e.code==='KeyE')act({type:'power'});
};
function render(now){
  const lowMotion=reduced.matches||manualReduced;
  const dt=Math.min(100,now-lastFrame);lastFrame=now;effects.measure(dt);effects.reduced=lowMotion;if(lowMotion)effects.clear();
  if(pendingDrag){act({type:'drag',...pendingDrag});pendingDrag=null;}
  ctx.fillStyle=palette.bg;ctx.fillRect(0,0,1400,800);
  if(state){
    let display=state.world;
    if(previousState&&state.playing&&state.world.tick>=previousState.world.tick){
      const blend=Math.min(1,(now-received)/16),parts=new Map();
      for(const [id,p] of state.world.parts){const old=previousState.world.parts.get(id);if(!old){parts.set(id,p);continue;}parts.set(id,{...p,body:{position:{x:old.body.position.x+(p.body.position.x-old.body.position.x)*blend,y:old.body.position.y+(p.body.position.y-old.body.position.y)*blend},angle:old.body.angle+(p.body.angle-old.body.angle)*blend}});}
      display={...state.world,parts};
    }
    ctx.save();ctx.scale(camera.zoom,camera.zoom);ctx.translate(-camera.x,-camera.y);
    if(!lowMotion&&state.playing)ctx.translate(Math.sin(state.world.tick*.5833)*effects.shake,Math.cos(state.world.tick*.75)*effects.shake*.6);
    drawWorld(ctx,display,{sprites,scars:state.scars,reduced:lowMotion,coolantPainter,ghost:state.ghost.frame,palette});
    if(!state.replaying&&tools.value==='fire'){
      ctx.strokeStyle=palette.power;ctx.lineWidth=1;ctx.setLineDash([4,10]);ctx.beginPath();ctx.moveTo(90,550);
      for(const p of freeFlight(90,550,aim.x,aim.y)){if(p.x<0||p.x>1400||p.y>775)break;ctx.lineTo(p.x,p.y);}ctx.stroke();ctx.setLineDash([]);
    }
    ctx.save();ctx.translate(90,550);ctx.rotate(Math.atan2(aim.y-550,aim.x-90));ctx.fillStyle=palette.text;ctx.fillRect(-24,-13,70,26);ctx.fillStyle=palette.shadow;ctx.fillRect(-28,-23,35,46);ctx.restore();
    if(state.selected){const p=display.parts.get(state.selected);if(p){ctx.save();ctx.translate(p.body.position.x,p.body.position.y);ctx.rotate(p.body.angle);ctx.strokeStyle=palette.power;ctx.lineWidth=3;ctx.strokeRect(-p.width/2-5,-p.height/2-5,p.width+10,p.height+10);ctx.restore();}}
    effects.draw(ctx,palette);
    if(!lowMotion)for(const e of state.scars){const age=(state.world.tick-e.tick)/120;if(age<0||age>.5)continue;ctx.globalAlpha=1-age*2;ctx.strokeStyle=palette.power;ctx.lineWidth=6;ctx.beginPath();ctx.arc(e.x,e.y,age*480,0,Math.PI*2);ctx.stroke();}ctx.globalAlpha=1;
    ctx.restore();
    document.querySelector('#stats').textContent=`T${Math.floor(state.world.tick)} / ${state.explosionCount} 爆発 / ${state.world.parts.size} 部品 / ${state.replaying?'記録再生':`電力 ${state.batteryEnabled?'ON':'OFF'}`} / ${camera.zoom.toFixed(1)}x${state.world.coolant?` / 水${coolantPainter.waterCount} 蒸気${coolantPainter.steamCount}`:''}`;
  }
  requestAnimationFrame(render);
}
arrangeWorkspace();studioUI(tools);installGuide({onOpen:()=>{if(!state?.playing)return null;const session={revision:state.revision,replaying:state.replaying,paused:send({type:'pause'})};session.paused.catch(e=>error(e.message));return session;},onClose:session=>{if(session&&state?.revision===session.revision&&state.replaying===session.replaying)session.paused.then(()=>act({type:'pause'})).catch(()=>{});}});requestAnimationFrame(render);
