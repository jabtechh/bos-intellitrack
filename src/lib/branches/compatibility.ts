import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { branchCompatibility } from "./compatibility-reader";

// Catalog checks avoid absent Branch fields; unexpected database errors propagate.
// React cache is scoped to a server render, never a permanent migration flag.
const compatibility = branchCompatibility(prisma);
export const branchSchemaAvailable = cache(compatibility.available);
// Callers establish assignment ownership or reviewer scope before resolving Branch data.
export const assignmentBranch = cache(compatibility.assignment);
