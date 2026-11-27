"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addExpenseAction,
  deleteExpenseAction,
  updateExpenseAction,
} from "@/app/actions/expenses";
import { Modal } from "@/components/modal";
import { ConfirmModal } from "@/components/confirm-modal";
import { DetailMiniCard } from "@/components/stat-card";
import { IconEdit, IconEye, IconPlus, IconTrash } from "@/components/icons";

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
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const payer = members.find((m) => m.id === expense.paidById)?.name || "—";
  const present = expense.participantIds
    .map((id) => members.find((m) => m.id === id)?.name || id)
    .join(", ");

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

      <Modal open={viewOpen} title="Expense details" onClose={() => setViewOpen(false)}>
        <div className="grid grid-cols-2 gap-2">
          <DetailMiniCard label="Date" value={expense.spentAt} />
          <DetailMiniCard label="Amount" value={String(expense.amount)} tone="bad" />
          <DetailMiniCard label="Note" value={expense.note || "—"} />
          <DetailMiniCard label="Paid by" value={payer} />
          <div className="col-span-2">
            <DetailMiniCard label="Present" value={present || "—"} />
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={deleteOpen}
        title="Delete expense?"
        message="This will reverse balances for everyone on this bill. This cannot be undone."
        confirmLabel="Delete expense"
        pending={pending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          setError(null);
          const fd = new FormData();
          fd.set("expenseId", expense.id);
          startTransition(async () => {
            const result = await deleteExpenseAction(fd);
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

      <ExpenseFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        members={members}
        currentUserId={expense.paidById}
        initial={expense}
      />
    </div>
  );
}

function ExpenseFormModal({
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
  initial?: ExpenseEdit;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const today = new Date().toISOString().slice(0, 10);
  const isEdit = Boolean(initial);

  useEffect(() => {
    if (!open) return;
    setAmount(initial ? String(initial.amount) : "");
    setSelected(initial?.participantIds || members.map((m) => m.id));
    setError(null);
  }, [open, initial, members]);

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
    <Modal
      open={open}
      title={isEdit ? "Edit expense" : "Add expense"}
      onClose={onClose}
    >
      {members.length === 0 ? (
        <p className="text-sm text-muted">No active members available.</p>
      ) : (
        <form
          className="space-y-3"
          action={(formData) => {
            setError(null);
            selected.forEach((id) => formData.append("participantIds", id));
            startTransition(async () => {
              const result = isEdit
                ? await updateExpenseAction(formData)
                : await addExpenseAction(formData);
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
            <input type="hidden" name="expenseId" value={initial!.id} />
          ) : null}
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
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Date</span>
              <input
                name="spentAt"
                type="date"
                required
                defaultValue={initial?.spentAt || today}
                className="input"
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Who paid</span>
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
          <label className="block space-y-1">
            <span className="text-sm font-medium">Note</span>
            <input
              name="note"
              className="input"
              defaultValue={initial?.note || ""}
              placeholder="Tea / lunch"
            />
          </label>
          <div>
            <p className="mb-2 text-sm font-medium">Who was present?</p>
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
                        ? "border-brand bg-brand/5 font-medium"
                        : "border-line text-muted"
                    }`}
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted">
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
            {pending ? "Saving…" : isEdit ? "Update expense" : "Save expense"}
          </button>
        </form>
      )}
    </Modal>
  );
}
