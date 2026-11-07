export function arrangeWorkspace(){
  const tools=document.querySelector('#tools');if(!tools)return;
  tools.append(document.querySelector('[aria-label="制作ツール"]'));
  for(const id of ['undo'])tools.append(document.getElementById(id));
  for(const id of ['rotate','anchor']){const b=document.getElementById(id);if(b)tools.append(b);}
  const transport=document.querySelector('#transport');
  for(const id of ['pause','step','speed','rewind','replay','timeline','camera-reset'])transport.append(document.getElementById(id));
  for(const id of ['zoomIn','zoomOut']){const button=document.getElementById(id);if(button)transport.append(button);}
  const ghost=document.getElementById('ghost');if(ghost)transport.append(ghost);
  document.querySelector('#inspector').append(document.querySelector('#reaction-log'));
  const footer=document.querySelector('#files');
  for(const id of ['blank','save','load','sound','motion']){const element=document.getElementById(id);if(element)footer.append(element);}
  footer.append(document.querySelector('[aria-label="音量"]'));
  for(const element of [...document.querySelectorAll('header [role=status]')])if(element.id!=='stats')footer.append(element);
}
