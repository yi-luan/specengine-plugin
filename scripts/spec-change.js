#!/usr/bin/env node
/**
 * spec-change.js
 *
 * 已 IMPLEMENTED（有 lock）模組的需求變更。把「改多少、要走多少站」從模型判斷改成機械判斷。
 *
 *   start <ID> <slug>   開一份變更紀錄：.specengine/sdd/changes/<ID>/<時間>-<slug>/
 *                       內含 base.matrix.json（現行矩陣）、proposed.matrix.json（執行者只改這份）、
 *                       base.features/（現行 .feature 備份）、change.md（狀態：草稿）
 *   classify <ID> [--also R-..,R-..]
 *                       比對 base 與 proposed，逐條 Rule 判定 PARAMETER／BEHAVIOR／NEW_RULE，取最高者。
 *                       受影響範圍 = 矩陣有差異的 Rule ∪ --also 宣告的 Rule（矩陣文字沒變、但 Examples
 *                       期望值會連帶改變者，例如全模組常數或檢查順序改變）。
 *   apply <ID>          人核准後執行：proposed 寫回 matrix/<ID>.json，change.md 狀態改為「已核准」。
 *                       --also 宣告的每條 Rule 都必須出現在「使用者核准」原文中。
 *   amend <ID>          核准後又需要改矩陣時：先改 proposed，並在 change.md「核准後修正」寫入使用者答案原文；
 *                       分類不得升級（升級須撤回重開）。proposed 寫回矩陣，受影響範圍取聯集。
 *   close <ID>          收尾檢查：lock 必須在核准之後重建且記錄現行矩陣雜湊；現行矩陣必須等於最後核准的
 *                       proposed；未受影響 Rule 的 .feature 區塊必須與變更前逐字相同。通過則狀態改為「已完成」
 *   status <ID>         印出進行中的變更（供 spec-status 與續跑判定）
 *
 * 分類規則（逐條 Rule）：
 *   - 只出現在 proposed → NEW_RULE；只出現在 base（被刪）→ BEHAVIOR
 *   - type／actor／trigger_event 字串有任何不同 → BEHAVIOR
 *   - pre_conditions／post_assertions 把所有數字（含小數、百分比）換成 # 之後仍有差異、或條數不同 → BEHAVIOR
 *   - 換成 # 之後完全相同、但數字有變 → PARAMETER
 *   - resolved_by 的差異不計入分類（變更紀錄會被追加進去）
 *   矩陣頂層的其他欄位（例如 check_order_note）比照 pre/post 規則。
 *
 * 僅用 Node.js 內建模組。請在專案根目錄執行。
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = process.cwd();
const SDD = path.join(ROOT, '.specengine', 'sdd');
const FEATURES = path.join(ROOT, '.specengine', 'spec', 'features');
const RANK = { NONE: 0, PARAMETER: 1, BEHAVIOR: 2, NEW_RULE: 3 };

function fail(msg, code = 2) {
  console.error(`[spec-change] Fail Loud：${msg}`);
  process.exit(code);
}
const rel = (abs) => path.relative(ROOT, abs).split(path.sep).join('/');
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')).digest('hex');
const matrixPath = (id) => path.join(SDD, 'matrix', `${id}.json`);
const lockPath = (id) => path.join(SDD, 'locks', `${id}.lock.json`);

function stamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return { compact: `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`, local: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`, iso: d.toISOString() };
}

function readStatusLine(changeMd) {
  const m = fs.readFileSync(changeMd, 'utf8').match(/狀態：(\S+)/);
  return m ? m[1] : '?';
}
function setStatusLine(changeMd, status, extra = '') {
  let t = fs.readFileSync(changeMd, 'utf8');
  t = t.replace(/^> 狀態：.*$/m, `> 狀態：${status}${extra ? ` ｜ ${extra}` : ''}`);
  fs.writeFileSync(changeMd, t, 'utf8');
}

/** 進行中的變更：change.md 狀態不是「已完成」「已撤回」者。最多應只有一份。 */
function openChanges(id) {
  const dir = path.join(SDD, 'changes', id);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => path.join(dir, e.name))
    .filter((d) => fs.existsSync(path.join(d, 'change.md')))
    .filter((d) => !['已完成', '已撤回'].includes(readStatusLine(path.join(d, 'change.md'))))
    .sort();
}
function theOpenChange(id) {
  const open = openChanges(id);
  if (!open.length) fail(`模組 ${id} 沒有進行中的變更，請先執行 start`);
  if (open.length > 1) fail(`模組 ${id} 有 ${open.length} 份進行中的變更：${open.map(rel).join('、')}；一次只能進行一份`);
  return open[0];
}

