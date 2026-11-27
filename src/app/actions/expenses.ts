"use server";

import { revalidatePath } from "next/cache";
import { requireCashier, requirePermission } from "@/lib/auth";
import { getDefaultGroup } from "@/lib/group";
import {
  createExpense,
  deleteExpense,
  updateExpense,
} from "@/lib/ledger";

function refresh() {
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/deposits");
  revalidatePath("/statement");
  revalidatePath("/members");
}

function parseExpenseForm(formData: FormData) {
  return {
    amount: Number(formData.get("amount")),
    note: String(formData.get("note") || ""),
    dateStr: String(formData.get("spentAt") || ""),
    participantIds: formData.getAll("participantIds").map(String),
  };
}

export async function addExpenseAction(formData: FormData) {
  let user;
  try {
    user = await requireCashier();
  } catch {
    return { error: "Only Cashier (or Admin) can add expenses" };
  }
  try {
    await requirePermission("expenses", "add");
  } catch {
    // Admin/Cashier hard-gate already passed; allow if they have add OR are admin/cashier
    if (!user.isAdmin && (user.roleName || "").toLowerCase() !== "cashier") {
      return { error: "You do not have permission to add expenses" };
    }
  }

  const group = await getDefaultGroup();
  const data = parseExpenseForm(formData);
  const spentAt = data.dateStr
    ? new Date(`${data.dateStr}T12:00:00`)
    : new Date();

  try {
    await createExpense({
      groupId: group.id,
      recordedById: user.id,
      amount: data.amount,
      note: data.note,
      participantIds: data.participantIds,
      createdById: user.id,
      spentAt,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save" };
  }

  refresh();
  return { ok: true as const };
}

export async function updateExpenseAction(formData: FormData) {
  let user;
  try {
    user = await requireCashier();
  } catch {
    return { error: "Only Cashier (or Admin) can edit expenses" };
  }
  const group = await getDefaultGroup();
  const expenseId = String(formData.get("expenseId") || "");
  const data = parseExpenseForm(formData);
  const spentAt = data.dateStr
    ? new Date(`${data.dateStr}T12:00:00`)
    : new Date();

  if (!expenseId) return { error: "Expense id required" };

  try {
    await updateExpense({
      expenseId,
      groupId: group.id,
      recordedById: user.id,
      amount: data.amount,
      note: data.note,
      participantIds: data.participantIds,
      createdById: user.id,
      spentAt,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not update" };
  }

  refresh();
  return { ok: true as const };
}

export async function deleteExpenseAction(formData: FormData) {
  try {
    await requireCashier();
  } catch {
    return { error: "Only Cashier (or Admin) can delete expenses" };
  }
  const expenseId = String(formData.get("expenseId") || "");
  if (!expenseId) return { error: "Expense id required" };

  try {
    await deleteExpense(expenseId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not delete" };
  }

  refresh();
  return { ok: true as const };
}
