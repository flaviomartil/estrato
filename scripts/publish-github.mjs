#!/usr/bin/env node
/**
 * Publish the reviewed CLI snapshot only. No credentials are read or embedded.
 * Default: local manifest check. --publish explicitly enables GitHub writes.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DEFAULT_ROOT = fileURLToPath(new URL('..', import.meta.url));
export const REPOSITORY = 'flaviomartil/estrato';
export const OWNER = 'flaviomartil';
const MANIFEST = 'scripts/github-publish-manifest.json';
const sha256 = data => createHash('sha256').update(data).digest('hex');
const within = (root, target) => {
  const relative = path.relative(root, target);
  return relative !== '' && !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`);
};

/** The manifest is a reviewed allowlist, not a certificate of authenticity. */
export function inspectSnapshot(root = DEFAULT_ROOT) {
  root = fs.realpathSync(root);
  const manifestFile = path.join(root, MANIFEST);
  if (fs.lstatSync(manifestFile).isSymbolicLink()) throw new Error('O manifesto não pode ser um link simbólico.');
  const manifestBytes = fs.readFileSync(manifestFile);
  const manifest = JSON.parse(manifestBytes);
  if (manifest.schemaVersion !== 1 || manifest.repository !== REPOSITORY || !Array.isArray(manifest.files) || !manifest.files.length) {
    throw new Error('Manifesto de publicação inválido. Use o pacote de publicação completo.');
  }
  const files = [], seen = new Set();
  for (const entry of manifest.files) {
    const relative = entry.path;
    if (typeof relative !== 'string' || !relative || path.isAbsolute(relative) || relative.includes('\\') || /^[a-z]:/i.test(relative)
        || relative.split('/').includes('..') || seen.has(relative) || relative === MANIFEST) {
      throw new Error('Caminho inseguro ou duplicado no manifesto.');
    }
    if (relative.split('/').some(part => /^\.git$|^\.env(?:\.|$)|^node_modules$|^\.estrato$|^IMP_|^italents-impmotordados/i.test(part))
        || /\.(?:pem|key|p12|pfx)$/i.test(relative)) {
      throw new Error(`Arquivo não permitido na publicação: ${relative}`);
    }
    const source = path.join(root, relative), real = fs.realpathSync(source);
    if (!within(root, real) || fs.lstatSync(source).isSymbolicLink() || !fs.statSync(real).isFile()) {
      throw new Error(`Origem não regular ou fora da raiz: ${relative}`);
    }
    const data = fs.readFileSync(real);
    if (!/^[a-f0-9]{64}$/.test(entry.sha256) || sha256(data) !== entry.sha256) {
      throw new Error(`Arquivo diferente do snapshot revisado: ${relative}. Nenhum envio foi feito.`);
    }
    seen.add(relative);
    files.push({ path: relative, data, mode: fs.statSync(real).mode & 0o777 });
  }
  for (const required of ['package.json', 'README.md', 'LICENSE', 'bin/estrato.mjs', 'skills/estrato/SKILL.md']) {
    if (!seen.has(required)) throw new Error(`Snapshot incompleto: ${required}`);
  }
  const pkg = JSON.parse(files.find(file => file.path === 'package.json').data);
  if (pkg.name !== '@flaviomartil/estrato') throw new Error('Este publicador aceita somente o pacote Estrato.');
  files.push({ path: MANIFEST, data: manifestBytes, mode: 0o644 });
  return { root, files, version: pkg.version };
}

function executeDefault(command, args, cwd) {
  const env = { ...process.env, GH_HOST: 'github.com', GH_PROMPT_DISABLED: '1', GH_PAGER: 'cat', GIT_TERMINAL_PROMPT: '0' };
  // Parent Git worktree settings must not redirect commands outside our staging directory.
  for (const name of Object.keys(env)) {
    if (['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES'].includes(name)
        || /^GIT_CONFIG_(?:COUNT|KEY_\d+|VALUE_\d+)$/.test(name)) delete env[name];
  }
  return spawnSync(command, args, { cwd, env, encoding: 'utf8', timeout: 120_000, maxBuffer: 12 * 1024 * 1024, shell: false });
}

