import fs from 'node:fs';
import { sha256, sourceFile } from './io.mjs';
export const TYPES = ['architecture','workflow','sequence','dataflow','lifecycle'];
export const THEMES = ['paper','limestone','graphite'];
const ID = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,95}$/;
const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const list = x => Array.isArray(x) ? x : [];
const text = x => typeof x === 'string';
const STATUSES = ['observed','inferred','proposed'];
export function validate(project, {repo, strict=false} = {}) {
  const diagnostics=[]; let verified=0, evidenceRefs=0;
  const issue = (code, subject, message, severity='error') => diagnostics.push({code,subject,message,severity});
  const strings = (obj, keys, where) => { for(const key of keys) if(obj[key] !== undefined && !text(obj[key])) issue('type/string',`${where}.${key}`,'Esperado texto.'); };
  const unknown = (obj, keys, where) => { for(const key of Object.keys(obj)) if(!keys.includes(key)) issue('schema/unknown-key',`${where}.${key}`,'Campo desconhecido. Corrija a grafia ou remova o campo.'); };
  const ids = (items,where) => { const seen=new Set(); items.forEach((item,i)=> { if(!plain(item)) return issue('type/object',`${where}[${i}]`,'Esperado objeto.'); if(!text(item.id)||!ID.test(item.id)) issue('id/invalid',`${where}[${i}]`,'ID inválido: use letras, números, ponto, hífen ou sublinhado.'); if(seen.has(item.id)) issue('id/duplicate',where,`ID duplicado: ${item.id}`); seen.add(item.id); }); return seen; };
  if(!plain(project)) return {ok:false,diagnostics:[{code:'schema/root',subject:'$',message:'Esperado objeto JSON.',severity:'error'}],verified:0};
  unknown(project,['schemaVersion','project','maps','guide','evidence','findings','decisions'],'$');
  if(project.schemaVersion!==1) issue('schema/version','schemaVersion','schemaVersion precisa ser 1.');
  if(!plain(project.project)) issue('schema/project','project','Metadados do projeto são obrigatórios.');
  else {
    unknown(project.project,['name','description','version','snapshot','scope','theme','language'],'project');
    strings(project.project,['name','description','version','snapshot','scope','theme','language'],'project');
    if(!text(project.project.name)||!project.project.name.trim()) issue('project/name','project.name','Dê um nome ao projeto.');
    if(project.project.language && project.project.language !== 'pt-BR') issue('project/language','project.language','A interface desta versão é pt-BR. O conteúdo autoral pode usar outros idiomas.');
    if(project.project.theme && !THEMES.includes(project.project.theme)) issue('theme/invalid','project.theme',`Temas: ${THEMES.join(', ')}.`);
  }
  if(!Array.isArray(project.maps) || !project.maps.length) issue('maps/empty','maps','Inclua pelo menos um mapa.');
  if(list(project.maps).length>80) issue('limit/maps','maps','Máximo de 80 mapas por documento.');
  for(const key of ['guide','evidence','findings','decisions']) if(project[key]!==undefined && !Array.isArray(project[key])) issue('type/array',key,'Esperada lista.');
  const evidences=ids(list(project.evidence),'evidence');
  function evidenceLinks(obj,where) {
    if(obj.evidence!==undefined && !Array.isArray(obj.evidence)) issue('type/array',where+'.evidence','Esperada lista de IDs.');
    for(const id of list(obj.evidence)) if(!evidences.has(id)) issue('evidence/missing',where,`Referência inexistente: ${id}`);
    if(obj.status!==undefined && !STATUSES.includes(obj.status)) issue('status/invalid',where,'Use observed, inferred ou proposed.');
    if(obj.status==='observed' && !list(obj.evidence).length) issue('evidence/unbacked',where,'Item marcado como observado sem evidência.', 'warning');
  }
  ids(list(project.maps),'maps');
  for(const [mi,m] of list(project.maps).entries()) {
    if(!plain(m))continue; const where=`maps[${mi}]`;
    unknown(m,['id','title','section','summary','type','direction','nodes','edges','groups','steps','notes'],where);
    strings(m,['title','section','summary','type','direction'],where);
    if(!text(m.title)||!m.title.trim())issue('map/title',where,'Mapa sem título.');
    if(!TYPES.includes(m.type))issue('map/type',where,`Tipos: ${TYPES.join(', ')}.`);
    if(m.direction!==undefined && !['LR','TB'].includes(m.direction))issue('map/direction',where,'Direção precisa ser LR ou TB.');
    if(!Array.isArray(m.nodes)||!m.nodes.length)issue('nodes/empty',where,'Inclua pelo menos um componente.');
    if(list(m.nodes).length>160)issue('limit/nodes',where,'Máximo de 160 componentes; divida a vista.');
    if(!Array.isArray(m.edges))issue('type/array',where+'.edges','edges precisa ser uma lista.');
    if(list(m.edges).length>500)issue('limit/edges',where,'Máximo de 500 relações.');
    if(list(m.nodes).length>20)issue('quality/density',where,'Mais de 20 componentes: considere dividir a vista.','warning');
    const nodeIds=ids(list(m.nodes),where+'.nodes');
    const edgeIds=ids(list(m.edges),where+'.edges');
    for(const n of list(m.nodes)) { if(!plain(n))continue;
      unknown(n,['id','label','subtitle','kind','description','evidence','status','position','size','owner','technology'],where+'.nodes.'+n.id);
      strings(n,['label','subtitle','kind','description','owner','technology'],where+'.nodes.'+n.id);
      if(!text(n.label)||!n.label.trim())issue('node/label',where+'.'+n.id,'Componente sem rótulo.');
      evidenceLinks(n,where+'.'+n.id);
      for(const key of ['position','size']) if(n[key]!==undefined && (!Array.isArray(n[key])||n[key].length!==2||n[key].some(x=>!Number.isFinite(x)||x<0||x>20000)))issue('layout/coordinates',where+'.'+n.id,`${key} precisa de dois números finitos entre 0 e 20000.`);
      if(n.size && (n.size[0]<200 || n.size[1]<126))issue('layout/node-size',where+'.'+n.id,'Tamanho mínimo: 200 × 126.');
    }
    const positioned=list(m.nodes).filter(n=>plain(n)&&n.position).length;
    if(positioned && positioned!==list(m.nodes).length)issue('layout/partial',where,'Posicione todos os componentes ou deixe todos automáticos.');
    for(const e of list(m.edges)){if(!plain(e))continue;
      unknown(e,['id','from','to','label','description','variant','evidence','status','via','labelAt'],where+'.edges.'+e.id);
      strings(e,['from','to','label','description','variant'],where+'.edges.'+e.id);
      if(!nodeIds.has(e.from)||!nodeIds.has(e.to))issue('edge/dangling',where+'.'+e.id,`Relação aponta para componente inexistente: ${e.from} → ${e.to}.`);
      if(e.variant!==undefined && !['default','emphasis','conditional'].includes(e.variant))issue('edge/variant',where+'.'+e.id,'Variante não suportada.');
      evidenceLinks(e,where+'.'+e.id);
      for(const p of [...list(e.via),...(e.labelAt?[e.labelAt]:[])]) if(!Array.isArray(p)||p.length!==2||p.some(x=>!Number.isFinite(x)||Math.abs(x)>30000))issue('layout/route',where+'.'+e.id,'Ponto de rota inválido.');
      if(e.via!==undefined && !Array.isArray(e.via))issue('type/array',where+'.'+e.id+'.via','via precisa ser uma lista de pontos.');
    }
    for(const key of ['groups','steps','notes'])if(m[key]!==undefined && !Array.isArray(m[key]))issue('type/array',where+'.'+key,'Esperada lista.');
    ids(list(m.groups),where+'.groups');
    for(const g of list(m.groups)){if(!plain(g))continue;unknown(g,['id','label','nodes'],where+'.groups.'+g.id);if(!text(g.label))issue('group/label',where,'Grupo sem rótulo.');if(!Array.isArray(g.nodes)||!g.nodes.length)issue('group/nodes',where,'Grupo sem lista de componentes.');for(const id of list(g.nodes))if(!nodeIds.has(id))issue('group/dangling',where,`Componente ausente no grupo: ${id}`);}
    for(const [i,s] of list(m.steps).entries()){if(!plain(s)){issue('type/object',where+'.steps','Passos devem ser objetos.');continue;}unknown(s,['title','description','nodes','edges'],where+'.steps.'+i);strings(s,['title','description'],where+'.steps.'+i);if(!text(s.title)||!s.title.trim())issue('step/title',where,'Passo sem título.');for(const [key,known]of [['nodes',nodeIds],['edges',edgeIds]]){if(s[key]!==undefined && !Array.isArray(s[key]))issue('type/array',where+'.steps.'+i+'.'+key,'Esperada lista de IDs.');for(const id of list(s[key]))if(!known.has(id))issue('step/dangling',where,`Passo referencia ${key} inexistente: ${id}`);}}
    for(const note of list(m.notes)){if(!plain(note)||!text(note.title)||!text(note.text))issue('note/invalid',where,'Notas precisam de title e text.');else unknown(note,['title','text'],where+'.notes');}
  }
  ids(list(project.guide),'guide');
  for(const g of list(project.guide)){if(!plain(g))continue;unknown(g,['id','title','body'],'guide.'+g.id);if(!text(g.title)||!text(g.body))issue('guide/invalid','guide.'+g.id,'Capítulos precisam de title e body.');}
  for(const ev of list(project.evidence)){if(!plain(ev))continue;
    unknown(ev,['id','title','note','references'],'evidence.'+ev.id);
    strings(ev,['title','note'],'evidence.'+ev.id);if(!text(ev.title))issue('evidence/title',ev.id,'Evidência sem título.');
    if(!Array.isArray(ev.references)||!ev.references.length)issue('evidence/empty',ev.id,'Evidência precisa de ao menos uma origem.');
    for(const r of list(ev.references)){evidenceRefs++;if(!plain(r)){issue('evidence/reference',ev.id,'Referência inválida.');continue;}
      unknown(r,['path','start','end','sha256','excerpt'],'evidence.'+ev.id);
      if(!text(r.path)||!r.path||r.path.startsWith('/')||r.path.includes('\\')||r.path.split('/').includes('..')||/^[a-z]:/i.test(r.path))issue('evidence/path',ev.id,'Caminho relativo e seguro é obrigatório.');
      if(!Number.isInteger(r.start)||!Number.isInteger(r.end)||r.start<1||r.end<r.start)issue('evidence/lines',ev.id,'Intervalo de linhas inválido.');
      if(r.sha256!==undefined&&!/^[a-f0-9]{64}$/.test(r.sha256))issue('evidence/hash',ev.id,'Hash SHA-256 inválido.');
      if(r.excerpt!==undefined&&!text(r.excerpt))issue('evidence/excerpt',ev.id,'Trecho deve ser texto.');
      if(repo)try{const buf=fs.readFileSync(sourceFile(repo,r.path));const lines=buf.toString('utf8').split('\n');if(lines.at(-1)==='')lines.pop();
        if(r.end>lines.length)issue('evidence/range',ev.id,'Intervalo excede o arquivo atual.');
        else if(r.sha256&&sha256(buf)!==r.sha256)issue('evidence/drift',ev.id,`Arquivo mudou: ${r.path}.`);
        else {verified++; if(!r.sha256)issue('evidence/no-hash',ev.id,'Arquivo existe, mas a versão não está fixada por hash.','warning');}
      }catch(error){issue('evidence/unreadable',ev.id,`${r.path}: ${error.message}`);}
    }
  }
  for(const key of ['findings','decisions']) { ids(list(project[key]),key);for(const item of list(project[key])){if(!plain(item))continue;unknown(item,['id','title','description','severity','status','evidence'],key+'.'+item.id);if(!text(item.title)||!text(item.description))issue('finding/invalid',key,'Itens precisam de título e descrição.');if(item.severity && !['info','warning','critical'].includes(item.severity))issue('finding/severity',key,'Use info, warning ou critical.');evidenceLinks(item,key+'.'+item.id);}}
  const errors=diagnostics.filter(x=>x.severity==='error').length;const warnings=diagnostics.length-errors;
  return {ok:errors===0&&(!strict||warnings===0),errors,warnings,diagnostics,verified,evidenceRefs,sourceVerification:repo?'checked-locally':'not-requested'};
}
export function assertValid(project, options) {const receipt=validate(project,options);if(!receipt.ok){const error=new Error('Documento inválido. Consulte os diagnósticos.');error.receipt=receipt;throw error;}return receipt;}
