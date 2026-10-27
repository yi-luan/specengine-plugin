'use strict';
/**
 * 記憶體資料存放，對應 .specengine/spec/erm.dbml 的 members 與 orders。
 * 提供 transaction()：工作函式內的所有寫入在同一交易內完成，任一步失敗整筆回滾。
 * 決策見 .specengine/sdd/resolved/features/點數折抵_扣點與減價的原子性.md
 */
const ORDER_STATUS = Object.freeze({ DRAFT: '未送出', SUBMITTED: '已送出' });

class InMemoryStore {
  constructor() {
    /** @type {Map<number, {id:number, points_balance:number}>} */
    this.members = new Map();
    /** @type {Map<number, {id:number, member_id:number, total_amount:number, redeemed_points:number, payable_amount:number, status:string}>} */
    this.orders = new Map();
    this._nextId = 1;
    this._failNextWrite = false;
  }

  nextId() {
    return this._nextId++;
  }

  /** 測試用：讓下一筆交易在提交時失敗（模擬資料庫寫入錯誤） */
  injectWriteFailure() {
    this._failNextWrite = true;
  }

  /**
   * 在同一交易內執行 work(store)。提交前若被注入寫入失敗，或 work 本身拋錯，
   * 全部狀態還原到交易前並重新拋出錯誤。
   */
  transaction(work) {
    const snapshot = this._snapshot();
    try {
      const result = work(this);
      if (this._failNextWrite) {
        this._failNextWrite = false;
        throw new Error('simulated write failure');
      }
      return result;
    } catch (err) {
      this._restore(snapshot);
      throw err;
    }
  }

  _snapshot() {
    return {
      members: new Map([...this.members].map(([k, v]) => [k, { ...v }])),
      orders: new Map([...this.orders].map(([k, v]) => [k, { ...v }])),
      nextId: this._nextId,
    };
  }

  _restore(snapshot) {
    this.members = snapshot.members;
    this.orders = snapshot.orders;
    this._nextId = snapshot.nextId;
  }
}

module.exports = { InMemoryStore, ORDER_STATUS };
