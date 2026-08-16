import {z} from "zod";
import type {AnnouncementAudience,CalendarEventType,HolidayType} from "@/generated/prisma/enums";
export type CalendarItemType="attendance"|"schedule"|"holiday"|"event"|"task"|"evaluation"|"milestone";
export type CalendarItem={key:string;date:string;type:CalendarItemType;title:string;startTime?:string;endTime?:string;detail?:string;href?:string;status?:string};
export const EVENT_TYPE_LABELS:Record<CalendarEventType,string>={ORIENTATION:"Orientation",SEMINAR:"Seminar",MEETING:"Meeting",TRAINING:"Training",COMPANY_ACTIVITY:"Company activity",OTHER:"Company event"};
export const HOLIDAY_TYPE_LABELS:Record<HolidayType,string>={REGULAR:"Regular holiday",SPECIAL_NON_WORKING:"Special non-working holiday",SPECIAL_WORKING:"Special working holiday",LOCAL:"Local holiday"};
export const CALENDAR_AUDIENCES:AnnouncementAudience[]=["ALL_USERS","INTERNS","SUPERVISORS","COORDINATORS","REPRESENTATIVES","ADMINISTRATORS"];
const optional=z.preprocess(v=>typeof v==="string"&&v.trim()===""?undefined:v,z.string().trim().optional());
export const eventInputSchema=z.object({title:z.string().trim().min(1).max(255),description:optional,eventDate:z.string().date(),startTime:optional.refine(v=>!v||/^([01]\d|2[0-3]):[0-5]\d$/.test(v),"Enter a valid start time."),endTime:optional.refine(v=>!v||/^([01]\d|2[0-3]):[0-5]\d$/.test(v),"Enter a valid end time."),location:optional,audience:z.enum(CALENDAR_AUDIENCES as [AnnouncementAudience,...AnnouncementAudience[]]),eventType:z.enum(["ORIENTATION","SEMINAR","MEETING","TRAINING","COMPANY_ACTIVITY","OTHER"])}).refine(v=>!v.startTime||!v.endTime||v.endTime>v.startTime,{path:["endTime"],message:"End time must be after start time."});
export const holidayInputSchema=z.object({name:z.string().trim().min(1).max(255),holidayDate:z.string().date(),holidayType:z.enum(["REGULAR","SPECIAL_NON_WORKING","SPECIAL_WORKING","LOCAL"]),scope:z.enum(["NATIONAL","LOCAL","COMPANY"]),locality:optional,sourceReference:optional});
export function itemsForDate(items:CalendarItem[],date:string){return items.filter(item=>item.date===date)}
export function visibleItems(items:CalendarItem[],filter:string){if(filter==="attendance")return items.filter(x=>x.type==="attendance");if(filter==="schedule")return items.filter(x=>x.type==="schedule"||x.type==="milestone");if(filter==="events")return items.filter(x=>x.type==="event"||x.type==="holiday");if(filter==="deadlines")return items.filter(x=>x.type==="task"||x.type==="evaluation");return items}
export function overflowCount(items:CalendarItem[],limit:number){return Math.max(0,items.length-limit)}
