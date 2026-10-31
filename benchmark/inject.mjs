#!/usr/bin/env node
// 逐層注入錯誤：在每個回合的產物裡故意植入一個轉譯錯誤，看哪一道檢查會發現。
//
//   node inject.mjs                # 全部回合
//   node inject.mjs T2-C-r1 ...    # 指定回合
//
// 每個錯誤都在 .grade/ 底下的獨立副本裡植入，不會改動 runs/ 本身。
// 檢查分兩個時點：
//   建立當下：代理剛寫完這一層、還沒上鎖時，能跑的檢查是 feature-lint 與回合自己的測試。
//   上鎖之後：事後有人改動時，SpecEngine 用 spec-guard audit 比對 lock。
//     為了量的是現行版本，每個 SpecEngine 副本都先用目前的 spec-guard 重新 lock，再植入錯誤。
// 錯誤種類：
//   L2-drop-rule     規則矩陣少一條規則（SpecEngine 才有矩陣）
//   L2-edit-rule     改掉矩陣裡一條規則的後置斷言
//   L4-drop-scenario Gherkin 少一個 Rule／Scenario 區塊
//   L4-edit-example  範例表的數字格逐格 +1（每回合最多 15 格），量被發現的比例
//   L5-rename-step   改掉一個 Step 句型
//   L5-hollow-steps  把所有 Then 步驟的函式體清空（測試變成空心，永遠通過）
// 結果寫到 results/injection.json，並印出表格。

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN = path.join(HERE, '..');
const BASE_NM = path.join(HERE, 'base', 'node_modules');
const ts = createRequire(path.join(BASE_NM, 'x.js'))('typescript');
const WORK = path.join(HERE, '.grade');

function run(cmd, args, cwd) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd, shell: process.platform === 'win32' && cmd === 'npm', windowsHide: true });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    const t = setTimeout(() => { p.kill(); resolve({ code: 'timeout', out }); }, 120000);
    p.on('close', (code) => { clearTimeout(t); resolve({ code, out }); });
  });
}
const node = (script, args, cwd) => run(process.execPath, [path.join(PLUGIN, 'scripts', script), ...args], cwd);

function walkFiles(dir, pred, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walkFiles(p, pred, out); } else if (pred(p)) out.push(p);
  }
  return out;
}
const featureFiles = (dir) => [...walkFiles(path.join(dir, '.specengine', 'spec', 'features'), (p) => p.endsWith('.feature')), ...walkFiles(path.join(dir, 'tests', 'features'), (p) => p.endsWith('.feature'))];
const stepFiles = (dir) => walkFiles(path.join(dir, 'tests', 'steps'), (p) => /\.(ts|js|mjs)$/.test(p));

