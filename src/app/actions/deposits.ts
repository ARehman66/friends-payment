"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getDefaultGroup } from "@/lib/group";
import {
  createDeposit,
  deleteDeposit,
  updateDeposit,
} from "@/lib/ledger";

function refresh() {
  revalidatePath("/dashboard");
  revalidatePath("/deposits");
  revalidatePath("/expenses");
  revalidatePath("/statement");
  revalidatePath("/members");
}

export async function addDepositAction(formData: FormData) {
  await requireUser();
  const group = await getDefaultGroup();

  const amount = Number(formData.get("amount"));
  const userId = String(formData.get("userId") || "");
  const note = String(formData.get("note") || "");
  const dateStr = String(formData.get("depositedAt") || "");
  const depositedAt = dateStr ? new Date(`${dateStr}T12:00:00`) : new Date();

  try {
    await createDeposit({
      groupId: group.id,
      userId,
      amount,
      note,
      depositedAt,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save deposit" };
  }

  refresh();
  return { ok: true as const };
}

export async function updateDepositAction(formData: FormData) {
  await requireUser();
  const group = await getDefaultGroup();
  const ledgerEntryId = String(formData.get("ledgerEntryId") || "");
  const amount = Number(formData.get("amount"));
  const userId = String(formData.get("userId") || "");
  const note = String(formData.get("note") || "");
  const dateStr = String(formData.get("depositedAt") || "");
  const depositedAt = dateStr ? new Date(`${dateStr}T12:00:00`) : new Date();

  if (!ledgerEntryId) return { error: "Deposit id required" };

  try {
    await updateDeposit({
      ledgerEntryId,
      groupId: group.id,
      userId,
      amount,
      note,
      depositedAt,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not update deposit" };
  }

  refresh();
  return { ok: true as const };
}

export async function deleteDepositAction(formData: FormData) {
  await requireUser();
  const ledgerEntryId = String(formData.get("ledgerEntryId") || "");
  if (!ledgerEntryId) return { error: "Deposit id required" };

  try {
    await deleteDeposit(ledgerEntryId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not delete deposit" };
  }

  refresh();
  return { ok: true as const };
}
