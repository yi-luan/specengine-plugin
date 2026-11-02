# SpecEngine benchmark

This folder holds everything behind the comparison in the main [README](../README.md#evidence): the requirements, the stakeholder answer sheets, the hidden acceptance tests, the reference implementations, every run's output and the scripts that score them.

Every number in the tables below can be regenerated with two commands.

```sh
cd benchmark/base && npm ci && cd ..
node grade.mjs --reference   # check the hidden tests against the reference implementations
node grade.mjs               # score every run against the hidden tests
node tamper.mjs              # tamper with each locked SpecEngine run and run the audit
node inject.mjs              # inject one fault per layer into every run and see which check notices
node mutate.mjs              # mutation testing: how strong is each run's own test suite
```

`inject.mjs` and `mutate.mjs` take a few minutes each. Their raw results are kept in [`results/`](results/).

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
| T4 | [Event-driven order, inventory and payment services](tasks/t4/requirement.md), solo and as a [three-person team](tasks/t4/team-requirement.md) | 14 | 3 | 36 |
| T5 | [Flash sale on several servers sharing a Redis-like store](tasks/t5/requirement.md) | 9 + 6 non-functional | 3 | 29 |

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
| E4-C | 1000 → 1001 | pass | LOCK_DRIFT (exit 1) |
| T1-C-r1 | 1000 → 1001 | pass | LOCK_DRIFT (exit 1) |
| T1-C-r2 | 1000 → 1001 | pass | LOCK_DRIFT (exit 1) |
| T2-C-h1 | no example value to change | – | – |
| T2-C-r1 | 300 → 301 | pass | LOCK_DRIFT (exit 1) |
| T2-C-r2 | 300 → 301 | pass | LOCK_DRIFT (exit 1) |
| T3-C-h1 | 0 → 1 | pass | LOCK_DRIFT (exit 1) |
| T3-C-r1 *void* | 2000 → 2001 | pass | LOCK_DRIFT (exit 1) |
| T3-C-r2 *void* | 100 → 101 | pass | LOCK_DRIFT (exit 1) |
| T3-C-r3 | 10 → 11 | pass | LOCK_DRIFT (exit 1) |
| T4-C-h1 | 0 → 1 | pass | LOCK_DRIFT (exit 1) |
| T4-C-r1 | 9 → 10 | pass | LOCK_DRIFT (exit 1) |

Every locked run in which the script found an example value was caught: 11 of 11, nine of them from clean runs. T2-C-h1's feature file has no example table, so the script had nothing to change. The six T4 team developers' projects are not in this table; their audits pass on the untouched projects.

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

### Weak model: Claude Haiku 5.5

A common objection to stepwise refinement with an LLM is that a weak model will mistranslate somewhere along the chain. To test it, T2 and T3 were rerun under all three conditions with Claude Haiku 5.5, the smallest current Claude model. These runs used SpecEngine 2.1.0 and the same Spec Kit commit. Every question was answered from the answer sheet by a separate session, and the agents never had access to the sheet.

| Task | Condition | Hidden tests | Must-ask boundaries asked | Time | Tokens |
| :--- | :--- | ---: | ---: | :--- | :--- |
| T2 | No SDD tool | 20/32 | 0/11 | 1.2 min | 59k |
| T2 | Spec Kit | 20/32 | 1/11 | 7 min | 173k |
| T2 | SpecEngine | **32/32** | 9/11 | 11 min | 202k |
| T3 | No SDD tool | 23/38 | 0/14 | 1.6 min | 62k |
| T3 | Spec Kit | 31/38 | 8/14 | 9 min | 200k |
| T3 | SpecEngine | **38/38** | 13/14 | 12.5 min | 278k |

Times include the minutes each agent waited for an answer.

- **With a weak model, Spec Kit fell to the baseline on T2.** Its clarify step decided there were no high-impact ambiguities and asked one question. Every failure code was then invented, exactly as in the no-tool run.
- **SpecEngine kept full marks on both tasks.** Its discovery stage turns every open boundary into a queued question by procedure, not by the model's judgement of what matters. Haiku asked 9 of 11 and 13 of 14 boundaries; the rest were derived correctly from the answers.
- **This is the strongest result in the benchmark.** With strong models the two SDD tools tied. With a weak model the gap opened: 32 versus 20 on T2, 38 versus 31 on T3.

### Fault injection by layer

`inject.mjs` plants one translation error at a time into a copy of every run and records which check notices it. Two moments are measured:

- **At creation:** the agent has just written the level, before anything is locked. The checks available are `feature-lint.js` (SpecEngine only) and the run's own tests.
- **After lock:** someone changes a finished module later. SpecEngine's `spec-guard.js audit` compares against the lock. To measure the current release, every SpecEngine copy is relocked with the 2.1.0 scripts before the fault is planted.

Summary over all 26 runs (raw table in [`results/injection-table.md`](results/injection-table.md)):

| Layer | Fault | No SDD tool | Spec Kit | SpecEngine |
| :--- | :--- | :--- | :--- | :--- |
| 2 Rule matrix | A rule is dropped | – | – | lint at creation; audit after lock |
| 2 Rule matrix | A rule's postcondition is edited | – | – | audit after lock only |
| 4 Gherkin | A rule or scenario block is dropped | **not detected** | **not detected** | lint at creation; audit after lock |
| 4 Gherkin | One example value is changed (up to 15 cells per run, each separately) | own tests notice 40–100% at creation; nothing after | own tests notice 27–100% at creation; nothing after | own tests notice 40–80% at creation; audit notices 100% after lock |
| 5 Step sentence | A step sentence is renamed | own tests (undefined step) | own tests (undefined step) | own tests; audit after lock |
| 5 Step body | Every `Then` body is emptied, so the tests assert nothing | **not detected** | **not detected** | **not detected** |

What it shows:

- **Structural mistranslations are caught by script only in SpecEngine.** Dropping a rule or a scenario is invisible to Spec Kit and to the baseline, because their own tests simply stop covering that behaviour.
- **After a module is locked, SpecEngine catches every change to every specification level.** The other conditions have no lock.
- **An edited example value is caught at creation only when the code disagrees with it.** Some edited cells are inputs whose new value still passes. The rest would be real mistranslations that a script does not see today, because the rule "every example must follow from the matrix" is checked by the agent, not by a script.
- **Hollow steps are a gap in every condition, SpecEngine included.** Step bodies are deliberately left editable during implementation, so neither the freeze nor the lock covers them.

### Mutation testing of each run's own tests

`mutate.mjs` makes one small change at a time to each run's product code and runs both the run's own tests and the hidden tests. A mutant that breaks a hidden test the original passed has broken real required behaviour. The score is the share of those mutants that the run's own tests also catch. Raw data is in [`results/mutation.json`](results/mutation.json). The 29 runs include E4, the Haiku runs and the three void T3 runs.

| Condition | Runs | Specification-relevant mutation score |
| :--- | ---: | :--- |
| No SDD tool | 9 | 91–100% |
| Spec Kit | 10 | 100% in every run |
| SpecEngine | 10 | 95–100% |

Every condition writes strong tests. The baseline's tests are just as thorough, but they thoroughly check behaviour the agent guessed. **Test thoroughness is not where the conditions differ. The difference is whether the specification being tested is the right one**, which is decided at levels 2 and 3, where SpecEngine forces the questions.

### Event-driven services and team development (T4)

T1 to T3 are single modules with synchronous calls. T4 asks whether the method still holds for the case people worry about most: several services that share no data, talk only through events, and must stay consistent when events are duplicated or arrive out of order.

**The task.** Three services, order, inventory and payment, broadcast events to each other: order placed, stock reserved or rejected, payment succeeded or failed, cancellation, refund and release, plus a 15-minute timeout. The requirement states that delivery is at-least-once and unordered, but not what to do about it. The answer sheet has 14 open boundaries: duplicates, a cancellation that overtakes the order, a cancellation racing a payment, compensation, the timeout boundary and the failure codes.

**The hidden tests.** 32 scripted scenarios drive the services through a test-controlled bus, with explicit duplicates and reorderings. Four more tests replay 300 seeded random schedules with duplicates and reordering, and check four invariants: every order settles, stock is conserved, money is conserved, and no compensation event is sent twice. A deliberately naive implementation without deduplication or memory of cancellations scores 27/36.

**Two ways of working.**

- **Solo.** One agent implements all three services in `src/shop.ts`, as in T1 to T3.
- **Team.** Three agents work in parallel, one per service, each in its own repository. Each sees only the shared event types (`src/events.ts`) and its own file; the other two services are empty stubs. Under Spec Kit and SpecEngine each developer runs the full tool on their own service and asks the stakeholder their own questions. [`assemble-team.mjs`](assemble-team.mjs) then takes each developer's one file, adds the original shared files, and the result is scored with the same hidden tests.

Every condition ran with both Claude Fable 5.1 (`-r1`) and Claude Haiku 5.5 (`-h1`), SpecEngine 2.1.0, and the same Spec Kit commit as before. All questions from all 24 agents were answered from the answer sheet by one separate session.

| Condition | Fable solo | Fable team | Haiku solo | Haiku team |
| :--- | ---: | ---: | ---: | ---: |
| No SDD tool | 30/36 | 29/36 | 30/36 | 29/36 |
| Spec Kit | **36/36** | **36/36** | 30/36 | 35/36 |
| SpecEngine | **36/36** | **36/36** | **36/36** | **36/36** |

| Condition | Fable solo | Fable team | Haiku solo | Haiku team |
| :--- | :--- | :--- | :--- | :--- |
| No SDD tool | 4 min · 71k | 2.5 min · 176k | 2.3 min · 78k | 1.6 min · 194k |
| Spec Kit | 22 min · 220k | 15.5 min · 579k | 13.5 min · 273k | 5.7 min · 497k |
| SpecEngine | 29 min · 282k | 21 min · 684k | 15 min · 297k | 13 min · 751k |

Team times are wall-clock from the first developer's start to the last developer's finish; team tokens are the sum over the three developers. Times include waiting for answers, and up to fifteen agents were waiting on the same answering session at once, so the times for B and C are inflated unevenly.

What it shows:

- **Data consistency was not where the conditions differed.** Eleven of the twelve runs passed every duplicate, reordering and conservation test, including the baseline teams whose developers never saw each other's code. The requirement states at-least-once, unordered delivery plainly, and every model handled it on its own.
- **The one consistency failure came from a gap nobody asked about.** In T4-B-h1 the payment service dropped a stock-reserved event that arrived before it knew the order's customer and amount, and marked the event as seen. The order then stayed pending and its stock stayed reserved forever (seed 91 of 300). Both Haiku team payment developers handled this case; the Spec Kit one had asked about it.
- **What the baseline teams lost were decisions made separately in each service.** Each developer invented their own failure codes, so the assembled system scored 0/7 and 1/7 on codes. One Haiku inventory developer decided that a cancellation releases stock silently, while the requirement only spells out the event for payment failure.
- **SpecEngine scored full marks in all four settings.** As in T2 and T3, the gap opens with the weak model: Spec Kit's Haiku solo run scored 30.
- **In SpecEngine's flow review, Haiku found answer-sheet boundaries that its own discovery stage had missed.** In T4-C-h1 the flow diagrams showed that only the payment service remembered early cancellations, and the agent asked about the inventory service (boundary H2). In the Haiku team, the payment developer asked the same about payment (H3).
- **Neither tool checks the contract between services.** The teams stayed consistent because every developer asked the same stakeholder and got the same answers. If two teams each received different answers, nothing in either tool would notice. That is a limit of both tools, not of the runs.
- **Three SpecEngine agents tripped over one script bug.** When a path field in the manifest also had back-quoted evidence on the same line, `spec-guard` and `spec-status` read the evidence as extra directories. The fake paths do not exist, so nothing failed, but the snapshot listed them. The agents rewrote the line.

The lock held for every SpecEngine project in T4: `spec-guard audit` passes on the two solo runs and on all six team developers' projects, and `tamper.mjs` reports LOCK_DRIFT for both solo runs.

### Concurrency, distributed locks and non-functional requirements (T5)

T5 asks two questions. Does the clarification stage raise non-functional requirements (load, latency, failure of a shared dependency, caching) on its own, or only when the stakeholder brings them up? And do the conditions differ on concurrency, where distributed locks are the usual tool?

**The task.** A flash sale: a merchant opens a sale with a quantity and a per-customer limit, customers grab items and get a 10-minute hold, a payment notification turns the hold into a sale, and a scheduler releases expired holds. The requirement states that several servers run at once and share only a Redis-like `Store` (atomic `get`, `set` with `nx` and `px`, `del`, `incrBy`, and set operations), that customers double-click and requests are resent, that payment notifications repeat, that the scheduler runs on every server, and that a server can crash midway or stall and then resume. It says the system must never oversell. It says nothing about locks.

The answer sheet has 9 business boundaries (H1–H9) and 6 non-functional ones (N1–N6). The non-functional answers are: peak load and server count (N1), a latency target (N2), no "try again later" while items remain (N3), at most 5 seconds of blocking when a server crashes (N4), return `TRY_AGAIN` when the store is unreachable (N5), and no stale or cached remaining count (N6). N1 and N2 are only recorded; the other four have hidden tests.

**The hidden tests.** Each server is a separate module instance of `src/flash.ts`, so servers cannot share memory. The test supplies the `Store` and decides which server's pending store call completes next. It can also freeze a server at its k-th call (a crash) or pause it and resume it later (a stall). There are 21 single-server tests, 5 concurrency tests over 60 to 200 schedules each (simultaneous grabs, oversell, per-customer limit, several schedulers at once, a payment racing the scheduler at the expiry instant), 2 fault tests (another server must sell within 5 seconds of a crash; a server that resumes after a 30-second stall must not oversell), and one property test over 300 mixed schedules that checks conservation, the limit and final states.

Before the runs, the tests were checked against five deliberately wrong implementations:

| Wrong implementation | Score | Failed on |
| :--- | ---: | :--- |
| Read, check, write without atomic operations | 22/29 | every concurrency test |
| Per-sale lock with a 10-second TTL | 24/29 | blocked longer than 5 seconds after a crash; oversold after a stall |
| Per-sale lock with a 3-second TTL | 25/29 | oversold after a stall (the lock expired, no fencing token) |
| Each server caches the remaining count | 26/29 | the remaining count is stale |
| Store errors are not caught | 28/29 | store unavailable |

Every condition ran with Claude Fable 5.1 (`-r1`) and Claude Haiku 5.5 (`-h1`), solo, with SpecEngine 2.1.0 and the same Spec Kit commit. One separate session answered all questions from the sheet.

| Condition | Fable | Haiku |
| :--- | ---: | ---: |
| No SDD tool | 26/29 | 22/29 |
| Spec Kit | 27/29 | 27/29 |
| SpecEngine | **28/29** | 25/29 |

| Condition | Fable | Haiku |
| :--- | :--- | :--- |
| No SDD tool | 73 min · 113k | 72 min · 136k |
| Spec Kit | 102 min · 330k | 82 min · 361k |
| SpecEngine | 93 min · 283k | 76 min · 296k |

All six ran at the same time and the baseline runs alone took over 70 minutes, against 2 to 4 minutes in T4, so the times mostly measure API contention and are not comparable with other tasks. Token counts are comparable.

Which non-functional boundaries were asked, and what the hidden tests found:

| Boundary | Asked by | Hidden test |
| :--- | :--- | :--- |
| N1 peak load | nobody | – |
| N2 latency | nobody | – |
| N3 no failure while items remain | Spec Kit Haiku, in the converge stage after implementing | 6/6 pass |
| N4 at most 5 s blocked after a crash | nobody | 6/6 pass |
| N5 store unreachable | nobody | **0/6 pass** |
| N6 remaining count not cached | nobody | 6/6 pass |

What it shows:

- **No tool raises non-functional requirements during clarification.** Across both tools and both models, every question asked before implementation was about business rules. The closest were consistency trade-offs under failure: SpecEngine Fable asked whether items lost to a crash between two store writes should be recovered or written off, and its flow review flagged a server that stalls past the sale's end. Spec Kit Haiku asked about load-related false rejections only after its implementation was done. Load, latency and blocking time were never asked.
- **The one boundary nobody asked about and nobody inferred failed everywhere.** No run catches store errors and returns `TRY_AGAIN`; all six throw. That is the clearest gap: what to do when a shared dependency is down is a question any business scenario has, and neither tool's discovery asks it.
- **No run used a distributed lock.** All six, including the baselines, decided with atomic counters (`incrBy`, then undo on overshoot) and `set nx` claims. That is why every run passed the crash and stall tests, and why those two tests did not separate the conditions. The lock pitfalls they target show up only in the wrong implementations above.
- **The concurrency failures were in code that had a matching rule and a green test.** SpecEngine Haiku's specification has "several schedulers release the same hold only once", with a scenario that runs two schedulers through `Promise.all`. Its in-memory store answers immediately, so the calls never interleave and the scenario passes. Under the hidden scheduler the same hold is released several times (T5-25). Spec Kit Haiku's own tests also missed a race until, after the N3 answer, it wrote a random-interleaving harness; that run then passed every concurrency test. Spec Kit Fable wrote 118 scenarios, including a crash at every store call, and still left one hold that a resent request kept in HELD after it expired and the scheduler ran (property test, seed 73). Gherkin examples describe one sequence of events; they cannot say "in every interleaving".
- **SpecEngine Haiku was below Spec Kit Haiku for the first time.** Besides the double release, it returned `INVALID_INPUT` instead of `SALE_NOT_FOUND` for an unknown sale. Its flow diagrams had no branch for an unknown sale; under the answering rules the stakeholder does not point out what is missing, and the agent did not ask.
- **The scores are close.** Every run lost the store-outage test. The rest of the spread is one to five tests, mostly failure codes, and each cell is one run.

The lock held for both SpecEngine projects: `spec-guard audit` passes and `tamper.mjs` reports LOCK_DRIFT for T5-C-r1 and T5-C-h1.

### What this means for the framework

The three experiments point at two concrete improvements, both still to be built:

1. **Make "every example follows from the matrix" a script check.** Store each rule's preconditions and postconditions as structured data instead of prose, so a script can verify or generate the example tables. This closes the creation-time gap at level 4.
2. **Add an assertion check for step bodies.** Fail the stage when a `Then` step contains no assertion, or run a mutation pass before locking. This closes the hollow-step gap at level 5.

## Validity

- **Role-played stakeholder.** In most runs the same agent that did the work also answered its own questions from the answer sheet, under an instruction not to read ahead. Three T3 runs broke that rule and read the whole sheet: B-r2, C-r1 and C-r2. They are void. B-r3 and C-r3 were rerun with the sheet moved out of reach, and the questions were answered by a separate session.
- **Model.** Most runs used Claude Fable 5.1. Runs that were resumed or started after a model switch used Claude Opus 5.5: T3-B-r1 and T3-B-r2 (partly), T3-C-r1 and T3-C-r2 (partly), T3-B-r3 and T3-C-r3 (fully).
- **Interruptions.** Runs were interrupted by API rate limits and one session restart. Each agent resumed from where it stopped, and the interruption times are recorded in its `BENCH-LOG.md`.
- **Test fix.** Two T3 tests (T3-35, T3-36) originally used coupons whose start date was after their end date. An agent reasonably rejected those as invalid coupons. The test data was corrected and every T3 run was rescored. The table above uses the corrected tests.
- **Haiku runs.** Each weak-model cell is a single run. The Haiku runs used SpecEngine 2.1.0, while the earlier runs used 2.0.0. Between the two, the stage instructions for spec-01 to spec-05 are unchanged and `spec-run` differs by one routing line; the 2.1.0 scripts add matrix hashing and line-ending normalisation to the lock. The fault-injection counts treat an edited example cell as "noticed" when any own test turns red, so cells that are inputs and do not change any outcome count as not noticed.
- **T4.** Every T4 cell is a single run. The team setting simulates parallel development without a shared specification: developers could not talk to each other, only to the stakeholder. Because one session answered every developer from one sheet, the teams never received conflicting answers; real teams can. One Fable SpecEngine developer (T4-C-tm-r1, order) was interrupted by a rate limit after its tests were green and finished about ten hours later; its time is counted up to the green run. Fable T4-B-r1 and T4-C-r1 were the slowest solo runs in part because they waited for answers while eight other agents were also waiting.
- **T5.** Every T5 cell is a single run. Two hidden tests were corrected after the first runs came in, and every run was rescored with the corrected file. The mixed-schedule test first required a hold that had expired but was not yet released to show HELD; the requirement does not say which status it shows, and one baseline showed EXPIRED. Three tests and the mixed-schedule test first opened sales whose per-customer limit was larger than the quantity; whether that is valid is not on the answer sheet, the stakeholder answered "your call", and SpecEngine Haiku chose to reject it. Servers are isolated by loading `src/flash.ts` once per server; helper modules it imports are shared, so module-level state in a helper would go unnoticed.
- **Sample size.** Each cell has one or two clean runs. A difference of one or two tests is not evidence of a difference between tools.
- **Recovery.** The run directories were restored from each run's git objects after the working copies were removed by an automatic temp-folder cleanup. Each run's `GIT-HISTORY.txt` lists its commits. Third-party files (Spec Kit's bundled skills and scripts) and `package-lock.json` are omitted. Local absolute paths in the logs were replaced with `<bench>`, `<plugin>` and `<home>`.

## Layout

```text
benchmark/
├── base/          starting project shared by all runs
├── tasks/         requirement and answer sheet per task; e4/change.md is the change request;
│                  t4/team-requirement.md and t4/team-src/ are the team version of T4
├── hidden/        hidden acceptance tests, one file per task
├── reference/     implementations written from the answer sheets
├── runs/          one folder per run: BENCH-LOG.md, src/, tests/, the tool's spec artifacts, GIT-HISTORY.txt;
│                  team runs (-tm-) hold one folder per developer plus the assembled src/
├── results/       raw output of inject.mjs and mutate.mjs
├── grade.mjs      scores runs against the hidden tests
├── assemble-team.mjs  combines the three developers' files of a T4 team run into one src/
├── tamper.mjs     tamper test for locked SpecEngine runs
├── inject.mjs     fault injection by layer
└── mutate.mjs     mutation testing of each run's own tests
```

Runs ending in `-h1` used Claude Haiku 5.5. Runs with `-tm-` in the name are T4 team runs. In T5, the tests of each run, the requirement and the hidden scheduler use the same `Store` interface, so a run's own `tests/support/` shows how it simulated concurrency.

Each run's `BENCH-LOG.md` holds its timestamps, every question and answer, the assumptions it made on its own, and the tool errors it hit.
