import { z } from "zod";
const optional=z.preprocess(v=>typeof v==="string"&&v.trim()===""?undefined:v,z.string().trim().max(5000).optional());
export const workLogInputSchema=z.object({workDate:z.string().date(),description:z.string().trim().min(1,"Describe what you worked on today.").max(20000),skillsApplied:z.string().trim().max(2000).optional().default(""),challenges:optional,learnings:optional});
export function normalizeSkills(value:string){return value.split(/[,\n]/).map(x=>x.trim()).filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i)}
export function workDateAllowed(date:string,start:Date,end:Date,now=new Date()){const value=new Date(`${date}T00:00:00.000Z`);const tomorrow=new Date(now);tomorrow.setUTCDate(tomorrow.getUTCDate()+1);return value>=start&&value<=end&&value<tomorrow}
export function canEditWorkLog(status:string){return status==="DRAFT"}export function canSubmitWorkLog(status:string){return status==="DRAFT"}
export const COMPLETED_WORK_LOG_STATUSES=["SUBMITTED","APPROVED"] as const;
export function isCompletedWorkLog(status:string){return COMPLETED_WORK_LOG_STATUSES.includes(status as typeof COMPLETED_WORK_LOG_STATUSES[number])}
export function generatedWorkLogTitle(workDate:string|Date){const date=typeof workDate==="string"?new Date(`${workDate}T00:00:00.000Z`):workDate;return `Daily Work Log — ${date.toLocaleDateString("en-PH",{dateStyle:"long",timeZone:"UTC"})}`.slice(0,255)}
export function workLogLabel(status:string){return status==="DRAFT"?"Draft":isCompletedWorkLog(status)?"Submitted":"Legacy record"}
export function attendanceContext(found:boolean){return found?"Attendance recorded for this date.":"No attendance found. You may still save or submit this work log."}
export function mapWorkLogError(error:unknown){return typeof error==="object"&&error!==null&&"code"in error&&(error as{code?:string}).code==="P2002"?"A Daily Work Log already exists for this date.":"The Daily Work Log could not be saved."}
