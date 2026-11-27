"use client";

import { useState, useTransition } from "react";
import { logoutAction } from "@/app/actions/auth";
import { Modal } from "@/components/modal";
import { IconLogout } from "@/components/icons";

export function LogoutButton() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost !gap-2 !px-3 !py-2 !text-xs"
        onClick={() => setOpen(true)}
      >
        <IconLogout />
        Log out
      </button>
      <Modal open={open} title="Log out?" onClose={() => setOpen(false)}>
        <p className="text-sm text-muted">
          Are you sure you want to log out of BreakLedger?
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            className="btn btn-ghost flex-1"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary flex-1"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                await logoutAction();
              });
            }}
          >
            {pending ? "Logging out…" : "Log out"}
          </button>
        </div>
      </Modal>
    </>
  );
}
