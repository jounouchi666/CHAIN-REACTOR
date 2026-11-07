export class Camera {
  constructor(){this.x=0;this.y=0;this.zoom=1;}
  world(x,y){return {x:x/this.zoom+this.x,y:y/this.zoom+this.y};}
  screen(x,y){return {x:(x-this.x)*this.zoom,y:(y-this.y)*this.zoom};}
  zoomAt(x,y,factor){
    const anchor=this.world(x,y);
    this.zoom=Math.max(.5,Math.min(3,this.zoom*factor));
    this.x=anchor.x-x/this.zoom;this.y=anchor.y-y/this.zoom;
  }
  pan(dx,dy){this.x-=dx/this.zoom;this.y-=dy/this.zoom;}
  reset(){this.x=0;this.y=0;this.zoom=1;}
}
