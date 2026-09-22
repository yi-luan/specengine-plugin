#!/usr/bin/env node
/**
 * spec-guard.js
 *
 * 把「先畫靶再射箭」這個架構原則變成可執行的檢查：
 *   - 靶（.specengine/spec/）：Gherkin .feature、erm.dbml、terms.md、policy-defaults.md 全字節不可變。
 *   - 射箭（architecture-manifest.md 第 1 節宣告的 Step Definitions Directory）：靶心座標——
 *     每個 Given/When/Then 註冊的句型字串（決定了「哪一句 Gherkin 對應到哪個函式」）不可被
 *     改名/刪除/新增；函式內部的實作（從 Phase 04 的 `throw new Error(...)` 換成真正呼叫
 *     Controllers/ 等既有程式碼的邏輯）則是 Phase 05 本來就該做的事，不視為違規。
 *
 * 掃描目錄不寫死常數，而是直接解析 .claude/spec/architecture-manifest.md 第 1 節
 * 「Step Definitions Directory」宣告的路徑（RSROC 目前為單軌 playwright-bdd，只有一個目錄；
 * 若日後改回雙軌，manifest 那一行可宣告多個以頓號/斜線分隔的路徑，本腳本會全部納入掃描）。
 *
 * 不依賴任何第三方套件，僅用 Node.js 內建模組。執行時以當前工作目錄（專案根目錄）
 * 為準，所以請在專案根目錄下執行 `node ${CLAUDE_PLUGIN_ROOT}/scripts/spec-guard.js ...`，
 * 而不是先 cd 進本腳本所在目錄再執行。
 *
 * 用法：
 *   node ${CLAUDE_PLUGIN_ROOT}/scripts/spec-guard.js snapshot   # 在 spec 05 開工前執行，記錄基準
 *   node ${CLAUDE_PLUGIN_ROOT}/scripts/spec-guard.js verify     # 在 spec 05 收工前執行，比對是否被動過
 *
 * 快照檔位置：.specengine/sdd/.spec-guard-snapshot.json（屬於執行時態，不需要進 git）
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = process.cwd();
const SPEC_DIR = path.join('.specengine', 'spec');
const MANIFEST_PATH = path.join('.claude', 'spec', 'architecture-manifest.md');
const SNAPSHOT_PATH = path.join(ROOT, '.specengine', 'sdd', '.spec-guard-snapshot.json');

// 匹配 Given('...', ...) / When("...", ...) / Then(`...`, ...) 第一個參數的句型字串（playwright-bdd 語法）
const STEP_PATTERN_RE = /\b(Given|When|Then)\(\s*(['"`])((?:\\.|(?!\2).)*)\2/g;

/**
 * 從 architecture-manifest.md 第 1 節解析「Step Definitions Directory」宣告的路徑。
 * 宣告行格式為「- Step Definitions Directory（...附註...）：`path1`／`path2`，以 ... 綁定，複用...」——
 * 只取「：」之後、第一個中文逗號「，」之前的區段（即實際路徑清單本身，可能不只一個，斜線分隔），
 * 不把後面「以 playwright-bdd 綁定」「複用既有 xxx」等說明句裡的反引號誤判為目錄路徑。
 * 找不到宣告時回傳空陣列，由呼叫端決定是否 Fail Loud。
 */
function resolveStepDirs() {
  const manifestAbsPath = path.join(ROOT, MANIFEST_PATH);
  if (!fs.existsSync(manifestAbsPath)) {
    return { dirs: [], error: `找不到 ${MANIFEST_PATH}，無法解析 Step Definitions Directory 宣告` };
  }
  const content = fs.readFileSync(manifestAbsPath, 'utf8');
  const line = content
    .split('\n')
    .find((l) => l.includes('Step Definitions Directory'));
  if (!line) {
    return { dirs: [], error: `${MANIFEST_PATH} 第 1 節未找到「Step Definitions Directory」宣告行` };
  }
  const afterColon = line.split(/[:：]/).slice(1).join(':'); // 取第一個全形/半形冒號之後的部分
  if (!afterColon) {
    return { dirs: [], error: `${MANIFEST_PATH} 的 Step Definitions Directory 宣告行找不到「：」分隔路徑清單：${line.trim()}` };
  }
  const pathsClause = afterColon.split('，')[0]; // 只取路徑清單本身，不含後面「，以 xxx 綁定」等說明子句
  const matches = [...pathsClause.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim());
  const dirs = matches.filter((p) => !p.includes('{') && p.length > 0); // 過濾掉範例占位符（如 {MODULE_ID}）
  if (!dirs.length) {
    return { dirs: [], error: `${MANIFEST_PATH} 的 Step Definitions Directory 宣告行內找不到任何反引號路徑：${line.trim()}` };
  }
  return { dirs, error: null };
}

function listFiles(relDir) {
  const absDir = path.join(ROOT, relDir);
  if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) return [];
  const out = [];
  const stack = [absDir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === '.gitkeep') continue;
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(abs);
      } else {
        out.push(path.relative(ROOT, abs).split(path.sep).join('/'));
      }
    }
  }
  return out.sort();
}

function hashFile(relPath) {
  const content = fs.readFileSync(path.join(ROOT, relPath));
  return crypto.createHash('sha256').update(content).digest('hex');
}

