#!/usr/bin/env node
/**
 * feature-lint.js
 *
 * 把 `${CLAUDE_PLUGIN_ROOT}/docs/contract-rules.md` 第 3、4 節「Gherkin 純淨度與結構規範」，
 * 從 prompt 裡的「絕對禁止」轉成實際會 fail 的檢查，供 spec 03 收工前與 CI 執行。
 * 不依賴任何第三方套件，僅用 Node.js 內建模組。執行時以當前工作目錄（專案根目錄）
 * 為準，請在專案根目錄下執行，而不是先 cd 進本腳本所在目錄再執行。
 *
 * 用法：
 *   node ${CLAUDE_PLUGIN_ROOT}/scripts/feature-lint.js
 *
 * 檢查對象：.specengine/spec/features/*.feature、.specengine/spec/erm.dbml
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const FEATURES_DIR = path.join(ROOT, '.specengine', 'spec', 'features');
const DBML_PATH = path.join(ROOT, '.specengine', 'spec', 'erm.dbml');

const violations = [];

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
  if (!/^(Feature:|# @rule)/.test(firstNonEmpty.trim())) {
    reportViolation(filePath, 1, '檔案第一行必須直接進入 `Feature:` 或 `# @rule` 註解，不得有 YAML Header 或其他前綴內容');
  }

  lintCommon(filePath, lines, raw);

  // Rule 區塊必須依 @rule ID 字典序排序
  const ruleIds = [];
  lines.forEach((text) => {
    const m = text.match(/^\s*#\s*@rule\s+(R-[\w-]+)/);
    if (m) ruleIds.push(m[1]);
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
}

function lintDbml(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  lintCommon(filePath, raw.split(/\r?\n/), raw);
}

if (fs.existsSync(FEATURES_DIR)) {
  for (const name of fs.readdirSync(FEATURES_DIR)) {
    if (name.endsWith('.feature')) {
      lintFeatureFile(path.join(FEATURES_DIR, name));
    }
  }
}
lintDbml(DBML_PATH);

if (violations.length) {
  console.error(`[feature-lint] 發現 ${violations.length} 項違規：`);
  violations.forEach((v) => console.error(`  - ${v}`));
  process.exit(1);
}

console.log('[feature-lint] 通過：.specengine/spec/features/*.feature 與 .specengine/spec/erm.dbml 未發現語法污染或排序違規。');
process.exit(0);