function featureFilesOf(id) {
  if (!fs.existsSync(FEATURES)) return [];
  return fs.readdirSync(FEATURES).filter((f) => f.endsWith('.feature'))
    .map((f) => path.join(FEATURES, f))
    .filter((f) => fs.readFileSync(f, 'utf8').includes(`@rule:R-${id}-`));
}

/** 依 `@rule:R-...` tag 切出每個 Rule 區塊（tag 行到下一個 @rule tag 或檔尾），換行正規化。 */
function ruleBlocks(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out = {};
  let cur = null;
  for (const line of lines) {
    const m = line.match(/@rule:(R-[A-Z0-9_]+-\d+)/);
    if (m) { cur = m[1]; out[cur] = []; }
    if (cur) out[cur].push(line.replace(/\s+$/, ''));
  }
  for (const k of Object.keys(out)) out[k] = out[k].join('\n').replace(/\n+$/, '');
  return out;
}

// ---------- start ----------
function cmdStart(id, slug) {
  if (!id || !/^[A-Z][A-Z0-9_]*$/.test(id)) fail('start 需要全大寫 SNAKE_CASE 的 MODULE_ID');
  if (!slug) fail('start 需要一個簡短的變更名稱（繁中可，不含空白與斜線）');
  if (!fs.existsSync(lockPath(id))) fail(`模組 ${id} 沒有 lock，尚未 IMPLEMENTED。未完工模組的需求調整請走 spec 02（把變更寫成選擇題）`);
  if (!fs.existsSync(matrixPath(id))) fail(`找不到 matrix/${id}.json`);
  if (openChanges(id).length) fail(`模組 ${id} 已有進行中的變更：${openChanges(id).map(rel).join('、')}`);
  const t = stamp();
  const dir = path.join(SDD, 'changes', id, `${t.compact}-${slug}`);
  fs.mkdirSync(path.join(dir, 'base.features'), { recursive: true });
  fs.copyFileSync(matrixPath(id), path.join(dir, 'base.matrix.json'));
  fs.copyFileSync(matrixPath(id), path.join(dir, 'proposed.matrix.json'));
  for (const f of featureFilesOf(id)) fs.copyFileSync(f, path.join(dir, 'base.features', path.basename(f)));
  const lock = readJson(lockPath(id));
  const md = [
    `> 狀態：草稿 ｜ 開始：${t.local}`,
    '',
    `# 需求變更：${slug}（模組 ${id}）`,
    '',
    '## 變更單原文',
    '',
    '（執行者逐字貼上使用者給的變更內容）',
    '',
    '## 分類',
    '',
    '（貼上 spec-change.js classify 的輸出）',
    '',
    '## 使用者核准',
    '',
    '（核准題目、選項與使用者答案原文、時間）',
    '',
    '## 核准後修正',
    '',
    '（沒有就留空。apply 之後又需要改矩陣時，在此寫入使用者答案原文，再執行 amend）',
    '',
    '## 收尾',
    '',
    `- 變更前 lock：${lock.lockedAt}`,
    '- （close 通過時由腳本追加結果）',
    '',
    '## 異動檔案',
    '',
    '（每完成一項追加一行，前綴步驟編號，例如「5A.1 terms.md：折抵上限 30% → 35%」；續跑時依此判斷做到哪）',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(dir, 'change.md'), md, 'utf8');
  console.log(`[spec-change] 已開啟變更：${rel(dir)}`);
  console.log(`  - 只改 ${rel(path.join(dir, 'proposed.matrix.json'))}，現行矩陣在核准前不得動`);
  console.log(`  - 已備份 ${featureFilesOf(id).length} 個 .feature 到 base.features/，收尾時用來檢查未受影響的 Rule 沒被動到`);
}

