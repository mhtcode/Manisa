"use client";

import { useState } from "react";
import { KeyRound, X } from "lucide-react";
import { businessPermissionKeys, type BusinessPermission } from "@/lib/permissions";
import { transferBusinessOwnership, updateMembershipAccess } from "@/server/actions/platform";

const labels: Record<BusinessPermission, string> = {
  "customers.view": "View customers", "customers.manage": "Edit customers",
  "appointments.view": "View appointments", "appointments.manage": "Edit appointments",
  "services.view": "View services", "services.manage": "Edit services",
  "gallery.view": "View gallery", "gallery.manage": "Edit gallery",
  "reports.view": "View reports", "financial.view": "View financial data",
  "payments.manage": "Manage payments", "business.manage": "Change business settings",
  "integrations.manage": "Manage integrations", "members.manage": "Manage administrators",
  "trash.manage": "Delete, restore, and purge items",
};

export function MemberAccessEditor({ id, name, role, permissions, canTransfer }: { id: string; name: string; role: string; permissions: Record<BusinessPermission, boolean>; canTransfer: boolean }) {
  const [open, setOpen] = useState(false);
  return <>
    <button aria-label={`Edit ${name} access`} className="icon-button" onClick={() => setOpen(true)} title="Role and permissions" type="button"><KeyRound size={17}/></button>
    {open && <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section aria-label={`${name} access`} aria-modal="true" className="panel max-h-[88vh] w-full max-w-2xl overflow-y-auto p-5" role="dialog">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">{name}</h2><p className="text-xs text-slate-500">Role and permissions</p></div><button aria-label="Close" className="icon-button" onClick={() => setOpen(false)} type="button"><X size={17}/></button></div>
        <form action={updateMembershipAccess.bind(null, id)} className="mt-5">
          <label className="label" htmlFor={`role-${id}`}>Role</label><select className="input" defaultValue={role === "ADMIN" ? "ADMIN" : "STAFF"} id={`role-${id}`} name="role"><option value="ADMIN">Admin</option><option value="STAFF">Staff</option></select>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">{businessPermissionKeys.map((key) => <label className="flex min-h-11 items-center gap-3 rounded-xl border border-white/8 bg-white/[.02] px-3 py-2 text-sm" key={key}><input defaultChecked={permissions[key]} name={`permission:${key}`} type="checkbox"/><span>{labels[key]}</span></label>)}</div>
          <button className="button mt-5 w-full">Save access</button>
        </form>
        {canTransfer && <form action={transferBusinessOwnership.bind(null, id)} className="mt-3"><button className="button-secondary w-full" onClick={(event) => { if (!window.confirm(`Transfer sole ownership to ${name}? Your account will become an administrator.`)) event.preventDefault(); }}>Transfer ownership</button></form>}
      </section>
    </div>}
  </>;
}
