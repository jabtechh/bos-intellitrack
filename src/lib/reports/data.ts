import { prisma } from "@/lib/prisma";
import { internReportSelect } from "./select";

export { internReportSelect };

export type InternReportContext =
  | { kind:"INTERN"; profileId:string; user:{id:string} }
  | { kind:"SUPERVISOR"; profileId:string; user:{id:string} }
  | { kind:"COORDINATOR"; schoolId:string; user:{id:string} };

function reportForInternWhere(c:InternReportContext,internUserId:string){
  const scope = c.kind==="INTERN"
    ? { internProfileId:c.profileId }
    : c.kind==="SUPERVISOR"
      ? { supervisorProfileId:c.profileId }
      : { internProfile:{schoolId:c.schoolId} };
  return { AND:[scope,{internProfile:{userId:internUserId}}] };
}

export async function getInternReport(c: InternReportContext, internUserId: string, period: { from?: Date; to?: Date }, assignmentId?: string) {
  const date = period.from || period.to ? { gte: period.from, lte: period.to } : undefined;
  return prisma.internshipAssignment.findFirst({
    where: assignmentId ? { AND: [reportForInternWhere(c, internUserId), { id: assignmentId }] } : reportForInternWhere(c, internUserId),
    select: internReportSelect(c.kind, date),
  });
}

export function reportTotals(report: NonNullable<Awaited<ReturnType<typeof getInternReport>>>) {
  const creditedMinutes = report.attendance.reduce((sum, row) => row.status==="APPROVED"?sum + row.creditedMinutes:sum, 0);
  const requiredMinutes = report.requiredHours == null ? null : Number(report.requiredHours) * 60;
  return {
    creditedMinutes,
    requiredMinutes,
    remainingMinutes: requiredMinutes == null ? null : Math.max(0, requiredMinutes - creditedMinutes),
    exceptionCount: report.attendance.filter((x) => x.reviewRequired || ["PENDING_REVIEW", "REJECTED", "INCOMPLETE", "ABSENT"].includes(x.status)).length,
  };
}
