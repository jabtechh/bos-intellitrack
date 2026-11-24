import { randomBytes, randomUUID } from "node:crypto";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import { assertGateAExecutionEnvironment } from "./environment";

const marker = "gatea_fixture=true; gatea_run_id=gatea-20261103-2318";
const weekOne = "2026-10-14";
const weekTwo = "2026-10-21";

function guard() {
  assertGateAExecutionEnvironment();
  const url = new URL(process.env.DIRECT_URL ?? "");
  const base = new URL(process.env.GATEA_BASE_URL ?? "");
  const auth = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  if (process.env.GATEA_RUN_ID !== "gatea-20261103-2318" ||
      url.hostname !== "127.0.0.1" || url.port !== "54322" ||
      base.hostname !== "127.0.0.1" || base.port !== "3100" ||
      auth.hostname !== "127.0.0.1") {
    throw Error("Gate C lifecycle may run ONLY against the isolated 54322 database / 3100 app");
  }
}

async function fillWeekly(page: Page, internId: string, week: string, comments: string) {
  await expect(page.getByRole("heading", { name: /Create evaluation|Edit evaluation draft/ })).toBeVisible();
  await page.locator('select[name="internUserId"]').selectOption(internId);
  await page.getByLabel("Evaluation type").selectOption("PROGRESS");
  await page.getByLabel("Evaluation date").fill("2026-11-02");
  await page.getByLabel("Overall score (0–100)").fill("86");
  await page.getByLabel("Week to evaluate").fill(week);
  for (const i of [1, 2, 3]) await page.getByLabel(`Criterion ${i}`, { exact: true }).fill(`Criterion ${i}`);
  await page.getByLabel("Strengths").fill("Demonstrated progress in authentic task completion.");
  await page.getByLabel("Areas for improvement").fill("Continue building communication clarity.");
  await page.getByLabel("Supervisor remarks").fill(comments);
}

async function newEvaluation(page: Page) {
  await page.goto("/evaluations/new", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Create evaluation" })).toBeVisible();
}

async function saveDraft(page: Page) {
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page).toHaveURL(/\/evaluations\/[0-9a-f-]{36}$/);
  return new URL(page.url()).pathname.split("/").at(-1)!;
}

