import {readFile,writeFile,mkdir} from 'node:fs/promises';
import sharp from 'sharp';
import {marked} from 'marked';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),asset=name=>new URL(`assets/${name}`,root);
await mkdir(new URL('assets/',root),{recursive:true});
const source=await readFile(asset('icon.svg'));
for(const [name,size] of [['favicon-16.png',16],['favicon-32.png',32],['apple-touch-icon.png',180],['icon-192.png',192],['icon-512.png',512]])await sharp(source).resize(size,size).removeAlpha().png().toFile(fileURLToPath(new URL(name==='apple-touch-icon.png'?name:`assets/${name}`,root)));
const inset=await sharp(source).resize(410,410).png().toBuffer();
await writeFile(asset('icon-maskable-512.png'),await sharp({create:{width:512,height:512,channels:4,background:'#0e151d'}}).composite([{input:inset,left:51,top:51}]).png().toBuffer());
const images=await Promise.all([16,32,48].map(size=>sharp(source).resize(size,size).png().toBuffer()));
const header=Buffer.alloc(6+16*images.length);header.writeUInt16LE(1,2);header.writeUInt16LE(images.length,4);let offset=header.length;
images.forEach((png,i)=>{const at=6+i*16,size=[16,32,48][i];header[at]=size;header[at+1]=size;header.writeUInt16LE(1,at+4);header.writeUInt16LE(32,at+6);header.writeUInt32LE(png.length,at+8);header.writeUInt32LE(offset,at+12);offset+=png.length;});
await writeFile(new URL('favicon.ico',root),Buffer.concat([header,...images]));
// Only our tracked Markdown is rendered; no user content or remote HTML enters it.
const html=marked.parse(await readFile(new URL('MANUAL.md',root),'utf8'));
await writeFile(new URL('manual.html',root),`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>取扱説明書 — CHAIN REACTOR</title><link rel="icon" href="./assets/icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" sizes="180x180" href="./apple-touch-icon.png"><link rel="stylesheet" href="./manual.css"></head><body><header><a href="./">実験室を開く</a><span>CHAIN REACTOR / MANUAL</span></header><main>${html}</main><footer><a href="./">実験室を開く</a><p>このページを閉じても、別タブの実験はそのままです。</p></footer></body></html>`);
console.log('Icons, favicon.ico, Apple Touch Icon and manual.html built.');
