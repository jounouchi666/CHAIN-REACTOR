// Metadata is deliberately independent of the physics module so the renderer
// does not import Matter or initialize a second simulation on the main thread.
export const SCENES = [
  {id:'foundry',name:'解体工場',prompt:'通電は下から。飛ばした鋼材でも着火する。巻き戻して、崩れ方を重ね比べよう。'},
  {id:'bridge',name:'冷却橋',prompt:'右上の貯水槽を撃ち抜く。流れ落ちた水で、橋の下の爆薬を冷やせるか。'},
  {id:'fuse',name:'折返し導火線',prompt:'点火は左下から。上段を撃って先回り着火し、逆向きの火を走らせろ。'},
  {id:'magnet',name:'質量スイッチ',prompt:'通電で鋼球が上昇。球が上の衝撃リレーへ届くと、右の爆薬庫が開く。'},
  {id:'rain',name:'空中連鎖',prompt:'最初の吊り荷が爆ぜる。落下と衝突が次の点火器を起こす。射撃で順番を変えろ。'},
  {id:'core',name:'重力炉',prompt:'上昇した部品が接点に届くと点火。0.25倍速で短く通電し、点火前に電源を切れるか。'},
];
