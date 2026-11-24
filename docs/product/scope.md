# Product Scope Guardrails

## In scope because the approved requirements explicitly require it
- secure authentication and role-based access;
- intern profile and internship details;
- attendance with timestamps, GPS/geofence, selfie evidence, history, analytics, and correction handling;
- daily work logs and evidence attachments;
- supervisor task assignment and monitoring;
- performance evaluations and workmate feedback;
- AI-assisted portfolio generation;
- AI skill and productivity analysis;
- internship document management;
- company announcements and notifications;
- role-appropriate reports and statistics.

## Internal/technical support scope
These may exist to operate the system but should not become capstone business features without explicit approval:
- System Administrator bootstrap/recovery tools;
- technical system maintenance;
- database/storage setup utilities;
- test/demo/evaluation account tooling.

## Not automatically in scope
A feature is not in scope merely because it exists in code or sounds useful. Examples that require explicit traceability or approval:
- public registration;
- social/chat features;
- role switching for normal users;
- facial identity recognition or liveness verification;
- decorative analytics or fake operational metrics;
- duplicate approval systems;
- extra workflow states that do not support an approved requirement;
- broad multi-company/platform administration beyond the approved Bo's Coffee context.

## Deferred/future
Treat items explicitly labeled future in project documents as deferred unless promoted by a product decision. Do not implement them during realignment simply because a design document mentions them.

## Simplification policy
When several screens/cards/actions satisfy the same requirement, prefer the smallest understandable workflow that preserves the requirement.
