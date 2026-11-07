import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
const root=new URL('../',import.meta.url);
test('home-screen metadata uses scoped relative paths and real opaque icons',async()=>{
  const html=await readFile(new URL('index.html',root),'utf8'),manifest=JSON.parse(await readFile(new URL('site.webmanifest',root),'utf8'));
  assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.display,'standalone');
  assert.match(html,/rel="apple-touch-icon" sizes="180x180" href="\.\/apple-touch-icon.png"/);
  for(const [file,size] of [['apple-touch-icon.png',180],['assets/favicon-16.png',16],['assets/favicon-32.png',32],['assets/icon-192.png',192],['assets/icon-512.png',512],['assets/icon-maskable-512.png',512]]){
    const data=await readFile(new URL(file,root)),meta=await sharp(data).metadata();assert.equal(meta.width,size);assert.equal(meta.height,size);
    if(file==='apple-touch-icon.png')assert.equal(meta.hasAlpha,false);
  }
  const ico=await readFile(new URL('favicon.ico',root));assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),3);
  const mask=await sharp(await readFile(new URL('assets/icon-maskable-512.png',root))).raw().toBuffer({resolveWithObject:true});
  for(let y=0;y<512;y++)for(let x=0;x<512;x++)if((x-256)**2+(y-256)**2>204.8**2){
    const at=(y*512+x)*mask.info.channels;
    assert.ok(Math.abs(mask.data[at]-14)<4&&Math.abs(mask.data[at+1]-21)<4&&Math.abs(mask.data[at+2]-29)<4,'Maskable foreground escaped the safe circle');
  }
  for(const icon of manifest.icons){assert.ok(icon.src.startsWith('./assets/'));assert.ok((await readFile(new URL(icon.src,root))).length>100);}
  for(const link of html.matchAll(/(?:src|href)="([^"]+)"/g))assert.ok(link[1].startsWith('./'),link[1]);
});
test('manual covers actual controls and publication is explicitly manual',async()=>{
  const manual=await readFile(new URL('MANUAL.md',root),'utf8'),workflow=await readFile(new URL('.github/workflows/pages.yml',root),'utf8');
  for(const subject of ['SE','巻戻し','自由制作','ホーム画面','自動保存はありません','0.25倍','Spaceは停止ではなく射撃'])assert.ok(manual.includes(subject),subject);
  assert.match(workflow,/workflow_dispatch:/);assert.doesNotMatch(workflow,/^\s+(push|pull_request):/m);assert.match(workflow,/path: _site/);
  for(const use of workflow.matchAll(/uses: ([^\s]+)/g))assert.match(use[1],/@[a-f0-9]{40}$/);
});
