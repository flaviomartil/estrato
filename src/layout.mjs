/** Deterministic layered layout, SCC condensation and obstacle-aware orthogonal routing. */
const W=244, H=126, GX=164, GY=88, PAD=64;
const intersects = (a,b,pad=0) => a.x < b.x+b.w+pad && a.x+a.w+pad>b.x && a.y<b.y+b.h+pad && a.y+a.h+pad>b.y;
const rect = n => ({x:n.x,y:n.y,w:n.w,h:n.h});
export {intersects};
function ranks(nodes, edges) {
  const adj=new Map(nodes.map(n=>[n.id,[]]));
  for(const e of edges)adj.get(e.from)?.push(e.to);
  let counter=0;const indices=new Map(),low=new Map(),stack=[],active=new Set(),components=[];
  function visit(id){indices.set(id,counter);low.set(id,counter++);stack.push(id);active.add(id);
    for(const to of adj.get(id)||[]){if(!indices.has(to)){visit(to);low.set(id,Math.min(low.get(id),low.get(to)));}else if(active.has(to))low.set(id,Math.min(low.get(id),indices.get(to)));}
    if(low.get(id)===indices.get(id)){const group=[];let v;do{v=stack.pop();active.delete(v);group.push(v);}while(v!==id);components.push(group);}
  }
  for(const n of nodes)if(!indices.has(n.id))visit(n.id);
  const component=new Map();components.forEach((c,i)=>c.forEach(id=>component.set(id,i)));
  const dag=components.map(()=>new Set()),indegree=components.map(()=>0),rank=components.map(()=>0);
  for(const e of edges){const a=component.get(e.from),b=component.get(e.to);if(a!==b&&!dag[a].has(b)){dag[a].add(b);indegree[b]++;}}
  const queue=indegree.map((d,i)=>d===0?i:-1).filter(i=>i>=0);
  while(queue.length){const c=queue.shift();for(const to of dag[c]){rank[to]=Math.max(rank[to],rank[c]+1);if(--indegree[to]===0)queue.push(to);}}
  return new Map(nodes.map(n=>[n.id,rank[component.get(n.id)]]));
}
function sides(a,b){if(a.id===b.id)return ['right','top'];const dx=(b.x+b.w/2)-(a.x+a.w/2),dy=(b.y+b.h/2)-(a.y+a.h/2);return Math.abs(dx)/Math.max(a.w,b.w)>Math.abs(dy)/Math.max(a.h,b.h)?(dx>=0?['right','left']:['left','right']):(dy>=0?['bottom','top']:['top','bottom']);}
function port(n,side,index,total){const ratio=(index+1)/(total+1);return side==='left'?[n.x,n.y+n.h*ratio]:side==='right'?[n.x+n.w,n.y+n.h*ratio]:side==='top'?[n.x+n.w*ratio,n.y]:[n.x+n.w*ratio,n.y+n.h];}
function outward(p,side,d=24){return [p[0]+(side==='left'?-d:side==='right'?d:0),p[1]+(side==='top'?-d:side==='bottom'?d:0)];}
function clearSegment(a,b,boxes,padding=10){
  return !boxes.some(n=>{const x1=n.x-padding,x2=n.x+n.w+padding,y1=n.y-padding,y2=n.y+n.h+padding;
    if(Math.abs(a[1]-b[1])<0.001)return a[1]>y1&&a[1]<y2&&Math.max(a[0],b[0])>x1&&Math.min(a[0],b[0])<x2;
    if(Math.abs(a[0]-b[0])<0.001)return a[0]>x1&&a[0]<x2&&Math.max(a[1],b[1])>y1&&Math.min(a[1],b[1])<y2;
    return true;
  });
}
function simplify(points){const result=[];for(const p of points){const q=p.map(v=>Math.round(v*10)/10);const last=result.at(-1);if(last&&q[0]===last[0]&&q[1]===last[1])continue;const prev=result.at(-2);if(prev&&last&&((prev[0]===last[0]&&last[0]===q[0])||(prev[1]===last[1]&&last[1]===q[1])))result.pop();result.push(q);}return result;}
class Heap {constructor(){this.data=[];}push(item){let i=this.data.length;this.data.push(item);while(i){let p=(i-1)>>1;if(this.data[p].priority<=item.priority)break;this.data[i]=this.data[p];i=p;}this.data[i]=item;}pop(){const first=this.data[0],last=this.data.pop();if(this.data.length){let i=0;while(i*2+1<this.data.length){let c=i*2+1;if(c+1<this.data.length&&this.data[c+1].priority<this.data[c].priority)c++;if(this.data[c].priority>=last.priority)break;this.data[i]=this.data[c];i=c;}this.data[i]=last;}return first;}get length(){return this.data.length;}}
function route(start,end,boxes){
  for(const middle of [[[end[0],start[1]]],[[start[0],end[1]]]]){const points=[start,...middle,end];if(points.slice(1).every((p,i)=>clearSegment(points[i],p,boxes)))return simplify(points);}
  const xs=[start[0],end[0]],ys=[start[1],end[1]];
  for(const n of boxes){xs.push(n.x-24,n.x+n.w+24);ys.push(n.y-24,n.y+n.h+24);}
  const X=[...new Set(xs)].sort((a,b)=>a-b),Y=[...new Set(ys)].sort((a,b)=>a-b);
  const width=X.length,point=i=>[X[i%width],Y[Math.floor(i/width)]];
  const s=Y.indexOf(start[1])*width+X.indexOf(start[0]),t=Y.indexOf(end[1])*width+X.indexOf(end[0]);
  const heap=new Heap(),best=new Map(),previous=new Map(),segments=new Map();heap.push({key:`${s}:0`,cost:0,priority:0});best.set(`${s}:0`,0);
  let terminal,visited=0;
  while(heap.length && visited++<180000){const current=heap.pop();if(current.cost!==best.get(current.key))continue;const [index,direction]=current.key.split(':').map(Number);if(index===t){terminal=current.key;break;}const x=index%width,y=Math.floor(index/width),from=point(index);
    for(const [nx,ny,d]of [[x-1,y,1],[x+1,y,1],[x,y-1,2],[x,y+1,2]]){if(nx<0||ny<0||nx>=width||ny>=Y.length)continue;const next=ny*width+nx,p=point(next),seg=`${Math.min(index,next)}-${Math.max(index,next)}`;if(!segments.has(seg))segments.set(seg,clearSegment(from,p,boxes));if(!segments.get(seg))continue;
      const cost=current.cost+Math.abs(p[0]-from[0])+Math.abs(p[1]-from[1])+(direction&&direction!==d?32:0),key=`${next}:${d}`;
      if(cost<(best.get(key)??Infinity)){best.set(key,cost);previous.set(key,current.key);heap.push({key,cost,priority:cost+Math.abs(p[0]-end[0])+Math.abs(p[1]-end[1])});}
    }
  }
  if(!terminal)throw new Error('Não foi encontrada uma rota livre. Afaste os componentes ou divida a vista.');
  const points=[];for(let k=terminal;k;k=previous.get(k))points.push(point(Number(k.split(':')[0])));return simplify(points.reverse());
}
function edgeLines(text){const words=String(text||'').split(/\s+/),lines=[];let line='';for(const word of words){if((line+' '+word).trim().length>22&&line){lines.push(line);line=word;}else line=(line+' '+word).trim();}if(line)lines.push(line);if(lines.length>2){lines.length=2;lines[1]=lines[1].slice(0,21)+'…';}return lines.map(l=>l.length>26?l.slice(0,25)+'…':l);}
function labelPosition(points,text,boxes,placed){
  if(!text)return undefined;const lines=edgeLines(text),w=Math.max(32,Math.max(...lines.map(l=>l.length))*6.1+16),h=lines.length*14+10;
  const segments=points.slice(1).map((p,i)=>({a:points[i],b:p,length:Math.abs(p[0]-points[i][0])+Math.abs(p[1]-points[i][1])})).sort((a,b)=>b.length-a.length);
  for(const segment of segments){const {a,b}=segment;
    for(const ratio of [.5,.33,.67])for(const dy of [-15,15,-34,34,-84,84])for(const dx of (a[0]===b[0]?[0,-(w/2+16),w/2+16,-(w+18),w+18]:[0])){const x=a[0]+(b[0]-a[0])*ratio+dx,y=a[1]+(b[1]-a[1])*ratio+dy,box={x:x-w/2,y:y-h/2,w,h};if(y-h/2>=8 && ![...boxes,...placed].some(n=>intersects(box,n,5))){placed.push(box);return {x,y,w,h,lines,collision:false};}}
  }
  const s=segments[0];const x=(s.a[0]+s.b[0])/2,y=(s.a[1]+s.b[1])/2-15;const box={x:x-w/2,y:y-h/2,w,h};placed.push(box);return {x,y,w,h,lines,collision:true};
}
export function layout(map){
  if(map.type==='sequence')return sequence(map);
  let nodes=map.nodes.map(n=>({...n,w:n.size?.[0]||W,h:n.size?.[1]||H}));
  if(nodes.every(n=>n.position)){nodes=nodes.map(n=>({...n,x:n.position[0]+PAD,y:n.position[1]+PAD}));}
  else {const rank=ranks(nodes,map.edges),layers=new Map();for(const n of nodes){const r=rank.get(n.id);if(!layers.has(r))layers.set(r,[]);layers.get(r).push(n);}
    const horizontal=map.direction!=='TB';const maxLane=Math.max(...[...layers.values()].map(ns=>ns.length));
    nodes=nodes.map(n=>{const members=layers.get(rank.get(n.id)),i=members.indexOf(n),across=rank.get(n.id),along=i+(maxLane-members.length)/2;return {...n,x:PAD+(horizontal?across*(W+GX):along*(W+GX)),y:PAD+(horizontal?along*(H+GY):across*(H+GY))};});
  }
  const byId=new Map(nodes.map(n=>[n.id,n]));const diagnostics=[];
  for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++)if(intersects(nodes[i],nodes[j],14))diagnostics.push({code:'layout/overlap',severity:'error',subject:map.id,message:`Componentes sobrepostos ou sem respiro: ${nodes[i].id}, ${nodes[j].id}.`});
  if(diagnostics.some(d=>d.severity==='error'))return {nodes,edges:[],groups:[],width:1000,height:600,diagnostics};
  const planned=map.edges.map(e=>({...e,sides:sides(byId.get(e.from),byId.get(e.to))}));
  const usage=new Map();for(const e of planned){for(const [id,side,ref]of [[e.from,e.sides[0],e.id+'-from'],[e.to,e.sides[1],e.id+'-to']]){const key=id+':'+side;if(!usage.has(key))usage.set(key,[]);usage.get(key).push(ref);}}
  const placed=[];const edges=[];
  for(const e of planned){const a=byId.get(e.from),b=byId.get(e.to),[s1,s2]=e.sides;
    const aUsage=usage.get(a.id+':'+s1),bUsage=usage.get(b.id+':'+s2),from=port(a,s1,aUsage.indexOf(e.id+'-from'),aUsage.length),to=port(b,s2,bUsage.indexOf(e.id+'-to'),bUsage.length);
    let points;
    try{points=e.via?.length?[from,...e.via.map(p=>[p[0]+PAD,p[1]+PAD]),to]:[from,...route(outward(from,s1),outward(to,s2),nodes),to];points=simplify(points);
      for(let i=1;i<points.length;i++){const ignore=i===1?e.from:i===points.length-1?e.to:undefined;if(!clearSegment(points[i-1],points[i],nodes.filter(n=>n.id!==ignore),0))diagnostics.push({code:'layout/route-obstacle',severity:'error',subject:e.id,message:'Uma rota cruza um componente ou possui segmento não ortogonal.'});}
    }catch(error){diagnostics.push({code:'layout/unroutable',severity:'error',subject:e.id,message:error.message});points=[from,to];}
    const label=e.labelAt?{x:e.labelAt[0]+PAD,y:e.labelAt[1]+PAD,w:Math.max(32,Math.min(248,(e.label||'').length*6.1+16)),h:36,lines:edgeLines(e.label)}:labelPosition(points,e.label,nodes,placed);
    if(label?.collision)diagnostics.push({code:'layout/label-collision',severity:'warning',subject:e.id,message:'Rótulo congestionado. Use labelAt ou divida a vista.'});
    edges.push({...e,labelText:e.label,points,label});
  }
  const groups=(map.groups||[]).map(g=>{const ns=g.nodes.map(id=>byId.get(id));return {...g,x:Math.min(...ns.map(n=>n.x))-20,y:Math.min(...ns.map(n=>n.y))-34,w:Math.max(...ns.map(n=>n.x+n.w))-Math.min(...ns.map(n=>n.x))+40,h:Math.max(...ns.map(n=>n.y+n.h))-Math.min(...ns.map(n=>n.y))+54};}).filter(g=>g.nodes.length);
  const width=Math.max(720,...nodes.map(n=>n.x+n.w),...edges.flatMap(e=>e.points.map(p=>p[0])),...edges.filter(e=>e.label).map(e=>e.label.x+e.label.w/2))+PAD;
  const height=Math.max(350,...nodes.map(n=>n.y+n.h),...edges.flatMap(e=>e.points.map(p=>p[1])),...edges.filter(e=>e.label).map(e=>e.label.y+e.label.h/2))+PAD;
  return {nodes,edges,groups,width:Math.ceil(width),height:Math.ceil(height),diagnostics};
}
function sequence(map){
  const nodes=map.nodes.map((n,i)=>({...n,x:PAD+i*310,y:PAD,w:244,h:126})),byId=new Map(nodes.map(n=>[n.id,n]));
  const edges=map.edges.map((e,i)=>{const a=byId.get(e.from),b=byId.get(e.to),y=252+i*84,ax=a.x+a.w/2,bx=b.x+b.w/2;const points=a.id===b.id?[[ax,y],[ax+80,y],[ax+80,y+35],[ax,y+35]]:[[ax,y],[bx,y]];return {...e,labelText:e.label,points,label:{x:(ax+bx)/2+(a.id===b.id?80:0),y:y-22,w:Math.min(260,(e.label||'').length*6.1+34),h:38,lines:edgeLines((i+1)+'. '+(e.label||''))},order:i+1};});
  return {nodes,edges,groups:[],width:Math.max(720,nodes.length*310+PAD),height:Math.max(440,300+edges.length*84),diagnostics:[],sequence:true};
}
export function reach(map,id,direction='downstream') {const nodes=new Set([id]),edges=new Set(),queue=[id];while(queue.length){const current=queue.shift();for(const e of map.edges){const from=direction==='upstream'?e.to:e.from,to=direction==='upstream'?e.from:e.to;if(from===current){edges.add(e.id);if(!nodes.has(to)){nodes.add(to);queue.push(to);}}}}return {nodes:[...nodes],edges:[...edges]};}
export function shortestPath(map,from,to){const q=[from],prev=new Map([[from,null]]);while(q.length){const current=q.shift();if(current===to)break;for(const e of map.edges)if(e.from===current&&!prev.has(e.to)){prev.set(e.to,{node:current,edge:e.id});q.push(e.to);}}if(!prev.has(to))return null;const nodes=[],edges=[];for(let c=to;c;){nodes.unshift(c);const p=prev.get(c);if(!p)break;edges.unshift(p.edge);c=p.node;}return {nodes,edges};}
