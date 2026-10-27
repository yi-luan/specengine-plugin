'use strict';
/**
 * 點數折抵 Driver 介面（綁定契約）。
 * 模組：POINTS_REDEMPTION。此檔由 spec-04 產出，spec-05 期間由 spec-guard 全字節凍結，不得修改。
 * JavaScript 無 interface 語法，以「全部方法拋 Contract Not Implemented 的基底類別」作為介面；
 * 實作檔（points-redemption.inprocess.js 等）繼承並覆寫全部方法。
 * 識別字語言：en（manifest 第 3 節 Test Identifier Language 未填，依 spec-04 預設 en；中文放註解）。
 */
class PointsRedemptionDriver {
  /** 建立一位點數餘額為 balance 的會員，作為後續操作主體（members.points_balance） */
  async setMemberBalance(balance) {
    throw new Error('Contract Not Implemented: PointsRedemptionDriver.setMemberBalance');
  }

  /** 為該會員建立一筆金額為 total、狀態「未送出」、尚無折抵的訂單（orders.total_amount） */
  async createOrder(total) {
    throw new Error('Contract Not Implemented: PointsRedemptionDriver.createOrder');
  }

  /**
   * 會員對該訂單輸入折抵點數並確認折抵。points 為整數；空白輸入以 null 傳入。
   * 結果（「成功」或錯誤訊息文字）由 getLastResult 取得。
   */
  async redeemPoints(points) {
    throw new Error('Contract Not Implemented: PointsRedemptionDriver.redeemPoints');
  }

  /** 將該訂單標記為「已送出」（orders.status） */
  async submitOrder() {
    throw new Error('Contract Not Implemented: PointsRedemptionDriver.submitOrder');
  }

  /** 讓下一次折抵交易在寫入時失敗（供 R-007 回滾驗證） */
  async injectWriteFailure() {
    throw new Error('Contract Not Implemented: PointsRedemptionDriver.injectWriteFailure');
  }

  /** 會員對該訂單整筆取消折抵。結果由 getLastResult 取得。 */
  async cancelRedemption() {
    throw new Error('Contract Not Implemented: PointsRedemptionDriver.cancelRedemption');
  }

  /** 模擬會員離開結帳頁面且逾時（不應觸發任何系統動作，供 R-009 驗證） */
  async leaveCheckoutAndTimeout() {
    throw new Error('Contract Not Implemented: PointsRedemptionDriver.leaveCheckoutAndTimeout');
  }

  /** 回傳最近一次折抵／取消操作的結果文字（「成功」或 terms.md 固定文案） */
  async getLastResult() {
    throw new Error('Contract Not Implemented: PointsRedemptionDriver.getLastResult');
  }

  /** 回傳會員目前點數餘額（members.points_balance） */
  async getMemberBalance() {
    throw new Error('Contract Not Implemented: PointsRedemptionDriver.getMemberBalance');
  }

  /** 回傳該訂單目前應付金額（orders.payable_amount） */
  async getPayableAmount() {
    throw new Error('Contract Not Implemented: PointsRedemptionDriver.getPayableAmount');
  }

  /** 回傳該訂單目前生效中的折抵點數（orders.redeemed_points；無折抵為 0） */
  async getRedeemedPoints() {
    throw new Error('Contract Not Implemented: PointsRedemptionDriver.getRedeemedPoints');
  }
}

module.exports = { PointsRedemptionDriver };
