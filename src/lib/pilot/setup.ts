import { randomBytes } from "node:crypto";

export const PILOT_CONFIRMATION="ALLOW_LOCAL_PILOT_CREATION";
export const PILOT_SCHOOL_CODE="PILOT-SCHOOL";
export const PILOT_ROLES=["coordinator","supervisor","intern"] as const;
export type PilotRole=(typeof PILOT_ROLES)[number];

export function validatePilotEnvironment(environment:Record<string,string|undefined>){if(environment.NODE_ENV==="production")throw new Error("Pilot setup is disabled in production.");for(const name of ["SUPABASE_SECRET_KEY","NEXT_PUBLIC_SUPABASE_URL","DATABASE_URL"] as const)if(!environment[name])throw new Error(`Pilot setup is not configured: ${name} is missing.`);if(environment.INTELLITRACK_PILOT_SETUP!==PILOT_CONFIRMATION)throw new Error("Pilot setup confirmation is missing.")}
export function pilotEmail(role:PilotRole,domain=process.env.INTELLITRACK_PILOT_EMAIL_DOMAIN?.trim()||"example.test"){return `intellitrack-${role}@${domain}`}
export function securePilotPassword(){return `${randomBytes(24).toString("base64url")}Aa1!`}
export function pilotDates(now=new Date()){const start=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()-7));const end=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+90));return{start,end}}
export function shouldCompensateAuth(created:boolean){return created}
export function cleanupAllowed(input:{attendance:number;corrections:number}){return input.attendance===0&&input.corrections===0}
