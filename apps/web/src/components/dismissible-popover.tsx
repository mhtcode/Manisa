"use client";

import { useEffect, useId, useRef, useState } from "react";

export function DismissiblePopover({
  ariaLabel,
  children,
  panelClassName,
  rootClassName = "relative",
  trigger,
  triggerClassName,
}: {
  ariaLabel: string;
  children: React.ReactNode;
  panelClassName: string;
  rootClassName?: string;
  trigger: React.ReactNode;
  triggerClassName: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const lastPointerType = useRef<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }

  function scheduleClose(pointerType: string) {
    if (pointerType !== "mouse") return;
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 200);
  }

  useEffect(() => () => cancelClose(), []);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent | MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
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

  return <div className={rootClassName} onPointerEnter={(event) => { if (event.pointerType === "mouse") { cancelClose(); setOpen(true); } }} onPointerLeave={(event) => scheduleClose(event.pointerType)} ref={rootRef}>
    <button aria-controls={panelId} aria-expanded={open} aria-label={ariaLabel} className={triggerClassName} onClick={(event) => { if (event.detail === 0 || lastPointerType.current !== "mouse") setOpen((value) => !value); }} onPointerDown={(event) => { lastPointerType.current = event.pointerType; }} ref={triggerRef} type="button">
      {trigger}
    </button>
    {open && <div className={panelClassName} id={panelId} role="dialog">{children}</div>}
  </div>;
}
