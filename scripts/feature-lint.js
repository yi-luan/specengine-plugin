#!/usr/bin/env node
/**
 * feature-lint.js
 *
 * 把 `${CLAUDE_PLUGIN_ROOT}/docs/contract-rules.md` 第 3、4 節「Gherkin 純淨度與結構規範」，
 * 從 prompt 裡的「絕對禁止」轉成實際會 fail 的檢查，供 spec 03 收工前與 CI 執行。
 * 檢查項目：XML/code fence/`# language` 污染、Tab 縮排、檔尾單一換行、
 * 每個 Rule 必須掛 `@rule:R-XXXX` tag、Rule 依 ID 字典序排序、
 * 矩陣 JSON 結構、矩陣 Rule 與 feature tag 一一對應（僅對已形式化的模組）。
 * 通過時另產出 .specengine/sdd/steps-index.json（全部既有句型的正規化索引，供 spec 03 複用句型）。
 * 不依賴任何第三方套件，僅用 Node.js 內建模組。執行時以當前工作目錄（專案根目錄）
 * 為準，請在專案根目錄下執行，而不是先 cd 進本腳本所在目錄再執行。
 *
 * 用法：
 *   node "${CLAUDE_PLUGIN_ROOT}/scripts/feature-lint.js"
 *
 * 檢查對象：.specengine/spec/features/*.feature、.specengine/spec/erm.dbml
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const FEATURES_DIR = path.join(ROOT, '.specengine', 'spec', 'features');
const DBML_PATH = path.join(ROOT, '.specengine', 'spec', 'erm.dbml');
const MATRIX_DIR = path.join(ROOT, '.specengine', 'sdd', 'matrix');
const STEP_INDEX_PATH = path.join(ROOT, '.specengine', 'sdd', 'steps-index.json');

const RULE_TYPES = new Set(['main_flow', 'edge_case']); // 見 contract-rules 第 1.6 條

const violations = [];
const allTags = new Set(); // 所有 feature 中出現的 @rule:R-... ID
const stepIndex = new Map(); // 正規化句型 → { count, files }

function reportViolation(file, line, message) {
  violations.push(`${path.relative(ROOT, file)}:${line} — ${message}`);
}

const TAG_RE = /<\/?([a-zA-Z][\w-]*)\s*([^>]*)>/g;

/**
 * 找出全檔案中「有配對 </name> 關閉標籤」或「帶屬性/斜線」的 <name>——這才是真正
 * 的 XML/HTML 污染。裸露、無配對、無屬性的 <name>（如 Scenario Outline 的
 * <amount> 佔位符）是合法 Gherkin 語法，不算違規，否則會誤殺每一個 Scenario Outline。
 */
function findRealTagNames(raw) {
  const closingNames = new Set();
  let m;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(raw)) !== null) {
    if (m[0].startsWith('</')) closingNames.add(m[1]);
  }
  return closingNames;
}

function isRealTagMatch(fullMatch, name, rest, closingNames) {
  if (fullMatch.startsWith('</')) return true; // 關閉標籤，Gherkin/DBML 不應出現
  if (rest.trim().length > 0) return true; // 帶屬性或自我封閉斜線，非裸佔位符
  return closingNames.has(name); // 有對應的 </name> 關閉標籤，視為真正的 XML 標籤配對
}

function lintCommon(filePath, lines, raw) {
  const closingNames = findRealTagNames(raw);
  lines.forEach((text, idx) => {
    const lineNo = idx + 1;
    if (text.includes('```')) {
      reportViolation(filePath, lineNo, '禁止夾帶 Markdown 程式碼區塊標記 (```)');
    }
    let m;
    const lineTagRe = new RegExp(TAG_RE.source, 'g');
    while ((m = lineTagRe.exec(text)) !== null) {
      if (isRealTagMatch(m[0], m[1], m[2], closingNames)) {
        reportViolation(filePath, lineNo, `禁止夾帶 XML/HTML 標籤 (${m[0]})`);
      }
    }
    if (/^\s*#\s*language:\s*zh-TW/.test(text)) {
      reportViolation(filePath, lineNo, '禁止寫入 `# language: zh-TW`（結構關鍵字強制英文，靠此行沒有意義且違反規範）');
    }
    if (text.includes('\t')) {
      reportViolation(filePath, lineNo, '禁止使用 Tab 縮排，必須統一為 2 個空格');
    }
  });
}

function lintFeatureFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);

  const firstNonEmpty = lines.find((l) => l.trim().length > 0) || '';
  // 允許 Gherkin 合法的 @tag 行置於 Feature 之前
  if (!/^(Feature:|@[\w:-]+)/.test(firstNonEmpty.trim())) {
    reportViolation(filePath, 1, '檔案第一行必須直接進入 `Feature:` 或 `@tag` 行，不得有 YAML Header 或其他前綴內容');
  }

  lintCommon(filePath, lines, raw);

  // Rule ID 必須以 tag 形式 `@rule:R-XXXX` 掛在 `Rule:` 正上方，測試報告才帶得出來；
  // 舊的註解形式 `# @rule R-XXXX` 執行器看不到，視為違規。
  const ruleIds = [];
  lines.forEach((text, idx) => {
    const lineNo = idx + 1;
    if (/^\s*#\s*@rule\s+R-/.test(text)) {
      reportViolation(filePath, lineNo, '`# @rule` 註解形式已廢止，請改為 tag `@rule:R-XXXX` 並置於 `Rule:` 正上方');
      return;
    }
    const tag = text.match(/^\s*(?:@[\w:-]+\s+)*@rule:(R-[\w-]+)/);
    if (tag) {
      ruleIds.push(tag[1]);
      const next = lines.slice(idx + 1).find((l) => l.trim().length > 0 && !/^\s*@/.test(l)) || '';
      if (!/^\s*Rule:/.test(next)) {
        reportViolation(filePath, lineNo, `@rule:${tag[1]} tag 之後必須緊接 \`Rule:\` 區塊`);
      }
    }
    if (/^\s*Rule:/.test(text)) {
      let j = idx - 1;
      let tagged = false;
      while (j >= 0 && /^\s*@/.test(lines[j])) {
        if (/@rule:R-[\w-]+/.test(lines[j])) tagged = true;
        j--;
      }
      if (!tagged) reportViolation(filePath, lineNo, '每個 `Rule:` 區塊上方必須有 `@rule:R-XXXX` tag');
    }
  });
  const sorted = [...ruleIds].sort();
  for (let i = 0; i < ruleIds.length; i++) {
    if (ruleIds[i] !== sorted[i]) {
      reportViolation(filePath, 0, `Rule 區塊未依 @rule ID 字典序排序：實際順序 [${ruleIds.join(', ')}]，預期 [${sorted.join(', ')}]`);
      break;
    }
  }

  if (!raw.endsWith('\n') || raw.endsWith('\n\n')) {
    reportViolation(filePath, lines.length, '檔案末尾必須保留「單一」換行符');
  }

  // 蒐集本檔的 tag 與步驟句型，供矩陣對照與句型索引
  ruleIds.forEach((id) => allTags.add(id));
  lines.forEach((text) => {
    const m = text.match(/^\s*(Given|When|Then|And|But)\s+(.+?)\s*$/);
    if (!m) return;
    const sentence = m[2].replace(/"[^"]*"/g, '{string}');
    const entry = stepIndex.get(sentence) || { count: 0, files: new Set() };
    entry.count += 1;
    entry.files.add(path.relative(ROOT, filePath).split(path.sep).join('/'));
    stepIndex.set(sentence, entry);
  });
}

function lintDbml(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  lintCommon(filePath, raw.split(/\r?\n/), raw);
}

/**
 * 矩陣結構驗證與「矩陣 Rule ↔ feature @rule: tag」一致性。
 * 只對「已經開始形式化」的模組（features 中至少有一個該模組的 tag）做一致性比對，
 * 尚在釐清階段的模組不會因為還沒寫 feature 而被誤判。
 */