async function testSupervisorFlow(page: Page, db: pg.Client, internId: string) {
  await newEvaluation(page);
  await fillWeekly(page, internId, weekOne, "Gate C first draft");
  await expect(page.getByRole("status")).toContainText("Oct 12");
  await expect(page.getByRole("status")).toContainText("Oct 18");
  // The browser may submit malicious hidden identity fields. The server must ignore them.
  await page.locator("form").first().evaluate((form) => {
    for (const [name, value] of [
      ["periodKey", "OVERRIDE"], ["periodStart", "2026-01-01"], ["periodEnd", "2026-12-31"],
    ]) {
      const hidden = document.createElement("input");
      hidden.name = name; hidden.value = value; hidden.type = "hidden";
      form.append(hidden);
    }
  });
  const first = await saveDraft(page);
  const canonical = await db.query(
    "select evaluation_type, period_key, period_start::text as start, period_end::text as end, status from evaluations where id=$1",
    [first],
  );
  expect(canonical.rows[0]).toMatchObject({
    evaluation_type: "PROGRESS", period_key: "2026-10-12",
    start: "2026-10-12", end: "2026-10-18", status: "DRAFT",
  });

  await newEvaluation(page);
  await fillWeekly(page, internId, weekOne, "Duplicate must not persist");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.locator("p.inline-notice[role=alert]")).toContainText("already exists");
  expect((await db.query("select count(*)::int as n from evaluations where assignment_id=(select assignment_id from evaluations where id=$1)", [first])).rows[0].n).toBe(1);

  await newEvaluation(page);
  await fillWeekly(page, internId, weekTwo, "Gate C second draft");
  const second = await saveDraft(page);
  expect(second).not.toBe(first);

  // Submit an Intern identifier that was not in the Supervisor's authorized
  // dropdown. The server must never trust client-supplied select options.
  const foreignIntern = await db.query(`
    select ip.user_id from internship_assignments a
    join intern_profiles ip on ip.id=a.intern_profile_id
    where a.status='ACTIVE' and a.supervisor_profile_id <>
      (select supervisor_profile_id from internship_assignments where id=
        (select assignment_id from evaluations where id=$1))
    limit 1
  `, [first]);
  expect(foreignIntern.rowCount).toBe(1);
  await newEvaluation(page);
  await fillWeekly(page, internId, "2026-10-28", "Forged cross-supervisor assignment");
  await page.locator('select[name="internUserId"]').evaluate((select, forgedId) => {
    const option = document.createElement("option");
    option.value = forgedId; option.textContent = "Forged Intern";
    select.append(option);
    (select as HTMLSelectElement).value = forgedId;
  }, foreignIntern.rows[0].user_id);
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.locator("p.inline-notice[role=alert]")).toContainText("directly supervised active Intern");
  expect((await db.query("select count(*)::int as n from evaluations where assignment_id=$1", [internId])).rows[0].n).toBe(2);

  await page.goto(`/evaluations/${first}/edit`);
  await expect(page.getByRole("heading", { name: "Edit evaluation draft" })).toBeVisible();
  await page.getByLabel("Supervisor remarks").fill("Gate C edited successfully");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page).toHaveURL(new RegExp(`/evaluations/${first}$`));
  await expect(page.getByText("Gate C edited successfully")).toBeVisible();

  await page.goto(`/evaluations/${first}/edit`);
  await expect(page.getByRole("heading", { name: "Edit evaluation draft" })).toBeVisible();
  await page.getByLabel("Week to evaluate").fill(weekTwo);
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.locator("p.inline-notice[role=alert]")).toContainText("already exists");
  const unaltered = await db.query("select period_key from evaluations where id=$1", [first]);
  expect(unaltered.rows[0].period_key).toBe("2026-10-12");

  await page.goto(`/evaluations/${first}`);
  await page.getByText("Finalize evaluation", { exact: true }).click();
  await page.locator('input[name="evaluationId"]').evaluate((el, forgedId) => {
    (el as HTMLInputElement).value = forgedId;
  }, randomUUID());
  await page.getByRole("button", { name: "Confirm finalization" }).click();
  await expect.poll(() => new URL(page.url()).pathname).not.toBe(`/evaluations/${first}`);
  expect((await db.query("select status from evaluations where id=$1", [first])).rows[0].status).toBe("DRAFT");
  await page.goto(`/evaluations/${first}`);
  await page.getByText("Finalize evaluation", { exact: true }).click();
  await page.getByRole("button", { name: "Confirm finalization" }).click();
  await expect(page).toHaveURL(new RegExp(`/evaluations/${first}$`));
  await expect(page.getByText("This evaluation is finalized and read-only.")).toBeVisible();
  const frozen = await db.query("select status from evaluations where id=$1", [first]);
  expect(frozen.rows[0].status).toBe("SUBMITTED");
  await page.goto(`/evaluations/${first}/edit`);
  await expect(page.getByRole("heading", { name: "Edit evaluation draft" })).toHaveCount(0);

  return { first, second };
}

// Deliberately bypasses ONLY client-side camera controls to exercise the real
// authenticated Attendance server action with a disposable synthetic image.
// This is NOT physical-device camera, liveness, or GPS acceptance.
async function submitSyntheticAttendanceEvidence(page: Page) {
  await page.locator("form.evidence-form").evaluate((form) => {
    const input = document.createElement("input");
    input.name = "selfie";
    input.type = "file";
    input.style.display = "none";
    form.appendChild(input);
  });
  const png = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000b49444154789c636000020000050001a5f645400000000049454e44ae426082", "hex");
  await page.locator('form.evidence-form input[name="selfie"]').last().setInputFiles({
    name: "gatec-attendance-synthetic.png", mimeType: "image/png", buffer: png,
  });
  await page.locator("form.evidence-form").evaluate((form) => (form as HTMLFormElement).requestSubmit());
  return png;
}

async function signInIntern(browser: Browser, email: string, password: string) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${process.env.GATEA_BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login\/?$/);
  return { context, page };
}