// ---------- classify ----------
const NUM_RE = /-?\d+(?:\.\d+)?%?/g;
const norm = (s) => String(s).replace(NUM_RE, '#');
const nums = (s) => String(s).match(NUM_RE) || [];

function diffList(label, a = [], b = []) {
  const notes = [];
  if (a.length !== b.length) return { level: 'BEHAVIOR', notes: [`${label} 條數 ${a.length} → ${b.length}`] };
  let level = 'NONE';
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    if (norm(a[i]) !== norm(b[i])) { level = 'BEHAVIOR'; notes.push(`${label}[${i}] 文字改變：「${a[i]}」→「${b[i]}」`); continue; }
    if (level === 'NONE') level = 'PARAMETER';
    notes.push(`${label}[${i}] 數值 ${nums(a[i]).join(',')} → ${nums(b[i]).join(',')}`);
  }
  return { level, notes };
}
const maxLevel = (...ls) => ls.reduce((m, l) => (RANK[l] > RANK[m] ? l : m), 'NONE');

const LEGACY_TYPE = {
  happy_path: 'main_flow', main_flow: 'main_flow',
  constraint: 'edge_case', boundary: 'edge_case', validation: 'edge_case',
  error_recovery: 'edge_case', known_tradeoff: 'edge_case', edge_case: 'edge_case',
};

function classify(base, proposed) {
  const result = { overall: 'NONE', rules: [], topLevel: [], formatOnly: [] };
  const bRules = Object.fromEntries((base.rules || []).map((r) => [r.rule_id, r]));
  const pRules = Object.fromEntries((proposed.rules || []).map((r) => [r.rule_id, r]));
  for (const rid of new Set([...Object.keys(bRules), ...Object.keys(pRules)])) {
    const b = bRules[rid], p = pRules[rid];
    if (!b) { result.rules.push({ rule_id: rid, level: 'NEW_RULE', notes: ['新增 Rule'] }); continue; }
    if (!p) { result.rules.push({ rule_id: rid, level: 'BEHAVIOR', notes: ['刪除 Rule'] }); continue; }
    let level = 'NONE';
    const notes = [];
    // 舊版 type 值遷移到 2.0 封閉集合（happy_path → main_flow，其餘 → edge_case）屬格式遷移，不影響行為、不計入範圍
    if (b.type !== p.type && LEGACY_TYPE[b.type] === p.type) result.formatOnly.push(rid);
    else if (b.type !== p.type) { level = 'BEHAVIOR'; notes.push(`type：「${b.type}」→「${p.type}」`); }
    for (const k of ['actor', 'trigger_event']) {
      if (b[k] !== p[k]) { level = 'BEHAVIOR'; notes.push(`${k}：「${b[k]}」→「${p[k]}」`); }
    }
    const pre = diffList('pre_conditions', b.pre_conditions, p.pre_conditions);
    const post = diffList('post_assertions', b.post_assertions, p.post_assertions);
    level = maxLevel(level, pre.level, post.level);
    notes.push(...pre.notes, ...post.notes);
    if (level !== 'NONE') result.rules.push({ rule_id: rid, level, notes });
  }
  const skip = new Set(['rules', 'spec_engine_version']);
  for (const k of new Set([...Object.keys(base), ...Object.keys(proposed)])) {
    if (skip.has(k)) continue;
    const a = JSON.stringify(base[k] ?? null), b = JSON.stringify(proposed[k] ?? null);
    if (a === b) continue;
    const level = norm(a) === norm(b) ? 'PARAMETER' : 'BEHAVIOR';
    result.topLevel.push({ key: k, level, notes: [`頂層欄位 ${k} 改變`] });
  }
  result.overall = maxLevel(...result.rules.map((r) => r.level), ...result.topLevel.map((t) => t.level));
  // 受影響範圍只取矩陣有差異的 Rule。頂層欄位改變不自動擴大範圍（擴大成全部會讓 close 的範圍檢查形同虛設），
  // 由執行者以 --also 逐條宣告、並讓使用者在核准時看到。
  result.affected = result.rules.map((r) => r.rule_id).sort();
  result.allRuleIds = [...new Set([...Object.keys(bRules), ...Object.keys(pRules)])].sort();
  return result;
}

