"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMemberAction, setMemberActiveAction } from "@/app/actions/members";
import { setUserRoleAction } from "@/app/actions/roles";
import { Modal } from "@/components/modal";
import { ConfirmModal } from "@/components/confirm-modal";
import { IconPlus, IconTrash } from "@/components/icons";

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

export function MemberRoleSelect({
  userId,
  roleId,
  roles,
  disabled,
}: {
  userId: string;
  roleId: string | null;
  roles: RoleOption[];
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (disabled) {
    return <span className="text-xs text-muted">Admin</span>;
  }

  return (
    <div>
      <select
        className="input !py-1.5 !text-xs"
        disabled={pending || roles.length === 0}
        defaultValue={roleId || ""}
        onChange={(e) => {
          const fd = new FormData();
          fd.set("userId", userId);
          fd.set("roleId", e.target.value);
          setError(null);
          startTransition(async () => {
            const result = await setUserRoleAction(fd);
            if (result?.error) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        {!roleId ? <option value="">Select role</option> : null}
        {roles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      {error ? <p className="mt-1 text-[10px] text-bad">{error}</p> : null}
    </div>
  );
}

export function MemberRowActions({
  userId,
  active,
  isAdminUser,
  name,
}: {
  userId: string;
  active: boolean;
  isAdminUser: boolean;
  name: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (isAdminUser) {
    return <span className="text-xs text-muted">—</span>;
  }

  if (!active) {
    return <span className="text-xs text-muted">Inactive</span>;
  }

  function deactivate() {
    setError(null);
    const fd = new FormData();
    fd.set("userId", userId);
    fd.set("active", "false");
    startTransition(async () => {
      const result = await setMemberActiveAction(fd);
      if (result?.error) {
        setError(result.error);
        setConfirmOpen(false);
        return;
      }
      setConfirmOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        className="icon-btn icon-btn-danger"
        title="Deactivate"
        disabled={pending}
        onClick={() => setConfirmOpen(true)}
      >
        <IconTrash />
      </button>
      {error ? <p className="mt-1 text-xs text-bad">{error}</p> : null}

      <ConfirmModal
        open={confirmOpen}
        title="Deactivate member?"
        message={`${name} will become inactive and will not appear in new expenses or deposits.`}
        confirmLabel="Deactivate"
        pending={pending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={deactivate}
      />
    </div>
  );
}
