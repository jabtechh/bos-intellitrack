export type HolidayCandidate={date:string;name:string;type:"REGULAR"|"SPECIAL_NON_WORKING"|"SPECIAL_WORKING";sourceReference:string};
export interface PhilippineHolidayProvider{fetch(year:number):Promise<HolidayCandidate[]>}
export class UnconfiguredHolidayProvider implements PhilippineHolidayProvider{async fetch():Promise<HolidayCandidate[]>{throw new Error("No verified government holiday provider is configured.")}}
export async function safelyFetchHolidayCandidates(provider:PhilippineHolidayProvider,year:number){try{return{items:await provider.fetch(year),error:null}}catch{return{items:[] as HolidayCandidate[],error:"Holiday import is unavailable. Add verified holidays manually or configure the government-source provider."}}}
