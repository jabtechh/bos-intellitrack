"use client";

import { useEffect,useId,useRef,useState,type ReactNode } from "react";

export function ConfirmButton({
  children,
  message,
  className,
  name,
  value,
}: {
  children: ReactNode;
  message: string;
  className?: string;
  name?: string;
  value?: string;
}) {
  const [open,setOpen]=useState(false),confirmRef=useRef<HTMLButtonElement>(null),dialogId=useId();
  useEffect(()=>{if(open)confirmRef.current?.focus()},[open]);
  return (
    <>
      <button type="button" className={className} onClick={()=>setOpen(true)}>{children}</button>
      {open?<div className="dialog-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setOpen(false)}} onKeyDown={event=>{if(event.key==="Escape")setOpen(false)}}>
        <section className="confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby={`${dialogId}-title`} aria-describedby={`${dialogId}-message`}>
          <div className="confirmation-icon" aria-hidden="true">!</div><h2 id={`${dialogId}-title`}>Please confirm</h2><p id={`${dialogId}-message`}>{message}</p>
          <div className="action-bar"><button type="button" className="button button-secondary" onClick={()=>setOpen(false)}>Cancel</button><button ref={confirmRef} type="submit" name={name} value={value} className={className}>Confirm</button></div>
        </section>
      </div>:null}
    </>
  );
}
