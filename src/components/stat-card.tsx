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
    <div className="rounded-xl border border-[#c5d0dc] bg-white px-3 py-2.5 text-left shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="m-0 text-left text-[10px] font-semibold uppercase tracking-wide text-muted">
          {label}
        </p>
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconWrap}`}
        >
          {icon}
        </span>
      </div>
      <p
        className={`mt-1.5 mb-0 text-left font-display text-base font-medium leading-none tracking-tight tabular-nums sm:text-lg ${valueClass}`}
      >
        {value}
      </p>
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
    <div className="rounded-xl border border-[#c5d0dc] bg-white px-3.5 py-3 text-left shadow-sm">
      <p className="m-0 text-left text-[10px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p
        className={`mt-1.5 mb-0 break-words text-left text-sm font-semibold ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}
