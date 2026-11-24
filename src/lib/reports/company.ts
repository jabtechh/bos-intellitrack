type CompanyReportRow = {
  internProfileId:string;
  status:string;
  requiredHours:number|null;
  internProfile:{user:{isActive:boolean}};
  attendance:{status:string;reviewRequired:boolean;creditedMinutes:number}[];
  evaluations:{evaluationType:string;status:string}[];
};

export function calculateCompanyReport(rows:CompanyReportRow[]){
  const activeInternCount = new Set(rows.filter(row=>row.status==="ACTIVE"&&row.internProfile.user.isActive).map(row=>row.internProfileId)).size;
  const hoursRows=rows.filter(row=>row.status==="ACTIVE"||row.status==="COMPLETED");
  const renderedMinutes=hoursRows.reduce((sum,row)=>sum+row.attendance.reduce((a,x)=>x.status==="APPROVED"?a+x.creditedMinutes:a,0),0);
  const missingRequiredHoursCount=hoursRows.filter(row=>row.requiredHours==null).length;
  const requiredMinutes=hoursRows.reduce((sum,row)=>sum+(row.requiredHours??0)*60,0);
  const attendanceRows=hoursRows.flatMap(row=>row.attendance).filter(row=>row.status!=="VOIDED");
  const exceptionCount=attendanceRows.filter(row=>row.reviewRequired||["PENDING_REVIEW","REJECTED","INCOMPLETE","ABSENT"].includes(row.status)).length;
  const attendanceExceptionRate=attendanceRows.length?exceptionCount/attendanceRows.length*100:null;
  const completed=rows.filter(row=>row.status==="COMPLETED");
  const finalCompleted=completed.filter(row=>row.evaluations.some(e=>e.evaluationType==="FINAL"&&["SUBMITTED","ACKNOWLEDGED"].includes(e.status))).length;
  const finalEvaluationCompletionRate=completed.length?finalCompleted/completed.length*100:null;
  const internshipStatusCounts={PENDING:0,ACTIVE:0,COMPLETED:0,CANCELLED:0,TERMINATED:0} as Record<string,number>;
  rows.forEach(row=>{if(row.status in internshipStatusCounts)internshipStatusCounts[row.status]+=1});
  return {
    activeInternCount,
    renderedMinutes,
    requiredMinutes:missingRequiredHoursCount?null:requiredMinutes,
    knownRequiredMinutes:requiredMinutes,
    missingRequiredHoursCount,
    eligibleAttendanceCount:attendanceRows.length,
    exceptionCount,
    attendanceExceptionRate,
    completedInternships:completed.length,
    finalEvaluationsCompleted:finalCompleted,
    finalEvaluationCompletionRate,
    internshipStatusCounts,
  };
}

export async function getCompanyReport(companyId:string){
  const { prisma } = await import("@/lib/prisma");
  const rows=await prisma.internshipAssignment.findMany({
    where:{companyId},
    select:{
      internProfileId:true,
      status:true,
      requiredHours:true,
      internProfile:{select:{user:{select:{isActive:true}}}},
      attendance:{select:{status:true,reviewRequired:true,creditedMinutes:true}},
      evaluations:{select:{evaluationType:true,status:true}},
    },
  });
  return calculateCompanyReport(rows);
}

export function hoursLabel(minutes:number|null){
  if(minutes==null)return"Not available";
  const hours=minutes/60;
  return Number.isInteger(hours)?String(hours):hours.toFixed(1);
}

export function rateLabel(rate:number|null){
  return rate==null?"Not available":`${Math.round(rate)}%`;
}
