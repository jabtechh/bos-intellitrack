import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const { Client } = pg;

const runId = process.env.GATEA_RUN_ID?.trim();
const target = process.env.GATEA_TARGET_ENV?.trim();
const verified = process.env.GATEA_ENVIRONMENT_VERIFIED?.trim();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
const databaseUrl = process.env.DIRECT_URL?.trim();

if (target !== "test" || verified !== "1" || !runId || !supabaseUrl || !secretKey || !databaseUrl) {
  throw new Error("Gate A fixture setup requires a verified test-only .env.gatea.local environment.");
}
if (new URL(supabaseUrl).hostname !== "127.0.0.1" || new URL(databaseUrl).hostname !== "127.0.0.1") {
  throw new Error("Gate A fixture setup is restricted to the verified local Supabase/PostgreSQL target.");
}

const credentialPath = ".gatea/gatea-credentials.local.json";
const marker = `gatea_fixture=true; gatea_run_id=${runId}`;
const stamp = runId.replace(/^gatea-/, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase();

const accounts = [
  { key: "intern", email: `gatea.intern.a.${stamp}@example.test`, role: "INTERN", firstName: "GateA", lastName: "Intern A" },
  { key: "supervisor", email: `gatea.supervisor.a.${stamp}@example.test`, role: "SUPERVISOR", firstName: "GateA", lastName: "Supervisor A" },
  { key: "coordinator", email: `gatea.coordinator.a.${stamp}@example.test`, role: "COORDINATOR", firstName: "GateA", lastName: "Coordinator A" },
  { key: "representative", email: `gatea.representative.a.${stamp}@example.test`, role: "REPRESENTATIVE", firstName: "GateA", lastName: "Representative A" },
  { key: "admin", email: `gatea.admin.${stamp}@example.test`, role: "ADMIN", firstName: "GateA", lastName: "Administrator" },
  { key: "representativeB", email: `gatea.representative.b.${stamp}@example.test`, role: "REPRESENTATIVE", firstName: "GateA", lastName: "Representative B" },
  { key: "supervisorB", email: `gatea.supervisor.b.${stamp}@example.test`, role: "SUPERVISOR", firstName: "GateA", lastName: "Supervisor B" },
  { key: "internB", email: `gatea.intern.b.${stamp}@example.test`, role: "INTERN", firstName: "GateA", lastName: "Intern B" },
] as const;

type AccountKey = (typeof accounts)[number]["key"];
type CreatedAccount = (typeof accounts)[number] & { authId: string; appUserId: string; password: string };

function password() {
  return `Ga!${randomBytes(18).toString("base64url")}`;
}

const db = new Client({ connectionString: databaseUrl });
const supabase = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});
const createdAuthIds: string[] = [];
let credentialsWritten = false;

async function cleanupAuth() {
  for (const authId of createdAuthIds.reverse()) {
    await supabase.auth.admin.deleteUser(authId).catch(() => undefined);
  }
}

