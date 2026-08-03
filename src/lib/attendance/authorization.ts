import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { prisma } from "@/lib/prisma";

export async function requireAttendanceReviewer() {
  const user=await requireCurrentUser();
  if(user.role==="ADMIN")return {user,kind:"ADMIN" as const,companyId:null};
  if(user.role==="SUPERVISOR"){const profile=await prisma.supervisorProfile.findUnique({where:{userId:user.id},select:{id:true,companyId:true}});if(profile)return {user,kind:"SUPERVISOR" as const,profileId:profile.id,companyId:profile.companyId};}
  if(user.role==="REPRESENTATIVE"){const profile=await prisma.representativeProfile.findUnique({where:{userId:user.id},select:{companyId:true}});if(profile)return {user,kind:"REPRESENTATIVE" as const,companyId:profile.companyId};}
  redirect("/dashboard");
}

export function reviewerAssignmentWhere(context: Awaited<ReturnType<typeof requireAttendanceReviewer>>) {
  if(context.kind==="ADMIN")return {};
  if(context.kind==="SUPERVISOR")return {supervisorProfileId:context.profileId};
  return {companyId:context.companyId};
}
