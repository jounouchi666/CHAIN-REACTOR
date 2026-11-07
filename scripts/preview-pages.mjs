import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,relative,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../_site'),base='/chain-reactor/';
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
createServer(async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
  try{
    const path=new URL(req.url,'http://127.0.0.1').pathname;
    if(path==='/'){res.writeHead(302,{Location:base});res.end();return;}
    if(!path.startsWith(base))throw Error('Outside preview');
    const file=resolve(root,decodeURIComponent(path.slice(base.length)||'index.html')),local=relative(root,file);
    if(local.startsWith('..')||local.split(/[\\/]/).some(p=>p.startsWith('.')))throw Error('Private path');
    const data=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(4192,'127.0.0.1',()=>console.log(`Pages subdirectory preview: http://127.0.0.1:4192${base}`));
