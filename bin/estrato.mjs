#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {readJson,atomicWrite} from '../src/io.mjs';
import {validate,compileProject,buildProject,checkBundle,writeScan,importArchitecture,diffProjects,startPreview} from '../src/index.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const help=`Estrato 0.1.0 · Documentação de arquitetura sem marca no resultado

Uso:
  estrato init [project.json] [--name "Meu projeto"]
  estrato scan <pasta> [--out .estrato] [--name "Meu projeto"]
  estrato validate <project.json> [--repo <pasta>] [--strict] [--json]
  estrato build <project.json> [--out docs/architecture] [--theme paper|limestone|graphite]
  estrato render <project.json> [--out docs/architecture]
  estrato check <pasta-da-documentacao> [--json]
  estrato import <architecture.json> [--out project.json] [--json]
  estrato diff <before.json> <after.json> [--out delta.json]
  estrato dev <project.json> [--port 0] [--repo <pasta>]
  estrato serve <index.html> [--port 0]
  estrato skill print
  estrato skill install [--agent codex|claude|cursor|portable] [--project <pasta> | --global]
  estrato doctor

Opções:
  --force     Atualiza saídas gerenciadas ou arquivos explicitamente selecionados.
  --strict    Trata avisos como falhas. Não certifica a semântica do código.
  --json      Recibo JSON estruturado, inclusive em falhas.
  --help      Mostra este texto.
  --version   Mostra a versão.

