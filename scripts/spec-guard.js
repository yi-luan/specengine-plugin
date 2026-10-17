#!/usr/bin/env node
/**
 * spec-guard.js
 *
 * 把「先畫靶再射箭」這個架構原則變成可執行的檢查。凍結三層：
 *   1. 靶（.specengine/spec/）：.feature、erm.dbml、terms.md、policy-defaults.md 全字節不可變。
 *   2. 靶心座標（manifest「Step Definitions Directory」）：每個 Given/When/Then 註冊的句型字串
 *      不可改名/刪除/新增。函式內部實作是 spec 05 本來該做的事，不受限。
 *   3. 綁定契約（manifest「Driver Directory」，選填）：檔名含 `.driver.` 的介面檔全字節不可變；
 *      同目錄下的實作檔（例如 *.inprocess.ts、*.ui.ts）是 spec 05 要寫的東西，不受限。
 *      manifest 未宣告 Driver Directory、或 Binding Layer 為 direct 時，略過第 3 層。
 *
 * 目錄不寫死，直接解析 .claude/spec/architecture-manifest.md 的宣告行；每行可宣告多個反引號路徑。
 * Step Definitions Directory 仍為〔待確認〕時 Fail Loud，不猜測目錄。
 *
 * 僅用 Node.js 內建模組。請在專案根目錄執行：
 *   node "${CLAUDE_PLUGIN_ROOT}/scripts/spec-guard.js" snapshot          # spec 05 開工前（同時檢查 @binds 指向真實的 Driver 方法）
 *   node "${CLAUDE_PLUGIN_ROOT}/scripts/spec-guard.js" verify            # spec 05 收工前
 *   node "${CLAUDE_PLUGIN_ROOT}/scripts/spec-guard.js" lock <MODULE_ID>  # verify 通過後，寫入該模組的 lock（進 git，IMPLEMENTED 的證據）
 *   node "${CLAUDE_PLUGIN_ROOT}/scripts/spec-guard.js" audit             # spec 06 執行，比對所有 lock 與現況，抓事後偷改
 * 路徑加雙引號，避免 Windows 反斜線在 bash 中被跳脫。
 *
 * 快照檔：.specengine/sdd/.spec-guard-snapshot.json（執行時態，應加入 .gitignore）
 * lock 檔：.specengine/sdd/locks/<MODULE_ID>.lock.json（應進 git）
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = process.cwd();
const SPEC_DIR = path.join('.specengine', 'spec');
const MANIFEST_PATH = path.join('.claude', 'spec', 'architecture-manifest.md');
const SNAPSHOT_PATH = path.join(ROOT, '.specengine', 'sdd', '.spec-guard-snapshot.json');
const LOCKS_DIR = path.join(ROOT, '.specengine', 'sdd', 'locks');

// 匹配 Given('...', ...) / When("...", ...) / Then(`...`, ...) 第一個參數的句型字串
const STEP_PATTERN_RE = /\b(Given|When|Then)\(\s*(['"`])((?:\\.|(?!\2).)*)\2/g;
// Driver 介面檔命名慣例：檔名含 `.driver.`（例如 點數折抵.driver.ts）
const DRIVER_INTERFACE_RE = /\.driver\.[^/]+$/;

function readManifest() {
  const abs = path.join(ROOT, MANIFEST_PATH);
  if (!fs.existsSync(abs)) return null;
  return fs.readFileSync(abs, 'utf8').split('\n');
}

/**
 * 解析 manifest 中某個欄位宣告行裡的反引號路徑清單。
 * 只取「：」之後、第一個中文逗號「，」之前的區段，避免把說明句裡的反引號誤判為路徑。
 */
