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

The case ran on a working version just before release 2.0.0, so two checks added after the case report on these artifacts:

- `feature-lint.js` rejects the rule types `validation` and `known_tradeoff` in the matrix. The executor invented them for "the system deliberately does nothing" decisions; this is gap (ii) in Section IV-E, fixed afterwards by the Exclusion entity.
- `spec-status.js` warns that the flow-design index lacks the status line introduced in 2.0.0. The derived stage is unaffected.
