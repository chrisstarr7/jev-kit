---
name: java-jev
description: "Use Jev as a bounded, optional decision aid for Java backend work in repositories that contain docs/jev/README.md."
---

# Java Backend Jev Decision Layer

Use this skill only for development-time decisions in a Java backend repository. Read the repository's `docs/jev/README.md` and `docs/jev/questions/java-backend-mvp.json` before calling Jev.

## When to use

Use the generic MCP tool `jev_ask` for one of these bounded decisions when the repository has enough evidence but a finite classification can reduce repeated context switching:

* `file_relevance`
* `change_risk`
* `sql_risk`
* `npe_risk`
* `test_required`
* `review_gate`

Do not call Jev before reading the relevant code, call chain, configuration and tests. Send only the smallest redacted context needed for the selected question.

## How to use

1. Read the project Jev README and decision pack.
2. Build a compact input matching the selected decision's `input_fields`.
3. Remove credentials, tokens, cookies, PII, production records, full files and unnecessary literals.
4. Call `jev_ask` with the decision question and bounded choices/rubric from the decision pack.
5. Accept a result only when its answer matches the declared type and confidence is at least `0.75`.
6. Treat low confidence, timeout, missing key, unavailable MCP, malformed output or conflicting code evidence as fallback conditions.
7. Report the Jev result as advisory evidence, then let Codex make the final decision.

## Turn discipline

Borrow the router's useful turn boundary:

* Call Jev at most once for a fresh user turn.
* Do not call Jev again for tool-call continuation, title generation, system-only input or tool-only input.
* Reuse an accepted decision while the same task is continuing; do not let a tool result silently trigger a new route.
* Keep the sent context bounded and redacted. If the context cannot be safely reduced, use fallback.

Use `confidence >= 0.75` as the acceptance threshold. One bounded attempt is enough; do not retry indefinitely. The MCP integration is for Java-task decisions, not automatic Codex model switching. A separate local CLI proxy would be an opt-in integration with different operational and security trade-offs.

## Hard gates

SQL, API contracts, transactions, message queues, permissions, security and migrations always require Codex review. `review_gate=allow` never bypasses these gates. Jev must never generate Java code, approve a production change, suppress a test, or replace deep reasoning.

## Fallback

Jev is optional. If it cannot answer, continue with Codex's normal evidence-based workflow and say that fallback was used. Never retry indefinitely and never block implementation on Jev availability.
