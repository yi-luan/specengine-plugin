// 由負責 PaymentService 的工程師實作。
import type { PaymentService } from './events.js';

export function createPaymentService(balances: Record<string, number>): PaymentService {
  throw new Error('尚未實作');
}
