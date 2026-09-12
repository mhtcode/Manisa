export type PublicLocale = "en" | "fa";
export type PublicTheme = "light" | "dark";

export function publicSitePreferences(params: { lang?: string; theme?: string }) {
  return {
    locale: params.lang === "fa" ? "fa" : "en" as PublicLocale,
    theme: params.theme === "dark" ? "dark" : "light" as PublicTheme,
  };
}

export function publicReviewSummary(ratings: number[]) {
  if (!ratings.length) return { count: 0, average: 0 };
  return { count: ratings.length, average: Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10 };
}

export function resolvePublicServiceCategory(ids: string[], active?: string) {
  return active && ids.includes(active) ? active : ids[0] || "";
}

export function resolvePublicSectionAtLine(sections: { id: string; top: number; bottom: number }[], line: number) {
  return sections.find((section) => section.top <= line && section.bottom > line)?.id
    || [...sections].reverse().find((section) => section.top <= line)?.id
    || sections[0]?.id
    || "";
}

export const publicCopy = {
  en: {
    navServices: "Services", navWork: "Our work", navAbout: "About us", navReviews: "Reviews", navLocation: "Location", login: "Login",
    heroEyebrow: "Private hair & nail studio · Toronto", heroTitle: "Your ritual. Your time. Your studio.", heroBody: "Thoughtful hair and nail work in a calm, private space—designed around you.", book: "Book an appointment", explore: "Explore the studio",
    ratingReviews: "approved reviews", studioKicker: "About us", studioTitle: "Slow beauty for busy lives.", studioBody: "Manisa is an appointment-only home studio for people who value relaxed care, precise technique, and results made personal.", appointmentOnly: "Appointment only",
    servicesKicker: "The service edit", servicesTitle: "Choose your kind of care.", serviceAvailable: "services available", serviceEmpty: "The studio service menu is being prepared.",
    workKicker: "Studio journal", workTitle: "Real details. Real results.", follow: "Follow on Instagram",
    bookingKicker: "Your next visit", bookingTitle: "A quieter way to book.", bookingBody: "Choose services, see only times that fit the complete visit, and send your request for studio approval.", bookingCta: "Open online booking", bookingClosed: "Online booking is currently closed. Call or message the studio and we’ll find a time together.",
    reviewsKicker: "Loved by our clients", reviewsTitle: "Stories from the chair.", noRatings: "New reviews are coming soon.",
    contactKicker: "Ready when you are", contactTitle: "Let’s make time for you.", footerServices: "Services", footerReviews: "Reviews", footerContact: "Contact",
    bookBack: "Back to studio", bookEyebrow: "Online appointment request", bookTitle: "Find your time.", bookIntro: "Select your services first. We calculate the full visit length and show only times the studio can actually accommodate.", bookUnavailable: "Online booking is not available right now.",
  },
  fa: {
    navServices: "خدمات", navWork: "نمونه‌کارها", navAbout: "درباره ما", navReviews: "نظرها", navLocation: "موقعیت", login: "ورود",
    heroEyebrow: "استودیوی خصوصی مو و ناخن · تورنتو", heroTitle: "آیین زیبایی شما، زمان شما، استودیوی شما.", heroBody: "خدمات حرفه‌ای مو و ناخن در فضایی آرام و خصوصی؛ کاملاً متناسب با شما.", book: "رزرو وقت", explore: "آشنایی با استودیو",
    ratingReviews: "نظر تأییدشده", studioKicker: "درباره ما", studioTitle: "زیبایی آرام برای زندگی‌های پرمشغله.", studioBody: "مانیسا استودیویی خانگی و وقت‌محور برای کسانی است که به آرامش، ظرافت و نتیجه‌ای شخصی اهمیت می‌دهند.", appointmentOnly: "فقط با تعیین وقت",
    servicesKicker: "منوی خدمات", servicesTitle: "مراقبتی را انتخاب کنید که برای شماست.", serviceAvailable: "خدمت موجود", serviceEmpty: "منوی خدمات استودیو در حال آماده‌سازی است.",
    workKicker: "دفتر استودیو", workTitle: "جزئیات واقعی، نتیجه‌های واقعی.", follow: "دنبال‌کردن در اینستاگرام",
    bookingKicker: "قرار بعدی شما", bookingTitle: "راهی آرام‌تر برای رزرو.", bookingBody: "خدمات را انتخاب کنید، فقط زمان‌های مناسب برای کل مدت مراجعه را ببینید و درخواست خود را برای تأیید استودیو بفرستید.", bookingCta: "باز کردن رزرو آنلاین", bookingClosed: "رزرو آنلاین فعلاً بسته است. با استودیو تماس بگیرید یا پیام بدهید تا زمانی مناسب پیدا کنیم.",
    reviewsKicker: "محبوب مشتریان ما", reviewsTitle: "روایت‌هایی از صندلی استودیو.", noRatings: "نظرهای تازه به‌زودی نمایش داده می‌شوند.",
    contactKicker: "هر زمان آماده بودید", contactTitle: "بیایید زمانی را برای شما کنار بگذاریم.", footerServices: "خدمات", footerReviews: "نظرها", footerContact: "تماس",
    bookBack: "بازگشت به استودیو", bookEyebrow: "درخواست رزرو آنلاین", bookTitle: "زمان مناسب خود را پیدا کنید.", bookIntro: "ابتدا خدمات را انتخاب کنید. مدت کامل مراجعه محاسبه می‌شود و فقط زمان‌هایی نمایش داده می‌شوند که استودیو واقعاً فرصت انجام آن‌ها را دارد.", bookUnavailable: "رزرو آنلاین در حال حاضر فعال نیست.",
  },
} as const;
