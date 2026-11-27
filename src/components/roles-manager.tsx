"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createRoleAction,
  deleteRoleAction,
  updateRoleAction,
} from "@/app/actions/roles";
import { Modal } from "@/components/modal";
import { ConfirmModal } from "@/components/confirm-modal";
import { Can } from "@/components/can";
import { IconPlus, IconEdit, IconTrash } from "@/components/icons";
import {
  RESOURCES,
  parseRolePermissionsJson,
  type Action,
  type UserPermissions,
} from "@/lib/permissions";

export type RoleRow = {
  id: string;
  name: string;
  description: string;
  status: string;
  permissions: unknown;
  userCount: number;
};

type SessionLike = {
  isAdmin: boolean;
  permissions?: UserPermissions | null;
};

function emptyChecks() {
  const map: Record<string, Record<string, boolean>> = {};
  for (const r of RESOURCES) {
    map[r.key] = {};
    for (const a of r.actions) map[r.key][a] = false;
  }
  return map;
}

function checksFromRole(role: RoleRow | null) {
  const map = emptyChecks();
  if (!role) return map;
  const entries = parseRolePermissionsJson(role.permissions);
  for (const entry of entries) {
    const resource = RESOURCES.find((r) => r.key === entry.resourceKey);
    if (!resource) continue;
    for (const a of resource.actions) {
      map[entry.resourceKey][a] = Boolean(entry.permissions[a]);
    }
  }
  return map;
}