function lintMatrices() {
  if (!fs.existsSync(MATRIX_DIR)) return;
  for (const name of fs.readdirSync(MATRIX_DIR)) {
    if (!name.endsWith('.json')) continue;
    const moduleId = name.replace(/\.json$/, '');
    const file = path.join(MATRIX_DIR, name);
    let matrix;
    try {
      matrix = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      reportViolation(file, 0, `矩陣不是合法 JSON：${e.message}`);
      continue;
    }
    if (!/^[A-Z][A-Z0-9_]*$/.test(moduleId)) reportViolation(file, 0, `MODULE_ID 必須為全大寫 SNAKE_CASE：${moduleId}`);
    if (typeof matrix.spec_engine_version !== 'string') reportViolation(file, 0, '矩陣頂層缺少 spec_engine_version 字串');
    if (!Array.isArray(matrix.rules)) {
      reportViolation(file, 0, '矩陣頂層缺少 rules 陣列');
      continue;
    }
    const idRe = new RegExp(`^R-${moduleId}-\\d{3}$`);
    const matrixRuleIds = new Set();
    matrix.rules.forEach((r, i) => {
      const where = `rules[${i}]`;
      if (!idRe.test(r.rule_id || '')) reportViolation(file, 0, `${where}.rule_id 必須符合 R-${moduleId}-NNN：${r.rule_id}`);
      if (!RULE_TYPES.has(r.type)) reportViolation(file, 0, `${where}.type 必須為 ${[...RULE_TYPES].join(' 或 ')}：${r.type}（「刻意不做」的決定不進矩陣，請記在 .specengine/spec/exclusions.md）`);
      if (r.resolved_by !== undefined && typeof r.resolved_by !== 'string' && !Array.isArray(r.resolved_by)) reportViolation(file, 0, `${where}.resolved_by 必須為字串或字串陣列`);
      if (typeof r.actor !== 'string' || !r.actor) reportViolation(file, 0, `${where}.actor 缺少或非字串`);
      if (!Array.isArray(r.pre_conditions)) reportViolation(file, 0, `${where}.pre_conditions 必須為陣列`);
      if (typeof r.trigger_event !== 'string' || !r.trigger_event) reportViolation(file, 0, `${where}.trigger_event 缺少或非字串`);
      if (!Array.isArray(r.post_assertions)) reportViolation(file, 0, `${where}.post_assertions 必須為陣列`);
      if (matrixRuleIds.has(r.rule_id)) reportViolation(file, 0, `${where}.rule_id 重複：${r.rule_id}`);
      matrixRuleIds.add(r.rule_id);
    });

    const moduleTags = [...allTags].filter((t) => t.startsWith(`R-${moduleId}-`));
    if (!moduleTags.length) continue; // 尚未形式化，不比對
    matrixRuleIds.forEach((id) => {
      if (!allTags.has(id)) reportViolation(file, 0, `矩陣 Rule ${id} 未出現在任何 .feature 的 @rule: tag（未形式化）`);
    });
    moduleTags.forEach((t) => {
      if (!matrixRuleIds.has(t)) reportViolation(file, 0, `.feature 的 @rule:${t} 在矩陣中不存在（feature 多出了矩陣沒有的 Rule）`);
    });
  }
}

function writeStepIndex() {
  const out = {};
  [...stepIndex.keys()].sort().forEach((k) => {
    out[k] = { count: stepIndex.get(k).count, files: [...stepIndex.get(k).files].sort() };
  });
  fs.mkdirSync(path.dirname(STEP_INDEX_PATH), { recursive: true });
  fs.writeFileSync(STEP_INDEX_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8');
  return Object.keys(out).length;
}

if (fs.existsSync(FEATURES_DIR)) {
  for (const name of fs.readdirSync(FEATURES_DIR)) {
    if (name.endsWith('.feature')) {
      lintFeatureFile(path.join(FEATURES_DIR, name));
    }
  }
}
lintDbml(DBML_PATH);
lintMatrices();

if (violations.length) {
  console.error(`[feature-lint] 發現 ${violations.length} 項違規：`);
  violations.forEach((v) => console.error(`  - ${v}`));
  process.exit(1);
}

const indexed = writeStepIndex();
console.log(`[feature-lint] 通過：feature／dbml 純淨度、@rule: tag、排序、矩陣結構與矩陣↔feature 一致性皆正常。已更新句型索引 .specengine/sdd/steps-index.json（${indexed} 個不重複句型）。`);
process.exit(0);
