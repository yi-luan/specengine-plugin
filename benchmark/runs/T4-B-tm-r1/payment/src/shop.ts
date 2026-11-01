// 整合入口（固定，不可修改）：把三位工程師各自負責的服務接在一起。
export * from './events.js';
export { createOrderService } from './order.js';
export { createInventoryService } from './inventory.js';
export { createPaymentService } from './payment.js';
