import { requirePageAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { RolesManager } from "@/components/roles-manager";

export default async function RolesPage() {
  const user = await requirePageAccess("roles", "view");

  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
  });

  const counts = await Promise.all(
    roles.map(async (role) => ({
      roleId: role.id,
      count: await prisma.user.count({ where: { roleId: role.id } }),
    })),
  );
  const countMap = Object.fromEntries(counts.map((c) => [c.roleId, c.count]));

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
