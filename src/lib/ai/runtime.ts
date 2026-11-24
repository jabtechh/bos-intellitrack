import { parseAiDraft, type AiDraft } from "./domain";

export type Generate=(input:{apiKey:string;model:string;prompt:string;signal:AbortSignal})=>Promise<{text?:string;blocked?:boolean}>;

export async function runStructuredGeminiRequest<T>(
  input:{apiKey:string;model:string;prompt:string;timeoutMs?:number},
  generate:Generate,
  parse:(text:string|undefined)=>T,
):Promise<T>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),input.timeoutMs??15000);
  try{
    const result=await generate({...input,signal:controller.signal});
    if(result.blocked)throw new Error("SAFETY_BLOCK");
    return parse(result.text);
  }catch(error){
    if(controller.signal.aborted)throw new Error("AI_TIMEOUT");
    if(error instanceof Error&&["SAFETY_BLOCK","EMPTY_OUTPUT","MALFORMED_OUTPUT","SOURCE_TOO_LARGE"].includes(error.message))throw error;
    const status=typeof error==="object"&&error&&"status"in error?Number((error as{status?:unknown}).status):0;
    if(status===429)throw new Error("AI_RATE_LIMIT");
    throw new Error("AI_UNAVAILABLE");
  }finally{
    clearTimeout(timer);
  }
}

export async function runGeminiRequest(
  input:{apiKey:string;model:string;prompt:string;timeoutMs?:number},
  generate:Generate,
):Promise<AiDraft>{
  return runStructuredGeminiRequest(input,generate,parseAiDraft);
}