test("Gate C full weekly Evaluation lifecycle with separate disposable Intern + strict cleanup", async ({ page, browser }, testInfo) => {
  test.skip(testInfo.project.name !== "S-1440", "One isolated synthetic lifecycle is sufficient; role/viewport coverage is separate");
  test.setTimeout(160_000);
  guard();

  const uid = randomUUID();
  const peerId = randomUUID();
  const run = `gatec-${uid}`;
  const email = `${run}@example.invalid`;
  const password = `${randomBytes(24).toString("base64url")}Aa1!`;
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const admin = createClient(publicUrl, process.env.SUPABASE_SECRET_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const db = new pg.Client({ connectionString: process.env.DIRECT_URL });
  let authId: string | undefined;
  let peerAuthId: string | undefined;
  let internContext: Awaited<ReturnType<typeof browser.newContext>> | undefined;
  let coordinatorContext: Awaited<ReturnType<typeof browser.newContext>> | undefined;
  let appUserCreated = false;
  let dbConnected = false;
  let cleanupError: unknown;
  try {
    await db.connect();
    dbConnected = true;
    const baseline = await db.query(`
      select c.id as company_id, s.id as supervisor_profile_id,
        cp.id as coordinator_profile_id, cp.school_id
      from supervisor_profiles s join users su on su.id=s.user_id
      join companies c on c.id=s.company_id
      join coordinator_profiles cp on true
      join users cu on cu.id=cp.user_id
      where c.company_code='BO_MAIN_OFFICE' and su.bio=$1 and cu.bio=$1
      limit 1
    `, [marker]);
    expect(baseline.rowCount).toBe(1);
    const { company_id, supervisor_profile_id, coordinator_profile_id, school_id } = baseline.rows[0];
    const created = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      app_metadata: { password_change_required: false, gatec_synthetic: true },
    });
    if (created.error || !created.data.user) throw Error(`Synthetic Auth provisioning failed: ${created.error?.message ?? "no user"}`);
    authId = created.data.user.id;
    const peerCreated = await admin.auth.admin.createUser({
      email: `gatec-peer-${peerId}@example.invalid`,
      password: `${randomBytes(24).toString("base64url")}Aa1!`,
      email_confirm: true,
      app_metadata: { password_change_required: false, gatec_synthetic: true },
    });
    if (peerCreated.error || !peerCreated.data.user)
      throw Error(`Synthetic peer Auth provisioning failed: ${peerCreated.error?.message ?? "no user"}`);
    peerAuthId = peerCreated.data.user.id;

    // Write only a newly generated synthetic Intern and assignment; none of
    // the protected E6 rows are edited. The connection is kept for verification.
    await db.query("BEGIN");
    await db.query(`
      insert into users (id,auth_id,email,role,first_name,last_name,is_active,bio)
      values ($1,$2,$3,'INTERN','GateC','Disposable',true,$4)
    `, [uid, authId, email, run]);
    await db.query(`
      insert into intern_profiles (id,user_id,school_id,student_number,course)
      values ($1,$2,$3,$4,'Gate C Test Only')
    `, [uid, uid, school_id, run]);
    await db.query(`
      insert into internship_assignments
        (id,intern_profile_id,company_id,supervisor_profile_id,
         coordinator_profile_id,assignment_code,start_date,end_date,required_hours,status,notes)
      values ($1,$2,$3,$4,$5,$6,'2026-09-28','2026-12-13',486,'ACTIVE',$7)
    `, [uid, uid, company_id, supervisor_profile_id, coordinator_profile_id, run, run]);
    await db.query(`
      insert into users (id,auth_id,email,role,first_name,last_name,is_active,bio)
      values ($1,$2,$3,'INTERN','GateC','Peer',true,$4)
    `, [peerId, peerAuthId, `gatec-peer-${peerId}@example.invalid`, run]);
    await db.query(`
      insert into intern_profiles (id,user_id,school_id,student_number,course)
      values ($1,$2,$3,$4,'Gate C Peer Test Only')
    `, [peerId, peerId, school_id, `peer-${run}`]);
    await db.query(`
      insert into internship_assignments
        (id,intern_profile_id,company_id,supervisor_profile_id,
         coordinator_profile_id,assignment_code,start_date,end_date,required_hours,status,notes)
      values ($1,$2,$3,$4,$5,$6,'2026-09-28','2026-12-13',486,'ACTIVE',$7)
    `, [peerId, peerId, company_id, supervisor_profile_id, coordinator_profile_id, `peer-${run}`, run]);
    await db.query("COMMIT");
    appUserCreated = true;

    const { first, second } = await testSupervisorFlow(page, db, uid);

    // Supervisor creates a real Task, scoped to the disposable Intern.
    await page.goto("/tasks/new", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Assign a task" })).toBeVisible();
    await page.locator('select[name="internUserId"]').selectOption(uid);
    await page.locator('input[name="title"]').fill("Gate C disposable internship task");
    await page.locator('textarea[name="description"]').fill("Verify the test-only task assignment workflow.");
    await page.getByRole("button", { name: "Assign task" }).click();
    await expect(page).toHaveURL(/\/tasks\/[0-9a-f-]{36}$/);
    await expect.poll(async () => (
      await db.query("select count(*)::int as n from tasks where assignment_id=$1", [uid])
    ).rows[0].n).toBe(1);
    console.log("GATE C TASK: PASS — authorized Supervisor created disposable Intern Task");

    const intern = await signInIntern(browser, email, password);
    internContext = intern.context;
    // Browser-simulated GPS is useful acceptance evidence for the UI capture
    // only. It is NOT physical-device GPS or a real camera/selfie verification.
    await intern.context.grantPermissions(["geolocation"], {
      origin: process.env.GATEA_BASE_URL,
    });
    await intern.context.setGeolocation({ latitude: 14.5547, longitude: 121.0244, accuracy: 18 });
    await intern.page.goto("/attendance", { waitUntil: "domcontentloaded" });
    await expect(intern.page.getByText("Location captured.")).toBeVisible();
    await expect(intern.page.locator('input[name="latitude"]')).toHaveValue("14.5547");
    await expect(intern.page.locator('input[name="longitude"]')).toHaveValue("121.0244");
    await expect(intern.page.locator('input[name="accuracy"]')).toHaveValue("18");
    await expect(intern.page.getByRole("button", { name: "Time in", exact: true })).toBeDisabled();
    expect((await db.query("select count(*)::int as n from attendance where assignment_id=$1", [uid])).rows[0].n).toBe(0);
    console.log("GATE C ATTENDANCE: PASS — simulated browser geolocation captured; no selfie means no Time In and zero attendance DB writes");

    // Permission denial must fail closed: the UI cannot enable Time In or
    // write attendance when device location permission is unavailable.
    await intern.context.clearPermissions();
    await intern.page.goto("/attendance", { waitUntil: "domcontentloaded" });
    await expect(intern.page.getByText("Location permission was denied.")).toBeVisible();
    await expect(intern.page.getByRole("button", { name: "Retry location" })).toBeVisible();
    await expect(intern.page.getByRole("button", { name: "Time in", exact: true })).toBeDisabled();
    expect((await db.query("select count(*)::int as n from attendance where assignment_id=$1", [uid])).rows[0].n).toBe(0);
    console.log("GATE C ATTENDANCE: PASS — denied browser GPS blocks Time In; zero attendance DB writes");

    // Server-action acceptance only, with a synthetic file attached to the
    // real authenticated form submission. The UI camera was NOT used.
    await intern.context.grantPermissions(["geolocation"], { origin: process.env.GATEA_BASE_URL });
    await intern.context.setGeolocation({ latitude: 14.5547, longitude: 121.0244, accuracy: 18 });
    await intern.page.goto("/attendance", { waitUntil: "domcontentloaded" });
    await expect(intern.page.getByText("Location captured.")).toBeVisible();
    // A second browser tab keeps the original Time In action to simulate
    // a genuinely stale duplicate submission after the first one succeeds.
    const staleClockIn = await intern.context.newPage();
    await staleClockIn.goto("/attendance", { waitUntil: "domcontentloaded" });
    await expect(staleClockIn.getByText("Location captured.")).toBeVisible();
    const attendancePng = await submitSyntheticAttendanceEvidence(intern.page);
    await expect(intern.page.getByText(/Time In recorded/)).toBeVisible();
    const clockedIn = await db.query(
      "select id,clock_in_selfie_path,status from attendance where assignment_id=$1", [uid],
    );
    expect(clockedIn.rows).toHaveLength(1);
    expect(clockedIn.rows[0].status).toBe("CLOCKED_IN");
    const clockInObject = await admin.storage.from("attendance-evidence").download(clockedIn.rows[0].clock_in_selfie_path);
    expect(clockInObject.error).toBeNull();
    expect(Buffer.from(await clockInObject.data!.arrayBuffer())).toEqual(attendancePng);

    await submitSyntheticAttendanceEvidence(staleClockIn);
    await expect(staleClockIn.getByText("Attendance has already been recorded for today.")).toBeVisible();
    await staleClockIn.close();
    expect((await db.query("select count(*)::int as n from attendance where assignment_id=$1", [uid])).rows[0].n).toBe(1);

    await intern.page.reload({ waitUntil: "domcontentloaded" });
    await expect(intern.page.getByText("Location captured.")).toBeVisible();
    await expect(intern.page.getByRole("button", { name: "Time out", exact: true })).toBeVisible();
    const staleClockOut = await intern.context.newPage();
    await staleClockOut.goto("/attendance", { waitUntil: "domcontentloaded" });
    await expect(staleClockOut.getByText("Location captured.")).toBeVisible();
    await submitSyntheticAttendanceEvidence(intern.page);
    await expect(intern.page.getByRole("heading", { name: "Attendance awaiting review" })).toBeVisible();
    const clockedOut = await db.query(
      "select clock_out, clock_out_selfie_path, status, credited_minutes from attendance where id=$1",
      [clockedIn.rows[0].id],
    );
    expect(clockedOut.rows[0].clock_out).toBeTruthy();
    expect(clockedOut.rows[0].status).toBe("PENDING_REVIEW");
    expect(Number(clockedOut.rows[0].credited_minutes)).toBe(0);
    const clockOutObject = await admin.storage.from("attendance-evidence").download(clockedOut.rows[0].clock_out_selfie_path);
    expect(clockOutObject.error).toBeNull();
    expect(Buffer.from(await clockOutObject.data!.arrayBuffer())).toEqual(attendancePng);

    await submitSyntheticAttendanceEvidence(staleClockOut);
    await expect(staleClockOut.getByText("Time Out has already been recorded.")).toBeVisible();
    await staleClockOut.close();
    expect((await db.query("select count(*)::int as n from attendance where assignment_id=$1", [uid])).rows[0].n).toBe(1);
    console.log("GATE C ATTENDANCE SERVER: PASS — synthetic file-backed Time In/Out, private objects, duplicate rejection, zero credit for short shift");

    await intern.page.goto("/evaluations", { waitUntil: "domcontentloaded" });
    await expect(intern.page.getByRole("link", { name: /Weekly progress evaluation/ })).toHaveCount(1);
    await expect(intern.page.getByRole("link", { name: /Oct 12/ })).toBeVisible();
    await intern.page.goto(`/evaluations/${second}`);
    await expect(intern.page.getByText("This page could not be found")).toBeVisible();
    await intern.page.goto(`/evaluations/${first}`);
    await expect(intern.page.getByRole("button", { name: "Acknowledge receipt" })).toBeVisible();
    await intern.page.locator('input[name="evaluationId"]').evaluate((el, forgedId) => {
      (el as HTMLInputElement).value = forgedId;
    }, randomUUID());
    await intern.page.getByRole("button", { name: "Acknowledge receipt" }).click();
    await expect(intern.page).toHaveURL(/\/evaluations\/?$/);
    expect((await db.query("select status from evaluations where id=$1", [first])).rows[0].status).toBe("SUBMITTED");
    await intern.page.goto(`/evaluations/${first}`);
    await expect(intern.page.getByRole("button", { name: "Acknowledge receipt" })).toBeVisible();
    await intern.page.getByRole("button", { name: "Acknowledge receipt" }).click();
    await expect(intern.page).toHaveURL(new RegExp(`/evaluations/${first}$`));
    await expect.poll(async () => (await db.query(
      "select status,acknowledged_by_id from evaluations where id=$1", [first],
    )).rows[0]).toMatchObject({ status: "ACKNOWLEDGED", acknowledged_by_id: uid });
    await intern.page.goto(`/evaluations/${first}/edit`);
    await expect(intern.page).not.toHaveURL(new RegExp(`/evaluations/${first}/edit$`));

    // Genuine profile and emergency-contact mutations are limited to this
    // disposable synthetic Intern. E6 profile values remain untouched.
    await intern.page.goto("/profile/edit", { waitUntil: "domcontentloaded" });
    await expect(intern.page.getByRole("heading", { name: "Edit profile" })).toBeVisible();
    await intern.page.locator('input[name="firstName"]').fill("VerifiedGateC");
    await intern.page.locator('input[name="emergencyContactName"]').fill("Test Emergency Contact");
    await intern.page.locator('input[name="emergencyContactNumber"]').fill("+639171234567");
    await intern.page.locator('input[name="emergencyContactRelationship"]').fill("Guardian");
    await intern.page.getByRole("button", { name: "Save Changes" }).click();
    await expect.poll(async () => {
      const row = await db.query(
        `select u.first_name, p.emergency_contact_name, p.emergency_contact_number,
           p.emergency_contact_relationship from users u join intern_profiles p on p.user_id=u.id where u.id=$1`,
        [uid],
      );
      return row.rows[0];
    }).toMatchObject({
      first_name: "VerifiedGateC",
      emergency_contact_name: "Test Emergency Contact",
      emergency_contact_number: "+639171234567",
      emergency_contact_relationship: "Guardian",
    });
    console.log("GATE C PROFILE: PASS — own profile edit and emergency-contact persistence");

    await intern.page.goto("/work-logs/new", { waitUntil: "domcontentloaded" });
    await expect(intern.page.getByRole("heading", { name: "Daily Work Log" })).toBeVisible();
    await intern.page.locator('input[name="workDate"]').fill("2026-11-02");
    await intern.page.locator('textarea[name="description"]').fill("Completed Gate C synthetic test work.");
    const syntheticPdf = Buffer.from("%PDF-1.4\\n1 0 obj<</Type/Catalog>>endobj\\n%%EOF\\n");
    await intern.page.locator('input[name="attachment"]').setInputFiles({
      name: "gatec5-worklog.pdf", mimeType: "application/pdf", buffer: syntheticPdf,
    });
    await intern.page.getByRole("button", { name: "Submit Work Log" }).click();
    await expect(intern.page).toHaveURL(/\/work-logs\/[0-9a-f-]{36}$/);
    await expect.poll(async () => (
      await db.query("select count(*)::int as n from work_logs where assignment_id=$1 and status='SUBMITTED'", [uid])
    ).rows[0].n).toBe(1);
    const attachedWorkLog = await db.query(
      "select attachment_path from work_logs where assignment_id=$1 and status='SUBMITTED'", [uid],
    );
    expect(attachedWorkLog.rows[0]?.attachment_path).toMatch(/attachment\.pdf$/);
    const downloadedWorkLog = await admin.storage.from("work-log-attachments").download(attachedWorkLog.rows[0].attachment_path);
    expect(downloadedWorkLog.error).toBeNull();
    expect(Buffer.from(await downloadedWorkLog.data!.arrayBuffer())).toEqual(syntheticPdf);
    console.log("GATE C WORK LOG: PASS — real Intern submission, attachment storage and content retrieval");

    await intern.page.goto("/documents/new", { waitUntil: "domcontentloaded" });
    await expect(intern.page.getByRole("heading", { name: "Upload document" })).toBeVisible();
    await intern.page.locator('input[name="fileName"]').fill("Gate C disposable document");
    await intern.page.locator('input[name="documentFile"]').setInputFiles({
      name: "gatec5-document.pdf", mimeType: "application/pdf", buffer: syntheticPdf,
    });
    await intern.page.getByRole("button", { name: "Submit for review" }).click();
    await expect(intern.page).toHaveURL(/\/documents\/[0-9a-f-]{36}$/);
    const syntheticDocumentId = new URL(intern.page.url()).pathname.split("/").at(-1)!;
    const storedDocument = await db.query(
      "select storage_path, status, checksum from documents where id=$1 and assignment_id=$2",
      [syntheticDocumentId, uid],
    );
    expect(storedDocument.rows[0]?.status).toBe("PENDING_REVIEW");
    expect(storedDocument.rows[0]?.checksum).toBeDefined();
    const downloadedDocument = await admin.storage.from("internship-documents").download(storedDocument.rows[0].storage_path);
    expect(downloadedDocument.error).toBeNull();
    expect(Buffer.from(await downloadedDocument.data!.arrayBuffer())).toEqual(syntheticPdf);
    await expect(intern.page.getByRole("link", { name: "Open secure document" })).toBeVisible();
    console.log("GATE C DOCUMENT: PASS — Intern document submission, private object and signed link");

    await intern.page.goto("/feedback/workmate/new", { waitUntil: "domcontentloaded" });
    await expect(intern.page.getByRole("heading", { name: "Share feedback with a workmate" })).toBeVisible();
    await intern.page.locator('select[name="recipientUserId"]').selectOption(peerId);
    await intern.page.locator('textarea[name="content"]').fill("Gate C constructive peer feedback between synthetic Interns.");
    await intern.page.getByRole("button", { name: "Share feedback" }).click();
    await expect(intern.page).toHaveURL(/\/evaluations\?tab=feedback/);
    await expect.poll(async () => (
      await db.query(
        "select count(*)::int as n from feedback where author_id=$1 and recipient_id=$2",
        [uid, peerId],
      )
    ).rows[0].n).toBe(1);
    console.log("GATE C WORKMATE: PASS — genuine same-Supervisor peer feedback persisted");

    await intern.page.goto("/portfolio", { waitUntil: "domcontentloaded" });
    await expect(intern.page.getByRole("heading", { name: "My Internship Portfolio" })).toBeVisible();
    await expect(intern.page.getByRole("link", { name: "Export Portfolio PDF" })).toBeVisible();
    const pdfResponse = await intern.context.request.get(`${process.env.GATEA_BASE_URL}/portfolio/pdf`);
    expect(pdfResponse.status()).toBe(200);
    expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");
    const pdf = await pdfResponse.body();
    expect(pdf.subarray(0, 5).toString("utf8")).toBe("%PDF-");
    expect(pdf.byteLength).toBeGreaterThan(500);
    console.log("GATE C PORTFOLIO: PASS — live automatic evidence view + valid downloadable PDF");

    coordinatorContext = await browser.newContext({ storageState: ".gatea/auth/coordinator.json" });
    const coordinator = await coordinatorContext.newPage();
    await coordinator.goto("/evaluations", { waitUntil: "domcontentloaded" });
    await expect(coordinator.locator(`a[href="/evaluations/${first}"]`)).toBeVisible();
    await expect(coordinator.locator(`a[href="/evaluations/${second}"]`)).toHaveCount(0);
    await coordinator.goto(`/evaluations/${first}`);
    await expect(coordinator.getByText("This evaluation is finalized and read-only.")).toBeVisible();
    await coordinator.goto(`/evaluations/${second}`);
    await expect(coordinator.getByText("This page could not be found")).toBeVisible();

    const rows = await db.query("select period_key,status from evaluations where assignment_id=$1 order by period_key", [uid]);
    expect(rows.rows).toMatchObject([
      { period_key: "2026-10-12", status: "ACKNOWLEDGED" },
      { period_key: "2026-10-19", status: "DRAFT" },
    ]);
    console.log("GATE C LIFECYCLE: PASS — canonical create, duplicate, second week, forged foreign Intern rejected, edit, duplicate-on-edit, tampered finalize rejected, finalization, Intern only-finalized, tampered acknowledge rejected, acknowledgment, Coordinator scope, finalized lock");

    // Real session revocation check: after Sign out, a protected route must
    // redirect to login in this same browser context.
    await intern.page.goto("/more", { waitUntil: "domcontentloaded" });
    await intern.page.getByRole("button", { name: "Sign out" }).click();
    await expect(intern.page).toHaveURL(/\/login/);
    await intern.page.goto("/profile/edit", { waitUntil: "domcontentloaded" });
    await expect(intern.page).toHaveURL(/\/login/);
    console.log("GATE C LOGOUT: PASS — session sign-out and protected-route denial");
  } finally {
    if (internContext) await internContext.close().catch(() => undefined);
    if (coordinatorContext) await coordinatorContext.close().catch(() => undefined);
    if (dbConnected) {
      try {
        await db.query("BEGIN");
        await db.query("delete from evaluations where assignment_id=$1", [uid]);
        await db.query("delete from feedback where author_id=$1 and recipient_id=$2", [uid, peerId]);
        await db.query("delete from tasks where assignment_id=$1", [uid]);
        const attendancePaths = await db.query("select clock_in_selfie_path,clock_out_selfie_path from attendance where assignment_id=$1", [uid]);
        await db.query("delete from attendance where assignment_id=$1", [uid]);
        const workLogPaths = await db.query("select attachment_path from work_logs where assignment_id=$1 and attachment_path is not null", [uid]);
        const documentPaths = await db.query("select storage_path from documents where assignment_id=$1", [uid]);
        await db.query("delete from documents where assignment_id=$1", [uid]);
        await db.query("delete from work_logs where assignment_id=$1", [uid]);
        await db.query("delete from internship_assignments where id=$1 and notes=$2", [uid, run]);
        await db.query("delete from internship_assignments where id=$1 and notes=$2", [peerId, run]);
        await db.query("delete from intern_profiles where id=$1", [uid]);
        await db.query("delete from intern_profiles where id=$1", [peerId]);
        if (appUserCreated) {
          await db.query("delete from users where id=$1 and bio=$2", [uid, run]);
          await db.query("delete from users where id=$1 and bio=$2", [peerId, run]);
        }
        await db.query("COMMIT");
        for (const row of attendancePaths.rows) {
          const paths = [row.clock_in_selfie_path, row.clock_out_selfie_path].filter(Boolean);
          if (paths.length) {
            const removed = await admin.storage.from("attendance-evidence").remove(paths);
            if (removed.error) throw removed.error;
          }
        }
        for (const row of workLogPaths.rows) {
          const removed = await admin.storage.from("work-log-attachments").remove([row.attachment_path]);
          if (removed.error) throw removed.error;
        }
        for (const row of documentPaths.rows) {
          const removed = await admin.storage.from("internship-documents").remove([row.storage_path]);
          if (removed.error) throw removed.error;
        }
        console.log("GATE C FILE CLEANUP: PASS — disposable application uploads removed");
        const residual = await db.query(`
          select (select count(*)::int from users where id=$1) as users,
           (select count(*)::int from intern_profiles where id=$1) as profiles,
           (select count(*)::int from internship_assignments where id=$1) as assignments,
           (select count(*)::int from evaluations where assignment_id=$1) as evaluations,
           (select count(*)::int from work_logs where assignment_id=$1) as work_logs,
           (select count(*)::int from attendance where assignment_id=$1) as attendance,
           (select count(*)::int from tasks where assignment_id=$1) as tasks,
           (select count(*)::int from users where id=$2) as peer_users,
           (select count(*)::int from internship_assignments where id=$2) as peer_assignments,
           (select count(*)::int from feedback where author_id=$1 and recipient_id=$2) as feedback
        `, [uid, peerId]);
        expect(Object.values(residual.rows[0])).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        console.log("GATE C CLEANUP: PASS — zero synthetic application rows");
      } catch (error) {
        cleanupError = error;
        await db.query("ROLLBACK").catch(() => undefined);
      }
      await db.end().catch(() => undefined);
    }
    if (peerAuthId) {
      const deletedPeer = await admin.auth.admin.deleteUser(peerAuthId);
      if (deletedPeer.error) cleanupError = deletedPeer.error;
      else console.log("GATE C CLEANUP: PASS — synthetic peer Auth user deleted");
    }
    if (authId) {
      const deleted = await admin.auth.admin.deleteUser(authId);
      if (deleted.error) cleanupError = deleted.error;
      else console.log("GATE C CLEANUP: PASS — synthetic Auth user deleted");
    }
    if (cleanupError) throw cleanupError;
  }
});
