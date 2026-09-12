"use client";

import { useState } from "react";
import { ArrowUpRight, Scissors } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { publicContentDirection, resolvePublicServiceCategory, type PublicLocale } from "@/lib/public-site";

type ServiceCategory = {
  id: string;
  name: string;
  icon: string | null;
  services: { id: string; name: string }[];
  _count: { services: number };
};

export function PublicServices({ categories, locale, empty }: { categories: ServiceCategory[]; locale: PublicLocale; empty: string }) {
  const ids = categories.map((category) => category.id);
  const [activeId, setActiveId] = useState(() => resolvePublicServiceCategory(ids));
  const resolvedActiveId = resolvePublicServiceCategory(ids, activeId);
  const active = categories.find((category) => category.id === resolvedActiveId);

  if (!active) return <p className="public-service-empty">{empty}</p>;

  const countLabel = locale === "fa" ? `${active._count.services} خدمت` : `${active._count.services} services`;
  return <div className="public-service-browser">
    <div aria-label={locale === "fa" ? "دسته‌بندی خدمات" : "Service categories"} className="public-service-tabs" role="tablist">
      {categories.map((category, index) => {
        const selected = category.id === active.id;
        return <button aria-controls="public-service-panel" aria-selected={selected} className="public-service-tab" data-active={selected ? "true" : undefined} key={category.id} onClick={() => setActiveId(category.id)} role="tab" type="button">
          <span className="public-service-number" dir="ltr">{String(index + 1).padStart(2, "0")}</span>
          <span className="public-service-tab-icon"><CategoryIcon name={category.icon || "sparkles"} size={20}/></span>
          <span className="min-w-0 flex-1"><strong className="block truncate [unicode-bidi:isolate]" dir={publicContentDirection(category.name)}>{category.name}</strong><small>{category._count.services} {locale === "fa" ? "خدمت" : "services"}</small></span>
          <ArrowUpRight className="public-service-arrow" size={18}/>
        </button>;
      })}
    </div>
    <section aria-live="polite" className="public-service-panel" id="public-service-panel" role="tabpanel">
      <div className="public-service-panel-heading"><span className="public-service-panel-icon"><CategoryIcon name={active.icon || "sparkles"} size={26}/></span><div className="min-w-0"><p>{countLabel}</p><h3 className="[unicode-bidi:isolate]" dir={publicContentDirection(active.name)}>{active.name}</h3></div></div>
      <div className="public-service-list">{active.services.map((service, index) => <div className="public-service-item" dir={publicContentDirection(service.name)} key={service.id}><span dir="ltr">{String(index + 1).padStart(2, "0")}</span><Scissors size={15}/><strong className="[unicode-bidi:isolate]">{service.name}</strong></div>)}</div>
    </section>
  </div>;
}
