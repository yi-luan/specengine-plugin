# Quickstart: validating Member Points Discount

**Date**: 2026-10-20 | **Contract**: [contracts/points-api.md](./contracts/points-api.md) | **Data model**: [data-model.md](./data-model.md)

## Prerequisites

- Node.js 22+, dependencies installed (`npm install` — already present in `node_modules/`).

## Commands

```bash
npm test            # runs all cucumber-js scenarios in tests/features/ via tsx
npm run typecheck   # tsc --noEmit over src/ and tests/
```

Expected outcome: every scenario in `tests/features/points-discount.feature` passes (no
undefined, pending or failed steps) and `tsc` reports no errors.

## Validation scenarios (what the feature file proves)

| Spec requirement | Scenario (summary) | Expected |
|------------------|--------------------|----------|
| FR-001, FR-006 | 1000 dollars, 500 pts, use 200 | ok, 800 / 300 |
| FR-003a (boundary, 35%) | 1000 dollars, 500 pts, use 350 | ok, 650 / 150 |
| FR-003a (floor) | 1001 dollars, 500 pts, use 350 / 351 | ok 651 / 150; then `EXCEEDS_LIMIT` |
| FR-003 | 1000 dollars, 500 pts, use 351 | `EXCEEDS_LIMIT` |
| FR-003 (E4 regression) | 1000 dollars, 500 pts, use 301 | ok, 699 / 199 (was refused at 30%) |
| FR-003b | 1000 dollars, 500 pts, use 0 | ok, 1000 / 500 |
| FR-004 | 1000 dollars, 100 pts, use 150 | `INSUFFICIENT_POINTS` |
| FR-002 | use 10.5 | `INVALID_POINTS` |
| FR-005 | use -5 | `INVALID_POINTS` |
| FR-009 | order 0 / -100 / 1000.5; balance -1 / 10.5 | `INVALID_INPUT` |
| FR-011 | combined violations | first code in fixed order |
| FR-007, FR-008 | any failure | no `finalAmount` / `remainingPoints` in result |

## Manual spot check (optional)

```bash
node --import tsx -e "import('./src/points.ts').then(m => console.log(m.applyPointsDiscount({ orderAmount: 1001, pointsBalance: 500, pointsToUse: 350 })))"
```

Expected: `{ ok: true, finalAmount: 651, remainingPoints: 150 }` (35% cap, change request E4).
