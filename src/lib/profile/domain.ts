import { z } from "zod";

const optionalText=(max:number)=>z.preprocess(value=>typeof value==="string"&&value.trim()===""?undefined:value,z.string().trim().max(max).optional());
export const profileInputSchema=z.object({
  firstName:z.string().trim().min(1,"First name is required.").max(100),
  middleName:optionalText(100),
  lastName:z.string().trim().min(1,"Last name is required.").max(100),
  suffix:optionalText(20),
  phoneNumber:optionalText(30).refine(value=>!value||/^[+\d][\d\s().-]{6,29}$/.test(value),"Enter a valid phone number."),
  bio:optionalText(1000),
});
export const emptyToNull=(value:string|undefined)=>value??null;
export function initials(firstName:string,lastName:string){return `${firstName[0]??""}${lastName[0]??""}`.toUpperCase()||"IT"}
