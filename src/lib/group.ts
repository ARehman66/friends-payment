import { cache } from "react";
import { prisma } from "./prisma";

/** One group lookup per request. */
export const getDefaultGroup = cache(async () => {
  let group = await prisma.group.findFirst({ orderBy: { createdAt: "asc" } });
  if (!group) {
    group = await prisma.group.create({
      data: { name: "Office Break", currency: "PKR" },
    });
  }
  return group;
});

export async function ensureMembership(userId: string, groupId: string) {
  return prisma.membership.upsert({
    where: { groupId_userId: { groupId, userId } },
    create: { groupId, userId, active: true, balance: 0 },
    update: {},
  });
}
