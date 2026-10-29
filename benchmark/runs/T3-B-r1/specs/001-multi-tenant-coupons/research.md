# Research: 多租戶優惠券套用

**Feature**: 001-multi-tenant-coupons | **Date**: 2026-10-20

Technical Context 中沒有 NEEDS CLARIFICATION 項目（技術棧由專案既有設定與憲章固定）。以下記錄設計決策與替代方案。

## D1. 驗證管線形式

- **Decision**: 以固定順序的檢查函式陣列（每個回傳 `string | null`）實作 FR-015 的錯誤優先序；第一個非 null 即短路回傳。
- **Rationale**: 順序是需求方明確指定的契約，用陣列順序直接對應，可讀且不易漏；新增檢查只需插入一個函式。
- **Alternatives considered**: 巢狀 if/else（順序散落、難對照 FR-015）；收集所有錯誤再排序（多餘，需求只回報第一個）。

## D2. 時間比較方式

- **Decision**: `Date.parse()` 將 ISO 8601 字串轉為毫秒時間戳後以數值比較，`validFrom ≤ now ≤ validTo`（含頭含尾）。`Date.parse` 回傳 NaN 時：`now` 不合法 → `INVALID_INPUT`；券的日期不合法或 `validFrom > validTo` → `INVALID_COUPON`。
- **Rationale**: 需求方指定「以時間戳比較、含頭含尾」；`Date.parse` 原生支援 ISO 8601 與時區偏移，不需外部依賴（憲章：不新增執行期依賴）。
- **Alternatives considered**: 字串字典序比較（時區偏移不同時錯誤）；引入 date 函式庫（違反零依賴）。

## D3. 百分比折扣的整數化

- **Decision**: 每張 PERCENT 各自 `Math.floor(orderAmount * value / 100)`，再加總。
- **Rationale**: 需求方指定「每張各自無條件捨去」；`orderAmount` 與 `value` 皆為整數，乘積為安全整數範圍內的整數，除以 100 後 floor 無浮點誤差風險。
- **Alternatives considered**: 先加總百分比再一次計算（捨入結果可能與逐張不同，違反需求方指定）。

## D4. 重複券判定 key

- **Decision**: 以 `tenantId` 與 `code` 組合（以不可能出現在 code 的分隔字元 `\u0000` 串接）作為 Set key。
- **Rationale**: 需求方定義重複為「同 tenantId + code」；由於已先檢查 `TENANT_MISMATCH`（所有券都屬於同一租戶），實際上等同以 code 查重，但保留 tenantId 可避免未來順序調整時誤判。
- **Alternatives considered**: 只用 code（功能上等價，但語意弱）。

## D5. `INVALID_COUPON` 判定條件（執行者假設）

- **Decision**: 下列任一成立即 `INVALID_COUPON`：`type` 非 `PERCENT`/`FIXED`；`value` 非整數；PERCENT 的 `value` 不在 0～100；FIXED 的 `value` < 0；`minOrderAmount` 有設定但為負或非整數；`validFrom`/`validTo` 無法解析；`validFrom > validTo`。
- **Rationale**: 需求方在錯誤順序中列出 `INVALID_COUPON` 但未定義條件；執行者依「券的靜態資料本身不合法」的直觀語意補齊，並記入 BENCH-LOG 假設清單。
- **Alternatives considered**: 不檢查券值（會讓負數 FIXED 變成加價，明顯違反業務直覺）。

## D6. 測試組織

- **Decision**: 單一 `tests/features/coupon.feature`，以 Rule 或註解分組：基本計算、租戶、期間、最低消費、疊加、超額、重複、無效輸入、錯誤優先序、無券。Step 以 DataTable 建立券，World 保存 input/result。
- **Rationale**: 功能只有一個進入點，單一 feature 檔最直觀；DataTable 讓每條情境自包含。
- **Alternatives considered**: 每個規則一個 feature 檔（檔案多但內容短，對本規模過度拆分）。
