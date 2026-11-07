export class CoolantPainter {
  constructor(colors=null){this.canvas=document.createElement('canvas');this.ctx=this.canvas.getContext('2d');this.water=[71,154,184];this.steam=[192,211,219];if(colors){this.canvas.width=this.canvas.height=1;for(const name of ['water','steam']){this.ctx.fillStyle=colors[name];this.ctx.fillRect(0,0,1,1);this[name]=[...this.ctx.getImageData(0,0,1,1).data].slice(0,3);}}}
  draw(ctx,fluid){
    if(!fluid)return;
    if(this.canvas.width!==fluid.width||this.canvas.height!==fluid.height){this.canvas.width=fluid.width;this.canvas.height=fluid.height;this.image=this.ctx.createImageData(fluid.width,fluid.height);}
    const pixels=this.image.data;this.waterCount=0;this.steamCount=0;
    for(let i=0;i<fluid.cells.length;i++){
      const j=i*4,type=fluid.cells[i];
      if(type===1)this.waterCount++;else if(type===2)this.steamCount++;
      const color=type===1?this.water:this.steam;pixels[j]=color[0];pixels[j+1]=color[1];pixels[j+2]=color[2];pixels[j+3]=type===1?210:type===2?95:0;
    }
    this.ctx.putImageData(this.image,0,0);ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(this.canvas,0,0,fluid.width*fluid.cell,fluid.height*fluid.cell);ctx.restore();
  }
}
