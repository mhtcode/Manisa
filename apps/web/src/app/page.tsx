import Image from "next/image";
import Link from "next/link";
import { after } from "next/server";
import { ArrowUpRight, CalendarDays, Instagram, Mail, MapPin, Phone, Star, WandSparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { PublicReviewForm, PublicLocationCard } from "@/components/public-review-form";
import { PublicMotion } from "@/components/public-motion";
import { PublicServices } from "@/components/public-services";
import { PublicSiteControls } from "@/components/public-site-controls";
import { ReviewCarousel } from "@/components/review-carousel";
import { getCurrentUser } from "@/lib/auth";
import { instagramCacheIsStale } from "@/lib/instagram-media";
import { prisma } from "@/lib/prisma";
import { publicCopy, publicReviewSummary, publicSitePreferences, type PublicLocale, type PublicTheme } from "@/lib/public-site";
import { syncInstagramConnection } from "@/server/instagram";

const fallbackAddress = process.env.NEXT_PUBLIC_BUSINESS_ADDRESS?.trim() || "77 Finch Avenue East, Toronto, ON";

function safePublicUrl(value: string | null | undefined) {
  if (!value) return "";
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.toString() : ""; } catch { return ""; }
}

export async function StudioLanding({ locale, theme }: { locale: PublicLocale; theme: PublicTheme }) {
  const studio = await prisma.studioSettings.findUnique({ where: { id: "studio" } });
  if (!studio) notFound();
  const [user, categories, featuredPhotos, connection, reviews, reviewRatings] = await Promise.all([
    getCurrentUser(),
    prisma.studioCategory.findMany({ where: { active: true, deletedAt: null, services: { some: { active: true, deletedAt: null } } }, orderBy: [{ position: "asc" }, { name: "asc" }], include: { services: { where: { active: true, deletedAt: null }, orderBy: { name: "asc" }, take: 5, select: { id: true, name: true } }, _count: { select: { services: { where: { active: true, deletedAt: null } } } } } }),
    prisma.mediaAsset.findMany({ where: { deletedAt: null, featuredAt: { not: null }, appointment: { deletedAt: null, status: "COMPLETED" } }, orderBy: { featuredAt: "desc" }, take: 6, select: { id: true } }),
    prisma.instagramConnection.findUnique({ where: { singletonKey: 1 }, select: { id: true, username: true, lastSyncedAt: true, posts: { where: { active: true }, orderBy: { publishedAt: "desc" }, take: 3, select: { id: true, caption: true, permalink: true } } } }),
    prisma.studioReview.findMany({ where: { status: "APPROVED", deletedAt: null }, orderBy: [{ approvedAt: "desc" }, { createdAt: "desc" }], take: 8, select: { id: true, reviewerName: true, rating: true, opinion: true, language: true } }),
    prisma.studioReview.findMany({ where: { status: "APPROVED", deletedAt: null }, select: { rating: true } }),
  ]);
  if (connection && instagramCacheIsStale(connection.lastSyncedAt)) after(() => syncInstagramConnection(connection.id).catch(() => undefined));

  const t = publicCopy[locale];
  const direction = locale === "fa" ? "rtl" : "ltr";
  const rating = publicReviewSummary(reviewRatings.map((item) => item.rating));
  const instagramUrl = connection?.username ? `https://www.instagram.com/${connection.username}/` : safePublicUrl(studio.instagramUrl);
  const phone = studio.publicPhone?.trim() || "";
  const email = studio.publicEmail?.trim() || "";
  const whatsapp = studio.whatsappNumber?.replace(/\D/g, "") || "";
  const fallbackBooking = safePublicUrl(studio.bookingUrl) || (whatsapp ? `https://wa.me/${whatsapp}` : phone ? `tel:${phone.replace(/[^+\d]/g, "")}` : "#contact");
  const bookingHref = studio.publicBookingEnabled ? `/book?lang=${locale}&theme=${theme}` : fallbackBooking;
  const managementHref = user ? "/report" : "/login";
  const address = studio.address || fallbackAddress;
  const gallery = featuredPhotos.length ? featuredPhotos.map((photo) => ({ id: photo.id, src: `/public-media/gallery/${photo.id}` })) : [
    { id: "hair", src: "/landing/hair-styling.webp" }, { id: "nails", src: "/landing/manicure.webp" },
  ];

  return <main className="public-site min-h-screen overflow-x-clip bg-[var(--public-bg)] text-[var(--public-ink)]" data-public-theme={theme} dir={direction} lang={locale}>
    <PublicMotion/>
    <header className="public-header"><div className="public-nav-shell"><a className="public-brand" href="#top"><BrandLogo priority size={42}/><span dir="auto">{studio.name}</span></a><nav aria-label={locale === "fa" ? "بخش‌های سایت" : "Site sections"} className="public-nav-links"><a data-public-nav="about" href="#about">{t.navAbout}</a><a data-public-nav="services" href="#services">{t.navServices}</a><a data-public-nav="work" href="#work">{t.navWork}</a><a data-public-nav="reviews" href="#reviews">{t.navReviews}</a><a data-public-nav="location" href="#location">{t.navLocation}</a></nav><div className="public-nav-actions"><PublicSiteControls locale={locale} path="/" theme={theme}/><Link className="public-login" href={managementHref}>{t.login}</Link></div></div></header>

    <section className="relative isolate min-h-[48rem] overflow-hidden px-5 pb-16 pt-28 sm:px-8 lg:min-h-[54rem] lg:px-10" id="top">
      <div className="public-orb -start-28 top-28 size-80 bg-[#d886ab]/30"/><div className="public-orb -end-24 bottom-10 size-96 bg-[#7cb4a5]/25 [animation-delay:-4s]"/>
      <div className="relative mx-auto grid min-h-[40rem] max-w-7xl items-center gap-10 lg:grid-cols-[1.02fr_.98fr]">
        <div className="landing-rise relative z-10 max-w-3xl"><div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[var(--public-accent-soft)] px-4 py-2 text-[11px] font-bold uppercase tracking-[.2em] text-[var(--public-accent)]"><WandSparkles size={14}/>{t.heroEyebrow}</div><h1 className="max-w-4xl font-serif text-[clamp(3.5rem,8.2vw,7.8rem)] leading-[.88] tracking-[-.055em]">{t.heroTitle}</h1><p className="mt-7 max-w-xl text-base leading-8 text-[var(--public-muted)] sm:text-lg">{studio.studioTagline || t.heroBody}</p><div className="mt-9 flex flex-wrap gap-3"><Link className="public-primary" href={bookingHref}>{t.book}<ArrowUpRight className={locale === "fa" ? "rotate-[-90deg]" : ""} size={17}/></Link><a className="public-secondary" href="#about">{t.explore}</a></div>{rating.count > 0 && <a className="mt-8 inline-flex items-center gap-3 rounded-full border border-[var(--public-line)] bg-[var(--public-card)] px-4 py-2.5 text-sm shadow-sm" href="#reviews"><span className="flex gap-0.5 text-[var(--public-accent)]">{Array.from({ length: 5 }, (_, index) => <Star className={index < Math.round(rating.average) ? "fill-current" : "opacity-25"} key={index} size={14}/>)}</span><strong dir="ltr">{rating.average.toFixed(1)}</strong><span className="text-[var(--public-muted)]">{rating.count} {t.ratingReviews}</span></a>}</div>
        <div className="landing-rise relative mx-auto h-[31rem] w-full max-w-xl [animation-delay:.14s] sm:h-[38rem]"><div className="absolute inset-x-[8%] top-0 h-[82%] rotate-2 overflow-hidden rounded-[42%_42%_26%_26%/30%_30%_18%_18%] shadow-[0_35px_100px_rgba(42,25,20,.24)]"><Image alt="Hair styling in the Manisa studio" className="landing-hero-image object-cover" fill priority sizes="(max-width:1024px) 90vw, 45vw" src="/landing/hair-styling.webp"/></div><div className="absolute bottom-0 end-0 aspect-[4/5] w-[42%] -rotate-3 overflow-hidden rounded-[2rem] border-[6px] border-[var(--public-bg)] shadow-2xl"><Image alt="Detailed manicure service" className="object-cover" fill sizes="240px" src="/landing/manicure.webp"/></div><div className="absolute start-0 top-[58%] max-w-48 rounded-3xl bg-[var(--public-card)] p-4 shadow-xl backdrop-blur"><CalendarDays className="text-[var(--public-accent)]" size={20}/><p className="mt-2 text-sm font-semibold">{t.appointmentOnly}</p><p className="mt-1 text-xs text-[var(--public-muted)]" dir="auto">{address}</p></div></div>
      </div>
    </section>

    <section className="public-section public-stack-section public-stack-about" data-public-reveal data-public-section="about" id="about"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center"><div className="relative aspect-[5/6] overflow-hidden rounded-[2.5rem] bg-[var(--public-soft)]"><Image alt="Professional manicure detail" className="object-cover transition duration-700 hover:scale-[1.035]" fill sizes="(max-width:1024px) 90vw, 42vw" src="/landing/manicure.webp"/><div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent"/></div><div><p className="public-kicker">{t.studioKicker}</p><h2 className="public-display">{t.studioTitle}</h2><p className="mt-7 max-w-xl text-base leading-8 text-[var(--public-muted)]">{studio.studioBiography || t.studioBody}</p><div className="mt-8 grid gap-3 sm:grid-cols-2"><div className="public-mini-card"><CalendarDays size={18}/><span>{t.appointmentOnly}</span></div><div className="public-mini-card"><MapPin size={18}/><span dir="auto">{address}</span></div></div></div></div></section>

    <section className="public-section public-stack-section public-stack-services" data-public-reveal data-public-section="services" id="services"><div className="mx-auto max-w-7xl"><p className="public-kicker">{t.servicesKicker}</p><h2 className="public-display max-w-4xl">{t.servicesTitle}</h2><PublicServices categories={categories} empty={t.serviceEmpty} locale={locale}/></div></section>

    <section className="public-section public-stack-section public-stack-work" data-public-reveal data-public-section="work" id="work"><div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="public-kicker">{t.workKicker}</p><h2 className="public-display">{t.workTitle}</h2></div>{instagramUrl && <a className="public-secondary" href={instagramUrl} rel="noreferrer" target="_blank"><Instagram size={17}/>{t.follow}</a>}</div><div className="mt-10 grid auto-rows-[12rem] grid-cols-2 gap-3 sm:auto-rows-[17rem] lg:grid-cols-4">{gallery.map((photo, index) => <div className={`group relative overflow-hidden rounded-[1.75rem] bg-[var(--public-soft)] ${index === 0 ? "col-span-2 row-span-2" : ""}`} key={photo.id}><Image alt="Featured Manisa studio work" className="object-cover transition duration-700 group-hover:scale-[1.05]" fill sizes={index === 0 ? "(max-width:1024px) 100vw, 50vw" : "(max-width:768px) 50vw, 25vw"} src={photo.src} unoptimized={photo.id !== "hair" && photo.id !== "nails"}/><div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition group-hover:opacity-100"/></div>)}</div>{connection?.posts.length ? <div className="mt-3 grid grid-cols-3 gap-3">{connection.posts.map((post) => <a className="group relative aspect-square overflow-hidden rounded-[1.5rem]" href={post.permalink} key={post.id} rel="noreferrer" target="_blank"><Image alt={post.caption || "Manisa Instagram post"} className="object-cover transition duration-500 group-hover:scale-105" fill sizes="33vw" src={`/public-media/instagram/${post.id}`} unoptimized/></a>)}</div> : null}</div></section>

    <section className="public-section public-stack-section public-stack-cta" data-public-reveal><div className="public-cta relative mx-auto max-w-7xl overflow-hidden rounded-[2.75rem] bg-[var(--public-button)] px-6 py-12 text-white shadow-[0_30px_90px_rgba(92,43,59,.2)] sm:px-12 sm:py-16"><div className="public-cta-orbit absolute -end-20 -top-28 size-80 rounded-full border-[55px] border-white/10"/><div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[.24em] text-white/75">{t.bookingKicker}</p><h2 className="mt-4 max-w-3xl font-serif text-4xl leading-tight sm:text-6xl">{t.bookingTitle}</h2><p className="mt-5 max-w-2xl leading-7 text-white/85">{studio.publicBookingEnabled ? t.bookingBody : studio.publicBookingMessage || t.bookingClosed}</p></div><Link className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-white px-6 font-bold !text-[#44262f] transition hover:-translate-y-1 hover:shadow-xl" href={bookingHref}>{studio.publicBookingEnabled ? t.bookingCta : t.book}<ArrowUpRight size={17}/></Link></div></div></section>

    <section className="public-section public-stack-section public-stack-reviews" data-public-reveal data-public-section="reviews" id="reviews"><div className="mx-auto max-w-7xl"><header className="public-reviews-heading"><div><p className="public-kicker">{t.reviewsKicker}</p><h2 className="public-display">{t.reviewsTitle}</h2></div>{rating.count > 0 ? <div className="public-rating-summary"><strong dir="ltr">{rating.average.toFixed(1)}</strong><div><div className="flex gap-1 text-[var(--public-accent)]">{Array.from({ length: 5 }, (_, index) => <Star className={index < Math.round(rating.average) ? "fill-current" : "opacity-25"} key={index} size={18}/>)}</div><p>{rating.count} {t.ratingReviews}</p></div></div> : <p className="text-[var(--public-muted)]">{t.noRatings}</p>}</header><div className="public-reviews-grid"><ReviewCarousel locale={locale} reviews={reviews}/><PublicReviewForm locale={locale}/></div><PublicLocationCard address={address} locale={locale}/></div></section>

    <section className="public-section public-stack-section public-stack-contact" data-public-reveal id="contact"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="public-kicker">{t.contactKicker}</p><h2 className="public-display max-w-4xl">{t.contactTitle}</h2></div><Link className="public-primary" href={bookingHref}>{t.book}<ArrowUpRight size={18}/></Link></div><div className="mt-12 flex flex-wrap gap-5 border-t border-[var(--public-line)] pt-7 text-sm font-medium text-[var(--public-muted)]">{phone && <a className="flex items-center gap-2 transition hover:text-[var(--public-ink)]" dir="ltr" href={`tel:${phone.replace(/[^+\d]/g, "")}`}><Phone size={16}/>{phone}</a>}{email && <a className="flex items-center gap-2 transition hover:text-[var(--public-ink)]" dir="ltr" href={`mailto:${email}`}><Mail size={16}/>{email}</a>}<span className="flex items-center gap-2" dir="auto"><MapPin size={16}/>{address}</span></div></section>

    <footer className="public-footer"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-12"><div className="lg:col-span-5"><a className="public-footer-brand" href="#top"><BrandLogo size={58}/><span dir="auto">{studio.name}</span></a><p className="mt-5 max-w-md leading-7">{studio.studioTagline || t.heroBody}</p><Link className="public-footer-cta" href={bookingHref}>{t.book}<ArrowUpRight size={16}/></Link></div><nav className="public-footer-column lg:col-span-3"><strong>{t.navAbout}</strong><a href="#services">{t.footerServices}</a><a href="#work">{t.navWork}</a><a href="#reviews">{t.footerReviews}</a><Link href={managementHref}>{t.login}</Link></nav><div className="public-footer-column lg:col-span-4"><strong>{t.footerContact}</strong>{phone && <a dir="ltr" href={`tel:${phone.replace(/[^+\d]/g, "")}`}><Phone size={15}/>{phone}</a>}{email && <a dir="ltr" href={`mailto:${email}`}><Mail size={15}/>{email}</a>}<a href="#location"><MapPin size={15}/><span dir="auto">{address}</span></a>{instagramUrl && <a href={instagramUrl} rel="noreferrer" target="_blank"><Instagram size={15}/>{t.follow}</a>}</div></div><div className="public-footer-bottom"><p>© {new Date().getFullYear()} {studio.name}</p><a href="#top">{locale === "fa" ? "بازگشت به بالا" : "Back to top"} ↑</a></div></footer>
  </main>;
}

export default async function Home({ searchParams }: { searchParams: Promise<{ lang?: string; theme?: string }> }) {
  const preferences = publicSitePreferences(await searchParams);
  const [studio, setupComplete] = await Promise.all([prisma.studioSettings.findUnique({ where: { id: "studio" }, select: { id: true } }), prisma.user.count()]);
  if (studio && setupComplete) return <StudioLanding {...preferences}/>;
  return <main className="flex min-h-screen items-center justify-center bg-[#f5eee6] px-5 text-[#30251f]" dir="ltr" lang="en"><section className="max-w-lg rounded-[2rem] bg-white p-8 text-center shadow-xl"><BrandLogo className="mx-auto" priority size={80}/><h1 className="mt-5 font-serif text-4xl">Set up Manisa</h1><p className="mt-3 leading-7 text-[#755f54]">Create the sole studio owner and configure your studio.</p><Link className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#30251f] px-6 font-semibold text-white" href={setupComplete ? "/login" : "/setup"}>{setupComplete ? "Sign in" : "Create studio owner"}<ArrowUpRight size={16}/></Link></section></main>;
}
