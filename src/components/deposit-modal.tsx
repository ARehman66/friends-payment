"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDepositAction } from "@/app/actions/deposits";
import { Modal } from "@/components/modal";
import { DetailMiniCard } from "@/components/stat-card";
import { IconEye, IconPlus } from "@/components/icons";

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
  const [viewOpen, setViewOpen] = useState(false);
  const memberName = members.find((m) => m.id === deposit.userId)?.name || "—";

  return (
    <div className="flex flex-col items-end">
      <button type="button" className="icon-btn" title="View" onClick={() => setViewOpen(true)}>
        <IconEye />
      </button>

      <Modal open={viewOpen} title="Deposit details" onClose={() => setViewOpen(false)}>
        <div className="grid grid-cols-2 gap-2.5 text-left" dir="ltr">
          <DetailMiniCard label="Date" value={deposit.depositedAt} />
          <DetailMiniCard label="Amount" value={`+${deposit.amount}`} tone="good" />
          <DetailMiniCard label="Member" value={memberName} />
          <DetailMiniCard label="Note" value={deposit.note || "—"} />
        </div>
      </Modal>
    </div>
  );
}

function DepositFormModal({
  open,
  onClose,
  members,
  currentUserId,
}: {
  open: boolean;
  onClose: () => void;
  members: Member[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  return (
    <Modal open={open} title="Add deposit" onClose={onClose}>
      {members.length === 0 ? (
        <p className="text-sm text-muted">No active members available.</p>
      ) : (
        <form
          className="modal-form"
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const result = await addDepositAction(formData);
              if (result?.error) {
                setError(result.error);
                return;
              }
              onClose();
              router.refresh();
            });
          }}
        >
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
              />
            </label>
            <label className="modal-field">
              <span>Date</span>
              <input
                name="depositedAt"
                type="date"
                required
                defaultValue={today}
                className="input"
              />
            </label>
          </div>
          <label className="modal-field">
            <span>Note</span>
            <input
              name="note"
              className="input"
              placeholder="Advance / cash added"
            />
          </label>
          {error ? (
            <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn btn-primary w-full" disabled={pending}>
            {pending ? "Saving…" : "Save deposit"}
          </button>
        </form>
      )}
    </Modal>
  );
}
