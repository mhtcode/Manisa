"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef } from "react";
import { mobileNavigationHrefs, swipeDestinationIndex, type MobileNavigationKey } from "@/lib/mobile-navigation";

const protectedSelector = "a,button,input,select,textarea,label,[role='button'],[role='slider'],[data-swipe-lock],.recharts-wrapper,.calendar-gesture-surface,.gallery-surface,[data-horizontal-scroll]";

function routeKey(pathname: string, order: MobileNavigationKey[]) {
  const direct = order.find((key) => pathname === mobileNavigationHrefs[key] || pathname.startsWith(`${mobileNavigationHrefs[key]}/`));
  if (direct) return direct;
  if (["/appointments", "/customers", "/services"].some((path) => pathname === path || pathname.startsWith(`${path}/`))) return order.includes("settings") ? "settings" : null;
  return null;
}

export function PageSwipeNavigation({ children, order, rtl }: { children: React.ReactNode; order: MobileNavigationKey[]; rtl: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const start = useRef<{ x: number; y: number; protected: boolean } | null>(null);

  return <div
    onTouchStart={(event) => {
      if (event.touches.length !== 1 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { start.current = null; return; }
      const touch = event.touches[0];
      const edge = touch.clientX < 28 || touch.clientX > window.innerWidth - 28;
      const target = event.target instanceof Element ? event.target : null;
      start.current = { x: touch.clientX, y: touch.clientY, protected: edge || Boolean(target?.closest(protectedSelector)) };
    }}
    onTouchEnd={(event) => {
      const initial = start.current;
      start.current = null;
      if (!initial || initial.protected || event.changedTouches.length !== 1) return;
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - initial.x;
      const deltaY = touch.clientY - initial.y;
      if (Math.abs(deltaX) < 76 || Math.abs(deltaX) < Math.abs(deltaY) * 1.45) return;
      const key = routeKey(pathname, order);
      const current = key ? order.indexOf(key) : -1;
      const next = swipeDestinationIndex(current, deltaX, order.length, rtl);
      if (next >= 0) router.push(mobileNavigationHrefs[order[next]]);
    }}
  >{children}</div>;
}
