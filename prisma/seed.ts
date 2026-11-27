import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const name = process.env.ADMIN_NAME || "Admin";
  const email = (process.env.ADMIN_EMAIL || "admin@breakledger.app")
    .trim()
    .toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const passwordHash = await bcrypt.hash(password, 10);

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

  // Remove demo / extra members — keep only admin from env
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

  // Reset admin balance clean
  await prisma.membership.updateMany({
    where: { userId: admin.id },
    data: { balance: 0 },
  });
  await prisma.ledgerEntry.deleteMany({ where: { userId: admin.id } });
  await prisma.expense.deleteMany({ where: { groupId: group.id } });
  await prisma.settlement.deleteMany({ where: { groupId: group.id } });

  console.log(`Admin ready: ${email} / ${password}`);
  console.log("Only admin remains. Add friends from Members page.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
