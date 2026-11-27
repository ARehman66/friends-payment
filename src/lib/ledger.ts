import { prisma } from "./prisma";
import { roundMoney } from "./format";

export const ACCOUNT_TYPE = "ACCOUNT" as const;
export const EXPENSE_TYPE = "EXPENSE" as const;

/** Match current + legacy ledger type strings. */
export const ACCOUNT_TYPES = [ACCOUNT_TYPE, "DEPOSIT"] as const;
export const EXPENSE_TYPES = [EXPENSE_TYPE, "SHARE"] as const;

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

  return prisma.$transaction(async (tx) => {
    for (const userId of uniqueParticipants) {
      const person = await tx.user.findUnique({ where: { id: userId } });
      if (person?.isAdmin) {
        throw new Error("Admin is the app owner and has no expense share");
      }
      const m = await tx.membership.findUnique({
        where: { groupId_userId: { groupId: input.groupId, userId } },
      });
      if (!m?.active) {
        throw new Error("Only active members can be included");
      }
    }

    const expense = await tx.expense.create({
      data: {
        groupId: input.groupId,
        recordedById: input.recordedById,
        amount,
        note: input.note.trim() || "Break expense",
        spentAt,
        createdById: input.createdById,
        shares: {
          create: uniqueParticipants.map((userId) => ({ userId, share })),
        },
      },
      include: { shares: true, recordedBy: true },
    });

    for (const userId of uniqueParticipants) {
      const membership = await tx.membership.findUniqueOrThrow({
        where: { groupId_userId: { groupId: input.groupId, userId } },
      });
      const before = roundMoney(membership.balance);
      const after = roundMoney(before - share);
      await tx.membership.update({
        where: { id: membership.id },
        data: { balance: after },
      });
      await tx.accountEntry.create({
        data: {
          groupId: input.groupId,
          userId,
          type: EXPENSE_TYPE,
          description: `Share of ${expense.note}`,
          amount: -share,
          balanceBefore: before,
          balanceAfter: after,
          expenseId: expense.id,
          createdAt: spentAt,
        },
      });
    }

    return expense;
  });
}

export async function deleteExpense(expenseId: string) {
  return prisma.$transaction(async (tx) => {
    const expense = await tx.expense.findUnique({
      where: { id: expenseId },
      include: { accountEntries: true },
    });
    if (!expense) throw new Error("Expense not found");

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
  });
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

  return prisma.$transaction(async (tx) => {
    const person = await tx.user.findUnique({ where: { id: input.userId } });
    if (person?.isAdmin) {
      throw new Error("Admin is the app owner and has no account");
    }

    const membership = await tx.membership.findUnique({
      where: {
        groupId_userId: { groupId: input.groupId, userId: input.userId },
      },
    });
    if (!membership?.active) {
      throw new Error("Only active members can receive account credit");
    }

    const note = input.note.trim() || "Account credit";
    const before = roundMoney(membership.balance);
    const after = roundMoney(before + amount);

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
  });
}

export async function deleteDeposit(accountEntryId: string) {
  return prisma.$transaction(async (tx) => {
    const entry = await tx.accountEntry.findUnique({
      where: { id: accountEntryId },
    });
    if (!entry || !ACCOUNT_TYPES.includes(entry.type as (typeof ACCOUNT_TYPES)[number])) {
      throw new Error("Account entry not found");
    }

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
  });
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