function parseAlso(argv) {
  const i = argv.indexOf('--also');
  if (i < 0) return [];
  return String(argv[i + 1] || '').split(/[,，、\s]+/).map((s) => s.trim()).filter(Boolean);
}

/** 讀 classification.json 裡宣告的 --also，並與當下重算的結果合併。 */
function withExtra(dir, res) {
  const f = path.join(dir, 'classification.json');
  const extra = fs.existsSync(f) ? (readJson(f).extra || []) : [];
  return { ...res, extra, scope: [...new Set([...res.affected, ...extra])].sort() };
}

const LEVEL_TEXT = {
  NONE: '無變更（proposed 與現行矩陣相同）',
  PARAMETER: '只改參數：不重畫流程圖；改受影響 Rule 的 Examples、改程式、重新上鎖。使用者核准 1 次',
  BEHAVIOR: '改既有行為：重畫受影響的流程階段請使用者確認；受影響 Rule 重新形式化、補 Step／Driver、改程式、重新上鎖',
  NEW_RULE: '新增規則：先對新 Rule 跑探測清單產生選擇題，之後同 BEHAVIOR',
};

function cmdClassify(id, asJson, extraArg) {
  let extra = extraArg;
  const dir = theOpenChange(id);
  const res = classify(readJson(path.join(dir, 'base.matrix.json')), readJson(path.join(dir, 'proposed.matrix.json')));
  // 重跑 classify 沒帶 --also 時沿用上次宣告，避免連帶受影響的 Rule 被默默丟掉
  const prev = path.join(dir, 'classification.json');
  if (!extra.length && fs.existsSync(prev)) extra = readJson(prev).extra || [];
  const unknown = extra.filter((r) => !res.allRuleIds.includes(r));
  if (unknown.length) fail(`--also 宣告的 Rule 不存在：${unknown.join('、')}`);
  res.extra = extra.filter((r) => !res.affected.includes(r)).sort();
  res.scope = [...new Set([...res.affected, ...res.extra])].sort();
  fs.writeFileSync(path.join(dir, 'classification.json'), JSON.stringify(res, null, 2) + '\n', 'utf8');
  if (asJson) { console.log(JSON.stringify(res, null, 2)); return; }
  console.log(`[spec-change] 分類：${res.overall} — ${LEVEL_TEXT[res.overall]}`);
  console.log(`  受影響 Rule（矩陣有差異）：${res.affected.length ? res.affected.join('、') : '（無）'}`);
  if (res.extra.length) console.log(`  連帶受影響 Rule（--also 宣告，矩陣文字未變）：${res.extra.join('、')}；核准原文必須逐條提到`);
  if (res.formatOnly.length) console.log(`  只有 type 格式遷移、不計入範圍：${res.formatOnly.join('、')}（.feature 區塊仍須逐字不變）`);
  console.log(`  範圍外、收尾時逐字比對：${res.allRuleIds.filter((r) => !res.scope.includes(r)).join('、') || '（無）'}`);
  for (const r of res.rules) {
    console.log(`  - ${r.rule_id}：${r.level}`);
    r.notes.forEach((n) => console.log(`      ${n}`));
  }
  for (const t of res.topLevel) console.log(`  - 頂層欄位 ${t.key}：${t.level}`);
  if (res.topLevel.length && !res.extra.length) {
    console.log('  ⚠ 頂層欄位改變可能讓矩陣文字沒變的 Rule 的 Examples 期望值也跟著變。若有，請以 --also 宣告後重跑 classify。');
  }
  console.log('  分類只能往上調（執行者認為影響更大時可升級），不得往下調。');
}

