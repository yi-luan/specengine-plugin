# Research: Multi-Tenant Coupons

No `NEEDS CLARIFICATION` items remained in the Technical Context; the stack is fixed by the
existing repository (TypeScript + cucumber-js + tsx). The decisions below record the
technical choices made for the design.

## Decision 1: Timestamp comparison

- **Decision**: Convert `validFrom`, `validTo`, and `now` with `Date.parse()` and compare the
  resulting epoch milliseconds: valid iff `from <= now && now <= to`.
- **Rationale**: ISO 8601 instants with explicit `Z`/offset parse unambiguously; numeric
  comparison makes the inclusive boundaries (FR-004) trivial and avoids string-compare pitfalls
  with differing offsets.
- **Alternatives considered**: lexicographic string compare (breaks with mixed offsets or
  fractional seconds); a date library (violates YAGNI / no new dependencies).

## Decision 2: Integer validation

- **Decision**: Use `Number.isInteger()` for `orderAmount`, `value`, and (when present)
  `minOrderAmount`. `orderAmount` must additionally be `> 0`.
- **Rationale**: Directly implements FR-011/FR-016/FR-017; rejects `NaN`, `Infinity`, and
  fractional numbers in one call.
- **Alternatives considered**: `Math.floor(x) === x` (accepts `Infinity`); `typeof` only
  (accepts fractions).

## Decision 3: Percentage rounding

- **Decision**: `Math.floor(orderAmount * value / 100)` per PERCENT coupon, summed afterwards.
- **Rationale**: Clarification answer (floor each coupon individually). Products of integers up to
  realistic magnitudes stay exact in IEEE doubles (< 2^53), so no precision concern.
- **Alternatives considered**: `Math.round`, `Math.ceil` (rejected by clarification);
  rounding the summed total (rejected: answer requires per-coupon floor).

## Decision 4: Rule evaluation strategy

- **Decision**: Evaluate rules as sequential stages in the FR-018 order; each stage scans all
  coupons in presentation order and returns on first violation.
- **Rationale**: Guarantees the required precedence even when different coupons violate
  different rules (e.g., coupon 1 expired, coupon 2 wrong tenant → `TENANT_MISMATCH`).
- **Alternatives considered**: single pass per coupon checking all rules (would report
  `COUPON_EXPIRED` for coupon 1 before `TENANT_MISMATCH` for coupon 2, violating FR-018).

## Decision 5: Test layout

- **Decision**: One feature file `tests/features/coupon.feature` with scenarios grouped by
  rule, driven by a data-table-free step vocabulary (`Given a coupon "P10" for tenant "A" of
  type PERCENT value 10 ...`), a typed cucumber World in `tests/support/world.ts`, and step
  definitions in `tests/steps/coupon.steps.ts`.
- **Rationale**: `cucumber.cjs` already globs these paths; single feature keeps the suite
  readable at this size; the World keeps state typed under `strict`.
- **Alternatives considered**: one feature per user story (fine, but more files than the
  size warrants); `Scenario Outline` tables (used where they shorten repetitive cases).

## Decision 6: Barrel export

- **Decision**: `src/index.ts` re-exports `src/coupon.ts`.
- **Rationale**: The requirement fixes `src/coupon.ts` as the module path; a barrel is cheap
  and keeps the existing placeholder meaningful.
- **Alternatives considered**: leave `index.ts` empty (acceptable; chosen the re-export for
  discoverability).
