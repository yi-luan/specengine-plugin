// 訂單服務（ORDER_SERVICE）測試 World：跨步驟狀態一律放在這裡，不用全域變數。
// Binding Layer 為 direct（見 .claude/spec/architecture-manifest.md 第 5 節）：Step 直接呼叫 createOrderService()。
import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import type { CommandResult, Event, OrderService, OrderStatus } from '../../src/events.js';

export type OrderSnapshot = { status: OrderStatus; cancelReason?: 'CUSTOMER' | 'TIMEOUT' } | undefined;

export class OrderWorld extends World {
  /** 被測服務；Background「訂單服務已啟動」時建立 */
  service: OrderService | undefined;
  /** 最近一次 placeOrder／cancelOrder 的結果 */
  lastResult: CommandResult | undefined;
  /** 最近一次命令、handle 或 tick 所發出的事件（命令失敗時為空陣列） */
  lastEvents: Event[] = [];
  /** 本 Scenario 內訂單服務發出過的所有事件（含 Given 步驟），用於驗證 id 全域唯一 */
  allEmitted: Event[] = [];
  /** 最近一次 getOrder 的結果 */
  lastQuery: OrderSnapshot;
  /** 已下單的訂單金額，供建構 PaymentSucceeded 事件時帶入 amount */
  amounts = new Map<string, number>();
  /** Given 步驟自動產生入站事件 id 的流水號 */
  private seq = 0;

  constructor(options: IWorldOptions) {
    super(options);
  }

  nextInboundId(): string {
    this.seq += 1;
    return `given-${this.seq}`;
  }

  /** 依事件型別字串建構其他服務送來的事件（測試自備，見 manifest「Test Double Strategy」） */
  buildInbound(id: string, type: string, orderId: string): Event {
    switch (type) {
      case 'PaymentSucceeded':
        return { id, type, orderId, amount: this.amounts.get(orderId) ?? 0 };
      case 'StockReserved':
      case 'StockRejected':
      case 'StockReleased':
      case 'PaymentFailed':
      case 'OrderCancelled':
        return { id, type, orderId };
      case 'PaymentRefunded':
        return { id, type, orderId, amount: this.amounts.get(orderId) ?? 0 };
      default:
        throw new Error(`測試不支援的事件型別：${type}`);
    }
  }

  record(events: Event[]): void {
    this.lastEvents = events;
    this.allEmitted.push(...events);
  }
}

setWorldConstructor(OrderWorld);
