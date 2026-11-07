import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, relative, extname } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.wav':'audio/wav','.webm':'video/webm' };
createServer(async (req, res) => {
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end('Read only');return;}
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    if(url.pathname==='/__chain_reactor_health_v1'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({app:'chain-reactor',protocol:1}));return;}
    const file = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    const local=relative(root,file);
    if (local.startsWith('..')||local.split(/[\\/]/).some(part=>part.startsWith('.')||part==='node_modules')) throw new Error('outside public surface');
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; worker-src 'self'; style-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" }); res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(4191, '127.0.0.1', () => console.log('http://127.0.0.1:4191'));
