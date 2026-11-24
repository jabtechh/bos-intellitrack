// Shared summary banner: a row of number tiles at the top of a tab (DEC-2026-022 / REQ-FR-REP-4).
// Tiles may link (e.g. to filter the table below); counts are computed by the page inside its existing scope.
import Link from "next/link";

export type SummaryTile = { label: string; value: number | string; detail?: string; tone?: "neutral" | "success" | "warning" | "danger" | "info"; href?: string; active?: boolean };

// Accent set inline: the shared .ui-card border would otherwise override a utility class.
const TONE: Record<NonNullable<SummaryTile["tone"]>, string> = {
  neutral: "var(--border-strong)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--destructive)",
  info: "var(--info)",
};

export function SummaryBand({ tiles, label }: { tiles: SummaryTile[]; label: string }) {
  return <section aria-label={label} className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))]" data-summary-band={label}>
    {tiles.map((tile) => {
      const body = <>
        <span className="block text-xs font-medium text-muted">{tile.label}</span>
        <strong className="mt-1 block text-2xl font-semibold text-foreground">{tile.value}</strong>
        {tile.detail ? <span className="mt-0.5 block text-xs text-secondary">{tile.detail}</span> : null}
      </>;
      const className = `ui-card block min-w-0 p-4 ${tile.active ? "ring-2 ring-[var(--secondary)]" : ""}`;
      const style = { borderLeft: `4px solid ${TONE[tile.tone ?? "neutral"]}` };
      return tile.href
        ? <Link key={tile.label} href={tile.href} style={style} className={`${className} transition hover:-translate-y-0.5 hover:shadow-md`} aria-current={tile.active ? "true" : undefined} data-summary-tile={tile.label}>{body}</Link>
        : <div key={tile.label} style={style} className={className} data-summary-tile={tile.label}>{body}</div>;
    })}
  </section>;
}
