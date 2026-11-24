# Database Architecture Reference

Do not duplicate the database design here. Use:
- `../../07_database_design.md` for the design reference;
- `../../prisma/schema.prisma` for current ORM shape;
- `../../prisma/migrations/` for migration history.

## Safety rules
- Never edit an applied migration.
- Use forward-only migrations.
- Do not apply migrations to an unverified or production database.
- Current code may include compatibility handling for schema changes that have not yet been applied everywhere; preserve those guards.
- Operational data must not be mutated merely to make a test pass.

## Product realignment rule
Prefer solving clutter and workflow problems at the product/UI layer. Do not introduce schema changes unless a requirement truly needs new persistent data.