export function publishSnapshot({ root = DEFAULT_ROOT, publish = false, execute = executeDefault, log = console.log } = {}) {
  if (Number(process.versions.node.split('.')[0]) < 20) throw new Error('Node.js 20 ou superior é necessário.');
  const snapshot = inspectSnapshot(root);
  log(`Snapshot: Estrato ${snapshot.version}; ${snapshot.files.length} arquivos permitidos.`);
  log(`Destino: ${REPOSITORY}; visibilidade: privada.`);
  if (!publish) {
    log('Verificação local concluída. Nenhuma conexão, criação de repositório ou envio foi feito.');
    log('Para publicar: node scripts/publish-github.mjs --publish');
    return { ok: true, published: false, repository: REPOSITORY, files: snapshot.files.length };
  }
  const command = (bin, args, cwd = snapshot.root, allowFailure = false) => {
    const result = execute(bin, args, cwd);
    if (!allowFailure && (result.error || result.status !== 0)) {
      const detail = result.error?.code === 'ENOENT'
        ? `${bin} não está no PATH. Instale-o antes de publicar.`
        : String(result.stderr || result.error?.message || result.stdout || 'Falha sem detalhes.').slice(0,3500);
      throw new Error(`${bin} ${args[0] || ''}: ${detail}`);
    }
    return result;
  };
  command('git', ['--version']);
  command('gh', ['--version']);
  const identity = JSON.parse(command('gh', ['api', '--hostname', 'github.com', 'user', '--jq', '{login: .login, id: .id, name: .name}']).stdout);
  if (identity.login?.toLowerCase() !== OWNER || !Number.isSafeInteger(identity.id) || identity.id <= 0) {
    throw new Error(`A conta autenticada precisa ser ${OWNER}. Nenhum repositório foi criado.`);
  }
  const existing = command('gh', ['api', '--hostname', 'github.com', `repos/${REPOSITORY}`], snapshot.root, true);
  if (existing.status === 0) throw new Error(`${REPOSITORY} já existe. Este publicador não altera repositórios existentes.`);
  if (!/HTTP 404|\(404\)/.test(existing.stderr || '')) {
    throw new Error('Não foi possível confirmar a ausência do repositório. Verifique acesso/rede no GitHub CLI; nada foi criado.');
  }
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'estrato-publish-'));
  let createAttempted = false;
  try {
    for (const file of snapshot.files) {
      const target = path.join(stage, file.path);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, file.data, { flag: 'wx', mode: file.mode });
    }
    // Only the frozen, allowlisted copy is tested and committed.
    log('Conferindo sintaxe e testes do snapshot isolado…');
    command(process.execPath, ['scripts/check.mjs'], stage);
    command(process.execPath, ['scripts/test.mjs'], stage);
    command('git', ['init', '--initial-branch=main'], stage);
    const hooks = path.join(stage, '.git', 'empty-hooks');
    fs.mkdirSync(hooks);
    command('git', ['config', '--local', 'core.hooksPath', hooks], stage);
    command('git', ['config', '--local', 'core.autocrlf', 'false'], stage);
    command('git', ['config', '--local', 'commit.gpgsign', 'false'], stage);
    command('git', ['config', '--local', 'user.name', identity.name || identity.login], stage);
    command('git', ['config', '--local', 'user.email', `${identity.id}+${identity.login}@users.noreply.github.com`], stage);
    command('git', ['add', '--', ...snapshot.files.map(file => file.path)], stage);
    command('git', ['commit', '-m', `Initial Estrato ${snapshot.version} architecture documentation CLI`], stage);
    const head = command('git', ['rev-parse', 'HEAD'], stage).stdout.trim();
    createAttempted = true;
    log('Criando o repositório privado…');
    command('gh', ['repo', 'create', REPOSITORY, '--private', '--source', stage, '--remote', 'origin', '--description', 'Documentação de arquitetura interativa, offline e sem marca no resultado.'], stage);
    const remote = JSON.parse(command('gh', ['api', '--hostname', 'github.com', `repos/${REPOSITORY}`], stage).stdout);
    if (remote.full_name?.toLowerCase() !== REPOSITORY || remote.private !== true) {
      throw new Error('O destino ou a privacidade não correspondem ao esperado. O código não foi enviado.');
    }
    // Force HTTPS in this isolated working copy only. Never edit global credential settings.
    command('git', ['remote', 'set-url', 'origin', `https://github.com/${REPOSITORY}.git`], stage);
    command('git', ['-c', 'credential.helper=', '-c', 'credential.https://github.com.helper=!gh auth git-credential', 'push', '--set-upstream', 'origin', 'main'], stage);
    const commit = JSON.parse(command('gh', ['api', '--hostname', 'github.com', `repos/${REPOSITORY}/commits/main`], stage).stdout);
    if (commit.sha !== head) throw new Error('O envio retornou, mas o commit remoto não foi confirmado. Verifique a cópia preservada.');
    const receipt = { ok: true, published: true, repository: REPOSITORY, private: true, url: remote.html_url, commit: head, files: snapshot.files.length, workingCopy: stage };
    fs.writeFileSync(path.join(stage, '.git', 'publication-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
    log(`Publicado e conferido: ${receipt.url}\nCommit: ${head}\nCópia Git local: ${stage}`);
    return receipt;
  } catch (error) {
    if (!createAttempted) fs.rmSync(stage, { recursive: true, force: true });
    else error.message += `\nUma criação remota pode ter ocorrido antes da falha. A cópia foi preservada em ${stage}. Nenhum repositório existente foi apagado ou sobrescrito.`;
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    if (args.some(arg => !['--publish', '--dry-run', '--help'].includes(arg)) || (args.includes('--publish') && args.includes('--dry-run'))) {
      throw new Error('Uso: node scripts/publish-github.mjs [--dry-run | --publish]');
    }
    if (args.includes('--help')) console.log('Sem opções: confere o snapshot local. --publish: cria flaviomartil/estrato privado e envia main. Requer Git e GitHub CLI autenticado como flaviomartil.');
    else publishSnapshot({ publish: args.includes('--publish') });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
