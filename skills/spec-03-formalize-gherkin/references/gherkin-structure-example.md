# Gherkin AST 結構編譯範例與排序規則

## 結構範例

按照以下結構進行轉譯與編譯：

```gherkin
Feature: [模組名稱]
  [模組高階業務說明與摘要]

  # @rule R-[MODULE]-[001]
  Rule: [規則 1 標題]
    Scenario: [單一驗證場景 1]
      Given [前置條件]
      When [觸發動作]
      Then [預期結果]

  # TODO: PARKED - [R-[MODULE]-[002]] 待團隊會議確認小數點捨去邏輯
  # @rule R-[MODULE]-[002]
  Rule: [包含邊界測試的規則 2]
    Scenario Outline: [多邊界驗證場景]
      Given 使用者擁有點數 <user_points>
      When 嘗試折抵金額 <redeem_amount>
      Then 系統回傳結果 "<result>"

      Examples:
        | user_points | redeem_amount | result |
        | 100         | 30            | 成功   |
        | 100         | 31            | 失敗   |
```

## 排序規則

Rule 區塊必須嚴格依據 `# @rule R-XXXX` 的 ID 進行字典序排序。此規則以 `node ${CLAUDE_PLUGIN_ROOT}/scripts/feature-lint.js` 實際驗證，不得僅憑肉眼觀察判斷合規。