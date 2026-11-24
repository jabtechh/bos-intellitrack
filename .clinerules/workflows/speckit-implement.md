# /speckit-implement

1. Confirm the spec/plan/tasks have passed the human approval gate.
2. Read `AGENTS.md`, current Git status/diff, and the active task list.
3. Implement only approved tasks, in dependency order.
4. Preserve unrelated changes and compatibility guards.
5. After each meaningful slice, run focused verification.
6. Never apply migrations, deploy, push, or mutate production unless that exact action is explicitly approved.
7. Mark tasks complete only when acceptance criteria are actually met.
8. Finish by running the relevant broader tests/typecheck/build and summarize what changed.