O scanner cria um rascunho, não uma análise semântica automática. Use a skill
para ler o código, explicar jornadas e preencher fontes e capítulos.
Nenhuma API, conta, chave ou dependência instalada é necessária para renderizar.
`;
const definitions={help:{type:'boolean',short:'h'},version:{type:'boolean'},out:{type:'string',short:'o'},name:{type:'string'},theme:{type:'string'},repo:{type:'string'},strict:{type:'boolean'},json:{type:'boolean'},force:{type:'boolean'},port:{type:'string'},agent:{type:'string'},project:{type:'string'},global:{type:'boolean'}};
function expected(args,min,max=min){if(args.length<min||args.length>max)throw new Error('Quantidade de argumentos inválida. Execute estrato --help.');}
let parsed;
try{
  parsed=parseArgs({options:definitions,allowPositionals:true,strict:true});const o=parsed.values,[command,...args]=parsed.positionals;
  const emit=(object,summary)=>console.log(o.json?JSON.stringify(object,null,2):summary||JSON.stringify(object,null,2));
  if(o.version){console.log('0.1.0');}
  else if(o.help||!command){console.log(help);}
  else {
    const allowed={init:['name','force'],scan:['out','name','force'],validate:['repo','strict','theme'],build:['out','repo','strict','theme','force'],render:['out','repo','strict','theme','force'],check:[],import:['out','force'],diff:['out','force'],dev:['port','repo','strict','theme'],serve:['port'],skill:['agent','project','global','force'],doctor:[]};
    if(!allowed[command])throw new Error(`Comando desconhecido: ${command}`);
    for(const key of Object.keys(o))if(!['json','help','version'].includes(key)&&!allowed[command].includes(key))throw new Error(`--${key} não é aceito por ${command}.`);
    if(command==='init'){
      expected(args,0,1);const p={schemaVersion:1,project:{name:o.name||'Meu projeto',description:'Arquitetura e funcionamento',theme:'paper',language:'pt-BR',scope:'Rascunho autoral. Revise o código e vincule evidências antes de publicar.'},maps:[{id:'context',title:'O sistema em uma página',section:'Arquitetura',summary:'Substitua este componente pelos elementos reais do projeto.',type:'architecture',nodes:[{id:'system',label:o.name||'Meu projeto',kind:'backend',description:'Responsabilidade ainda não documentada.',status:'proposed'}],edges:[]}],guide:[{id:'overview',title:'Comece por aqui',body:'Descreva o objetivo do sistema e separe implementação observada, inferência e proposta.'}],evidence:[],findings:[],decisions:[]};
      const target=atomicWrite(args[0]||'project.json',JSON.stringify(p,null,2)+'\n',{overwrite:!!o.force});emit({ok:true,path:target},`Criado: ${target}`);
    } else if(command==='scan'){expected(args,1);const result=writeScan(args[0],o.out||'.estrato',o);emit({ok:true,...result},`Inventário: ${result.files} arquivos · ${result.maps} mapas iniciais\nSaída: ${result.out}\n${result.warnings.length} avisos. Leia CONTEXT.md antes de completar project.json.`);}
    else if(command==='validate'){expected(args,1);const result=compileProject(readJson(args[0]),o).receipt;emit(result,`Válido: ${result.errors} erros, ${result.warnings} avisos. Origens verificadas: ${result.verified}/${result.evidenceRefs}.`);}
    else if(command==='build'||command==='render'){expected(args,1);const result=buildProject(args[0],o.out||'docs/architecture',o);emit(result,`Gerados ${result.maps} mapas.\nAbra: ${result.entry}\nValidação: ${result.receipt.errors} erros, ${result.receipt.warnings} avisos.`);}
    else if(command==='check'){expected(args,1);const result=checkBundle(args[0]);emit(result,`${result.ok?'Íntegro':'Falhou'}: ${result.checks.length} arquivos conferidos.`);if(!result.ok)process.exitCode=2;}
    else if(command==='import'){expected(args,1);const result=importArchitecture(readJson(args[0]));const target=atomicWrite(o.out||'project.json',JSON.stringify(result.project,null,2)+'\n',{overwrite:!!o.force});emit({ok:true,path:target,warnings:result.warnings},`Fonte importada: ${target}\n${result.warnings.map(w=>'Aviso: '+w).join('\n')}\nExecute validate antes de publicar.`);}
    else if(command==='diff'){expected(args,2);const result=diffProjects(readJson(args[0]),readJson(args[1]));if(o.out)atomicWrite(o.out,JSON.stringify(result,null,2)+'\n',{overwrite:!!o.force});emit(result);}
    else if(command==='dev'||command==='serve'){expected(args,1);const port=o.port===undefined?0:Number(o.port);if(!Number.isInteger(port)||port<0||port>65535)throw new Error('--port deve ser um inteiro de 0 a 65535.');const preview=await startPreview(args[0],{...o,port,watch:command==='dev',onUpdate:r=>console.error(r.ok?'Prévia atualizada.':'Mantida última versão válida: '+r.error)});emit({ok:true,url:preview.url},`Prévia local: ${preview.url}\nCtrl+C encerra. Somente este documento é servido.`);for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await preview.close();process.exit(0);});}
    else if(command==='skill'){
      expected(args,1);const source=path.join(root,'skills','estrato');if(args[0]==='print')console.log(fs.readFileSync(path.join(source,'SKILL.md'),'utf8'));
      else if(args[0]==='install'){
        if(o.global&&o.project)throw new Error('Escolha --global ou --project, não ambos.');
        const agent=o.agent||'portable',locations={codex:'.agents/skills',claude:'.claude/skills',cursor:'.cursor/skills',portable:'.agents/skills'};if(!locations[agent])throw new Error('Agente inválido: codex, claude, cursor ou portable.');const base=o.global?os.homedir():path.resolve(o.project||'.'),target=path.join(base,locations[agent],'estrato');
        if(fs.existsSync(target)){if(!o.force)throw new Error('A skill já existe. Use --force para substituí-la.');if(fs.lstatSync(target).isSymbolicLink())throw new Error('Destino da skill é um link simbólico.');}
        fs.mkdirSync(target,{recursive:true});fs.cpSync(source,target,{recursive:true,dereference:false});emit({ok:true,path:target},`Skill instalada: ${target}\nO executável estrato deve estar no PATH do agente.`);
      }else throw new Error('Use skill print ou skill install.');
    }else if(command==='doctor'){expected(args,0);const checks={node:process.versions.node,minimumNode:'20',supported:Number(process.versions.node.split('.')[0])>=20,runtimeDependencies:0,networkRequired:false,renderer:fs.existsSync(path.join(root,'src/viewer/runtime.js')),skill:fs.existsSync(path.join(root,'skills/estrato/SKILL.md'))};emit({ok:checks.supported&&checks.renderer&&checks.skill,...checks});}
  }
}catch(error){const output={ok:false,...(error.receipt||{}),error:error.message};if(process.argv.includes('--json'))console.log(JSON.stringify(output,null,2));else {console.error(`Erro: ${error.message}`);for(const d of error.receipt?.diagnostics||[])console.error(`[${d.severity}] ${d.code} · ${d.subject}: ${d.message}`);}process.exitCode=2;}
