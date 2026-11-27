import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  defaultMemberPermissions,
  fullAdminPermissions,
  normalizePermissionMap,
  RESOURCES,
} from "../src/lib/permissions";

const prisma = new PrismaClient();

function cashierPermissions() {
  return RESOURCES.map((r) => {
    const canExpense = r.key === "expenses";
    const canView =
      canExpense ||
      ["dashboard", "deposits", "statement"].includes(r.key);
    return {
      resourceKey: r.key,
      permissions: normalizePermissionMap(
        {
          view: canView,
          add: canExpense,
          edit: false,
          delete: false,
          all: false,
        },
        r.actions,
      ),
    };
  });
}

async function ensureRoles() {
  let memberRole = await prisma.role.findFirst({
    where: { name: "Member" },
  });
  if (!memberRole) {
    memberRole = await prisma.role.create({
      data: {
        name: "Member",
        description: "View dashboard, account, expenses, statement",
        status: "active",
        permissions: defaultMemberPermissions(),
      },
    });
  }

  let cashierRole = await prisma.role.findFirst({
    where: { name: "Cashier" },
  });
  if (!cashierRole) {
    cashierRole = await prisma.role.create({
      data: {
        name: "Cashier",
        description: "Only role that can record expenses (cuts account balances)",
        status: "active",
        permissions: cashierPermissions(),
      },
    });
  } else {
    await prisma.role.update({
      where: { id: cashierRole.id },
      data: { permissions: cashierPermissions() },
    });
  }

  let managerRole = await prisma.role.findFirst({
    where: { name: "Manager" },
  });
  if (!managerRole) {
    managerRole = await prisma.role.create({
      data: {
        name: "Manager",
        description: "Manage account, members — expenses only via Cashier",
        status: "active",
        permissions: fullAdminPermissions().map((entry) => ({
          ...entry,
          permissions:
            entry.resourceKey === "roles" || entry.resourceKey === "expenses"
              ? {
                  all: false,
                  view: entry.resourceKey === "expenses",
                  add: false,
                  edit: false,
                  delete: false,
                }
              : { all: true, view: true, add: true, edit: true, delete: true },
        })),
      },
    });
  }

  return { memberRole, cashierRole, managerRole };
}

async function main() {
  const name = process.env.ADMIN_NAME || "Admin";
  const email = (process.env.ADMIN_EMAIL || "admin@breakledger.app")
    .trim()
    .toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const passwordHash = await bcrypt.hash(password, 10);
  const reset = process.env.SEED_RESET === "true";

  const { memberRole, cashierRole } = await ensureRoles();

  const group = await prisma.group.upsert({
    where: { id: "seed-office-break" },
    update: { name: "Office Break" },
    create: {
      id: "seed-office-break",
      name: "Office Break",
      currency: "PKR",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, isAdmin: true },
    create: { name, email, passwordHash, isAdmin: true },
  });

  await prisma.membership.upsert({
    where: { groupId_userId: { groupId: group.id, userId: admin.id } },
    update: { active: true },
    create: {
      groupId: group.id,
      userId: admin.id,
      active: true,
      balance: 0,
    },
  });

  await prisma.user.updateMany({
    where: { isAdmin: false, roleId: null },
    data: { roleId: memberRole.id },
  });

  if (reset) {
    const extras = await prisma.user.findMany({
      where: { id: { not: admin.id } },
      select: { id: true, email: true },
    });

    for (const extra of extras) {
      await prisma.accountEntry.deleteMany({ where: { userId: extra.id } });
      await prisma.expenseShare.deleteMany({ where: { userId: extra.id } });
      await prisma.expense.deleteMany({ where: { recordedById: extra.id } });
      await prisma.membership.deleteMany({ where: { userId: extra.id } });
      await prisma.user.delete({ where: { id: extra.id } });
      console.log(`Removed member: ${extra.email}`);
    }

    await prisma.membership.updateMany({
      where: { userId: admin.id },
      data: { balance: 0 },
    });
    await prisma.accountEntry.deleteMany({ where: { userId: admin.id } });
    await prisma.expense.deleteMany({ where: { groupId: group.id } });
  }

  console.log(`Admin ready: ${email}`);
  console.log(`Roles: Member, Cashier (${cashierRole.id}), Manager`);
  console.log("Assign Cashier role to the person who records expenses.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
