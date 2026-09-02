import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Instagram,
  LockKeyhole,
  MapPin,
  Scissors,
  Sparkles,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

const business = {
  address: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS?.trim() || "Toronto, Ontario",
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim() || "",
  tiktok: process.env.NEXT_PUBLIC_TIKTOK_URL?.trim() || "",
  facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL?.trim() || "",
};

const services = [
  {
    title: "Nail services",
    copy: "Russian manicure, gel polish, acrylic and polygel extensions, refills, strengthening, French and custom nail art.",
    icon: Sparkles,
  },
  {
    title: "Hair services",
    copy: "Cuts, styling, root colour, full colour, balayage, ombré and restorative keratin treatments.",
    icon: Scissors,
  },
  {
    title: "Personal appointments",
    copy: "Every visit is scheduled with enough time for consultation, detailed work and a comfortable finish.",
    icon: Clock3,
  },
];

const socials = [
  { label: "Instagram", href: business.instagram },
  { label: "TikTok", href: business.tiktok },
  { label: "Facebook", href: business.facebook },
].filter((item) => item.href);

export default async function Home() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <main className="min-h-screen overflow-hidden bg-[#080b10] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(45,212,191,.11),transparent_28rem),radial-gradient(circle_at_90%_20%,rgba(125,211,252,.07),transparent_24rem)]" />

      <header className="relative z-10 border-b border-white/8 bg-[#080b10]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <Link href="/" className="flex items-center gap-3" aria-label="Manisa home">
            <span className="flex size-10 items-center justify-center rounded-xl bg-teal-300 font-black text-slate-950 shadow-[0_10px_28px_rgba(45,212,191,.18)]">
              M
            </span>
            <div>
              <p className="text-base font-semibold tracking-[-0.02em]">Manisa</p>
              <p className="text-xs text-slate-500">Hair & nail studio</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-slate-400 md:flex" aria-label="Main navigation">
            <a href="#about" className="transition hover:text-white">About</a>
            <a href="#services" className="transition hover:text-white">Services</a>
            <a href="#contact" className="transition hover:text-white">Contact</a>
          </nav>

          <Link href="/login" className="button-secondary">
            <LockKeyhole className="size-4" />
            Staff login
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1.1fr_.9fr] lg:px-10 lg:pb-28 lg:pt-28">
        <div className="flex flex-col justify-center">
          <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/8 px-3 py-1.5 text-sm font-medium text-teal-200">
            <Sparkles className="size-4" />
            Beauty, detail and care
          </div>
          <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            Your next appointment, in a calm and welcoming studio.
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-8 text-slate-400 sm:text-lg">
            Manisa offers professional hair and nail services with careful attention to detail, personalized appointments and a modern studio experience.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href="#contact" className="button min-h-12 px-5">
              Contact Manisa
              <ArrowRight className="size-4" />
            </a>
            <a href="#services" className="button-secondary min-h-12 px-5">
              Explore services
            </a>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-500">
            <span className="flex items-center gap-2"><CalendarDays className="size-4 text-teal-300" /> Appointment based</span>
            <span className="flex items-center gap-2"><MapPin className="size-4 text-teal-300" /> {business.address}</span>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="absolute inset-8 rounded-full bg-teal-300/10 blur-3xl" />
          <div className="panel relative w-full max-w-xl overflow-hidden p-3">
            <div className="rounded-[1.1rem] border border-white/8 bg-[linear-gradient(145deg,#111a22,#0b1016)] p-6 sm:p-8">
              <div className="flex items-center justify-between border-b border-white/8 pb-6">
                <div>
                  <p className="text-sm font-medium text-teal-300">Manisa studio</p>
                  <p className="mt-1 text-2xl font-semibold tracking-[-0.04em]">Designed around your appointment</p>
                </div>
                <span className="flex size-12 items-center justify-center rounded-2xl border border-teal-300/20 bg-teal-300/10 text-teal-200">
                  <Sparkles className="size-6" />
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {[
                  ["Personal service", "Time reserved specifically for you"],
                  ["Modern techniques", "Hair, colour, manicure and nail design"],
                  ["Easy contact", "Find the studio and social pages in one place"],
                ].map(([title, copy]) => (
                  <div key={title} className="rounded-xl border border-white/8 bg-black/10 p-4">
                    <p className="font-semibold text-slate-100">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{copy}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="relative z-10 border-y border-white/8 bg-white/[0.018]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[.75fr_1.25fr] lg:px-10 lg:py-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-300">About us</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Beauty services with a personal touch.</h2>
          </div>
          <div className="max-w-3xl space-y-5 text-base leading-8 text-slate-400">
            <p>
              Manisa is a client-focused hair and nail studio built around thoughtful service, consistent quality and appointments that never feel rushed.
            </p>
            <p>
              From detailed nail work to cuts, styling and colour services, each appointment is handled with care and tailored to the client&apos;s preferences.
            </p>
          </div>
        </div>
      </section>

      <section id="services" className="relative z-10 mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-300">Services</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Focused services, professional results.</h2>
          <p className="mt-4 leading-7 text-slate-400">A selection of Manisa&apos;s core service categories. Exact availability and pricing can be confirmed when booking.</p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {services.map(({ title, copy, icon: Icon }) => (
            <article key={title} className="panel p-6 sm:p-7">
              <span className="flex size-11 items-center justify-center rounded-xl border border-teal-300/20 bg-teal-300/10 text-teal-200">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-6 text-xl font-semibold tracking-[-0.03em]">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-400">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="contact" className="relative z-10 mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:px-10 lg:pb-28">
        <div className="panel overflow-hidden">
          <div className="grid lg:grid-cols-[1.05fr_.95fr]">
            <div className="p-6 sm:p-9 lg:p-12">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-300">Visit & connect</p>
              <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Find Manisa and stay connected.</h2>

              <div className="mt-9 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/8 bg-black/10 p-5">
                  <MapPin className="size-5 text-teal-300" />
                  <p className="mt-4 text-sm font-semibold text-slate-200">Address</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{business.address}</p>
                </div>
                <div className="rounded-xl border border-white/8 bg-black/10 p-5">
                  <Instagram className="size-5 text-teal-300" />
                  <p className="mt-4 text-sm font-semibold text-slate-200">Social media</p>
                  {socials.length ? (
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                      {socials.map((social) => (
                        <a key={social.label} href={social.href} target="_blank" rel="noreferrer" className="text-sm text-slate-400 transition hover:text-teal-300">
                          {social.label}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm leading-6 text-slate-500">Social links will appear here once configured.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-white/8 bg-[radial-gradient(circle_at_50%_20%,rgba(45,212,191,.1),transparent_24rem)] p-6 sm:p-9 lg:border-s lg:border-t-0 lg:p-12">
              <div className="flex h-full flex-col justify-between">
                <div>
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-teal-300 text-slate-950">
                    <LockKeyhole className="size-5" />
                  </span>
                  <h3 className="mt-6 text-2xl font-semibold tracking-[-0.035em]">Manisa management</h3>
                  <p className="mt-3 max-w-md text-sm leading-7 text-slate-400">
                    The private management area is for authorized staff to manage customers, appointments, services and business reporting.
                  </p>
                </div>
                <Link href="/login" className="button mt-8 w-full sm:w-fit">
                  Sign in to management
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <p>© {new Date().getFullYear()} Manisa. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <a href="#about" className="transition hover:text-slate-300">About</a>
            <a href="#contact" className="transition hover:text-slate-300">Contact</a>
            <Link href="/login" className="transition hover:text-slate-300">Login</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
