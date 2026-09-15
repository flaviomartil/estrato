import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath}from'node:url';
export const root=fileURLToPath(new URL('..',import.meta.url));
export const example=()=>JSON.parse(fs.readFileSync(path.join(root,'examples/plataforma.json'),'utf8'));
export const minimal=()=>({schemaVersion:1,project:{name:'Projeto de teste',theme:'paper',language:'pt-BR'},maps:[{id:'overview',title:'Visão geral',type:'architecture',nodes:[{id:'a',label:'Entrada',kind:'frontend'},{id:'b',label:'API',kind:'backend'},{id:'c',label:'Banco',kind:'database'}],edges:[{id:'ab',from:'a',to:'b',label:'HTTP'},{id:'bc',from:'b',to:'c',label:'leitura'}]}],guide:[],evidence:[],findings:[],decisions:[]});
export function temporary(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'architecture-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;}
