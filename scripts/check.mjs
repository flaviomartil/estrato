import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
let count=0;
function walk(dir){for(const f of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,f.name);if(f.isDirectory())walk(p);else if(p.endsWith('.mjs')||p.endsWith('.js')){const r=spawnSync(process.execPath,['--check',p],{encoding:'utf8'});if(r.status)throw new Error(r.stderr);count++;}}}
for(const dir of ['src','bin','scripts','test'])walk(dir);console.log(`${count} arquivos JavaScript com sintaxe válida.`);
