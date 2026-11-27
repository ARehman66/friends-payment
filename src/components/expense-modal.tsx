"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addExpenseAction } from "@/app/actions/expenses";
import { Modal } from "@/components/modal";
import { DetailMiniCard } from "@/components/stat-card";
import { IconEye, IconPlus } from "@/components/icons";

type Member = { id: string; name: string };

export type ExpenseEdit = {
  id: string;
  amount: number;
  note: string;
  spentAt: string;
  paidById: string;
  participantIds: string[];
};

export function ExpenseAddButton({
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
        Add expense
      </button>
      <ExpenseFormModal
        open={open}
        onClose={() => setOpen(false)}
        members={members}
        currentUserId={currentUserId}
      />
    </>
  );
}

export function ExpenseRowActions({
  members,
  expense,
}: {
  members: Member[];
  expense: ExpenseEdit;
}) {
  const [viewOpen, setViewOpen] = useState(false);
  const payer = members.find((m) => m.id === expense.paidById)?.name || "—";
  const present = expense.participantIds
    .map((id) => members.find((m) => m.id === id)?.name || id)
    .join(", ");

  return (
    <div className="flex flex-col items-end">
      <button type="button" className="icon-btn" title="View" onClick={() => setViewOpen(true)}>
        <IconEye />
      </button>

      <Modal open={viewOpen} title="Expense details" onClose={() => setViewOpen(false)}>
        <div className="grid grid-cols-2 gap-2.5 text-left" dir="ltr">
          <DetailMiniCard label="Date" value={expense.spentAt} />
          <DetailMiniCard label="Amount" value={String(expense.amount)} tone="bad" />
          <DetailMiniCard label="Note" value={expense.note || "—"} />
          <DetailMiniCard label="Paid by" value={payer} />
          <div className="col-span-2">
            <DetailMiniCard label="Present" value={present || "—"} />
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ExpenseFormModal({
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
  const [amount, setAmount] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setSelected(members.map((m) => m.id));
    setError(null);
  }, [open, members]);

  const share = useMemo(() => {
    const n = Number(amount);
    if (!n || selected.length === 0) return 0;
    return Math.round((n / selected.length) * 100) / 100;
  }, [amount, selected]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <Modal open={open} title="Add expense" onClose={onClose}>
      {members.length === 0 ? (
        <p className="text-sm text-muted">No active members available.</p>
      ) : (
        <form
          className="modal-form"
          action={(formData) => {
            setError(null);
            selected.forEach((id) => formData.append("participantIds", id));
            startTransition(async () => {
              const result = await addExpenseAction(formData);
              if (result?.error) {
                setError(result.error);
                return;
              }
              onClose();
              router.refresh();
            });
          }}
        >
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
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label className="modal-field">
              <span>Date</span>
              <input
                name="spentAt"
                type="date"
                required
                defaultValue={today}
                className="input"
              />
            </label>
          </div>
          <label className="modal-field">
            <span>Who paid</span>
            <select
              name="paidById"
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
          <label className="modal-field">
            <span>Note</span>
            <input name="note" className="input" placeholder="Tea / lunch" />
          </label>
          <div className="modal-field">
            <span>Who was present?</span>
            <div className="grid grid-cols-2 gap-2">
              {members.map((m) => {
                const on = selected.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggle(m.id)}
                    className={`rounded-xl border px-3 py-2 text-left text-sm ${
                      on
                        ? "border-brand bg-brand/5 font-medium text-ink"
                        : "border-[#d7e0ea] bg-white text-muted"
                    }`}
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted">
              Equal share: <strong className="text-ink">{share || "—"}</strong> ×{" "}
              {selected.length}
            </p>
          </div>
          {error ? (
            <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={pending || selected.length === 0}
          >
            {pending ? "Saving…" : "Save expense"}
          </button>
        </form>
      )}
    </Modal>
  );
}
