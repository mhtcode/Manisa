import Link from "next/link";
import { Check, Clock3, RotateCcw, Star, Trash2, X } from "lucide-react";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { PageHeading } from "@/components/page-heading";
import { requireBusinessPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { approveStudioReview, deleteStudioReview, rejectStudioReview, restoreStudioReview } from "@/server/actions/reviews";

const filters = ["PENDING", "APPROVED", "REJECTED", "DELETED"] as const;

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireBusinessPermission("reviews.manage");
  const query = await searchParams;
  const status = filters.find((item) => item === query.status) || "PENDING";
  const allReviews = await prisma.studioReview.findMany({ orderBy: { createdAt: "desc" } });
  const reviews = allReviews.filter((review) => status === "DELETED" ? Boolean(review.deletedAt) : !review.deletedAt && review.status === status);
  const count = (filter: typeof filters[number]) => allReviews.filter((review) => filter === "DELETED" ? Boolean(review.deletedAt) : !review.deletedAt && review.status === filter).length;

  return <><PageHeading backHref="/settings" title="Customer reviews"/>
    <nav className="mb-5 flex gap-2 overflow-x-auto" data-horizontal-scroll>{filters.map((item) => <Link className={`filter-chip ${status === item ? "active" : ""}`} href={`/settings/reviews?status=${item}`} key={item}>{item.toLowerCase()} · {count(item)}</Link>)}</nav>
    <section className="panel overflow-hidden"><div className="divide-y divide-white/7">{reviews.map((review) => <article className="p-5 sm:p-6" key={review.id}><div className="flex items-start gap-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-300/10 text-amber-200"><Star className="fill-current" size={17}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold" dir="auto">{review.reviewerName}</h2><span className="flex items-center gap-1 text-sm text-amber-200">{review.rating}<Star className="fill-current" size={13}/></span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300" dir="auto">{review.opinion}</p><p className="mt-3 flex items-center gap-1.5 text-xs text-slate-600"><Clock3 size={13}/>{new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(review.createdAt)}</p></div></div><div className="mt-4 flex justify-end gap-2">
      {status === "DELETED" ? <form action={restoreStudioReview.bind(null, review.id)}><button aria-label="Restore review" className="icon-button text-emerald-300" title="Restore"><RotateCcw size={16}/></button></form> : <>
        {review.status !== "REJECTED" && <form action={rejectStudioReview.bind(null, review.id)}><button aria-label="Reject review" className="icon-button text-rose-300" title="Reject or undo approval"><X size={16}/></button></form>}
        {review.status !== "APPROVED" && <form action={approveStudioReview.bind(null, review.id)}><button aria-label="Approve review" className="icon-button text-emerald-300" title="Approve or undo rejection"><Check size={17}/></button></form>}
        <ConfirmActionForm action={deleteStudioReview.bind(null, review.id)} className="icon-button text-rose-300" message="Move this review to Deleted? You can restore it later." title="Delete review"><Trash2 size={16}/></ConfirmActionForm>
      </>}
    </div></article>)}{!reviews.length && <div className="empty">No {status.toLowerCase()} reviews.</div>}</div></section>
  </>;
}
