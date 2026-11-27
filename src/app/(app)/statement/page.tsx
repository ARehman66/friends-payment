import { format } from "date-fns";
import { getSession } from "@/lib/auth";
import { getDefaultGroup } from "@/lib/group";
import { prisma } from "@/lib/prisma";
import {
  advanceOf,
  formatMoneyPlain,
  remainingOf,
} from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { parsePage, parsePageSize } from "@/lib/paging";

export default async function StatementPage({
  searchParams,
}: {
  searchParams: Promise<{
    member?: string;
    from?: string;
    to?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const user = await getSession();
  if (!user) return null;
  const group = await getDefaultGroup();
  const sp = await searchParams;

  const members = await prisma.membership.findMany({
    where: { groupId: group.id },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });

  const memberId = sp.member || user.id;
  const from = sp.from ? new Date(`${sp.from}T00:00:00`) : null;
  const to = sp.to ? new Date(`${sp.to}T23:59:59`) : null;
  const page = parsePage(sp.page);
  const pageSize = parsePageSize(sp.pageSize);

  const where = {
    groupId: group.id,
    userId: memberId,
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.ledgerEntry.count({ where }),
    prisma.ledgerEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const membership = members.find((m) => m.userId === memberId);
  const selected = membership?.user;

  const adv = advanceOf(membership?.balance || 0);
  const rem = remainingOf(membership?.balance || 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Statement"
        subtitle="Filter by member and date range with before/after balances"
      />

      <div className="card p-4 sm:p-5">
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Member</span>
            <select name="member" defaultValue={memberId} className="input">
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.name}
                  {!m.active ? " (inactive)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">From date</span>
            <input
              type="date"
              name="from"
              defaultValue={sp.from || ""}
              className="input"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">To date</span>
            <input
              type="date"
              name="to"
              defaultValue={sp.to || ""}
              className="input"
            />
          </label>
          <div className="flex items-end">
            <button type="submit" className="btn btn-primary w-full">
              Apply filter
            </button>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="rounded-xl bg-bg px-3 py-2">{selected?.name}</span>
          {adv > 0 ? (
            <span className="rounded-xl bg-good/10 px-3 py-2 font-semibold text-good">
              Advance {formatMoneyPlain(adv, group.currency)}
            </span>
          ) : rem > 0 ? (
            <span className="rounded-xl bg-bad/10 px-3 py-2 font-semibold text-bad">
              Remaining {formatMoneyPlain(rem, group.currency)}
            </span>
          ) : (
            <span className="rounded-xl bg-bg px-3 py-2 text-muted">Settled</span>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Detail</th>
                <th>Amount</th>
                <th>Before</th>
                <th>After</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap text-muted">
                    {format(row.createdAt, "dd MMM yyyy")}
                  </td>
                  <td>
                    <span className="rounded-md bg-bg px-2 py-1 text-[11px] font-medium text-muted">
                      {row.type}
                    </span>
                  </td>
                  <td>{row.description}</td>
                  <td
                    className={`font-medium tabular-nums ${
                      row.amount >= 0 ? "text-good" : "text-bad"
                    }`}
                  >
                    {row.amount >= 0 ? "+" : "−"}
                    {formatMoneyPlain(Math.abs(row.amount), group.currency)}
                  </td>
                  <td className="tabular-nums text-muted">
                    {formatMoneyPlain(row.balanceBefore, group.currency)}
                  </td>
                  <td className="font-medium tabular-nums">
                    {formatMoneyPlain(row.balanceAfter, group.currency)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="!py-10 text-center text-muted">
                    No rows for this filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={pageSize}
          basePath="/statement"
          query={{
            member: memberId,
            from: sp.from,
            to: sp.to,
          }}
        />
      </div>
    </div>
  );
}
