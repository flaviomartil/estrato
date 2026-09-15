import {escapeHtml as e,slug} from './io.mjs';
function inline(source){
  const tokens=[];const token=html=>`\u0000${tokens.push(html)-1}\u0000`;
  let text=String(source).replace(/`([^`\n]+)`/g,(_,code)=>token(`<code>${e(code)}</code>`));
  text=e(text).replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*\n]+)\*/g,'<em>$1</em>');
  text=text.replace(/\[([^\]]+)\]\(([^\s)]+)\)/g,(_,label,url)=>/^(https?:\/\/|#)/i.test(url)?`<a href="${url}" rel="noreferrer noopener"${url.startsWith('#')?'':' target="_blank"'}>${label}</a>`:`${label} (${url})`);
  return text.replace(/\u0000(\d+)\u0000/g,(_,id)=>tokens[Number(id)]||'');
}
/** Safe Markdown subset: no raw HTML, images, embeds or executable URLs. */
export function markdown(text){const lines=String(text||'').replace(/\r/g,'').split('\n');let out='',i=0;
  while(i<lines.length){const line=lines[i];if(!line.trim()){i++;continue;}
    if(/^```/.test(line)){const code=[];i++;while(i<lines.length&&!/^```/.test(lines[i]))code.push(lines[i++]);if(i<lines.length)i++;out+=`<pre><code>${e(code.join('\n'))}</code></pre>`;continue;}
    const heading=line.match(/^(#{1,5})\s+(.+)$/);if(heading){const level=Math.min(6,heading[1].length+1);out+=`<h${level} id="${slug(heading[2])}">${inline(heading[2])}</h${level}>`;i++;continue;}
    if(i+1<lines.length&&line.includes('|')&&/^\s*\|?\s*:?-{3,}/.test(lines[i+1])){const cells=l=>l.trim().replace(/^\||\|$/g,'').split('|').map(c=>c.trim());const heads=cells(line);i+=2;let rows='';while(i<lines.length&&lines[i].includes('|')&&lines[i].trim())rows+='<tr>'+cells(lines[i++]).map(c=>`<td>${inline(c)}</td>`).join('')+'</tr>';out+=`<div class="table-scroll"><table><thead><tr>${heads.map(c=>`<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;continue;}
    if(/^\s*[-*]\s+/.test(line)||/^\s*\d+\.\s+/.test(line)){const ordered=/^\s*\d+\./.test(line),tag=ordered?'ol':'ul',re=ordered?/^\s*\d+\.\s+/:/^\s*[-*]\s+/;let items='';while(i<lines.length&&re.test(lines[i]))items+=`<li>${inline(lines[i++].replace(re,''))}</li>`;out+=`<${tag}>${items}</${tag}>`;continue;}
    if(/^>\s?/.test(line)){out+=`<blockquote>${inline(line.replace(/^>\s?/,''))}</blockquote>`;i++;continue;}
    const para=[line];i++;while(i<lines.length&&lines[i].trim()&&!/^(#{1,5}\s|```|>\s|\s*[-*]\s|\s*\d+\.\s)/.test(lines[i])&&!(i+1<lines.length&&/^\s*\|?\s*:?-{3,}/.test(lines[i+1])))para.push(lines[i++]);out+=`<p>${inline(para.join(' '))}</p>`;
  }return out;
}
export function guideMarkdown(p){let text=`# ${p.project.name}\n\n${p.project.description||''}\n\n${p.project.scope||''}\n\n`;for(const chapter of p.guide||[])text+=`## ${chapter.title}\n\n${chapter.body}\n\n`;text+='## Mapas\n\n';for(const m of p.maps){text+=`### ${m.title}\n\n${m.summary||''}\n\n`;for(const step of m.steps||[])text+=`- **${step.title}**${step.description?': '+step.description:''}\n`;text+='\n';}return text;}
export function evidenceMarkdown(p){let text=`# Evidências · ${p.project.name}\n\n`;for(const ev of p.evidence||[]){text+=`## ${ev.id} · ${ev.title}\n\n${ev.note||''}\n\n`;for(const r of ev.references){text+=`Origem: \`${r.path}:${r.start}-${r.end}\`\n\n`;if(r.sha256)text+=`SHA-256: \`${r.sha256}\`\n\n`;if(r.excerpt)text+='```text\n'+r.excerpt.replace(/^```/gm,'\u200b```')+'\n```\n\n';}}return text;}
