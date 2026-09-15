// Expand test paths explicitly so npm test works without shell globbing on Windows.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const tests = fs.readdirSync('test').filter(name => name.endsWith('.test.mjs')).sort();
if (!tests.length) throw new Error('Nenhum teste encontrado. Execute na raiz do projeto.');
const result = spawnSync(process.execPath, ['--test', ...tests.map(name => path.join('test', name))], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 2;
