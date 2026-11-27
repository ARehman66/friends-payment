"use client";

import { useEffect } from "react";

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-line bg-panel shadow-xl sm:max-w-lg sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white">
              BL
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-muted">
                BreakLedger
              </p>
              <h2 className="truncate text-base font-semibold text-ink">
                {title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-muted hover:bg-bg hover:text-ink"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4 text-left sm:px-5" dir="ltr">
          {children}
        </div>
      </div>
    </div>
  );
}
