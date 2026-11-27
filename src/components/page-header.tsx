export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4 sm:mb-5">
      <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[1.75rem]">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      ) : null}
    </div>
  );
}
