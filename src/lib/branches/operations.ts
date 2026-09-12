import type { PrismaClient } from "@/generated/prisma/client";
import { branchSchema } from "./domain";

type Store = Pick<PrismaClient, "branch">;
type Company = { id: string; timezone: string };

// Every operation resolves its authorized company before touching the store.
export function branchOperations(store: Store, authorize: () => Promise<Company>) {
  return {
    async list(activeOnly = false) {
      const company = await authorize();
      return store.branch.findMany({ where: { companyId: company.id, ...(activeOnly ? { isActive: true } : {}) }, include: { _count: { select: { assignments: { where: { status: "ACTIVE" } } } } }, orderBy: { name: "asc" } });
    },
    async get(id: string) {
      const company = await authorize();
      return store.branch.findFirst({ where: { id, companyId: company.id } });
    },
    async save(input: unknown, id?: string) {
      const company = await authorize();
      const data = branchSchema.parse(input);
      if (id) return store.branch.update({ where: { id, companyId: company.id }, data });
      return store.branch.create({ data: { ...data, companyId: company.id, timezone: company.timezone } });
    },
    async deactivate(id: string) {
      const company = await authorize();
      return store.branch.update({ where: { id, companyId: company.id }, data: { isActive: false } });
    },
  };
}
