import pg from "pg";

const { Client } = pg;
const runId = process.env.GATEA_RUN_ID?.trim();
const target = process.env.GATEA_TARGET_ENV?.trim();
const verified = process.env.GATEA_ENVIRONMENT_VERIFIED?.trim();
const databaseUrl = process.env.DIRECT_URL?.trim();

if (target !== "test" || verified !== "1" || !runId || !databaseUrl) {
  throw new Error("Gate A fixture verification requires a verified test-only .env.gatea.local environment.");
}
if (new URL(databaseUrl).hostname !== "127.0.0.1") throw new Error("Gate A fixture verification is local-only.");

const marker = `gatea_fixture=true; gatea_run_id=${runId}`;
const db = new Client({ connectionString: databaseUrl });

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

try {
  await db.connect();

  const users = await db.query(`
    select role::text, count(*)::int as count
    from users
    where bio = $1
    group by role
    order by role
  `, [marker]);
  const distribution = Object.fromEntries(users.rows.map(row => [row.role, row.count]));
  assert(users.rows.reduce((sum, row) => sum + row.count, 0) === 8, "Expected exactly 8 Gate A application users.");
  assert(distribution.INTERN === 2 && distribution.SUPERVISOR === 2 && distribution.COORDINATOR === 1 && distribution.REPRESENTATIVE === 2 && distribution.ADMIN === 1, "Role distribution mismatch.");

  const auth = await db.query(`
    select count(*)::int as total,
      count(*) filter (where raw_app_meta_data->>'gatea_fixture'='true' and raw_app_meta_data->>'gatea_run_id'=$1)::int as tagged
    from auth.users
  `, [runId]);
  // Default remains strict. Gate C may explicitly inspect the protected tagged
  // E6 baseline when separate, untagged test users also exist in this local DB.
  const allowUntaggedExtras = process.env.GATEA_VERIFY_TAGGED_ONLY === "1";
  assert(
    auth.rows[0].tagged === 8 && (allowUntaggedExtras || auth.rows[0].total === 8),
    "Expected exactly 8 tagged Gate A Auth users" +
      (allowUntaggedExtras ? " (untagged extras permitted)." : " and no extra Auth users."),
  );
  if (allowUntaggedExtras && auth.rows[0].total !== 8) {
    console.log(`Gate A verifier: ${auth.rows[0].total - 8} untagged Auth account(s) excluded from tagged E6 invariants.`);
  }

  const orgs = await db.query(`
    select
      (select count(*)::int from companies where address_line=$1) as companies,
      (select count(*)::int from schools where address_line=$1) as schools
  `, [marker]);
  assert(orgs.rows[0].companies === 2 && orgs.rows[0].schools === 1, "Organization fixture counts mismatch.");
  const companyCodes = await db.query(`
    select name, company_code
    from companies
    where address_line=$1
    order by name
  `, [marker]);
  const codeByName = Object.fromEntries(companyCodes.rows.map(row => [row.name, row.company_code]));
  const stamp = runId.replace(/^gatea-/, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  assert(codeByName["GateA Company A"] === "BO_MAIN_OFFICE", "GateA Company A must use BO_MAIN_OFFICE.");
  assert(codeByName["GateA Company B"] === `GATEA-CO-B-${stamp}`, "GateA Company B code mismatch.");

  const relationships = await db.query(`
    select
      (select count(*)::int from representative_profiles rp join users u on u.id=rp.user_id join companies c on c.id=rp.company_id where u.bio=$1 and c.name='GateA Company A') as rep_a,
      (select count(*)::int from representative_profiles rp join users u on u.id=rp.user_id join companies c on c.id=rp.company_id where u.bio=$1 and c.name='GateA Company B') as rep_b,
      (select count(*)::int from supervisor_profiles sp join users u on u.id=sp.user_id join companies c on c.id=sp.company_id where u.bio=$1 and c.name='GateA Company A') as sup_a,
      (select count(*)::int from supervisor_profiles sp join users u on u.id=sp.user_id join companies c on c.id=sp.company_id where u.bio=$1 and c.name='GateA Company B') as sup_b,
      (select count(*)::int from intern_profiles ip join users u on u.id=ip.user_id join schools s on s.id=ip.school_id where u.bio=$1 and s.name='GateA Partner School A') as interns_school_a,
      (select count(*)::int from coordinator_profiles cp join users u on u.id=cp.user_id join schools s on s.id=cp.school_id where u.bio=$1 and s.name='GateA Partner School A') as coordinator_school_a
  `, [marker]);
  const rel = relationships.rows[0];
  assert(rel.rep_a === 1 && rel.rep_b === 1 && rel.sup_a === 1 && rel.sup_b === 1 && rel.interns_school_a === 2 && rel.coordinator_school_a === 1, "Company/School relationship verification failed.");

  const assignments = await db.query(`
    select c.name as company, ia.status::text as status, count(*)::int as count
    from internship_assignments ia
    join companies c on c.id=ia.company_id
    where ia.notes like $1
    group by c.name, ia.status
    order by c.name, ia.status
  `, [`${marker}%`]);
  const assignmentMap = new Map(assignments.rows.map(row => [`${row.company}:${row.status}`, row.count]));
  // Accepted E6 terminal lifecycle end state: the primary ACTIVE fixture and the
  // pending-activation fixtures were completed/cancelled/terminated by the
  // approved E6 lifecycle run. Company B remains the active isolation fixture.
  assert(assignmentMap.get("GateA Company A:ACTIVE") === undefined, "Company A must have no ACTIVE assignment after the accepted E6 lifecycle run.");
  assert(assignmentMap.get("GateA Company A:PENDING") === undefined, "Company A must have no PENDING assignment after the accepted E6 lifecycle run.");
  assert(assignmentMap.get("GateA Company A:COMPLETED") === 2, "Company A must have two COMPLETED assignments after the accepted E6 lifecycle run.");
  assert(assignmentMap.get("GateA Company A:CANCELLED") === 1, "Company A must have one CANCELLED assignment after the accepted E6 lifecycle run.");
  assert(assignmentMap.get("GateA Company A:TERMINATED") === 1, "Company A must have one TERMINATED assignment after the accepted E6 lifecycle run.");
  assert(assignmentMap.get("GateA Company B:ACTIVE") === 1, "Company B must have one ACTIVE isolation assignment.");

  const credited = await db.query(`
    select coalesce(sum(a.credited_minutes),0)::int as minutes
    from attendance a
    join internship_assignments ia on ia.id=a.assignment_id
    where ia.notes like $1 and a.status='APPROVED'
  `, [`${marker}%; purpose=t105-primary-active%`]);
  assert(credited.rows[0].minutes === 1350, "Expected 1350 approved Attendance credited minutes.");

  const ann = await db.query(`
    select id, status, published_at
    from announcements
    where title=$1
  `, [`GateA ANN-3 ${runId}`]);
  assert(ann.rows.length === 1, "Expected exactly one dedicated ANN-3 announcement.");
  assert(ann.rows[0].status === "PUBLISHED" && ann.rows[0].published_at !== null, "ANN-3 announcement must remain in the accepted published E6 end state.");

  const annNotifications = await db.query(`
    select count(*)::int as total, count(distinct n.recipient_id)::int as recipients,
      count(*) filter (where u.role = 'INTERN')::int as interns,
      count(*) filter (where u.role = 'SUPERVISOR')::int as supervisors,
      count(*) filter (where u.role = 'REPRESENTATIVE')::int as representatives
    from notifications n
    join users u on u.id = n.recipient_id
    where n.dedupe_key = $1
  `, [`announcement:${ann.rows[0].id}:published`]);
  assert(
    annNotifications.rows[0].total === 3
      && annNotifications.rows[0].recipients === 3
      && annNotifications.rows[0].interns === 1
      && annNotifications.rows[0].supervisors === 1
      && annNotifications.rows[0].representatives === 1,
    "ANN-3 publication must keep the accepted COMPANY audience delivery state.",
  );

  const safety = await db.query(`
    select
      (select count(*)::int from notifications) as notifications,
      to_regclass('public.branches') as branches,
      exists(select 1 from _prisma_migrations where migration_name='20260913090000_restore_branches' and finished_at is not null) as branch_migration_applied
  `);
  assert(safety.rows[0].notifications === 3, "Notifications must match the accepted post-E6 ANN-3 delivery state.");
  assert(safety.rows[0].branches === null && safety.rows[0].branch_migration_applied === false, "Branch schema/migration must remain absent.");

  const ui = await db.query(`
    select
      (select count(*)::int from work_logs) as work_logs,
      (select count(*)::int from tasks) as tasks,
      (select count(*)::int from evaluations) as evaluations,
      (select count(*)::int from feedback) as feedback,
      (select count(*)::int from documents) as documents,
      (select count(*)::int from portfolios) as portfolios,
      (select count(*)::int from announcements where status='PUBLISHED') as published_announcements
  `);
  console.log("Gate A fixture verification: PASS");
  console.log(`auth_accounts=${auth.rows[0].total}`);
  console.log("application_users=8");
  console.log("roles=INTERN:2,SUPERVISOR:2,COORDINATOR:1,REPRESENTATIVE:2,ADMIN:1");
  console.log("companies=2");
  console.log("schools=1");
  console.log("assignments=CompanyA COMPLETED:2 CANCELLED:1 TERMINATED:1; CompanyB ACTIVE:1");
  console.log(`approved_attendance_credited_minutes=${credited.rows[0].minutes}`);
  console.log(`ann3_published=${ann.rows[0].status === "PUBLISHED" ? 1 : 0}`);
  console.log(`ann3_notifications=${annNotifications.rows[0].total}`);
  console.log(`notifications=${safety.rows[0].notifications}`);
  console.log(`ui_records=work_logs:${ui.rows[0].work_logs},tasks:${ui.rows[0].tasks},evaluations:${ui.rows[0].evaluations},feedback:${ui.rows[0].feedback},documents:${ui.rows[0].documents},portfolios:${ui.rows[0].portfolios},published_announcements:${ui.rows[0].published_announcements}`);
  console.log("branches=absent");
} catch (error) {
  console.error("Gate A fixture verification: FAIL");
  console.error(error instanceof Error ? error.message : "Unknown fixture verification error.");
  process.exitCode = 1;
} finally {
  await db.end().catch(() => undefined);
}
