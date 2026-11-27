import { format } from "date-fns";
import { requirePageAccess } from "@/lib/access";
import { getDefaultGroup } from "@/lib/group";
import { prisma } from "@/lib/prisma";
import { formatMoneyPlain, roundMoney } from "@/lib/format";
import { isCashier } from "@/lib/auth";
import {
  ExpenseAddButton,
  ExpenseRowActions,
} from "@/components/expense-modal";
import { PageHeader } from "@/components/page-header";
import { TableToolbar } from "@/components/table-toolbar";
import { Pagination } from "@/components/pagination";
import { parsePage, parsePageSize } from "@/lib/paging";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string }>;
}) {
  const user = await requirePageAccess("expenses", "view");
  const group = await getDefaultGroup();
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const page = parsePage(sp.page);
  const pageSize = parsePageSize(sp.pageSize);

  // Admin is app owner only — no account / expense share
  const activeMembers = await prisma.membership.findMany({
    where: {
      groupId: group.id,
      active: true,
      user: { isAdmin: false },
    },
    include: { user: true },
  });

  activeMembers.sort((a, b) =>
    a.user.name.localeCompare(b.user.name, undefined, { sensitivity: "base" }),
  );

  const memberOptions = activeMembers.map((m) => ({
    id: m.userId,
    name: m.user.name,
  }));

  const where = {
    groupId: group.id,
    ...(q
      ? {
          OR: [
            { note: { contains: q } },
            { recordedBy: { name: { contains: q } } },
          ],
        }
      : {}),
  };

  const [total, expenses] = await Promise.all([
    prisma.expense.count({ where }),
    prisma.expense.findMany({
      where,
      include: {
        recordedBy: true,
        shares: { include: { user: true } },
      },
      orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canAddExpense = isCashier(user);

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle="Equal split among selected members (Cashier records)"
      />

      <div className="card overflow-hidden">
        <TableToolbar
          searchDefault={q}
          searchPlaceholder="Search by note or recorder…"
          action={
            canAddExpense ? (
              <ExpenseAddButton members={memberOptions} />
            ) : undefined
          }
        />

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="col-date">Date</th>
                <th className="col-note">Note</th>
                <th className="col-person">Recorded by</th>
                <th className="col-present">Present</th>
                <th className="col-money">Share</th>
                <th className="col-money">Amount</th>
                <th className="col-action">Action</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => {
                const share = roundMoney(
                  expense.amount / Math.max(expense.shares.length, 1),
                );
                return (
                  <tr key={expense.id}>
                    <td className="col-date text-muted">
                      {format(expense.spentAt, "dd MMM yyyy")}
                    </td>
                    <td className="col-note font-medium">{expense.note}</td>
                    <td className="col-person">{expense.recordedBy.name}</td>
                    <td className="col-present truncate text-muted">
                      {expense.shares.map((p) => p.user.name).join(", ")}
                    </td>
                    <td className="col-money">
                      {formatMoneyPlain(share, group.currency)}
                    </td>
                    <td className="col-money font-semibold text-bad">
                      {formatMoneyPlain(expense.amount, group.currency)}
                    </td>
                    <td className="col-action">
                      <ExpenseRowActions
                        members={memberOptions}
                        expense={{
                          id: expense.id,
                          amount: expense.amount,
                          note: expense.note,
                          spentAt: format(expense.spentAt, "yyyy-MM-dd"),
                          paidById: expense.recordedById,
                          paidByName: expense.recordedBy.name,
                          participantIds: expense.shares.map((p) => p.userId),
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="!py-10 text-center text-muted">
                    No expenses yet.
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
          basePath="/expenses"
          query={{ q: q || undefined }}
        />
      </div>
    </div>
  );
}
