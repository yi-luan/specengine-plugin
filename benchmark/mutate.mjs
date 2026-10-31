#!/usr/bin/env node
// 突變測試：量每個回合「自己寫的測試」有沒有真的在把關。
//
//   node mutate.mjs                  # 全部回合
//   node mutate.mjs T2-B-r1 T2-C-r1  # 指定回合
//   node mutate.mjs --jobs 6         # 平行數（預設 4）
//
// 做法：用 TypeScript 編譯器解析回合的產品碼（src/points.ts、order.ts、coupon.ts），
// 每個突變只改一處：比較運算子、算術運算子、邏輯運算子、數字常數 ±1、布林值、
// 失敗原因代碼字串、Math.floor ↔ Math.ceil。每個突變各跑兩次：
//   1. 回合自己的測試（npm test）
//   2. 隱藏驗收測試（hidden/*.hidden.test.ts）
// 讓「原本通過的隱藏測試」變成失敗的突變 = 破壞了回合原本做對的需求行為，稱為規格相關突變。
// 「規格相關突變分數」= 這些突變中，回合自己的測試也抓到的比例。
// 結果寫到 results/mutation.json，並印出表格。不會改動 runs/ 本身。

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE_NM = path.join(HERE, 'base', 'node_modules');
const require = createRequire(path.join(BASE_NM, 'x.js'));
const ts = require('typescript');
const TSX = path.join(BASE_NM, 'tsx', 'dist', 'cli.mjs');
const WORK = path.join(HERE, '.grade');
const TASK = { T1: ['t1', 'points.ts'], E4: ['e4', 'points.ts'], T2: ['t2', 'order.ts'], T3: ['t3', 'coupon.ts'] };

const argv = process.argv.slice(2);
const jobsAt = argv.indexOf('--jobs');
const JOBS = jobsAt >= 0 ? Number(argv[jobsAt + 1]) : 4;
const names = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--jobs');

// ---------- 產生突變 ----------
const SWAP = {
  [ts.SyntaxKind.LessThanToken]: ['<=', '>='], [ts.SyntaxKind.LessThanEqualsToken]: ['<', '>'],
  [ts.SyntaxKind.GreaterThanToken]: ['>=', '<='], [ts.SyntaxKind.GreaterThanEqualsToken]: ['>', '<'],
  [ts.SyntaxKind.EqualsEqualsEqualsToken]: ['!=='], [ts.SyntaxKind.ExclamationEqualsEqualsToken]: ['==='],
  [ts.SyntaxKind.PlusToken]: ['-'], [ts.SyntaxKind.MinusToken]: ['+'],
  [ts.SyntaxKind.AsteriskToken]: ['/'], [ts.SyntaxKind.SlashToken]: ['*'],
  [ts.SyntaxKind.AmpersandAmpersandToken]: ['||'], [ts.SyntaxKind.BarBarToken]: ['&&'],
};

function inType(node) {
  for (let n = node.parent; n; n = n.parent) {
    if (ts.isTypeNode(n) || ts.isTypeAliasDeclaration(n) || ts.isInterfaceDeclaration(n) || ts.isImportDeclaration(n)) return true;
  }
  return false;
}

function mutants(code, file) {
  const sf = ts.createSourceFile(file, code, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const out = [];
  const add = (start, end, text, op) => out.push({ start, end, text, op, line: sf.getLineAndCharacterOfPosition(start).line + 1 });
  (function walk(node) {
    if (inType(node)) return;
    if (ts.isBinaryExpression(node) && SWAP[node.operatorToken.kind]) {
      const t = node.operatorToken;
      for (const rep of SWAP[node.operatorToken.kind]) add(t.getStart(sf), t.getEnd(), rep, `${t.getText(sf)} → ${rep}`);
    } else if (ts.isNumericLiteral(node)) {
      const v = Number(node.text);
      add(node.getStart(sf), node.getEnd(), String(v + 1), `${node.text} → ${v + 1}`);
      if (v !== 0) add(node.getStart(sf), node.getEnd(), String(v - 1), `${node.text} → ${v - 1}`);
    } else if (ts.isStringLiteral(node) && /^[A-Z][A-Z0-9_]{2,}$/.test(node.text)) {
      add(node.getStart(sf), node.getEnd(), `'${node.text}_MUT'`, `'${node.text}' → '${node.text}_MUT'`);
    } else if (node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword) {
      const rep = node.kind === ts.SyntaxKind.TrueKeyword ? 'false' : 'true';
      add(node.getStart(sf), node.getEnd(), rep, `${node.getText(sf)} → ${rep}`);
    } else if (ts.isPropertyAccessExpression(node) && node.expression.getText(sf) === 'Math' && ['floor', 'ceil'].includes(node.name.text)) {
      const rep = node.name.text === 'floor' ? 'ceil' : 'floor';
      add(node.name.getStart(sf), node.name.getEnd(), rep, `Math.${node.name.text} → Math.${rep}`);
    }
    ts.forEachChild(node, walk);
  })(sf);
  return out;
}

// ---------- 執行 ----------
function run(cmd, args, cwd, timeoutMs = 90000) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd, shell: process.platform === 'win32' && cmd === 'npm', windowsHide: true });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    const t = setTimeout(() => { p.kill(); resolve({ code: 'timeout', out }); }, timeoutMs);
    p.on('close', (code) => { clearTimeout(t); resolve({ code, out }); });
  });
}
const ownTests = (dir) => run('npm', ['test', '--silent'], dir);
// 回傳隱藏測試中「通過」的測試 ID 集合
async function hiddenPassing(dir, task) {
  const r = await run(process.execPath, [TSX, '--test', '--test-reporter=tap', path.join('hidden', `${task}.hidden.test.ts`)], dir);
  const ids = new Set();
  for (const l of r.out.split('\n')) { const m = l.match(/^ok \d+ - (\S+)/); if (m) ids.add(m[1]); }
  return ids;
}

