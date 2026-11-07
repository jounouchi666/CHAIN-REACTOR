import {labelButton} from './icons.js';
export function installGuide({onOpen=()=>null,onClose=()=>{}}={}){
  let session=null;
  const dialog=document.createElement('dialog');dialog.className='guide';dialog.setAttribute('aria-labelledby','guide-title');
  dialog.innerHTML=`<h2 id="guide-title">壊す。戻す。違う一手を試す。</h2>
  <p>まず「通電」。射撃や組み替えで反応を変え、巻き戻すと前回の動きが点線で残る。</p>
  <dl><dt>射撃</dt><dd>マウスで狙ってクリック。タッチは離すと発射。矢印で照準、Spaceで発射。点線の弾道は通常の重力・空気抵抗のみを予測し、衝突・磁場・重力井戸・水の力は予測しない。</dd>
  <dt>制作</dt><dd>左の道具を選んで槽をクリック。配線・接合は2部品を順に選ぶ。移動はドラッグ、またはEnterで掴み矢印で移動、再びEnterで放す。回転は [ / ]、固定切替は F。外枠と電源は保護される。</dd>
  <dt>時間</dt><dd>3秒戻すと停止し、上書き前の記録を1本保持する。「結果を再生」は物理を変えずに記録を見る操作。比較の点線は前回の剛体、停止中の線は位置の差、強調枠は前回より残った爆薬。</dd>
  <dt>視点</dt><dd>ホイール・2本指・拡大縮小ボタン。視点道具でドラッグ、Shiftと矢印でも移動。「視点を戻す」で初期の視点へ戻る。</dd>
  <dt>設計図</dt><dd>保存するのは現在の部品配置・接続・水の分布。速度・燃焼途中・記録映像は保存しない。読込は停止状態から。「再実験」は元の場、または読込直後の設計図へ戻る。再実験・場の切替前は必要な設計を保存すること。</dd>
  <dt>音と動き</dt><dd>音は明示的に開くまで無音。動き軽減は火花・揺れ・爆圧波・磁場の点を省く。物理運動そのものは続く。</dd>
  <dt>実験の範囲</dt><dd>制作600部品・全体800部品、接続は各1200本、水は最大70000セル。水は質量保存のセル近似で、工学解析用ではない。記録は直近約30秒、巻戻しは約10〜12秒。大きい場では保存間隔1秒・編集取り消し6段、小さい場は0.25秒・24段。</dd></dl>`;
  const close=document.createElement('button');labelButton(close,'実験に戻る','back');close.onclick=()=>dialog.close();dialog.insertBefore(close,dialog.children[1]);document.body.append(dialog);
  dialog.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const focusable=[...dialog.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]')],first=focusable[0],last=focusable.at(-1);if((e.shiftKey&&document.activeElement===first)||(!e.shiftKey&&document.activeElement===last)){e.preventDefault();(e.shiftKey?last:first).focus({preventScroll:true});}});
  const open=document.createElement('button');open.id='help';labelButton(open,'操作ガイド','help');open.setAttribute('aria-haspopup','dialog');open.onclick=()=>{session=onOpen();dialog.showModal();};document.querySelector('#files').append(open);
  dialog.onclose=()=>{onClose(session);open.focus({preventScroll:true});};
  dialog.addEventListener('click',e=>{const r=dialog.getBoundingClientRect();if(e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))dialog.close();});
}
