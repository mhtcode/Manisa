"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function DismissiblePopover({
  ariaLabel,
  backdropClassName,
  children,
  panelClassName,
  rootClassName = "relative",
  trigger,
  triggerClassName,
}: {
  ariaLabel: string;
  backdropClassName?: string;
  children: React.ReactNode;
  panelClassName: string;
  rootClassName?: string;
  trigger: React.ReactNode;
  triggerClassName: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent | MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("click", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("click", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const panel = open ? <div className={panelClassName} id={panelId} onClickCapture={(event) => {
    if ((event.target as Element).closest("a[href]")) setOpen(false);
  }} ref={panelRef} role="dialog">{children}</div> : null;
  const overlay = open && backdropClassName && typeof document !== "undefined" ? createPortal(<><button aria-label={`Close ${ariaLabel}`} className={backdropClassName} onClick={() => setOpen(false)} tabIndex={-1} type="button"/>{panel}</>, document.body) : null;

  return <div className={rootClassName} ref={rootRef}>
    <button aria-controls={panelId} aria-expanded={open} aria-label={ariaLabel} className={triggerClassName} onClick={() => setOpen((value) => !value)} ref={triggerRef} type="button">
      {trigger}
    </button>
    {backdropClassName ? overlay : panel}
  </div>;
}
