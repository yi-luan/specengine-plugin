#!/usr/bin/env node
// 偷改測試：把每個已上鎖的 SpecEngine 回合複製到 .grade/，改掉 .feature 裡第一個 Examples 數值，
// 確認 spec-guard audit 回報 LOCK_DRIFT（exit 1）。不會改動回合本身。
//
//   node tamper.mjs

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GUARD = path.join(HERE, '..', 'scripts', 'spec-guard.js');
const runs = fs.readdirSync(path.join(HERE, 'runs')).filter((r) => fs.existsSync(path.join(HERE, 'runs', r, '.specengine', 'sdd', 'locks')));

const audit = (cwd) => spawnSync(process.execPath, [GUARD, 'audit'], { cwd, encoding: 'utf8' });

console.log('| 回合 | 改動 | 改動前 audit | 改動後 audit |');
console.log('| :--- | :--- | :--- | :--- |');
for (const run of runs.sort()) {
  const dir = path.join(HERE, '.grade', 'tamper-' + run);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.cpSync(path.join(HERE, 'runs', run), dir, { recursive: true });
  const before = audit(dir).status;
  const featDir = path.join(dir, '.specengine', 'spec', 'features');
  const feat = path.join(featDir, fs.readdirSync(featDir).find((f) => f.endsWith('.feature')));
  const text = fs.readFileSync(feat, 'utf8');
  const m = text.match(/^(\s*\|[^\n]*?\|\s*)(\d+)(\s*\|)/m);
  if (!m) { console.log(`| ${run} | 找不到 Examples 數值 | ${before} | - |`); continue; }
  const changed = text.replace(m[0], m[1] + String(Number(m[2]) + 1) + m[3]);
  fs.writeFileSync(feat, changed);
  const after = audit(dir);
  const drift = after.status !== 0 && /LOCK_DRIFT/.test(after.stdout + after.stderr);
  console.log(`| ${run} | ${m[2]} → ${Number(m[2]) + 1} | ${before === 0 ? '通過' : '失敗'} | ${drift ? 'LOCK_DRIFT（exit ' + after.status + '）' : '未偵測（exit ' + after.status + '）'} |`);
}
