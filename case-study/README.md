# Case study: points redemption

This folder is the replication package for the case study in the paper (`paper/main.tex`, Section IV). It holds the project exactly as it stood when the case ended: the four-sentence requirement, every SpecEngine artifact, the product code, the tests, and the module lock.

Artifacts are in Traditional Chinese, as the workflow produced them. The requirement is `points-redemption/inbox/需求.md`; the paper gives an English translation.

## What is where

| Path | Content |
| --- | --- |
| `inbox/需求.md` | The original requirement (four sentences) |
| `.specengine/sdd/matrix/POINTS_REDEMPTION.json` | Rule matrix (11 rules) |
| `.specengine/sdd/resolved/` | The 11 Decisions with the stakeholder's answers; `R006拒絕範例列與R002優先序矛盾.md` is the incident in Section IV-D |
| `.specengine/sdd/flow-design/` | Flow diagrams confirmed in P3 |
| `.specengine/spec/` | Specification Contract: Gherkin, data model (DBML), glossary, conventions |
| `tests/steps/`, `tests/drivers/` | Step definitions, Driver Interface (`*.driver.js`) and its in-process implementation |
| `src/` | Product code written in P6 |
| `.specengine/sdd/locks/POINTS_REDEMPTION.lock.json` | The module lock |

## Reproduce

Requires Node.js 18 or later.

```sh
cd points-redemption
npm install
npm test                                              # 21 scenarios, 21 passed
node ../../scripts/spec-guard.js audit                # lock audit passes
node ../../scripts/spec-status.js                     # POINTS_REDEMPTION: IMPLEMENTED
```

To see the audit catch tampering, change any number in `.specengine/spec/features/點數折抵.feature` and run the audit again; it reports `LOCK_DRIFT`.

## Differences from release 2.0.0

The case ran on a working version just before release 2.0.0, so two checks added after the case report on these artifacts:

- `feature-lint.js` reports 11 violations, one per rule: release 2.0.0 accepts only the rule types `main_flow` and `edge_case`, while the matrix uses the types the executor chose at the time (`happy_path`, `constraint`, `boundary`, `error_recovery`, `validation`, `known_tradeoff`). The last two hold "the system deliberately does nothing" decisions, which is gap (ii) in Section IV-E, fixed afterwards by the Exclusion entity and the closed type set.
- `spec-status.js` warns that the flow-design index lacks the status line introduced in 2.0.0. The derived stage is unaffected.

The field `"spec_engine_version": "2.0.0"` in the matrix was written by the executor from the working version's label; the instructions it followed are those of the working version, not the final 2.0.0 release.

## Exclusions

The five Exclusions counted in the paper (Table VI) are the "known trade-offs" the stakeholder confirmed during flow alignment, listed in `.specengine/sdd/overview/POINTS_REDEMPTION.md`: order submission belongs to the order module; zero balance or zero order amount is covered by R-001/R-002; no automatic refund when the member leaves (R-009); no partial cancellation (R-004); no point-transaction log (POLICY-007). R-009 is also a rule in the matrix, because at the time such decisions had no other home.

## Timestamps

The `時間戳` fields in the decision files and the confirmation time in the flow-design index were written by the executor and are estimates; they do not match the order of events. The system clock is authoritative: `lockedAt` in the lock file is UTC (00:42 on 18 October in Taiwan time), and the file modification times of the original run place every decision, the incident record and the corrected feature file before the lock. The whole case, from the empty project to the lock, took about 35 minutes (00:09–00:44). Release 2.0.0 tells the agent to read timestamps from the system clock for this reason.
