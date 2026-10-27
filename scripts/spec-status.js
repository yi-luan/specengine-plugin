#!/usr/bin/env node
/**
 * spec-status.js
 *
 * 從檔案系統「推導」每個模組目前的階段，而不是讀 overview.md 的狀態欄。
 * 狀態欄只是給人看的快取；本腳本的輸出才是 spec-run 判定起點的依據。
 *
 * 推導規則（取最高一層存在的產物）：
 *   .specengine/sdd/locks/<ID>.lock.json 存在            → IMPLEMENTED
 *   Step Definitions 目錄中有含 `@rule R-<ID>-` 的檔案   → STUBBED
 *   .specengine/spec/features/ 中有含 `@rule:R-<ID>-` 的檔案 → FORMALIZED
 *   .specengine/sdd/data|features/ 中有屬於 <ID> 的問題檔  → CLARIFYING
 *   只有 matrix/<ID>.json                                → CLARIFIED
 *   有 lock 且 .specengine/sdd/changes/<ID>/ 有進行中的變更 → CHANGING（下一步 spec change）
 *
 * 另外回報：佇列是否非空（不論階段，有待答題就該回 spec 02）、流程對齊是否通過（索引檔含「狀態：已通過」）、
 * 低層產物缺漏（例如有 Step 但沒有 .feature）、以及 overview.md 狀態欄與推導結果不符。
 *
 * 用法：
 *   node "${CLAUDE_PLUGIN_ROOT}/scripts/spec-status.js"                 # 全部模組，表格
 *   node "${CLAUDE_PLUGIN_ROOT}/scripts/spec-status.js" --module <ID>   # 單一模組
 *   node "${CLAUDE_PLUGIN_ROOT}/scripts/spec-status.js" --json          # 機器可讀
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
let openChanges = () => [];
try { ({ openChanges } = require('./spec-change.js')); } catch { /* 舊版無 spec-change */ }

const ROOT = process.cwd();
const SDD = path.join(ROOT, '.specengine', 'sdd');
const SPEC = path.join(ROOT, '.specengine', 'spec');
const MANIFEST = path.join(ROOT, '.claude', 'spec', 'architecture-manifest.md');

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const onlyModule = args.includes('--module') ? args[args.indexOf('--module') + 1] : null;

function listFiles(absDir) {
  if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) return [];
  const out = [];
  const stack = [absDir];
  while (stack.length) {
    const cur = stack.pop();
    for (const e of fs.readdirSync(cur, { withFileTypes: true })) {
      if (e.name === '.gitkeep') continue;
      const abs = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(abs);
      else out.push(abs);
    }
  }
  return out.sort();
}

function rel(abs) {
  return path.relative(ROOT, abs).split(path.sep).join('/');
}

function filesContaining(absDir, needle) {
  return listFiles(absDir).filter((f) => {
    try { return fs.readFileSync(f, 'utf8').includes(needle); } catch { return false; }
  });
}

function manifestDirs(fieldName) {
  if (!fs.existsSync(MANIFEST)) return [];
  const line = fs.readFileSync(MANIFEST, 'utf8').split('\n').find((l) => l.includes(fieldName));
  if (!line || line.includes('〔待確認〕')) return [];
  const clause = line.split(/[:：]/).slice(1).join(':').split('，')[0];
  return [...clause.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim()).filter((p) => p && !p.includes('{'));
}

function overviewStatus(id) {
  const file = path.join(SDD, 'overview.md');
  if (!fs.existsSync(file)) return null;
  const row = fs.readFileSync(file, 'utf8').split('\n').find((l) => l.includes(`| ${id} |`) || l.includes(`|${id}|`));
  if (!row) return null;
  const cells = row.split('|').map((c) => c.trim()).filter(Boolean);
  return cells[1] || null;
}

