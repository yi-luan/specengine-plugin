---
name: spec-status
description: 當使用者輸入 /spec-status [MODULE_ID]，或說「現在到哪了」「狀態」「這個模組跑到哪一步」「下一步是什麼」時使用。從檔案系統推導每個模組目前的階段、待答題數、流程對齊是否通過、下一步該跑哪個指令。純唯讀。
---

# 目標

回答「我在哪、下一步是什麼」。狀態不是讀 `overview.md` 的狀態欄，而是由 `spec-status.js` 從實際產物推導：有 lock 就是 IMPLEMENTED，有 Step 檔就是 STUBBED，有 feature 就是 FORMALIZED，佇列有題就是 CLARIFYING，只有矩陣就是 CLARIFIED。狀態欄只是快取，與推導結果不符時以推導為準。

---

# 執行步驟

1. 執行 `node "${CLAUDE_PLUGIN_ROOT}/scripts/spec-status.js"`（指定模組時加 `--module <MODULE_ID>`）。
2. 原樣轉述腳本輸出的表格與警告。不補充、不猜測、不建議「請執行 spec XX」以外的動作（「下一步」欄位是腳本算出來的事實，可以轉述）。
3. 腳本 exit code 為 2（沒有任何矩陣）或 3（指定的模組不存在）時，照實說明，並指出起點是 `spec 01`。

---

# 完成彙報

```text
[spec-status]

<腳本輸出的表格>

<腳本輸出的警告，逐條>
```
