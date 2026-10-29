Feature: 訂單狀態機
  訂單自建立起依 CREATED → PAID → SHIPPED → REFUNDED 推進，
  CREATED / PAID 可取消為 CANCELLED。每個操作為純函式，
  成功回傳新訂單，失敗回傳固定代碼的失敗原因。

  Rule: 需求1 訂單建立後狀態為「已建立」，訂單金額必須大於 0

    Scenario: 以正整數金額建立訂單
      When 以 id "o-1"、金額 100 建立訂單
      Then 操作成功且訂單狀態為 CREATED
      And 訂單的 amount 為 100、paidAmount 為 0、refundedAmount 為 0

    Scenario: 識別碼不做驗證，空字串 id 也可建立訂單
      When 以 id ""、金額 100 建立訂單
      Then 操作成功且訂單狀態為 CREATED
      And 訂單的 id 為 ""

    Scenario: 金額為 0 建立訂單失敗
      When 以 id "o-1"、金額 0 建立訂單
      Then 操作失敗且原因為 INVALID_AMOUNT

    Scenario: 金額為負數建立訂單失敗
      When 以 id "o-1"、金額 -5 建立訂單
      Then 操作失敗且原因為 INVALID_AMOUNT

    Scenario: 金額為非整數建立訂單失敗
      When 以 id "o-1"、金額 10.5 建立訂單
      Then 操作失敗且原因為 INVALID_AMOUNT

  Rule: 需求2 已建立的訂單可以付款；付款金額必須等於訂單金額

    Scenario: 付款金額等於訂單金額則成功
      Given 一筆狀態為 CREATED、金額 100、已付 0、已退 0 的訂單
      When 付款 100
      Then 操作成功且訂單狀態為 PAID
      And 訂單的 amount 為 100、paidAmount 為 100、refundedAmount 為 0
      And 傳入的訂單未被修改

    Scenario: 少付失敗
      Given 一筆狀態為 CREATED、金額 100、已付 0、已退 0 的訂單
      When 付款 99
      Then 操作失敗且原因為 AMOUNT_MISMATCH
      And 傳入的訂單未被修改

    Scenario: 多付失敗
      Given 一筆狀態為 CREATED、金額 100、已付 0、已退 0 的訂單
      When 付款 101
      Then 操作失敗且原因為 AMOUNT_MISMATCH
      And 傳入的訂單未被修改

    Scenario: 付款金額為 0 失敗
      Given 一筆狀態為 CREATED、金額 100、已付 0、已退 0 的訂單
      When 付款 0
      Then 操作失敗且原因為 INVALID_AMOUNT
      And 傳入的訂單未被修改

    Scenario: 已付款的訂單不可重複付款
      Given 一筆狀態為 PAID、金額 100、已付 100、已退 0 的訂單
      When 付款 100
      Then 操作失敗且原因為 INVALID_TRANSITION
      And 傳入的訂單未被修改

    Scenario: 狀態錯誤優先於金額錯誤（已取消訂單付負數）
      Given 一筆狀態為 CANCELLED、金額 100、已付 0、已退 0 的訂單
      When 付款 -1
      Then 操作失敗且原因為 INVALID_TRANSITION

  Rule: 需求3 已付款的訂單可以出貨，出貨後狀態為「已出貨」

    Scenario: 已付款訂單出貨成功
      Given 一筆狀態為 PAID、金額 100、已付 100、已退 0 的訂單
      When 出貨
      Then 操作成功且訂單狀態為 SHIPPED
      And 訂單的 amount 為 100、paidAmount 為 100、refundedAmount 為 0
      And 傳入的訂單未被修改

    Scenario: 已建立（未付款）訂單不可出貨
      Given 一筆狀態為 CREATED、金額 100、已付 0、已退 0 的訂單
      When 出貨
      Then 操作失敗且原因為 INVALID_TRANSITION
      And 傳入的訂單未被修改

    Scenario: 已出貨訂單不可重複出貨
      Given 一筆狀態為 SHIPPED、金額 100、已付 100、已退 0 的訂單
      When 出貨
      Then 操作失敗且原因為 INVALID_TRANSITION
      And 傳入的訂單未被修改

  Rule: 需求4+5 已建立或已付款的訂單可以取消；已付款取消時退還全部已付金額

    Scenario: 取消已建立訂單
      Given 一筆狀態為 CREATED、金額 100、已付 0、已退 0 的訂單
      When 取消訂單
      Then 操作成功且訂單狀態為 CANCELLED
      And 訂單的 amount 為 100、paidAmount 為 0、refundedAmount 為 0
      And 傳入的訂單未被修改

    Scenario: 取消已付款訂單並退還全部已付金額
      Given 一筆狀態為 PAID、金額 100、已付 100、已退 0 的訂單
      When 取消訂單
      Then 操作成功且訂單狀態為 CANCELLED
      And 訂單的 amount 為 100、paidAmount 為 100、refundedAmount 為 100
      And 傳入的訂單未被修改

    Scenario: 已出貨訂單不可取消
      Given 一筆狀態為 SHIPPED、金額 100、已付 100、已退 0 的訂單
      When 取消訂單
      Then 操作失敗且原因為 INVALID_TRANSITION
      And 傳入的訂單未被修改

    Scenario: 已取消訂單不可再取消
      Given 一筆狀態為 CANCELLED、金額 100、已付 100、已退 100 的訂單
      When 取消訂單
      Then 操作失敗且原因為 INVALID_TRANSITION

    Scenario: 已退款訂單不可取消
      Given 一筆狀態為 REFUNDED、金額 100、已付 100、已退 100 的訂單
      When 取消訂單
      Then 操作失敗且原因為 INVALID_TRANSITION

  Rule: 需求6+7 已出貨的訂單可分多次退款，累計不得超過已付金額；累計達已付金額時狀態為「已退款」

    Scenario: 部分退款後維持已出貨
      Given 一筆狀態為 SHIPPED、金額 100、已付 100、已退 0 的訂單
      When 退款 30
      Then 操作成功且訂單狀態為 SHIPPED
      And 訂單的 amount 為 100、paidAmount 為 100、refundedAmount 為 30
      And 傳入的訂單未被修改

    Scenario: 兩次部分退款累計等於已付金額後變為已退款
      Given 一筆狀態為 SHIPPED、金額 100、已付 100、已退 0 的訂單
      When 退款 30
      Then 操作成功且訂單狀態為 SHIPPED
      When 退款 70
      Then 操作成功且訂單狀態為 REFUNDED
      And 訂單的 amount 為 100、paidAmount 為 100、refundedAmount 為 100

    Scenario: 一次全額退款後變為已退款
      Given 一筆狀態為 SHIPPED、金額 100、已付 100、已退 0 的訂單
      When 退款 100
      Then 操作成功且訂單狀態為 REFUNDED
      And 訂單的 amount 為 100、paidAmount 為 100、refundedAmount 為 100

    Scenario: 退款超過剩餘可退金額時整筆拒絕
      Given 一筆狀態為 SHIPPED、金額 100、已付 100、已退 30 的訂單
      When 退款 71
      Then 操作失敗且原因為 REFUND_EXCEEDS_PAID
      And 傳入的訂單未被修改

    Scenario: 退款金額為 0 失敗
      Given 一筆狀態為 SHIPPED、金額 100、已付 100、已退 0 的訂單
      When 退款 0
      Then 操作失敗且原因為 INVALID_AMOUNT
      And 傳入的訂單未被修改

    Scenario: 退款金額為負數失敗
      Given 一筆狀態為 SHIPPED、金額 100、已付 100、已退 0 的訂單
      When 退款 -1
      Then 操作失敗且原因為 INVALID_AMOUNT
      And 傳入的訂單未被修改

    Scenario: 已付款未出貨的訂單不可退款（應走取消）
      Given 一筆狀態為 PAID、金額 100、已付 100、已退 0 的訂單
      When 退款 50
      Then 操作失敗且原因為 INVALID_TRANSITION
      And 傳入的訂單未被修改

    Scenario: 已退款訂單不可再退款
      Given 一筆狀態為 REFUNDED、金額 100、已付 100、已退 100 的訂單
      When 退款 1
      Then 操作失敗且原因為 INVALID_TRANSITION

    Scenario: 狀態錯誤優先於金額錯誤（已取消訂單退負數）
      Given 一筆狀態為 CANCELLED、金額 100、已付 0、已退 0 的訂單
      When 退款 -1
      Then 操作失敗且原因為 INVALID_TRANSITION

  Rule: 需求8 每次操作成功回傳更新後的訂單；失敗回傳失敗原因 — 非法轉移矩陣

    Scenario Outline: 狀態 <狀態> 下執行 <操作> 被拒絕
      Given 一筆狀態為 <狀態>、金額 100、已付 <已付>、已退 <已退> 的訂單
      When 執行 <操作>
      Then 操作失敗且原因為 INVALID_TRANSITION
      And 傳入的訂單未被修改

      Examples:
        | 狀態      | 已付 | 已退 | 操作   |
        | CREATED   | 0    | 0    | ship   |
        | CREATED   | 0    | 0    | refund |
        | PAID      | 100  | 0    | pay    |
        | PAID      | 100  | 0    | refund |
        | SHIPPED   | 100  | 0    | pay    |
        | SHIPPED   | 100  | 0    | ship   |
        | SHIPPED   | 100  | 0    | cancel |
        | CANCELLED | 0    | 0    | pay    |
        | CANCELLED | 0    | 0    | ship   |
        | CANCELLED | 0    | 0    | cancel |
        | CANCELLED | 0    | 0    | refund |
        | REFUNDED  | 100  | 100  | pay    |
        | REFUNDED  | 100  | 100  | ship   |
        | REFUNDED  | 100  | 100  | cancel |
        | REFUNDED  | 100  | 100  | refund |

  Rule: 純函式 — 成功時回傳新物件，傳入的訂單不被修改

    Scenario: 付款回傳新物件
      Given 一筆狀態為 CREATED、金額 100、已付 0、已退 0 的訂單
      When 付款 100
      Then 操作成功且訂單狀態為 PAID
      And 回傳的訂單是新的物件
      And 傳入的訂單未被修改

    Scenario: 出貨回傳新物件
      Given 一筆狀態為 PAID、金額 100、已付 100、已退 0 的訂單
      When 出貨
      Then 操作成功且訂單狀態為 SHIPPED
      And 回傳的訂單是新的物件
      And 傳入的訂單未被修改

    Scenario: 取消回傳新物件
      Given 一筆狀態為 PAID、金額 100、已付 100、已退 0 的訂單
      When 取消訂單
      Then 操作成功且訂單狀態為 CANCELLED
      And 回傳的訂單是新的物件
      And 傳入的訂單未被修改

    Scenario: 退款回傳新物件
      Given 一筆狀態為 SHIPPED、金額 100、已付 100、已退 0 的訂單
      When 退款 10
      Then 操作成功且訂單狀態為 SHIPPED
      And 回傳的訂單是新的物件
      And 傳入的訂單未被修改
