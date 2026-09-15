import {slug} from './io.mjs';
/** Compatibility boundary: architecture v1 only; all dropped fields are disclosed. */
export function importArchitecture(source){
  if(source.diagram_type!=='architecture'||source.schema_version!==1||!Array.isArray(source.components))throw new Error('Importação suporta somente architecture schema_version 1. Outros tipos precisam ser modelados no formato próprio.');
  const warnings=[],lost=(obj,allowed,where)=>{for(const key of Object.keys(obj))if(!allowed.includes(key))warnings.push(`${where}.${key}: não importado.`);};
  lost(source,['schema_version','diagram_type','meta','components','connections','boundaries','cards','layout'],'$');
  lost(source.meta||{},['title','subtitle'],'meta');
  if(source.layout)warnings.push('layout: grade original não preservada; pos explícita é aceita.');
  const evidence=[];
  const nodes=source.components.map(c=>{lost(c,['id','type','label','sublabel','pos','size','sources'],'components.'+c.id);const refs=[];
    for(const [i,s]of (c.sources||[]).entries()){const id=`S-${slug(c.id)}-${i+1}`;evidence.push({id,title:s.label||c.label,references:[{path:s.path,start:s.line||1,end:s.end_line||s.line||1}]});refs.push(id);}
    const n={id:c.id,label:c.label,subtitle:c.sublabel||'',kind:c.type||'backend',evidence:refs};if(c.pos)n.position=c.pos;if(c.size)n.size=[Math.max(200,c.size[0]),Math.max(126,c.size[1])];return n;});
  if(nodes.some(n=>n.position)&&!nodes.every(n=>n.position)){nodes.forEach(n=>delete n.position);warnings.push('Posicionamento parcial substituído por layout automático.');}
  const map={id:slug(source.meta?.title||'arquitetura'),title:source.meta?.title||'Arquitetura do sistema',section:'Arquitetura',summary:source.meta?.subtitle||'',type:'architecture',nodes,edges:(source.connections||[]).map((e,i)=>{lost(e,['id','from','to','label','variant'],'connections.'+(e.id||i));return {id:e.id||'edge-'+(i+1),from:e.from,to:e.to,label:e.label||'',variant:['default','emphasis','conditional'].includes(e.variant)?e.variant:'default'};}),groups:(source.boundaries||[]).map((g,i)=>({id:'boundary-'+i,label:g.label,nodes:g.wraps||[]})),notes:(source.cards||[]).map(c=>({title:c.title||'Nota',text:(c.items||[]).join('\n')}))};
  warnings.push('Rotas, presets, marcas, animações e validação geométrica originais não são reproduzidos. O documento passa pelas validações do novo motor.');
  return {project:{schemaVersion:1,project:{name:source.meta?.title||'Arquitetura do sistema',description:source.meta?.subtitle||'',theme:'paper',language:'pt-BR'},maps:[map],guide:[],evidence,findings:[],decisions:[]},warnings};
}
