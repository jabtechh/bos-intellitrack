# UX Principles for Realignment

These principles guide simplification. They do not replace `05_design_system.md` or `06_ui_ux_specification.md`.

1. **Role-first:** every page must answer a real responsibility of the signed-in role.
2. **Requirement-first:** UI elements should trace to a requirement or approved product decision.
3. **Action over decoration:** operational actions and current state come before charts, cards, and decorative summaries.
4. **One source of truth:** do not duplicate attendance, rendered hours, task state, or approval state across competing workflows.
5. **Progressive disclosure:** show the essential action/state first; move technical evidence and secondary context deeper.
6. **Least privilege:** do not expose controls merely because the backend can perform the action.
7. **Plain language:** use business terms users understand. Avoid invented verification jargon or AI-sounding labels.
8. **Mobile is a first-class flow:** critical intern workflows must be usable on a phone without desktop assumptions.
9. **AI is assistive and labeled:** AI-generated output must be grounded, identifiable, and never presented as authoritative when it is not.
10. **No dashboard-card quota:** a dashboard may be sparse. Add a card only when it changes what the user should do next.

## Realignment test
For every major UI block ask:
- Who needs this?
- Which requirement does it satisfy?
- What decision/action does it enable?
- Is the same information already shown elsewhere?
- Could it be removed or merged without violating a requirement?
