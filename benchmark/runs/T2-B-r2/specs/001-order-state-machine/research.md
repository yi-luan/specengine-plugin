# Research: Order State Machine

**Phase 0 output** — all Technical Context items were already determined by the repository
(`package.json`, `cucumber.cjs`, `tsconfig.json`) and the constitution, so no NEEDS
CLARIFICATION remained. The items below record the decisions taken and alternatives weighed.

## R1. Test runner wiring

- **Decision**: Put Gherkin files under `tests/features/` and step definitions under
  `tests/steps/`, with a custom World in `tests/support/world.ts`. Use the existing `npm test`
  script unchanged.
- **Rationale**: `cucumber.cjs` already lists `tests/features/**/*.feature`,
  `tests/steps/**/*.ts` and `tests/support/**/*.ts`; `node --import tsx` loads TypeScript ESM
  directly on Node 24. Constitution III forbids narrowing these globs.
- **Alternatives considered**: `.specengine/spec/features/` (also in the glob) — rejected,
  that path belongs to a different tooling convention not used here; Jest/Vitest — rejected
  by constitution II.

## R2. Module/import style for TypeScript ESM under tsx

- **Decision**: Tests import the product module as `../../src/order.js` (NodeNext resolution
  requires the `.js` extension on relative imports even for `.ts` sources). Step files use
  `import { Given, When, Then, Before, setWorldConstructor } from '@cucumber/cucumber'`.
- **Rationale**: `tsconfig.json` has `module: NodeNext`; `tsx` resolves `.js` → `.ts`.
- **Alternatives considered**: extension-less imports — fails `tsc --noEmit` under NodeNext.

## R3. Failure reason representation

- **Decision**: `reason` is a plain `string` (type fixed by the requirement) whose value is one
  of the four codes `INVALID_TRANSITION`, `INVALID_AMOUNT`, `AMOUNT_MISMATCH`,
  `REFUND_EXCEEDS_PAID`. Internally a `const` array/union documents the codes, but the exported
  `OrderResult` type keeps `reason: string` verbatim.
- **Rationale**: Owner clarified fixed English codes and their precedence; the public type
  cannot be renamed or narrowed because the interface is fixed.
- **Alternatives considered**: free-text messages (rejected by owner); narrowing
  `reason` to a union (would change the fixed interface — rejected).

## R4. Amount validity rule

- **Decision**: `isValidAmount(n) = Number.isInteger(n) && n > 0`. Applied to the order amount
  in `createOrder`, the payment amount in `pay`, and the refund amount in `refund`.
- **Rationale**: Owner mandated rejecting 0/negative for create and refund with
  `INVALID_AMOUNT`, and delegated the non-integer case; "金額皆為整數元" makes integers the
  natural domain, and `Number.isInteger` also excludes NaN/Infinity. Applying the same check to
  `pay` is consistent with the owner's precedence rule (validity before comparison) and the
  clarified answer that paying 0/negative yields `INVALID_AMOUNT`.
- **Alternatives considered**: allowing fractional amounts — rejected (money is integer
  dollars by requirement); skipping validity for `pay` — rejected (clarification C4).

## R5. Immutability strategy

- **Decision**: Return shallow copies via object spread; never assign to the input. Tests
  assert non-mutation by deep-equal comparison with a pre-call snapshot
  (`structuredClone`).
- **Rationale**: `Order` has only primitive fields, so a shallow copy is a complete copy.
  `Object.freeze` is not required by the spec and would change observable behaviour for
  callers; left out for simplicity (Constitution V).
- **Alternatives considered**: `Object.freeze` on returned orders — not required, rejected;
  immutable library — new dependency, rejected.

## R6. Scenario organisation

- **Decision**: One feature file, with a `Background`-free structure and small reusable steps:
  `Given an order "o-1" with amount 100 in status CREATED/PAID/SHIPPED/CANCELLED/REFUNDED`
  (states are reached by driving the real functions, not by constructing objects), `When I
  pay/ship/cancel/refund ...`, `Then the operation succeeds/fails with reason "..."`, and
  field assertions. Scenario Outlines cover the rejection matrix per state.
- **Rationale**: Drives real transitions (Constitution II: no stubbing of the unit under
  test), keeps step vocabulary tiny, and gives one scenario per FR for traceability.
