"use client";
import { useEffect, useId, useRef, useState } from "react";

export function InfoPopover({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false), id = useId(), root = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, [open]);
  return <span className="info-popover" ref={root} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
    <button type="button" aria-label={label} aria-expanded={open} aria-describedby={open ? id : undefined} onClick={() => setOpen(value => !value)} onFocus={() => setOpen(true)}>i</button>
    {open ? <span id={id} role="tooltip">{children}</span> : null}
  </span>;
}
