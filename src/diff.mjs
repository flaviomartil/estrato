import {assertValid} from './validate.mjs';
function canonical(x){if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';if(x&&typeof x==='object')return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';return JSON.stringify(x);}
export function diffProjects(before,after){assertValid(before);assertValid(after);const changes=[];
  function collection(a,b,where){const old=new Map((a||[]).map(x=>[x.id,x])),now=new Map((b||[]).map(x=>[x.id,x]));for(const [id,item]of old){if(!now.has(id))changes.push({operation:'removed',path:where+'/'+id,before:item});else if(canonical(item)!==canonical(now.get(id)))changes.push({operation:'changed',path:where+'/'+id,before:item,after:now.get(id)});}for(const[id,item]of now)if(!old.has(id))changes.push({operation:'added',path:where+'/'+id,after:item});}
  if(canonical(before.project)!==canonical(after.project))changes.push({operation:'changed',path:'project',before:before.project,after:after.project});
  const old=new Map(before.maps.map(m=>[m.id,m])),now=new Map(after.maps.map(m=>[m.id,m]));
  for(const[id,m]of old){if(!now.has(id)){changes.push({operation:'removed',path:'maps/'+id,before:m});continue;}const n=now.get(id);collection(m.nodes,n.nodes,'maps/'+id+'/nodes');collection(m.edges,n.edges,'maps/'+id+'/edges');const {nodes:an,edges:ae,...am}=m,{nodes:bn,edges:be,...bm}=n;if(canonical(am)!==canonical(bm))changes.push({operation:'changed',path:'maps/'+id+'/metadata',before:am,after:bm});}
  for(const[id,m]of now)if(!old.has(id))changes.push({operation:'added',path:'maps/'+id,after:m});
  for(const key of ['guide','evidence','findings','decisions'])collection(before[key],after[key],key);
  return {schemaVersion:1,changed:changes.length>0,summary:{added:changes.filter(c=>c.operation==='added').length,removed:changes.filter(c=>c.operation==='removed').length,changed:changes.filter(c=>c.operation==='changed').length},changes,note:'Diferenças entre documentos autorais. Não representam impacto, risco operacional ou alterações detectadas automaticamente no código.'};
}
