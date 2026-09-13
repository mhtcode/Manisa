"use client";

import { useState, useTransition } from "react";
import type { Role } from "@prisma/client";
import { useRouter } from "next/navigation";
import { KeyRound, X } from "lucide-react";
import { businessPermissionKeys, type BusinessPermission } from "@/lib/permissions";
import { createMemberAccessDraft, selectMemberRolePreset } from "@/lib/member-access";
import { transferBusinessOwnership, updateMembershipAccess } from "@/server/actions/platform";

const labels: Record<BusinessPermission, string> = {
  "customers.view": "View customers", "customers.manage": "Edit customers",
  "appointments.view": "View appointments", "appointments.manage": "Edit appointments",
  "services.view": "View services", "services.manage": "Edit services",
  "gallery.view": "View gallery", "gallery.manage": "Edit gallery",
  "reports.view": "View reports", "financial.view": "View financial data",
  "financial.manage": "Manage financial records",
  "payments.manage": "Manage payments", "business.manage": "Change business settings",
  "integrations.manage": "Manage integrations", "members.manage": "Manage administrators",
  "data.import": "Import business data", "data.export": "Export business data",
  "trash.manage": "Delete, restore, and purge items",
  "reviews.manage": "Manage customer reviews",
};

export function MemberAccessEditor({ id, name, role, permissions, canTransfer }: { id: string; name: string; role: string; permissions: Record<BusinessPermission, boolean>; canTransfer: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const initialDraft = createMemberAccessDraft(role as Role, permissions);
  const [selectedRole, setSelectedRole] = useState<Role>(initialDraft.role);
  const [selectedPermissions, setSelectedPermissions] = useState(initialDraft.permissions);
  function openEditor() {
    const draft = createMemberAccessDraft(role as Role, permissions);
    setSelectedRole(draft.role);
    setSelectedPermissions(draft.permissions);
    setOpen(true);
  }
  function save(formData: FormData) {
    startTransition(async () => {
      await updateMembershipAccess(id, formData);
      setOpen(false);
      router.refresh();
    });
  }
  return <>
    <button aria-label={`Edit ${name} access`} className="icon-button" onClick={openEditor} title="Role and permissions" type="button"><KeyRound size={17}/></button>
    {open && <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section aria-label={`${name} access`} aria-modal="true" className="panel max-h-[88vh] w-full max-w-2xl overflow-y-auto p-5" role="dialog">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">{name}</h2><p className="text-xs text-slate-500">Role and permissions</p></div><button aria-label="Close" className="icon-button" onClick={() => setOpen(false)} type="button"><X size={17}/></button></div>
        <form action={save} className="mt-5">
          <label className="label" htmlFor={`role-${id}`}>Role preset</label><select className="input" id={`role-${id}`} name="role" onChange={(event) => { const draft = selectMemberRolePreset(event.target.value as Role); setSelectedRole(draft.role); setSelectedPermissions(draft.permissions); }} value={selectedRole}><option value="ADMIN">Admin · full studio access</option><option value="MANAGER">Manager · operations and finance</option><option value="STAFF">Staff · appointments and gallery</option></select>
          <p className="mt-2 text-xs text-slate-500">Changing the role applies its secure default permissions. You can then customize individual access below.</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">{businessPermissionKeys.map((key) => <label className="flex min-h-11 items-center gap-3 rounded-xl border border-white/8 bg-white/[.02] px-3 py-2 text-sm" key={key}><input checked={selectedPermissions[key]} name={`permission:${key}`} onChange={(event) => setSelectedPermissions((current) => ({ ...current, [key]: event.target.checked }))} type="checkbox"/><span>{labels[key]}</span></label>)}</div>
          <button className="button mt-5 w-full" disabled={pending}>{pending ? "Saving…" : "Save access"}</button>
        </form>
        {canTransfer && <form action={transferBusinessOwnership.bind(null, id)} className="mt-3"><button className="button-secondary w-full" onClick={(event) => { if (!window.confirm(`Transfer sole ownership to ${name}? Your account will become an administrator.`)) event.preventDefault(); }}>Transfer ownership</button></form>}
      </section>
    </div>}
  </>;
}