function prepare(runName, src, slot) {
  const dir = path.join(WORK, `mut-${runName}-${slot}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.cpSync(src, dir, { recursive: true, filter: (s) => !/[\\/](node_modules|reports|\.grade)$/.test(s) });
  fs.symlinkSync(BASE_NM, path.join(dir, 'node_modules'), 'junction');
  fs.mkdirSync(path.join(dir, 'hidden'), { recursive: true });
  for (const f of fs.readdirSync(path.join(HERE, 'hidden'))) fs.copyFileSync(path.join(HERE, 'hidden', f), path.join(dir, 'hidden', f));
  return dir;
}

async function mutateRun(runName, runsDir) {
  const [task, file] = TASK[runName.slice(0, 2)] || [];
  const src = path.join(runsDir, runName);
  const target = path.join('src', file || '');
  if (!task || !fs.existsSync(path.join(src, target))) return { run: runName, error: '無產品碼' };
  const original = fs.readFileSync(path.join(src, target), 'utf8');
  const list = mutants(original, file);
  const slots = Array.from({ length: Math.min(JOBS, Math.max(1, list.length)) }, (_, i) => prepare(runName, src, i));
  const base = await ownTests(slots[0]);
  if (base.code !== 0) return { run: runName, error: `回合自己的測試在未突變時就沒通過（exit ${base.code}）` };
  const basePass = await hiddenPassing(slots[0], task);
  const results = new Array(list.length);
  let next = 0;
  await Promise.all(slots.map(async (dir) => {
    while (next < list.length) {
      const i = next++;
      const m = list[i];
      fs.writeFileSync(path.join(dir, target), original.slice(0, m.start) + m.text + original.slice(m.end));
      const own = await ownTests(dir);
      const pass = await hiddenPassing(dir, task);
      const broke = [...basePass].filter((id) => !pass.has(id));
      results[i] = { line: m.line, op: m.op, ownKilled: own.code !== 0, hiddenKilled: broke.length > 0, hiddenBroken: broke };
      fs.writeFileSync(path.join(dir, target), original);
    }
  }));
  for (const d of slots) fs.rmSync(d, { recursive: true, force: true });
  const relevant = results.filter((r) => r.hiddenKilled);
  return {
    run: runName,
    mutants: results.length,
    ownKilled: results.filter((r) => r.ownKilled).length,
    specRelevant: relevant.length,
    specRelevantKilled: relevant.filter((r) => r.ownKilled).length,
    survivors: relevant.filter((r) => !r.ownKilled).map((r) => `L${r.line} ${r.op}`),
    detail: results,
  };
}

const runsDir = path.join(HERE, 'runs');
const all = names.length ? names : fs.readdirSync(runsDir).sort();
const outFile = path.join(HERE, 'results', 'mutation.json');
fs.mkdirSync(path.dirname(outFile), { recursive: true });
const saved = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};
for (const r of all) {
  const t0 = Date.now();
  const res = await mutateRun(r, runsDir);
  saved[r] = res;
  fs.writeFileSync(outFile, JSON.stringify(saved, null, 2));
  console.error(`${r}: ${res.error || `${res.specRelevantKilled}/${res.specRelevant}`} (${Math.round((Date.now() - t0) / 1000)}s)`);
}

const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '-');
console.log('| 回合 | 突變數 | 自己測試抓到 | 規格相關突變 | 其中自己測試抓到 | 規格相關突變分數 |');
console.log('| :--- | ---: | ---: | ---: | ---: | ---: |');
for (const r of Object.keys(saved).sort()) {
  const s = saved[r];
  if (s.error) { console.log(`| ${r} | - | - | - | - | ${s.error} |`); continue; }
  console.log(`| ${r} | ${s.mutants} | ${s.ownKilled} | ${s.specRelevant} | ${s.specRelevantKilled} | ${pct(s.specRelevantKilled, s.specRelevant)} |`);
}
