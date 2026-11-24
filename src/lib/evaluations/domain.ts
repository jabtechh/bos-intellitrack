import { z } from "zod";
import { isDateOnly } from "./weekly-period";
import type { EvaluationStatus,EvaluationType,FeedbackType,FeedbackVisibility,UserRole } from "@/generated/prisma/enums";
export const EVALUATION_LABELS:Record<EvaluationStatus,string>={DRAFT:"Draft",SUBMITTED:"Finalized",ACKNOWLEDGED:"Acknowledged",VOIDED:"Voided"};
export const TYPE_LABELS:Record<EvaluationType,string>={INITIAL:"Initial",MIDTERM:"Midterm",PROGRESS:"Progress",FINAL:"Final"};
export const FEEDBACK_TYPE_LABELS:Record<FeedbackType,string>={GENERAL:"General feedback",PRAISE:"Recognition",IMPROVEMENT:"Improvement guidance",TASK_RELATED:"Task feedback",ATTENDANCE_RELATED:"Attendance feedback",PERFORMANCE:"Performance feedback"};
export const VISIBILITY_LABELS:Record<FeedbackVisibility,string>={INTERN_AND_STAFF:"Intern and authorized staff",STAFF_ONLY:"Authorized staff only",INTERN_ONLY:"Intern only"};
const date=z.string().refine(isDateOnly,"Enter a valid date.");
export const evaluationInputSchema=z.object({internUserId:z.string().uuid(),evaluationType:z.enum(["INITIAL","MIDTERM","PROGRESS","FINAL"]),evaluationDate:date,periodStart:z.string().optional(),periodEnd:z.string().optional(),overallScore:z.coerce.number().min(0).max(100),strengths:z.string().trim().min(1).max(10000),areasForImprovement:z.string().trim().min(1).max(10000),comments:z.string().trim().min(1).max(10000)}).superRefine((x,c)=>{if(x.evaluationType==="PROGRESS")return;if(x.periodStart&&!date.safeParse(x.periodStart).success)c.addIssue({code:"custom",path:["periodStart"],message:"Enter a valid period start."});if(x.periodEnd&&!date.safeParse(x.periodEnd).success)c.addIssue({code:"custom",path:["periodEnd"],message:"Enter a valid period end."});if(x.periodStart&&x.periodEnd&&x.periodEnd<x.periodStart)c.addIssue({code:"custom",path:["periodEnd"],message:"Period end cannot be before its start."})});
export const criterionSchema=z.object({criterion:z.string().trim().min(1).max(200),rating:z.coerce.number().int().min(1).max(5)});
export function parseCriteria(data:FormData){const names=data.getAll("criterion"),ratings=data.getAll("rating");return z.array(criterionSchema).min(1,"Add at least one evaluation criterion.").max(10).safeParse(names.map((criterion,i)=>({criterion,rating:ratings[i]})))}
export function criteriaFromJson(value:unknown){const parsed=z.array(criterionSchema).safeParse(value);return parsed.success?parsed.data:[]}
export function isFinalized(status:EvaluationStatus){return status==="SUBMITTED"||status==="ACKNOWLEDGED"}
export function canSeeDraft(role:UserRole){return role==="SUPERVISOR"||role==="REPRESENTATIVE"||role==="ADMIN"}
export const feedbackInputSchema=z.object({internUserId:z.string().uuid(),feedbackType:z.enum(["GENERAL","PRAISE","IMPROVEMENT","TASK_RELATED","ATTENDANCE_RELATED","PERFORMANCE"]),visibility:z.enum(["INTERN_AND_STAFF","STAFF_ONLY","INTERN_ONLY"]),title:z.string().trim().max(255).optional(),content:z.string().trim().min(1).max(10000)});
export const asDate=(x:string|undefined)=>x?new Date(`${x}T00:00:00.000Z`):null;
