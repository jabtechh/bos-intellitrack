import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { portfolioCompleteness,portfolioInputSchema } from "../src/lib/portfolio/domain.ts";
import { safePdfFilename } from "../src/lib/reports/domain.ts";
import { calculateCompanyReport } from "../src/lib/reports/company.ts";

const read=(p:string)=>readFileSync(p,"utf8");
const auth=read("src/lib/portfolio/authorization.ts");
const aiActions=read("src/app/ai/actions.ts");
const generator=read("src/components/portfolio-draft-generator.tsx");
const portfolio=read("src/app/(authenticated)/portfolio/page.tsx");
const edit=read("src/app/(authenticated)/portfolio/edit/page.tsx");
const pdf=read("src/app/(authenticated)/portfolio/pdf/route.ts");

test("Portfolio is Intern-owned only",()=>{
  assert(auth.includes('user.role !== "INTERN"'));
  assert(auth.includes("return portfolioScopeWhere(c.profileId);"));
  assert(read("src/lib/portfolio/scope.ts").includes("return { internProfileId, company: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true } };"));
  for(const role of["SUPERVISOR","COORDINATOR","REPRESENTATIVE","ADMIN"])assert(!auth.includes('role === "'+role+'"'));
});

test("manual Portfolio validation and completeness remain",()=>{
  assert(portfolioInputSchema.safeParse({title:"My Portfolio",professionalSummary:"",skills:"A",achievements:"",selectedWork:"",reflection:""}).success);
  assert.deepEqual(portfolioCompleteness(null),{completed:0,total:6});
});

test("generated Portfolio is structured and review-only",()=>{
  assert(aiActions.includes("generatePortfolioDraft"));
  assert(aiActions.includes("generateGroundedPortfolioDraft"));
  const section=aiActions.split("export async function generatePortfolioDraft")[1].split("export async function generateEvaluationDraft")[0];
  for(const write of[".create(",".update(",".upsert("])assert(!section.includes(write));
  assert(generator.includes("AI-generated draft — review before use"));
  assert(generator.includes("Apply reviewed draft to editor"));
  assert(generator.includes("reviewed the generated draft"));
});

test("Portfolio editor requires explicit save",()=>{
  assert(edit.includes("Save Portfolio"));
  assert(edit.includes("Nothing is saved until you explicitly submit this form"));
  assert(edit.includes("PortfolioDraftGenerator"));
});

test("Portfolio has a genuine Portfolio-specific export",()=>{
  // DEC-2026-020: one Portfolio PDF per internship, built from that assignment's evidence and narrative.
  const pdfLines = readFileSync("src/lib/portfolio/pdf.ts", "utf8");
  assert(portfolio.includes('portfolioHref(assignment.id, "/pdf")'));
  assert(portfolio.includes('portfolioHref(entry.assignmentId, "/pdf")'));
  assert(pdf.includes("portfolioPdfLines("));
  assert(pdfLines.includes('"INTERNSHIP PORTFOLIO"'));
  assert(pdfLines.includes("INTERN-AUTHORED PERSONAL SECTIONS"));
  assert(pdfLines.includes("Verified evidence is system-compiled and presented separately from the Intern-authored narrative"));
  assert(!pdf.includes("exportedPdfPath"));
  assert(!pdf.includes("storagePath"));
  const filename = safePdfFilename("Ana Reyes Portfolio");
  assert(filename.startsWith("intellitrack-ana-reyes-portfolio-"));
  assert(filename.endsWith(".pdf"));
});

test("Company aggregate formulas are canonical and truthful",()=>{
  const rows=[
    {internProfileId:"i1",status:"ACTIVE",requiredHours:500,internProfile:{user:{isActive:true}},attendance:[{status:"APPROVED",reviewRequired:false,creditedMinutes:480},{status:"APPROVED",reviewRequired:false,creditedMinutes:420},{status:"PENDING_REVIEW",reviewRequired:true,creditedMinutes:0}],evaluations:[]},
    {internProfileId:"i2",status:"COMPLETED",requiredHours:400,internProfile:{user:{isActive:true}},attendance:[{status:"APPROVED",reviewRequired:false,creditedMinutes:600},{status:"VOIDED",reviewRequired:true,creditedMinutes:600}],evaluations:[{evaluationType:"FINAL",status:"SUBMITTED"}]},
  ];
  const report=calculateCompanyReport(rows);
  assert.equal(report.activeInternCount,1);
  assert.equal(report.renderedMinutes,1500);
  assert.equal(report.requiredMinutes,54000);
  assert.equal(report.eligibleAttendanceCount,4);
  assert.equal(report.exceptionCount,1);
  assert.equal(report.attendanceExceptionRate,25);
  assert.equal(report.finalEvaluationCompletionRate,100);
});

test("Company aggregate suppresses unknown required-hour denominator",()=>{
  const report=calculateCompanyReport([{internProfileId:"i1",status:"ACTIVE",requiredHours:null,internProfile:{user:{isActive:true}},attendance:[],evaluations:[]}]);
  assert.equal(report.requiredMinutes,null);
  assert.equal(report.missingRequiredHoursCount,1);
  assert.equal(report.attendanceExceptionRate,null);
  assert.equal(report.finalEvaluationCompletionRate,null);
});
