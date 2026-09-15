import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';

export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const safeJson = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
export const slug = value => String(value || 'documento').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90) || 'documento';
export const isWithin = (root, target) => { const r = path.relative(root, target); return r === '' || (!r.startsWith(`..${path.sep}`) && r !== '..' && !path.isAbsolute(r)); };
export function readJson(file) {
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size > 24 * 1024 * 1024) throw new Error('A entrada deve ser um JSON de até 24 MB.');
  try { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/,'')); }
  catch (error) { throw new Error(`JSON inválido em ${path.basename(file)}: ${error.message}`); }
}
export function atomicWrite(file, contents, {overwrite = true} = {}) {
  const target = path.resolve(file);
  fs.mkdirSync(path.dirname(target), {recursive:true});
  if (fs.existsSync(target)) {
    if (!overwrite) throw new Error(`O arquivo já existe: ${target}. Use --force para substituí-lo.`);
    if (!fs.lstatSync(target).isFile()) throw new Error('O destino não é um arquivo regular.');
  }
  const temporary = `${target}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
  try { fs.writeFileSync(temporary, contents, {flag:'wx', mode:0o600}); fs.renameSync(temporary, target); }
  finally { if(fs.existsSync(temporary)) fs.unlinkSync(temporary); }
  return target;
}
/** Resolve evidence inside one trusted repository; never follow an escaping symlink. */
export function sourceFile(root, relative) {
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative) || /^[a-z]:/i.test(relative) || relative.includes('\\') || relative.split('/').includes('..')) throw new Error('Caminho de origem inseguro.');
  const realRoot = fs.realpathSync(root);
  const realFile = fs.realpathSync(path.resolve(realRoot, relative));
  if (!isWithin(realRoot, realFile) || !fs.statSync(realFile).isFile()) throw new Error('Origem fora do repositório ou não regular.');
  if (fs.statSync(realFile).size > 8*1024*1024) throw new Error('Origem acima do limite de 8 MB.');
  return realFile;
}
/** Directory transaction. The previous successful bundle is retained if commit fails. */
export function commitDirectory(target, produce, {force=false, input} = {}) {
  target = path.resolve(target);
  if (target === path.parse(target).root || target === process.cwd()) throw new Error('Escolha uma subpasta dedicada para a documentação.');
  if (input && isWithin(target, path.resolve(input))) throw new Error('O destino não pode conter o JSON de entrada.');
  if (fs.existsSync(target)) {
    const stat = fs.lstatSync(target);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Destino precisa ser uma pasta regular, não um link.');
    const own = fs.existsSync(path.join(target,'.architecture-output'));
    if (!own && fs.readdirSync(target).length) throw new Error('Pasta não gerenciada e não vazia. Nenhum arquivo foi alterado.');
    if (own && !force) throw new Error('A documentação já existe. Use --force para atualizar.');
  }
  const parent = path.dirname(target);
  fs.mkdirSync(parent,{recursive:true});
  const stage = fs.mkdtempSync(path.join(parent, '.documentation-stage-'));
  const backup = stage + '-previous';
  let saved = false;
  try {
    produce(stage);
    fs.writeFileSync(path.join(stage,'.architecture-output'),'1\n');
    if (fs.existsSync(target)) { fs.renameSync(target,backup); saved=true; }
    try { fs.renameSync(stage,target); }
    catch(error) { if(saved) fs.renameSync(backup,target); throw error; }
    if(saved) fs.rmSync(backup,{recursive:true,force:true});
  } finally { if(fs.existsSync(stage)) fs.rmSync(stage,{recursive:true,force:true}); }
  return target;
}
