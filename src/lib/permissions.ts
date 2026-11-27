export const BASE_ACTIONS = ["all", "view", "add", "edit", "delete"] as const;
export type Action = (typeof BASE_ACTIONS)[number];

export type PermissionMap = Partial<Record<Action, boolean>>;

export type RolePermissionEntry = {
  resourceKey: string;
  permissions: PermissionMap;
};

export type ResourceDef = {
  key: string;
  name: string;
  description: string;
  actions: Action[];
  href?: string;
};

/** Catalog for Roles UI + nav gating (same idea as my-app-backend rbacService). */
export const RESOURCES: ResourceDef[] = [
  {
    key: "dashboard",
    name: "Dashboard",
    description: "Member balance cards",
    actions: ["all", "view"],
    href: "/dashboard",
  },
  {
    key: "expenses",
    name: "Expenses",
    description: "View and add break expenses",
    actions: ["all", "view", "add"],
    href: "/expenses",
  },
  {
    key: "deposits",
    name: "Deposits",
    description: "View and add advances",
    actions: ["all", "view", "add"],
    href: "/deposits",
  },
  {
    key: "members",
    name: "Members",
    description: "Add and deactivate members",
    actions: ["all", "view", "add", "delete"],
    href: "/members",
  },
  {
    key: "statement",
    name: "Statement",
    description: "Ledger history",
    actions: ["all", "view"],
    href: "/statement",
  },
  {
    key: "roles",
    name: "Roles",
    description: "Roles and permissions",
    actions: ["all", "view", "add", "edit", "delete"],
    href: "/roles",
  },
];

export type UserPermissions = Record<string, PermissionMap>;

export function emptyPermissionMap(actions: Action[]): PermissionMap {
  const map: PermissionMap = {};
  for (const a of actions) map[a] = false;
  return map;
}

export function normalizePermissionMap(
  raw: PermissionMap | null | undefined,
  actions: Action[] = [...BASE_ACTIONS],
): PermissionMap {
  const out = emptyPermissionMap(actions);
  if (!raw) return out;
  for (const a of actions) {
    out[a] = Boolean(raw[a]);
  }
  if (out.all) {
    for (const a of actions) out[a] = true;
  }
  return out;
}

export function permissionsFromRoleEntries(
  entries: RolePermissionEntry[] | null | undefined,
): UserPermissions {
  const result: UserPermissions = {};
  for (const resource of RESOURCES) {
    const entry = (entries || []).find(
      (e) => e.resourceKey.toLowerCase() === resource.key,
    );
    result[resource.key] = normalizePermissionMap(
      entry?.permissions,
      resource.actions,
    );
  }
  return result;
}

export function allPermissions(): UserPermissions {
  const result: UserPermissions = {};
  for (const resource of RESOURCES) {
    result[resource.key] = normalizePermissionMap({ all: true }, resource.actions);
  }
  return result;
}

export function hasPermission(
  user: {
    isAdmin: boolean;
    permissions?: UserPermissions | null;
  },
  resourceKey: string,
  action: Action | Action[] = "view",
  op: "AND" | "OR" = "AND",
): boolean {
  if (user.isAdmin) return true;
  const key = resourceKey.trim().toLowerCase();
  const modulePerm = user.permissions?.[key];
  if (!modulePerm) return false;

  const actions = Array.isArray(action) ? action : [action];
  const check = (a: string) => Boolean(modulePerm.all || modulePerm[a as Action]);

  if (op === "OR") return actions.some(check);
  return actions.every(check);
}

export function defaultMemberPermissions(): RolePermissionEntry[] {
  return RESOURCES.map((r) => ({
    resourceKey: r.key,
    permissions: normalizePermissionMap(
      {
        view: ["dashboard", "expenses", "deposits", "statement"].includes(r.key),
      },
      r.actions,
    ),
  }));
}

export function fullAdminPermissions(): RolePermissionEntry[] {
  return RESOURCES.map((r) => ({
    resourceKey: r.key,
    permissions: normalizePermissionMap({ all: true }, r.actions),
  }));
}

export function parseRolePermissionsJson(value: unknown): RolePermissionEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const resourceKey = String(
        (entry as { resourceKey?: string }).resourceKey || "",
      )
        .trim()
        .toLowerCase();
      if (!resourceKey) return null;
      const resource = RESOURCES.find((r) => r.key === resourceKey);
      const permissions = normalizePermissionMap(
        (entry as { permissions?: PermissionMap }).permissions,
        resource?.actions || [...BASE_ACTIONS],
      );
      return { resourceKey, permissions };
    })
    .filter((e): e is RolePermissionEntry => e !== null);
}
