import { prisma } from "./prisma";
import { roundMoney } from "./format";

export const ACCOUNT_TYPE = "ACCOUNT" as const;
export const EXPENSE_TYPE = "EXPENSE" as const;

/** Match current + legacy ledger type strings. */
export const ACCOUNT_TYPES = [ACCOUNT_TYPE, "DEPOSIT"] as const;
export const EXPENSE_TYPES = [EXPENSE_TYPE, "SHARE"] as const;

/** Atlas round-trips need more than the default 5s interactive tx window. */
const TX = { maxWait: 15_000, timeout: 30_000 } as const;

/**
 * Expense = split total equally among present members and deduct each share
 * from their account balance (can go negative). No recorder credit.
 */
export async function createExpense(input: {
  groupId: string;
  recordedById: string;
  amount: number;
  note: string;
  participantIds: string[];
  createdById: string;
  spentAt?: Date;
}) {
  const amount = roundMoney(input.amount);
  if (amount <= 0) throw new Error("Amount must be greater than zero");
  if (input.participantIds.length === 0) {
    throw new Error("Select at least one person who was present");
  }

  const uniqueParticipants = [...new Set(input.participantIds)];
  const share = roundMoney(amount / uniqueParticipants.length);
  const spentAt = input.spentAt || new Date();
  const note = input.note.trim() || "Break expense";

  // Validate outside the transaction so Atlas latency doesn't burn the tx budget
  const [people, memberships] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: uniqueParticipants } },
      select: { id: true, isAdmin: true },
    }),
    prisma.membership.findMany({
      where: {
        groupId: input.groupId,
        userId: { in: uniqueParticipants },
      },
    }),
  ]);

  if (people.some((p) => p.isAdmin)) {
    throw new Error("Admin is the app owner and has no expense share");
  }
  if (people.length !== uniqueParticipants.length) {
    throw new Error("One or more selected members were not found");
  }

  const membershipByUser = new Map(memberships.map((m) => [m.userId, m]));
  for (const userId of uniqueParticipants) {
    const m = membershipByUser.get(userId);
    if (!m?.active) {
      throw new Error("Only active members can be included");
    }
  }

  return prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        groupId: input.groupId,
        recordedById: input.recordedById,
        amount,
        note,
        spentAt,
        createdById: input.createdById,
        shares: {
          create: uniqueParticipants.map((userId) => ({ userId, share })),
        },
      },
      include: { shares: true, recordedBy: true },
    });

    const entryRows: {
      groupId: string;
      userId: string;
      type: string;
      description: string;
      amount: number;
      balanceBefore: number;
      balanceAfter: number;
      expenseId: string;
      createdAt: Date;
    }[] = [];

    for (const userId of uniqueParticipants) {
      const membership = membershipByUser.get(userId)!;
      const before = roundMoney(membership.balance);
      const after = roundMoney(before - share);
      await tx.membership.update({
        where: { id: membership.id },
        data: { balance: after },
      });
      // Keep local map in sync if same user appeared twice (shouldn't)
      membership.balance = after;
      entryRows.push({
        groupId: input.groupId,
        userId,
        type: EXPENSE_TYPE,
        description: `Share of ${note}`,
        amount: -share,
        balanceBefore: before,
        balanceAfter: after,
        expenseId: expense.id,
        createdAt: spentAt,
      });
    }

    await tx.accountEntry.createMany({ data: entryRows });
    return expense;
  }, TX);
}

export async function deleteExpense(expenseId: string) {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { accountEntries: true },
  });
  if (!expense) throw new Error("Expense not found");

  return prisma.$transaction(async (tx) => {
    for (const entry of expense.accountEntries) {
      const m = await tx.membership.findUniqueOrThrow({
        where: {
          groupId_userId: {
            groupId: expense.groupId,
            userId: entry.userId,
          },
        },
      });
      await tx.membership.update({
        where: { id: m.id },
        data: { balance: roundMoney(m.balance - entry.amount) },
      });
    }

    await tx.accountEntry.deleteMany({ where: { expenseId } });
    await tx.expenseShare.deleteMany({ where: { expenseId } });
    await tx.expense.delete({ where: { id: expenseId } });
  }, TX);
}

export async function updateExpense(input: {
  expenseId: string;
  groupId: string;
  recordedById: string;
  amount: number;
  note: string;
  participantIds: string[];
  createdById: string;
  spentAt?: Date;
}) {
  await deleteExpense(input.expenseId);
  return createExpense({
    groupId: input.groupId,
    recordedById: input.recordedById,
    amount: input.amount,
    note: input.note,
    participantIds: input.participantIds,
    createdById: input.createdById,
    spentAt: input.spentAt,
  });
}

/** Account top-up: increases member balance. */
export async function createDeposit(input: {
  groupId: string;
  userId: string;
  amount: number;
  note: string;
  depositedAt?: Date;
}) {
  const amount = roundMoney(input.amount);
  if (amount <= 0) throw new Error("Amount must be greater than zero");
  const depositedAt = input.depositedAt || new Date();
  const note = input.note.trim() || "Account credit";

  const [person, membership] = await Promise.all([
    prisma.user.findUnique({
      where: { id: input.userId },
      select: { isAdmin: true },
    }),
    prisma.membership.findUnique({
      where: {
        groupId_userId: { groupId: input.groupId, userId: input.userId },
      },
    }),
  ]);

  if (person?.isAdmin) {
    throw new Error("Admin is the app owner and has no account");
  }
  if (!membership?.active) {
    throw new Error("Only active members can receive account credit");
  }

  const before = roundMoney(membership.balance);
  const after = roundMoney(before + amount);

  return prisma.$transaction(async (tx) => {
    await tx.membership.update({
      where: { id: membership.id },
      data: { balance: after },
    });

    const entry = await tx.accountEntry.create({
      data: {
        groupId: input.groupId,
        userId: input.userId,
        type: ACCOUNT_TYPE,
        description: note,
        amount,
        balanceBefore: before,
        balanceAfter: after,
        createdAt: depositedAt,
      },
    });

    return { entry };
  }, TX);
}

export async function deleteDeposit(accountEntryId: string) {
  const entry = await prisma.accountEntry.findUnique({
    where: { id: accountEntryId },
  });
  if (
    !entry ||
    !ACCOUNT_TYPES.includes(entry.type as (typeof ACCOUNT_TYPES)[number])
  ) {
    throw new Error("Account entry not found");
  }

  return prisma.$transaction(async (tx) => {
    const m = await tx.membership.findUniqueOrThrow({
      where: {
        groupId_userId: { groupId: entry.groupId, userId: entry.userId },
      },
    });
    await tx.membership.update({
      where: { id: m.id },
      data: { balance: roundMoney(m.balance - entry.amount) },
    });
    await tx.accountEntry.delete({ where: { id: entry.id } });
  }, TX);
}

export async function updateDeposit(input: {
  accountEntryId: string;
  groupId: string;
  userId: string;
  amount: number;
  note: string;
  depositedAt?: Date;
}) {
  await deleteDeposit(input.accountEntryId);
  return createDeposit({
    groupId: input.groupId,
    userId: input.userId,
    amount: input.amount,
    note: input.note,
    depositedAt: input.depositedAt,
  });
}
