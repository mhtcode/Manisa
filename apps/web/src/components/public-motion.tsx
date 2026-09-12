"use client";

import { useEffect } from "react";

export function PublicMotion() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-public-reveal]"));
    for (const element of elements) {
      const bounds = element.getBoundingClientRect();
      if (bounds.top < window.innerHeight * 0.94 && bounds.bottom > 0) element.classList.add("public-reveal-visible");
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) entry.target.classList.toggle("public-reveal-visible", entry.isIntersecting);
    }, { rootMargin: "-8% 0px -10%", threshold: 0.08 });
    elements.forEach((element) => observer.observe(element));
    const frame = window.requestAnimationFrame(() => document.documentElement.classList.add("public-motion-ready"));
    return () => { window.cancelAnimationFrame(frame); observer.disconnect(); document.documentElement.classList.remove("public-motion-ready"); };
  }, []);
  return null;
}
