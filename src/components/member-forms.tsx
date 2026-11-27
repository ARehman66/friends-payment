"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMemberAction, setMemberActiveAction } from "@/app/actions/members";
import { Modal } from "@/components/modal";
import { ConfirmModal } from "@/components/confirm-modal";
import { IconEdit, IconPlus, IconTrash } from "@/components/icons";

export function MemberAddButton() {
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
          className="space-y-3"
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
          <label className="block space-y-1">
            <span className="text-sm font-medium">Name</span>
            <input name="name" required className="input" placeholder="Ali" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Email</span>
            <input
              name="email"
              type="email"
              required
              className="input"
              placeholder="ali@office.com"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Password</span>
            <input
              name="password"
              type="text"
              required
              minLength={6}
              className="input"
              placeholder="at least 6 characters"
            />
          </label>
          {error ? (
            <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>
          ) : null}
          <button type="submit" className="btn btn-primary w-full" disabled={pending}>
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

  function runToggle(nextActive: boolean) {
    setError(null);
    const fd = new FormData();
    fd.set("userId", userId);
    fd.set("active", nextActive ? "true" : "false");
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
      <div className="inline-flex items-center gap-1">
        <button
          type="button"
          className="icon-btn"
          title={active ? "Set inactive" : "Set active"}
          disabled={pending}
          onClick={() => runToggle(!active)}
        >
          <IconEdit />
        </button>
        {active ? (
          <button
            type="button"
            className="icon-btn icon-btn-danger"
            title="Deactivate"
            disabled={pending}
            onClick={() => setConfirmOpen(true)}
          >
            <IconTrash />
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-1 text-xs text-bad">{error}</p> : null}

      <ConfirmModal
        open={confirmOpen}
        title="Deactivate member?"
        message={`${name} will become inactive and will not appear in new expenses or deposits.`}
        confirmLabel="Deactivate"
        pending={pending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => runToggle(false)}
      />
    </div>
  );
}
