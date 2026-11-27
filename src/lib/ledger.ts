import { prisma } from "./prisma";
import { roundMoney } from "./format";

export async function createExpense(input: {
  groupId: string;
  paidById: string;
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
  if (!input.participantIds.includes(input.paidById)) {
    throw new Error("The payer must be in the present list");
  }

  const uniqueParticipants = [...new Set(input.participantIds)];
  const share = roundMoney(amount / uniqueParticipants.length);
  const spentAt = input.spentAt || new Date();

  return prisma.$transaction(async (tx) => {
    for (const userId of uniqueParticipants) {
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
        paidById: input.paidById,
        amount,
        note: input.note.trim() || "Break expense",
        spentAt,
        createdById: input.createdById,
        participants: {
          create: uniqueParticipants.map((userId) => ({ userId, share })),
        },
      },
      include: { participants: true, paidBy: true },
    });

    const payerMembership = await tx.membership.findUniqueOrThrow({
      where: {
        groupId_userId: { groupId: input.groupId, userId: input.paidById },
      },
    });

    const payerBefore = roundMoney(payerMembership.balance);
    const payerAfterCredit = roundMoney(payerBefore + amount);
    await tx.membership.update({
      where: { id: payerMembership.id },
      data: { balance: payerAfterCredit },
    });
    await tx.ledgerEntry.create({
      data: {
        groupId: input.groupId,
        userId: input.paidById,
        type: "PAID",
        description: `Paid ${expense.note} (${uniqueParticipants.length} present)`,
        amount,
        balanceBefore: payerBefore,
        balanceAfter: payerAfterCredit,
        expenseId: expense.id,
        createdAt: spentAt,
      },
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
      await tx.ledgerEntry.create({
        data: {
          groupId: input.groupId,
          userId,
          type: "SHARE",
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
      include: { ledgerEntries: true },
    });
    if (!expense) throw new Error("Expense not found");

    for (const entry of expense.ledgerEntries) {
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

    await tx.ledgerEntry.deleteMany({ where: { expenseId } });
    await tx.expenseParticipant.deleteMany({ where: { expenseId } });
    await tx.expense.delete({ where: { id: expenseId } });
  });
}

export async function updateExpense(input: {
  expenseId: string;
  groupId: string;
  paidById: string;
  amount: number;
  note: string;
  participantIds: string[];
  createdById: string;
  spentAt?: Date;
}) {
  await deleteExpense(input.expenseId);
  return createExpense({
    groupId: input.groupId,
    paidById: input.paidById,
    amount: input.amount,
    note: input.note,
    participantIds: input.participantIds,
    createdById: input.createdById,
    spentAt: input.spentAt,
  });
}

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
    const membership = await tx.membership.findUnique({
      where: {
        groupId_userId: { groupId: input.groupId, userId: input.userId },
      },
    });
    if (!membership?.active) {
      throw new Error("Only active members can add a deposit");
    }

    const note = input.note.trim() || "Deposit / advance";
    const before = roundMoney(membership.balance);
    const after = roundMoney(before + amount);

    await tx.membership.update({
      where: { id: membership.id },
      data: { balance: after },
    });

    const settlement = await tx.settlement.create({
      data: {
        groupId: input.groupId,
        fromUserId: input.userId,
        toUserId: input.userId,
        amount,
        note,
        createdAt: depositedAt,
      },
    });

    const entry = await tx.ledgerEntry.create({
      data: {
        groupId: input.groupId,
        userId: input.userId,
        type: "DEPOSIT",
        description: note,
        amount,
        balanceBefore: before,
        balanceAfter: after,
        settlementId: settlement.id,
        createdAt: depositedAt,
      },
    });

    return { settlement, entry };
  });
}

export async function deleteDeposit(ledgerEntryId: string) {
  return prisma.$transaction(async (tx) => {
    const entry = await tx.ledgerEntry.findUnique({
      where: { id: ledgerEntryId },
    });
    if (!entry || entry.type !== "DEPOSIT") {
      throw new Error("Deposit not found");
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

    const settlementId = entry.settlementId;
    await tx.ledgerEntry.delete({ where: { id: entry.id } });
    if (settlementId) {
      await tx.settlement.delete({ where: { id: settlementId } }).catch(() => null);
    }
  });
}

export async function updateDeposit(input: {
  ledgerEntryId: string;
  groupId: string;
  userId: string;
  amount: number;
  note: string;
  depositedAt?: Date;
}) {
  await deleteDeposit(input.ledgerEntryId);
  return createDeposit({
    groupId: input.groupId,
    userId: input.userId,
    amount: input.amount,
    note: input.note,
    depositedAt: input.depositedAt,
  });
}