function resolveManifestDirs(lines, fieldName) {
  const line = lines.find((l) => l.includes(fieldName));
  if (!line) return { dirs: [], state: 'missing', line: null };
  if (line.includes('〔待確認〕')) return { dirs: [], state: 'pending', line };
  const afterColon = line.split(/[:：]/).slice(1).join(':');
  const pathsClause = afterColon.split('，')[0];
  const dirs = [...pathsClause.matchAll(/`([^`]+)`/g)]
    .map((m) => m[1].trim())
    .filter((p) => p.length > 0 && !p.includes('{'));
  return { dirs, state: dirs.length ? 'ok' : 'empty', line };
}

function resolveBindingLayer(lines) {
  const line = lines.find((l) => l.includes('Binding Layer'));
  if (!line) return 'unknown';
  const value = line.split(/[:：]/).slice(1).join(':').toLowerCase();
  if (value.includes('direct')) return 'direct';
  if (value.includes('〔待確認〕')) return 'pending';
  return 'driver';
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
      if (entry.isDirectory()) stack.push(abs);
      else out.push(path.relative(ROOT, abs).split(path.sep).join('/'));
    }
  }
  return out.sort();
}

function hashFile(relPath) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, relPath))).digest('hex');
}

function extractStepSignatures(relPath) {
  const content = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const signatures = new Set();
  let m;
  STEP_PATTERN_RE.lastIndex = 0;
  while ((m = STEP_PATTERN_RE.exec(content)) !== null) signatures.add(`${m[1]}::${m[3]}`);
  return [...signatures].sort();
}

/**
 * 解析 manifest，決定三層各自的掃描範圍。Step Definitions Directory 為必填，其餘選填。
 */
function resolveTargets() {
  const lines = readManifest();
  if (!lines) fail(`找不到 ${MANIFEST_PATH}，無法解析掃描目錄`);

  const steps = resolveManifestDirs(lines, 'Step Definitions Directory');
  if (steps.state === 'missing') fail(`${MANIFEST_PATH} 未找到「Step Definitions Directory」宣告行`);
  if (steps.state === 'pending') fail(`${MANIFEST_PATH} 的 Step Definitions Directory 仍為〔待確認〕，請先執行 spec-manifest-sync 或手動填寫實際目錄`);
  if (steps.state === 'empty') fail(`${MANIFEST_PATH} 的 Step Definitions Directory 宣告行內找不到任何反引號路徑：${steps.line.trim()}`);
  const missing = steps.dirs.filter((d) => !fs.existsSync(path.join(ROOT, d)));
  if (missing.length === steps.dirs.length) {
    fail(`manifest 宣告的 Step Definitions Directory 全部不存在（${steps.dirs.join('、')}），請先確認 spec-04 是否已產出測試骨架`);
  }

  const bindingLayer = resolveBindingLayer(lines);
  let driverDirs = [];
  let driverNote = '';
  if (bindingLayer === 'direct') {
    driverNote = 'Binding Layer 為 direct，略過 Driver 介面凍結';
  } else {
    const drivers = resolveManifestDirs(lines, 'Driver Directory');
    if (drivers.state === 'ok') {
      driverDirs = drivers.dirs.filter((d) => fs.existsSync(path.join(ROOT, d)));
      driverNote = driverDirs.length ? '' : `Driver Directory（${drivers.dirs.join('、')}）尚不存在，本輪略過 Driver 介面凍結`;
    } else {
      driverNote = 'manifest 未宣告 Driver Directory，略過 Driver 介面凍結';
    }
  }
  return { stepDirs: steps.dirs, driverDirs, driverNote };
}

/**
 * 檢查每個 step 檔裡的 `@binds X.y` 是否真的指向 Driver 介面檔中存在的方法 y。
 * 只在 driver 模式（有 driverDirs）下執行；direct 模式的 @binds 指向 Service，不在本腳本範圍。
 */
function checkBinds(stepDirs, driverDirs) {
  if (!driverDirs.length) return;
  const ifaceText = driverDirs
    .flatMap((d) => listFiles(d))
    .filter((f) => DRIVER_INTERFACE_RE.test(f))
    .map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8'))
    .join('\n');
  const missing = [];
  const BINDS_RE = /@binds\s+([\w$一-鿿]+)\.([\w$一-鿿]+)/g;
  for (const dir of stepDirs) {
    for (const f of listFiles(dir)) {
      const content = fs.readFileSync(path.join(ROOT, f), 'utf8');
      let m;
      BINDS_RE.lastIndex = 0;
      while ((m = BINDS_RE.exec(content)) !== null) {
        const [, iface, method] = m;
        const methodRe = new RegExp(`(^|[^\\w$\\u4e00-\\u9fff])${method}\\s*\\(`, 'mu');
        if (!methodRe.test(ifaceText)) missing.push(`${f} :: @binds ${iface}.${method}（Driver 介面檔中找不到方法 ${method}）`);
      }
    }
  }
  if (missing.length) {
    console.error('[spec-guard] Fail Loud：以下 @binds 指向不存在的 Driver 方法，請先修正 spec-04 產出：');
    missing.forEach((x) => console.error(`  - ${x}`));
    process.exit(2);
  }
}

/**
 * 某模組專屬的產物：含該模組 tag 的 feature、含該模組 @rule 註解的 step 檔、
 * 以及這些 step 檔 @binds 指到的 Driver 介面檔。供 lock／audit 使用。
 */
function moduleArtifacts(id, { stepDirs, driverDirs }) {
  const out = { features: {}, stepSignatures: {}, driverInterfaces: {} };
  for (const f of listFiles(path.join(SPEC_DIR, 'features'))) {
    if (fs.readFileSync(path.join(ROOT, f), 'utf8').includes(`@rule:R-${id}-`)) out.features[f] = hashFile(f);
  }
  const ifaceNames = new Set();
  for (const dir of stepDirs) {
    for (const f of listFiles(dir)) {
      const content = fs.readFileSync(path.join(ROOT, f), 'utf8');
      if (!content.includes(`@rule R-${id}-`)) continue;
      out.stepSignatures[f] = extractStepSignatures(f);
      for (const m of content.matchAll(/@binds\s+([\w$一-鿿]+)\./g)) ifaceNames.add(m[1]);
    }
  }
  for (const dir of driverDirs) {
    for (const f of listFiles(dir)) {
      if (!DRIVER_INTERFACE_RE.test(f)) continue;
      const content = fs.readFileSync(path.join(ROOT, f), 'utf8');
      if ([...ifaceNames].some((n) => content.includes(n))) out.driverInterfaces[f] = hashFile(f);
    }
  }
  return out;
}

function buildSnapshot({ stepDirs, driverDirs }) {
  const snapshot = { spec: {}, stepSignatures: {}, driverInterfaces: {} };
  for (const f of listFiles(SPEC_DIR)) snapshot.spec[f] = hashFile(f);
  for (const dir of stepDirs) for (const f of listFiles(dir)) snapshot.stepSignatures[f] = extractStepSignatures(f);
  for (const dir of driverDirs) for (const f of listFiles(dir)) if (DRIVER_INTERFACE_RE.test(f)) snapshot.driverInterfaces[f] = hashFile(f);
  return snapshot;
}

function fail(message, code = 2) {
  console.error(`[spec-guard] Fail Loud：${message}`);
  process.exit(code);
}

function cmdSnapshot() {
  const targets = resolveTargets();
  checkBinds(targets.stepDirs, targets.driverDirs);
  const snapshot = buildSnapshot(targets);
  const specCount = Object.keys(snapshot.spec).length;
  const stepFileCount = Object.keys(snapshot.stepSignatures).length;
  const stepSigCount = Object.values(snapshot.stepSignatures).reduce((n, arr) => n + arr.length, 0);
  const driverCount = Object.keys(snapshot.driverInterfaces).length;
  if (stepSigCount === 0) {
    fail(`${targets.stepDirs.join('、')} 下掃描不到任何 Given/When/Then 句型，凍結到 0 個句型視同尚未產出測試骨架，拒絕建立快照`);
  }
  fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
  console.log(`[spec-guard] 已建立基準快照：`);
  console.log(`  - .specengine/spec/：${specCount} 個檔案（全字節凍結）`);
  console.log(`  - ${targets.stepDirs.join('、')}：${stepFileCount} 個檔案、${stepSigCount} 個 Step 句型（僅凍結句型）`);
  if (targets.driverDirs.length) console.log(`  - ${targets.driverDirs.join('、')}：${driverCount} 個 Driver 介面檔（*.driver.*，全字節凍結；實作檔不受限）`);
  if (targets.driverNote) console.log(`  - ${targets.driverNote}`);
  console.log('[spec-guard] 快照檔 .specengine/sdd/.spec-guard-snapshot.json 屬執行時態，建議加入 .gitignore。');
}

function diffHashes(label, before, after, violations) {
  for (const f of Object.keys(after)) {
    if (!(f in before)) violations.push(`[${label} 新增檔案] ${f}`);
    else if (before[f] !== after[f]) violations.push(`[${label} 內容變更] ${f}`);
  }
  for (const f of Object.keys(before)) if (!(f in after)) violations.push(`[${label} 遭刪除] ${f}`);
}

function cmdVerify() {
  const targets = resolveTargets();
  if (!fs.existsSync(SNAPSHOT_PATH)) fail('找不到基準快照，請先執行 snapshot 指令');
  const baseline = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
  const current = buildSnapshot(targets);
  const violations = [];

  diffHashes('.specengine/spec/', baseline.spec, current.spec, violations);

  const allStepFiles = new Set([...Object.keys(baseline.stepSignatures), ...Object.keys(current.stepSignatures)]);
  for (const f of allStepFiles) {
    const before = new Set(baseline.stepSignatures[f] || []);
    const after = new Set(current.stepSignatures[f] || []);
    [...before].filter((s) => !after.has(s)).forEach((s) => violations.push(`[Step 句型遭移除/改名] ${f} :: ${s}`));
    [...after].filter((s) => !before.has(s)).forEach((s) => violations.push(`[Step 句型未經 spec 03/04 產生卻新增] ${f} :: ${s}`));
  }

  diffHashes('Driver 介面', baseline.driverInterfaces || {}, current.driverInterfaces, violations);

  if (!violations.length) {
    console.log('[spec-guard] 通過：規格全字節未變，Step 句型未被改名/刪除/新增，Driver 介面未變。函式內部與 Driver 實作可自由變動，符合 TDD 紅轉綠的預期。');
    process.exit(0);
  }
  console.error('[spec-guard] 違反「先畫靶再射箭」不變性！以下項目在 spec 05 執行期間被異動：');
  violations.forEach((v) => console.error(`  - ${v}`));
  console.error('規格被動到：檢查是否為了讓測試通過而改了規格。句型或 Driver 介面被動到：檢查是否改了測試契約本身，而不是實作既有契約。');
  process.exit(1);
}

/**
 * lock <MODULE_ID>：spec 05 通過 verify 後執行。把該模組專屬產物的雜湊與句型集合寫入
 * .specengine/sdd/locks/<MODULE_ID>.lock.json，這個檔案要進 git，是「IMPLEMENTED」的證據，
 * 也是日後 audit 偵測規格或句型被事後偷改的基準。
 */
function cmdLock(id) {
  if (!id || !/^[A-Z][A-Z0-9_]*$/.test(id)) fail('lock 需要一個全大寫 SNAKE_CASE 的 MODULE_ID 參數');
  const targets = resolveTargets();
  const artifacts = moduleArtifacts(id, targets);
  if (!Object.keys(artifacts.features).length) fail(`找不到任何含 @rule:R-${id}- 的 .feature，無法建立 lock`);
  if (!Object.keys(artifacts.stepSignatures).length) fail(`找不到任何含 @rule R-${id}- 的 Step Definitions，無法建立 lock`);
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const local = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const lock = { module: id, lockedAt: now.toISOString(), lockedAtLocal: local, ...artifacts };
  fs.mkdirSync(LOCKS_DIR, { recursive: true });
  const file = path.join(LOCKS_DIR, `${id}.lock.json`);
  fs.writeFileSync(file, JSON.stringify(lock, null, 2) + '\n', 'utf8');
  console.log(`[spec-guard] 已建立 lock：${path.relative(ROOT, file).split(path.sep).join('/')}（feature ${Object.keys(artifacts.features).length} 個、Step 檔 ${Object.keys(artifacts.stepSignatures).length} 個、Driver 介面 ${Object.keys(artifacts.driverInterfaces).length} 個）。此檔應進 git。`);
}

/**
 * audit：spec 06 執行。逐一比對所有 lock 與現況，回報事後被改動的規格、句型或 Driver 介面。
 */
function cmdAudit() {
  if (!fs.existsSync(LOCKS_DIR)) {
    console.log('[spec-guard] 沒有任何 lock，尚無模組 IMPLEMENTED，略過 audit。');
    process.exit(0);
  }
  const targets = resolveTargets();
  const drifts = [];
  for (const name of fs.readdirSync(LOCKS_DIR)) {
    if (!name.endsWith('.lock.json')) continue;
    const lock = JSON.parse(fs.readFileSync(path.join(LOCKS_DIR, name), 'utf8'));
    const now = moduleArtifacts(lock.module, targets);
    const v = [];
    diffHashes('.feature', lock.features, now.features, v);
    const allStep = new Set([...Object.keys(lock.stepSignatures), ...Object.keys(now.stepSignatures)]);
    for (const f of allStep) {
      const before = new Set(lock.stepSignatures[f] || []);
      const after = new Set(now.stepSignatures[f] || []);
      [...before].filter((s) => !after.has(s)).forEach((s) => v.push(`[Step 句型遭移除/改名] ${f} :: ${s}`));
      [...after].filter((s) => !before.has(s)).forEach((s) => v.push(`[Step 句型新增] ${f} :: ${s}`));
    }
    diffHashes('Driver 介面', lock.driverInterfaces, now.driverInterfaces, v);
    if (v.length) drifts.push({ module: lock.module, lockedAt: lock.lockedAt, lockedAtLocal: lock.lockedAtLocal, violations: v });
  }
  if (!drifts.length) {
    console.log('[spec-guard] audit 通過：所有 IMPLEMENTED 模組的規格、句型與 Driver 介面自 lock 以來未被改動。');
    process.exit(0);
  }
  console.error(`[spec-guard] audit 發現 ${drifts.length} 個模組在 lock 之後被改動（LOCK_DRIFT）：`);
  for (const d of drifts) {
    console.error(`  模組 ${d.module}（lock 於 ${d.lockedAtLocal || d.lockedAt}）：`);
    d.violations.forEach((x) => console.error(`    - ${x}`));
  }
  console.error('這些改動沒有經過 spec 02～05 流程。請由人決定：是合法的規格變更（重跑對應階段並重新 lock），還是該回滾。');
  process.exit(1);
}

const cmd = process.argv[2];
if (cmd === 'snapshot') cmdSnapshot();
else if (cmd === 'verify') cmdVerify();
else if (cmd === 'lock') cmdLock(process.argv[3]);
else if (cmd === 'audit') cmdAudit();
else {
  console.error('用法: node <本腳本路徑> <snapshot|verify|lock <MODULE_ID>|audit>');
  process.exit(2);
}
