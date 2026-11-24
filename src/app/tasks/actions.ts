"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTaskViewer, requireSupervisorTaskContext } from "@/lib/tasks/authorization";
import { canInternTransition, canSupervisorTransition, completionNotesSchema, progressSchema, reviewRemarksSchema, safeTaskError, taskInputSchema, toTimestamp } from "@/lib/tasks/domain";
import { removeTaskEvidence, taskEvidencePath, uploadTaskEvidence, validateTaskEvidence } from "@/lib/tasks/storage";

const taskReturn=(path:string,message:string)=>`${path}?error=${encodeURIComponent(message)}`;
function refresh(id?:string){revalidatePath("/tasks");revalidatePath("/tasks/review");revalidatePath("/reviews");revalidatePath("/dashboard");if(id)revalidatePath(`/tasks/${id}`)}

export async function createTask(formData:FormData){
  const c=await requireSupervisorTaskContext();
  const parsed=taskInputSchema.safeParse(Object.fromEntries(formData.entries()));
  if(!parsed.success)redirect(taskReturn("/tasks/new",parsed.error.issues[0]?.message??"Review the task."));
  const assignment=await prisma.internshipAssignment.findFirst({where:{status:"ACTIVE",supervisorProfileId:c.profileId,internProfile:{userId:parsed.data.internUserId,user:{isActive:true}}},select:{id:true}});
  if(!assignment)redirect(taskReturn("/tasks/new","Select an assigned active Intern."));
  const task=await prisma.task.create({data:{id:randomUUID(),assignmentId:assignment.id,assignedById:c.user.id,title:parsed.data.title,description:parsed.data.description,priority:parsed.data.priority,startAt:toTimestamp(parsed.data.startDate),dueAt:toTimestamp(parsed.data.dueDate)}});
  refresh(task.id);redirect(`/tasks/${task.id}`);
}

export async function updateTask(formData:FormData){
  const c=await requireSupervisorTaskContext(),id=String(formData.get("taskId"));
  const parsed=taskInputSchema.safeParse(Object.fromEntries(formData.entries()));
  if(!parsed.success)redirect(taskReturn(`/tasks/${id}/edit`,parsed.error.issues[0]?.message??"Review the task."));
  const assignment=await prisma.internshipAssignment.findFirst({where:{status:"ACTIVE",supervisorProfileId:c.profileId,internProfile:{userId:parsed.data.internUserId,user:{isActive:true}}},select:{id:true}});
  if(!assignment)redirect("/tasks");
  const result=await prisma.task.updateMany({where:{id,assignedById:c.user.id,status:"TODO",assignment:{supervisorProfileId:c.profileId}},data:{assignmentId:assignment.id,title:parsed.data.title,description:parsed.data.description,priority:parsed.data.priority,startAt:toTimestamp(parsed.data.startDate),dueAt:toTimestamp(parsed.data.dueDate)}});
  if(result.count!==1)redirect("/tasks");refresh(id);redirect(`/tasks/${id}`);
}

export async function saveTaskProgress(formData:FormData){
  const c=await requireTaskViewer();if(c.kind!=="INTERN")redirect("/tasks");
  const id=String(formData.get("taskId"));
  const task=await prisma.task.findFirst({where:{id,assignment:{internProfileId:c.profileId}},select:{assignmentId:true,status:true,completionEvidencePath:true}});
  if(!task||task.status!=="IN_PROGRESS")redirect("/tasks");
  const progress=progressSchema.safeParse(formData.get("progressPercentage"));
  if(!progress.success)redirect(taskReturn(`/tasks/${id}`,"Progress must be from 0 to 100."));
  const notes=String(formData.get("completionNotes")??"").trim().slice(0,10000)||null;
  const fileValue=formData.get("completionEvidence"),file=fileValue instanceof File&&fileValue.size?fileValue:null,fileError=validateTaskEvidence(file);
  if(fileError)redirect(taskReturn(`/tasks/${id}`,fileError));
  let path:string|null=null;
  if(file){path=taskEvidencePath(task.assignmentId,id,file.type);try{await uploadTaskEvidence(path,file)}catch{redirect(taskReturn(`/tasks/${id}`,"The evidence file could not be stored."))}}
  try{await prisma.task.update({where:{id},data:{progressPercentage:progress.data,completionNotes:notes,...(path?{completionEvidencePath:path}:{})}})}
  catch{if(path)await removeTaskEvidence(path);redirect(taskReturn(`/tasks/${id}`,safeTaskError()))}
  if(path&&task.completionEvidencePath)await removeTaskEvidence(task.completionEvidencePath);
  refresh(id);redirect(`/tasks/${id}`);
}

export async function transitionInternTask(formData:FormData){
  const c=await requireTaskViewer();if(c.kind!=="INTERN")redirect("/tasks");
  const id=String(formData.get("taskId")),intent=String(formData.get("intent"));
  const task=await prisma.task.findFirst({where:{id,assignment:{internProfileId:c.profileId}},select:{status:true,completionNotes:true}});
  if(!task)redirect("/tasks");
  const target=intent==="start"?"IN_PROGRESS":intent==="submit"?"SUBMITTED":null;
  if(!target||!canInternTransition(task.status,target))redirect("/tasks");
  if(target==="SUBMITTED"&&!completionNotesSchema.safeParse(task.completionNotes).success)redirect(taskReturn(`/tasks/${id}`,"Add completion notes before submission."));
  const result=await prisma.task.updateMany({where:{id,status:task.status,assignment:{internProfileId:c.profileId}},data:{status:target,submittedAt:target==="SUBMITTED"?new Date():null,reviewedAt:null,reviewedById:null,reviewRemarks:null}});
  if(result.count!==1)redirect(taskReturn(`/tasks/${id}`,safeTaskError()));
  refresh(id);redirect(`/tasks/${id}`);
}

export async function reviewTask(formData:FormData){
  const c=await requireSupervisorTaskContext(),id=String(formData.get("taskId"));
  const remarks=reviewRemarksSchema.safeParse(formData.get("reviewRemarks"));
  if(!remarks.success)redirect(taskReturn(`/tasks/review/${id}`,"Review remarks are too long."));
  if(!canSupervisorTransition("SUBMITTED","COMPLETED"))redirect("/tasks/review");
  const result=await prisma.task.updateMany({where:{id,status:"SUBMITTED",assignment:{supervisorProfileId:c.profileId}},data:{status:"COMPLETED",reviewedById:c.user.id,reviewedAt:new Date(),reviewRemarks:remarks.data||null,completedAt:new Date(),progressPercentage:100}});
  if(result.count!==1)redirect("/tasks/review");
  refresh(id);redirect(`/tasks/${id}`);
}

export async function cancelTask(formData:FormData){
  const c=await requireSupervisorTaskContext(),id=String(formData.get("taskId"));
  const task=await prisma.task.findFirst({where:{id,assignedById:c.user.id,assignment:{supervisorProfileId:c.profileId}},select:{status:true}});
  if(!task||!canSupervisorTransition(task.status,"CANCELLED"))redirect("/tasks");
  const result=await prisma.task.updateMany({where:{id,status:task.status,assignment:{supervisorProfileId:c.profileId}},data:{status:"CANCELLED",cancelledAt:new Date()}});
  if(result.count!==1)redirect(taskReturn(`/tasks/${id}`,safeTaskError()));
  refresh(id);redirect(`/tasks/${id}`);
}
