import {icon,labelButton} from './icons.js';
const short={fire:'撃つ',move:'移動',delete:'削除',joint:'接合',steel:'鋼材',fuel:'爆薬',glass:'隔壁',water:'冷却水',magnet:'磁石',gravity:'重力',igniter:'点火器',relay:'接点',wire:'配線',pan:'視点'};
export function studioUI(tools){
  document.body.classList.add('studio');
  for(const b of document.querySelectorAll('button'))labelButton(b,b.textContent,b.id);
  tools.hidden=true;tools.tabIndex=-1;tools.setAttribute('aria-hidden','true');
  const toolbar=document.createElement('div');toolbar.className='tool-grid';toolbar.setAttribute('role','toolbar');toolbar.setAttribute('aria-label','制作ツール');
  const buttons=[];let picker=null;
  function choose(value,dismiss=true){
    tools.value=value;tools.dispatchEvent(new Event('change'));
    for(const b of buttons){const selected=b.dataset.tool===value;b.setAttribute('aria-pressed',String(selected));b.tabIndex=selected?0:-1;}
    document.querySelector('#tool-hint').textContent=tools.selectedOptions[0].textContent;
    if(picker)labelButton(picker,`道具: ${short[value]}`,value);
    if(dismiss&&toolbar.matches(':popover-open')){toolbar.hidePopover();document.querySelector('canvas').focus({preventScroll:true});}
  }
  for(const option of tools.options){
    const b=document.createElement('button');b.type='button';b.dataset.tool=option.value;b.setAttribute('aria-label',option.textContent);b.title=option.textContent;
    labelButton(b,short[option.value],option.value);b.onclick=()=>choose(option.value);buttons.push(b);toolbar.append(b);
  }
  toolbar.onkeydown=e=>{const delta={ArrowDown:1,ArrowRight:1,ArrowUp:-1,ArrowLeft:-1}[e.key];if(delta){e.preventDefault();const index=(buttons.indexOf(document.activeElement)+delta+buttons.length)%buttons.length;buttons[index].focus({preventScroll:true});buttons[index].scrollIntoView({block:'nearest'});choose(buttons[index].dataset.tool,false);}};
  const hint=document.createElement('span');hint.id='tool-hint';hint.setAttribute('role','status');document.querySelector('.arena-hint').prepend(hint);
  const branch=document.createElement('span');branch.id='branch-note';document.querySelector('.arena-hint').append(branch);
  document.querySelector('#tools').insertBefore(toolbar,document.querySelector('#undo'));choose(tools.value);
  const toolArea=document.querySelector('#tools');toolbar.id='tool-options';picker=document.createElement('button');picker.id='tool-picker';picker.setAttribute('aria-controls',toolbar.id);picker.setAttribute('aria-expanded','false');labelButton(picker,`道具: ${short[tools.value]}`,tools.value);picker.append(icon('chevron'));toolArea.prepend(picker);
  toolbar.addEventListener('keydown',e=>{if(e.key==='Tab'&&toolbar.matches(':popover-open'))toolbar.hidePopover();});
  picker.onclick=()=>{if(toolbar.matches(':popover-open'))toolbar.hidePopover();else{toolbar.showPopover();toolbar.querySelector('[tabindex="0"]').focus({preventScroll:true});}};
  toolbar.addEventListener('toggle',()=>picker.setAttribute('aria-expanded',String(toolbar.matches(':popover-open'))));
  for(const [id,name] of [['undo','編集を戻す'],['rotate','狙った部品を15度回転'],['anchor','狙った部品の固定を切替'],['camera-reset','視点を戻す']])document.getElementById(id).setAttribute('aria-label',name);
  const canvas=document.querySelector('canvas'),stage=document.createElement('div');stage.className='canvas-stage';canvas.before(stage);stage.append(canvas);
  const viewControls=document.createElement('div');viewControls.className='view-controls';stage.append(viewControls);
  const compact=matchMedia('(max-width:47.99rem)'),transport=document.querySelector('#transport');
  const ghost=document.querySelector('#ghost');transport.insertBefore(ghost,document.querySelector('#timeline'));
  function adapt(){
    if(toolbar.matches(':popover-open'))toolbar.hidePopover();picker.hidden=!compact.matches;
    if(compact.matches){toolbar.setAttribute('popover','auto');for(const id of ['camera-reset','zoomIn','zoomOut'])viewControls.append(document.getElementById(id));}
    else{toolbar.removeAttribute('popover');for(const id of ['camera-reset','zoomIn','zoomOut'])transport.insertBefore(document.getElementById(id),ghost);}
  }
  compact.addEventListener('change',adapt);adapt();
  const inspector=document.querySelector('#inspector');inspector.hidden=true;
  const toggle=document.createElement('button');toggle.id='log-toggle';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','inspector');labelButton(toggle,'反応履歴','log');
  function close(){inspector.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus({preventScroll:true});}
  toggle.onclick=()=>{inspector.hidden=!inspector.hidden;toggle.setAttribute('aria-expanded',String(!inspector.hidden));};
  document.querySelector('#transport').append(toggle);
  const closeButton=document.createElement('button');closeButton.className='close-log';closeButton.setAttribute('aria-label','反応履歴を閉じる');closeButton.append(icon('close'));closeButton.onclick=close;inspector.prepend(closeButton);
  inspector.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!inspector.hidden&&!document.querySelector('dialog[open]')&&!document.querySelector('[popover]:popover-open'))close();});
  const sceneSelect=document.querySelector('select[aria-label="実験場"]');const sceneWrap=document.createElement('label');sceneWrap.className='scene-select';const sceneLabel=document.createElement('span');sceneLabel.className='sr-only';sceneLabel.textContent='実験場';sceneSelect.before(sceneWrap);sceneWrap.append(sceneLabel,sceneSelect,icon('chevron'));
}
