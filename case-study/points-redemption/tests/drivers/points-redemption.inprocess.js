'use strict';
/**
 * 點數折抵 Driver 的 in-process 實作：直接呼叫產品碼 Service，不經 HTTP／UI。
 * 本檔不受 spec-guard 凍結；介面檔 points-redemption.driver.js 一個字都不動。
 */
const { PointsRedemptionDriver } = require('./points-redemption.driver');
const { InMemoryStore } = require('../../src/infrastructure/in-memory-store');
const { PointsRedemptionService } = require('../../src/points-redemption/points-redemption-service');
const { DomainError, MESSAGES } = require('../../src/domain/errors');

class PointsRedemptionInProcess extends PointsRedemptionDriver {
  constructor() {
    super();
    this.store = new InMemoryStore();
    this.svc = new PointsRedemptionService(this.store);
    this.member = null;
    this.order = null;
    this.result = '';
  }

  async setMemberBalance(balance) {
    this.member = this.svc.createMember({ points_balance: balance });
  }

  async createOrder(total) {
    this.order = this.svc.createOrder({ member_id: this.member.id, total_amount: total });
  }

  async redeemPoints(points) {
    this.result = this._capture(() => this.svc.redeem(this.order.id, points));
  }

  async submitOrder() {
    this.svc.submitOrder(this.order.id);
  }

  async injectWriteFailure() {
    this.store.injectWriteFailure();
  }

  async cancelRedemption() {
    this.result = this._capture(() => this.svc.cancelRedemption(this.order.id));
  }

  async leaveCheckoutAndTimeout() {
    // R-009：會員離開／逾時不觸發任何系統動作（known_tradeoff）。
    // 決策見 .specengine/sdd/resolved/features/點數折抵_未結帳離開時的點數處置.md
    // in-process 下沒有任何排程或清理程序可呼叫，此處刻意不做事；若日後產品碼加入逾時清理，應改為呼叫它以驗證「不退點」。
  }

  async getLastResult() {
    return this.result;
  }

  async getMemberBalance() {
    return this.svc.getMember(this.member.id).points_balance;
  }

  async getPayableAmount() {
    return this.svc.getOrder(this.order.id).payable_amount;
  }

  async getRedeemedPoints() {
    return this.svc.getOrder(this.order.id).redeemed_points;
  }

  /** 把 Service 的結果轉成 .feature 期待的結果文字：成功 或 DomainError 的固定文案 */
  _capture(action) {
    try {
      action();
      return MESSAGES.SUCCESS;
    } catch (err) {
      if (err instanceof DomainError) return err.message;
      throw err;
    }
  }
}

module.exports = { PointsRedemptionInProcess };
