"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export function EvidenceThumbnail({ url, alt }: { url: string; alt: string }) {
  const [open, setOpen] = useState(false), closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (!open) return; closeRef.current?.focus(); const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); }; document.addEventListener("keydown", onKey); return () => document.removeEventListener("keydown", onKey); }, [open]);
  return <><div className="evidence-thumbnail"><Image unoptimized width={320} height={240} src={url} alt={alt} /><button type="button" onClick={() => setOpen(true)}>View larger</button></div>{open ? <div className="evidence-lightbox" role="presentation" onPointerDown={event => { if (event.target === event.currentTarget) setOpen(false); }}><section role="dialog" aria-modal="true" aria-label={alt}><button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="Close larger evidence">Close</button><Image unoptimized width={960} height={960} src={url} alt={alt} /></section></div> : null}</>;
}
