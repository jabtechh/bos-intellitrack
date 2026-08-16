export type CreditedAttendance = { status: string; creditedMinutes: number; attendanceDate?: Date };

export function creditedMinutesFromAttendance(rows: CreditedAttendance[]) {
  return rows.reduce((total, row) => row.status === "APPROVED" ? total + Math.max(0, row.creditedMinutes) : total, 0);
}

export function internshipProgress(requiredHours: number | null, creditedMinutes: number) {
  const creditedHours = Math.max(0, creditedMinutes) / 60;
  if (requiredHours === null) return { requiredHours: null, creditedHours, remainingHours: null, percentage: null, visualPercentage: null };
  const percentage = requiredHours > 0 ? Math.round(creditedHours / requiredHours * 100) : 0;
  return { requiredHours, creditedHours, remainingHours: Math.max(requiredHours - creditedHours, 0), percentage, visualPercentage: Math.min(100, Math.max(0, percentage)) };
}

export function formatHours(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} h`;
}

export function scheduledPeriod(startDate: Date, endDate: Date) {
  const sameYear = startDate.getUTCFullYear() === endDate.getUTCFullYear();
  const start = startDate.toLocaleDateString("en-PH", { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }), timeZone: "UTC" });
  const end = endDate.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return `${start} – ${end}`;
}

type ProjectionInput = { remainingMinutes: number; scheduleStart: Date | null; scheduleEnd: Date | null; attendance: { attendanceDate: Date; status: string; creditedMinutes: number }[]; from?: Date };
export function projectedCompletionDate(input: ProjectionInput): Date | null {
  if (input.remainingMinutes <= 0 || !input.scheduleStart || !input.scheduleEnd) return null;
  const eligible = input.attendance.filter(row => row.status === "APPROVED" && row.creditedMinutes > 0);
  if (!eligible.length) return null;
  const weekdays = new Set(eligible.map(row => row.attendanceDate.getUTCDay()));
  const scheduledMinutes = (input.scheduleEnd.getUTCHours() * 60 + input.scheduleEnd.getUTCMinutes()) - (input.scheduleStart.getUTCHours() * 60 + input.scheduleStart.getUTCMinutes());
  if (scheduledMinutes <= 0 || !weekdays.size) return null;
  const average = eligible.reduce((sum, row) => sum + row.creditedMinutes, 0) / eligible.length;
  const expectedMinutes = Math.min(scheduledMinutes, average);
  if (expectedMinutes <= 0) return null;
  let remaining = input.remainingMinutes;
  const cursor = new Date(Date.UTC((input.from ?? new Date()).getUTCFullYear(), (input.from ?? new Date()).getUTCMonth(), (input.from ?? new Date()).getUTCDate()));
  for (let day = 0; day < 3660; day++) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (!weekdays.has(cursor.getUTCDay())) continue;
    remaining -= expectedMinutes;
    if (remaining <= 0) return new Date(cursor);
  }
  return null;
}
