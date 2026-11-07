import {mkdir,copyFile,readdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),output=join(root,'_site');
// An explicit publication boundary: never copy the repository wholesale.
export const PUBLIC_FILES=['index.html','app.css','studio.css','tokens.css','manual.html','manual.css','site.webmanifest','favicon.ico','apple-touch-icon.png','dist/app.js','dist/worker.js','assets/icon.svg','assets/safari-pinned-tab.svg','assets/favicon-16.png','assets/favicon-32.png','assets/icon-192.png','assets/icon-512.png','assets/icon-maskable-512.png'];
await mkdir(output,{recursive:true});
async function inspect(dir,prefix=''){
  for(const entry of await readdir(dir,{withFileTypes:true})){
    const name=prefix+entry.name;
    if(entry.isDirectory())await inspect(join(dir,entry.name),`${name}/`);
    else if(!entry.isFile()||!PUBLIC_FILES.includes(name)&&name!=='.nojekyll')throw new Error(`Unexpected file in _site; refusing to publish it: ${name}`);
  }
}
await inspect(output);
for(const name of PUBLIC_FILES){await mkdir(dirname(join(output,name)),{recursive:true});await copyFile(join(root,name),join(output,name));}
await writeFile(join(output,'.nojekyll'),'');
console.log(`Static publication bundle: _site/ (${PUBLIC_FILES.length+1} files; no source, tests or evidence)`);
