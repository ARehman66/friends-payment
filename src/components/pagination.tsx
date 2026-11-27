"use client";

function buildHref(
  basePath: string,
  query: Record<string, string | undefined>,
  page: number,
  pageSize: number,
) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value && key !== "page" && key !== "pageSize") {
      params.set(key, value);
    }
  });
  if (pageSize !== 10) params.set("pageSize", String(pageSize));
  if (page > 1) params.set("page", String(page));
  const s = params.toString();
  return s ? `${basePath}?${s}` : basePath;
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  basePath,
  query = {},
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  basePath: string;
  query?: Record<string, string | undefined>;
}) {
  if (totalItems === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  const pages: number[] = [];
  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  const end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  const href = (p: number, size = pageSize) =>
    buildHref(basePath, query, p, size);

  return (
    <div className="flex flex-col gap-3 border-t border-line px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <p className="order-2 text-xs text-muted sm:order-1">
        {from}-{to} of {totalItems}
      </p>

      <div className="order-1 flex flex-wrap items-center justify-center gap-1 sm:order-2">
        {page > 1 ? (
          <a href={href(page - 1)} className="page-btn">
            ‹
          </a>
        ) : (
          <span className="page-btn opacity-35">‹</span>
        )}
        {pages.map((p) => (
          <a
            key={p}
            href={href(p)}
            className={`page-btn ${p === page ? "page-btn-active" : ""}`}
          >
            {p}
          </a>
        ))}
        {page < totalPages ? (
          <a href={href(page + 1)} className="page-btn">
            ›
          </a>
        ) : (
          <span className="page-btn opacity-35">›</span>
        )}
      </div>

      <label className="order-3 flex items-center gap-2 text-xs text-muted">
        <span className="whitespace-nowrap">Items per page</span>
        <select
          className="rounded-lg border border-line bg-white px-2 py-1.5 text-ink"
          value={pageSize}
          onChange={(e) => {
            window.location.href = href(1, Number(e.target.value));
          }}
        >
          {[5, 10, 20, 50].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
