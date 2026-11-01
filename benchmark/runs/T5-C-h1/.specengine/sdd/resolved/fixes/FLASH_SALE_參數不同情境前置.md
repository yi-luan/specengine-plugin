# 形式化錯誤自修
- **發現階段**：spec-05
- **檔案**：.specengine/spec/features/限量搶購.feature
- **錯在哪**：Scenario「同一請求編號但參數不同則拒絕」的前置步驟用 Given 植入保留（登記時請求編號為 pre-C1-H1），When 卻以請求編號 R1 件數 1 搶購。R1 是新請求，不會觸發 REQUEST_CONFLICT，系統回成功。
- **依據**：矩陣 R-FLASH_SALE-008 post「同一 requestId 但顧客、搶購編號或件數與第一次不同：拒絕，回傳 REQUEST_CONFLICT」，前提是第一次以 R1、件數 2 成功搶購。只看矩陣即可唯一推出。
- **改成**：前置改為 When 顧客 C1 以請求編號 R1 搶購 S1 2 件，Then 搶購結果為「成功」，And 保留記為 H1；其後的 When（R1、件數 1）與 Then（REQUEST_CONFLICT）不變。
- **快照**：已重建（原因：.feature 經自修合法變更）
- **時間**：2026-11-02 02:40
