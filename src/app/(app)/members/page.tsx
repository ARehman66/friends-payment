import { getSession } from "@/lib/auth";
import { getDefaultGroup } from "@/lib/group";
import { prisma } from "@/lib/prisma";
import {
  advanceOf,
  formatMoneyPlain,
  remainingOf,
} from "@/lib/format";
import { MemberAddButton, MemberRowActions } from "@/components/member-forms";
import { PageHeader } from "@/components/page-header";
import { TableToolbar } from "@/components/table-toolbar";
import { Pagination } from "@/components/pagination";
import { parsePage, parsePageSize } from "@/lib/paging";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string }>;
}) {
  const user = await getSession();
  if (!user) return null;
  const group = await getDefaultGroup();
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const page = parsePage(sp.page);
  const pageSize = parsePageSize(sp.pageSize);

  const where = {
    groupId: group.id,
    ...(q
      ? {
          OR: [
            { user: { name: { contains: q } } },
            { user: { email: { contains: q } } },
          ],
        }
      : {}),
  };

  const [total, members] = await Promise.all([
    prisma.membership.count({ where }),
    prisma.membership.findMany({
      where,
      include: { user: true },
      orderBy: [{ active: "desc" }, { user: { name: "asc" } }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <PageHeader
        title="Members"
        subtitle="Create and manage member accounts"
      />

      <div className="card overflow-hidden">
        <TableToolbar
          searchDefault={q}
          searchPlaceholder="Search by name or email…"
          action={user.isAdmin ? <MemberAddButton /> : undefined}
        />

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="col-person">Name</th>
                <th className="col-note">Email</th>
                <th className="col-person">Role</th>
                <th className="col-person">Status</th>
                <th className="col-money">Balance</th>
                <th className="col-action">Action</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const adv = advanceOf(m.balance);
                const rem = remainingOf(m.balance);
                const status =
                  adv > 0
                    ? `Adv ${formatMoneyPlain(adv, group.currency)}`
                    : rem > 0
                      ? `Rem ${formatMoneyPlain(rem, group.currency)}`
                      : "Settled";
                return (
                  <tr key={m.id}>
                    <td className="col-person font-medium text-ink">
                      {m.user.name}
                    </td>
                    <td className="col-note text-muted">{m.user.email}</td>
                    <td className="col-person">
                      {m.user.isAdmin ? "Admin" : "Member"}
                    </td>
                    <td className="col-person">
                      <span
                        className={
                          m.active
                            ? "font-semibold text-good"
                            : "font-semibold text-bad"
                        }
                      >
                        {m.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td
                      className={`col-money font-semibold ${
                        adv > 0
                          ? "text-good"
                          : rem > 0
                            ? "text-bad"
                            : "text-muted"
                      }`}
                    >
                      {status}
                    </td>
                    <td className="col-action">
                      {user.isAdmin ? (
                        <MemberRowActions
                          userId={m.userId}
                          active={m.active}
                          isAdminUser={m.user.isAdmin}
                          name={m.user.name}
                        />
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="!py-10 text-center text-muted">
                    No members found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={pageSize}
          basePath="/members"
          query={{ q: q || undefined }}
        />
      </div>
    </div>
  );
}
