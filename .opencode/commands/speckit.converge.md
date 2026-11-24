---
description: Compare implementation against the approved spec until aligned
agent: build
---
Treat the active spec and acceptance criteria as the target state.

Converge $ARGUMENTS by inspecting implementation and verification evidence. For each acceptance criterion, mark PASS, FAIL, or NOT VERIFIED with evidence. Re-check requirement traceability, role authorization, and mobile/desktop behavior when relevant.

Add remaining implementation gaps to tasks.md and fix only defects already inside approved scope. If a gap requires a new product decision, scope change, migration, or authority change, stop at the human approval gate. Declare CONVERGED only when required criteria pass or the human explicitly accepts documented exceptions.
