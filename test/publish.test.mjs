import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { inspectSnapshot, publishSnapshot } from '../scripts/publish-github.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'publication-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const contents = { 'package.json': '{"name":"@flaviomartil/estrato","version":"0.1.0"}', 'README.md': 'Public readme', 'LICENSE': 'MIT', 'bin/estrato.mjs': '// cli', 'skills/estrato/SKILL.md': '# Skill' };
  const files = Object.entries(contents).map(([relative, text]) => {
    fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    fs.writeFileSync(path.join(root, relative), text);
    return { path: relative, sha256: createHash('sha256').update(text).digest('hex') };
  });
  fs.mkdirSync(path.join(root, 'scripts'));
  fs.writeFileSync(path.join(root, 'scripts/github-publish-manifest.json'), JSON.stringify({ schemaVersion: 1, repository: 'flaviomartil/estrato', files }));
  return root;
}
const ok = stdout => ({ status: 0, stdout: stdout || '', stderr: '' });
function fakeRunner({ owner = 'flaviomartil', existing = false, apiError = false, privateRepo = true, badHead = false } = {}) {
  const calls = [];
  let created = false;
  return { calls, execute(bin, args, cwd) {
    calls.push({ bin, args, cwd });
    if (bin === 'gh' && args.includes('user')) return ok(JSON.stringify({ login: owner, id: 60192455, name: 'Flávio Martil' }));
    if (bin === 'gh' && args[0] === 'repo') { created = true; return ok(); }
    if (bin === 'gh' && args.at(-1)?.endsWith('/commits/main')) return ok(JSON.stringify({ sha: badHead ? 'different' : 'abc123' }));
    if (bin === 'gh' && args.at(-1) === 'repos/flaviomartil/estrato') {
      if (created) return ok(JSON.stringify({ full_name: 'flaviomartil/estrato', private: privateRepo, html_url: 'https://github.com/flaviomartil/estrato' }));
      return existing ? ok('{}') : { status: 1, stderr: apiError ? 'HTTP 403' : 'gh: Not Found (HTTP 404)' };
    }
    if (bin === 'git' && args[0] === 'init') { fs.mkdirSync(path.join(cwd, '.git')); return ok(); }
    if (bin === 'git' && args[0] === 'rev-parse') return ok('abc123\n');
    return ok();
  }};
}
const noop = () => {};
test('publishing dry-run makes no external calls and ignores unrelated private files', t => {
  const root = fixture(t); fs.writeFileSync(path.join(root, 'IMP_Private.md'), 'not for publication');
  const r = publishSnapshot({ root, execute: () => { throw new Error('Must not run'); }, log: noop });
  assert.equal(r.published, false); assert.equal(r.files, 6); assert(!inspectSnapshot(root).files.some(f => f.path.includes('IMP')));
});
test('publisher fails closed when source hash changes', t => { const root = fixture(t); fs.appendFileSync(path.join(root, 'README.md'), 'changed'); assert.throws(() => inspectSnapshot(root), /diferente/); });
test('publisher refuses an account other than the authorized owner', t => { const root = fixture(t), fake = fakeRunner({ owner: 'other' }); assert.throws(() => publishSnapshot({ root, publish: true, execute: fake.execute, log: noop }), /autenticada/); assert(!fake.calls.some(c => c.args.includes('create'))); });
test('publisher never modifies a repository that already exists', t => { const root = fixture(t), fake = fakeRunner({ existing: true }); assert.throws(() => publishSnapshot({ root, publish: true, execute: fake.execute, log: noop }), /já existe/); assert(!fake.calls.some(c => c.args.includes('create'))); });
test('non-404 failures do not authorize repository creation', t => { const root = fixture(t), fake = fakeRunner({ apiError: true }); assert.throws(() => publishSnapshot({ root, publish: true, execute: fake.execute, log: noop }), /ausência/); assert(!fake.calls.some(c => c.args.includes('create'))); });
test('simulated success requires private creation, bounded staging and verified remote commit', t => {
  const root = fixture(t), fake = fakeRunner(); const result = publishSnapshot({ root, publish: true, execute: fake.execute, log: noop });
  t.after(() => fs.rmSync(result.workingCopy, { recursive: true, force: true }));
  assert(result.published && result.private); assert.equal(result.commit, 'abc123');
  assert(fake.calls.find(c => c.args.includes('create')).args.includes('--private'));
  assert(!fake.calls.some(c => c.args.includes('--force')));
  assert(fs.existsSync(path.join(result.workingCopy, 'skills/estrato/SKILL.md')));
});
test('unexpected public visibility prevents source push', t => {
  const root = fixture(t), fake = fakeRunner({ privateRepo: false });
  assert.throws(() => publishSnapshot({ root, publish: true, execute: fake.execute, log: noop }), /privacidade/);
  assert(!fake.calls.some(c => c.args.includes('push')));
  const stage = fake.calls.find(c => c.args.includes('init')).cwd; fs.rmSync(stage, { recursive: true, force: true });
});
test('remote commit mismatch never reports publication as verified', t => {
  const root = fixture(t), fake = fakeRunner({ badHead: true });
  assert.throws(() => publishSnapshot({ root, publish: true, execute: fake.execute, log: noop }), /commit remoto/);
  const stage = fake.calls.find(c => c.args.includes('init')).cwd; fs.rmSync(stage, { recursive: true, force: true });
});
