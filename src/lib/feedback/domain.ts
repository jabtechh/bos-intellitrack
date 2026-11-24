import { z } from "zod";

export const workmateFeedbackInputSchema = z.object({
  recipientUserId: z.string().uuid("Select an eligible workmate."),
  feedbackType: z.enum(["GENERAL","PRAISE","IMPROVEMENT","TASK_RELATED","PERFORMANCE"]),
  title: z.string().trim().max(255).optional(),
  content: z.string().trim().min(1,"Feedback is required.").max(10000),
});

export type InternshipPeerPeriod = {
  userId: string;
  status: string;
  supervisorProfileId: string;
  startDate: Date;
  endDate: Date;
};

export function internshipPeriodsOverlap(a: Pick<InternshipPeerPeriod,"startDate"|"endDate">, b: Pick<InternshipPeerPeriod,"startDate"|"endDate">) {
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}

export function workmateEligible(actor: InternshipPeerPeriod, recipient: InternshipPeerPeriod) {
  return actor.userId !== recipient.userId
    && actor.status === "ACTIVE"
    && recipient.status === "ACTIVE"
    && actor.supervisorProfileId === recipient.supervisorProfileId
    && internshipPeriodsOverlap(actor, recipient);
}
