"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addDepositAction,
  updateDepositAction,
} from "@/app/actions/deposits";
import { Modal } from "@/components/modal";
import { DetailMiniCard } from "@/components/stat-card";
import { IconEdit, IconEye, IconPlus } from "@/components/icons";

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
        Add credit
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
  canEdit = false,
}: {
  members: Member[];
  deposit: DepositEdit;
  canEdit?: boolean;
}) {
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const memberName = members.find((m) => m.id === deposit.userId)?.name || "—";

  return (
    <div className="flex flex-col items-end">
      <div className="inline-flex items-center justify-end gap-1">
        <button
          type="button"
          className="icon-btn"
          title="View"
          onClick={() => setViewOpen(true)}
        >
          <IconEye />
        </button>
        {canEdit ? (
          <button
            type="button"
            className="icon-btn"
            title="Edit"
            onClick={() => setEditOpen(true)}
          >
            <IconEdit />
          </button>
        ) : null}
      </div>

      <Modal open={viewOpen} title="Account details" onClose={() => setViewOpen(false)}>
        <div className="grid grid-cols-2 gap-2.5 text-left" dir="ltr">
          <DetailMiniCard label="Date" value={deposit.depositedAt} />
          <DetailMiniCard label="Amount" value={`+${deposit.amount}`} tone="good" />
          <DetailMiniCard label="Member" value={memberName} />
          <DetailMiniCard label="Note" value={deposit.note || "—"} />
        </div>
      </Modal>

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
      title={isEdit ? "Edit account credit" : "Add account credit"}
      onClose={onClose}
    >
      {members.length === 0 ? (
        <p className="text-sm text-muted">No active members available.</p>
      ) : (
        <form
          className="modal-form"
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
            <input type="hidden" name="accountEntryId" value={initial!.id} />
          ) : null}
          <label className="modal-field">
            <span>Member</span>
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
            <label className="modal-field">
              <span>Amount</span>
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
            <label className="modal-field">
              <span>Date</span>
              <input
                name="depositedAt"
                type="date"
                required
                defaultValue={initial?.depositedAt || today}
                className="input"
              />
            </label>
          </div>
          <label className="modal-field">
            <span>Note</span>
            <input
              name="note"
              className="input"
              defaultValue={initial?.note || ""}
              placeholder="Cash added to account"
            />
          </label>
          {error ? (
            <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn btn-primary w-full" disabled={pending}>
            {pending ? "Saving…" : isEdit ? "Update credit" : "Save credit"}
          </button>
        </form>
      )}
    </Modal>
  );
}
