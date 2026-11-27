"use client";

import type { ReactNode } from "react";
import {
  hasPermission,
  type Action,
  type UserPermissions,
} from "@/lib/permissions";

export function Can({
  user,
  resource,
  action = "view",
  op = "AND",
  children,
  fallback = null,
}: {
  user: {
    isAdmin: boolean;
    permissions?: UserPermissions | null;
  };
  resource: string;
  action?: Action | Action[];
  op?: "AND" | "OR";
  children: ReactNode;
  fallback?: ReactNode;
}) {
  if (!hasPermission(user, resource, action, op)) return <>{fallback}</>;
  return <>{children}</>;
}
