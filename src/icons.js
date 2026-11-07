const paths={
  gravity:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10M12 11v2',help:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20M9 8a3 3 0 1 1 4 3c-1 .5-1 1-1 3m0 3v.1',motion:'M3 6h18M6 12h12M9 18h6',rotate:'M4 8a9 9 0 1 1 0 8M4 2v6h6',anchor:'M8 3h8l-1 7 4 4v2H5v-2l4-4zM12 16v6',ghost:'M3 3h12v12H3zM9 9h12v12H9z',blank:'M3 3h18v18H3zM12 7v10M7 12h10',fire:'M3 21L18 6M12 4h8v8M3 14v7h7',move:'M12 2v20M2 12h20M8 6l4-4 4 4M8 18l4 4 4-4M6 8l-4 4 4 4M18 8l4 4-4 4',
  delete:'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7',joint:'M9 8L6 5 2 9l5 5 3-3m4 2 3-3 5 5-4 4-3-3M8 16l8-8',
  steel:'M3 5h18v14H3zM6 8h1m10 0h1M6 16h1m10 0h1',fuel:'M12 3L2 21h20zM12 9v5m0 3v1',glass:'M3 3h18v18H3zM12 3l-3 7 5 3-4 8',water:'M12 2C10 7 4 11 4 15a8 8 0 0 0 16 0c0-4-6-8-8-13zM8 14c-1 3 1 5 3 5',
  magnet:'M4 4v9a8 8 0 0 0 16 0V4h-5v9a3 3 0 0 1-6 0V4zM4 8h5m6 0h5',igniter:'M13 2L5 13h6l-1 9 9-13h-6z',relay:'M2 16h5m10 0h5M7 16l10-8M7 16v5m10-5v5M12 2v5',wire:'M3 4v7c0 7 18-5 18 3v6M1 4h4m14 16h4',
  pan:'M8 12V5a2 2 0 0 1 4 0v6-7a2 2 0 0 1 4 0v8-5a2 2 0 0 1 4 0v9c0 4-3 6-7 6h-2c-3 0-4-2-6-5L2 12c-1-3 2-4 4-1l2 1',
  undo:'M9 5L3 11l6 6M3 11h10a7 7 0 0 1 7 7',reset:'M3 10a9 9 0 1 1 2 8M3 3v7h7',power:'M12 2v10M6 5a9 9 0 1 0 12 0',pause:'M7 4v16M17 4v16',play:'M6 3l15 9-15 9z',step:'M3 4l12 8-12 8zM20 4v16',speed:'M3 18a10 10 0 1 1 18 0M12 14l5-7M5 18h14',rewind:'M11 4L2 12l9 8zM22 4l-9 8 9 8z',replay:'M4 8a9 9 0 1 1 0 8M4 2v6h6M10 8l7 4-7 4z',back:'M10 4l-8 8 8 8M2 12h20',
  'camera-reset':'M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5',save:'M4 3h13l4 4v14H3V3zM7 3v6h10V3M7 21v-8h10v8',load:'M3 20V5h7l3 3h8v12zM12 10v8m-3-3 3 3 3-3',sound:'M3 9h4l5-5v16l-5-5H3zM16 8a6 6 0 0 1 0 8M19 4a11 11 0 0 1 0 16',muted:'M3 9h4l5-5v16l-5-5H3zM16 8l6 8m0-8-6 8',log:'M4 3h16v18H4zM8 7h8M8 12h8M8 17h5',chevron:'M5 9l7 7 7-7',close:'M5 5l14 14M19 5L5 19',zoomIn:'M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM15 15l7 7M7 10h6m-3-3v6',zoomOut:'M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM15 15l7 7M7 10h6',
};
export function icon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.6');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',paths[name]||paths.steel);svg.append(p);return svg;}
export function labelButton(button,text,name=button.id){
  if(!button.querySelector('.button-label')){const span=document.createElement('span');span.className='button-label';button.replaceChildren(icon(name),span);button.dataset.icon=name;}
  if(button.dataset.icon!==name){button.firstElementChild.replaceWith(icon(name));button.dataset.icon=name;}
  const label=button.querySelector('.button-label');if(label.textContent!==text)label.textContent=text;
}
