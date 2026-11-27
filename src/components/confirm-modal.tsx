"use client";

import { Modal } from "@/components/modal";

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Delete",
  pending = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <p className="text-sm leading-relaxed text-muted">{message}</p>
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          className="btn btn-ghost flex-1"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn flex-1 !bg-bad !text-white hover:!bg-[#9a1f16]"
          onClick={onConfirm}
          disabled={pending}
        >
          {pending ? "Please wait…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
