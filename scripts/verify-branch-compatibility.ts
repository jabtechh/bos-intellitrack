// Read-only verification against the configured database. Does not apply schema or data changes.
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { internshipAssignmentBaseSelect } from "../src/lib/assignments/projection";
import { branchCompatibility } from "../src/lib/branches/compatibility-reader";

try {
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const compatibility = branchCompatibility(tx);
    const available = await compatibility.available();
    assert.equal(available, false, "This check targets the current pre-Branch database.");
    const assignment = await tx.internshipAssignment.findFirst({ where: { status: "ACTIVE" }, select: {
      ...internshipAssignmentBaseSelect, company: true,
      attendance: { take: 5, orderBy: { attendanceDate: "desc" }, select: { id: true, status: true } },
    } });
    assert.ok(assignment, "An existing active assignment is needed for read verification.");
    assert.equal(await compatibility.assignment(assignment.id), null);
    const args = { where: { assignmentId: assignment.id }, take: 1,
      select: { id: true, assignment: { select: { ...internshipAssignmentBaseSelect, company: true } } },
    } as const;
    const rows = await Promise.all([
      tx.attendance.findMany(args), tx.workLog.findMany(args), tx.task.findMany(args),
      tx.document.findMany(args), tx.evaluation.findMany(args), tx.feedback.findMany(args),
    ]);
    const counts = Object.fromEntries(["attendance", "workLog", "task", "document", "evaluation", "feedback"].map((model, index) => [model, rows[index].length]));
    console.log(JSON.stringify({ branchSchemaAvailable: available, activeAssignmentRead: true, optionalBranch: null, relationReadCounts: counts, readOnly: true }));
  });
} finally { await prisma.$disconnect(); }
