# Role and Capability Matrix

This matrix is a working interpretation of `02_core_requirements.md` plus `docs/roles-and-required-hours.md`. It must not be used to invent authority that the sources do not grant.

| Capability | Intern | Company Supervisor | School Coordinator | Company Representative | System Administrator |
|---|---|---|---|---|---|
| Sign in / sign out | Own account | Own account | Own account | Own account | Technical account |
| Personal profile | Manage own | Own/basic | Own/basic | Own/basic | Technical |
| Attendance Time In/Out | Create own | No | No | No | Emergency/technical |
| Attendance history | Own | Assigned interns | School-scoped students | Company operations | Technical |
| Attendance correction | Request own | Review assigned intern requests | Monitor only | Operations visibility | Emergency/technical |
| Daily work logs | Create/submit own | Review assigned interns | Read school-scoped | Operations visibility | Technical |
| Tasks | View/update assigned | Assign/monitor assigned interns | No authority defined | No authority explicitly defined | Technical |
| Performance evaluation | View completed | Evaluate assigned interns | Monitor | Company operations visibility | Technical |
| Workmate feedback | Participate/view as requirements allow | Request/use as requirements allow | Monitor results where required | Operations visibility | Technical |
| Documents | Upload/manage own required docs | Authorized review where applicable | Authorized school view/review only if requirements support it | Authorized operations review | Technical |
| Announcements | View | View | School behavior requires clarification | Publish company announcements | Technical |
| Reports | Personal/progress views | Supervisor reports | School reports | Company reports | Technical |
| AI portfolio | View/export own | Source data / review only if required | Monitor only if required | Operations only if required | Technical |
| User/operations management | No | No | No | Company operations | Bootstrap/emergency |

## Important boundary
`02_core_requirements.md` defines four supported business roles. System Administrator is an internal implementation role, not a fifth thesis business role.

## Open questions
The current requirements leave some detailed permissions underspecified. Examples include exact document-review ownership, school-announcement authoring, and whether Company Representatives directly manage every operational object. These must be clarified rather than inferred from current UI.