// ---------- apply ----------
function cmdApply(id) {
  const dir = theOpenChange(id);
  const md = path.join(dir, 'change.md');
  const status = readStatusLine(md);
  if (status !== '草稿') fail(`change.md 狀態為「${status}」，apply 只能在「草稿」狀態執行一次`);
  const text = fs.readFileSync(md, 'utf8');
  const approval = section(text, '使用者核准');
  if (!approval.trim() || approval.includes('（核准題目、選項與使用者答案原文、時間）')) {
    fail('change.md「使用者核准」區塊尚未填寫使用者答案原文；未經使用者核准不得寫回矩陣');
  }
  const res = withExtra(dir, classify(readJson(path.join(dir, 'base.matrix.json')), readJson(path.join(dir, 'proposed.matrix.json'))));
  if (res.overall === 'NONE') fail('proposed 與現行矩陣相同，沒有可套用的變更');
  const unseen = res.extra.filter((r) => !approval.includes(r) && !approval.includes(r.replace(/^R-[A-Z0-9_]+-/, 'R-')));
  if (unseen.length) fail(`--also 宣告的 ${unseen.join('、')} 沒有出現在「使用者核准」原文中；連帶受影響的 Rule 必須讓使用者看到`);
  if (sha(matrixPath(id)) !== sha(path.join(dir, 'base.matrix.json'))) fail('現行矩陣在變更期間被直接改動過，與 base.matrix.json 不符；請檢查是誰改的');
  fs.copyFileSync(path.join(dir, 'proposed.matrix.json'), matrixPath(id));
  const t = stamp();
  setStatusLine(md, '已核准', `分類：${res.overall} ｜ 核准寫回：${t.local}`);
  writeApproved(dir, { approvedAt: t.iso, classification: res.overall, affected: res.scope, proposedHash: sha(matrixPath(id)) });
  console.log(`[spec-change] 已寫回 matrix/${id}.json（${res.overall}，範圍 ${res.scope.length} 條：矩陣差異 ${res.affected.length}、連帶宣告 ${res.extra.length}）。接著依分類執行後續步驟，完成後重新 lock 再 close。`);
}

