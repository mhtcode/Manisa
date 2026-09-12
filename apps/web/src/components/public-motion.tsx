"use client";

import { useEffect } from "react";
import { publicProgressRailVisible, resolvePublicSectionAtLine } from "@/lib/public-site";

export function PublicMotion() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-public-reveal]"));
    for (const element of elements) {
      const bounds = element.getBoundingClientRect();
      if (bounds.top < window.innerHeight * 0.94 && bounds.bottom > 0) element.classList.add("public-reveal-visible");
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) entry.target.classList.add("public-reveal-visible");
    }, { rootMargin: "-8% 0px -10%", threshold: 0.08 });
    elements.forEach((element) => observer.observe(element));
    const frame = window.requestAnimationFrame(() => document.documentElement.classList.add("public-motion-ready"));
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-public-section]"));
    const links = Array.from(document.querySelectorAll<HTMLElement>("[data-public-nav]"));
    const rail = document.querySelector<HTMLElement>(".public-progress-rail");
    let scrollFrame = 0;
    let railTimer = 0;
    const updateNavigation = () => {
      scrollFrame = 0;
      const active = resolvePublicSectionAtLine(sections.map((section) => {
        const bounds = section.getBoundingClientRect();
        return { id: section.dataset.publicSection || "", top: bounds.top, bottom: bounds.bottom };
      }), Math.min(window.innerHeight * 0.36, 320));
      for (const link of links) link.toggleAttribute("data-active", link.dataset.publicNav === active);
    };
    const scheduleNavigationUpdate = () => {
      const lastScrollAt = Date.now();
      rail?.toggleAttribute("data-scrolling", publicProgressRailVisible(lastScrollAt, Date.now()));
      window.clearTimeout(railTimer);
      railTimer = window.setTimeout(() => rail?.removeAttribute("data-scrolling"), 900);
      if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateNavigation);
    };
    const scheduleResizeUpdate = () => { if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateNavigation); };
    updateNavigation();
    window.addEventListener("scroll", scheduleNavigationUpdate, { passive: true });
    window.addEventListener("resize", scheduleResizeUpdate);
    return () => { window.cancelAnimationFrame(frame); window.cancelAnimationFrame(scrollFrame); window.clearTimeout(railTimer); observer.disconnect(); window.removeEventListener("scroll", scheduleNavigationUpdate); window.removeEventListener("resize", scheduleResizeUpdate); document.documentElement.classList.remove("public-motion-ready"); };
  }, []);
  return null;
}
