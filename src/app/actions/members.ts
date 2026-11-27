"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { getDefaultGroup } from "@/lib/group";
import { prisma } from "@/lib/prisma";

function refresh() {
  revalidatePath("/dashboard");
  revalidatePath("/members");
  revalidatePath("/expenses");
  revalidatePath("/deposits");
  revalidatePath("/statement");
}

export async function addMemberAction(formData: FormData) {
  await requireAdmin();
  const group = await getDefaultGroup();

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "").trim();

  if (!name || !email) return { error: "Name and email are required" };
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  const passwordHash = await hashPassword(password);

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      const membership = await prisma.membership.findUnique({
        where: {
          groupId_userId: { groupId: group.id, userId: existing.id },
        },
      });
      if (membership?.active) {
        return { error: "This person is already an active member" };
      }
      await prisma.user.update({
        where: { id: existing.id },
        data: { name, passwordHash },
      });
      if (membership) {
        await prisma.membership.update({
          where: { id: membership.id },
          data: { active: true },
        });
      } else {
        await prisma.membership.create({
          data: {
            groupId: group.id,
            userId: existing.id,
            active: true,
            balance: 0,
          },
        });
      }
    } else {
      const user = await prisma.user.create({
        data: { name, email, passwordHash, isAdmin: false },
      });
      await prisma.membership.create({
        data: {
          groupId: group.id,
          userId: user.id,
          active: true,
          balance: 0,
        },
      });
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not add member" };
  }

  refresh();
  return { ok: true as const };
}

export async function setMemberActiveAction(formData: FormData) {
  const admin = await requireAdmin();
  const group = await getDefaultGroup();
  const userId = String(formData.get("userId") || "");
  const active = String(formData.get("active") || "") === "true";

  if (!userId) return { error: "Member required" };
  if (userId === admin.id && !active) {
    return { error: "Admin cannot deactivate themselves" };
  }

  const membership = await prisma.membership.findUnique({
    where: { groupId_userId: { groupId: group.id, userId } },
  });
  if (!membership) return { error: "Member not found" };

  await prisma.membership.update({
    where: { id: membership.id },
    data: { active },
  });

  refresh();
  return { ok: true as const };
}
