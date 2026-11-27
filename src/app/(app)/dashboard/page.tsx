import { requirePageAccess } from "@/lib/access";
import { getDefaultGroup } from "@/lib/group";
import { prisma } from "@/lib/prisma";
import { formatBalance, formatMoneyPlain, roundMoney } from "@/lib/format";
import { ACCOUNT_TYPES } from "@/lib/ledger";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";

export default async function DashboardPage() {
  await requirePageAccess("dashboard", "view");
  const group = await getDefaultGroup();

  const members = await prisma.membership.findMany({
    where: {
      groupId: group.id,
      active: true,
      user: { isAdmin: false },
    },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { user: { name: "asc" } },
  });

  const memberIds = members.map((m) => m.userId);

  const [expenseSums, accountSums] = await Promise.all([
    memberIds.length
      ? prisma.expenseShare.groupBy({
          by: ["userId"],
          where: {
            userId: { in: memberIds },
            expense: { groupId: group.id },
          },
          _sum: { share: true },
        })
      : Promise.resolve([]),
    memberIds.length
      ? prisma.accountEntry.groupBy({
          by: ["userId"],
          where: {
            groupId: group.id,
            userId: { in: memberIds },
            type: { in: [...ACCOUNT_TYPES] },
          },
          _sum: { amount: true },
        })
      : Promise.resolve([]),
  ]);

  const expenseMap = new Map(
    expenseSums.map((r) => [r.userId, roundMoney(r._sum.share || 0)]),
  );
  const accountMap = new Map(
    accountSums.map((r) => [r.userId, roundMoney(r._sum.amount || 0)]),
  );

  const cards = members.map((m) => ({
    id: m.userId,
    name: m.user.name,
    balance: roundMoney(m.balance),
    account: accountMap.get(m.userId) || 0,
    expense: expenseMap.get(m.userId) || 0,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Account balance for every active member"
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
            </div>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
              <StatCard
                label="Balance"
                value={formatBalance(user.balance, group.currency)}
                tone={
                  user.balance < -0.004
                    ? "bad"
                    : user.balance > 0.004
                      ? "good"
                      : "brand"
                }
                icon={
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 19V5M4 19h16M8 15v-4M12 15V8M16 15v-6" />
                  </svg>
                }
              />
              <StatCard
                label="Account"
                value={formatMoneyPlain(user.account, group.currency)}
                tone="good"
                icon={
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                }
              />
              <StatCard
                label="Expense"
                value={formatMoneyPlain(user.expense, group.currency)}
                tone="bad"
                icon={
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 5v14M5 12h14" />
                    <path d="m7 9 5 5 5-5" />
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
