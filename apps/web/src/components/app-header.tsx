"use client";

import { usePathname } from "next/navigation";

export function AppHeader({ children }: { children: React.ReactNode }) {
  return usePathname() === "/report" ? children : null;
}
