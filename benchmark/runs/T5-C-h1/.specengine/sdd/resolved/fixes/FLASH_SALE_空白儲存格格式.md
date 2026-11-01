# 形式化錯誤自修
- **發現階段**：spec-04
- **檔案**：.specengine/spec/features/限量搶購.feature
- **錯在哪**：R-FLASH_SALE-001 的 Scenario Outline 第一列 saleId 寫成 `""`。Examples 替換後步驟文字變成 `"""" `，cucumber 無法匹配 `{string}`，dry-run 回報 1 個 undefined。
- **依據**：矩陣 R-FLASH_SALE-001 pre「saleId 為空」。空字串在 Examples 中的正確寫法是空白儲存格（替換後為 `""`），不需要字面上的引號。只看矩陣即可唯一推出。
- **改成**：第一列 saleId 儲存格改為空白。其餘列與 Then 不變。
- **快照**：已於 spec-04 建立快照時一併包含（快照建立於此修正之後）。
- **時間**：2026-11-02 02:30
