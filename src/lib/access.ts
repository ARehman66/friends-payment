import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasPermission, type Action, RESOURCES } from "@/lib/permissions";

export async function requirePageAccess(
  resourceKey: string,
  action: Action = "view",
) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (!hasPermission(user, resourceKey, action)) {
    const fallback = RESOURCES.find((r) =>
      hasPermission(user, r.key, "view"),
    );
    redirect(fallback?.href || "/login");
  }
  return user;
}
