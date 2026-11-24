// DEC-2026-021 / P174 — varied, realistic content for the isolated demo interns (demo data only).
const WORK = [
  { title: "Opening checklist and bar setup", description: "Prepared the bar for opening: calibrated the grinder, checked milk and syrup stock, and completed the opening checklist with the shift lead.", learnings: "Learned how the opening checklist prevents shortages during the morning rush.", skills: ["Store operations", "Attention to detail"] },
  { title: "Weekly inventory count", description: "Counted dry stock, cups and packaging, recorded variances in the inventory sheet, and flagged three items that were below par level.", learnings: "Learned how par levels drive weekly purchase orders.", skills: ["Inventory management", "Excel"] },
  { title: "Front counter support", description: "Took orders at the front counter during the lunch peak and helped customers with the loyalty app.", learnings: "Practised clear upselling without pressuring customers.", skills: ["Customer service", "Communication"] },
  { title: "POS end-of-day reconciliation", description: "Assisted the shift lead in reconciling POS sales against the cash count and filed the end-of-day report.", learnings: "Learned the steps to trace a cash variance back to individual transactions.", skills: ["POS operations", "Reporting"] },
  { title: "Food safety temperature log", description: "Recorded chiller and freezer temperatures twice during the shift and labelled prepared items with use-by times.", learnings: "Understood why the 4°C threshold matters for dairy.", skills: ["Food safety"] },
  { title: "Supplier delivery receiving", description: "Checked the supplier delivery against the purchase order, noted one short-shipped item and updated the receiving log.", learnings: "Learned to verify quantities before signing the delivery receipt.", skills: ["Inventory management", "Attention to detail"] },
  { title: "Menu board and promo display update", description: "Updated the menu board and counter displays for the new seasonal drink following the visual merchandising guide.", learnings: "Learned how display placement affects promo visibility.", skills: ["Visual merchandising"] },
  { title: "Customer feedback card summary", description: "Summarized two weeks of customer feedback cards into themes (speed, taste, seating) for the store manager.", learnings: "Practised turning raw comments into a short, actionable summary.", skills: ["Reporting", "Communication"] },
  { title: "Training: espresso fundamentals", description: "Joined the barista trainer's session on espresso extraction and practised pulling shots within the target time.", learnings: "Learned how grind size changes extraction time.", skills: ["Beverage preparation"] },
  { title: "Back-of-house cleaning schedule", description: "Completed the weekly deep-clean tasks and updated the cleaning schedule with the shift lead's sign-off.", learnings: "Understood how the cleaning schedule supports food safety audits.", skills: ["Food safety", "Teamwork"] },
  { title: "Sales data spreadsheet", description: "Built a simple spreadsheet comparing weekday and weekend sales by category for the operations meeting.", learnings: "Learned basic pivot tables and how to present trends clearly.", skills: ["Excel", "Data analysis"] },
  { title: "Team huddle notes", description: "Took notes during the shift huddle and shared the action items with the team chat channel.", learnings: "Learned to keep meeting notes short and action-focused.", skills: ["Communication", "Teamwork"] },
  { title: "Stock rotation (FIFO)", description: "Rotated chiller and dry stock using first-in-first-out and removed two expired items following the waste procedure.", learnings: "Learned how FIFO reduces waste and cost.", skills: ["Inventory management", "Food safety"] },
  { title: "Store audit preparation", description: "Helped prepare the store for the internal audit by checking logs, signage and storage labels against the audit checklist.", learnings: "Learned what auditors check first and why records matter.", skills: ["Store operations", "Attention to detail"] },
  { title: "Customer service recovery", description: "Handled a delayed-order complaint with the shift lead, offered a replacement and logged the incident.", learnings: "Practised staying calm and solution-focused with an upset customer.", skills: ["Customer service"] },
  { title: "Procurement request draft", description: "Drafted the weekly procurement request based on the inventory count and par levels for the manager's approval.", learnings: "Learned how lead times affect when to place orders.", skills: ["Inventory management", "Reporting"] },
  { title: "Turnover notes", description: "Prepared turnover notes documenting the inventory sheet, reports and routines I maintained during the internship.", learnings: "Learned the value of documentation for continuity.", skills: ["Reporting", "Communication"] },
] as const;

export const TASKS = [
  { title: "Prepare the monthly inventory worksheet", description: "Create the inventory worksheet template with par levels for dry stock and packaging.", priority: "HIGH" as const },
  { title: "Document the opening checklist", description: "Turn the verbal opening routine into a one-page checklist.", priority: "MEDIUM" as const },
  { title: "Summarize customer feedback cards", description: "Group two weeks of feedback cards into themes with counts.", priority: "MEDIUM" as const },
  { title: "Update the supplier contact sheet", description: "Verify and update supplier contacts and delivery days.", priority: "LOW" as const },
  { title: "Build the weekday vs weekend sales comparison", description: "Spreadsheet comparing sales by category for the operations meeting.", priority: "MEDIUM" as const, revised: true },
  { title: "Prepare the store audit evidence folder", description: "Collect the temperature, cleaning and receiving logs for the audit.", priority: "HIGH" as const },
  { title: "Draft the weekly procurement request", description: "Use the latest count and par levels to draft the request.", priority: "MEDIUM" as const },
  { title: "Write the internship turnover notes", description: "Document routines and files for the next intern.", priority: "HIGH" as const },
] as const;

export const CRITERIA = ["Quality of work", "Reliability", "Communication", "Initiative", "Teamwork", "Professionalism"];

export function workFor(index: number) { return WORK[index % WORK.length]; }
/** Varied, realistic clock times (Asia/Manila = UTC+8): mostly on time, a few late arrivals. */
export function clockFor(iso: string, index: number) {
  const lateDay = index % 13 === 7;
  const inMinute = lateDay ? 18 + (index % 7) : 48 + (index % 11); // 08:18–08:24 late, else 07:48–07:58
  const inHour = lateDay ? 0 : -1; // UTC hour offset from 00:00 (08:00 Manila)
  const clockIn = new Date(`${iso}T00:00:00.000Z`); clockIn.setUTCHours(inHour < 0 ? 23 : 0, inMinute); if (inHour < 0) clockIn.setUTCDate(clockIn.getUTCDate() - 1);
  const clockOut = new Date(`${iso}T09:00:00.000Z`); clockOut.setUTCMinutes(2 + (index % 14));
  const worked = Math.round((clockOut.getTime() - clockIn.getTime()) / 60000) - 60; // minus 1-hour break
  return { clockIn, clockOut, workedMinutes: worked, classification: lateDay ? "LATE" as const : "ON_TIME" as const };
}
