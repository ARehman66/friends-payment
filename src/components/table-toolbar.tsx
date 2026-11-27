import { IconSearch } from "@/components/icons";

export function TableToolbar({
  searchName = "q",
  searchDefault = "",
  searchPlaceholder = "Search…",
  action,
  extraParams,
}: {
  searchName?: string;
  searchDefault?: string;
  searchPlaceholder?: string;
  action?: React.ReactNode;
  extraParams?: Record<string, string | undefined>;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-line p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <form className="relative w-full sm:max-w-sm">
        {extraParams
          ? Object.entries(extraParams).map(([k, v]) =>
              v ? <input key={k} type="hidden" name={k} value={v} /> : null,
            )
          : null}
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          name={searchName}
          defaultValue={searchDefault}
          placeholder={searchPlaceholder}
          className="input !pl-9"
        />
      </form>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
