import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isReplaceable,reviewSchema,STATUS_LABELS } from "../src/lib/documents/domain";
import { documentPath,MAX_DOCUMENT_BYTES,validateDocumentFile } from "../src/lib/documents/storage";

const read=(p:string)=>readFileSync(p,"utf8");
const actions=read("src/app/documents/actions.ts");
const auth=read("src/lib/documents/authorization.ts");
const detail=read("src/app/(authenticated)/documents/[documentId]/page.tsx");
const newPage=read("src/app/(authenticated)/documents/new/page.tsx");
const manage=read("src/app/(authenticated)/documents/manage/page.tsx");
const file=(type:string,size=5,name="record.pdf")=>({type,size,name} as File);

test("document file validation remains safe",()=>{
  assert.equal(validateDocumentFile(file("application/pdf")),null);
  assert.match(validateDocumentFile(file("text/plain",5,"x.txt"))!,/PDF/);
  assert.match(validateDocumentFile(file("application/pdf",MAX_DOCUMENT_BYTES+1))!,/25 MB/);
  assert.match(validateDocumentFile(file("application/pdf",5,"x.png"))!,/extension/);
  const p=documentPath(crypto.randomUUID(),crypto.randomUUID(),"application/pdf");
  assert.match(p,/.pdf$/);
});

test("Intern upload is normal required-document path",()=>{
  assert.match(actions,/c.kind!=="INTERN"/);
  assert.match(actions,/status:"PENDING_REVIEW"/);
  assert.match(newPage,/Intern document submission/);
  assert.doesNotMatch(newPage,/uploadedById|assignmentId|storagePath/);
});

test("Representative alone manages reviews",()=>{
  assert.match(auth,/return c.kind === "REPRESENTATIVE"/);
  assert.match(manage,/Company Representative/);
  assert.match(actions,/canManageDocuments/);
  assert.doesNotMatch(auth,/role === "ADMIN"|kind === "ADMIN"/);
});

test("Supervisor and Coordinator are scoped read-only",()=>{
  assert.match(auth,/supervisorProfileId: c.profileId/);
  assert.match(auth,/schoolId: c.schoolId/);
  assert.match(auth,/IDENTIFICATION/);
  assert.match(auth,/MEDICAL_DOCUMENT/);
});

test("replacement lifecycle remains safe",()=>{
  assert(isReplaceable("PENDING_REVIEW"));
  assert(isReplaceable("REJECTED"));
  assert(!isReplaceable("APPROVED"));
  assert(!reviewSchema.safeParse({decision:"REJECTED",remarks:""}).success);
  assert(actions.includes("removeDocument(row.storagePath)"));
});

test("private storage path is not rendered",()=>{
  assert.match(detail,/signedDocument/);
  assert.doesNotMatch(detail,/{row.storagePath}/);
  assert.equal(STATUS_LABELS.REJECTED,"Needs replacement");
});
