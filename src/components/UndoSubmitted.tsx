"use client";

import { useState, useTransition } from "react";
import { undoSubmitted } from "@/app/actions";

/** Puts days that were marked submitted by mistake back into billing. */
export function UndoSubmitted({ visitIds, label }: { visitIds: string[]; label: string }) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <>
      <button
        type="button"
        disabled={pending}
        className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        onClick={() =>
          start(async () => {
            const res = await undoSubmitted(visitIds);
            if (!res.ok) setError(res.error);
          })
        }
      >
        {pending ? "Undoing…" : label}
      </button>
      {error && <span role="alert" className="text-xs text-bad">{error}</span>}
    </>
  );
}
