"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AutoRefresh } from "@/components/auto-refresh";
import { LogoutButton } from "@/components/logout-button";
import { IconMenu } from "@/components/icons";
import type { SessionUser } from "@/lib/auth";
import { RESOURCES, hasPermission } from "@/lib/permissions";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Shell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = RESOURCES.filter(
    (r) => r.href && hasPermission(user, r.key, "view"),
  ).map((r) => ({ href: r.href!, label: r.name }));

  const current =
    links.find((l) => pathname === l.href || pathname.startsWith(`${l.href}/`))
      ?.label || "BreakLedger";
  const headerTitle =
    current === "Dashboard" ? "Dashboard" : `Manage ${current.toLowerCase()}`;

  const nav = (
    <nav className="flex flex-col gap-1 px-3 py-3">
      {links.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "border border-brand/25 bg-brand/10 text-brand"
                : "border border-transparent text-ink/70 hover:bg-bg hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const userBlock = (
    <div className="mt-auto flex items-center gap-3 border-t border-line px-4 py-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-bold text-brand">
        {initials(user.name)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink">{user.name}</p>
        <p className="truncate text-xs text-muted">
          {user.isAdmin ? "Admin" : user.roleName || "No role"} · {user.email}
        </p>
      </div>
    </div>
  );

  const sidebarInner = (
    <>
      <div className="border-b border-line px-5 py-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-sm font-bold text-white">
            BL
          </span>
          <div>
            <p className="text-base font-bold tracking-tight text-ink">
              BreakLedger
            </p>
            <p className="text-[11px] text-muted">Office break money</p>
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{nav}</div>
      {userBlock}
    </>
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      <AutoRefresh intervalMs={20000} />
      <aside className="hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-panel lg:flex">
        {sidebarInner}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/35"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-[min(17rem,88vw)] flex-col bg-panel shadow-xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="font-bold text-ink">Menu</p>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-muted"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>
            {sidebarInner}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-30 flex shrink-0 items-center justify-between gap-3 border-b border-line bg-panel px-3 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              className="shrink-0 rounded-lg border border-line p-2 text-ink lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <IconMenu />
            </button>
            <p className="truncate text-base font-semibold text-ink sm:text-lg">
              {headerTitle}
            </p>
          </div>
          <LogoutButton />
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