function section(text, name) {
  const parts = text.split(`## ${name}`);
  if (parts.length < 2) return '';
  return parts[1].split(/\n## /)[0];
}
function writeApproved(dir, obj) {
  fs.writeFileSync(path.join(dir, 'approved.json'), JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

// ---------- amend ----------
function cmdAmend(id) {
  const dir = theOpenChange(id);
  const md = path.join(dir, 'change.md');
  if (readStatusLine(md) !== '已核准') fail('amend 只能在「已核准」狀態執行');
  const note = section(fs.readFileSync(md, 'utf8'), '核准後修正');
  if (!note.trim() || note.includes('（沒有就留空。')) fail('change.md「核准後修正」區塊沒有使用者答案原文；核准後再改矩陣也必須經使用者同意');
  const approved = readJson(path.join(dir, 'approved.json'));
  const res = withExtra(dir, classify(readJson(path.join(dir, 'base.matrix.json')), readJson(path.join(dir, 'proposed.matrix.json'))));
  if (RANK[res.overall] > RANK[approved.classification]) fail(`修正後分類從 ${approved.classification} 升為 ${res.overall}；請撤回本次變更後重開，讓使用者重新核准`);
  if (sha(matrixPath(id)) !== approved.proposedHash) fail('現行矩陣與上次核准寫回的版本不符：有人在 amend 之外直接改了矩陣');
  fs.copyFileSync(path.join(dir, 'proposed.matrix.json'), matrixPath(id));
  const scope = [...new Set([...approved.affected, ...res.scope])].sort();
  const added = scope.filter((r) => !approved.affected.includes(r));
  writeApproved(dir, { ...approved, affected: scope, proposedHash: sha(matrixPath(id)), amendedAt: new Date().toISOString() });
  console.log(`[spec-change] 已套用核准後修正（分類維持 ${approved.classification}）。${added.length ? `範圍新增：${added.join('、')}，請在 change.md 註明並確認使用者知情。` : '範圍不變。'}`);
}

// ---------- close ----------
function cmdClose(id) {
  const dir = theOpenChange(id);
  const md = path.join(dir, 'change.md');
  if (readStatusLine(md) !== '已核准') fail('只有「已核准」的變更可以 close');
  const approved = readJson(path.join(dir, 'approved.json'));
  const problems = [];
  if (!fs.existsSync(lockPath(id))) problems.push('找不到 lock，請先完成 spec 05 並重新 lock');
  else {
    const lock = readJson(lockPath(id));
    if (!(new Date(lock.lockedAt) > new Date(approved.approvedAt))) problems.push(`lock（${lock.lockedAt}）早於核准時間（${approved.approvedAt}），尚未重新 lock`);
    const mrel = rel(matrixPath(id));
    if (!lock.matrix || lock.matrix[mrel] !== sha(matrixPath(id))) problems.push('lock 未記錄現行矩陣雜湊，或矩陣在 lock 之後又被改動');
  }
  if (approved.proposedHash && sha(matrixPath(id)) !== approved.proposedHash) {
    problems.push('現行矩陣與使用者核准的版本不符：核准後又改了矩陣卻沒走 amend');
  }
  // 範圍檢查：未受影響的 Rule，其 .feature 區塊必須逐字相同
  const affected = new Set(approved.affected);
  const baseDir = path.join(dir, 'base.features');
  const baseBlocks = {};
  for (const f of fs.readdirSync(baseDir)) Object.assign(baseBlocks, ruleBlocks(fs.readFileSync(path.join(baseDir, f), 'utf8')));
  const nowBlocks = {};
  for (const f of featureFilesOf(id)) Object.assign(nowBlocks, ruleBlocks(fs.readFileSync(f, 'utf8')));
  const outOfScope = [];
  for (const rid of Object.keys(baseBlocks)) {
    if (affected.has(rid)) continue;
    if (!(rid in nowBlocks)) outOfScope.push(`${rid}：未受影響卻從 .feature 消失`);
    else if (baseBlocks[rid] !== nowBlocks[rid]) outOfScope.push(`${rid}：未受影響卻被改動`);
  }
  for (const rid of Object.keys(nowBlocks)) if (!(rid in baseBlocks) && !affected.has(rid)) outOfScope.push(`${rid}：不在核准範圍內的新 Rule 區塊`);
  problems.push(...outOfScope.map((x) => `[範圍外改動] ${x}`));
  if (problems.length) {
    console.error('[spec-change] close 未通過：');
    problems.forEach((p) => console.error(`  - ${p}`));
    process.exit(1);
  }
  const t = stamp();
  const checked = Object.keys(baseBlocks).filter((r) => !affected.has(r));
  setStatusLine(md, '已完成', `分類：${approved.classification} ｜ 完成：${t.local}`);
  const summary = `- close ${t.local}：範圍內 ${[...affected].length} 條；範圍外 ${checked.length} 條逐字未動（${checked.join('、') || '無'}）；lock ${readJson(lockPath(id)).lockedAt}`;
  const text = fs.readFileSync(md, 'utf8').replace('- （close 通過時由腳本追加結果）', summary);
  fs.writeFileSync(md, text.includes(summary) ? text : `${text}\n${summary}\n`, 'utf8');
  console.log(`[spec-change] 變更已完成：${rel(dir)}。範圍外 ${checked.length} 條 Rule 經逐字比對未被改動。`);
  if (!checked.length && Object.keys(baseBlocks).length) console.log('  ⚠ 範圍涵蓋全部 Rule，逐字比對沒有檢查任何區塊。');
}

function cmdStatus(id, asJson) {
  const open = openChanges(id).map((d) => ({ dir: rel(d), status: readStatusLine(path.join(d, 'change.md')) }));
  if (asJson) console.log(JSON.stringify({ module: id, open }, null, 2));
  else if (!open.length) console.log(`[spec-change] 模組 ${id} 沒有進行中的變更`);
  else open.forEach((o) => console.log(`[spec-change] ${id}：${o.dir}（${o.status}）`));
}

module.exports = { openChanges, readStatusLine, classify };

if (require.main === module) {
  const [cmd, id, arg] = process.argv.slice(2);
  const json = process.argv.includes('--json');
  if (cmd === 'start') cmdStart(id, arg);
  else if (cmd === 'classify') cmdClassify(id, json, parseAlso(process.argv));
  else if (cmd === 'apply') cmdApply(id);
  else if (cmd === 'amend') cmdAmend(id);
  else if (cmd === 'close') cmdClose(id);
  else if (cmd === 'status') cmdStatus(id, json);
  else {
    console.error('用法: node <本腳本路徑> <start <ID> <slug>|classify <ID> [--also R-..,R-..] [--json]|apply <ID>|amend <ID>|close <ID>|status <ID> [--json]>');
    process.exit(2);
  }
}
