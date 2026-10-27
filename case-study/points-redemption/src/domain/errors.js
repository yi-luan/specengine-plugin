'use strict';
/**
 * 領域錯誤：message 即對會員顯示的固定文案（見 .specengine/spec/terms.md「固定文案」）。
 */
class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

/** 固定文案，與 .specengine/spec/terms.md 逐字一致 */
const MESSAGES = Object.freeze({
  SUCCESS: '成功',
  // 決策見 .specengine/sdd/resolved/features/點數折抵_超過上限時的系統反應.md
  EXCEEDS_BALANCE: '折抵點數超過餘額',
  EXCEEDS_ORDER_TOTAL: '折抵點數超過訂單金額',
  // 決策見 .specengine/sdd/resolved/features/點數折抵_折抵零點.md
  POINTS_MUST_BE_POSITIVE: '折抵點數必須大於 0',
  // 決策見 .specengine/sdd/resolved/features/點數折抵_扣點與減價的原子性.md
  REDEMPTION_FAILED: '折抵失敗',
  // 決策見 .specengine/sdd/resolved/features/點數折抵_非預期狀態下取消.md
  NOTHING_TO_CANCEL: '沒有可取消的折抵',
  ORDER_ALREADY_SUBMITTED: '訂單已送出，無法取消折抵',
});

module.exports = { DomainError, MESSAGES };
