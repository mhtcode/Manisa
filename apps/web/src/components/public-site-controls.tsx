import Link from "next/link";
import { Languages, Moon, Sun } from "lucide-react";
import type { PublicLocale, PublicTheme } from "@/lib/public-site";

export function PublicSiteControls({ locale, theme, path }: { locale: PublicLocale; theme: PublicTheme; path: string }) {
  const alternateLocale = locale === "en" ? "fa" : "en";
  const alternateTheme = theme === "light" ? "dark" : "light";
  const href = (lang: PublicLocale, colorTheme: PublicTheme) => `${path}?lang=${lang}&theme=${colorTheme}`;
  return <div className="flex items-center gap-1.5">
    <Link aria-label={locale === "en" ? "نمایش فارسی" : "Show in English"} className="public-control" href={href(alternateLocale, theme)} title={locale === "en" ? "فارسی" : "English"}><Languages size={16}/><span className="hidden sm:inline">{locale === "en" ? "فا" : "EN"}</span></Link>
    <Link aria-label={theme === "light" ? "Use dark theme" : "Use light theme"} className="public-control" href={href(locale, alternateTheme)} title={theme === "light" ? "Dark" : "Light"}>{theme === "light" ? <Moon size={16}/> : <Sun size={16}/>}</Link>
  </div>;
}
