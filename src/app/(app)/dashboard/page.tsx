import { requirePageAccess } from "@/lib/access";
import { getDefaultGroup } from "@/lib/group";
import { prisma } from "@/lib/prisma";
import {
  advanceOf,
  formatMoneyPlain,
  remainingOf,
  roundMoney,
} from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";

export default async function DashboardPage() {
  await requirePageAccess("dashboard", "view");
  const group = await getDefaultGroup();

  const members = await prisma.membership.findMany({
    where: { groupId: group.id, active: true },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });

  const expenses = await prisma.expense.findMany({
    where: { groupId: group.id },
    include: { participants: true },
  });

  const cards = members.map((m) => {
    const expenseTotal = roundMoney(
      expenses
        .filter((e) => e.participants.some((p) => p.userId === m.userId))
        .reduce((sum, e) => {
          const share =
            e.participants.find((p) => p.userId === m.userId)?.share || 0;
          return sum + share;
        }, 0),
    );
    const advance = advanceOf(m.balance);
    const remaining = remainingOf(m.balance);
    const total = roundMoney(expenseTotal + advance);
    return {
      id: m.userId,
      name: m.user.name,
      isAdmin: m.user.isAdmin,
      total,
      expense: expenseTotal,
      advance,
      remaining,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Each member gets cards automatically when added"
      />

      {cards.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">
          No active members yet. Add people on Members — their cards appear here.
        </div>
      ) : (
        cards.map((user) => (
          <section key={user.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-ink">{user.name}</h2>
              {user.isAdmin ? (
                <span className="rounded-md bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">
                  Admin
                </span>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <StatCard
                label="Total"
                value={formatMoneyPlain(user.total, group.currency)}
                tone="brand"
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 19V5M4 19h16M8 15v-4M12 15V8M16 15v-6" />
                  </svg>
                }
              />
              <StatCard
                label="Expense"
                value={formatMoneyPlain(user.expense, group.currency)}
                tone="bad"
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                    <path d="m7 9 5 5 5-5" />
                  </svg>
                }
              />
              <StatCard
                label="Advance"
                value={formatMoneyPlain(user.advance, group.currency)}
                tone="good"
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                }
              />
              <StatCard
                label="Remaining"
                value={formatMoneyPlain(user.remaining, group.currency)}
                tone="bad"
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                }
              />
            </div>
          </section>
        ))
      )}
    </div>
  );
}
