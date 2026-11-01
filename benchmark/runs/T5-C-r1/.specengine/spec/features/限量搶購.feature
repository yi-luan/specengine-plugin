Feature: 限量搶購
  商家開一檔限量搶購，顧客在搶購期間搶購並取得 10 分鐘保留，到期前付款成交，到期未付款由排程釋放。
  多台伺服器只共用一個儲存，絕不超賣、不超過限購。

  Background:
    Given 現在時間為 "2026-06-15T12:00:00Z"
    And 商家已開檔 "S1"，限量 "10" 件、限購 "3" 件、開始 "2026-06-15T12:00:00Z"、結束 "2026-06-15T13:00:00Z"

  @rule:R-FLASH_SALE-000
  Rule: 主流程：顧客在搶購期間搶購，系統建立 10 分鐘保留
    Scenario Outline: 搶購成功建立保留（含剛好等於限購、剛好等於剩餘、開始時刻可搶）
      Given 商家已開檔 "S2"，限量 "<quantity>" 件、限購 "<limit>" 件、開始 "2026-06-15T12:00:00Z"、結束 "2026-06-15T13:00:00Z"
      When 顧客 "C1" 以請求編號 "r1" 搶購檔次 "S2" "<qty>" 件
      Then 系統回傳結果 "成功"
      And 搶到的保留到期時間為 "2026-06-15T12:10:00Z"
      And 搶到的保留記為 "H1"
      And 保留 "H1" 的狀態為 "HELD"
      And 檔次 "S2" 的剩餘可搶件數為 "<remaining>"
      And 顧客 "C1" 於檔次 "S2" 的累計佔用件數為 "<qty>"

      Examples:
        | quantity | limit | qty | remaining |
        | 10       | 3     | 2   | 8         |
        | 10       | 3     | 3   | 7         |
        | 2        | 5     | 2   | 0         |

  @rule:R-FLASH_SALE-001
  Rule: 主流程：商家開檔，剩餘可搶件數等於限量件數
    Scenario Outline: 開檔成功（限購可大於限量）
      When 商家開檔 "S2"，限量 "<quantity>" 件、限購 "<limit>" 件、開始 "2026-06-15T12:00:00Z"、結束 "2026-06-15T13:00:00Z"
      Then 系統回傳結果 "成功"
      And 檔次 "S2" 的剩餘可搶件數為 "<quantity>"

      Examples:
        | quantity | limit |
        | 10       | 3     |
        | 10       | 20    |

  @rule:R-FLASH_SALE-002
  Rule: 主流程：到期前收到付款成功通知，保留成交
    Scenario: 到期前付款成交
      Given 顧客 "C1" 已以請求編號 "r1" 搶購檔次 "S1" "2" 件，搶到的保留記為 "H1"
      When 時間來到 "2026-06-15T12:09:59Z"
      And 金流送達保留 "H1" 的付款成功通知
      Then 系統回傳結果 "成功"
      And 保留 "H1" 的狀態為 "PAID"
      And 檔次 "S1" 的剩餘可搶件數為 "8"
      And 顧客 "C1" 於檔次 "S1" 的累計佔用件數為 "2"

    Scenario: 搶購期間已結束但保留未到期，仍可付款成交
      Given 商家已開檔 "S2"，限量 "10" 件、限購 "3" 件、開始 "2026-06-15T12:00:00Z"、結束 "2026-06-15T12:05:00Z"
      And 顧客 "C1" 已以請求編號 "r1" 搶購檔次 "S2" "2" 件，搶到的保留記為 "H1"
      When 時間來到 "2026-06-15T12:06:00Z"
      And 金流送達保留 "H1" 的付款成功通知
      Then 系統回傳結果 "成功"
      And 保留 "H1" 的狀態為 "PAID"

  @rule:R-FLASH_SALE-003
  Rule: 主流程：排程釋放到期未付款的保留
    Scenario: 剛好到期時刻排程釋放，件數還回、限購額度扣回
      Given 顧客 "C1" 已以請求編號 "r1" 搶購檔次 "S1" "2" 件，搶到的保留記為 "H1"
      When 時間來到 "2026-06-15T12:10:00Z"
      And 排程執行
      Then 保留 "H1" 的狀態為 "EXPIRED"
      And 檔次 "S1" 的剩餘可搶件數為 "10"
      And 顧客 "C1" 於檔次 "S1" 的累計佔用件數為 "0"

  @rule:R-FLASH_SALE-004
  Rule: 排程不動尚未到期的保留
    Scenario: 到期前一秒排程執行，保留維持保留中
      Given 顧客 "C1" 已以請求編號 "r1" 搶購檔次 "S1" "2" 件，搶到的保留記為 "H1"
      When 時間來到 "2026-06-15T12:09:59Z"
      And 排程執行
      Then 保留 "H1" 的狀態為 "HELD"
      And 檔次 "S1" 的剩餘可搶件數為 "8"

  @rule:R-FLASH_SALE-005
  Rule: 剩餘可搶件數不足時整筆拒絕
    Scenario Outline: 剩餘不足回傳 SOLD_OUT，不部分保留
      Given 商家已開檔 "S2"，限量 "<quantity>" 件、限購 "5" 件、開始 "2026-06-15T12:00:00Z"、結束 "2026-06-15T13:00:00Z"
      And 顧客 "C0" 已以請求編號 "r0" 搶購檔次 "S2" "<prior>" 件，搶到的保留記為 "H0"
      When 顧客 "C1" 以請求編號 "r1" 搶購檔次 "S2" "<qty>" 件
      Then 系統回傳結果 "SOLD_OUT"
      And 檔次 "S2" 的剩餘可搶件數為 "<remaining>"
      And 顧客 "C1" 於檔次 "S2" 的累計佔用件數為 "0"

      Examples:
        | quantity | prior | qty | remaining |
        | 5        | 3     | 3   | 2         |
        | 2        | 2     | 1   | 0         |

  @rule:R-FLASH_SALE-006
  Rule: 超過限購件數時整筆拒絕
    Scenario Outline: 累計加本次超過限購回傳 LIMIT_EXCEEDED，不截到上限
      Given 顧客 "C1" 已以請求編號 "r0" 搶購檔次 "S1" "<prior>" 件，搶到的保留記為 "H0"
      When 顧客 "C1" 以請求編號 "r1" 搶購檔次 "S1" "<qty>" 件
      Then 系統回傳結果 "LIMIT_EXCEEDED"
      And 顧客 "C1" 於檔次 "S1" 的累計佔用件數為 "<prior>"
      And 檔次 "S1" 的剩餘可搶件數為 "<remaining>"

      Examples:
        | prior | qty | remaining |
        | 2     | 2   | 8         |
        | 3     | 1   | 7         |

    Scenario: 單次搶購件數即超過限購
      When 顧客 "C1" 以請求編號 "r1" 搶購檔次 "S1" "4" 件
      Then 系統回傳結果 "LIMIT_EXCEEDED"
      And 檔次 "S1" 的剩餘可搶件數為 "10"
      And 顧客 "C1" 於檔次 "S1" 的累計佔用件數為 "0"

  @rule:R-FLASH_SALE-007
  Rule: 開始時間前搶購被拒絕
    Scenario: 開始前一秒搶購回傳 NOT_STARTED
      When 時間來到 "2026-06-15T11:59:59Z"
      And 顧客 "C1" 以請求編號 "r1" 搶購檔次 "S1" "1" 件
      Then 系統回傳結果 "NOT_STARTED"
      And 檔次 "S1" 的剩餘可搶件數為 "10"

  @rule:R-FLASH_SALE-008
  Rule: 結束時間（含）起搶購被拒絕
    Scenario Outline: 結束時刻起搶購回傳 ENDED
      When 時間來到 "<now>"
      And 顧客 "C1" 以請求編號 "r1" 搶購檔次 "S1" "1" 件
      Then 系統回傳結果 "ENDED"
      And 檔次 "S1" 的剩餘可搶件數為 "10"

      Examples:
        | now                  |
        | 2026-06-15T13:00:00Z |
        | 2026-06-15T13:30:00Z |

  @rule:R-FLASH_SALE-009
  Rule: 已釋放的保留收到付款通知被拒絕
    Scenario: 排程釋放後付款回傳 HOLD_EXPIRED
      Given 顧客 "C1" 已以請求編號 "r1" 搶購檔次 "S1" "2" 件，搶到的保留記為 "H1"
      And 時間來到 "2026-06-15T12:10:00Z"
      And 排程執行
      When 金流送達保留 "H1" 的付款成功通知
      Then 系統回傳結果 "HOLD_EXPIRED"
      And 保留 "H1" 的狀態為 "EXPIRED"
      And 檔次 "S1" 的剩餘可搶件數為 "10"

  @rule:R-FLASH_SALE-010
  Rule: 不存在的保留編號收到付款通知被拒絕
    Scenario: 付款通知指向不存在的保留回傳 HOLD_NOT_FOUND
      When 金流送達保留 "no-such-hold" 的付款成功通知
      Then 系統回傳結果 "HOLD_NOT_FOUND"

  @rule:R-FLASH_SALE-011
  Rule: 多台伺服器同時執行排程，同一保留只釋放一次
    Scenario: 三台伺服器同時釋放同一張到期保留，件數只還回一次
      Given 顧客 "C1" 已以請求編號 "r1" 搶購檔次 "S1" "2" 件，搶到的保留記為 "H1"
      When 時間來到 "2026-06-15T12:10:00Z"
      And 排程在 "3" 台伺服器上同時執行
      Then 保留 "H1" 的狀態為 "EXPIRED"
      And 檔次 "S1" 的剩餘可搶件數為 "10"
      And 顧客 "C1" 於檔次 "S1" 的累計佔用件數為 "0"

  @rule:R-FLASH_SALE-012
  Rule: 多台伺服器同時處理搶購絕不超賣
    Scenario: 二十位顧客透過四台伺服器同時搶十件，成功總和為十件
      Given 商家已開檔 "S2"，限量 "10" 件、限購 "1" 件、開始 "2026-06-15T12:00:00Z"、結束 "2026-06-15T13:00:00Z"
      When "20" 位顧客各以不同請求編號透過 "4" 台伺服器同時搶購檔次 "S2" 各 "1" 件
      Then 成功搶到的件數總和為 "10"
      And 失敗的原因皆為 "SOLD_OUT"
      And 檔次 "S2" 的剩餘可搶件數為 "0"

  @rule:R-FLASH_SALE-013
  Rule: 同一顧客連點透過多台伺服器同時搶購不超過限購
    Scenario: 同一顧客五個請求透過四台伺服器同時搶，成功總和等於限購
      Given 商家已開檔 "S2"，限量 "100" 件、限購 "3" 件、開始 "2026-06-15T12:00:00Z"、結束 "2026-06-15T13:00:00Z"
      When 顧客 "C1" 以 "5" 個不同請求編號透過 "4" 台伺服器同時搶購檔次 "S2" 各 "1" 件
      Then 成功搶到的件數總和為 "3"
      And 失敗的原因皆為 "LIMIT_EXCEEDED"
      And 顧客 "C1" 於檔次 "S2" 的累計佔用件數為 "3"
      And 檔次 "S2" 的剩餘可搶件數為 "97"

  @rule:R-FLASH_SALE-014
  Rule: 伺服器處理付款卡住、期間保留被釋放，恢復後不成交
    Scenario: 卡住的伺服器恢復後付款回傳 HOLD_EXPIRED，已還回件數不被收回
      Given 顧客 "C1" 已以請求編號 "r1" 搶購檔次 "S1" "2" 件，搶到的保留記為 "H1"
      And 時間來到 "2026-06-15T12:05:00Z"
      When 某台伺服器開始處理保留 "H1" 的付款成功通知並在寫入前卡住
      And 時間來到 "2026-06-15T12:10:00Z"
      And 排程執行
      And 卡住的伺服器恢復並完成處理
      Then 系統回傳結果 "HOLD_EXPIRED"
      And 保留 "H1" 的狀態為 "EXPIRED"
      And 檔次 "S1" 的剩餘可搶件數為 "10"

  @rule:R-FLASH_SALE-015
  Rule: 主流程：商品頁顯示剩餘可搶件數
    Scenario: 剩餘等於限量減保留中減已成交，到期未釋放者仍算佔用
      Given 顧客 "C1" 已以請求編號 "r1" 搶購檔次 "S1" "2" 件，搶到的保留記為 "H1"
      And 顧客 "C2" 已以請求編號 "r2" 搶購檔次 "S1" "3" 件，搶到的保留記為 "H2"
      And 金流送達保留 "H2" 的付款成功通知
      Then 檔次 "S1" 的剩餘可搶件數為 "5"
      When 時間來到 "2026-06-15T12:10:00Z"
      Then 檔次 "S1" 的剩餘可搶件數為 "5"
      When 排程執行
      Then 檔次 "S1" 的剩餘可搶件數為 "7"

  @rule:R-FLASH_SALE-016
  Rule: 以保留編號查詢保留
    Scenario: 查得保留內容與狀態，且永久可查
      Given 顧客 "C1" 已以請求編號 "r1" 搶購檔次 "S1" "2" 件，搶到的保留記為 "H1"
      Then 查詢保留 "H1" 回傳搶購編號 "S1"、顧客 "C1"、件數 "2"、到期時間 "2026-06-15T12:10:00Z"、狀態 "HELD"
      When 金流送達保留 "H1" 的付款成功通知
      And 時間來到 "2026-07-15T12:00:00Z"
      Then 查詢保留 "H1" 回傳搶購編號 "S1"、顧客 "C1"、件數 "2"、到期時間 "2026-06-15T12:10:00Z"、狀態 "PAID"

    Scenario: 不存在的保留編號回傳 null
      Then 查詢保留 "no-such-hold" 回傳 null

  @rule:R-FLASH_SALE-017
  Rule: 保留到期釋放後限購額度還回，可再搶
    Scenario: 限購兩件，釋放後再搶兩件成功
      Given 商家已開檔 "S2"，限量 "10" 件、限購 "2" 件、開始 "2026-06-15T12:00:00Z"、結束 "2026-06-15T13:00:00Z"
      And 顧客 "C1" 已以請求編號 "r1" 搶購檔次 "S2" "2" 件，搶到的保留記為 "H1"
      And 時間來到 "2026-06-15T12:10:00Z"
      And 排程執行
      When 顧客 "C1" 以請求編號 "r2" 搶購檔次 "S2" "2" 件
      Then 系統回傳結果 "成功"
      And 顧客 "C1" 於檔次 "S2" 的累計佔用件數為 "2"
      And 檔次 "S2" 的剩餘可搶件數為 "8"

  @rule:R-FLASH_SALE-018
  Rule: 同一請求編號重送且前次成功，回放同一張保留
    Scenario: 重送回傳同一張保留，不重複扣件、不重算限購
      Given 顧客 "C1" 已以請求編號 "r1" 搶購檔次 "S1" "2" 件，搶到的保留記為 "H1"
      When 時間來到 "2026-06-15T12:01:00Z"
      And 顧客 "C1" 以請求編號 "r1" 搶購檔次 "S1" "2" 件
      Then 系統回傳結果 "成功"
      And 搶到的保留與 "H1" 為同一張保留
      And 檔次 "S1" 的剩餘可搶件數為 "8"
      And 顧客 "C1" 於檔次 "S1" 的累計佔用件數為 "2"

  @rule:R-FLASH_SALE-019
  Rule: 同一請求編號重送且前次失敗，視為新請求重新判斷
    Scenario: 開始前失敗，開始後以同一請求編號重送成功
      Given 時間來到 "2026-06-15T11:59:59Z"
      And 顧客 "C1" 以請求編號 "r1" 搶購檔次 "S1" "2" 件
      And 系統回傳結果 "NOT_STARTED"
      When 時間來到 "2026-06-15T12:00:00Z"
      And 顧客 "C1" 以請求編號 "r1" 搶購檔次 "S1" "2" 件
      Then 系統回傳結果 "成功"
      And 檔次 "S1" 的剩餘可搶件數為 "8"

  @rule:R-FLASH_SALE-020
  Rule: 付款當下已到期但排程尚未釋放，付款被拒絕
    Scenario: 剛好到期時刻付款回傳 HOLD_EXPIRED，之後由排程照常釋放
      Given 顧客 "C1" 已以請求編號 "r1" 搶購檔次 "S1" "2" 件，搶到的保留記為 "H1"
      When 時間來到 "2026-06-15T12:10:00Z"
      And 金流送達保留 "H1" 的付款成功通知
      Then 系統回傳結果 "HOLD_EXPIRED"
      And 保留 "H1" 的狀態為 "HELD"
      And 檔次 "S1" 的剩餘可搶件數為 "8"
      When 排程執行
      Then 保留 "H1" 的狀態為 "EXPIRED"
      And 檔次 "S1" 的剩餘可搶件數為 "10"

  @rule:R-FLASH_SALE-021
  Rule: 已成交的保留重複收到付款通知，回傳成功且不變
    Scenario: 重複付款通知回傳成功
      Given 顧客 "C1" 已以請求編號 "r1" 搶購檔次 "S1" "2" 件，搶到的保留記為 "H1"
      And 金流送達保留 "H1" 的付款成功通知
      When 金流送達保留 "H1" 的付款成功通知
      Then 系統回傳結果 "成功"
      And 保留 "H1" 的狀態為 "PAID"
      And 檔次 "S1" 的剩餘可搶件數為 "8"
      And 顧客 "C1" 於檔次 "S1" 的累計佔用件數為 "2"

  @rule:R-FLASH_SALE-022
  Rule: 重複開同一搶購編號被拒絕
    Scenario: 同一搶購編號再開檔回傳 DUPLICATE_SALE，原檔次不變
      When 商家開檔 "S1"，限量 "99" 件、限購 "9" 件、開始 "2026-06-15T12:00:00Z"、結束 "2026-06-15T13:00:00Z"
      Then 系統回傳結果 "DUPLICATE_SALE"
      And 檔次 "S1" 的剩餘可搶件數為 "10"

  @rule:R-FLASH_SALE-023
  Rule: 開檔參數不合法被拒絕
    Scenario Outline: 開檔參數不合法回傳 INVALID_INPUT，不建立檔次
      When 商家開檔 "<saleId>"，限量 "<quantity>" 件、限購 "<limit>" 件、開始 "<startsAt>"、結束 "<endsAt>"
      Then 系統回傳結果 "INVALID_INPUT"
      And 檔次 "<saleId>" 的剩餘可搶件數為 "0"

      Examples:
        | saleId | quantity | limit | startsAt             | endsAt               |
        | S2     | 0        | 3     | 2026-06-15T12:00:00Z | 2026-06-15T13:00:00Z |
        | S2     | 2.5      | 3     | 2026-06-15T12:00:00Z | 2026-06-15T13:00:00Z |
        | S2     | 10       | 0     | 2026-06-15T12:00:00Z | 2026-06-15T13:00:00Z |
        |        | 10       | 3     | 2026-06-15T12:00:00Z | 2026-06-15T13:00:00Z |
        | S2     | 10       | 3     | 2026-06-15T13:00:00Z | 2026-06-15T13:00:00Z |
        | S2     | 10       | 3     | 2026-06-15T14:00:00Z | 2026-06-15T13:00:00Z |
        | S2     | 10       | 3     | not-a-date           | 2026-06-15T13:00:00Z |

  @rule:R-FLASH_SALE-024
  Rule: 搶購參數不合法被拒絕
    Scenario Outline: 搶購參數不合法回傳 INVALID_INPUT，不建立保留
      When 顧客 "<customerId>" 以請求編號 "<requestId>" 搶購檔次 "<saleId>" "<qty>" 件
      Then 系統回傳結果 "INVALID_INPUT"
      And 檔次 "S1" 的剩餘可搶件數為 "10"

      Examples:
        | customerId | requestId | saleId | qty |
        | C1         | r1        | S1     | 0   |
        | C1         | r1        | S1     | -1  |
        | C1         | r1        | S1     | 1.5 |
        |            | r1        | S1     | 1   |
        | C1         |           | S1     | 1   |
        | C1         | r1        |        | 1   |

  @rule:R-FLASH_SALE-025
  Rule: 搶購不存在的檔次被拒絕
    Scenario: 搶購不存在的搶購編號回傳 SALE_NOT_FOUND
      When 顧客 "C1" 以請求編號 "r1" 搶購檔次 "S9" "1" 件
      Then 系統回傳結果 "SALE_NOT_FOUND"

  @rule:R-FLASH_SALE-026
  Rule: 查詢不存在檔次的剩餘可搶件數回傳 0
    Scenario: 不存在的搶購編號剩餘為 0
      Then 檔次 "S9" 的剩餘可搶件數為 "0"
