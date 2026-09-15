import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {readJson,sha256} from './io.mjs';
import {compileProject} from './build.mjs';
export async function startPreview(input,{port=0,repo,theme,strict=false,watch=true,onUpdate=()=>{}}={}){
  const initial=watch?compileProject(readJson(input),{repo,theme,strict}):{html:fs.readFileSync(input,'utf8')};
  let html=initial.html,revision=sha256(html),error=null;
  const reload=`<script>(()=>{let rev=${JSON.stringify(revision)};setInterval(async()=>{try{const r=await fetch('/__revision');const s=await r.json();if(s.revision!==rev)location.reload();let b=document.getElementById('preview-error');if(s.error){if(!b){b=document.createElement('div');b.id='preview-error';b.style.cssText='position:fixed;bottom:10px;left:15px;right:15px;padding:12px;background:#fff2d6;color:#694119;border:1px solid #b08f51;z-index:9999;font:12px Arial';document.body.append(b);}b.textContent='Última versão válida preservada. '+s.error;}else b?.remove();}catch{}},900);})();</script>`;
  const server=http.createServer((request,response)=>{
    const host=request.headers.host,actual=server.address().port;
    if(![`127.0.0.1:${actual}`,`localhost:${actual}`].includes(host)){response.writeHead(403);response.end('Host não permitido.');return;}
    if(request.method!=='GET'&&request.method!=='HEAD'){response.writeHead(405);response.end();return;}
    response.setHeader('Cache-Control','no-store');response.setHeader('X-Content-Type-Options','nosniff');response.setHeader('Referrer-Policy','no-referrer');response.setHeader('X-Frame-Options','DENY');
    if(request.url==='/__revision'){response.setHeader('Content-Type','application/json');response.end(JSON.stringify({revision,error}));return;}
    if(request.url!=='/'&&request.url!=='/index.html'){response.writeHead(404);response.end('Não encontrado.');return;}
    response.setHeader('Content-Type','text/html; charset=utf-8');
    response.end(watch?html.replace("connect-src 'none'","connect-src 'self'").replace('</body>',reload.replace(JSON.stringify(sha256(initial.html)),JSON.stringify(revision))+'</body>'):html);
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  let running=false;
  const listener=()=>{if(running)return;running=true;try{const next=compileProject(readJson(input),{repo,theme,strict});html=next.html;revision=sha256(html);error=null;onUpdate({ok:true,revision});}catch(cause){error=cause.receipt?.diagnostics?.find(d=>d.severity==='error')?.message||cause.message;onUpdate({ok:false,error});}finally{running=false;}};
  if(watch)fs.watchFile(path.resolve(input),{interval:350},listener);
  return {server,url:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(resolve=>{if(watch)fs.unwatchFile(path.resolve(input),listener);server.close(resolve);server.closeAllConnections();})};
}
