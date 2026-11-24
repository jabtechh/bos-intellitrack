import "server-only";
import { GoogleGenAI } from "@google/genai";
import { aiJsonSchema, portfolioAiJsonSchema, type AiDraft, type PortfolioAiDraft } from "./domain";
import { parsePortfolioAiDraft } from "./domain";
import { runGeminiRequest, runStructuredGeminiRequest, type Generate } from "./runtime";

const SYSTEM='You produce a grounded IntelliTrack draft from only the supplied authorized records. Refer to the person only as "the Intern". Never invent achievements, skills, causes, ratings, percentages, recommendations, or missing facts. Put uncertainties and missing evidence in sourceLimitations. Do not make disciplinary, hiring, termination, medical, or academic decisions. Do not expose raw enum values. Every statement must be supported by supplied records.';

function sdk(schema:typeof aiJsonSchema|typeof portfolioAiJsonSchema):Generate {
  return async({apiKey,model,prompt,signal})=>{
    const ai=new GoogleGenAI({apiKey});
    const response=await ai.models.generateContent({
      model,
      contents:prompt,
      config:{
        abortSignal:signal,
        systemInstruction:SYSTEM,
        responseMimeType:"application/json",
        responseJsonSchema:schema,
        temperature:0.2,
        maxOutputTokens:2600,
      },
    });
    return{text:response.text,blocked:!response.candidates?.length&&Boolean(response.promptFeedback)};
  };
}

export async function generateGroundedDraft(
  input:{feature:"progress"|"reflection"|"evaluation";evidence:string},
  generate:Generate=sdk(aiJsonSchema),
):Promise<AiDraft>{
  const apiKey=process.env.GEMINI_API_KEY?.trim(),model=process.env.GEMINI_MODEL?.trim();
  if(!apiKey||!model)throw new Error("AI_DISABLED");
  return runGeminiRequest({
    apiKey,
    model,
    prompt:"Feature: "+input.feature+". Return the required JSON object. Authorized redacted records:\n"+input.evidence,
  },generate);
}

export async function generateGroundedPortfolioDraft(
  input:{evidence:string},
  generate:Generate=sdk(portfolioAiJsonSchema),
):Promise<PortfolioAiDraft>{
  const apiKey=process.env.GEMINI_API_KEY?.trim(),model=process.env.GEMINI_MODEL?.trim();
  if(!apiKey||!model)throw new Error("AI_DISABLED");
  return runStructuredGeminiRequest({
    apiKey,
    model,
    prompt:"Feature: generated internship portfolio. Build a reviewable portfolio draft from only the authorized redacted evidence. Skills must be explicitly evidenced. Achievements and selected work must be directly supported by completed or submitted records. Reflection must stay grounded and modest. Return the required JSON object. Authorized redacted records:\n"+input.evidence,
  },generate,parsePortfolioAiDraft);
}

export const groundingInstruction=SYSTEM;
