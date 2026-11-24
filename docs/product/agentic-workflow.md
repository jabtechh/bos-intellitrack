# Beginner Agentic Workflow

## Mental model
You define the goal and approve product decisions. The coding agent owns investigation, planning, implementation, and verification inside the approved boundaries.

## Default loop
```text
Goal
  -> Inspect
  -> Specify
  -> Clarify
  -> Plan
  -> Checklist
  -> Tasks
  -> Human approval
  -> Implement
  -> Verify
  -> Converge
```

## OpenCode workflow commands
The project includes repo-local OpenCode commands under `.opencode/commands/`:
- `/speckit.constitution`
- `/speckit.specify`
- `/speckit.clarify`
- `/speckit.plan`
- `/speckit.checklist`
- `/speckit.tasks`
- `/speckit.analyze`
- `/speckit.implement`
- `/speckit.converge`

Spec-writing commands select the custom `spec` agent automatically so they can update planning documents without touching application code. `/speckit.analyze` uses OpenCode's read-only `plan` agent. Implementation and convergence select `build` automatically. These commands follow the same beginner sequence as Spec Kit while preserving this existing project and its current uncommitted work.

## Human approval gates
Do not auto-continue from planning into implementation when the proposal:
- changes scope;
- changes role authority;
- removes required functionality;
- changes database schema;
- requires migration;
- changes external services;
- touches production/deployment;
- materially redesigns the application's information architecture.

## Starting point
Use `specs/001-intellitrack-realignment/`. The first objective is to understand and simplify the product before writing redesign code.
