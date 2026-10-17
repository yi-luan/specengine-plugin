# Gherkin 結構範例與排序規則

## 結構範例

```gherkin
Feature: 點數折抵
  會員結帳時以點數折抵訂單金額，1 點折 1 元。

  @rule:R-POINTS_REDEMPTION-000
  Rule: 主流程：以點數折抵訂單金額
    Scenario: 正常折抵
      Given 會員點數餘額為 "100"
      And 訂單金額為 "500"
      When 會員輸入折抵點數 "50"
      Then 系統回傳結果 "成功"
      And 會員點數餘額為 "50"

  # TODO: PARKED - [R-POINTS_REDEMPTION-001] 待會議確認是否允許部分折抵後再追加
  @rule:R-POINTS_REDEMPTION-001
  Rule: 折抵點數不得超過餘額或訂單金額
    Scenario Outline: 折抵邊界驗證
      Given 會員點數餘額為 "<balance>"
      And 訂單金額為 "<order_total>"
      When 會員輸入折抵點數 "<points>"
      Then 系統回傳結果 "<result>"

      Examples:
        | balance | order_total | points | result               |
        | 100     | 500         | 100    | 成功                 |
        | 100     | 500         | 101    | 折抵點數超過餘額     |
        | 100     | 50          | 51     | 折抵點數超過訂單金額 |
```

要點：

- `@rule:R-XXXX` 是 **tag**，掛在 `Rule:` 正上方。它會出現在測試報告裡，spec-06 靠它算覆蓋率，也能用 `--tags @rule:R-XXXX` 只跑一條 Rule。
- PARKED 的 `# TODO` 註解放在 tag 上方，不放在 tag 與 `Rule:` 之間。
- Scenario Outline 的 `<placeholder>` 仍包在雙引號內，Examples 的值替換進去後才能被 `{string}` 吃掉。

## 排序規則

Rule 區塊依 `@rule:` 的 ID 字典序排序。以 `node "${CLAUDE_PLUGIN_ROOT}/scripts/feature-lint.js"` 實際驗證，不憑肉眼判斷。
