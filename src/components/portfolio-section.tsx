export function PortfolioSection({ title, value }: { title: string; value: string | null }) {
  return <section className="ui-card p-5 sm:p-6">
    <h2 className="section-title">{title}</h2>
    <p className="mt-3 whitespace-pre-wrap text-secondary">{value || "Not provided."}</p>
  </section>;
}
