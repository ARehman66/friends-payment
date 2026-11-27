import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import {
  allPermissions,
  hasPermission,
  parseRolePermissionsJson,
  permissionsFromRoleEntries,
  type Action,
  type UserPermissions,
} from "./permissions";

const COOKIE = "breakledger_session";

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET must be set to at least 16 characters");
  }
  return new TextEncoder().encode(secret);
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  roleId: string | null;
  roleName: string | null;
  permissions: UserPermissions;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function resolveUserAccess(user: {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  roleId: string | null;
}): Promise<SessionUser> {
  if (user.isAdmin) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: true,
      roleId: user.roleId,
      roleName: "Admin",
      permissions: allPermissions(),
    };
  }

  let roleName: string | null = null;
  let permissions: UserPermissions = permissionsFromRoleEntries([]);

  if (user.roleId) {
    const role = await prisma.role.findUnique({ where: { id: user.roleId } });
    if (role && role.status === "active") {
      roleName = role.name;
      permissions = permissionsFromRoleEntries(
        parseRolePermissionsJson(role.permissions),
      );
    }
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: false,
    roleId: user.roleId,
    roleName,
    permissions,
  };
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({
    sub: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    roleId: user.roleId,
    roleName: user.roleName,
    permissions: user.permissions,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** One JWT decode per request (layout + page share this). No DB on every navigation. */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub || typeof payload.email !== "string") return null;

    const isAdmin = Boolean(payload.isAdmin);
    if (isAdmin) {
      return {
        id: payload.sub,
        name: String(payload.name || ""),
        email: payload.email,
        isAdmin: true,
        roleId: typeof payload.roleId === "string" ? payload.roleId : null,
        roleName: "Admin",
        permissions: allPermissions(),
      };
    }

    return {
      id: payload.sub,
      name: String(payload.name || ""),
      email: payload.email,
      isAdmin: false,
      roleId: typeof payload.roleId === "string" ? payload.roleId : null,
      roleName:
        typeof payload.roleName === "string" ? payload.roleName : null,
      permissions: (payload.permissions as UserPermissions) || {},
    };
  } catch {
    return null;
  }
});

export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireUser();
  if (!session.isAdmin) throw new Error("Only admin can do this");
  return session;
}

export async function requirePermission(
  resourceKey: string,
  action: Action | Action[] = "view",
) {
  const session = await requireUser();
  if (!hasPermission(session, resourceKey, action)) {
    throw new Error("You do not have permission for this action");
  }
  return session;
}

/** Only Admin or Cashier role may record expenses. */
export function isCashier(user: SessionUser): boolean {
  if (user.isAdmin) return true;
  const role = (user.roleName || "").trim().toLowerCase();
  if (role === "cashier") return true;
  return hasPermission(user, "expenses", "add");
}

export async function requireCashier(): Promise<SessionUser> {
  const session = await requireUser();
  if (!isCashier(session)) {
    throw new Error("Only Cashier can add expenses");
  }
  return session;
}

export async function loginWithCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user) return { error: "Invalid email or password" as const };

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return { error: "Invalid email or password" as const };

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, active: true },
  });
  if (!membership && !user.isAdmin) {
    return { error: "Your account is inactive. Ask admin to activate you." as const };
  }

  const sessionUser = await resolveUserAccess(user);
  await createSession(sessionUser);
  return { user: sessionUser };
}
