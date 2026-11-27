"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addDepositAction,
  deleteDepositAction,
  updateDepositAction,
} from "@/app/actions/deposits";
import { Modal } from "@/components/modal";
import { ConfirmModal } from "@/components/confirm-modal";
import { DetailMiniCard } from "@/components/stat-card";
import { IconEdit, IconEye, IconPlus, IconTrash } from "@/components/icons";

type Member = { id: string; name: string };

export type DepositEdit = {
  id: string;
  amount: number;
  note: string;
  depositedAt: string;
  userId: string;
};

export function DepositAddButton({
  members,
  currentUserId,
}: {
  members: Member[];
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        <IconPlus />
        Add deposit
      </button>
      <DepositFormModal
        open={open}
        onClose={() => setOpen(false)}
        members={members}
        currentUserId={currentUserId}
      />
    </>
  );
}

export function DepositRowActions({
  members,
  deposit,
}: {
  members: Member[];
  deposit: DepositEdit;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const memberName = members.find((m) => m.id === deposit.userId)?.name || "—";

  return (
    <div className="flex flex-col items-end">
      <div className="inline-flex items-center justify-end gap-1">
        <button type="button" className="icon-btn" title="View" onClick={() => setViewOpen(true)}>
          <IconEye />
        </button>
        <button type="button" className="icon-btn" title="Edit" onClick={() => setEditOpen(true)}>
          <IconEdit />
        </button>
        <button
          type="button"
          className="icon-btn icon-btn-danger"
          title="Delete"
          disabled={pending}
          onClick={() => setDeleteOpen(true)}
        >
          <IconTrash />
        </button>
      </div>
      {error ? <p className="mt-1 text-xs text-bad">{error}</p> : null}

      <Modal open={viewOpen} title="Deposit details" onClose={() => setViewOpen(false)}>
        <div className="grid grid-cols-2 gap-2">
          <DetailMiniCard label="Date" value={deposit.depositedAt} />
          <DetailMiniCard label="Amount" value={`+${deposit.amount}`} tone="good" />
          <DetailMiniCard label="Member" value={memberName} />
          <DetailMiniCard label="Note" value={deposit.note || "—"} />
        </div>
      </Modal>

      <ConfirmModal
        open={deleteOpen}
        title="Delete deposit?"
        message="This will reverse the advance from that member's balance."
        confirmLabel="Delete deposit"
        pending={pending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          setError(null);
          const fd = new FormData();
          fd.set("ledgerEntryId", deposit.id);
          startTransition(async () => {
            const result = await deleteDepositAction(fd);
            if (result?.error) {
              setError(result.error);
              setDeleteOpen(false);
              return;
            }
            setDeleteOpen(false);
            router.refresh();
          });
        }}
      />

      <DepositFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        members={members}
        currentUserId={deposit.userId}
        initial={deposit}
      />
    </div>
  );
}

function DepositFormModal({
  open,
  onClose,
  members,
  currentUserId,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  members: Member[];
  currentUserId: string;
  initial?: DepositEdit;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);
  const isEdit = Boolean(initial);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  return (
    <Modal
      open={open}
      title={isEdit ? "Edit deposit" : "Add deposit"}
      onClose={onClose}
    >
      {members.length === 0 ? (
        <p className="text-sm text-muted">No active members available.</p>
      ) : (
        <form
          className="space-y-3"
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const result = isEdit
                ? await updateDepositAction(formData)
                : await addDepositAction(formData);
              if (result?.error) {
                setError(result.error);
                return;
              }
              onClose();
              router.refresh();
            });
          }}
        >
          {isEdit ? (
            <input type="hidden" name="ledgerEntryId" value={initial!.id} />
          ) : null}
          <label className="block space-y-1">
            <span className="text-sm font-medium">Member</span>
            <select
              name="userId"
              defaultValue={currentUserId}
              className="input"
              required
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-medium">Amount</span>
              <input
                name="amount"
                type="number"
                min="1"
                step="0.01"
                required
                className="input"
                defaultValue={initial?.amount || ""}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Date</span>
              <input
                name="depositedAt"
                type="date"
                required
                defaultValue={initial?.depositedAt || today}
                className="input"
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Note</span>
            <input
              name="note"
              className="input"
              defaultValue={initial?.note || ""}
              placeholder="Advance / cash added"
            />
          </label>
          {error ? (
            <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn btn-primary w-full" disabled={pending}>
            {pending ? "Saving…" : isEdit ? "Update deposit" : "Save deposit"}
          </button>
        </form>
      )}
    </Modal>
  );
}