try {
  await db.connect();
  const pre = await db.query(`
    select
      to_regclass('public.branches') as branches,
      (select count(*)::int from public.users) as app_users,
      (select count(*)::int from auth.users) as auth_users,
      exists(select 1 from _prisma_migrations where migration_name='20260913090000_restore_branches' and finished_at is not null) as branch_migration_applied
  `);
  if (pre.rows[0].branches || pre.rows[0].branch_migration_applied) throw new Error("Branch schema/migration must remain absent.");
  if (pre.rows[0].app_users !== 0 || pre.rows[0].auth_users !== 0) {
    throw new Error("Gate A fixture setup requires an empty disposable user/Auth target.");
  }

  const created = new Map<AccountKey, CreatedAccount>();
  for (const account of accounts) {
    const generatedPassword = password();
    const { data, error } = await supabase.auth.admin.createUser({
      email: account.email,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: {
        first_name: account.firstName,
        last_name: account.lastName,
        gatea_fixture: true,
        gatea_run_id: runId,
      },
      app_metadata: {
        role: account.role,
        gatea_fixture: true,
        gatea_run_id: runId,
      },
    });
    if (error || !data.user) throw new Error(`Unable to create Gate A Auth user for ${account.key}: ${error?.message ?? "unknown error"}`);
    createdAuthIds.push(data.user.id);
    created.set(account.key, { ...account, authId: data.user.id, appUserId: randomUUID(), password: generatedPassword });
  }

  mkdirSync(".gatea", { recursive: true });
  const manifest = {
    gateaRunId: runId,
    target: "local-test",
    accounts: Object.fromEntries([...created.entries()].map(([key, value]) => [key, {
      email: value.email,
      password: value.password,
      role: value.role,
      authId: value.authId,
      appUserId: value.appUserId,
    }])),
  };
  writeFileSync(credentialPath, JSON.stringify(manifest, null, 2), { encoding: "utf8", mode: 0o600 });
  credentialsWritten = true;

  const ids = {
    schoolA: randomUUID(),
    companyA: randomUUID(),
    companyB: randomUUID(),
    internProfileA: randomUUID(),
    internProfileB: randomUUID(),
    supervisorProfileA: randomUUID(),
    supervisorProfileB: randomUUID(),
    coordinatorProfileA: randomUUID(),
    representativeProfileA: randomUUID(),
    representativeProfileB: randomUUID(),
    adminProfile: randomUUID(),
    assignmentActiveA: randomUUID(),
    assignmentPendingCancelA: randomUUID(),
    assignmentPendingCompletionA: randomUUID(),
    assignmentPendingTerminationA: randomUUID(),
    assignmentActiveB: randomUUID(),
  };

  const a = (key: AccountKey) => {
    const account = created.get(key);
    if (!account) throw new Error(`Missing account ${key}`);
    return account;
  };

  await db.query("BEGIN");

  await db.query(`
    insert into schools (id, school_code, name, address_line, city, province, contact_email, is_active)
    values ($1,$2,$3,$4,$5,$6,$7,true)
  `, [ids.schoolA, `GATEA-SCHOOL-${stamp}`, "GateA Partner School A", marker, "Makati City", "Metro Manila", `school.${stamp}@example.test`]);

  await db.query(`
    insert into companies (id, company_code, name, branch_name, address_line, city, province, latitude, longitude, geofence_radius_meters, timezone, is_active)
    values
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,100,'Asia/Manila',true),
      ($10,$11,$12,$13,$14,$15,$16,$17,$18,100,'Asia/Manila',true)
  `, [
    ids.companyA, "BO_MAIN_OFFICE", "GateA Company A", "GateA Main Office A", marker, "Makati City", "Metro Manila", 14.5547, 121.0244,
    ids.companyB, `GATEA-CO-B-${stamp}`, "GateA Company B", "GateA Main Office B", marker, "Taguig City", "Metro Manila", 14.5176, 121.0509,
  ]);

  for (const account of created.values()) {
    await db.query(`
      insert into users (id, auth_id, email, role, first_name, last_name, bio, is_active)
      values ($1,$2,$3,$4,$5,$6,$7,true)
    `, [account.appUserId, account.authId, account.email.toLowerCase(), account.role, account.firstName, account.lastName, marker]);
  }

  await db.query(`
    insert into intern_profiles (id,user_id,school_id,student_number,course,year_level,section,address,emergency_contact_name,emergency_contact_number,emergency_contact_relationship)
    values
      ($1,$2,$3,$4,'BS Information Technology','4','A',$5,'GateA Emergency A','09170000001','Parent'),
      ($6,$7,$3,$8,'BS Information Technology','4','B',$5,'GateA Emergency B','09170000002','Parent')
  `, [ids.internProfileA, a("intern").appUserId, ids.schoolA, `GATEA-INT-A-${stamp}`, marker, ids.internProfileB, a("internB").appUserId, `GATEA-INT-B-${stamp}`]);

  await db.query(`
    insert into supervisor_profiles (id,user_id,company_id,employee_number,position,department,office_location)
    values
      ($1,$2,$3,$4,'Company Supervisor','Operations',$5),
      ($6,$7,$8,$9,'Company Supervisor','Operations',$5)
  `, [ids.supervisorProfileA, a("supervisor").appUserId, ids.companyA, `GATEA-SUP-A-${stamp}`, marker, ids.supervisorProfileB, a("supervisorB").appUserId, ids.companyB, `GATEA-SUP-B-${stamp}`]);

  await db.query(`
    insert into coordinator_profiles (id,user_id,school_id,employee_number,position,department,office)
    values ($1,$2,$3,$4,'School Coordinator','Internship Office',$5)
  `, [ids.coordinatorProfileA, a("coordinator").appUserId, ids.schoolA, `GATEA-COORD-A-${stamp}`, marker]);

  await db.query(`
    insert into representative_profiles (id,user_id,company_id,employee_number,position,department)
    values
      ($1,$2,$3,$4,'Company Representative','People Operations'),
      ($5,$6,$7,$8,'Company Representative','People Operations')
  `, [ids.representativeProfileA, a("representative").appUserId, ids.companyA, `GATEA-REP-A-${stamp}`, ids.representativeProfileB, a("representativeB").appUserId, ids.companyB, `GATEA-REP-B-${stamp}`]);

  await db.query(`
    insert into admin_profiles (id,user_id,access_level,designation,notes)
    values ($1,$2,'STANDARD','Technical System Administrator',$3)
  `, [ids.adminProfile, a("admin").appUserId, marker]);

  const assignmentSql = `
    insert into internship_assignments
      (id,intern_profile_id,company_id,supervisor_profile_id,coordinator_profile_id,assignment_code,position_title,department,start_date,end_date,required_hours,required_hours_confirmed_at,required_hours_updated_by_id,required_hours_update_reason,rendered_hours,schedule_start_time,schedule_end_time,grace_period_minutes,status,notes,activated_at,created_by_id)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,500,now(),$11,$12,$13,'08:00','17:00',10,$14,$15,$16,$11)
  `;

  await db.query(assignmentSql, [
    ids.assignmentActiveA, ids.internProfileA, ids.companyA, ids.supervisorProfileA, ids.coordinatorProfileA,
    `GATEA-ACTIVE-A-${stamp}`, "Software Engineering Intern", "Technology", "2026-10-01", "2026-12-15",
    a("representative").appUserId, marker, 999, "ACTIVE", `${marker}; purpose=t105-primary-active`, new Date("2026-10-01T00:00:00+08:00"),
  ]);
  await db.query(assignmentSql, [
    ids.assignmentPendingCancelA, ids.internProfileA, ids.companyA, ids.supervisorProfileA, ids.coordinatorProfileA,
    `GATEA-PENDING-CANCEL-${stamp}`, "Operations Intern", "Operations", "2027-01-10", "2027-03-10",
    a("representative").appUserId, marker, 0, "PENDING", `${marker}; purpose=e6-activate-cancel`, null,
  ]);
  await db.query(assignmentSql, [
    ids.assignmentPendingCompletionA, ids.internProfileA, ids.companyA, ids.supervisorProfileA, ids.coordinatorProfileA,
    `GATEA-PENDING-COMPLETE-${stamp}`, "QA Intern", "Technology", "2027-03-15", "2027-05-15",
    a("representative").appUserId, marker, 0, "PENDING", `${marker}; purpose=e6-activate-complete`, null,
  ]);
  await db.query(assignmentSql, [
    ids.assignmentPendingTerminationA, ids.internProfileA, ids.companyA, ids.supervisorProfileA, ids.coordinatorProfileA,
    `GATEA-PENDING-TERMINATE-${stamp}`, "Support Intern", "Technology", "2027-05-20", "2027-07-20",
    a("representative").appUserId, marker, 0, "PENDING", `${marker}; purpose=e6-activate-terminate`, null,
  ]);
  await db.query(assignmentSql, [
    ids.assignmentActiveB, ids.internProfileB, ids.companyB, ids.supervisorProfileB, ids.coordinatorProfileA,
    `GATEA-ACTIVE-B-${stamp}`, "Business Operations Intern", "Operations", "2026-10-15", "2026-12-20",
    a("representativeB").appUserId, marker, 0, "ACTIVE", `${marker}; purpose=cross-company-isolation`, new Date("2026-10-15T00:00:00+08:00"),
  ]);

  const attendanceRows = [
    ["2026-10-29", 480],
    ["2026-10-30", 450],
    ["2026-11-02", 420],
  ] as const;
  for (const [date, minutes] of attendanceRows) {
    await db.query(`
      insert into attendance
        (id,assignment_id,attendance_date,clock_in,clock_out,worked_minutes,credited_minutes,classification,status,review_required,reviewed_by_id,reviewed_at,review_remarks,intern_remarks)
      values ($1,$2,$3,$4,$5,$6,$6,'ON_TIME','APPROVED',false,$7,now(),$8,$8)
    `, [
      randomUUID(), ids.assignmentActiveA, date,
      `${date}T08:00:00+08:00`, new Date(new Date(`${date}T08:00:00+08:00`).getTime() + minutes * 60_000),
      minutes, a("supervisor").appUserId, marker,
    ]);
  }

  await db.query(`
    insert into work_logs (id,assignment_id,work_date,title,description,skills_applied,learnings,status,submitted_at,reviewed_by_id,reviewed_at,review_remarks,approved_at)
    values
      ($1,$2,'2026-10-30','GateA API integration','Integrated a test API endpoint and documented validation results.',$3,'Improved API validation and debugging discipline.','APPROVED','2026-10-30T17:00:00+08:00',$4,'2026-10-31T09:00:00+08:00',$5,'2026-10-31T09:00:00+08:00'),
      ($6,$2,'2026-11-02','GateA responsive review','Reviewed responsive screens and recorded layout findings.',$7,'Improved responsive UI review workflow.','SUBMITTED','2026-11-02T17:00:00+08:00',null,null,null,null)
  `, [randomUUID(), ids.assignmentActiveA, JSON.stringify(["API integration","Testing"]), a("supervisor").appUserId, marker, randomUUID(), JSON.stringify(["Responsive design","QA"])]);

  const taskTodo = randomUUID();
  const taskSubmitted = randomUUID();
  await db.query(`
    insert into tasks (id,assignment_id,assigned_by_id,title,description,priority,status,start_at,due_at,progress_percentage,submitted_at,completion_notes)
    values
      ($1,$2,$3,'GateA prepare weekly summary',$4,'MEDIUM','TODO','2026-11-03T09:00:00+08:00','2026-11-06T17:00:00+08:00',0,null,null),
      ($5,$2,$3,'GateA responsive audit',$4,'HIGH','SUBMITTED','2026-10-30T09:00:00+08:00','2026-11-03T17:00:00+08:00',100,'2026-11-03T15:00:00+08:00','Submitted for supervisor review.')
  `, [taskTodo, ids.assignmentActiveA, a("supervisor").appUserId, marker, taskSubmitted]);

  await db.query(`
    insert into evaluations (id,assignment_id,evaluator_id,evaluation_type,evaluation_date,period_start,period_end,criteria_scores,overall_score,strengths,areas_for_improvement,comments,status,submitted_at)
    values
      ($1,$2,$3,'PROGRESS','2026-10-31','2026-10-01','2026-10-31',$4,87,'Reliable delivery and communication.','Continue improving estimation.',$5,'SUBMITTED','2026-10-31T16:00:00+08:00'),
      ($6,$2,$3,'FINAL','2026-12-10','2026-10-01','2026-12-10',$7,null,null,null,$5,'DRAFT',null)
  `, [randomUUID(), ids.assignmentActiveA, a("supervisor").appUserId, JSON.stringify([{ criterion: "Delivery", score: 88 }, { criterion: "Communication", score: 86 }]), marker, randomUUID(), JSON.stringify([])]);

  await db.query(`
    insert into feedback (id,assignment_id,author_id,recipient_id,feedback_type,title,content,visibility,is_read,related_task_id)
    values ($1,$2,$3,$4,'PRAISE','GateA progress feedback','Strong follow-through on the responsive audit.','INTERN_AND_STAFF',false,$5)
  `, [randomUUID(), ids.assignmentActiveA, a("supervisor").appUserId, a("intern").appUserId, taskSubmitted]);

  await db.query(`
    insert into documents (id,assignment_id,uploaded_by_id,file_name,original_file_name,storage_bucket,storage_path,mime_type,file_extension,file_size_bytes,category,description,status,is_portfolio_eligible,reviewed_by_id,reviewed_at,review_remarks)
    values ($1,$2,$3,'gatea-work-sample.pdf','gatea-work-sample.pdf','internship-documents',$4,'application/pdf','pdf',2048,'WORK_SAMPLE',$5,'APPROVED',true,$6,now(),$5)
  `, [randomUUID(), ids.assignmentActiveA, a("intern").appUserId, `gatea/${runId}/gatea-work-sample.pdf`, marker, a("supervisor").appUserId]);

  await db.query(`
    insert into portfolios (id,assignment_id,title,professional_summary,skills,achievements,selected_work,evaluation_summary,reflection,source_snapshot,ai_generated,last_generated_by_id,status)
    values ($1,$2,'GateA Internship Portfolio','Test-only portfolio built from verified Gate A fixtures.',$3,$4,$5,'Progress evaluation evidence is available.','Gate A reflection fixture.',$6,false,$7,'DRAFT')
  `, [
    randomUUID(), ids.assignmentActiveA,
    JSON.stringify(["API integration","Responsive QA"]),
    JSON.stringify(["Completed verified Gate A work evidence"]),
    JSON.stringify(["gatea-work-sample.pdf"]),
    JSON.stringify({ gatea_fixture: true, gatea_run_id: runId }),
    a("intern").appUserId,
  ]);

  await db.query(`
    insert into announcements (id,created_by_id,title,content,priority,audience,company_id,status,is_pinned,published_at)
    values ($1,$2,$3,$4,'NORMAL','COMPANY',$5,'PUBLISHED',false,'2026-11-01T09:00:00+08:00')
  `, [randomUUID(), a("representative").appUserId, "GateA program update", `${marker}; Test-only published announcement for UI rendering.`, ids.companyA]);

  await db.query(`
    insert into announcements (id,created_by_id,title,content,priority,audience,company_id,status,is_pinned)
    values ($1,$2,$3,$4,'HIGH','COMPANY',$5,'DRAFT',false)
  `, [randomUUID(), a("representative").appUserId, `GateA ANN-3 ${runId}`, `${marker}; Dedicated ANN-3 draft. Do not publish before E6.`, ids.companyA]);

  await db.query("COMMIT");

  console.log("Gate A fixture setup: PASS");
  console.log(`run_id=${runId}`);
  console.log("auth_accounts_created=8");
  console.log("application_users_created=8");
  console.log("companies_created=2");
  console.log("schools_created=1");
  console.log("assignments_created=5");
  console.log("attendance_credited_minutes_expected=1350");
  console.log("ann3_draft_created=yes");
  console.log("notifications_created=0");
  console.log("credentials_manifest=.gatea/gatea-credentials.local.json");
  console.log("passwords_printed=no");
} catch (error) {
  try { await db.query("ROLLBACK"); } catch {}
  if (credentialsWritten) rmSync(credentialPath, { force: true });
  await cleanupAuth();
  console.error("Gate A fixture setup: FAIL");
  console.error(error instanceof Error ? error.message : "Unknown fixture setup error.");
  process.exitCode = 1;
} finally {
  await db.end().catch(() => undefined);
}
