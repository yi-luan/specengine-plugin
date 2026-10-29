import { Before, Given, When, Then } from "@cucumber/cucumber";
import { deepStrictEqual } from "node:assert/strict";
import { applyPointsDiscount } from "../../src/points.js";
import type { PointsDiscountInput, PointsDiscountResult } from "../../src/points.js";

let input: Partial<PointsDiscountInput> = {};
let result: PointsDiscountResult | undefined;

Before(() => {
  input = {};
  result = undefined;
});

Given("訂單金額為 {int} 元", (orderAmount: number) => {
  input.orderAmount = orderAmount;
});

Given("會員點數餘額為 {int} 點", (pointsBalance: number) => {
  input.pointsBalance = pointsBalance;
});

When("會員使用 {float} 點折抵", (pointsToUse: number) => {
  input.pointsToUse = pointsToUse;
  result = applyPointsDiscount(input as PointsDiscountInput);
});

Then("折抵成功，應付金額為 {int} 元，剩餘點數為 {int} 點", (finalAmount: number, remainingPoints: number) => {
  deepStrictEqual(result, { ok: true, finalAmount, remainingPoints });
});

Then("折抵失敗，原因為 {word}", (reason: string) => {
  deepStrictEqual(result, { ok: false, reason });
});

Then("再次以相同輸入折抵會得到相同結果，且輸入內容未被改變", () => {
  const snapshot = { ...(input as PointsDiscountInput) };
  const again = applyPointsDiscount(input as PointsDiscountInput);
  deepStrictEqual(again, result);
  deepStrictEqual(input, snapshot);
});
