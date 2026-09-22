# 專案架構與執行環境宣告 (Architecture Manifest)

本宣告檔定義專案之系統拓撲、技術棧約束、資料持久化策略與測試執行環境。所有 SpecEngine Skill 執行時，皆必須以本檔宣告之變數為最高環境依準。

〔本檔案由 spec-manifest-sync 掃描本專案實際狀態自動建立初稿。凡標示〔待確認〕之項目，代表掃描當下無法找到唯一、可驗證的證據（或屬於需要團隊決策而非單純查證的項目），需人工核對後手動覆寫；已被掃描核實填入的項目，往後如與現況脫鉤，可再次執行 spec-manifest-sync 更新。〕

---

# 1. 架構拓撲與目錄結構 (Architecture Topology & Paths)

- Architecture Pattern: 〔待確認〕
- Source Root Directory: 〔待確認〕
- Specification Root Directory: `.specengine/spec/`
- Test Root Directory: 〔待確認〕
- Step Definitions Directory: 〔待確認〕（`spec-guard.js` 會動態解析此欄位宣告之路徑，不寫死常數；若此欄位不存在或凍結到 0 個句型，`spec 05` 會 Fail Loud 中止）

---

# 2. 技術棧與持久化層 (Tech Stack & Persistence Layer)

- Primary Language & Runtime: 〔待確認〕
- Database Engine: 〔待確認〕
- Data Access & ORM: 〔待確認〕
- Schema Migration Command: 〔待確認〕
- Seed Script Command: 〔待確認〕
- UI Component Framework: 〔待確認〕
- CSS / Styling Solution: 〔待確認〕

---

# 3. 命名語法規範 (Lexical & Syntactic Conventions)

- Database Tables & Columns: 〔待確認〕
- Backend Classes / Interfaces / Methods: 〔待確認〕
- Frontend Functions / Variables / File Names: 〔待確認〕
- Test Functions / Variables / File Names: 〔待確認〕
- Feature Specification File Names: 繁體中文 `kebab-case`（例如：`.specengine/spec/features/多檔上傳.feature`）—— 此為 SpecEngine 全域固定慣例，不隨專案改變，不需查證。
- Code File Names: 〔待確認〕

---

# 4. 通訊協定與錯誤處理合約 (Protocol & Error Handling Standard)

- API Interface Standard: 〔待確認〕
- Error Response Format: 〔待確認〕

---

# 5. 驗證與測試驅動策略 (Verification & Test Harness)

- BDD Execution Framework: 〔待確認〕（SpecEngine 預設建議採可真實執行的 Cucumber 風格框架，讓 `Given/When/Then` 直接綁定 `.feature`，而非僅供人閱讀的骨架；實際選型仍需依專案既有測試技術棧核實，若專案尚無 BDD 執行框架，需於 `spec 04` 前與團隊確認導入方式）
- Assertion Library: 〔待確認〕
- Test Execution Command: 〔待確認〕
- Test Database Isolation: 〔待確認〕
- Test Double Strategy: 〔待確認〕
- Spec Read-Only Guard Command：由 SpecEngine plugin 之 `spec-05` Skill 自帶指令執行（`${CLAUDE_PLUGIN_ROOT}/scripts/spec-guard.js`），本欄位不需逐專案填寫或查證。
- Feature/DBML Lint Command：由 SpecEngine plugin 之 `spec-03` Skill 自帶指令執行（`${CLAUDE_PLUGIN_ROOT}/scripts/feature-lint.js`），本欄位不需逐專案填寫或查證。
- Schema Introspection Command: 〔待確認〕

---

# 6. 安全上下文與身份委派 (Security Context & Actor Delegation)

- Authentication Mechanism: 〔待確認〕
- Context Injection Strategy: 〔待確認〕
- Multi-Tenancy / Actor Isolation: 〔待確認〕
