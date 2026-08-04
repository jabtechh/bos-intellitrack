import "server-only";
import { GoogleGenAI } from "@google/genai";
import { aiJsonSchema, type AiDraft } from "./domain";
import { runGeminiRequest, type Generate } from "./runtime";
const SYSTEM=`You produce a grounded IntelliTrack draft from only the supplied authorized records. Refer to the person only as "the Intern". Never invent achievements, skills, causes, ratings, percentages, recommendations, or missing facts. Put uncertainties and missing evidence in sourceLimitations. Do not make disciplinary, hiring, termination, medical, or academic decisions. Do not expose raw enum values. Every statement must be supported by supplied records.`;
const sdkGenerate:Generate=async({apiKey,model,prompt,signal})=>{const ai=new GoogleGenAI({apiKey});const response=await ai.models.generateContent({model,contents:prompt,config:{abortSignal:signal,systemInstruction:SYSTEM,responseMimeType:"application/json",responseJsonSchema:aiJsonSchema,temperature:0.2,maxOutputTokens:1800}});return{text:response.text,blocked:!response.candidates?.length&&Boolean(response.promptFeedback)}};
export async function generateGroundedDraft(input:{feature:"progress"|"reflection"|"evaluation";evidence:string},generate:Generate=sdkGenerate):Promise<AiDraft>{const apiKey=process.env.GEMINI_API_KEY?.trim(),model=process.env.GEMINI_MODEL?.trim();if(!apiKey||!model)throw new Error("AI_DISABLED");return runGeminiRequest({apiKey,model,prompt:`Feature: ${input.feature}. Return the required JSON object. Authorized redacted records:\n${input.evidence}`},generate)}
export const groundingInstruction=SYSTEM;
