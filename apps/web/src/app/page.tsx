export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div aria-hidden="true" className="ambient-light" />
      <div aria-hidden="true" className="page-grid" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 sm:px-8 lg:px-12">
        <header className="flex h-20 items-center justify-between border-b border-white/8">
          <a href="#main-content" className="flex items-center gap-3" aria-label="Manisa home">
            <span className="flex size-9 items-center justify-center rounded-xl border border-teal-300/25 bg-teal-300/10 text-sm font-semibold text-teal-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              M
            </span>
            <span className="text-base font-semibold tracking-[-0.02em] text-white">Manisa</span>
          </a>

          <div className="flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.035] px-3 py-1.5 text-xs font-medium text-slate-400">
            <span className="size-1.5 rounded-full bg-teal-300 shadow-[0_0_10px_rgba(94,234,212,0.75)]" />
            Initial foundation
          </div>
        </header>

        <section id="main-content" className="flex flex-1 items-center py-20 sm:py-24 lg:py-28">
          <div className="grid w-full items-center gap-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.65fr)] lg:gap-24">
            <div className="max-w-3xl">
              <p className="mb-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-teal-300 sm:text-sm">
                <span className="h-px w-8 bg-teal-300/70" />
                Business management, simplified
              </p>

              <h1 className="text-balance text-5xl font-semibold leading-[1.04] tracking-[-0.055em] text-white sm:text-7xl lg:text-[5.5rem]">
                Run the business.
                <span className="block text-slate-500">See the whole picture.</span>
              </h1>

              <p className="mt-8 max-w-2xl text-pretty text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">
                Manisa brings customers, appointments, services, payments, and business insights together in one focused workspace.
              </p>

              <div className="mt-10 flex flex-wrap gap-2.5" aria-label="Planned product capabilities">
                {[
                  "Customer care",
                  "Appointments",
                  "Business insights",
                  "Persian & English",
                ].map((capability) => (
                  <span key={capability} className="rounded-full border border-white/8 bg-white/[0.035] px-4 py-2 text-sm text-slate-300">
                    {capability}
                  </span>
                ))}
              </div>
            </div>

            <aside className="relative mx-auto w-full max-w-md lg:mx-0 lg:justify-self-end" aria-label="Manisa product principles">
              <div aria-hidden="true" className="absolute -inset-8 rounded-full bg-teal-400/[0.04] blur-3xl" />
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-8">
                <div className="mb-10 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Designed for clarity</span>
                  <span className="font-persian text-sm text-slate-400" dir="rtl" lang="fa">ساده و مطمئن</span>
                </div>

                <div className="space-y-7">
                  {[
                    ["01", "One reliable workspace", "Daily business information stays organized and easy to find."],
                    ["02", "Useful at every size", "A focused system that can grow without becoming complicated."],
                    ["03", "Built around real work", "Fast, responsive, and ready for Persian and English data."],
                  ].map(([number, title, description]) => (
                    <div key={number} className="grid grid-cols-[2rem_1fr] gap-4 border-t border-white/8 pt-6 first:border-0 first:pt-0">
                      <span className="pt-0.5 font-mono text-xs text-teal-300/70">{number}</span>
                      <div>
                        <h2 className="text-sm font-medium text-slate-100">{title}</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-white/8 py-6 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>© Manisa</p>
          <p>Thoughtful tools for everyday business.</p>
        </footer>
      </div>
    </main>
  );
}
