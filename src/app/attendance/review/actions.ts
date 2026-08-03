"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { rejectionRemarksValid } from "@/lib/attendance/domain";
import { requireAttendanceReviewer, reviewerAssignmentWhere } from "@/lib/attendance/authorization";
import { prisma } from "@/lib/prisma";

export type ReviewState={success:boolean;message:string};
export async function approveAttendance(_state:ReviewState,formData:FormData):Promise<ReviewState>{return decide(formData,"APPROVED")}
export async function rejectAttendance(_state:ReviewState,formData:FormData):Promise<ReviewState>{return decide(formData,"REJECTED")}
async function decide(formData:FormData,target:"APPROVED"|"REJECTED"):Promise<ReviewState>{
  const context=await requireAttendanceReviewer(); const id=z.string().uuid().safeParse(formData.get("attendanceId")); if(!id.success)return fail("Attendance record is invalid.");
  const raw=formData.get("remarks"); const remarks=typeof raw==="string"?raw.trim().slice(0,2000):""; if(target==="REJECTED"&&!rejectionRemarksValid(remarks))return fail("Review remarks are required when rejecting attendance.");
  const record=await prisma.attendance.findFirst({where:{id:id.data,status:"PENDING_REVIEW",assignment:reviewerAssignmentWhere(context)},select:{id:true,workedMinutes:true}}); if(!record)return fail("This attendance record is unavailable, outside your review scope, or already decided.");
  const result=await prisma.attendance.updateMany({where:{id:record.id,status:"PENDING_REVIEW",reviewedAt:null},data:{status:target,creditedMinutes:target==="APPROVED"?record.workedMinutes:0,reviewedById:context.user.id,reviewedAt:new Date(),reviewRemarks:remarks||null}});
  if(result.count!==1)return fail("Another reviewer has already decided this attendance record.");
  revalidatePath("/attendance/review");revalidatePath(`/attendance/review/${record.id}`);revalidatePath("/dashboard");return {success:true,message:`Attendance ${target.toLowerCase()} successfully.`};
}
function fail(message:string):ReviewState{return{success:false,message}}
