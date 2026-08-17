export const ORIENTATION_TOPICS = [
  { id: "attendance", title: "Attendance & Time In / Time Out", body: "Use live location and a fresh selfie for each attendance action. Server timestamps remain authoritative.", href: "/attendance" },
  { id: "work-logs", title: "Daily Work Logs", body: "Record the work you completed and what you learned each internship day.", href: "/work-logs" },
  { id: "tasks", title: "Tasks & submissions", body: "Review assigned work, due dates, and submission requirements in Tasks.", href: "/tasks" },
  { id: "guidelines", title: "Internship guidelines", body: "Follow your workplace schedule, confidentiality obligations, and school and company policies.", href: "/profile" },
] as const;

export const DOCUMENT_REQUIREMENTS = [
  { key: "resume", title: "Updated Resume", required: true, provider: "Intern", category: "INTERNSHIP_REQUIREMENT" },
  { key: "medical", title: "Medical Certificate", required: false, provider: "Intern", category: "MEDICAL_DOCUMENT" },
  { key: "moa", title: "Memorandum of Agreement", required: true, provider: "School / Company", category: "INTERNSHIP_AGREEMENT" },
  { key: "endorsement", title: "Endorsement Letter", required: true, provider: "School", category: "ENDORSEMENT_LETTER" },
  { key: "contract", title: "Internship Contract Agreement", required: true, provider: "Intern / Company", category: "INTERNSHIP_AGREEMENT" },
  { key: "acceptance", title: "Notice of Acceptance", required: true, provider: "Company", category: "INTERNSHIP_REQUIREMENT" },
] as const;

export type OnboardingCounts = { required: number; complete: number; yourAction: number; waiting: number; percentage: number; done: boolean };

export function onboardingCounts(input: { passwordChanged: boolean; profileComplete: boolean; documents: Record<string, boolean> }): OnboardingCounts {
  const requiredDocuments = DOCUMENT_REQUIREMENTS.filter((item) => item.required);
  const completeDocuments = requiredDocuments.filter((item) => input.documents[item.key]).length;
  const required = 2 + requiredDocuments.length;
  const complete = Number(input.passwordChanged) + Number(input.profileComplete) + completeDocuments;
  const missing = requiredDocuments.filter((item) => !input.documents[item.key]);
  const yourDocumentAction = missing.filter((item) => item.provider.includes("Intern")).length;
  const waiting = missing.filter((item) => !item.provider.includes("Intern")).length;
  return { required, complete, yourAction: Number(!input.profileComplete) + yourDocumentAction, waiting, percentage: Math.round(complete / required * 100), done: complete === required };
}
