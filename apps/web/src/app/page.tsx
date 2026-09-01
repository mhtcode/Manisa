export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.14),_transparent_42%)]"
      />
      <section className="relative mx-auto max-w-2xl text-center">
        <p className="mb-5 text-sm font-medium uppercase tracking-[0.3em] text-teal-300">
          Business Management Platform
        </p>
        <h1 className="text-6xl font-semibold tracking-tight text-white sm:text-8xl">
          Manisa
        </h1>
        <p className="mx-auto mt-7 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
          A focused foundation for running your business with clarity.
        </p>
      </section>
    </main>
  );
}
