export const ORIENTATION_TOPICS = [
  { id: "attendance", title: "Attendance & Time In / Time Out", body: "Use live location and a fresh selfie for each attendance action. Server timestamps remain authoritative.", href: "/attendance" },
  { id: "work-logs", title: "Daily Work Logs", body: "Record the work you completed and what you learned each internship day.", href: "/work-logs" },
  { id: "tasks", title: "Tasks & submissions", body: "Review assigned work, due dates, and submission requirements in Tasks.", href: "/tasks" },
  { id: "guidelines", title: "Internship guidelines", body: "Follow your workplace schedule, confidentiality obligations, and school and company policies.", href: "/profile" },
] as const;

export const DOCUMENT_REQUIREMENTS = [
  { key: "resume", title: "Updated Resume", description: "Your latest education, skills, and experience summary.", required: true, issuer: "You", category: "INTERNSHIP_REQUIREMENT" },
  { key: "medical", title: "Medical Certificate", description: "Add this only when requested for your placement.", required: false, issuer: "Clinic or physician", category: "MEDICAL_DOCUMENT" },
  { key: "moa", title: "Memorandum of Agreement", description: "The partnership agreement covering your internship.", required: true, issuer: "School / Company", category: "INTERNSHIP_AGREEMENT" },
  { key: "endorsement", title: "Endorsement Letter", description: "Your school’s formal endorsement for the internship.", required: true, issuer: "School", category: "ENDORSEMENT_LETTER" },
  { key: "contract", title: "Internship Contract Agreement", description: "Your signed internship terms and responsibilities.", required: true, issuer: "Intern / Company", category: "INTERNSHIP_AGREEMENT" },
  { key: "acceptance", title: "Notice of Acceptance", description: "The company’s confirmation of your placement.", required: true, issuer: "Company", category: "INTERNSHIP_REQUIREMENT" },
] as const;

export type OnboardingCounts = { required: number; complete: number; yourAction: number; percentage: number; done: boolean };

export function onboardingCounts(input: { passwordChanged: boolean; profileComplete: boolean; documents: Record<string, boolean> }): OnboardingCounts {
  const requiredDocuments = DOCUMENT_REQUIREMENTS.filter((item) => item.required);
  const completeDocuments = requiredDocuments.filter((item) => input.documents[item.key]).length;
  const required = 2 + requiredDocuments.length;
  const complete = Number(input.passwordChanged) + Number(input.profileComplete) + completeDocuments;
  const missingDocuments = requiredDocuments.filter((item) => !input.documents[item.key]).length;
  return { required, complete, yourAction: Number(!input.profileComplete) + missingDocuments, percentage: Math.round(complete / required * 100), done: complete === required };
}
