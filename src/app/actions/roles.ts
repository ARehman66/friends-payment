"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  RESOURCES,
  normalizePermissionMap,
  type RolePermissionEntry,
} from "@/lib/permissions";

function refresh() {
  revalidatePath("/roles");
  revalidatePath("/members");
  revalidatePath("/dashboard");
}

function buildPermissionsFromForm(formData: FormData): RolePermissionEntry[] {
  return RESOURCES.map((resource) => {
    const permissions = normalizePermissionMap({}, resource.actions);
    for (const action of resource.actions) {
      const checked =
        formData.get(`perm__${resource.key}__${action}`) === "on" ||
        formData.get(`perm__${resource.key}__${action}`) === "true";
      permissions[action] = checked;
    }
    if (permissions.all) {
      for (const action of resource.actions) permissions[action] = true;
    }
    return { resourceKey: resource.key, permissions };
  });
}

export async function createRoleAction(formData: FormData) {
  try {
    await requirePermission("roles", "add");
  } catch {
    return { error: "You do not have permission to create roles" };
  }

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const status =
    String(formData.get("status") || "active") === "inactive"
      ? "inactive"
      : "active";

  if (!name) return { error: "Role name is required" };

  const allRoles = await prisma.role.findMany();
  if (allRoles.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
    return { error: "A role with this name already exists" };
  }

  await prisma.role.create({
    data: {
      name,
      description,
      status,
      permissions: buildPermissionsFromForm(formData),
    },
  });

  refresh();
  return { ok: true as const };
}

export async function updateRoleAction(formData: FormData) {
  try {
    await requirePermission("roles", "edit");
  } catch {
    return { error: "You do not have permission to edit roles" };
  }

  const roleId = String(formData.get("roleId") || "");
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const status =
    String(formData.get("status") || "active") === "inactive"
      ? "inactive"
      : "active";

  if (!roleId) return { error: "Role required" };
  if (!name) return { error: "Role name is required" };

  const allRoles = await prisma.role.findMany();
  if (
    allRoles.some(
      (r) => r.id !== roleId && r.name.toLowerCase() === name.toLowerCase(),
    )
  ) {
    return { error: "A role with this name already exists" };
  }

  await prisma.role.update({
    where: { id: roleId },
    data: {
      name,
      description,
      status,
      permissions: buildPermissionsFromForm(formData),
    },
  });

  refresh();
  return { ok: true as const };
}

export async function deleteRoleAction(formData: FormData) {
  try {
    await requirePermission("roles", "delete");
  } catch {
    return { error: "You do not have permission to delete roles" };
  }

  const roleId = String(formData.get("roleId") || "");
  if (!roleId) return { error: "Role required" };

  const assigned = await prisma.user.count({ where: { roleId } });
  if (assigned > 0) {
    return {
      error: `Cannot delete: ${assigned} user(s) still have this role. Reassign them first.`,
    };
  }

  await prisma.role.delete({ where: { id: roleId } });
  refresh();
  return { ok: true as const };
}

export async function setUserRoleAction(formData: FormData) {
  try {
    await requirePermission("members", "add");
  } catch {
    try {
      await requirePermission("roles", "edit");
    } catch {
      return { error: "You do not have permission to assign roles" };
    }
  }

  const userId = String(formData.get("userId") || "");
  const roleId = String(formData.get("roleId") || "");
  if (!userId || !roleId) return { error: "User and role are required" };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found" };
  if (user.isAdmin) return { error: "Admin does not use assigned roles" };

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role || role.status !== "active") {
    return { error: "Role not found or inactive" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { roleId },
  });

  refresh();
  return { ok: true as const };
}
