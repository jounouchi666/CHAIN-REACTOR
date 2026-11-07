import {readFile,stat,readdir} from 'node:fs/promises';
import {resolve,dirname,relative,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../_site');
async function checkReference(from,ref){
  if(ref.startsWith('#'))return;
  if(!ref.startsWith('./'))throw Error(`Non-relative public URL in ${from}: ${ref}`);
  const target=resolve(root,dirname(from),ref.endsWith('/')?`${ref}index.html`:ref),local=relative(root,target);
  if(local.startsWith('..')||!(await stat(target)).isFile())throw Error(`Missing/escaping reference ${from}: ${ref}`);
}
for(const name of ['index.html','manual.html']){
  const source=await readFile(join(root,name),'utf8');
  for(const match of source.matchAll(/(?:src|href)="([^"]+)"/g))await checkReference(name,match[1]);
}
for(const name of ['app.css','manual.css'])for(const match of (await readFile(join(root,name),'utf8')).matchAll(/@import url\('([^']+)'\)/g))await checkReference(name,match[1]);
const manifest=JSON.parse(await readFile(join(root,'site.webmanifest'),'utf8'));
if(manifest.scope!=='./'||manifest.start_url!=='./')throw Error('Manifest escapes Project Pages');
for(const icon of manifest.icons)await checkReference('site.webmanifest',icon.src);
const app=await readFile(join(root,'dist/app.js'),'utf8');if(!/new URL\("\.\/worker\.js", import\.meta\.url\)/.test(app))throw Error('Worker must be relative to bundled app');
await stat(join(root,'dist/worker.js'));
for(const forbidden of ['src','tests','e2e','evidence','node_modules','.git','scripts'])if((await readdir(root)).includes(forbidden))throw Error(`Private directory in publication: ${forbidden}`);
console.log('Publication references, scoped manifest, Worker and source exclusion: PASS');
