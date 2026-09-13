import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { ArrowUpRight, CalendarDays, Instagram, Mail, MapPin, Phone, Star, WandSparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { PublicGallery } from "@/components/public-gallery";
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
import { formatBusinessDate } from "@/lib/time";
import { MAX_FEATURED_GALLERY_ITEMS } from "@/lib/gallery-feature";

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
    prisma.mediaAsset.findMany({ where: { deletedAt: null, featuredAt: { not: null }, appointment: { deletedAt: null, status: "COMPLETED" } }, orderBy: { featuredAt: "desc" }, take: MAX_FEATURED_GALLERY_ITEMS, select: { id: true, width: true, height: true, appointment: { select: { serviceNameSnapshot: true, startAt: true } } } }),
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
  const gallery = featuredPhotos.length ? featuredPhotos.map((photo) => ({ id: photo.id, src: `/public-media/gallery/${photo.id}`, alt: locale === "fa" ? "نمونه‌کار استودیو مانیسا" : "Featured Manisa studio work", title: photo.appointment?.serviceNameSnapshot || (locale === "fa" ? "نمونه‌کار مانیسا" : "Manisa studio work"), detail: photo.appointment ? formatBusinessDate(photo.appointment.startAt, locale, studio.timezone) : undefined, width: photo.width, height: photo.height, unoptimized: true })) : [
    { id: "hair", src: "/landing/hair-styling.webp", alt: locale === "fa" ? "نمونه خدمات مو" : "Hair styling in the Manisa studio", title: locale === "fa" ? "خدمات مو" : "Hair studio" }, { id: "nails", src: "/landing/manicure.webp", alt: locale === "fa" ? "نمونه خدمات ناخن" : "Detailed manicure service", title: locale === "fa" ? "خدمات ناخن" : "Nail studio" },
  ];
  return <main className="public-site min-h-screen overflow-x-clip bg-[var(--public-bg)] text-[var(--public-ink)]" data-public-theme={theme} dir={direction} lang={locale}>
    <PublicMotion/>
    <header className="public-header"><div className="public-nav-shell"><a className="public-brand" href="#top"><BrandLogo priority size={42}/><span dir="auto">{studio.name}</span></a><div className="public-nav-actions"><PublicSiteControls locale={locale} path="/" theme={theme}/><Link className="public-login" href={managementHref} prefetch={false}>{t.login}</Link></div></div></header>
    <nav aria-label={locale === "fa" ? "پیشرفت در صفحه" : "Page progress"} className="public-progress-rail"><span aria-hidden="true"/><a aria-label={locale === "fa" ? "معرفی" : "Preview"} data-public-nav="preview" href="#top"/><a aria-label={t.navWork} data-public-nav="work" href="#work"/><a aria-label={t.navReviews} data-public-nav="reviews" href="#reviews"/><a aria-label={t.navAbout} data-public-nav="about" href="#about"/></nav>

    <section className="relative isolate min-h-[48rem] overflow-hidden px-5 pb-20 pt-24 sm:px-8 lg:min-h-[54rem] lg:px-10" data-public-section="preview" id="top">
      <div className="public-orb -start-28 top-28 size-80 bg-[#c96f73]/34"/><div className="public-orb -end-24 bottom-10 size-96 bg-[#d69a64]/25 [animation-delay:-4s]"/>
      <div className="relative mx-auto grid min-h-[40rem] max-w-7xl items-center gap-10 lg:grid-cols-[1.02fr_.98fr]">
        <div className="landing-rise relative z-10 max-w-3xl"><div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[var(--public-accent-soft)] px-4 py-2 text-[11px] font-bold uppercase tracking-[.2em] text-[var(--public-accent)]"><WandSparkles size={14}/>{t.heroEyebrow}</div><h1 className="max-w-4xl font-serif text-[clamp(3.5rem,8.2vw,7.8rem)] leading-[.88] tracking-[-.055em]">{t.heroTitle}</h1><p className="mt-7 max-w-xl text-base leading-8 text-[var(--public-muted)] sm:text-lg">{studio.studioTagline || t.heroBody}</p><div className="mt-9 flex flex-wrap gap-3"><Link className="public-primary" href={bookingHref}>{t.book}<ArrowUpRight className={locale === "fa" ? "rotate-[-90deg]" : ""} size={17}/></Link><a className="public-secondary" href="#services">{t.explore}</a></div>{rating.count > 0 && <a className="mt-8 inline-flex items-center gap-3 rounded-full border border-[var(--public-line)] bg-[var(--public-card)] px-4 py-2.5 text-sm shadow-sm" href="#reviews"><span className="flex gap-0.5 text-[var(--public-accent)]">{Array.from({ length: 5 }, (_, index) => <Star className={index < Math.round(rating.average) ? "fill-current" : "opacity-25"} key={index} size={14}/>)}</span><strong dir="ltr">{rating.average.toFixed(1)}</strong><span className="text-[var(--public-muted)]">{rating.count} {t.ratingReviews}</span></a>}</div>
        <div className="landing-rise relative mx-auto h-[31rem] w-full max-w-xl [animation-delay:.14s] sm:h-[38rem]"><div className="absolute inset-x-[8%] top-0 h-[82%] rotate-2 overflow-hidden rounded-[42%_42%_26%_26%/30%_30%_18%_18%] shadow-[0_35px_100px_rgba(42,25,20,.24)]"><Image alt="Hair styling in the Manisa studio" className="landing-hero-image object-cover" fill priority sizes="(max-width:1024px) 90vw, 45vw" src="/landing/hair-styling.webp"/></div><div className="absolute bottom-0 end-0 aspect-[4/5] w-[42%] -rotate-3 overflow-hidden rounded-[2rem] border-[6px] border-[var(--public-bg)] shadow-2xl"><Image alt="Detailed manicure service" className="object-cover" fill sizes="240px" src="/landing/manicure.webp"/></div><div className="absolute start-0 top-[58%] max-w-48 rounded-3xl bg-[var(--public-card)] p-4 shadow-xl backdrop-blur"><CalendarDays className="text-[var(--public-accent)]" size={20}/><p className="mt-2 text-sm font-semibold">{t.appointmentOnly}</p><p className="mt-1 text-xs text-[var(--public-muted)]" dir="auto">{address}</p></div></div>
      </div>
    </section>

    <section className="public-section public-stack-section public-stack-services" data-public-reveal data-public-section="preview" id="services"><div className="mx-auto max-w-7xl"><p className="public-kicker">{t.servicesKicker}</p><h2 className="public-display max-w-4xl">{t.servicesTitle}</h2><PublicServices categories={categories} empty={t.serviceEmpty} locale={locale}/></div></section>

    <section className="public-section public-stack-section public-stack-work" data-public-reveal data-public-section="work" id="work"><div className="mx-auto max-w-7xl"><div><p className="public-kicker">{t.workKicker}</p><h2 className="public-display">{t.workTitle}</h2></div><PublicGallery items={gallery} locale={locale}/></div></section>

    {connection?.posts.length ? <section className="public-section public-stack-section public-stack-instagram" data-public-reveal data-public-section="work" id="instagram"><div className="mx-auto max-w-7xl"><div className="public-instagram-heading"><div><p className="public-kicker">Instagram</p><h2 className="public-display">{locale === "fa" ? "تازه‌های مانیسا." : "Fresh from Manisa."}</h2></div>{instagramUrl && <a className="public-secondary" href={instagramUrl} rel="noreferrer" target="_blank"><Instagram size={17}/>{t.follow}</a>}</div><div className="public-instagram-grid">{connection.posts.map((post, index) => <a className={index === 0 ? "public-instagram-featured" : ""} href={post.permalink} key={post.id} rel="noreferrer" target="_blank"><Image alt={post.caption || "Manisa Instagram post"} className="object-cover" fill sizes={index === 0 ? "(max-width:700px) 92vw, 50vw" : "(max-width:700px) 44vw, 25vw"} src={`/public-media/instagram/${post.id}`} unoptimized/><span><Instagram size={17}/></span></a>)}</div></div></section> : null}

    <section className="public-section public-stack-section public-stack-reviews" data-public-reveal data-public-section="reviews" id="reviews"><div className="mx-auto max-w-7xl"><header className="public-reviews-heading"><div><p className="public-kicker">{t.reviewsKicker}</p><h2 className="public-display">{t.reviewsTitle}</h2></div>{rating.count > 0 ? <div className="public-rating-summary"><strong dir="ltr">{rating.average.toFixed(1)}</strong><div><div className="flex gap-1 text-[var(--public-accent)]">{Array.from({ length: 5 }, (_, index) => <Star className={index < Math.round(rating.average) ? "fill-current" : "opacity-25"} key={index} size={18}/>)}</div><p>{rating.count} {t.ratingReviews}</p></div></div> : <p className="text-[var(--public-muted)]">{t.noRatings}</p>}</header><div className="public-reviews-grid"><ReviewCarousel locale={locale} reviews={reviews}/><PublicReviewForm locale={locale}/></div></div></section>

    <section className="public-section public-stack-section public-stack-about" data-public-reveal data-public-section="about" id="about"><div className="mx-auto max-w-7xl"><div className="grid gap-10 lg:grid-cols-[.84fr_1.16fr] lg:items-center"><div className="relative aspect-[5/6] overflow-hidden rounded-[2.5rem] bg-[var(--public-soft)]"><Image alt="Professional manicure detail" className="object-cover transition duration-700 hover:scale-[1.035]" fill sizes="(max-width:1024px) 90vw, 42vw" src="/landing/manicure.webp"/><div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent"/></div><div><p className="public-kicker">{t.studioKicker}</p><h2 className="public-display">{t.studioTitle}</h2><p className="mt-7 max-w-xl text-base leading-8 text-[var(--public-muted)]">{studio.studioBiography || t.studioBody}</p><div className="mt-8 grid gap-3 sm:grid-cols-2"><div className="public-mini-card"><CalendarDays size={18}/><span>{t.appointmentOnly}</span></div><div className="public-mini-card"><MapPin size={18}/><span dir="auto">{address}</span></div></div></div></div><PublicLocationCard address={address} locale={locale}/><div className="public-final-cta"><div><p className="public-kicker">{t.contactKicker}</p><h2 className="public-display">{t.contactTitle}</h2></div><Link className="public-primary" href={bookingHref}>{t.book}<ArrowUpRight size={18}/></Link></div></div></section>

    <footer className="public-footer"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-12"><div className="lg:col-span-5"><a aria-label={studio.name} className="public-footer-brand" href="#top"><BrandLogo size={78}/><span className="public-footer-wordmark" dir="ltr"><em>Fahimeh Mansourian</em><b>MANISA</b></span></a><p className="mt-5 max-w-md leading-7">{studio.studioTagline || t.heroBody}</p><Link className="public-footer-cta" href={bookingHref}>{t.book}<ArrowUpRight size={16}/></Link></div><nav className="public-footer-column lg:col-span-3"><strong>{t.navAbout}</strong><a href="#services">{t.footerServices}</a><a href="#work">{t.navWork}</a><a href="#reviews">{t.footerReviews}</a><Link href={managementHref}>{t.login}</Link></nav><div className="public-footer-column lg:col-span-4"><strong>{t.footerContact}</strong>{phone && <a dir="ltr" href={`tel:${phone.replace(/[^+\d]/g, "")}`}><Phone size={15}/>{phone}</a>}{email && <a dir="ltr" href={`mailto:${email}`}><Mail size={15}/>{email}</a>}<a href="#location"><MapPin size={15}/><span dir="auto">{address}</span></a>{instagramUrl && <a href={instagramUrl} rel="noreferrer" target="_blank"><Instagram size={15}/>{t.follow}</a>}</div></div><div className="public-footer-bottom"><p>© {new Date().getFullYear()} {studio.name}. All rights reserved. Developed by <a href="https://github.com/mhtcode" rel="noreferrer" target="_blank">mhtcode</a>.</p><a href="#top">{locale === "fa" ? "بازگشت به بالا" : "Back to top"} ↑</a></div></footer>
  </main>;
}

