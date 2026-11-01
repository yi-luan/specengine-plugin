Feature: 限量搶購
  商家開一檔限量搶購，顧客在搶購期間搶購並取得 10 分鐘的保留，
  到期前付款即成交，到期未付款由排程釋放。多台伺服器只共用一個 Store，
  絕對不能超賣，也不能讓顧客買超過限購件數。

  Background:
    Given 現在時間是 "2026-06-15T12:00:00Z"
    And 有 3 台伺服器
    And 商家開一檔搶購 "sale-1"，限量 5 件，每人限購 2 件，"2026-06-15T12:00:00Z" 開始，"2026-06-15T13:00:00Z" 結束
    And 操作結果成功

  # ---- 開檔 ----

  Scenario: 同一個搶購編號不能開兩次
    Given 商家開一檔搶購 "sale-1"，限量 9 件，每人限購 1 件，"2026-06-15T12:00:00Z" 開始，"2026-06-15T13:00:00Z" 結束
    Then 操作結果失敗，原因 "SALE_EXISTS"
    And 搶購 "sale-1" 的剩餘件數為 5

  Scenario Outline: 開檔設定不合法
    Given 商家開一檔搶購 "sale-x"，限量 <限量> 件，每人限購 <限購> 件，"<開始>" 開始，"<結束>" 結束（不檢查）
    Then 操作結果失敗，原因 "INVALID_INPUT"
    And 搶購 "sale-x" 的剩餘件數為 0

    Examples:
      | 限量 | 限購 | 開始                 | 結束                 |
      | 0    | 1    | 2026-06-15T12:00:00Z | 2026-06-15T13:00:00Z |
      | 1.5  | 1    | 2026-06-15T12:00:00Z | 2026-06-15T13:00:00Z |
      | 5    | 0    | 2026-06-15T12:00:00Z | 2026-06-15T13:00:00Z |
      | 5    | 1    | 2026-06-15T13:00:00Z | 2026-06-15T12:00:00Z |
      | 5    | 1    | 2026-06-15T12:00:00Z | 2026-06-15T12:00:00Z |
      | 5    | 1    | not-a-time           | 2026-06-15T13:00:00Z |

  # ---- 搶購 ----

  Scenario: 搶到後替顧客保留 10 分鐘，商品頁剩餘件數跟著減少
    When 顧客 "alice" 在伺服器 "S1" 以請求 "r1" 搶購 "sale-1" 2 件
    Then 請求 "r1" 搶到了，到期時間是 "2026-06-15T12:10:00Z"
    And 請求 "r1" 的保留狀態為 "HELD"
    And 搶購 "sale-1" 的剩餘件數為 3

  Scenario: 件數不夠時搶不到，剩下的件數留給要得少的人
    When 顧客 "alice" 在伺服器 "S1" 以請求 "r1" 搶購 "sale-1" 2 件
    And 顧客 "bob" 在伺服器 "S2" 以請求 "r2" 搶購 "sale-1" 2 件
    Then 搶購 "sale-1" 的剩餘件數為 1
    When 顧客 "carol" 在伺服器 "S3" 以請求 "r3" 搶購 "sale-1" 2 件
    Then 請求 "r3" 失敗，原因 "SOLD_OUT"
    And 搶購 "sale-1" 的剩餘件數為 1
    When 顧客 "carol" 在伺服器 "S3" 以請求 "r4" 搶購 "sale-1" 1 件
    Then 請求 "r4" 搶到了
    And 搶購 "sale-1" 的剩餘件數為 0
    When 顧客 "dave" 在伺服器 "S1" 以請求 "r5" 搶購 "sale-1" 1 件
    Then 請求 "r5" 失敗，原因 "SOLD_OUT"

  Scenario: 顧客不能買超過限購件數（單次或累計）
    When 顧客 "alice" 在伺服器 "S1" 以請求 "r1" 搶購 "sale-1" 3 件
    Then 請求 "r1" 失敗，原因 "LIMIT_EXCEEDED"
    And 搶購 "sale-1" 的剩餘件數為 5
    When 顧客 "alice" 在伺服器 "S1" 以請求 "r2" 搶購 "sale-1" 1 件
    And 顧客 "alice" 在伺服器 "S2" 以請求 "r3" 搶購 "sale-1" 2 件
    Then 請求 "r2" 搶到了
    And 請求 "r3" 失敗，原因 "LIMIT_EXCEEDED"
    When 顧客 "alice" 在伺服器 "S3" 以請求 "r4" 搶購 "sale-1" 1 件
    Then 請求 "r4" 搶到了
    And 搶購 "sale-1" 的剩餘件數為 3

  Scenario Outline: 件數必須是正整數
    When 顧客 "alice" 在伺服器 "S1" 以請求 "r1" 搶購 "sale-1" <件數> 件
    Then 請求 "r1" 失敗，原因 "INVALID_QTY"
    And 搶購 "sale-1" 的剩餘件數為 5

    Examples:
      | 件數 |
      | 0    |
      | -1   |
      | 1.5  |

  Scenario: 搶購不存在
    When 顧客 "alice" 在伺服器 "S1" 以請求 "r1" 搶購 "nope" 1 件
    Then 請求 "r1" 失敗，原因 "SALE_NOT_FOUND"
    And 搶購 "nope" 的剩餘件數為 0

  Scenario: 開賣前不能搶
    Given 商家開一檔搶購 "sale-2"，限量 5 件，每人限購 2 件，"2026-06-15T12:30:00Z" 開始，"2026-06-15T13:00:00Z" 結束
    When 顧客 "alice" 在伺服器 "S1" 以請求 "r1" 搶購 "sale-2" 1 件
    Then 請求 "r1" 失敗，原因 "NOT_STARTED"
    When 時間前進 30 分鐘
    And 顧客 "alice" 在伺服器 "S1" 以請求 "r2" 搶購 "sale-2" 1 件
    Then 請求 "r2" 搶到了

  Scenario: 結束時間一到就不能再搶
    When 時間前進 59 分鐘
    And 顧客 "alice" 在伺服器 "S1" 以請求 "r1" 搶購 "sale-1" 1 件
    Then 請求 "r1" 搶到了
    When 時間前進 1 分鐘
    And 顧客 "bob" 在伺服器 "S2" 以請求 "r2" 搶購 "sale-1" 1 件
    Then 請求 "r2" 失敗，原因 "ENDED"
    And 搶購 "sale-1" 的剩餘件數為 4

  # ---- 重送與並發 ----

  Scenario: 同一個請求因逾時重送到另一台伺服器，只保留一次
    When 顧客 "alice" 在伺服器 "S1" 以請求 "r1" 搶購 "sale-1" 2 件
    And 顧客 "alice" 在伺服器 "S2" 以請求 "r1" 搶購 "sale-1" 2 件
    Then 請求 "r1" 搶到了
    And 搶購 "sale-1" 的剩餘件數為 3

  Scenario: 同一位顧客連點三次，分別打到三台伺服器，只有一次在限購內
    When 以下搶購同時送出：
      | 顧客  | 伺服器 | 請求 | 搶購   | 件數 |
      | alice | S1     | r1   | sale-1 | 2    |
      | alice | S2     | r2   | sale-1 | 2    |
      | alice | S3     | r3   | sale-1 | 2    |
    Then 搶購 "sale-1" 的剩餘件數為 3
    And 搶購 "sale-1" 成功的請求有 1 個
    And 每位顧客在搶購 "sale-1" 的保留件數都不超過 2

  Scenario: 同一個請求同時重送多次，只保留一次
    When 以下搶購同時送出：
      | 顧客  | 伺服器 | 請求 | 搶購   | 件數 |
      | alice | S1     | r1   | sale-1 | 2    |
      | alice | S2     | r1   | sale-1 | 2    |
      | alice | S3     | r1   | sale-1 | 2    |
    Then 請求 "r1" 搶到了
    And 搶購 "sale-1" 的剩餘件數為 3

  Scenario: 開賣瞬間多人同時在多台伺服器搶，不超賣也不超過限購
    When 以下搶購同時送出：
      | 顧客 | 伺服器 | 請求 | 搶購   | 件數 |
      | c1   | S1     | q1   | sale-1 | 2    |
      | c2   | S2     | q2   | sale-1 | 2    |
      | c3   | S3     | q3   | sale-1 | 2    |
      | c4   | S1     | q4   | sale-1 | 2    |
      | c5   | S2     | q5   | sale-1 | 2    |
      | c6   | S3     | q6   | sale-1 | 2    |
      | c1   | S2     | q7   | sale-1 | 2    |
      | c2   | S3     | q8   | sale-1 | 2    |
      | c3   | S1     | q9   | sale-1 | 2    |
      | c7   | S1     | q10  | sale-1 | 2    |
    Then 搶購 "sale-1" 成功的請求有 2 個
    And 搶購 "sale-1" 保留中與已成交的件數合計為 4
    And 每位顧客在搶購 "sale-1" 的保留件數都不超過 2
    And 搶購 "sale-1" 的剩餘件數為 1
    When 以下搶購同時送出：
      | 顧客 | 伺服器 | 請求 | 搶購   | 件數 |
      | d1   | S1     | p1   | sale-1 | 1    |
      | d2   | S2     | p2   | sale-1 | 1    |
      | d3   | S3     | p3   | sale-1 | 1    |
    Then 搶購 "sale-1" 成功的請求有 3 個
    And 搶購 "sale-1" 保留中與已成交的件數合計為 5
    And 搶購 "sale-1" 的剩餘件數為 0

  # ---- 付款 ----

  Scenario: 到期前付款成交，件數不會釋放
    When 顧客 "alice" 在伺服器 "S1" 以請求 "r1" 搶購 "sale-1" 2 件
    And 時間前進 9 分鐘
    And 金流在伺服器 "S3" 通知請求 "r1" 的保留已付款
    Then 操作結果成功
    And 請求 "r1" 的保留狀態為 "PAID"
    And 搶購 "sale-1" 的剩餘件數為 3
    When 時間前進 5 分鐘
    And 排程在所有伺服器上執行
    Then 請求 "r1" 的保留狀態為 "PAID"
    And 搶購 "sale-1" 的剩餘件數為 3

  Scenario: 同一筆付款通知重複送達，結果一樣
    When 顧客 "alice" 在伺服器 "S1" 以請求 "r1" 搶購 "sale-1" 2 件
    And 金流通知請求 "r1" 的保留已付款
    Then 操作結果成功
    When 金流在伺服器 "S2" 通知請求 "r1" 的保留已付款
    Then 操作結果成功
    When 金流同時在所有伺服器通知請求 "r1" 的保留已付款
    Then 請求 "r1" 的保留狀態為 "PAID"
    And 搶購 "sale-1" 的剩餘件數為 3

  Scenario: 付款通知的保留不存在
    When 金流通知保留 "sale-1:nothing" 已付款
    Then 操作結果失敗，原因 "HOLD_NOT_FOUND"
    And 查詢保留 "sale-1:nothing" 得到空值

  # ---- 到期與釋放 ----

  Scenario: 到期未付款的保留由排程釋放，件數還給其他人
    When 顧客 "alice" 在伺服器 "S1" 以請求 "r1" 搶購 "sale-1" 2 件
    And 時間前進 9 分鐘
    And 排程在所有伺服器上執行
    Then 請求 "r1" 的保留狀態為 "HELD"
    And 搶購 "sale-1" 的剩餘件數為 3
    When 時間前進 1 分鐘
    And 排程在所有伺服器上執行
    Then 請求 "r1" 的保留狀態為 "EXPIRED"
    And 搶購 "sale-1" 的剩餘件數為 5
    When 排程在所有伺服器上執行
    Then 搶購 "sale-1" 的剩餘件數為 5
    When 顧客 "bob" 在伺服器 "S2" 以請求 "r2" 搶購 "sale-1" 2 件
    And 顧客 "alice" 在伺服器 "S3" 以請求 "r3" 搶購 "sale-1" 2 件
    Then 請求 "r2" 搶到了
    And 請求 "r3" 搶到了
    And 搶購 "sale-1" 的剩餘件數為 1

  Scenario: 到期後才來的付款不成交
    When 顧客 "alice" 在伺服器 "S1" 以請求 "r1" 搶購 "sale-1" 2 件
    And 時間前進 10 分鐘
    And 金流通知請求 "r1" 的保留已付款
    Then 操作結果失敗，原因 "HOLD_EXPIRED"
    And 請求 "r1" 的保留狀態為 "EXPIRED"
    And 搶購 "sale-1" 的剩餘件數為 5
    When 排程在所有伺服器上執行
    Then 搶購 "sale-1" 的剩餘件數為 5

  Scenario: 已釋放的保留再收到付款通知
    When 顧客 "alice" 在伺服器 "S1" 以請求 "r1" 搶購 "sale-1" 2 件
    And 時間前進 10 分鐘
    And 排程在所有伺服器上執行
    And 金流通知請求 "r1" 的保留已付款
    Then 操作結果失敗，原因 "HOLD_EXPIRED"
    And 搶購 "sale-1" 的剩餘件數為 5

  Scenario: 付款與排程同時發生，到期前付款仍成交
    When 顧客 "alice" 在伺服器 "S1" 以請求 "r1" 搶購 "sale-1" 2 件
    And 時間前進 9 分鐘
    And 時間前進 59 秒
    And 金流通知請求 "r1" 的保留已付款，同時排程在所有伺服器上執行
    Then 操作結果成功
    And 請求 "r1" 的保留狀態為 "PAID"
    And 搶購 "sale-1" 的剩餘件數為 3

  Scenario: 付款與排程同時發生，剛好到期則釋放且件數只還一次
    When 顧客 "alice" 在伺服器 "S1" 以請求 "r1" 搶購 "sale-1" 2 件
    And 時間前進 10 分鐘
    And 金流通知請求 "r1" 的保留已付款，同時排程在所有伺服器上執行
    Then 操作結果失敗，原因 "HOLD_EXPIRED"
    And 請求 "r1" 的保留狀態為 "EXPIRED"
    And 搶購 "sale-1" 的剩餘件數為 5

  Scenario: 釋放後同一個請求重送，回的是原本那張保留，不會再扣件數
    When 顧客 "alice" 在伺服器 "S1" 以請求 "r1" 搶購 "sale-1" 2 件
    And 時間前進 10 分鐘
    And 排程在所有伺服器上執行
    And 顧客 "alice" 在伺服器 "S2" 以請求 "r1" 搶購 "sale-1" 2 件
    Then 請求 "r1" 搶到了
    And 請求 "r1" 的保留狀態為 "EXPIRED"
    And 搶購 "sale-1" 的剩餘件數為 5

  # ---- 伺服器故障 ----

  Scenario: 伺服器寫完保留紀錄就當機，重送到另一台會接手同一張保留
    Given 伺服器 "S1" 會在對 "final:" 開頭的 key 執行 set 之前當機
    When 顧客 "alice" 在伺服器 "S1" 以請求 "r1" 搶購 "sale-1" 2 件
    Then 請求 "r1" 的伺服器當機了
    And 搶購 "sale-1" 的剩餘件數為 3
    When 顧客 "alice" 在伺服器 "S2" 以請求 "r1" 搶購 "sale-1" 2 件
    Then 請求 "r1" 搶到了，到期時間是 "2026-06-15T12:10:00Z"
    And 搶購 "sale-1" 的剩餘件數為 3
    When 時間前進 10 分鐘
    And 排程在所有伺服器上執行
    Then 請求 "r1" 的保留狀態為 "EXPIRED"
    And 搶購 "sale-1" 的剩餘件數為 5

  Scenario: 伺服器扣了件數後卡住還沒寫保留紀錄，重送先被限購擋下，恢復後原請求完成且不超賣
    Given 伺服器 "S1" 會在對 "hold:" 開頭的 key 執行 set 之前卡住
    When 顧客 "alice" 在伺服器 "S1" 以請求 "r1" 搶購 "sale-1" 2 件
    Then 請求 "r1" 還沒有結果
    And 搶購 "sale-1" 的剩餘件數為 3
    When 顧客 "alice" 在伺服器 "S2" 以請求 "r1" 搶購 "sale-1" 2 件，結果記為 "r1-retry"
    Then 請求 "r1-retry" 失敗，原因 "LIMIT_EXCEEDED"
    When 伺服器 "S1" 恢復並做完手上的工作
    Then 請求 "r1" 搶到了
    And 搶購 "sale-1" 的剩餘件數為 3
    When 顧客 "alice" 在伺服器 "S3" 以請求 "r1" 搶購 "sale-1" 2 件，結果記為 "r1-again"
    Then 請求 "r1" 與請求 "r1-again" 拿到同一張保留
    And 搶購 "sale-1" 的剩餘件數為 3

  Scenario: 伺服器寫完保留紀錄就卡住，重送在另一台先完成，恢復後拿到同一張保留且件數只扣一次
    Given 伺服器 "S1" 會在對 "final:" 開頭的 key 執行 set 之前卡住
    When 顧客 "alice" 在伺服器 "S1" 以請求 "r1" 搶購 "sale-1" 2 件
    Then 請求 "r1" 還沒有結果
    When 顧客 "alice" 在伺服器 "S2" 以請求 "r1" 搶購 "sale-1" 2 件，結果記為 "r1-retry"
    Then 請求 "r1-retry" 搶到了
    When 伺服器 "S1" 恢復並做完手上的工作
    Then 請求 "r1" 搶到了
    And 請求 "r1" 與請求 "r1-retry" 拿到同一張保留
    And 搶購 "sale-1" 的剩餘件數為 3
    And 每位顧客在搶購 "sale-1" 的保留件數都不超過 2

  Scenario: 排程釋放到一半當機，下一次排程把它收尾且件數只還一次
    When 顧客 "alice" 在伺服器 "S1" 以請求 "r1" 搶購 "sale-1" 2 件
    And 時間前進 10 分鐘
    Given 伺服器 "S1" 會在對 "hold:" 開頭的 key 執行 set 之前當機
    When 排程在伺服器 "S1" 上執行
    Then 請求 "r1" 的保留狀態為 "HELD"
    When 排程在伺服器 "S2" 上執行
    And 排程在伺服器 "S3" 上執行
    Then 請求 "r1" 的保留狀態為 "EXPIRED"
    And 搶購 "sale-1" 的剩餘件數為 5
