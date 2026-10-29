Feature: 會員點數折抵
  會員結帳時可以用點數折抵現金，1 點折抵 1 元，折抵點數必須是整數。
  單筆訂單的折抵金額不得超過訂單金額的 30%。

  # User Story 1 - 會員用點數折抵結帳金額 (FR-001, FR-006, FR-008)

  Scenario: US1-1 正常折抵
    Given 訂單金額為 1000 元
    And 會員點數餘額為 500 點
    When 會員使用 200 點折抵
    Then 折抵成功，應付金額為 800 元，剩餘點數為 300 點

  Scenario: US1-2 剛好用完餘額
    Given 訂單金額為 1000 元
    And 會員點數餘額為 300 點
    When 會員使用 300 點折抵
    Then 折抵成功，應付金額為 700 元，剩餘點數為 0 點

  Scenario: US1-3 剛好等於訂單金額的 30%
    Given 訂單金額為 1000 元
    And 會員點數餘額為 500 點
    When 會員使用 300 點折抵
    Then 折抵成功，應付金額為 700 元，剩餘點數為 200 點

  # User Story 2 - 折抵金額受單筆訂單 30% 上限保護 (FR-005)

  Scenario: US2-1 超過 30% 上限整筆拒絕
    Given 訂單金額為 1000 元
    And 會員點數餘額為 1000 點
    When 會員使用 301 點折抵
    Then 折抵失敗，原因為 EXCEEDS_LIMIT

  Scenario: US2-2 30% 上限為非整數時無條件捨去（30 點允許）
    Given 訂單金額為 101 元
    And 會員點數餘額為 100 點
    When 會員使用 30 點折抵
    Then 折抵成功，應付金額為 71 元，剩餘點數為 70 點

  Scenario: US2-3 30% 上限為非整數時無條件捨去（31 點拒絕）
    Given 訂單金額為 101 元
    And 會員點數餘額為 100 點
    When 會員使用 31 點折抵
    Then 折抵失敗，原因為 EXCEEDS_LIMIT

  # User Story 3 - 無效的折抵請求被拒絕並回傳原因 (FR-002, FR-003, FR-004, FR-007, FR-010, FR-011)

  Scenario: US3-1 點數餘額不足整筆拒絕
    Given 訂單金額為 1000 元
    And 會員點數餘額為 500 點
    When 會員使用 600 點折抵
    Then 折抵失敗，原因為 INSUFFICIENT_POINTS

  Scenario: US3-2 折抵點數為非整數
    Given 訂單金額為 1000 元
    And 會員點數餘額為 500 點
    When 會員使用 10.5 點折抵
    Then 折抵失敗，原因為 INVALID_POINTS

  Scenario: US3-3 折抵點數為負數
    Given 訂單金額為 1000 元
    And 會員點數餘額為 500 點
    When 會員使用 -10 點折抵
    Then 折抵失敗，原因為 INVALID_POINTS

  Scenario: US3-4 使用 0 點視為成功且金額與餘額不變
    Given 訂單金額為 1000 元
    And 會員點數餘額為 500 點
    When 會員使用 0 點折抵
    Then 折抵成功，應付金額為 1000 元，剩餘點數為 500 點

  Scenario Outline: US3-5 訂單金額或點數餘額不合法
    Given 訂單金額為 <orderAmount> 元
    And 會員點數餘額為 <pointsBalance> 點
    When 會員使用 10 點折抵
    Then 折抵失敗，原因為 INVALID_INPUT

    Examples:
      | orderAmount | pointsBalance |
      | 0           | 500           |
      | -100        | 500           |
      | 1000        | -5            |

  Scenario Outline: US3-6 同時違反多條規則時依固定順序回報第一個命中的原因
    Given 訂單金額為 <orderAmount> 元
    And 會員點數餘額為 <pointsBalance> 點
    When 會員使用 <pointsToUse> 點折抵
    Then 折抵失敗，原因為 <reason>

    Examples:
      | orderAmount | pointsBalance | pointsToUse | reason              |
      | 0           | 500           | -1          | INVALID_INPUT       |
      | -100        | -5            | 10.5        | INVALID_INPUT       |
      | 1000        | 500           | 600.5       | INVALID_POINTS      |
      | 1000        | 500           | -600        | INVALID_POINTS      |
      | 1000        | 500           | 600         | INSUFFICIENT_POINTS |
      | 1000        | 1000          | 400         | EXCEEDS_LIMIT       |

  # FR-009 純函式：無副作用、不依賴外部狀態

  Scenario: FR9-1 相同輸入重複折抵結果一致且輸入不被改變
    Given 訂單金額為 1000 元
    And 會員點數餘額為 500 點
    When 會員使用 200 點折抵
    Then 折抵成功，應付金額為 800 元，剩餘點數為 300 點
    And 再次以相同輸入折抵會得到相同結果，且輸入內容未被改變
