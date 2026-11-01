// 限量搶購 技術介面（需求固定，不可更名）。src/flash.ts 由此檔 re-export 並提供 createFlashSale。

// 共用儲存，類似 Redis。每個操作本身是原子的，但兩次呼叫之間其他伺服器可能已經改過資料。
export interface Store {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts?: { nx?: boolean; px?: number }): Promise<boolean>; // nx：key 已存在就不寫並回 false；px：存活毫秒數
  del(key: string): Promise<boolean>;                    // 回傳 key 原本是否存在
  incrBy(key: string, n: number): Promise<number>;       // key 不存在視為 0，回傳加完的值
  sAdd(key: string, member: string): Promise<boolean>;   // 集合；回傳是否新加入
  sRem(key: string, member: string): Promise<boolean>;   // 回傳是否真的移除
  sMembers(key: string): Promise<string[]>;
}

export type Result<T> = { ok: true; value: T } | { ok: false; reason: string };
export type SaleInput = { saleId: string; quantity: number; perCustomerLimit: number; startsAt: string; endsAt: string };
export type GrabInput = { saleId: string; customerId: string; qty: number; requestId: string };
export type HoldStatus = 'HELD' | 'PAID' | 'EXPIRED';   // 保留中／已成交／已釋放
export type Hold = { holdId: string; saleId: string; customerId: string; qty: number; expiresAt: string; status: HoldStatus };

export interface FlashSale {
  openSale(input: SaleInput): Promise<Result<null>>;
  grab(input: GrabInput): Promise<Result<{ holdId: string; expiresAt: string }>>;
  pay(holdId: string): Promise<Result<null>>;            // 金流的付款成功通知
  sweep(): Promise<void>;                                // 排程：釋放到期未付款的保留
  getRemaining(saleId: string): Promise<number>;         // 商品頁顯示的剩餘件數
  getHold(holdId: string): Promise<Hold | null>;
}
