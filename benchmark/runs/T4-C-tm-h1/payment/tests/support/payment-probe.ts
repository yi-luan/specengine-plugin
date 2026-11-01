// 測試專用觀察器：讀取付款服務內部的訂單紀錄（已扣款、已退款、已取消、暫存）。
// PaymentService 介面（src/events.ts，團隊固定）只提供 handle 與 getBalance，
// 內部紀錄由 src/payment.ts 的 inspectPayment 提供（不在介面內，僅測試使用）。
import type { PaymentService } from '../../src/events.js';
import { inspectPayment } from '../../src/payment.js';

export const PaymentProbe = {
  chargeOf(service: PaymentService, orderId: string): number | undefined {
    return inspectPayment(service).chargeOf(orderId);
  },
  statusOf(service: PaymentService, orderId: string): 'CHARGED' | 'REFUNDED' | 'CANCELLED' | undefined {
    return inspectPayment(service).statusOf(orderId);
  },
  pendingOf(service: PaymentService, orderId: string): boolean {
    return inspectPayment(service).pendingOf(orderId);
  },
};
