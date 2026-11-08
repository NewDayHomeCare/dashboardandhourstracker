"use client";

// Accessible modal using the native <dialog>: Escape closes it and keyboard focus
// stays inside while it's open. Styling from the Figma Make design.

import { useEffect, useId, useRef } from "react";
import { Icon } from "./Icon";

export function Modal(props: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (props.open && !d.open) d.showModal();
    if (!props.open && d.open) d.close();
  }, [props.open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={props.onClose}
      onClick={(e) => e.target === ref.current && props.onClose()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-0 text-ink shadow-2xl"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-xl font-bold tracking-tight text-slate-900">
              {props.title}
            </h2>
            {props.description && <p className="mt-1 text-sm text-muted">{props.description}</p>}
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-muted hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close"
          >
            <Icon name="x" size={19} />
          </button>
        </div>
        {props.open && <div className="mt-6">{props.children}</div>}
      </div>
    </dialog>
  );
}

export function Toast({ message }: { message: string }) {
  return (
    <div role="status" aria-live="polite" className="fixed bottom-6 right-6 z-[60]">
      {message && (
        <div className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl">
          <Icon name="check" size={17} /> {message}
        </div>
      )}
    </div>
  );
}

export const fieldClass =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-brand focus:ring-3 focus:ring-brand-soft";
export const labelClass = "mb-2 block text-sm font-bold text-slate-700";
export const primaryButton =
  "inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-60";
export const secondaryButton =
  "inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50";
