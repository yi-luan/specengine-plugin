import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyPointsDiscount } from '../src/points.ts';

type Case = { id: string; hole: string; kind: 'behaviour' | 'reason'; input: [number, number, number]; expect: (r: any) => void };

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
const cases: Case[] = [
  { id: 'T1-01', hole: 'base', kind: 'behaviour', input: [1000, 500, 200], expect: ok(800, 300) },
  { id: 'T1-02', hole: 'H9', kind: 'behaviour', input: [1000, 500, 300], expect: ok(700, 200) },
  { id: 'T1-03', hole: 'H2', kind: 'behaviour', input: [1000, 500, 301], expect: rejected() },
  { id: 'T1-04', hole: 'H2', kind: 'reason', input: [1000, 500, 301], expect: reason('EXCEEDS_LIMIT') },
  { id: 'T1-05', hole: 'H3', kind: 'behaviour', input: [101, 1000, 30], expect: ok(71, 970) },
  { id: 'T1-06', hole: 'H3', kind: 'behaviour', input: [101, 1000, 31], expect: rejected() },
  { id: 'T1-07', hole: 'H1', kind: 'behaviour', input: [1000, 100, 150], expect: rejected() },
  { id: 'T1-08', hole: 'H1', kind: 'reason', input: [1000, 100, 150], expect: reason('INSUFFICIENT_POINTS') },
  { id: 'T1-09', hole: 'base', kind: 'behaviour', input: [1000, 300, 300], expect: ok(700, 0) },
  { id: 'T1-10', hole: 'H4', kind: 'behaviour', input: [1000, 500, 0], expect: ok(1000, 500) },
  { id: 'T1-11', hole: 'H5', kind: 'behaviour', input: [1000, 500, -5], expect: rejected() },
  { id: 'T1-12', hole: 'H8', kind: 'behaviour', input: [1000, 500, 10.5], expect: rejected() },
  { id: 'T1-13', hole: 'H5', kind: 'reason', input: [1000, 500, 10.5], expect: reason('INVALID_POINTS') },
  { id: 'T1-14', hole: 'H6', kind: 'behaviour', input: [0, 500, 0], expect: rejected() },
  { id: 'T1-15', hole: 'H6', kind: 'behaviour', input: [-10, 500, 0], expect: rejected() },
  { id: 'T1-16', hole: 'H6', kind: 'reason', input: [-10, 500, 0], expect: reason('INVALID_INPUT') },
  { id: 'T1-17', hole: 'H7', kind: 'reason', input: [1000, 100, 400], expect: reason('INSUFFICIENT_POINTS') },
  { id: 'T1-18', hole: 'H7', kind: 'reason', input: [-10, 100, -1], expect: reason('INVALID_INPUT') },
];

for (const c of cases) {
  test(`${c.id} [${c.hole}] [${c.kind}]`, () => {
    const [orderAmount, pointsBalance, pointsToUse] = c.input;
    c.expect(applyPointsDiscount({ orderAmount, pointsBalance, pointsToUse }));
  });
}
