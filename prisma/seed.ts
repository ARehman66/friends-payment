import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  defaultMemberPermissions,
  fullAdminPermissions,
} from "../src/lib/permissions";

const prisma = new PrismaClient();

async function ensureRoles() {
  let memberRole = await prisma.role.findFirst({
    where: { name: "Member" },
  });
  if (!memberRole) {
    memberRole = await prisma.role.create({
      data: {
        name: "Member",
        description: "Default access: view dashboard, expenses, deposits, statement",
        status: "active",
        permissions: defaultMemberPermissions(),
      },
    });
  }

  let managerRole = await prisma.role.findFirst({
    where: { name: "Manager" },
  });
  if (!managerRole) {
    managerRole = await prisma.role.create({
      data: {
        name: "Manager",
        description: "Can manage expenses, deposits, and members",
        status: "active",
        permissions: fullAdminPermissions().map((entry) => ({
          ...entry,
          permissions:
            entry.resourceKey === "roles"
              ? { all: false, view: false, add: false, edit: false, delete: false }
              : { all: true, view: true, add: true, edit: true, delete: true },
        })),
      },
    });
  }

  return { memberRole, managerRole };
}

async function main() {
  const name = process.env.ADMIN_NAME || "Admin";
  const email = (process.env.ADMIN_EMAIL || "admin@breakledger.app")
    .trim()
    .toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const passwordHash = await bcrypt.hash(password, 10);
  const reset = process.env.SEED_RESET === "true";

  const { memberRole } = await ensureRoles();

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

  // Assign default Member role to any non-admin without a role
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
      await prisma.ledgerEntry.deleteMany({ where: { userId: extra.id } });
      await prisma.expenseParticipant.deleteMany({ where: { userId: extra.id } });
      await prisma.expense.deleteMany({ where: { paidById: extra.id } });
      await prisma.settlement.deleteMany({
        where: {
          OR: [{ fromUserId: extra.id }, { toUserId: extra.id }],
        },
      });
      await prisma.membership.deleteMany({ where: { userId: extra.id } });
      await prisma.user.delete({ where: { id: extra.id } });
      console.log(`Removed member: ${extra.email}`);
    }

    await prisma.membership.updateMany({
      where: { userId: admin.id },
      data: { balance: 0 },
    });
    await prisma.ledgerEntry.deleteMany({ where: { userId: admin.id } });
    await prisma.expense.deleteMany({ where: { groupId: group.id } });
    await prisma.settlement.deleteMany({ where: { groupId: group.id } });
  }

  console.log(`Admin ready: ${email}`);
  console.log(`Default roles: Member (${memberRole.id}), Manager`);
  console.log("Add friends from Members page (they get Member role by default).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
