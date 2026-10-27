Feature: 點數折抵
  會員在結帳頁面可以用點數折抵訂單金額，1 點折 1 元。
  折抵點數不能超過訂單金額，也不能超過會員目前的點數餘額；折抵成功後扣除點數並減少應付金額。
  會員可以在送出訂單前整筆取消折抵，取消後點數退回。

  @rule:R-POINTS_REDEMPTION-000
  Rule: 主流程：以點數折抵訂單金額，扣點與減價在同一交易內完成
    Scenario: 首次折抵成功
      Given 會員點數餘額為 "100"
      And 訂單金額為 "500"
      When 會員輸入折抵點數 "50"
      Then 系統回傳結果 "成功"
      And 會員點數餘額應為 "50"
      And 訂單應付金額應為 "450"
      And 訂單上的折抵點數應為 "50"

  @rule:R-POINTS_REDEMPTION-001
  Rule: 折抵點數未超過餘額但超過訂單金額時拒絕
    Scenario Outline: 超過訂單金額
      Given 會員點數餘額為 "<balance>"
      And 訂單金額為 "<order_total>"
      When 會員輸入折抵點數 "<points>"
      Then 系統回傳結果 "折抵點數超過訂單金額"
      And 會員點數餘額應為 "<balance>"
      And 訂單應付金額應為 "<order_total>"
      And 訂單上的折抵點數應為 "0"

      Examples:
        | balance | order_total | points |
        | 1000    | 500         | 501    |
        | 1000    | 500         | 1000   |

  @rule:R-POINTS_REDEMPTION-002
  Rule: 折抵點數超過餘額時拒絕，兩者皆超過以餘額為準
    Scenario Outline: 超過餘額
      Given 會員點數餘額為 "<balance>"
      And 訂單金額為 "<order_total>"
      When 會員輸入折抵點數 "<points>"
      Then 系統回傳結果 "折抵點數超過餘額"
      And 會員點數餘額應為 "<balance>"
      And 訂單應付金額應為 "<order_total>"
      And 訂單上的折抵點數應為 "0"

      Examples:
        | balance | order_total | points |
        | 100     | 500         | 101    |
        | 100     | 50          | 101    |
        | 0       | 500         | 1      |

  @rule:R-POINTS_REDEMPTION-003
  Rule: 折抵點數剛好等於上限時可折，首次與重複折抵皆適用
    Scenario Outline: 首次折抵剛好等於上限
      Given 會員點數餘額為 "<balance>"
      And 訂單金額為 "<order_total>"
      When 會員輸入折抵點數 "<points>"
      Then 系統回傳結果 "成功"
      And 會員點數餘額應為 "<balance_after>"
      And 訂單應付金額應為 "<payable_after>"
      And 訂單上的折抵點數應為 "<points>"

      Examples:
        | balance | order_total | points | balance_after | payable_after |
        | 100     | 500         | 100    | 0             | 400           |
        | 1000    | 500         | 500    | 500           | 0             |
        | 100     | 100         | 100    | 0             | 0             |

    Scenario: 重複折抵時新點數剛好等於退回舊折抵後的餘額
      Given 會員點數餘額為 "100"
      And 訂單金額為 "500"
      And 會員已成功折抵 "30" 點
      When 會員輸入折抵點數 "100"
      Then 系統回傳結果 "成功"
      And 會員點數餘額應為 "0"
      And 訂單應付金額應為 "400"
      And 訂單上的折抵點數應為 "100"

  @rule:R-POINTS_REDEMPTION-004
  Rule: 送出訂單前可整筆取消折抵，點數退回且應付金額恢復
    Scenario: 取消折抵成功
      Given 會員點數餘額為 "100"
      And 訂單金額為 "500"
      And 會員已成功折抵 "50" 點
      When 會員取消折抵
      Then 系統回傳結果 "成功"
      And 會員點數餘額應為 "100"
      And 訂單應付金額應為 "500"
      And 訂單上的折抵點數應為 "0"

  @rule:R-POINTS_REDEMPTION-005
  Rule: 訂單已送出後不可取消折抵
    Scenario: 已送出後取消折抵被拒絕
      Given 會員點數餘額為 "100"
      And 訂單金額為 "500"
      And 會員已成功折抵 "50" 點
      And 訂單已送出
      When 會員取消折抵
      Then 系統回傳結果 "訂單已送出，無法取消折抵"
      And 會員點數餘額應為 "50"
      And 訂單應付金額應為 "450"
      And 訂單上的折抵點數應為 "50"

  @rule:R-POINTS_REDEMPTION-006
  Rule: 重複折抵以新換舊，上限檢查以退回舊折抵後的餘額為準
    Scenario: 以新換舊成功
      Given 會員點數餘額為 "100"
      And 訂單金額為 "500"
      And 會員已成功折抵 "50" 點
      When 會員輸入折抵點數 "80"
      Then 系統回傳結果 "成功"
      And 會員點數餘額應為 "20"
      And 訂單應付金額應為 "420"
      And 訂單上的折抵點數應為 "80"

    Scenario Outline: 重複折抵被拒絕時舊折抵維持生效
      Given 會員點數餘額為 "1000"
      And 訂單金額為 "500"
      And 會員已成功折抵 "50" 點
      When 會員輸入折抵點數 "<points>"
      Then 系統回傳結果 "<result>"
      And 會員點數餘額應為 "950"
      And 訂單應付金額應為 "450"
      And 訂單上的折抵點數應為 "50"

      Examples:
        | points | result               |
        | 1051   | 折抵點數超過餘額     |
        | 501    | 折抵點數超過訂單金額 |

  @rule:R-POINTS_REDEMPTION-007
  Rule: 扣點或減價任一步寫入失敗時整筆回滾
    Scenario: 寫入失敗回滾
      Given 會員點數餘額為 "100"
      And 訂單金額為 "500"
      And 折抵交易寫入時將發生失敗
      When 會員輸入折抵點數 "50"
      Then 系統回傳結果 "折抵失敗"
      And 會員點數餘額應為 "100"
      And 訂單應付金額應為 "500"
      And 訂單上的折抵點數應為 "0"

  @rule:R-POINTS_REDEMPTION-008
  Rule: 折抵點數為 0 或空白時拒絕
    Scenario Outline: 零值或空白輸入
      Given 會員點數餘額為 "100"
      And 訂單金額為 "500"
      When 會員輸入折抵點數 "<points>"
      Then 系統回傳結果 "折抵點數必須大於 0"
      And 會員點數餘額應為 "100"
      And 訂單應付金額應為 "500"
      And 訂單上的折抵點數應為 "0"

      Examples:
        | points |
        | 0      |
        |        |

    Scenario: 零值輸入不影響既有折抵
      Given 會員點數餘額為 "100"
      And 訂單金額為 "500"
      And 會員已成功折抵 "50" 點
      When 會員輸入折抵點數 "0"
      Then 系統回傳結果 "折抵點數必須大於 0"
      And 會員點數餘額應為 "50"
      And 訂單應付金額應為 "450"
      And 訂單上的折抵點數應為 "50"

  @rule:R-POINTS_REDEMPTION-009
  Rule: 會員離開或逾時不自動退點
    Scenario: 離開結帳頁面且逾時後點數維持扣除
      Given 會員點數餘額為 "100"
      And 訂單金額為 "500"
      And 會員已成功折抵 "50" 點
      When 會員離開結帳頁面且逾時
      Then 會員點數餘額應為 "50"
      And 訂單應付金額應為 "450"
      And 訂單上的折抵點數應為 "50"

  @rule:R-POINTS_REDEMPTION-010
  Rule: 沒有生效中的折抵時取消折抵被拒絕
    Scenario: 無折抵可取消
      Given 會員點數餘額為 "100"
      And 訂單金額為 "500"
      When 會員取消折抵
      Then 系統回傳結果 "沒有可取消的折抵"
      And 會員點數餘額應為 "100"
      And 訂單應付金額應為 "500"
      And 訂單上的折抵點數應為 "0"
