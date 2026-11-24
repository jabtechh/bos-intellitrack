"use server";
/* The previous action state is part of React's Server Action signature. */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { getInternReport } from "@/lib/reports/data";
import { reportPeriod } from "@/lib/reports/domain";
import { requirePortfolioViewer } from "@/lib/portfolio/authorization";
import { getPortfolioSource } from "@/lib/portfolio/source";
import { requireSupervisorEvaluationContext } from "@/lib/evaluations/authorization";
import { prisma } from "@/lib/prisma";
import { buildAiEvidence, evidenceJson } from "@/lib/ai/evidence";
import { generateGroundedDraft, generateGroundedPortfolioDraft } from "@/lib/ai/gemini";
import { aiFailure } from "@/lib/ai/result";
import type { AiState, PortfolioAiState } from "@/lib/ai/domain";

const recent=new Map<string,number>();

function limited(key:string){
  const now=Date.now(),last=recent.get(key)??0;
  recent.set(key,now);
  return now-last<10000;
}

async function run(
  feature:"progress"|"reflection"|"evaluation",
  report:NonNullable<Awaited<ReturnType<typeof getInternReport>>>,
  key:string,
  period:string,
):Promise<AiState>{
  if(limited(key))return{status:"rate_limited",message:"Please wait a few seconds before generating another draft."};
  try{
    const evidence=buildAiEvidence(report),draft=await generateGroundedDraft({feature,evidence:evidenceJson(evidence)});
    return{status:"success",draft,categories:evidence.categories,period};
  }catch(error){
    return aiFailure(error);
  }
}

export async function generateProgressSummary(_:AiState,formData:FormData):Promise<AiState>{
  const c=await requirePortfolioViewer();
  const internId=String(formData.get("internId")??""),from=String(formData.get("from")??""),to=String(formData.get("to")??"");
  const period=reportPeriod({from,to});
  if("error"in period)return{status:"invalid",message:period.error};
  const report=await getInternReport(c,internId,period);
  if(!report)return{status:"unavailable",message:"This report is outside your authorized scope."};
  return run("progress",report,c.user.id+":progress:"+internId,(from||"internship start")+" to "+(to||"present"));
}

export async function generateReflectionDraft(_:AiState):Promise<AiState>{
  const c=await requirePortfolioViewer();
  const source=await getPortfolioSource(c);
  if(!source)return{status:"unavailable",message:"No authorized internship record is available."};
  return run("reflection",source.report,c.user.id+":reflection","full internship record");
}

export async function generatePortfolioDraft(_:PortfolioAiState,formData:FormData):Promise<PortfolioAiState>{
  const c=await requirePortfolioViewer();
  if(limited(c.user.id+":portfolio"))return{status:"rate_limited",message:"Please wait a few seconds before generating another Portfolio draft."};
  // The assignment ID is only a candidate; getPortfolioSource re-authorizes it for this Intern (DEC-2026-020).
  const candidate=formData.get("assignmentId");
  const source=await getPortfolioSource(c,typeof candidate==="string"&&candidate?candidate:null);
  if(!source)return{status:"unavailable",message:"No authorized internship record is available."};
  try{
    const evidence=buildAiEvidence(source.report);
    const draft=await generateGroundedPortfolioDraft({evidence:evidenceJson(evidence)});
    return{status:"success",draft,categories:evidence.categories,period:"full internship record"};
  }catch(error){
    const failure=aiFailure(error);
    return{status:failure.status,message:failure.message};
  }
}

export async function generateEvaluationDraft(_:AiState,formData:FormData):Promise<AiState>{
  const c=await requireSupervisorEvaluationContext(),evaluationId=String(formData.get("evaluationId")??"");
  const evaluation=await prisma.evaluation.findFirst({
    where:{id:evaluationId,status:"DRAFT",evaluatorId:c.user.id,assignment:{supervisorProfileId:c.profileId}},
    select:{periodStart:true,periodEnd:true,assignment:{select:{internProfile:{select:{userId:true}}}}},
  });
  if(!evaluation)return{status:"unavailable",message:"Only your directly supervised draft evaluation can use this assistant."};
  const reportContext={...c,kind:"SUPERVISOR" as const};
  const period={from:evaluation.periodStart??undefined,to:evaluation.periodEnd??undefined};
  const report=await getInternReport(reportContext,evaluation.assignment.internProfile.userId,period);
  if(!report)return{status:"unavailable",message:"No authorized evidence is available."};
  return run(
    "evaluation",
    report,
    c.user.id+":evaluation:"+evaluationId,
    (evaluation.periodStart?.toISOString().slice(0,10)??"internship start")+" to "+(evaluation.periodEnd?.toISOString().slice(0,10)??"present"),
  );
}
