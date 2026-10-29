import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyPointsDiscount } from '../src/points.ts';

// 需求變更後（上限 30% → 35%）的隱藏驗收
const ok = (final: number, remaining: number) => (r: any) => {
  assert.equal(r.ok, true, `expected ok, got ${JSON.stringify(r)}`);
  assert.equal(r.finalAmount, final);
  assert.equal(r.remainingPoints, remaining);
};
const rejected = () => (r: any) => assert.equal(r.ok, false, `expected rejection, got ${JSON.stringify(r)}`);
const reason = (code: string) => (r: any) => {
  assert.equal(r.ok, false, `expected rejection, got ${JSON.stringify(r)}`);
  assert.equal(r.reason, code);
};

// input = [orderAmount, pointsBalance, pointsToUse]
const cases: Array<{ id: string; hole: string; kind: 'behaviour' | 'reason'; input: [number, number, number]; expect: (r: any) => void }> = [
  { id: 'V2-01', hole: 'base', kind: 'behaviour', input: [1000, 500, 200], expect: ok(800, 300) },
  { id: 'V2-02', hole: 'CHANGE', kind: 'behaviour', input: [1000, 500, 350], expect: ok(650, 150) },
  { id: 'V2-03', hole: 'CHANGE', kind: 'behaviour', input: [1000, 500, 351], expect: rejected() },
  { id: 'V2-04', hole: 'CHANGE', kind: 'reason', input: [1000, 500, 351], expect: reason('EXCEEDS_LIMIT') },
  { id: 'V2-05', hole: 'CHANGE', kind: 'behaviour', input: [101, 1000, 35], expect: ok(66, 965) },
  { id: 'V2-06', hole: 'CHANGE', kind: 'behaviour', input: [101, 1000, 36], expect: rejected() },
  { id: 'V2-07', hole: 'CHANGE', kind: 'behaviour', input: [1000, 500, 300], expect: ok(700, 200) },
  { id: 'V2-08', hole: 'H1', kind: 'reason', input: [1000, 100, 150], expect: reason('INSUFFICIENT_POINTS') },
  { id: 'V2-09', hole: 'H4', kind: 'behaviour', input: [1000, 500, 0], expect: ok(1000, 500) },
  { id: 'V2-10', hole: 'H5', kind: 'reason', input: [1000, 500, 10.5], expect: reason('INVALID_POINTS') },
  { id: 'V2-11', hole: 'H6', kind: 'reason', input: [-10, 500, 0], expect: reason('INVALID_INPUT') },
  { id: 'V2-12', hole: 'H7', kind: 'reason', input: [1000, 100, 400], expect: reason('INSUFFICIENT_POINTS') },
];
for (const c of cases) {
  test(`${c.id} [${c.hole}] [${c.kind}]`, () => {
    const [orderAmount, pointsBalance, pointsToUse] = c.input;
    c.expect(applyPointsDiscount({ orderAmount, pointsBalance, pointsToUse }));
  });
}
