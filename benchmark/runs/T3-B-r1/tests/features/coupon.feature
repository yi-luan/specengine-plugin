Feature: 多租戶優惠券套用
  結帳時對一筆訂單套用零到多張優惠券，回傳折扣後金額、折扣總額與套用代碼；
  任一張券無效則整筆失敗並回傳固定原因代碼。

  Background:
    Given 現在時間為 "2026-06-01T00:00:00Z"

  Rule: 單張優惠券折扣

    Scenario: 百分比折扣
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | P10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      When 執行結帳
      Then 結帳成功，折扣後金額 900 元，折扣總額 100 元
      And 套用的優惠券代碼依序為 "P10"

    Scenario: 固定金額折扣
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 有以下優惠券:
        | tenantId | code | type  | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | F150 | FIXED | 150   | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      When 執行結帳
      Then 結帳成功，折扣後金額 850 元，折扣總額 150 元
      And 套用的優惠券代碼依序為 "F150"

    Scenario: 不帶任何優惠券
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 沒有任何優惠券
      When 執行結帳
      Then 結帳成功，折扣後金額 1000 元，折扣總額 0 元
      And 套用的優惠券代碼依序為 ""

    Scenario: 百分比折扣有小數時無條件捨去
      Given 租戶 "T1" 的訂單金額為 333 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | P15  | PERCENT | 15    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      When 執行結帳
      Then 結帳成功，折扣後金額 284 元，折扣總額 49 元

    Scenario: 百分之百折扣使金額為零
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | P100 | PERCENT | 100   | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      When 執行結帳
      Then 結帳成功，折扣後金額 0 元，折扣總額 1000 元

  Rule: 輸入合法性

    Scenario: 訂單金額為 0
      Given 租戶 "T1" 的訂單金額為 0 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | P10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      When 執行結帳
      Then 結帳失敗，原因為 "INVALID_INPUT"

    Scenario: 訂單金額為負數
      Given 租戶 "T1" 的訂單金額為 -1 元
      And 沒有任何優惠券
      When 執行結帳
      Then 結帳失敗，原因為 "INVALID_INPUT"

    Scenario: 訂單金額非整數
      Given 租戶 "T1" 的訂單金額為 10.5 元
      And 沒有任何優惠券
      When 執行結帳
      Then 結帳失敗，原因為 "INVALID_INPUT"

    Scenario: 現在時間無法解析
      Given 現在時間為 "not-a-date"
      And 租戶 "T1" 的訂單金額為 1000 元
      And 沒有任何優惠券
      When 執行結帳
      Then 結帳失敗，原因為 "INVALID_INPUT"

  Rule: 優惠券資料合法性

    Scenario: 百分比超過 100
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | P101 | PERCENT | 101   | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      When 執行結帳
      Then 結帳失敗，原因為 "INVALID_COUPON"

    Scenario: 固定金額為負數
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 有以下優惠券:
        | tenantId | code | type  | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | FNEG | FIXED | -1    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      When 執行結帳
      Then 結帳失敗，原因為 "INVALID_COUPON"

    Scenario: 折扣值非整數
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | PX   | PERCENT | 10.5  | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      When 執行結帳
      Then 結帳失敗，原因為 "INVALID_COUPON"

    Scenario: 生效時間晚於失效時間
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | PBAD | PERCENT | 10    | 2026-12-31T00:00:00Z | 2026-01-01T00:00:00Z | true      |                |
      When 執行結帳
      Then 結帳失敗，原因為 "INVALID_COUPON"

    Scenario: 最低消費為負數
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | PMIN | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      | -5             |
      When 執行結帳
      Then 結帳失敗，原因為 "INVALID_COUPON"

  Rule: 租戶隔離

    Scenario: 使用其他租戶的優惠券
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T2       | P10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      When 執行結帳
      Then 結帳失敗，原因為 "TENANT_MISMATCH"

  Rule: 有效期間

    Scenario: 優惠券已過期
      Given 現在時間為 "2027-01-01T00:00:00Z"
      And 租戶 "T1" 的訂單金額為 1000 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | P10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      When 執行結帳
      Then 結帳失敗，原因為 "COUPON_EXPIRED"

    Scenario: 優惠券尚未生效
      Given 現在時間為 "2025-12-31T23:59:59Z"
      And 租戶 "T1" 的訂單金額為 1000 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | P10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      When 執行結帳
      Then 結帳失敗，原因為 "COUPON_EXPIRED"

    Scenario: 現在時間等於生效時間
      Given 現在時間為 "2026-01-01T00:00:00Z"
      And 租戶 "T1" 的訂單金額為 1000 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | P10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      When 執行結帳
      Then 結帳成功，折扣後金額 900 元，折扣總額 100 元

    Scenario: 現在時間等於失效時間
      Given 現在時間為 "2026-12-31T23:59:59Z"
      And 租戶 "T1" 的訂單金額為 1000 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | P10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      When 執行結帳
      Then 結帳成功，折扣後金額 900 元，折扣總額 100 元

    Scenario: 以時間戳比較而非字串比較（含時區偏移）
      Given 現在時間為 "2026-12-31T16:00:00Z"
      And 租戶 "T1" 的訂單金額為 1000 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo                   | stackable | minOrderAmount |
        | T1       | P10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59+08:00 | true      |                |
      When 執行結帳
      Then 結帳失敗，原因為 "COUPON_EXPIRED"

  Rule: 最低消費

    Scenario: 未達最低消費
      Given 租戶 "T1" 的訂單金額為 499 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | P10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      | 500            |
      When 執行結帳
      Then 結帳失敗，原因為 "MIN_ORDER_NOT_MET"

    Scenario: 剛好達到最低消費
      Given 租戶 "T1" 的訂單金額為 500 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | P10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      | 500            |
      When 執行結帳
      Then 結帳成功，折扣後金額 450 元，折扣總額 50 元

    Scenario: 未設定最低消費表示無限制
      Given 租戶 "T1" 的訂單金額為 1 元
      And 有以下優惠券:
        | tenantId | code | type  | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | F1   | FIXED | 1     | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      When 執行結帳
      Then 結帳成功，折扣後金額 0 元，折扣總額 1 元

  Rule: 疊加

    Scenario: 兩張可疊加券（百分比加固定）
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | P10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
        | T1       | F50  | FIXED   | 50    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      When 執行結帳
      Then 結帳成功，折扣後金額 850 元，折扣總額 150 元
      And 套用的優惠券代碼依序為 "P10,F50"

    Scenario: 兩張可疊加百分比券皆以原始金額計算
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | P10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
        | T1       | P20  | PERCENT | 20    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      When 執行結帳
      Then 結帳成功，折扣後金額 700 元，折扣總額 300 元
      And 套用的優惠券代碼依序為 "P10,P20"

    Scenario: 三張可疊加券各自捨去後加總
      Given 租戶 "T1" 的訂單金額為 333 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | P10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
        | T1       | P15  | PERCENT | 15    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
        | T1       | F5   | FIXED   | 5     | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      When 執行結帳
      Then 結帳成功，折扣後金額 246 元，折扣總額 87 元
      And 套用的優惠券代碼依序為 "P10,P15,F5"

    Scenario: 套用代碼依傳入順序
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | F50  | FIXED   | 50    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
        | T1       | P10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      When 執行結帳
      Then 套用的優惠券代碼依序為 "F50,P10"

    Scenario: 兩張不可疊加券
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | N10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     |                |
        | T1       | N20  | PERCENT | 20    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     |                |
      When 執行結帳
      Then 結帳失敗，原因為 "NOT_STACKABLE"

    Scenario: 不可疊加券與可疊加券混用
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | N10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     |                |
        | T1       | F50  | FIXED   | 50    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      When 執行結帳
      Then 結帳失敗，原因為 "NOT_STACKABLE"

    Scenario: 可疊加券在前、不可疊加券在後同樣拒絕
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | F50  | FIXED   | 50    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
        | T1       | N10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     |                |
      When 執行結帳
      Then 結帳失敗，原因為 "NOT_STACKABLE"

    Scenario: 單獨一張不可疊加券可以使用
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | N10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     |                |
      When 執行結帳
      Then 結帳成功，折扣後金額 900 元，折扣總額 100 元
      And 套用的優惠券代碼依序為 "N10"

  Rule: 重複優惠券

    Scenario: 同一張券傳入兩次
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | P10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
        | T1       | P10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      When 執行結帳
      Then 結帳失敗，原因為 "DUPLICATE_COUPON"

  Rule: 折扣不得超過訂單金額

    Scenario: 固定金額超過訂單金額
      Given 租戶 "T1" 的訂單金額為 100 元
      And 有以下優惠券:
        | tenantId | code | type  | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | F150 | FIXED | 150   | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      When 執行結帳
      Then 結帳失敗，原因為 "DISCOUNT_EXCEEDS_AMOUNT"

    Scenario: 固定金額剛好等於訂單金額
      Given 租戶 "T1" 的訂單金額為 100 元
      And 有以下優惠券:
        | tenantId | code | type  | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | F100 | FIXED | 100   | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      When 執行結帳
      Then 結帳成功，折扣後金額 0 元，折扣總額 100 元
      And 套用的優惠券代碼依序為 "F100"

    Scenario: 多張百分比合計超過 100%
      Given 租戶 "T1" 的訂單金額為 100 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | P60  | PERCENT | 60    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
        | T1       | P50  | PERCENT | 50    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      When 執行結帳
      Then 結帳失敗，原因為 "DISCOUNT_EXCEEDS_AMOUNT"

    Scenario: 多張固定金額合計剛好等於訂單金額
      Given 租戶 "T1" 的訂單金額為 100 元
      And 有以下優惠券:
        | tenantId | code | type  | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | F60  | FIXED | 60    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
        | T1       | F40  | FIXED | 40    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      When 執行結帳
      Then 結帳成功，折扣後金額 0 元，折扣總額 100 元

  Rule: 錯誤優先序

    Scenario: 無效輸入優先於租戶不符
      Given 租戶 "T1" 的訂單金額為 0 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T2       | P10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      When 執行結帳
      Then 結帳失敗，原因為 "INVALID_INPUT"

    Scenario: 無效優惠券優先於租戶不符
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T2       | P101 | PERCENT | 101   | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      When 執行結帳
      Then 結帳失敗，原因為 "INVALID_COUPON"

    Scenario: 租戶不符優先於過期
      Given 現在時間為 "2027-01-01T00:00:00Z"
      And 租戶 "T1" 的訂單金額為 1000 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T2       | P10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      When 執行結帳
      Then 結帳失敗，原因為 "TENANT_MISMATCH"

    Scenario: 重複優先於過期
      Given 現在時間為 "2027-01-01T00:00:00Z"
      And 租戶 "T1" 的訂單金額為 1000 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | P10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
        | T1       | P10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      When 執行結帳
      Then 結帳失敗，原因為 "DUPLICATE_COUPON"

    Scenario: 過期優先於未達最低消費
      Given 現在時間為 "2027-01-01T00:00:00Z"
      And 租戶 "T1" 的訂單金額為 100 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | P10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      | 500            |
      When 執行結帳
      Then 結帳失敗，原因為 "COUPON_EXPIRED"

    Scenario: 未達最低消費優先於不可疊加
      Given 租戶 "T1" 的訂單金額為 100 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | N10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     | 500            |
        | T1       | N20  | PERCENT | 20    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     |                |
      When 執行結帳
      Then 結帳失敗，原因為 "MIN_ORDER_NOT_MET"

    Scenario: 不可疊加優先於折扣超額
      Given 租戶 "T1" 的訂單金額為 100 元
      And 有以下優惠券:
        | tenantId | code | type  | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | N150 | FIXED | 150   | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     |                |
        | T1       | N200 | FIXED | 200   | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     |                |
      When 執行結帳
      Then 結帳失敗，原因為 "NOT_STACKABLE"

  Rule: 純函式

    Scenario: 相同輸入結果相同且不修改輸入
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 有以下優惠券:
        | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
        | T1       | P10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
        | T1       | F50  | FIXED   | 50    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      When 執行結帳
      Then 結帳成功，折扣後金額 850 元，折扣總額 150 元
      And 再次結帳結果相同且輸入未被修改
