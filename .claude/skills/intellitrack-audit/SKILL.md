---
name: intellitrack-audit
description: Audits IntelliTrack project status against canonical requirements, approved decisions, active specifications, Git changes, and verification evidence. Use when asked what remains, what to do next, whether the project is complete, or to prepare a same-day completion plan.
---

# IntelliTrack project audit

Perform a read-only audit. Do not edit files or run commands that mutate application data.

1. Run `git status --short`, `git branch --show-current`, and `git log -1 --oneline`. Preserve all existing changes. Do not run clean, reset, stash, checkout, or restore.
2. Read `AGENTS.md`, `02_core_requirements.md`, approved decisions, the active spec's `spec.md`, `plan.md`, `tasks.md`, latest Gate C convergence report, latest 51-REQ traceability, and later continuation/acceptance notes.
3. Reconcile contradictions between stale status headers, task checkboxes, dated evidence, and current code. Prefer the latest dated evidence, but flag unresolved conflicts.
4. Classify each remaining item as:
   - release blocker;
   - acceptance gap requiring evidence;
   - code defect;
   - environment/device limitation;
   - optional polish / defer.
5. Prioritize by risk and dependency. For same-day completion, recommend the smallest safe path and explicitly identify what cannot honestly be completed today.
6. Do not infer that build success equals acceptance. Check authorization, data integrity, all affected roles, responsive behavior, and required user-device acceptance.
7. Produce a concise report: current state, confirmed completed work, blockers with evidence, recommended order, exact safe commands, and approval gates.
8. Do not begin implementation. Ask for approval of the proposed first task.
