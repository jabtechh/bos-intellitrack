# Evaluations and feedback

Company Supervisors can create draft evaluations only for active Interns they directly supervise. Drafts remain visible only to the responsible Supervisor and Company Operations oversight. Finalizing changes the record to `Finalized`, records server time, and permanently makes the evaluation read-only. Interns and their School Coordinator can then view it; Interns may acknowledge receipt without changing its content.

Evaluation types are Initial, Midterm, Progress, and Final. Only one evaluation of each type may exist per internship. Criteria are stored in the existing JSON field as user-named entries with integer ratings from 1 to 5. Rating descriptions are displayed in the form. The overall score is entered separately from 0 to 100 and is never automatically weighted or inferred. Strengths, areas for improvement, and Supervisor remarks are required. The unused `aiSummary` field is neither written nor shown.

Feedback uses the existing separate Feedback model. A Company Supervisor may share constructive feedback with a directly supervised Intern and select an existing visibility option. Interns see only feedback addressed to them and permitted for Intern visibility. Authorized staff views remain internship-scoped. Feedback is not presented as an evaluation amendment.

Version 1 has no controlled amendment or deletion workflow for finalized evaluations, no organization-defined rubric, no evaluation attachments, no weighted analytics, and no direct relation between Evaluation and Feedback records.
