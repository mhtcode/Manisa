"use client";

import { useEffect, useRef } from "react";
import type { AppLocale } from "@/lib/i18n";
import { translateUiText } from "@/lib/i18n";

const translatedAttributes = ["aria-label", "placeholder", "title"] as const;
const originalText = new WeakMap<Node, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();

function translateNode(root: Node, locale: AppLocale) {
  const owner = root instanceof Element ? root : root.parentElement;
  if (owner?.closest("[data-no-translate], code, pre, script, style")) return;
  if (root.nodeType === Node.TEXT_NODE && root.nodeValue) {
    let source = originalText.get(root);
    if (source === undefined || (root.nodeValue !== source && root.nodeValue !== translateUiText(source, "fa"))) {
      source = root.nodeValue;
      originalText.set(root, source);
    }
    const next = translateUiText(source, locale);
    if (next !== root.nodeValue) root.nodeValue = next;
    return;
  }
  if (root instanceof Element) {
    const stored = originalAttributes.get(root) || new Map<string, string>();
    translatedAttributes.forEach((attribute) => {
      const value = root.getAttribute(attribute);
      if (!value) return;
      const existing = stored.get(attribute);
      if (existing === undefined || (value !== existing && value !== translateUiText(existing, "fa"))) stored.set(attribute, value);
      const next = translateUiText(stored.get(attribute)!, locale);
      if (next !== value) root.setAttribute(attribute, next);
    });
    originalAttributes.set(root, stored);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) translateNode(walker.currentNode, locale);
  }
}

export function LocaleRuntime({ locale, children }: { locale: AppLocale; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    translateNode(ref.current, locale);
    const observer = new MutationObserver((mutations) => mutations.forEach((mutation) => {
      if (mutation.type === "characterData") translateNode(mutation.target, locale);
      mutation.addedNodes.forEach((node) => translateNode(node, locale));
    }));
    observer.observe(ref.current, { characterData: true, childList: true, subtree: true });
    return () => observer.disconnect();
  }, [locale]);
  return <div className="contents" ref={ref}>{children}</div>;
}