function extractStepSignatures(relPath) {
  const content = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const signatures = new Set();
  let m;
  STEP_PATTERN_RE.lastIndex = 0;
  while ((m = STEP_PATTERN_RE.exec(content)) !== null) {
    signatures.add(`${m[1]}::${m[3]}`);
  }
  return [...signatures].sort();
}

function buildSnapshot(stepDirs) {
  const snapshot = { spec: {}, stepSignatures: {} };
  for (const relPath of listFiles(SPEC_DIR)) {
    snapshot.spec[relPath] = hashFile(relPath);
  }
  for (const stepDir of stepDirs) {
    for (const relPath of listFiles(stepDir)) {
      snapshot.stepSignatures[relPath] = extractStepSignatures(relPath);
    }
  }
  return snapshot;
}

function requireStepDirsOrFailLoud() {
  const { dirs, error } = resolveStepDirs();
  if (error) {
    console.error(`[spec-guard] Fail Loud：${error}`);
    process.exit(2);
  }
  const missing = dirs.filter((d) => !fs.existsSync(path.join(ROOT, d)));
  if (missing.length === dirs.length) {
    console.error(`[spec-guard] Fail Loud：manifest 宣告的 Step Definitions Directory 全部不存在（${dirs.join('、')}），無法建立有意義的快照。請先確認 spec-04 是否已產出測試骨架。`);
    process.exit(2);
  }
  return dirs;
}

function cmdSnapshot() {
  const stepDirs = requireStepDirsOrFailLoud();
  const snapshot = buildSnapshot(stepDirs);
  const specCount = Object.keys(snapshot.spec).length;
  const stepFileCount = Object.keys(snapshot.stepSignatures).length;
  const stepSigCount = Object.values(snapshot.stepSignatures).reduce((n, arr) => n + arr.length, 0);
  if (stepSigCount === 0) {
    console.error(`[spec-guard] Fail Loud：${stepDirs.join('、')} 目錄下掃描不到任何 Given/When/Then 句型，凍結到 0 個句型視同尚未產出測試骨架，拒絕建立快照。`);
    process.exit(2);
  }
  fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
  console.log(`[spec-guard] 已建立基準快照：.specengine/spec/ ${specCount} 個檔案（全字節凍結）、${stepDirs.join('、')} 共 ${stepFileCount} 個檔案 ${stepSigCount} 個 Step 句型（僅凍結句型，函式內部實作可自由填寫）。`);
}

function cmdVerify() {
  const stepDirs = requireStepDirsOrFailLoud();
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    console.error('[spec-guard] 找不到基準快照，請先執行本腳本的 snapshot 指令（node <本腳本路徑> snapshot）');
    process.exit(2);
  }
  const baseline = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
  const current = buildSnapshot(stepDirs);
  const violations = [];

  // 1. .specengine/spec/ 全字節不可變檢查
  const specAdded = Object.keys(current.spec).filter((f) => !(f in baseline.spec));
  const specRemoved = Object.keys(baseline.spec).filter((f) => !(f in current.spec));
  const specChanged = Object.keys(current.spec).filter((f) => f in baseline.spec && baseline.spec[f] !== current.spec[f]);
  specChanged.forEach((f) => violations.push(`[.specengine/spec/ 內容變更] ${f}`));
  specAdded.forEach((f) => violations.push(`[.specengine/spec/ 新增檔案] ${f}`));
  specRemoved.forEach((f) => violations.push(`[.specengine/spec/ 遭刪除] ${f}`));

  // 2. Step Definitions Directory 僅檢查 Step 句型簽章，不檢查函式內部實作
  const allStepFiles = new Set([...Object.keys(baseline.stepSignatures), ...Object.keys(current.stepSignatures)]);
  for (const f of allStepFiles) {
    const before = new Set(baseline.stepSignatures[f] || []);
    const after = new Set(current.stepSignatures[f] || []);
    const missing = [...before].filter((sig) => !after.has(sig));
    const added = [...after].filter((sig) => !before.has(sig));
    missing.forEach((sig) => violations.push(`[Step 句型遭移除/改名] ${f} :: ${sig}`));
    added.forEach((sig) => violations.push(`[Step 句型未經 spec 03/04 產生卻新增] ${f} :: ${sig}`));
  }

  if (!violations.length) {
    console.log(`[spec-guard] 通過：.specengine/spec/（靶）全字節未變，${stepDirs.join('、')} 的 Step 句型（靶心座標）未被改名/刪除/新增。函式內部實作可自由變動，符合 TDD 紅轉綠的預期。`);
    process.exit(0);
  }

  console.error('[spec-guard] 違反「先畫靶再射箭」不變性！以下項目在 spec 05 執行期間被異動：');
  violations.forEach((v) => console.error(`  - ${v}`));
  console.error('若是 .specengine/spec/ 被動到：檢查是否為了讓測試通過而擅自改了規格。若是 Step 句型被改名/刪除/新增：檢查是否偷改了測試案例本身，而不是實作既有程式碼去滿足既有案例。');
  process.exit(1);
}

const cmd = process.argv[2];
if (cmd === 'snapshot') cmdSnapshot();
else if (cmd === 'verify') cmdVerify();
else {
  console.error('用法: node <本腳本路徑> <snapshot|verify>');
  process.exit(2);
}
