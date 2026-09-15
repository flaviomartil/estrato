import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {validate}from'../src/validate.mjs';
import {sha256}from'../src/io.mjs';
import {minimal,example,temporary,root}from'./helpers.mjs';
test('minimal source validates',()=>assert.equal(validate(minimal()).ok,true));
test('all five illustrated diagram types validate with actual evidence hashes',()=>{const result=validate(example(),{repo:root,strict:true});assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.verified,1);});
for(const [name,change,code]of [
 ['numeric project name',p=>p.project.name=42,'type/string'],
 ['numeric map ID',p=>p.maps[0].id=3,'id/invalid'],
 ['numeric step title',p=>p.maps[0].steps=[{title:5}],'type/string'],
 ['empty boundary',p=>p.maps[0].groups=[{id:'g',label:'Empty',nodes:[]}],'group/nodes'],
 ['too short card',p=>p.maps[0].nodes[0].size=[244,100],'layout/node-size'],
 ['unknown note field',p=>p.maps[0].notes=[{title:'a',text:'b',hidden:true}],'schema/unknown-key'],
 ['schema version',p=>p.schemaVersion=2,'schema/version'],
 ['unknown root field',p=>p.mapps=[],'schema/unknown-key'],
 ['missing project',p=>delete p.project,'schema/project'],
 ['empty maps',p=>p.maps=[],'maps/empty'],
 ['invalid map type',p=>p.maps[0].type='mermaid','map/type'],
 ['duplicate nodes',p=>p.maps[0].nodes.push(p.maps[0].nodes[0]),'id/duplicate'],
 ['dangling edge',p=>p.maps[0].edges[0].to='missing','edge/dangling'],
 ['unsafe ID',p=>p.maps[0].id='../injection','id/invalid'],
 ['unknown theme',p=>p.project.theme='purple','theme/invalid'],
 ['missing evidence ID',p=>p.maps[0].nodes[0].evidence=['missing'],'evidence/missing'],
 ['partial positions',p=>p.maps[0].nodes[0].position=[20,30],'layout/partial'],
 ['nonfinite position',p=>p.maps[0].nodes.forEach(n=>n.position=[Infinity,0]),'layout/coordinates'],
 ['invalid group reference',p=>p.maps[0].groups=[{id:'g',label:'Grupo',nodes:['missing']}],'group/dangling'],
 ['invalid guided step',p=>p.maps[0].steps=[{title:'Passo',nodes:['missing']}],'step/dangling'],
 ['unknown node field',p=>p.maps[0].nodes[0].lable='x','schema/unknown-key'],
 ['unsupported locale',p=>p.project.language='en','project/language'],
 ['negative route point',p=>p.maps[0].edges[0].via=[[Infinity,5]],'layout/route'],
 ['invalid status',p=>p.maps[0].nodes[0].status='verified-production','status/invalid']
])test('rejects '+name,()=>{const p=minimal();change(p);const r=validate(p);assert.equal(r.ok,false);assert(r.diagnostics.some(d=>d.code===code));});
test('observed without sources is a warning and strict rejects it',()=>{const p=minimal();p.maps[0].nodes[0].status='observed';assert.equal(validate(p).ok,true);assert.equal(validate(p,{strict:true}).ok,false);});
test('evidence hash drift fails',t=>{const dir=temporary(t);fs.writeFileSync(path.join(dir,'file.js'),'original\n');const p=minimal();p.evidence=[{id:'E1',title:'Test',references:[{path:'file.js',start:1,end:1,sha256:sha256('changed\n')}]}];const r=validate(p,{repo:dir});assert.equal(r.ok,false);assert(r.diagnostics.some(d=>d.code==='evidence/drift'));});
test('missing evidence, invalid ranges and path traversal fail',t=>{const dir=temporary(t),p=minimal();p.evidence=[{id:'E1',title:'Test',references:[{path:'../outside',start:0,end:-1}]}];const r=validate(p,{repo:dir});assert.equal(r.ok,false);assert(r.diagnostics.some(d=>d.code==='evidence/path'));});
test('evidence cannot escape through symlinks',t=>{if(process.platform==='win32')return t.skip('Symlink privilege varies on Windows.');const dir=temporary(t),inside=path.join(dir,'repo');fs.mkdirSync(inside);fs.writeFileSync(path.join(dir,'secret'),'secret');fs.symlinkSync(path.join(dir,'secret'),path.join(inside,'link'));const p=minimal();p.evidence=[{id:'E1',title:'Test',references:[{path:'link',start:1,end:1}]}];assert.equal(validate(p,{repo:inside}).ok,false);});
test('line count rejects line after terminal newline',t=>{const dir=temporary(t);fs.writeFileSync(path.join(dir,'x'),'one\n');const p=minimal();p.evidence=[{id:'E1',title:'Test',references:[{path:'x',start:2,end:2}]}];assert.equal(validate(p,{repo:dir}).ok,false);});
test('root primitives always produce failure receipts',()=>{for(const value of [null,true,[],123,'text'])assert.equal(validate(value).ok,false);});
