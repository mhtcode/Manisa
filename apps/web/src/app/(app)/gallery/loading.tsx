export default function GalleryLoading() {
  return <div aria-label="Loading gallery" className="animate-pulse"><div className="h-9 w-40 rounded-xl bg-white/[0.06]"/><div className="mt-3 h-4 w-80 max-w-full rounded bg-white/[0.04]"/><div className="mt-8 h-24 rounded-2xl border border-white/8 bg-white/[0.025]"/><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div className="aspect-[4/3] rounded-2xl bg-white/[0.045]" key={index}/>)}</div></div>;
}