// ---------- 錯誤植入 ----------
const FAULTS = {
  'L2-drop-rule': (dir) => {
    const m = walkFiles(path.join(dir, '.specengine', 'sdd', 'matrix'), (p) => p.endsWith('.json'))[0];
    if (!m) return null;
    const j = JSON.parse(fs.readFileSync(m, 'utf8'));
    const victim = j.rules.at(-1).rule_id;
    j.rules = j.rules.slice(0, -1);
    fs.writeFileSync(m, JSON.stringify(j, null, 2));
    return `刪除 ${victim}`;
  },
  'L2-edit-rule': (dir) => {
    const m = walkFiles(path.join(dir, '.specengine', 'sdd', 'matrix'), (p) => p.endsWith('.json'))[0];
    if (!m) return null;
    const j = JSON.parse(fs.readFileSync(m, 'utf8'));
    const r = j.rules.find((x) => x.post_assertions?.length);
    r.post_assertions[0] = String(r.post_assertions[0]) + '（被改）';
    fs.writeFileSync(m, JSON.stringify(j, null, 2));
    return `改 ${r.rule_id} 的後置斷言`;
  },
  'L4-drop-scenario': (dir) => {
    const f = featureFiles(dir)[0];
    if (!f) return null;
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    const isRule = (l) => /^\s*Rule:/.test(l);
    const isScen = (l) => /^\s*(Scenario|Scenario Outline|Example|場景|場景大綱|劇本|劇本大綱)\s*:/.test(l);
    const useRule = lines.some(isRule);
    const starts = lines.map((l, i) => ((useRule ? isRule(l) : isScen(l)) ? i : -1)).filter((i) => i >= 0);
    if (!starts.length) return null;
    let s = starts.at(-1);
    while (s > 0 && /^\s*(@|#)/.test(lines[s - 1])) s--; // 連同上方的 tag 與註解
    const kept = lines.slice(0, s);
    fs.writeFileSync(f, kept.join('\n') + '\n');
    return `刪除最後一個${useRule ? ' Rule' : ' Scenario'} 區塊（${path.basename(f)}）`;
  },
  'L5-rename-step': (dir) => {
    for (const f of stepFiles(dir)) {
      const code = fs.readFileSync(f, 'utf8');
      const m = code.match(/\b(Given|When|Then)\(\s*(['"`])((?:\\.|(?!\2).)+)\2/);
      if (m) {
        const at = m.index + m[0].length - 1;
        fs.writeFileSync(f, code.slice(0, at) + '（改）' + code.slice(at));
        return `句型「${m[3].slice(0, 30)}」加字（${path.basename(f)}）`;
      }
    }
    return null;
  },
  'L5-hollow-steps': (dir) => {
    let n = 0;
    for (const f of stepFiles(dir)) {
      const code = fs.readFileSync(f, 'utf8');
      const sf = ts.createSourceFile(f, code, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
      const bodies = [];
      (function walk(node) {
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'Then') {
          const fn = node.arguments.at(-1);
          if (fn && (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) && fn.body && ts.isBlock(fn.body)) bodies.push([fn.body.getStart(sf), fn.body.getEnd()]);
        }
        ts.forEachChild(node, walk);
      })(sf);
      if (!bodies.length) continue;
      let out = code;
      for (const [s, e] of bodies.sort((a, b) => b[0] - a[0])) out = out.slice(0, s) + '{}' + out.slice(e);
      fs.writeFileSync(f, out);
      n += bodies.length;
    }
    return n ? `清空 ${n} 個 Then 函式體` : null;
  },
};

// 範例數值：列出 Examples 表格裡每一個數字格（表頭除外），以及沒有表格時 Then 行裡的數字。
// 每一格各植入一次（+1），量「被發現的比例」。最多取 MAX_CELLS 格，平均分布在各表格。
const MAX_CELLS = 15;
function exampleCells(dir) {
  const cells = [];
  for (const f of featureFiles(dir)) {
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    let inEx = false, header = false;
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*(Examples|例子)\s*:/.test(lines[i])) { inEx = true; header = false; continue; }
      if (inEx && /^\s*\|/.test(lines[i])) {
        if (!header) { header = true; continue; }
        lines[i].split('|').forEach((c, ci) => { if (/^\s*-?\d+(\.\d+)?\s*$/.test(c)) cells.push({ f, i, ci }); });
      } else if (inEx && !/^\s*$/.test(lines[i])) inEx = false;
      if (/^\s*(Then|And|But)\b|^\s*(那麼|而且|並且|但是)/.test(lines[i]) && !/^\s*\|/.test(lines[i])) {
        const m = lines[i].match(/"(-?\d+)"|(?<![\w.])(-?\d+)(?![\w.])/);
        if (m) cells.push({ f, i, ci: -1 });
      }
    }
  }
  if (cells.length <= MAX_CELLS) return cells;
  const step = cells.length / MAX_CELLS;
  return Array.from({ length: MAX_CELLS }, (_, k) => cells[Math.floor(k * step)]);
}
function applyCell(dir, cell, srcDir) {
  const f = path.join(dir, path.relative(srcDir, cell.f));
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  if (cell.ci >= 0) {
    const parts = lines[cell.i].split('|');
    parts[cell.ci] = parts[cell.ci].replace(/-?\d+(\.\d+)?/, (v) => String(Number(v) + 1));
    lines[cell.i] = parts.join('|');
  } else {
    lines[cell.i] = lines[cell.i].replace(/(-?\d+)(?![\w.])/, (v) => String(Number(v) + 1));
  }
  fs.writeFileSync(f, lines.join('\n'));
}

// ---------- 檢查 ----------
const condition = (run) => run.split('-')[1]; // A / B / C
async function checks(dir, isC) {
  const res = {};
  if (isC) res.lint = (await node('feature-lint.js', [], dir)).code === 0 ? 'pass' : 'FLAG';
  const t = await run('npm', ['test', '--silent'], dir);
  res.ownTests = t.code === 0 ? 'pass' : 'FLAG';
  if (isC) res.audit = (await node('spec-guard.js', ['audit'], dir)).code === 0 ? 'pass' : 'FLAG';
  return res;
}

function copy(runName, label) {
  const dir = path.join(WORK, `inj-${runName}-${label}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.cpSync(path.join(HERE, 'runs', runName), dir, { recursive: true });
  fs.symlinkSync(BASE_NM, path.join(dir, 'node_modules'), 'junction');
  return dir;
}

async function relock(dir) {
  const locks = walkFiles(path.join(dir, '.specengine', 'sdd', 'locks'), (p) => p.endsWith('.lock.json') && !p.endsWith('_shared.json'));
  for (const l of locks) {
    const id = JSON.parse(fs.readFileSync(l, 'utf8')).module;
    const r = await node('spec-guard.js', ['lock', id], dir);
    if (r.code !== 0) return `relock 失敗：${r.out.trim().split('\n')[0]}`;
  }
  return null;
}

const argv = process.argv.slice(2);
const runs = (argv.length ? argv : fs.readdirSync(path.join(HERE, 'runs')).sort()).filter((r) => /^T[123]-[ABC]-/.test(r));
const outFile = path.join(HERE, 'results', 'injection.json');
fs.mkdirSync(path.dirname(outFile), { recursive: true });
const saved = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};

for (const r of runs) {
  const isC = condition(r) === 'C';
  const base = copy(r, 'base');
  if (isC) { const e = await relock(base); if (e) { saved[r] = { error: e }; continue; } }
  const baseline = await checks(base, isC);
  fs.rmSync(base, { recursive: true, force: true });
  saved[r] = { baseline, faults: {} };
  for (const [name, inject] of Object.entries(FAULTS)) {
    const dir = copy(r, name);
    if (isC) await relock(dir);
    const what = inject(dir);
    if (!what) { saved[r].faults[name] = { applicable: false }; fs.rmSync(dir, { recursive: true, force: true }); continue; }
    saved[r].faults[name] = { applicable: true, what, ...(await checks(dir, isC)) };
    fs.rmSync(dir, { recursive: true, force: true });
  }
  // L4-edit-example：逐格植入
  const src = path.join(HERE, 'runs', r);
  const cells = exampleCells(src);
  const tally = { applicable: cells.length > 0, cells: cells.length, lint: 0, ownTests: 0, audit: 0, any: 0 };
  for (let k = 0; k < cells.length; k++) {
    const dir = copy(r, 'ex' + k);
    if (isC) await relock(dir);
    applyCell(dir, cells[k], src);
    const c = await checks(dir, isC);
    for (const key of ['lint', 'ownTests', 'audit']) if (c[key] === 'FLAG') tally[key]++;
    if (c.ownTests === 'FLAG' || c.lint === 'FLAG') tally.any++;
    fs.rmSync(dir, { recursive: true, force: true });
  }
  saved[r].faults['L4-edit-example'] = tally;
  fs.writeFileSync(outFile, JSON.stringify(saved, null, 2));
  console.error(`${r} done`);
}

// ---------- 彙整 ----------
const names = ['L2-drop-rule', 'L2-edit-rule', 'L4-drop-scenario', 'L4-edit-example', 'L5-rename-step', 'L5-hollow-steps'];
console.log('| 回合 | 基準 | ' + names.join(' | ') + ' |');
console.log('| :--- | :--- | ' + names.map(() => ':---').join(' | ') + ' |');
const cell = (f) => {
  if (!f || !f.applicable) return '不適用';
  if (f.cells !== undefined) {
    const parts = [`建立時 ${f.any}/${f.cells}`];
    if (f.audit !== undefined && f.cells) parts.push(`上鎖後 ${f.audit}/${f.cells}`);
    return parts.join('；');
  }
  const by = [f.lint === 'FLAG' && 'lint', f.ownTests === 'FLAG' && '自己的測試', f.audit === 'FLAG' && 'audit'].filter(Boolean);
  return by.length ? by.join('、') : '**未偵測**';
};
for (const r of Object.keys(saved).sort()) {
  const s = saved[r];
  if (s.error) { console.log(`| ${r} | ${s.error} |`); continue; }
  const b = Object.entries(s.baseline).map(([k, v]) => `${k}:${v}`).join(' ');
  console.log(`| ${r} | ${b} | ${names.map((n) => cell(s.faults[n])).join(' | ')} |`);
}
