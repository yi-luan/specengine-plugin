'use strict';
/**
 * 點數折抵 Service（模組 POINTS_REDEMPTION）。
 * 行為以 .specengine/sdd/matrix/POINTS_REDEMPTION.json 為唯一來源。
 * 1 點折 1 元，金額與點數皆為整數（決策見 .specengine/sdd/resolved/data/Order_金額與點數的數值型別.md）。
 */
const { DomainError, MESSAGES } = require('../domain/errors');
const { ORDER_STATUS } = require('../infrastructure/in-memory-store');

class PointsRedemptionService {
  /** @param {import('../infrastructure/in-memory-store').InMemoryStore} store */
  constructor(store) {
    this.store = store;
  }

  createMember({ points_balance }) {
    const member = { id: this.store.nextId(), points_balance };
    this.store.members.set(member.id, member);
    return member;
  }

  createOrder({ member_id, total_amount }) {
    const order = {
      id: this.store.nextId(),
      member_id,
      total_amount,
      redeemed_points: 0,
      payable_amount: total_amount,
      status: ORDER_STATUS.DRAFT,
    };
    this.store.orders.set(order.id, order);
    return order;
  }

  getMember(id) {
    return this.store.members.get(id);
  }

  getOrder(id) {
    return this.store.orders.get(id);
  }

  /**
   * 會員對訂單折抵 points 點（R-000／001／002／003／006／008）。
   * - points 為 null、非整數或 <= 0 → 「折抵點數必須大於 0」（R-008）
   * - 訂單已有折抵時以新換舊：可用餘額 = 目前餘額 + 舊折抵點數（R-006）
   *   決策見 .specengine/sdd/resolved/features/點數折抵_重複折抵同一訂單.md
   * - 超過可用餘額 → 「折抵點數超過餘額」，優先於訂單金額檢查（R-002；兩者皆超過以餘額為準）
   *   決策見 .specengine/sdd/resolved/features/點數折抵_超過上限時的系統反應.md
   * - 超過訂單金額 → 「折抵點數超過訂單金額」（R-001）
   * - 剛好等於上限可折，首次與重複折抵皆適用（R-003）
   *   決策見 .specengine/sdd/resolved/features/點數折抵_重複折抵時剛好等於上限.md
   * - 扣點與減價在同一交易內完成（R-000）
   */
  redeem(orderId, points) {
    const order = this.getOrder(orderId);
    const member = this.getMember(order.member_id);

    if (!Number.isInteger(points) || points <= 0) {
      throw new DomainError(MESSAGES.POINTS_MUST_BE_POSITIVE);
    }
    const previousPoints = order.redeemed_points;
    const availableBalance = member.points_balance + previousPoints;
    if (points > availableBalance) throw new DomainError(MESSAGES.EXCEEDS_BALANCE);
    if (points > order.total_amount) throw new DomainError(MESSAGES.EXCEEDS_ORDER_TOTAL);

    try {
      this.store.transaction(() => {
        member.points_balance = availableBalance - points;
        order.redeemed_points = points;
        order.payable_amount = order.total_amount - points;
      });
    } catch (err) {
      // R-007：任一步寫入失敗整筆回滾（store.transaction 已還原），對會員回報「折抵失敗」
      // 決策見 .specengine/sdd/resolved/features/點數折抵_扣點與減價的原子性.md
      throw new DomainError(MESSAGES.REDEMPTION_FAILED);
    }
  }

  /**
   * 會員整筆取消訂單上的折抵（R-004／005／010）。
   * - 訂單已送出 → 「訂單已送出，無法取消折抵」（R-005；先於「無折抵」檢查，依 flow-design 取消折抵.md 的判斷順序）
   * - 訂單沒有生效中的折抵 → 「沒有可取消的折抵」（R-010）
   *   決策見 .specengine/sdd/resolved/features/點數折抵_非預期狀態下取消.md
   * - 不提供部分取消（決策見 .specengine/sdd/resolved/features/點數折抵_部分取消.md）
   */
  cancelRedemption(orderId) {
    const order = this.getOrder(orderId);
    const member = this.getMember(order.member_id);
    if (order.status === ORDER_STATUS.SUBMITTED) throw new DomainError(MESSAGES.ORDER_ALREADY_SUBMITTED);
    if (order.redeemed_points === 0) throw new DomainError(MESSAGES.NOTHING_TO_CANCEL);
    this.store.transaction(() => {
      member.points_balance += order.redeemed_points;
      order.redeemed_points = 0;
      order.payable_amount = order.total_amount;
    });
  }

  /** 將訂單標記為已送出。送出本身屬訂單模組，此處僅維護 status 供 R-005 判斷。 */
  submitOrder(orderId) {
    this.getOrder(orderId).status = ORDER_STATUS.SUBMITTED;
  }
}

module.exports = { PointsRedemptionService };
