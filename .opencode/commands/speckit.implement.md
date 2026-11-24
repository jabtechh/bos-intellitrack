---
description: Implement only the approved IntelliTrack tasks
agent: build
---
Confirm the active spec, plan, and tasks have passed the human approval gate.

Read AGENTS.md, current Git status/diff, and the approved task list. Implement $ARGUMENTS only within approved scope, in dependency order. Preserve unrelated changes and compatibility guards.

Run focused verification after meaningful slices. Never apply migrations, deploy, push, or mutate production unless that exact action is explicitly approved. Mark tasks complete only when acceptance criteria are actually met. Finish with relevant broader tests/typecheck/build and a concise report.