export function RolesManager({
  roles,
  user,
}: {
  roles: RoleRow[];
  user: SessionLike;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleRow | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");
  const [checks, setChecks] = useState(emptyChecks());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<string | null>(null);

  const title = editing ? "Edit role" : "Add role";

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setStatus("active");
    setChecks(emptyChecks());
    setError(null);
    setOpen(true);
  }

  function openEdit(role: RoleRow) {
    setEditing(role);
    setName(role.name);
    setDescription(role.description);
    setStatus(role.status === "inactive" ? "inactive" : "active");
    setChecks(checksFromRole(role));
    setError(null);
    setOpen(true);
  }

  function toggle(resourceKey: string, action: Action) {
    setChecks((prev) => {
      const next = {
        ...prev,
        [resourceKey]: { ...prev[resourceKey], [action]: !prev[resourceKey][action] },
      };
      if (action === "all" && next[resourceKey].all) {
        const resource = RESOURCES.find((r) => r.key === resourceKey);
        for (const a of resource?.actions || []) next[resourceKey][a] = true;
      }
      return next;
    });
  }

  function save() {
    setError(null);
    const fd = new FormData();
    if (editing) fd.set("roleId", editing.id);
    fd.set("name", name);
    fd.set("description", description);
    fd.set("status", status);
    for (const r of RESOURCES) {
      for (const a of r.actions) {
        if (checks[r.key][a]) fd.set(`perm__${r.key}__${a}`, "true");
      }
    }

    startTransition(async () => {
      const result = editing
        ? await updateRoleAction(fd)
        : await createRoleAction(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  const summary = useMemo(() => {
    return roles.map((role) => {
      const entries = parseRolePermissionsJson(role.permissions);
      const enabled = entries.filter((e) =>
        Object.values(e.permissions).some(Boolean),
      ).length;
      return { id: role.id, enabled };
    });
  }, [roles]);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Can user={user} resource="roles" action="add">
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <IconPlus />
            Add role
          </button>
        </Can>
      </div>

      <div className="card overflow-hidden">
        {roles.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">
            No roles yet. Create one to assign permissions to members.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {roles.map((role) => {
              const enabled =
                summary.find((s) => s.id === role.id)?.enabled || 0;
              const isOpen = expanded === role.id;
              return (
                <li key={role.id} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() =>
                        setExpanded(isOpen ? null : role.id)
                      }
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ink">{role.name}</p>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                            role.status === "active"
                              ? "bg-good/10 text-good"
                              : "bg-bad/10 text-bad"
                          }`}
                        >
                          {role.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {role.description || "No description"}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {enabled} module(s) · {role.userCount} user(s)
                      </p>
                    </button>
                    <div className="inline-flex items-center gap-1">
                      <Can user={user} resource="roles" action="edit">
                        <button
                          type="button"
                          className="icon-btn"
                          title="Edit"
                          onClick={() => openEdit(role)}
                        >
                          <IconEdit />
                        </button>
                      </Can>
                      <Can user={user} resource="roles" action="delete">
                        <button
                          type="button"
                          className="icon-btn icon-btn-danger"
                          title="Delete"
                          onClick={() => setDeleteTarget(role)}
                        >
                          <IconTrash />
                        </button>
                      </Can>
                    </div>
                  </div>
                  {isOpen ? (
                    <div className="mt-3 overflow-x-auto rounded-xl border border-[#d7e0ea] bg-[#f7f9fb]">
                      <table className="w-full min-w-[520px] text-left text-xs">
                        <thead>
                          <tr className="border-b border-line text-muted">
                            <th className="px-3 py-2 font-semibold">Module</th>
                            {(["all", "view", "add", "edit", "delete"] as Action[]).map(
                              (a) => (
                                <th
                                  key={a}
                                  className="px-2 py-2 text-center font-semibold capitalize"
                                >
                                  {a}
                                </th>
                              ),
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {RESOURCES.map((resource) => {
                            const entry = parseRolePermissionsJson(
                              role.permissions,
                            ).find((e) => e.resourceKey === resource.key);
                            return (
                              <tr
                                key={resource.key}
                                className="border-t border-line/70"
                              >
                                <td className="px-3 py-2 font-medium text-ink">
                                  {resource.name}
                                </td>
                                {(["all", "view", "add", "edit", "delete"] as Action[]).map(
                                  (a) => (
                                    <td
                                      key={a}
                                      className="px-2 py-2 text-center text-muted"
                                    >
                                      {resource.actions.includes(a)
                                        ? entry?.permissions[a]
                                          ? "✓"
                                          : "—"
                                        : ""}
                                    </td>
                                  ),
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Modal open={open} title={title} onClose={() => setOpen(false)}>
        <div className="modal-form">
          <label className="modal-field">
            <span>Name</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Accountant"
              required
            />
          </label>
          <label className="modal-field">
            <span>Description</span>
            <input
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Can view money pages only"
            />
          </label>
          <label className="modal-field">
            <span>Status</span>
            <select
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>

          <div className="modal-field">
            <span>Permissions</span>
            <div className="overflow-x-auto rounded-xl border border-[#d7e0ea]">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="bg-[#eef3f7]">
                  <tr>
                    <th className="px-3 py-2 font-semibold text-muted">Module</th>
                    {(["all", "view", "add", "edit", "delete"] as Action[]).map(
                      (a) => (
                        <th
                          key={a}
                          className="px-2 py-2 text-center font-semibold capitalize text-muted"
                        >
                          {a}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {RESOURCES.map((resource) => (
                    <tr key={resource.key} className="border-t border-line">
                      <td className="px-3 py-2">
                        <p className="font-medium text-ink">{resource.name}</p>
                        <p className="text-[10px] text-muted">
                          {resource.description}
                        </p>
                      </td>
                      {(["all", "view", "add", "edit", "delete"] as Action[]).map(
                        (a) => (
                          <td key={a} className="px-2 py-2 text-center">
                            {resource.actions.includes(a) ? (
                              <input
                                type="checkbox"
                                checked={Boolean(checks[resource.key][a])}
                                onChange={() => toggle(resource.key, a)}
                                aria-label={`${resource.name} ${a}`}
                              />
                            ) : null}
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {error ? (
            <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={pending || !name.trim()}
            onClick={save}
          >
            {pending ? "Saving…" : editing ? "Update role" : "Create role"}
          </button>
        </div>
      </Modal>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete role?"
        message={
          deleteTarget
            ? `Delete “${deleteTarget.name}”? Users must be reassigned first.`
            : ""
        }
        confirmLabel="Delete role"
        pending={pending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          const fd = new FormData();
          fd.set("roleId", deleteTarget.id);
          startTransition(async () => {
            const result = await deleteRoleAction(fd);
            if (result?.error) {
              setError(result.error);
              setDeleteTarget(null);
              return;
            }
            setDeleteTarget(null);
            router.refresh();
          });
        }}
      />
    </>
  );
}
