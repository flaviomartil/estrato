import fs from 'node:fs';
import path from 'node:path';
import {assertValid} from './validate.mjs';
import {layout} from './layout.mjs';
import {renderSvg} from './svg.mjs';
import {renderHtml} from './render.mjs';
import {guideMarkdown,evidenceMarkdown} from './markdown.mjs';
import {readJson,sha256,commitDirectory,sourceFile} from './io.mjs';
export function compileProject(project,options={}){
  project=structuredClone(project);if(options.theme)project.project.theme=options.theme;
  const receipt=assertValid(project,options),rendered=[];
  for(const map of project.maps){const graph=layout(map);receipt.diagnostics.push(...graph.diagnostics);rendered.push({...map,svg:renderSvg(map,graph,project.project.theme||'paper'),width:graph.width,height:graph.height});}
  receipt.errors=receipt.diagnostics.filter(d=>d.severity==='error').length;
  receipt.warnings=receipt.diagnostics.filter(d=>d.severity==='warning').length;
  receipt.ok=!receipt.errors&&(!options.strict||!receipt.warnings);
  if(!receipt.ok){const error=new Error('Falha nas verificações. A última documentação válida foi preservada.');error.receipt=receipt;throw error;}
  const html=renderHtml(project,rendered);
  return {project,rendered,html,receipt};
}
export function buildProject(input,out,options={}){
  const compiled=compileProject(readJson(input),options);const {project,rendered,html,receipt}=compiled;
  let manifest;
  commitDirectory(out,stage=>{
    fs.mkdirSync(path.join(stage,'diagramas'));
    fs.writeFileSync(path.join(stage,'index.html'),html);
    fs.writeFileSync(path.join(stage,'architecture.json'),JSON.stringify(project,null,2)+'\n');
    fs.writeFileSync(path.join(stage,'GUIA.md'),guideMarkdown(project));
    fs.writeFileSync(path.join(stage,'EVIDENCIAS.md'),evidenceMarkdown(project));
    fs.writeFileSync(path.join(stage,'LEIA-ME.txt'),`Abra index.html no navegador. O documento funciona sem servidor e sem conexões externas.\n\nProjeto: ${project.project.name}\n${project.project.scope||''}\n\nFontes de diagramas: architecture.json\nGuia: GUIA.md\nEvidências: EVIDENCIAS.md\nVerificação desta geração: verificacao.json\n`);
    for(const m of rendered)fs.writeFileSync(path.join(stage,'diagramas',m.id+'.svg'),m.svg);
    const paths=['index.html','architecture.json','GUIA.md','EVIDENCIAS.md','LEIA-ME.txt',...rendered.map(m=>'diagramas/'+m.id+'.svg')];
    manifest={schemaVersion:1,sourceHash:sha256(JSON.stringify(project)),maps:rendered.length,checks:receipt,artifacts:paths.map(p=>({path:p,sha256:sha256(fs.readFileSync(path.join(stage,p)))}))};
    fs.writeFileSync(path.join(stage,'verificacao.json'),JSON.stringify(manifest,null,2)+'\n');
  },{force:options.force,input});
  return {ok:true,out:path.resolve(out),entry:path.resolve(out,'index.html'),maps:rendered.length,receipt,manifest};
}
export function checkBundle(directory){const manifest=readJson(path.join(directory,'verificacao.json'));if(manifest.schemaVersion!==1||!Array.isArray(manifest.artifacts))throw new Error('Recibo inválido.');const checks=[];for(const artifact of manifest.artifacts){try{const target=sourceFile(directory,artifact.path);checks.push({path:artifact.path,ok:sha256(fs.readFileSync(target))===artifact.sha256});}catch(error){checks.push({path:artifact.path,ok:false,error:error.message});}}return {ok:checks.length>0&&checks.every(c=>c.ok),checks};}
