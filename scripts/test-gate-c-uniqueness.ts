import { randomUUID } from "node:crypto";
import pg from "pg";

const runId = process.env.GATEA_RUN_ID?.trim();
const url = process.env.DIRECT_URL?.trim();
if (process.env.GATEA_TARGET_ENV !== "test" ||
    process.env.GATEA_ENVIRONMENT_VERIFIED !== "1" ||
    runId !== "gatea-20261103-2318" ||
    !url || new URL(url).hostname !== "127.0.0.1" ||
    new URL(url).port !== "54322" ||
    new URL(process.env.GATEA_BASE_URL ?? "").port !== "3100") {
  throw new Error("Refusing non-isolated Gate C integration test");
}
const c = new pg.Client({ connectionString: url });
const id = randomUUID();
const secondId = randomUUID();
const key = `gatec-synthetic-${id}`;
let began = false;
let verified = false;
try {
  await c.connect();
  await c.query("BEGIN");
  began = true;
  const anchor = await c.query(`
    SELECT a.id, a.intern_profile_id, a.company_id, a.supervisor_profile_id,
      a.coordinator_profile_id, s.user_id AS evaluator_id
    FROM internship_assignments a
    JOIN supervisor_profiles s ON s.id=a.supervisor_profile_id
    JOIN users u ON u.id=s.user_id
    WHERE u.bio=$1 LIMIT 1
  `, [`gatea_fixture=true; gatea_run_id=${runId}`]);
  if (anchor.rowCount !== 1) throw new Error("Tagged reference roles unavailable");
  const r = anchor.rows[0];
  for (const [assignmentId, ordinal] of [[id, 1], [secondId, 2]] as const) {
    await c.query(`
      INSERT INTO internship_assignments
        (id, intern_profile_id, company_id, supervisor_profile_id,
        coordinator_profile_id, assignment_code, start_date, end_date, status, notes)
      VALUES ($1,$2,$3,$4,$5,$6,'2026-09-28','2026-12-13','COMPLETED',$7)
    `, [assignmentId,r.intern_profile_id,r.company_id,r.supervisor_profile_id,
      r.coordinator_profile_id,`${key}-${ordinal}`,key]);
  }
  const insert = async (assignmentId: string, type: string, periodKey: string) => {
    await c.query(`
      INSERT INTO evaluations (id,assignment_id,evaluator_id,evaluation_type,
        period_key,evaluation_date,period_start,period_end)
      VALUES ($1,$2,$3,$4,$5,'2026-10-14','2026-10-12','2026-10-18')
    `, [randomUUID(), assignmentId, r.evaluator_id, type, periodKey]);
  };
  await insert(id, "PROGRESS", "2026-10-12");
  await insert(id, "PROGRESS", "2026-10-19");
  await insert(secondId, "PROGRESS", "2026-10-12");
  const mustConflict = async (label: string, fn: () => Promise<void>) => {
    await c.query("SAVEPOINT expected_conflict");
    let rejected = false;
    try { await fn(); } catch (error) {
      rejected = (error as { code?: string }).code === "23505";
    }
    await c.query("ROLLBACK TO SAVEPOINT expected_conflict");
    await c.query("RELEASE SAVEPOINT expected_conflict");
    if (!rejected) throw new Error(`Expected database uniqueness conflict: ${label}`);
  };
  await mustConflict("same-week PROGRESS", () => insert(id, "PROGRESS", "2026-10-12"));
  for (const type of ["INITIAL", "MIDTERM", "FINAL"]) {
    await insert(id, type, "SINGLE");
    await mustConflict(`one-off ${type}`, () => insert(id, type, "SINGLE"));
  }
  await c.query("SAVEPOINT invalid_period");
  let invalidRejected = false;
  try { await insert(id, "PROGRESS", "2026-10-13"); } catch (error) {
    invalidRejected = (error as { code?: string }).code === "23514";
  }
  await c.query("ROLLBACK TO SAVEPOINT invalid_period");
  await c.query("RELEASE SAVEPOINT invalid_period");
  if (!invalidRejected) throw new Error("Non-Monday PROGRESS key must fail check constraint");
  verified = true;
  console.log("T134/T148: PASS — different week, separate assignment, same-week duplicate, three one-offs, non-Monday check");
} finally {
  if (began) await c.query("ROLLBACK");
  const remaining = await c.query(
    "SELECT (SELECT COUNT(*)::int FROM internship_assignments WHERE notes=$1) AS assignments, (SELECT COUNT(*)::int FROM evaluations WHERE assignment_id IN ($2,$3)) AS evaluations",
    [key,id,secondId],
  );
  if (remaining.rows[0].assignments !== 0 || remaining.rows[0].evaluations !== 0) {
    throw new Error("Synthetic transaction left records behind");
  }
  await c.end();
  if (verified) console.log("Synthetic fixture rollback verified; no rows persisted");
}
