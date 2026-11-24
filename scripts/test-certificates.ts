// DEC-2026-021 (Amendment A) / P175 — Certificate of Completion unit tests (DB-free).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PDFDocument, PDFName } from "pdf-lib";
import { completeAssignmentInTransaction } from "../src/lib/assignments/completion.ts";
import {
  canDownloadCertificate, canIssueCertificate, canRevokeCertificate, certificateBody, certificateNumber, completionShortfallMinutes,
  hoursStatement, isCertificateNumber, revokeReasonError,
} from "../src/lib/certificates/domain.ts";
import { certificateEligibility, ORGANIZATION_SIGNATORY_POSITION, type EligibilityInput } from "../src/lib/certificates/eligibility.ts";
import { issueCertificateInTransaction } from "../src/lib/certificates/issue.ts";
import { pdfSafe, renderCertificatePdf } from "../src/lib/certificates/pdf.ts";
import { certificateCandidateWhere, certificateViewerWhere } from "../src/lib/certificates/scope.ts";
import { DOCUMENT_REQUIREMENTS } from "../src/lib/onboarding/domain.ts";

const read = (path: string) => readFileSync(path, "utf8");
const A = "aaaaaaaa-0000-4000-8000-000000000001";
const NOW = new Date("2026-08-29T01:00:00.000Z");
const base = { positionTitle: "Operations Intern", companyName: "Bo's Coffee Main Office", startDate: new Date("2026-06-01T00:00:00Z"), endDate: new Date("2026-08-28T00:00:00Z") };
const REQUIRED = DOCUMENT_REQUIREMENTS.filter((item) => item.required);

const ready: EligibilityInput = {
  assignmentStatus: "ACTIVE", requiredHours: 2, creditedMinutes: 120, attendedDays: ["2026-06-01", "2026-06-02"], loggedDays: ["2026-06-01", "2026-06-02", "2026-06-03"],
  profileComplete: true, requiredDocuments: REQUIRED.map((item) => ({ title: item.title, submitted: true })),
};

// ---- the three checks -----------------------------------------------------------------------------
test("all three checks met → eligible (active or completed internship)", () => {
  assert.equal(certificateEligibility(ready).eligible, true);
  assert.equal(certificateEligibility({ ...ready, assignmentStatus: "COMPLETED" }).eligible, true);
  for (const status of ["PENDING", "CANCELLED", "TERMINATED"]) assert.equal(certificateEligibility({ ...ready, assignmentStatus: status }).eligible, false, status);
  assert.equal(canIssueCertificate("ACTIVE"), true); assert.equal(canIssueCertificate("COMPLETED"), true); assert.equal(canIssueCertificate("TERMINATED"), false);
});

test("hours check: credited (APPROVED) hours must reach the confirmed requirement", () => {
  const short = certificateEligibility({ ...ready, creditedMinutes: 119 });
  assert.equal(short.hours.done, false); assert.equal(short.eligible, false);
  assert.equal(certificateEligibility({ ...ready, requiredHours: null }).hours.done, false, "unconfirmed required hours are never met");
});

test("daily Work Logs check: every attended day needs a submitted Work Log, and lists the missing dates", () => {
  const missing = certificateEligibility({ ...ready, loggedDays: ["2026-06-01"] });
  assert.equal(missing.workLogs.done, false); assert.deepEqual(missing.workLogs.missingLogDays, ["2026-06-02"]);
  assert.equal(missing.workLogs.loggedDays, 1); assert.equal(missing.workLogs.attendedDays, 2); assert.equal(missing.eligible, false);
  assert.equal(certificateEligibility({ ...ready, attendedDays: [], creditedMinutes: 120 }).workLogs.done, false, "no attended days → not done");
  assert.equal(certificateEligibility({ ...ready, attendedDays: ["2026-06-01", "2026-06-01"], loggedDays: ["2026-06-01"] }).workLogs.done, true, "duplicate dates count once");
});

