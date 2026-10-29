#!/usr/bin/env node
// 用隱藏驗收測試為每個回合評分。
//
//   cd benchmark/base && npm ci && cd ..
//   node grade.mjs                 # 評分全部回合
//   node grade.mjs T2-B-r1 T3-C-r3 # 只評指定回合
//   node grade.mjs --reference     # 先用參考實作驗證隱藏測試本身沒寫錯
//
// 回合目錄名稱的前綴決定用哪份隱藏測試：T1 → t1、E4 → e4、T2 → t2、T3 → t3。
// 評分只取回合的 src/，在 .grade/ 底下的暫存目錄執行，不會改動回合本身。

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TSX = path.join(HERE, 'base', 'node_modules', 'tsx', 'dist', 'cli.mjs');
const WORK = path.join(HERE, '.grade');
const TASK = { T1: ['t1', 'points.ts'], E4: ['e4', 'points.ts'], T2: ['t2', 'order.ts'], T3: ['t3', 'coupon.ts'] };

if (!fs.existsSync(TSX)) {
  console.error('找不到 tsx。請先執行：cd benchmark/base && npm ci');
  process.exit(2);
}

function grade(label, task, srcDir, env = {}) {
  const dir = path.join(WORK, label);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'hidden'), { recursive: true });
  fs.cpSync(srcDir, path.join(dir, 'src'), { recursive: true });
  const test = `${task}.hidden.test.ts`;
  fs.copyFileSync(path.join(HERE, 'hidden', test), path.join(dir, 'hidden', test));
  const r = spawnSync(process.execPath, [TSX, '--test', '--test-reporter=tap', path.join('hidden', test)], {
    cwd: dir, encoding: 'utf8', env: { ...process.env, ...env },
  });
  const lines = (r.stdout || '').split('\n').filter((l) => /^(ok|not ok) \d+ - /.test(l));
  const rows = lines.map((l) => ({ pass: l.startsWith('ok'), name: l.replace(/^(ok|not ok) \d+ - /, '') }));
  const count = (pred) => rows.filter(pred).length;
  return {
    label, task,
    pass: count((x) => x.pass), total: rows.length,
    behaviour: `${count((x) => x.pass && x.name.includes('[behaviour]'))}/${count((x) => x.name.includes('[behaviour]'))}`,
    reason: `${count((x) => x.pass && x.name.includes('[reason]'))}/${count((x) => x.name.includes('[reason]'))}`,
    failed: rows.filter((x) => !x.pass).map((x) => x.name.split(' ')[0]),
  };
}

const args = process.argv.slice(2);
const results = [];

if (args.includes('--reference')) {
  const ref = path.join(HERE, 'reference');
  const only = (file) => { const d = path.join(WORK, '_ref_' + file); fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d, { recursive: true }); fs.copyFileSync(path.join(ref, file), path.join(d, file)); return d; };
  results.push(grade('reference-t1', 't1', only('points.ts')));
  results.push(grade('reference-e4', 'e4', only('points.ts'), { LIMIT_PERCENT: '35' }));
  results.push(grade('reference-t2', 't2', only('order.ts')));
  results.push(grade('reference-t3', 't3', only('coupon.ts')));
} else {
  const runsDir = path.join(HERE, 'runs');
  const runs = args.length ? args : fs.readdirSync(runsDir).sort();
  for (const run of runs) {
    const [task, file] = TASK[run.slice(0, 2)] || [];
    const src = path.join(runsDir, run, 'src');
    if (!task || !fs.existsSync(path.join(src, file))) { results.push({ label: run, task, pass: 0, total: 0, behaviour: '-', reason: '-', failed: ['無產品碼'] }); continue; }
    results.push(grade(run, task, src));
  }
}

console.log('| 回合 | 隱藏測試 | 通過 | 行為題 | 原因碼題 | 未通過 |');
console.log('| :--- | :--- | ---: | ---: | ---: | :--- |');
for (const r of results) console.log(`| ${r.label} | ${r.task} | ${r.pass}/${r.total} | ${r.behaviour} | ${r.reason} | ${r.failed.join(' ') || '-'} |`);
