import pg from "pg";

const runId = process.env.GATEA_RUN_ID?.trim();
const directUrl = process.env.DIRECT_URL?.trim();
const baseUrl = process.env.GATEA_BASE_URL?.trim();
if (process.env.GATEA_TARGET_ENV !== "test" ||
    process.env.GATEA_ENVIRONMENT_VERIFIED !== "1" ||
    runId !== "gatea-20261103-2318" ||
    !directUrl || !baseUrl ||
    new URL(directUrl).hostname !== "127.0.0.1" ||
    new URL(directUrl).port !== "54322" ||
    new URL(baseUrl).port !== "3100") {
  throw new Error("Refusing diagnostic outside verified isolated test environment.");
}
const client = new pg.Client({ connectionString: directUrl });
try {
  await client.connect();
  await client.query("BEGIN READ ONLY");
  const auth = await client.query(`
    SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE raw_app_meta_data->>'gatea_fixture'='true'
        AND raw_app_meta_data->>'gatea_run_id'=$1)::int AS tagged,
      COUNT(*) FILTER (WHERE raw_app_meta_data->>'gatea_fixture' IS NULL)::int AS without_fixture_marker,
      COUNT(*) FILTER (WHERE raw_app_meta_data->>'gatea_fixture'='true'
        AND raw_app_meta_data->>'gatea_run_id' IS DISTINCT FROM $1)::int AS different_run
    FROM auth.users
  `, [runId]);
  const users = await client.query(`
    SELECT role::text AS role, COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE bio=$1)::int AS tagged
    FROM public.users GROUP BY role ORDER BY role
  `, [`gatea_fixture=true; gatea_run_id=${runId}`]);
  const migration = await client.query(`
    SELECT migration_name, finished_at IS NOT NULL AS applied
    FROM public._prisma_migrations ORDER BY started_at
  `);
  const records = await client.query(`
    SELECT (SELECT COUNT(*)::int FROM evaluations) AS evaluations,
      (SELECT COUNT(*)::int FROM notifications) AS notifications,
      (SELECT COUNT(*)::int FROM work_logs) AS work_logs,
      (SELECT COUNT(*)::int FROM tasks) AS tasks,
      (SELECT COUNT(*)::int FROM internship_assignments) AS assignments
  `);
  console.log(JSON.stringify({
    auth: auth.rows[0], appRoles: users.rows, migrations: migration.rows,
    records: records.rows[0],
  }, null, 2));
  await client.query("ROLLBACK");
} finally {
  await client.end();
}
