import { randomBytes } from "node:crypto";

export const DEMO_CONFIRMATION = "1";
export const DEMO_REQUIRED_HOURS = 486;
export const DEMO_ROLES = ["intern", "supervisor", "coordinator", "representative"] as const;
export type DemoRole = (typeof DEMO_ROLES)[number];

export const DEMO_IDENTITIES: Record<DemoRole, { firstName: string; lastName: string; email: string }> = {
  intern: { firstName: "John", lastName: "DemoAcc", email: "john.demoacc@paterostechnologicalcollege.edu.ph" },
  supervisor: { firstName: "Jose", lastName: "DemoAcc", email: "jose.demoacc@paterostechnologicalcollege.edu.ph" },
  coordinator: { firstName: "Mary", lastName: "DemoAcc", email: "mary.demoacc@paterostechnologicalcollege.edu.ph" },
  representative: { firstName: "Maria", lastName: "DemoAcc", email: "maria.demoacc@paterostechnologicalcollege.edu.ph" },
};

export function validateDemoEnvironment(environment: Record<string, string | undefined>) {
  for (const name of ["SUPABASE_SECRET_KEY", "NEXT_PUBLIC_SUPABASE_URL", "DATABASE_URL"] as const) {
    if (!environment[name]) throw new Error(`Demo setup is not configured: ${name} is missing.`);
  }
  if (environment.INTELLITRACK_DEMO_SETUP !== DEMO_CONFIRMATION) {
    throw new Error("Demo setup confirmation is missing.");
  }
}

export function secureDemoPassword() {
  return `${randomBytes(24).toString("base64url")}Aa1!`;
}

export function demoInternshipDates(now = new Date()) {
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7)),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 6, now.getUTCDate())),
  };
}

export function selectExactSchool<T extends { name: string }>(schools: T[]) {
  const matches = schools.filter((school) => school.name.trim().toLocaleLowerCase() === "pateros technological college");
  if (matches.length !== 1) throw new Error("Expected exactly one active Pateros Technological College record.");
  return matches[0];
}

export function shouldCompensateDemoAuth(createdDuringRun: boolean) {
  return createdDuringRun;
}