function readPriority(file) {
  const m = fs.readFileSync(file, 'utf8').match(/#\s*優先級\s*\n\s*(High|Medium|Low)/);
  return m ? m[1] : '?';
}

function deriveModule(id, stepDirs) {
  const pending = [...filesContaining(path.join(SDD, 'data'), id), ...filesContaining(path.join(SDD, 'features'), id)];
  const parked = filesContaining(path.join(SDD, 'parked'), id);
  // 流程對齊索引檔可能處於「未通過」狀態（缺口分支會先存使用者裁示），只有內含「狀態：已通過」才算過關
  const flowIndex = path.join(SDD, 'flow-design', `${id}.md`);
  const flowAligned = fs.existsSync(flowIndex) && fs.readFileSync(flowIndex, 'utf8').includes('狀態：已通過');
  const features = filesContaining(path.join(SPEC, 'features'), `@rule:R-${id}-`);
  const steps = stepDirs.flatMap((d) => filesContaining(path.join(ROOT, d), `@rule R-${id}-`));
  const locked = fs.existsSync(path.join(SDD, 'locks', `${id}.lock.json`));

  const changing = locked ? openChanges(id) : [];
  let matrixDriftNoChange = false;
  if (locked && !changing.length) {
    try {
      const lock = JSON.parse(fs.readFileSync(path.join(SDD, 'locks', `${id}.lock.json`), 'utf8'));
      const mrel = `.specengine/sdd/matrix/${id}.json`;
      if (lock.matrix && lock.matrix[mrel]) {
        const cur = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, mrel), 'utf8').replace(/\r\n/g, '\n')).digest('hex');
        matrixDriftNoChange = cur !== lock.matrix[mrel];
      }
    } catch { /* 無法讀 lock 時不判定 */ }
  }

  let stage;
  if (changing.length) stage = 'CHANGING';
  else if (locked) stage = 'IMPLEMENTED';
  else if (steps.length) stage = 'STUBBED';
  else if (features.length) stage = 'FORMALIZED';
  else if (pending.length) stage = 'CLARIFYING';
  else stage = 'CLARIFIED';

  const warnings = [];
  if (pending.length && stage === 'CHANGING') warnings.push(`變更中有 ${pending.length} 題待答，由 spec change 在核准時一起問`);
  else if (pending.length && stage !== 'CLARIFYING') warnings.push(`佇列仍有 ${pending.length} 題待答，視同 CLARIFYING`);
  if (['FORMALIZED', 'STUBBED', 'IMPLEMENTED'].includes(stage) && !flowAligned) warnings.push('缺流程對齊證明 flow-design/<ID>.md');
  if (steps.length && !features.length) warnings.push('有 Step Definitions 但找不到對應 .feature');
  if (locked && !steps.length) warnings.push('有 lock 但找不到 Step Definitions');
  if (matrixDriftNoChange) warnings.push('行為矩陣在 lock 之後被改動，但沒有進行中的需求變更紀錄（未經 spec change）');
  if (changing.length > 1) warnings.push(`有 ${changing.length} 份進行中的需求變更，一次只能一份`);
  const cached = overviewStatus(id);
  if (cached && cached !== stage) warnings.push(`overview.md 狀態欄為 ${cached}，與推導結果 ${stage} 不符（狀態欄僅為快取）`);

  let next;
  if (changing.length) next = 'spec change';
  else if (pending.length) next = 'spec 02';
  else if (stage === 'CLARIFIED') next = flowAligned ? 'spec 03' : 'spec flow-align';
  else if (stage === 'FORMALIZED') next = 'spec 04';
  else if (stage === 'STUBBED') next = 'spec 05';
  else next = '（已完工）';

  const byPriority = pending.reduce((acc, f) => { const p = readPriority(f); acc[p] = (acc[p] || 0) + 1; return acc; }, {});

  return {
    module: id, stage, next, flowAligned,
    pending: pending.length, pendingByPriority: byPriority, parked: parked.length,
    artifacts: { features: features.map(rel), steps: steps.map(rel), locked },
    changes: changing.map(rel),
    warnings,
  };
}

const matrixDir = path.join(SDD, 'matrix');
if (!fs.existsSync(matrixDir)) {
  console.error('[spec-status] 找不到 .specengine/sdd/matrix/，尚無任何模組冷啟動過。');
  process.exit(2);
}
const stepDirs = manifestDirs('Step Definitions Directory');
let modules = fs.readdirSync(matrixDir).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort();
if (onlyModule) modules = modules.filter((m) => m === onlyModule);
if (onlyModule && !modules.length) {
  console.error(`[spec-status] 模組 ${onlyModule} 沒有矩陣檔，尚未冷啟動（起點：spec 01）。`);
  process.exit(3);
}

const results = modules.map((id) => deriveModule(id, stepDirs));

if (asJson) {
  console.log(JSON.stringify({ stepDirsResolved: stepDirs.length > 0, modules: results }, null, 2));
  process.exit(0);
}

if (!stepDirs.length) console.log('[spec-status] 注意：manifest 未宣告 Step Definitions Directory，無法判定 STUBBED，階段可能被低估。');
console.log('模組 | 階段 | 待答 | 掛起 | 流程對齊 | 下一步');
console.log('--- | --- | --- | --- | --- | ---');
for (const r of results) {
  const pri = Object.entries(r.pendingByPriority).map(([k, v]) => `${k} ${v}`).join(' / ');
  console.log(`${r.module} | ${r.stage} | ${r.pending}${pri ? `（${pri}）` : ''} | ${r.parked} | ${r.flowAligned ? '✓' : '—'} | ${r.next}`);
}
for (const r of results) for (const w of r.warnings) console.log(`[spec-status] ${r.module}：${w}`);
process.exit(0);
