// DEC-2026-022 — banner tiles for the Interns / Students rosters; each status tile filters the table below.
import type { SummaryTile } from "@/components/summary-band";
import type { RecordFilter } from "@/lib/tables/records";

export const ROSTER_STATUS_FILTER: RecordFilter = {
  key: "progress", label: "Status",
  options: ["At risk", "Needs attention", "On track", "Completed"].map((value) => ({ value, label: value })),
};

export function rosterTiles(c: { total: number; active: number; completed: number; onTrack: number; attention: number; atRisk: number }, base: string, selected: string): SummaryTile[] {
  const link = (status: string) => (status ? `${base}?status=${encodeURIComponent(status)}` : base);
  return [
    { label: "Total", value: c.total, detail: `${c.active} active · ${c.completed} completed`, href: link(""), active: !selected },
    { label: "On track", value: c.onTrack, tone: "success", href: link("On track"), active: selected === "On track" },
    { label: "Needs attention", value: c.attention, detail: "1 issue", tone: "warning", href: link("Needs attention"), active: selected === "Needs attention" },
    { label: "At risk", value: c.atRisk, detail: "Behind on hours or 2+ issues", tone: "danger", href: link("At risk"), active: selected === "At risk" },
    { label: "Completed", value: c.completed, tone: "neutral", href: link("Completed"), active: selected === "Completed" },
  ];
}