export default async function Home({ searchParams }: { searchParams: Promise<{ lang?: string; theme?: string }> }) {
  const preferences = publicSitePreferences(await searchParams);
  const [studio, setupComplete] = await Promise.all([prisma.studioSettings.findUnique({ where: { id: "studio" }, select: { id: true } }), prisma.user.count()]);
  if (studio && setupComplete) return <StudioLanding {...preferences}/>;
  return <main className="flex min-h-screen items-center justify-center bg-[#f5eee6] px-5 text-[#30251f]" dir="ltr" lang="en"><section className="max-w-lg rounded-[2rem] bg-white p-8 text-center shadow-xl"><BrandLogo className="mx-auto" priority size={80}/><h1 className="mt-5 font-serif text-4xl">Set up Manisa</h1><p className="mt-3 leading-7 text-[#755f54]">Create the sole studio owner and configure your studio.</p><Link className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#30251f] px-6 font-semibold text-white" href={setupComplete ? "/login" : "/setup"}>{setupComplete ? "Sign in" : "Create studio owner"}<ArrowUpRight size={16}/></Link></section></main>;
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }): Promise<Metadata> {
  const locale = (await searchParams).lang === "fa" ? "fa" : "en";
  const title = locale === "fa" ? "مانیسا | استودیوی خصوصی مو و ناخن در تورنتو" : "Manisa | Private Hair & Nail Studio in Toronto";
  const description = locale === "fa" ? "خدمات حرفه‌ای مو و ناخن در فضایی آرام و خصوصی در تورنتو. نمونه‌کارها را ببینید و آنلاین درخواست وقت ثبت کنید." : "Private hair and nail services in Toronto. Explore Manisa studio work, client reviews, and request an appointment online.";
  const origin = "https://manisa.masihtan.com";
  return { title: { absolute: title }, description, alternates: { canonical: locale === "fa" ? `${origin}/?lang=fa` : `${origin}/`, languages: { en: `${origin}/?lang=en`, fa: `${origin}/?lang=fa`, "x-default": `${origin}/` } }, openGraph: { type: "website", url: locale === "fa" ? `${origin}/?lang=fa` : `${origin}/`, siteName: "Manisa Hair & Nail Studio", locale: locale === "fa" ? "fa_IR" : "en_CA", title, description, images: [{ url: `${origin}/opengraph-image`, width: 1200, height: 630, type: "image/png", alt: "Manisa private hair and nail studio in Toronto" }] }, twitter: { card: "summary_large_image", title, description, images: [`${origin}/opengraph-image`] }, robots: { index: true, follow: true } };
}
