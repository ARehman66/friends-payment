"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMemberAction, updateMemberAction } from "@/app/actions/members";
import { Modal } from "@/components/modal";
import { IconEdit, IconPlus } from "@/components/icons";

type RoleOption = { id: string; name: string };

export function MemberAddButton({
  roles,
  defaultRoleId,
}: {
  roles: RoleOption[];
  defaultRoleId?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        <IconPlus />
        Add member
      </button>
      <Modal open={open} title="Add member" onClose={() => setOpen(false)}>
        <form
          className="modal-form"
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const result = await addMemberAction(formData);
              if (result?.error) {
                setError(result.error);
                return;
              }
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <label className="modal-field">
            <span>Name</span>
            <input name="name" required className="input" placeholder="Ali" />
          </label>
          <label className="modal-field">
            <span>Email</span>
            <input
              name="email"
              type="email"
              required
              className="input"
              placeholder="ali@office.com"
            />
          </label>
          <label className="modal-field">
            <span>Password</span>
            <input
              name="password"
              type="text"
              required
              minLength={6}
              className="input"
              placeholder="at least 6 characters"
            />
          </label>
          <label className="modal-field">
            <span>Role</span>
            <select
              name="roleId"
              className="input"
              required
              defaultValue={defaultRoleId || roles[0]?.id || ""}
            >
              {roles.length === 0 ? (
                <option value="">No roles — create one first</option>
              ) : (
                roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))
              )}
            </select>
          </label>
          {error ? (
            <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>
          ) : null}
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={pending || roles.length === 0}
          >
            {pending ? "Adding…" : "Add member"}
          </button>
        </form>
      </Modal>
    </>
  );
}

export function MemberRowActions({
  userId,
  active,
  isAdminUser,
  name,
  email,
  roleId,
  roleName,
  roles,
  canEdit,
}: {
  userId: string;
  active: boolean;
  isAdminUser: boolean;
  name: string;
  email: string;
  roleId: string | null;
  roleName: string | null;
  roles: RoleOption[];
  canEdit: boolean;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState(roleId || "");
  const [selectedActive, setSelectedActive] = useState(active ? "true" : "false");

  if (isAdminUser || !canEdit) {
    return <span className="text-xs text-muted">—</span>;
  }

  function openEdit() {
    setSelectedRoleId(roleId || roles[0]?.id || "");
    setSelectedActive(active ? "true" : "false");
    setError(null);
    setEditOpen(true);
  }

  function saveEdit() {
    setError(null);
    const fd = new FormData();
    fd.set("userId", userId);
    fd.set("roleId", selectedRoleId);
    fd.set("active", selectedActive);
    startTransition(async () => {
      const result = await updateMemberAction(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setEditOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        className="icon-btn"
        title="Edit member"
        disabled={pending}
        onClick={openEdit}
      >
        <IconEdit />
      </button>
      {error && !editOpen ? (
        <p className="mt-1 text-xs text-bad">{error}</p>
      ) : null}

      <Modal open={editOpen} title="Edit member" onClose={() => setEditOpen(false)}>
        <div className="modal-form">
          <div className="rounded-xl border border-[#d7e0ea] bg-[#f7f9fb] px-3.5 py-3 text-left">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              Member
            </p>
            <p className="mt-1 text-sm font-semibold text-ink">{name}</p>
            <p className="mt-0.5 text-xs text-muted">{email}</p>
          </div>

          <label className="modal-field">
            <span>Role</span>
            <select
              className="input"
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              disabled={roles.length === 0}
            >
              {roles.length === 0 ? (
                <option value="">No roles available</option>
              ) : (
                roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))
              )}
            </select>
            {!roleId && roleName ? (
              <p className="text-xs text-muted">Current: {roleName}</p>
            ) : null}
          </label>

          <label className="modal-field">
            <span>Status</span>
            <select
              className="input"
              value={selectedActive}
              onChange={(e) => setSelectedActive(e.target.value)}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </label>

          <p className="text-xs text-muted">
            Name, email, and password stay the same. Only role and status can be changed.
          </p>

          {error ? (
            <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={pending || !selectedRoleId}
            onClick={saveEdit}
          >
            {pending ? "Saving…" : "Update member"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
