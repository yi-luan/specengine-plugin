# SpecEngine benchmark

This folder holds everything behind the comparison in the main [README](../README.md#evidence): the requirements, the stakeholder answer sheets, the hidden acceptance tests, the reference implementations, every run's output and the scripts that score them.

Every number in the tables below can be regenerated with two commands.

```sh
cd benchmark/base && npm ci && cd ..
node grade.mjs --reference   # check the hidden tests against the reference implementations
node grade.mjs               # score all 23 runs
node tamper.mjs              # tamper with each locked SpecEngine run and run the audit
```

Requires Node.js 18 or later.

## Design

### Conditions

| Code | Condition | Version | What the agent was told |
| :--- | :--- | :--- | :--- |
| A | No SDD tool | Claude Code only | Implement the requirement and add tests. It could not ask anyone and had to list every assumption. |
| B | GitHub Spec Kit | `specify-cli` 1.2.3.dev0 (commit `e5714c6`), Claude integration | Run constitution, specify, clarify, plan, tasks, implement, then converge until it reports converged. |
| C | SpecEngine | 2.0.0 for every task, including the change task, which ran before 2.1.0 existed | Run manifest-sync, then spec-run through all stages, including the two human gates. |

All three conditions started from the same project in [`base/`](base/): TypeScript, cucumber-js, `npm test`, product code in `src/`.

### Tasks

| Task | Requirement | Open boundaries (must ask) | Traps (stated, should not ask) | Hidden tests |
| :--- | :--- | ---: | ---: | ---: |
| T1 | [Loyalty-point redemption](tasks/t1/requirement.md) | 7 | 2 | 18 |
| T2 | [Order state machine](tasks/t2/requirement.md) | 11 | 3 | 32 |
| T3 | [Multi-tenant coupons](tasks/t3/requirement.md) | 14 | 3 | 38 |
| E4 | [Change request on T1](tasks/e4/change.md): cap 30% → 35% | – | – | 12 |

Each requirement fixes the public interface, so one hidden test file can score every condition. The requirements are written in Traditional Chinese, as in the original study.

Each task has an answer sheet (`tasks/*/answers.md`) that lists every open boundary with its correct answer. When an agent asked a question, the answer came from the sheet and nothing else. Questions not on the sheet got "your call, use your best judgement".

### Scoring

The hidden tests in [`hidden/`](hidden/) import the fixed interface from the run's `src/` and are never visible to the agent. Each test is tagged with the boundary it checks and with its kind: `behaviour` (what happens) or `reason` (which failure code is returned). [`reference/`](reference/) holds an implementation written straight from each answer sheet. It passes 100% of its hidden tests, which shows the tests themselves follow the answer sheet.

## Results

### Hidden acceptance tests

Output of `node grade.mjs`, grouped by task. Runs marked *void* are excluded from every conclusion; see [Validity](#validity).

| Task | Run | Passed | Behaviour | Reason code | Must-ask boundaries asked |
| :--- | :--- | ---: | ---: | ---: | ---: |
| T1 | A-r1 | 11/18 | 11/12 | 0/6 | 0/7 |
| T1 | A-r2 | 11/18 | 11/12 | 0/6 | 0/7 |
| T1 | B-r1 | 18/18 | 12/12 | 6/6 | 7/7 |
| T1 | B-r2 | 18/18 | 12/12 | 6/6 | 7/7 |
| T1 | C-r1 | 18/18 | 12/12 | 6/6 | 7/7 |
| T1 | C-r2 | 18/18 | 12/12 | 6/6 | 7/7 |
| T2 | A-r1 | 20/32 | 20/20 | 0/12 | 0/11 |
| T2 | A-r2 | 20/32 | 20/20 | 0/12 | 0/11 |
| T2 | B-r1 | 32/32 | 20/20 | 12/12 | 8/11 |
| T2 | B-r2 | 32/32 | 20/20 | 12/12 | 8/11 |
| T2 | C-r1 | 32/32 | 20/20 | 12/12 | 11/11 |
| T2 | C-r2 | 32/32 | 20/20 | 12/12 | 11/11 |
| T3 | A-r1 | 20/38 | 20/23 | 0/15 | 0/14 |
| T3 | A-r2 | 22/38 | 22/23 | 0/15 | 0/14 |
| T3 | B-r1 | 36/38 | 22/23 | 14/15 | 10/14 |
| T3 | B-r2 *void* | 38/38 | 23/23 | 15/15 | – |
| T3 | B-r3 | 38/38 | 23/23 | 15/15 | 13/14 |
| T3 | C-r1 *void* | 38/38 | 23/23 | 15/15 | – |
| T3 | C-r2 *void* | 38/38 | 23/23 | 15/15 | – |
| T3 | C-r3 | 38/38 | 23/23 | 15/15 | 13/14 |

Observations:

- **Without an SDD tool every failure code was invented.** The baseline listed all open boundaries as assumptions but could not ask anyone. On T3 it also guessed behaviour wrong: it capped an excess discount instead of rejecting it, accepted a zero-amount order and treated a zero-value coupon as valid.
- **Spec Kit's clarify round is capped at five questions.** On T2 both runs left three boundaries unasked and guessed them right. On T3-B-r1 the unasked zero-value coupon was guessed wrong. T3-B-r3 recovered by asking follow-ups inside one question.
- **SpecEngine asked about every T2 boundary.** On T3 the one unasked boundary (how stacked coupons add up) was derived correctly, and the flow review surfaced four further edge cases that the answer sheet did not cover.

### Cost

Wall-clock time is the agent's own start and end timestamps, minus time lost to API rate-limit interruptions. Tokens are the subagent totals reported by Claude Code.

| Task | No SDD tool | Spec Kit | SpecEngine |
| :--- | :--- | :--- | :--- |
| T1 | 1.5 min · 51k | 13 min · 171–187k | 18.5 min · 202–214k |
| T2 | 2.5 min · 60k | 13.5 min · 188–194k | 20 min · 214–218k |
| T3 | 1.8–3.5 min · 54–60k | 6–11 min · 164–177k | 14.5 min (clean run) |
| Stops for a human | 0 | 2–3 | 2–8 |

### Tampering with a locked specification

SpecEngine, reproducible with `node tamper.mjs`:

| Run | Change | Audit before | Audit after |
| :--- | :--- | :--- | :--- |
| T1-C-r1 | 1000 → 1001 | pass | LOCK_DRIFT (exit 1) |
| T1-C-r2 | 1000 → 1001 | pass | LOCK_DRIFT (exit 1) |
| T2-C-r1 | 300 → 301 | pass | LOCK_DRIFT (exit 1) |
| T2-C-r2 | 300 → 301 | pass | LOCK_DRIFT (exit 1) |
| T3-C-r1 | 2000 → 2001 | pass | LOCK_DRIFT (exit 1) |
| T3-C-r2 | 100 → 101 | pass | LOCK_DRIFT (exit 1) |
| T3-C-r3 | 10 → 11 | pass | LOCK_DRIFT (exit 1) |
| E4-C | 1000 → 1001 | pass | LOCK_DRIFT (exit 1) |

Spec Kit has no lock, so each tamper was committed by hand and `speckit-converge` was run read-only by a fresh agent. Both tamper commits and their reverts are in the runs' `GIT-HISTORY.txt`.

| Run | Change to `spec.md` | `converge` verdict |
| :--- | :--- | :--- |
| T1-B-r1 | Cap 30% → 35% in one user-story sentence | **Converged**, 0 actionable findings. The contradiction was listed as an awareness note only. |
| T2-B-r1 | "Shipped orders cannot be cancelled" → "can be cancelled with full refund" | **Not converged.** One CRITICAL contradiction; two tasks appended. Took about 7.5 minutes. |

The baseline has no mechanism. Changing an expected value in its own feature file left all its tests green.

### Change request (E4)

Runs E4-A, E4-B and E4-C are T1-A-r1, T1-B-r1 and T1-C-r1 after the change was applied.

| Run | Time | Hidden tests after change | Notes |
| :--- | :--- | ---: | :--- |
| E4-A | 2.5 min | 6/12 | All five change-related tests pass. Its original wrong guesses remain. |
| E4-B | 9 min | 12/12 | Ran specify, clarify, plan, tasks, implement and converge again. Changed 11 files. |
| E4-C | 17 min | 12/12 | SpecEngine 2.0 had no documented change workflow, so the agent assembled one. Release 2.1.0 adds `spec change`. |

## Validity

- **Role-played stakeholder.** In most runs the same agent that did the work also answered its own questions from the answer sheet, under an instruction not to read ahead. Three T3 runs broke that rule and read the whole sheet: B-r2, C-r1 and C-r2. They are void. B-r3 and C-r3 were rerun with the sheet moved out of reach, and the questions were answered by a separate session.
- **Model.** Most runs used Claude Fable 5.1. Runs that were resumed or started after a model switch used Claude Opus 5.5: T3-B-r1 and T3-B-r2 (partly), T3-C-r1 and T3-C-r2 (partly), T3-B-r3 and T3-C-r3 (fully).
- **Interruptions.** Runs were interrupted by API rate limits and one session restart. Each agent resumed from where it stopped, and the interruption times are recorded in its `BENCH-LOG.md`.
- **Test fix.** Two T3 tests (T3-35, T3-36) originally used coupons whose start date was after their end date. An agent reasonably rejected those as invalid coupons. The test data was corrected and every T3 run was rescored. The table above uses the corrected tests.
- **Sample size.** Each cell has one or two clean runs. A difference of one or two tests is not evidence of a difference between tools.
- **Recovery.** The run directories were restored from each run's git objects after the working copies were removed by an automatic temp-folder cleanup. Each run's `GIT-HISTORY.txt` lists its commits. Third-party files (Spec Kit's bundled skills and scripts) and `package-lock.json` are omitted. Local absolute paths in the logs were replaced with `<bench>`, `<plugin>` and `<home>`.

## Layout

```text
benchmark/
├── base/          starting project shared by all runs
├── tasks/         requirement and answer sheet per task; e4/change.md is the change request
├── hidden/        hidden acceptance tests, one file per task
├── reference/     implementations written from the answer sheets
├── runs/          one folder per run: BENCH-LOG.md, src/, tests/, the tool's spec artifacts, GIT-HISTORY.txt
├── grade.mjs      scores runs against the hidden tests
└── tamper.mjs     tamper test for locked SpecEngine runs
```

Each run's `BENCH-LOG.md` holds its timestamps, every question and answer, the assumptions it made on its own, and the tool errors it hit.
