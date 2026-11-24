# /speckit-converge

1. Treat the active spec and acceptance criteria as the target state.
2. Inspect the implementation and verification evidence.
3. For every acceptance criterion, mark PASS, FAIL, or NOT VERIFIED with evidence.
4. Re-check requirement traceability and role authorization.
5. Re-check mobile/desktop behavior for UI changes.
6. Add remaining gaps back to `tasks.md`.
7. If gaps are implementation defects inside approved scope, fix them and re-verify.
8. If a gap requires a new product decision, scope change, migration, or authority change, stop at the human approval gate.
9. Declare CONVERGED only when all required criteria pass or the human explicitly accepts documented exceptions.
