import Link from "next/link";
import { Check, Clock3, Star, X } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { requireBusinessPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { approveStudioReview, rejectStudioReview } from "@/server/actions/reviews";

const filters = ["PENDING", "APPROVED", "REJECTED"] as const;

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireBusinessPermission("business.manage");
  const query = await searchParams;
  const status = filters.find((item) => item === query.status) || "PENDING";
  const [reviews, counts] = await Promise.all([
    prisma.studioReview.findMany({ where: { status }, orderBy: { createdAt: "desc" } }),
    prisma.studioReview.groupBy({ by: ["status"], _count: true }),
  ]);
  const count = new Map(counts.map((item) => [item.status, item._count]));
  return <><PageHeading backHref="/settings" title="Customer reviews"/>
    <nav className="mb-5 flex gap-2 overflow-x-auto" data-horizontal-scroll>{filters.map((item) => <Link className={`filter-chip ${status === item ? "active" : ""}`} href={`/settings/reviews?status=${item}`} key={item}>{item.toLowerCase()} · {count.get(item) || 0}</Link>)}</nav>
    <section className="panel overflow-hidden"><div className="divide-y divide-white/7">{reviews.map((review) => <article className="p-5 sm:p-6" key={review.id}><div className="flex items-start gap-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-300/10 text-amber-200"><Star className="fill-current" size={17}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold" dir="auto">{review.reviewerName}</h2><span className="flex items-center gap-1 text-sm text-amber-200">{review.rating}<Star className="fill-current" size={13}/></span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300" dir="auto">{review.opinion}</p><p className="mt-3 flex items-center gap-1.5 text-xs text-slate-600"><Clock3 size={13}/>{new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(review.createdAt)}</p></div></div>{status === "PENDING" && <div className="mt-4 flex justify-end gap-2"><form action={rejectStudioReview.bind(null, review.id)}><button aria-label="Reject review" className="icon-button text-rose-300" title="Reject"><X size={16}/></button></form><form action={approveStudioReview.bind(null, review.id)}><button aria-label="Approve review" className="icon-button text-emerald-300" title="Approve"><Check size={17}/></button></form></div>}</article>)}{!reviews.length && <div className="empty">No {status.toLowerCase()} reviews.</div>}</div></section>
  </>;
}
