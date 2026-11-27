"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUser, hashPassword } from "@/lib/auth";
import { getDefaultGroup } from "@/lib/group";
import { prisma } from "@/lib/prisma";

function refresh() {
  revalidatePath("/dashboard");
  revalidatePath("/members");
  revalidatePath("/expenses");
  revalidatePath("/deposits");
  revalidatePath("/statement");
  revalidatePath("/roles");
}

async function defaultMemberRoleId() {
  const member = await prisma.role.findFirst({ where: { name: "Member" } });
  if (member) return member.id;
  const any = await prisma.role.findFirst({ where: { status: "active" } });
  return any?.id || null;
}

export async function addMemberAction(formData: FormData) {
  try {
    await requirePermission("members", "add");
  } catch {
    return { error: "You do not have permission to add members" };
  }

  const group = await getDefaultGroup();

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "").trim();
  let roleId = String(formData.get("roleId") || "").trim();

  if (!name || !email) return { error: "Name and email are required" };
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  if (!roleId) {
    roleId = (await defaultMemberRoleId()) || "";
  }
  if (!roleId) {
    return { error: "Create a role first on the Roles page" };
  }

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role || role.status !== "active") {
    return { error: "Selected role is invalid or inactive" };
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
        data: { name, passwordHash, roleId, isAdmin: false },
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
        data: {
          name,
          email,
          passwordHash,
          isAdmin: false,
          roleId,
        },
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

export async function updateMemberAction(formData: FormData) {
  const session = await requireUser();
  const group = await getDefaultGroup();
  const userId = String(formData.get("userId") || "");
  const roleId = String(formData.get("roleId") || "").trim();
  const active = String(formData.get("active") || "") === "true";

  if (!userId) return { error: "Member required" };

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "Member not found" };
  if (target.isAdmin) return { error: "Admin cannot be edited here" };

  const membership = await prisma.membership.findUnique({
    where: { groupId_userId: { groupId: group.id, userId } },
  });
  if (!membership) return { error: "Member not found" };

  const roleChanging = roleId && roleId !== (target.roleId || "");
  const statusChanging = active !== membership.active;

  if (roleChanging) {
    try {
      await requirePermission("members", "edit");
    } catch {
      try {
        await requirePermission("members", "add");
      } catch {
        try {
          await requirePermission("roles", "edit");
        } catch {
          return { error: "You do not have permission to change roles" };
        }
      }
    }
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role || role.status !== "active") {
      return { error: "Selected role is invalid or inactive" };
    }
  }

  if (statusChanging) {
    try {
      await requirePermission("members", "edit");
    } catch {
      try {
        await requirePermission("members", "add");
      } catch {
        return { error: "You do not have permission to change status" };
      }
    }
    if (userId === session.id && !active) {
      return { error: "You cannot deactivate yourself" };
    }
  }

  if (!roleChanging && !statusChanging) {
    return { ok: true as const };
  }

  if (roleChanging) {
    await prisma.user.update({
      where: { id: userId },
      data: { roleId },
    });
  }

  if (statusChanging) {
    await prisma.membership.update({
      where: { id: membership.id },
      data: { active },
    });
  }

  refresh();
  return { ok: true as const };
}

export async function setMemberActiveAction(formData: FormData) {
  try {
    await requirePermission("members", "delete");
  } catch {
    return { error: "You do not have permission to deactivate members" };
  }

  const session = await requireUser();
  const group = await getDefaultGroup();
  const userId = String(formData.get("userId") || "");
  const active = String(formData.get("active") || "") === "true";

  if (!userId) return { error: "Member required" };
  if (userId === session.id && !active) {
    return { error: "You cannot deactivate yourself" };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (target?.isAdmin && !active) {
    return { error: "Admin cannot be deactivated" };
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
