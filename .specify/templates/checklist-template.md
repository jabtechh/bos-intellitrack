# Quality Checklist

## Requirements
- [ ] Every material change maps to a requirement ID or approved decision.
- [ ] No required behavior was removed accidentally.
- [ ] Open ambiguities are explicit.

## Authorization
- [ ] Role scope remains least-privilege.
- [ ] Server-side authorization matches UI visibility.

## UX
- [ ] Primary workflow is obvious.
- [ ] Duplicate information/actions were removed or justified.
- [ ] Mobile and desktop behavior were checked.

## Safety
- [ ] No secret or credential was added.
- [ ] No production mutation occurred.
- [ ] No migration/deploy/push occurred without approval.

## Verification
- [ ] Relevant tests pass.
- [ ] Typecheck/build run as appropriate.
- [ ] Implementation has been compared back to the spec.
