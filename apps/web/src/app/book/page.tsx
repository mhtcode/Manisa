import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarCheck2 } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { notFound } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { PublicBookingForm } from "@/components/public-booking-form";
import { PublicSiteControls } from "@/components/public-site-controls";
import { normalizeBookingWindows } from "@/lib/public-booking";
import { prisma } from "@/lib/prisma";
import { publicCopy, publicSitePreferences } from "@/lib/public-site";

export default async function PublicBookingPage({ searchParams }: { searchParams: Promise<{ lang?: string; theme?: string }> }) {
  const preferences = publicSitePreferences(await searchParams);
  const { locale, theme } = preferences;
  const [studio, services] = await Promise.all([
    prisma.studioSettings.findUnique({ where: { id: "studio" } }),
    prisma.service.findMany({ where: { active: true, deletedAt: null, category: { active: true, deletedAt: null } }, orderBy: [{ category: { position: "asc" } }, { name: "asc" }], select: { id: true, name: true, defaultDurationMinutes: true, defaultPrice: true, currency: true, category: { select: { id: true, name: true } } } }),
  ]);
  if (!studio) notFound();
  const t = publicCopy[locale];
  const bookingWindows = normalizeBookingWindows(studio.publicBookingWindows);
  const enabledWeekdays = Object.keys(bookingWindows).map(Number);
  const todayKey = formatInTimeZone(new Date(), studio.timezone, "yyyy-MM-dd");
  const BackIcon = locale === "fa" ? ArrowRight : ArrowLeft;

  return <main className="public-site min-h-screen overflow-x-clip bg-[var(--public-bg)] text-[var(--public-ink)]" data-public-theme={theme} dir={locale === "fa" ? "rtl" : "ltr"} lang={locale}>
    <header className="sticky top-0 z-50 border-b border-[var(--public-line)] bg-[var(--public-nav)] px-4 py-3 backdrop-blur-2xl sm:px-8"><div className="mx-auto flex max-w-6xl items-center gap-3"><Link className="flex min-w-0 items-center gap-2.5" href={`/?lang=${locale}&theme=${theme}`}><BrandLogo size={42}/><span className="truncate font-bold" dir="auto">{studio.name}</span></Link><div className="ms-auto flex items-center gap-2"><PublicSiteControls locale={locale} path="/book" theme={theme}/><Link aria-label={t.bookBack} className="public-control" href={`/?lang=${locale}&theme=${theme}`} title={t.bookBack}><BackIcon size={17}/><span className="hidden sm:inline">{t.bookBack}</span></Link></div></div></header>
    <section className="relative isolate px-4 py-10 sm:px-8 sm:py-16"><div className="public-orb -start-24 top-12 size-72 bg-[#d886ab]/25"/><div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[.7fr_1.3fr] lg:items-start"><aside className="landing-rise lg:sticky lg:top-28"><span className="flex size-12 items-center justify-center rounded-2xl bg-[var(--public-accent-soft)] text-[var(--public-accent)]"><CalendarCheck2 size={22}/></span><p className="public-kicker mt-6">{t.bookEyebrow}</p><h1 className="mt-4 font-serif text-5xl leading-[.96] tracking-[-.045em] sm:text-7xl">{t.bookTitle}</h1><p className="mt-6 max-w-lg leading-8 text-[var(--public-muted)]">{t.bookIntro}</p><div className="relative mt-8 hidden aspect-[4/3] overflow-hidden rounded-[2rem] lg:block"><Image alt="Manisa manicure appointment" className="object-cover" fill sizes="35vw" src="/landing/manicure.webp"/></div></aside><div className="landing-rise min-w-0 [animation-delay:.12s]">{studio.publicBookingEnabled ? <PublicBookingForm enabledWeekdays={enabledWeekdays} locale={locale} services={services.map((service) => ({ id: service.id, name: service.name, duration: service.defaultDurationMinutes, price: String(service.defaultPrice), currency: service.currency, categoryId: service.category.id, categoryName: service.category.name }))} todayKey={todayKey}/> : <section className="public-booking-card p-8 text-center sm:p-12"><CalendarCheck2 className="mx-auto text-[var(--public-accent)]" size={32}/><h2 className="mt-5 font-serif text-3xl">{t.bookUnavailable}</h2><p className="mt-3 leading-7 text-[var(--public-muted)]">{studio.publicBookingMessage}</p></section>}</div></div></section>
  </main>;
}
