export function StatCard({
  label,
  value,
  tone = "default",
  icon,
}: {
  label: string;
  value: string;
  tone?: "default" | "good" | "bad" | "brand";
  icon: React.ReactNode;
}) {
  const valueClass =
    tone === "good"
      ? "text-good"
      : tone === "bad"
        ? "text-bad"
        : tone === "brand"
          ? "text-brand"
          : "text-ink";

  const iconWrap =
    tone === "good"
      ? "bg-good/10 text-good"
      : tone === "bad"
        ? "bg-bad/10 text-bad"
        : tone === "brand"
          ? "bg-brand/10 text-brand"
          : "bg-[#e8eef5] text-muted";

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between gap-3">
        <p className="stat-card-label">{label}</p>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconWrap}`}
        >
          {icon}
        </span>
      </div>
      <p className={`stat-card-value ${valueClass}`}>{value}</p>
    </div>
  );
}

export function DetailMiniCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "good" | "bad";
}) {
  const valueClass =
    tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-ink";
  return (
    <div className="rounded-xl border border-line bg-bg/80 px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className={`mt-1 text-sm font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}
