import { selectRepresentativeEvaluations } from "./evaluation-selection";
import { evaluationPeriodLabel } from "@/lib/evaluations/weekly-period";

type Report={
  requiredHours:number|null;
  internProfile:{user:{firstName:string;lastName:string}};
  supervisorProfile:{user:{firstName:string;lastName:string}};
  attendance:{creditedMinutes:number;reviewRequired:boolean;status:string}[];
  workLogs:{workDate:Date;title:string;description:string;skillsApplied:unknown}[];
  tasks:{completedAt:Date|null;title:string;description:string|null}[];
  evaluations:{evaluationDate:Date;evaluationType:"INITIAL"|"MIDTERM"|"PROGRESS"|"FINAL";periodKey:string;periodStart:Date|null;periodEnd:Date|null;overallScore:unknown;strengths:string|null;areasForImprovement:string|null;comments:string|null}[];
  feedback:{createdAt:Date;title:string|null;content:string;author:{role:string}}[];
  documents:{createdAt:Date;category:string;fileName:string;description:string|null}[];
};

const mailPattern=/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const uuid=/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const url=/https?:\/\/\S+/gi;
const mobilePattern=/(?<!\d)(?:\+?63|0)?9\d{9}(?!\d)/g;

export function redactText(value:string,names:string[]=[]){
  let out=value.replace(mailPattern,"[redacted]").replace(uuid,"[redacted]").replace(url,"[redacted]").replace(mobilePattern,"[redacted]");
  for(const name of names.filter(x=>x.trim().length>1).sort((a,b)=>b.length-a.length)){
    const escaped=name.replace(/[.*+?^$()|[\]\\{}]/g,"\\$&");
    out=out.replace(new RegExp(escaped,"gi"),"the Intern");
  }
  return out.slice(0,1200);
}

export function buildAiEvidence(r:Report){
  const creditedMinutes=r.attendance.reduce((sum,x)=>sum+x.creditedMinutes,0);
  const requiredMinutes=r.requiredHours==null?null:r.requiredHours*60;
  const remainingMinutes=requiredMinutes==null?null:Math.max(0,requiredMinutes-creditedMinutes);
  const exceptionCount=r.attendance.filter(x=>x.reviewRequired||["PENDING_REVIEW","REJECTED","INCOMPLETE","ABSENT"].includes(x.status)).length;
  const names=[
    r.internProfile.user.firstName,
    r.internProfile.user.lastName,
    r.internProfile.user.firstName+" "+r.internProfile.user.lastName,
    r.supervisorProfile.user.firstName,
    r.supervisorProfile.user.lastName,
  ];
  const clean=(x:string|null|undefined)=>x?redactText(x,names):null;
  const categories:string[]=[];
  if(r.attendance.length)categories.push("approved attendance");
  if(r.workLogs.length)categories.push("submitted Work Logs");
  if(r.tasks.length)categories.push("completed Tasks");
  if(r.evaluations.length)categories.push("finalized Evaluations");
  if(r.feedback.some(x=>x.author.role==="INTERN"))categories.push("authorized workmate Feedback");
  if(r.feedback.some(x=>x.author.role==="SUPERVISOR"))categories.push("Supervisor coaching");
  if(r.documents.length)categories.push("approved Document metadata");

  return{
    subject:"the Intern",
    hours:{
      required:requiredMinutes==null?null:requiredMinutes/60,
      credited:creditedMinutes/60,
      remaining:remainingMinutes==null?null:remainingMinutes/60,
    },
    attendance:{eligibleRecords:r.attendance.length,exceptions:exceptionCount},
    workLogs:r.workLogs.slice(0,25).map(x=>({
      date:x.workDate.toISOString().slice(0,10),
      title:clean(x.title),
      summary:clean(x.description),
      explicitSkills:Array.isArray(x.skillsApplied)?x.skillsApplied.filter((v):v is string=>typeof v==="string").slice(0,12):[],
    })),
    tasks:r.tasks.slice(0,25).map(x=>({
      completed:x.completedAt?.toISOString().slice(0,10)??null,
      title:clean(x.title),
      summary:clean(x.description),
    })),
    evaluationCoverage:{finalizedRecords:r.evaluations.length,includedRecords:Math.min(10,r.evaluations.length)},
    evaluations:selectRepresentativeEvaluations(r.evaluations,10).map(x=>({
      date:x.evaluationDate.toISOString().slice(0,10),
      type:x.evaluationType.toLowerCase().replaceAll("_"," "),
      period:evaluationPeriodLabel(x).label,
      legacyPeriodNote:evaluationPeriodLabel(x).note,
      score:x.overallScore==null?null:Number(x.overallScore),
      strengths:clean(x.strengths),
      areasForAttention:clean(x.areasForImprovement),
      remarks:clean(x.comments),
    })),
    feedback:r.feedback.slice(0,20).map(x=>({
      date:x.createdAt.toISOString().slice(0,10),
      source:x.author.role==="INTERN"?"workmate":x.author.role==="SUPERVISOR"?"supervisor":"authorized",
      title:clean(x.title),
      content:clean(x.content),
    })),
    documents:r.documents.slice(0,20).map(x=>({
      date:x.createdAt.toISOString().slice(0,10),
      category:x.category.toLowerCase().replaceAll("_"," "),
      title:clean(x.fileName),
      description:clean(x.description),
    })),
    categories,
  };
}

export function evidenceJson(evidence:ReturnType<typeof buildAiEvidence>){
  const value=JSON.stringify(evidence);
  if(value.length>30000)throw new Error("SOURCE_TOO_LARGE");
  return value;
}
