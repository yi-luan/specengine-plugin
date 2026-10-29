# 需求：訂單狀態機

1. 訂單建立後狀態為「已建立」，訂單金額必須大於 0。
2. 已建立的訂單可以付款；付款金額必須等於訂單金額，付款後狀態為「已付款」。
3. 已付款的訂單可以出貨，出貨後狀態為「已出貨」。
4. 已建立或已付款的訂單可以取消，取消後狀態為「已取消」。
5. 已付款的訂單取消時，系統要退還全部已付金額。
6. 已出貨的訂單可以申請退款，退款可以分多次，累計退款金額不得超過已付金額。
7. 累計退款金額達到已付金額時，狀態變為「已退款」。
8. 每次操作成功時回傳更新後的訂單；失敗時回傳失敗原因。

## 技術介面（固定，不可更名）

在 `src/order.ts` 匯出：

```ts
export type OrderStatus = 'CREATED' | 'PAID' | 'SHIPPED' | 'CANCELLED' | 'REFUNDED';
export type Order = {
  id: string;
  status: OrderStatus;
  amount: number;          // 訂單金額
  paidAmount: number;      // 已付金額
  refundedAmount: number;  // 累計退款金額
};
export type OrderResult = { ok: true; order: Order } | { ok: false; reason: string };

export function createOrder(id: string, amount: number): OrderResult;
export function pay(order: Order, amount: number): OrderResult;
export function ship(order: Order): OrderResult;
export function cancel(order: Order): OrderResult;
export function refund(order: Order, amount: number): OrderResult;
```

全部是純函式：不修改傳入的 order，成功時回傳新的 order 物件。金額皆為整數元。
