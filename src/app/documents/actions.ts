"use server";
import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canManageDocuments, documentWhere, requireDocumentViewer } from "@/lib/documents/authorization";
import { documentInputSchema, extensionOf, isReplaceable, reviewSchema } from "@/lib/documents/domain";
import { documentPath, removeDocument, uploadDocument, validateDocumentFile } from "@/lib/documents/storage";

function fail(path:string,message:string):never{redirect(`${path}?error=${encodeURIComponent(message)}`)}
const refresh=(id?:string)=>{revalidatePath("/documents");revalidatePath("/documents/manage");revalidatePath("/dashboard");if(id)revalidatePath(`/documents/${id}`)};

export async function uploadInternshipDocument(formData:FormData){
  const c=await requireDocumentViewer();
  if(c.kind!=="INTERN")redirect("/documents");
  const parsed=documentInputSchema.safeParse(Object.fromEntries(formData.entries()));
  if(!parsed.success)fail("/documents/new",parsed.error.issues[0]?.message??"Review the document.");

  const assignment=await prisma.internshipAssignment.findFirst({where:{status:"ACTIVE",internProfileId:c.profileId},select:{id:true}});
  if(!assignment)fail("/documents/new","No active internship was found.");

  const value=formData.get("documentFile"),file=value instanceof File?value:null,fileError=validateDocumentFile(file);
  if(fileError||!file)fail("/documents/new",fileError??"Select a document file.");

  const id=randomUUID(),path=documentPath(assignment.id,id,file.type);
  try{await uploadDocument(path,file)}catch{fail("/documents/new","The document could not be stored.")}

  try{
    await prisma.document.create({data:{
      id,
      assignmentId:assignment.id,
      uploadedById:c.user.id,
      fileName:parsed.data.fileName,
      originalFileName:file.name.slice(0,255),
      storageBucket:"internship-documents",
      storagePath:path,
      mimeType:file.type,
      fileExtension:extensionOf(file.name),
      fileSizeBytes:BigInt(file.size),
      checksum:createHash("sha256").update(Buffer.from(await file.arrayBuffer())).digest("hex"),
      category:parsed.data.category,
      description:parsed.data.description||null,
      status:"PENDING_REVIEW",
      reviewedById:null,
      reviewedAt:null,
      reviewRemarks:null,
    }});
  }catch{
    await removeDocument(path);
    fail("/documents/new","The document record could not be saved.");
  }

  refresh(id);redirect(`/documents/${id}`);
}

export async function replaceDocument(formData:FormData){
  const c=await requireDocumentViewer();
  if(c.kind!=="INTERN")redirect("/documents");
  const id=String(formData.get("documentId"));
  const row=await prisma.document.findFirst({where:{id,uploadedById:c.user.id,assignment:{internProfileId:c.profileId}},select:{assignmentId:true,status:true,storagePath:true}});
  if(!row||!isReplaceable(row.status))redirect("/documents");
  const value=formData.get("documentFile"),file=value instanceof File?value:null,error=validateDocumentFile(file);
  if(error||!file)fail(`/documents/${id}/edit`,error??"Select a document file.");
  const path=documentPath(row.assignmentId,id,file.type);
  try{await uploadDocument(path,file)}catch{fail(`/documents/${id}/edit`,"The replacement file could not be stored.")}
  try{
    const result=await prisma.document.updateMany({where:{id,status:row.status,uploadedById:c.user.id},data:{
      originalFileName:file.name.slice(0,255),
      storagePath:path,
      mimeType:file.type,
      fileExtension:extensionOf(file.name),
      fileSizeBytes:BigInt(file.size),
      checksum:createHash("sha256").update(Buffer.from(await file.arrayBuffer())).digest("hex"),
      versionNumber:{increment:1},
      status:"PENDING_REVIEW",
      reviewedById:null,
      reviewedAt:null,
      reviewRemarks:null,
    }});
    if(result.count!==1)throw new Error("stale");
  }catch{
    await removeDocument(path);
    fail(`/documents/${id}/edit`,"The document changed before replacement. Refresh and try again.");
  }
  await removeDocument(row.storagePath);
  refresh(id);redirect(`/documents/${id}`);
}

export async function reviewDocument(formData:FormData){
  const c=await requireDocumentViewer();
  if(!canManageDocuments(c))redirect("/documents");
  const id=String(formData.get("documentId")),parsed=reviewSchema.safeParse(Object.fromEntries(formData.entries()));
  if(!parsed.success)fail(`/documents/${id}`,parsed.error.issues[0]?.message??"Review the decision.");
  const result=await prisma.document.updateMany({
    where:{id,status:"PENDING_REVIEW",...documentWhere(c)},
    data:{status:parsed.data.decision,reviewedById:c.user.id,reviewedAt:new Date(),reviewRemarks:parsed.data.remarks||null},
  });
  if(result.count!==1)fail(`/documents/${id}`,"This document is outside your scope or already reviewed.");
  refresh(id);redirect(`/documents/${id}`);
}

export async function archiveDocument(formData:FormData){
  const c=await requireDocumentViewer();
  if(!canManageDocuments(c))redirect("/documents");
  const id=String(formData.get("documentId"));
  const result=await prisma.document.updateMany({where:{id,status:{not:"ARCHIVED"},...documentWhere(c)},data:{status:"ARCHIVED",archivedAt:new Date()}});
  if(result.count!==1)redirect("/documents/manage");
  refresh(id);redirect("/documents/manage");
}
