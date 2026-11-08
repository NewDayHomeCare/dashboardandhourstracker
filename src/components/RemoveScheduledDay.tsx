"use client";

import { useState, useTransition } from "react";
import { removeScheduledDay } from "@/app/actions";

/** Removes one day of scheduled care, e.g. a cancelled visit. */
export function RemoveScheduledDay({ clientId, date }: { clientId: string; date: string }) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <>
      <button
        type="button"
        disabled={pending}
        className="px-2 text-sm font-semibold text-red-700 disabled:opacity-60"
        onClick={() => start(async () => {
          const res = await removeScheduledDay({ clientId, date });
          if (!res.ok) setError(res.error);
        })}
      >
        {pending ? "Removing…" : "Remove"}
      </button>
      {error && <span role="alert" className="text-xs text-bad">{error}</span>}
    </>
  );
}
