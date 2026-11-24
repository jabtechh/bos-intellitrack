import { z } from "zod";
import type { TaskPriority,TaskStatus,UserRole } from "@/generated/prisma/enums";
const optionalDate=z.preprocess(value=>typeof value==="string"&&value.trim()===""?undefined:value,z.string().regex(/^\d{4}-\d{2}-\d{2}$/,"Enter a valid date.").optional());
export const taskInputSchema=z.object({internUserId:z.string().uuid("Select an Intern."),title:z.string().trim().min(1,"Title is required.").max(255),description:z.string().trim().min(1,"Description is required.").max(10000),priority:z.enum(["LOW","MEDIUM","HIGH","URGENT"]),startDate:optionalDate,dueDate:optionalDate}).superRefine((x,c)=>{if(x.startDate&&x.dueDate&&x.dueDate<x.startDate)c.addIssue({code:"custom",path:["dueDate"],message:"Due date cannot be before the start date."})});
export const progressSchema=z.coerce.number().int().min(0).max(100);
export const completionNotesSchema=z.string().trim().min(1,"Completion notes are required before submission.").max(10000);
export const reviewRemarksSchema=z.string().trim().max(5000);
export const TASK_LABELS:Record<TaskStatus,string>={TODO:"Assigned",IN_PROGRESS:"In progress",BLOCKED:"Blocked (legacy)",SUBMITTED:"Submitted",REVISION_REQUESTED:"Revision requested (legacy)",COMPLETED:"Completed",CANCELLED:"Cancelled"};
export const PRIORITY_LABELS:Record<TaskPriority,string>={LOW:"Low",MEDIUM:"Normal",HIGH:"High",URGENT:"Urgent"};
const transitions:Record<TaskStatus,TaskStatus[]>={TODO:["IN_PROGRESS","CANCELLED"],IN_PROGRESS:["SUBMITTED","CANCELLED"],BLOCKED:[],SUBMITTED:["COMPLETED"],REVISION_REQUESTED:[],COMPLETED:[],CANCELLED:[]};
export function canTransition(from:TaskStatus,to:TaskStatus){return transitions[from].includes(to)}
export function canInternTransition(from:TaskStatus,to:TaskStatus){return (["TODO:IN_PROGRESS","IN_PROGRESS:SUBMITTED"] as string[]).includes(`${from}:${to}`)}
export function canSupervisorTransition(from:TaskStatus,to:TaskStatus){return (["TODO:CANCELLED","IN_PROGRESS:CANCELLED","SUBMITTED:COMPLETED"] as string[]).includes(`${from}:${to}`)}
export function isOverdue(task:{dueAt:Date|null;status:TaskStatus},now=new Date()){return Boolean(task.dueAt&&task.dueAt<now&&!(["COMPLETED","CANCELLED"] as TaskStatus[]).includes(task.status))}
export function taskScopeAllowed(role:UserRole,input:{owned?:boolean;assigned?:boolean;school?:boolean;company?:boolean}){if(role==="SUPERVISOR")return input.assigned===true;if(role==="INTERN")return input.owned===true;return false}
export function safeTaskError(){return"The task could not be updated. Refresh and try again."}
export function toTimestamp(value:string|undefined){return value?new Date(`${value}T00:00:00.000Z`):null}
