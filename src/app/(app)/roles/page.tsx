import { requirePageAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { RolesManager } from "@/components/roles-manager";

export default async function RolesPage() {
  const user = await requirePageAccess("roles", "view");

  const [roles, roleCounts] = await Promise.all([
    prisma.role.findMany({ orderBy: { name: "asc" } }),
    prisma.user.groupBy({
      by: ["roleId"],
      where: { roleId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const countMap = Object.fromEntries(
    roleCounts
      .filter((r) => r.roleId)
      .map((r) => [r.roleId as string, r._count._all]),
  );

  return (
    <div>
      <PageHeader
        title="Roles"
        subtitle="Create roles and assign module permissions"
      />
      <RolesManager
        user={user}
        roles={roles.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          status: r.status,
          permissions: r.permissions,
          userCount: countMap[r.id] || 0,
        }))}
      />
    </div>
  );
}