test("Getting started check: complete profile and every required document", () => {
  const noProfile = certificateEligibility({ ...ready, profileComplete: false });
  assert.equal(noProfile.gettingStarted.done, false); assert.equal(noProfile.eligible, false);
  const oneMissing = certificateEligibility({ ...ready, requiredDocuments: REQUIRED.map((item, i) => ({ title: item.title, submitted: i !== 0 })) });
  assert.equal(oneMissing.gettingStarted.done, false); assert.deepEqual(oneMissing.gettingStarted.missingDocuments, [REQUIRED[0].title]);
  assert.equal(oneMissing.gettingStarted.documentsSubmitted, REQUIRED.length - 1); assert.equal(oneMissing.gettingStarted.documentsRequired, REQUIRED.length);
});

// ---- wording, numbers, access ---------------------------------------------------------------------
test("certificate numbers are well-formed and unambiguous", () => {
  assert.equal(certificateNumber(NOW, new Uint8Array([0, 1, 2, 3, 4, 31])), "BOS-2026-23456Z");
  for (let i = 0; i < 200; i++) { const n = certificateNumber(NOW); assert(isCertificateNumber(n), n); assert(!/[01IO]/.test(n.slice(9))); }
});

test("hours wording claims the requirement only when credited hours meet it", () => {
  assert.equal(hoursStatement({ creditedMinutes: 488 * 60, requiredHours: 480 }).sentence, "completing the required 480 hours with 488 credited hours");
  assert.equal(hoursStatement({ creditedMinutes: 22.5 * 60, requiredHours: 500 }).sentence, "rendering 22.5 credited hours");
  assert.equal(hoursStatement({ creditedMinutes: 59, requiredHours: null }).credited, "0.98", "truncated, never rounded up");
  assert.equal(completionShortfallMinutes({ creditedMinutes: 100, requiredHours: 2 }), 20);
  assert.match(certificateBody({ ...base, creditedMinutes: 488 * 60, requiredHours: 480 }), /^has completed an internship as Operations Intern at Bo's Coffee Main Office from June 1, 2026 to August 28, 2026, completing the required 480 hours with 488 credited hours, as recorded in IntelliTrack\.$/);
});

test("access: Intern own, assigned Supervisor, school Coordinator, Main Office Representative; Admin denied", () => {
  const scope = (role: string) => certificateViewerWhere({ userId: "u1", role });
  for (const role of ["ADMIN", "UNKNOWN", ""]) assert.equal(scope(role), null, role);
  const json = (role: string) => JSON.stringify(scope(role));
  assert.match(json("INTERN"), /"internProfile":\{"userId":"u1"\}/);
  assert.match(json("SUPERVISOR"), /"supervisorProfile":\{"userId":"u1"\}/);
  assert.match(json("COORDINATOR"), /"coordinatorProfiles":\{"some":\{"userId":"u1"\}\}/);
  assert.match(json("REPRESENTATIVE"), /"representativeProfiles":\{"some":\{"userId":"u1"\}\}/);
  for (const role of ["INTERN", "SUPERVISOR", "COORDINATOR", "REPRESENTATIVE"]) {
    assert.match(json(role), /"status":\{"in":\["ACTIVE","COMPLETED"\]\}/); assert.match(json(role), /"companyCode":"BO_MAIN_OFFICE","isActive":true/);
  }
  assert.equal(certificateCandidateWhere({ userId: "u1", role: "INTERN" }, "not-a-uuid"), null);
  assert.equal(certificateCandidateWhere({ userId: "u1", role: "ADMIN" }, A), null);
});

test("download and revoke rules", () => {
  for (const role of ["INTERN", "SUPERVISOR", "COORDINATOR", "REPRESENTATIVE"]) assert.equal(canDownloadCertificate(role, "ISSUED"), true, role);
  assert.equal(canDownloadCertificate("ADMIN", "ISSUED"), false);
  assert.equal(canDownloadCertificate("INTERN", "REVOKED"), false);
  assert.equal(canDownloadCertificate("INTERN", "PREVIEW"), false, "a preview is never downloadable");
  assert.equal(canRevokeCertificate("REPRESENTATIVE"), true);
  for (const role of ["INTERN", "SUPERVISOR", "COORDINATOR", "ADMIN"]) assert.equal(canRevokeCertificate(role), false, role);
  assert(revokeReasonError("") && revokeReasonError(null)); assert.equal(revokeReasonError("Completed by mistake"), null);
});

// ---- issuance (in-memory transaction double) ------------------------------------------------------
function fakeDb(opts: { status?: string; companyCode?: string; creditedMinutes?: number; loggedDays?: readonly string[]; documents?: readonly string[] } = {}) {
  const certificates: Record<string, unknown>[] = [];
  const attended = ["2026-06-01", "2026-06-02"];
  const db = {
    internshipCertificate: {
      async findUnique({ where }: { where: { assignmentId?: string; certificateNumber?: string } }) { return certificates.find((c) => (where.assignmentId && c.assignmentId === where.assignmentId) || (where.certificateNumber && c.certificateNumber === where.certificateNumber)) ?? null; },
      async create({ data }: { data: Record<string, unknown> }) { const row: Record<string, unknown> = { id: `c${certificates.length + 1}`, ...data }; certificates.push(row); return { id: row.id, certificateNumber: row.certificateNumber, status: row.status }; },
    },
    internshipAssignment: {
      async findUnique({ select }: { select: Record<string, unknown> }) {
        if ("attendance" in select) return {
          status: opts.status ?? "ACTIVE", requiredHours: 2,
          internProfile: { address: "a", emergencyContactName: "b", emergencyContactNumber: "c", user: { phoneNumber: "d" } },
          attendance: attended.map((d) => ({ attendanceDate: new Date(`${d}T00:00:00Z`), creditedMinutes: (opts.creditedMinutes ?? 120) / 2 })),
          workLogs: (opts.loggedDays ?? attended).map((d) => ({ workDate: new Date(`${d}T00:00:00Z`) })),
          documents: (opts.documents ?? REQUIRED.map((item) => item.title)).map((fileName) => ({ fileName })),
        };
        return { status: opts.status ?? "ACTIVE", positionTitle: "Operations Intern", startDate: base.startDate, endDate: base.endDate, completedAt: null, requiredHours: 2, company: { name: "Bo's Coffee Main Office", companyCode: opts.companyCode ?? "BO_MAIN_OFFICE", isActive: true }, internProfile: { user: { firstName: "Andrea", middleName: null, lastName: "Santos", suffix: null } } };
      },
    },
  };
  return { db: db as never, certificates };
}

test("eligible → issued once, signed by the organization (no person, no signature), idempotent", async () => {
  const { db, certificates } = fakeDb();
  const first = await issueCertificateInTransaction(db, { assignmentId: A, now: NOW });
  const again = await issueCertificateInTransaction(db, { assignmentId: A, now: NOW });
  assert(!first.skipped && first.created); assert(!again.skipped && !again.created); assert.equal(certificates.length, 1);
  const row = certificates[0];
  assert.equal(row.signatoryName, "Bo's Coffee Main Office"); assert.equal(row.signatoryPosition, ORGANIZATION_SIGNATORY_POSITION);
  assert.equal(row.issuedById, null); assert.equal(row.internName, "Andrea Santos"); assert.equal(row.creditedMinutes, 120); assert.equal(row.completedAt, NOW);
});

test("not eligible → no certificate (preview only); outside Main Office → skipped", async () => {
  for (const [label, opts] of [["hours short", { creditedMinutes: 60 }], ["a Work Log missing", { loggedDays: ["2026-06-01"] }], ["a document missing", { documents: REQUIRED.slice(1).map((item) => item.title) }], ["terminated", { status: "TERMINATED" }]] as const) {
    const { db, certificates } = fakeDb(opts);
    const result = await issueCertificateInTransaction(db, { assignmentId: A, now: NOW });
    assert(result.skipped && result.reason === "not_eligible", label); assert.equal(certificates.length, 0, label);
  }
  const other = fakeDb({ companyCode: "OTHER-CO" });
  const skipped = await issueCertificateInTransaction(other.db, { assignmentId: A, now: NOW });
  assert(skipped.skipped && skipped.reason === "outside_scope"); assert.equal(other.certificates.length, 0);
});

test("a number collision picks another number before inserting", async () => {
  const { db, certificates } = fakeDb();
  certificates.push({ id: "x", assignmentId: "other", certificateNumber: "BOS-2026-AAAAAA" });
  const numbers = ["BOS-2026-AAAAAA", "BOS-2026-BBBBBB"];
  const issued = await issueCertificateInTransaction(db, { assignmentId: A, now: NOW, newNumber: () => numbers.shift()! });
  assert(!issued.skipped); assert.equal(issued.certificateNumber, "BOS-2026-BBBBBB");
});

test("completion issues only when eligible and a certificate error rolls completion back", async () => {
  const calls: string[] = [];
  const tx = { internshipAssignment: { async updateMany() { calls.push("complete"); return { count: 1 }; } } } as never;
  const persist = (async () => { calls.push("portfolio"); return { portfolioId: "p", status: "GENERATED", snapshot: { evidence: { creditedMinutes: 120 } } }; }) as never;
  await assert.rejects(completeAssignmentInTransaction(tx, { assignmentId: A, companyId: "co", fromStatus: "ACTIVE", now: NOW }, { persist, issue: async () => { calls.push("certificate"); throw new Error("db down"); } }), /Certificate of Completion could not be issued/);
  assert.deepEqual(calls, ["complete", "portfolio", "certificate"]);
  const notEligible = await completeAssignmentInTransaction(tx, { assignmentId: A, companyId: "co", fromStatus: "ACTIVE", now: NOW }, { persist, issue: (async () => ({ id: null, certificateNumber: null, status: null, created: false, skipped: true, reason: "not_eligible" })) as never });
  assert.equal(notEligible.certificate.skipped, true, "completion still succeeds; no certificate is issued");
  const page = read("src/app/admin/assignments/[assignmentId]/page.tsx");
  assert(page.includes("No Certificate of Completion will be issued."));
});

// ---- rendering --------------------------------------------------------------------------------------
test("the PDF is a branded one-page certificate", async () => {
  const input = { certificateNumber: "BOS-2026-7L2EMH", status: "ISSUED", internName: "Andrea Santos", ...base, creditedMinutes: 488 * 60, requiredHours: 480, issuedAt: NOW, signatoryName: "Bo's Coffee Main Office", signatoryPosition: ORGANIZATION_SIGNATORY_POSITION };
  const bytes = await renderCertificatePdf(input, new Uint8Array(readFileSync("public/brand/bos-cup-mark.png")));
  const parsed = await PDFDocument.load(bytes);
  assert.equal(parsed.getPageCount(), 1);
  assert.deepEqual(parsed.getPage(0).getSize(), { width: 792, height: 612 });
  assert(parsed.getPage(0).node.Resources()?.lookup(PDFName.of("XObject")), "logo embedded");
  assert.equal(parsed.getTitle(), "Certificate of Completion - Andrea Santos");
  assert.equal(parsed.getSubject(), "Certificate No. BOS-2026-7L2EMH");
  assert.equal(pdfSafe("Bo’s – “café” ✓"), "Bo's - \"café\" ");
});

test("the preview is never downloadable and issuance is never claimed in a preview", () => {
  const page = read("src/app/(authenticated)/certificates/[assignmentId]/page.tsx");
  assert(page.includes("<CertificateSheet preview data={{"));
  assert(page.includes("certificateNumber: null, status: \"PREVIEW\""));
  assert(page.includes("await ensureCertificateIssued(own.id);"), "issued automatically the moment all checks are met");
  const route = read("src/app/(authenticated)/certificates/[assignmentId]/pdf/route.ts");
  assert(route.includes("getCertificate(viewer, assignmentId)") && route.includes("canDownloadCertificate(viewer.role, certificate.status)"), "PDF requires an issued certificate");
  const sheet = read("src/components/certificate-sheet.tsx");
  assert(sheet.includes("Preview · Not yet issued") && sheet.includes("Certificate No. assigned when issued"));
});

test("no AI and no stored PDF bytes", () => {
  for (const file of ["src/lib/certificates/issue.ts", "src/lib/certificates/pdf.ts", "src/lib/certificates/eligibility.ts", "src/lib/certificates/auto.ts", "src/app/(authenticated)/certificates/[assignmentId]/pdf/route.ts"]) {
    assert(!/@\/lib\/ai|gemini|storage\.from|upload\(/i.test(read(file)), file);
  }
});
