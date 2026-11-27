import { format } from "date-fns";
import { requirePageAccess } from "@/lib/access";
import { getDefaultGroup } from "@/lib/group";
import { prisma } from "@/lib/prisma";
import { formatMoneyPlain } from "@/lib/format";
import { ACCOUNT_TYPES } from "@/lib/ledger";
import { hasPermission } from "@/lib/permissions";
import {
  DepositAddButton,
  DepositRowActions,
} from "@/components/deposit-modal";
import { PageHeader } from "@/components/page-header";
import { TableToolbar } from "@/components/table-toolbar";
import { Pagination } from "@/components/pagination";
import { parsePage, parsePageSize } from "@/lib/paging";

export default async function DepositsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string }>;
}) {
  const user = await requirePageAccess("deposits", "view");
  const group = await getDefaultGroup();
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const page = parsePage(sp.page);
  const pageSize = parsePageSize(sp.pageSize);

  // Admin is app owner only — no account balance
  const activeMembers = await prisma.membership.findMany({
    where: {
      groupId: group.id,
      active: true,
      user: { isAdmin: false },
    },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });

  const memberOptions = activeMembers.map((m) => ({
    id: m.userId,
    name: m.user.name,
  }));

  const where = {
    groupId: group.id,
    type: { in: [...ACCOUNT_TYPES] },
    ...(q
      ? {
          OR: [
            { description: { contains: q } },
            { user: { name: { contains: q } } },
          ],
        }
      : {}),
  };

  const [total, deposits] = await Promise.all([
    prisma.accountEntry.count({ where }),
    prisma.accountEntry.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentUserId = activeMembers.some((m) => m.userId === user.id)
    ? user.id
    : activeMembers[0]?.userId || user.id;

  return (
    <div>
      <PageHeader
        title="Account"
        subtitle="Add money to a member’s account balance"
      />

      <div className="card overflow-hidden">
        <TableToolbar
          searchDefault={q}
          searchPlaceholder="Search by member or note…"
          action={
            hasPermission(user, "deposits", "add") ? (
              <DepositAddButton
                members={memberOptions}
                currentUserId={currentUserId}
              />
            ) : undefined
          }
        />

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="col-date">Date</th>
                <th className="col-person">Member</th>
                <th className="col-note">Note</th>
                <th className="col-money">Before</th>
                <th className="col-money">After</th>
                <th className="col-money">Amount</th>
                <th className="col-action">Action</th>
              </tr>
            </thead>
            <tbody>
              {deposits.map((row) => (
                <tr key={row.id}>
                  <td className="col-date text-muted">
                    {format(row.createdAt, "dd MMM yyyy")}
                  </td>
                  <td className="col-person font-medium">{row.user.name}</td>
                  <td className="col-note">{row.description}</td>
                  <td className="col-money text-muted">
                    {formatMoneyPlain(row.balanceBefore, group.currency)}
                  </td>
                  <td className="col-money">
                    {formatMoneyPlain(row.balanceAfter, group.currency)}
                  </td>
                  <td className="col-money font-semibold text-good">
                    +{formatMoneyPlain(row.amount, group.currency)}
                  </td>
                  <td className="col-action">
                    <DepositRowActions
                      members={memberOptions}
                      canEdit={hasPermission(user, "deposits", "edit")}
                      deposit={{
                        id: row.id,
                        amount: row.amount,
                        note: row.description,
                        depositedAt: format(row.createdAt, "yyyy-MM-dd"),
                        userId: row.userId,
                      }}
                    />
                  </td>
                </tr>
              ))}
              {deposits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="!py-10 text-center text-muted">
                    No account entries yet.
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
          basePath="/deposits"
          query={{ q: q || undefined }}
        />
      </div>
    </div>
  );
}
