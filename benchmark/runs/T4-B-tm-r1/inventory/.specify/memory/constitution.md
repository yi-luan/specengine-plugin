<!--
Sync Impact Report
- Version change: (template, unversioned) → 1.0.0
- Modified principles: all five placeholders replaced with concrete principles
  - [PRINCIPLE_1_NAME] → I. Service Boundary (NON-NEGOTIABLE)
  - [PRINCIPLE_2_NAME] → II. Fixed Shared Contract
  - [PRINCIPLE_3_NAME] → III. Behaviour-Driven, Test-First
  - [PRINCIPLE_4_NAME] → IV. Event Robustness
  - [PRINCIPLE_5_NAME] → V. Simplicity and In-Memory Purity
- Added sections: Technology Stack and Layout; Development Workflow and Quality Gates
- Removed sections: none
- Follow-up TODOs: none
-->

# Inventory Service Constitution

## Core Principles

### I. Service Boundary (NON-NEGOTIABLE)

The inventory engineer MUST only modify `src/inventory.ts` and the inventory-owned tests under
`tests/`. The files `src/events.ts`, `src/shop.ts`, `src/order.ts` and `src/payment.ts` MUST NOT be
edited, and the inventory service MUST NOT import from or depend on `src/order.ts` or
`src/payment.ts`. The inventory service keeps only its own state; it MUST NOT read or call another
service's state. Rationale: three engineers develop in parallel and cannot see each other's code;
the integrator joins the files afterwards.

### II. Fixed Shared Contract

The inventory service MUST implement exactly the `InventoryService` interface and the
`createInventoryService(stock: Record<string, number>)` factory signature declared in
`src/events.ts`, without renaming or extending the public contract. Event types, field names and
status names are fixed. Every event the service emits MUST carry an `id` that is unique across the
whole system. Rationale: the shared contract is the only coupling point between the three services.

### III. Behaviour-Driven, Test-First

Every inventory behaviour MUST be expressed as a Gherkin scenario in `tests/features/` and
exercised by cucumber-js step definitions in `tests/steps/` before or alongside implementation.
Tests MUST construct the incoming events from other services themselves (the other services are
empty shells during development). `npm test` MUST run the inventory scenarios and MUST be green
before work is declared complete. Rationale: behaviour scenarios are the executable form of the
specification and the integrator's safety net.

### IV. Event Robustness

The event bus delivers every event at least once, possibly more than once, and in no guaranteed
order. The inventory service MUST therefore be idempotent per event (a redelivered event MUST NOT
change stock twice or emit duplicate events) and MUST handle events that arrive out of order
without corrupting stock. Events the service does not care about MUST return an empty array.
Rationale: correctness under duplicate and reordered delivery is a stated requirement, not an
optimisation.

### V. Simplicity and In-Memory Purity

The service MUST be pure in-memory TypeScript with no database, network, timers or I/O. Quantities
are integers. Prefer the simplest data structures that satisfy the scenarios; no speculative
abstractions. Rationale: the task is small and deterministic; complexity hides bugs.

## Technology Stack and Layout

- Language: TypeScript (strict), ESM (`"type": "module"`, NodeNext resolution), run via `tsx`.
- Tests: cucumber-js (`@cucumber/cucumber` 11.x), executed with `npm test`.
- Product code lives in `src/`; inventory code is `src/inventory.ts` only.
- Tests live in `tests/`: feature files in `tests/features/`, step definitions in
  `tests/steps/`, shared support in `tests/support/`.
- `npm run typecheck` (`tsc --noEmit`) SHOULD pass for inventory files.

## Development Workflow and Quality Gates

- Follow the Spec Kit sequence: constitution → specify → clarify → plan → tasks → implement →
  converge. A feature is complete only when converge reports Converged.
- Open questions about business behaviour MUST be raised to the requirement owner, never guessed
  silently; any assumption that is made MUST be recorded in the spec and in `BENCH-LOG.md`.
- Quality gate before completion: `npm test` green for all inventory scenarios, no edits outside
  the allowed files, no duplicate or missing events under duplicate/out-of-order delivery.

## Governance

This constitution supersedes other practices for the inventory service. Amendments require a
documented change in this file, a version bump following semantic versioning (MAJOR for principle
removals or redefinitions, MINOR for new principles or materially expanded guidance, PATCH for
wording fixes) and an updated Last Amended date. Every plan and implementation review MUST check
compliance with Principles I–V; any deviation MUST be justified in the plan's Complexity Tracking
section.

**Version**: 1.0.0 | **Ratified**: 2026-11-01 | **Last Amended**: 2026-11-01
