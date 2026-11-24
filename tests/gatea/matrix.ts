export const gateARoles = [
  "intern",
  "supervisor",
  "coordinator",
  "representative",
  "admin",
] as const;

export type GateARole = (typeof gateARoles)[number];

export const gateAViewports = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 900 },
  { width: 1440, height: 900 },
] as const;

export const gateARouteSweeps: Record<GateARole, readonly string[]> = {
  intern: ["/dashboard", "/attendance", "/work-logs", "/tasks", "/insights", "/documents"],
  supervisor: ["/dashboard", "/interns", "/reviews", "/tasks", "/evaluations", "/reports", "/documents"],
  coordinator: ["/dashboard", "/students", "/reports", "/documents"],
  representative: ["/admin", "/admin/users", "/admin/schools", "/announcements", "/documents", "/reports"],
  admin: ["/admin/system", "/admin/users"],
};

const roleCode: Record<GateARole, string> = {
  intern: "I",
  supervisor: "S",
  coordinator: "C",
  representative: "R",
  admin: "A",
};

export const gateAProjects = gateARoles.flatMap((role) =>
  gateAViewports.map((viewport) => ({
    name: `${roleCode[role]}-${viewport.width}`,
    role,
    viewport,
  })),
);

export function storageStatePath(role: GateARole) {
  return `.gatea/auth/${role}.json`;
}
