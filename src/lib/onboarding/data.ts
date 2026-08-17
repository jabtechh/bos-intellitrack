import { prisma } from "@/lib/prisma";
import { DOCUMENT_REQUIREMENTS, onboardingCounts } from "./domain";

export async function getInternOnboarding(userId: string) {
  const profile = await prisma.internProfile.findUnique({
    where: { userId },
    select: {
      course: true, address: true, emergencyContactName: true, emergencyContactNumber: true,
      user: { select: { firstName: true, phoneNumber: true, profilePhotoPath: true } },
      school: { select: { name: true } },
      assignments: { where: { status: "ACTIVE" }, take: 1, select: {
        id: true, positionTitle: true, requiredHours: true, company: { select: { name: true } },
        supervisorProfile: { select: { user: { select: { firstName: true, lastName: true } } } },
        documents: { where: { status: { not: "ARCHIVED" } }, orderBy: { createdAt: "desc" }, select: { id: true, fileName: true, originalFileName: true, uploadedById: true } },
      } },
    },
  });
  const assignment = profile?.assignments[0];
  if (!profile || !assignment) return null;
  const documents = Object.fromEntries(DOCUMENT_REQUIREMENTS.map((requirement) => [requirement.key, assignment.documents.find((document) => document.fileName.trim().toLowerCase() === requirement.title.toLowerCase()) ?? null]));
  const presence = Object.fromEntries(Object.entries(documents).map(([key, value]) => [key, Boolean(value)]));
  const profileComplete = Boolean(profile.user.phoneNumber && profile.address && profile.emergencyContactName && profile.emergencyContactNumber);
  return { profile, assignment, documents, profileComplete, counts: onboardingCounts({ passwordChanged: true, profileComplete, documents: presence }) };
}
