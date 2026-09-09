"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeftRight, CheckCircle2, FilePlus2, Landmark, LoaderCircle, Plus, ReceiptText, Store, Tags, WalletCards, X } from "lucide-react";
import { createCashTransaction, createCustomerInvoice, createFinancialAccount, createFinancialCategory, createRecurringBill, createSupplierBill, createVendor } from "@/server/actions/cashbook";

type Option = { id: string; name: string };
type Props = {
  accounts: Option[];
  incomeCategories: Option[];
  expenseCategories: Option[];
  vendors: Option[];
  invoiceAppointments: Array<Option & { subtitle: string }>;
  today: string;
};

const actions = [
  ["income", "Income", Plus], ["expense", "Expense", ReceiptText], ["transfer", "Transfer", ArrowLeftRight],
  ["bill", "Bill", FilePlus2], ["invoice", "Invoice", ReceiptText], ["vendor", "Vendor", Store],
  ["account", "Account", Landmark], ["category", "Category", Tags], ["recurring", "Recurring bill", WalletCards],
] as const;

export function CashbookActionMenu(props: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [mode, setMode] = useState<(typeof actions)[number][0]>("income");
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");
  const resetStatus = () => { setCompleted(false); setError(""); setSaving(false); };
  const open = (next: typeof mode) => { setMode(next); resetStatus(); dialog.current?.showModal(); };
  const close = () => dialog.current?.close();
  const chooseMode = (next: typeof mode) => { setMode(next); resetStatus(); };
  const save = async (action: (data: FormData) => Promise<void>, data: FormData) => {
    setSaving(true); setError("");
    try { await action(data); setCompleted(true); router.refresh(); }
    catch (cause) { const message = cause instanceof Error ? cause.message : ""; setError(message && !/minified react error|server components|digest/i.test(message) ? message : "This record could not be saved. Check the details and try again."); }
    finally { setSaving(false); }
  };
  return <>
    <div className="flex flex-wrap justify-end gap-2">{actions.slice(0, 5).map(([value, label, Icon]) => <button aria-label={`Add ${label}`} className="icon-button" key={value} onClick={() => open(value)} title={label} type="button"><Icon size={17}/></button>)}<button className="button-secondary min-h-10" onClick={() => open("vendor")} type="button"><Plus size={16}/>More</button></div>
    <dialog className="m-auto w-[min(94vw,38rem)] overflow-hidden rounded-3xl border border-white/12 bg-[#0b121d] p-0 text-white shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm" onClick={(event) => { if (event.target === dialog.current) close(); }} ref={dialog}>
      <header className="flex items-center justify-between border-b border-white/8 p-4"><h2 className="font-semibold">{actions.find(([value]) => value === mode)?.[1]}</h2><button aria-label="Close" className="icon-button size-9" onClick={close} type="button"><X size={17}/></button></header>
      <div className="flex gap-2 overflow-x-auto border-b border-white/8 p-3" data-horizontal-scroll>{actions.map(([value, label, Icon]) => <button className={`filter-chip ${mode === value ? "active" : ""}`} key={value} onClick={() => chooseMode(value)} type="button"><Icon size={14}/>{label}</button>)}</div>
      <div className="max-h-[70vh] overflow-y-auto p-5">
        {completed ? <Completion mode={mode} onAddAnother={resetStatus} onDone={close}/> : <>
        {error && <p className="mb-4 flex items-start gap-2 rounded-2xl bg-rose-500/10 p-3 text-sm text-rose-200" role="alert"><AlertCircle className="mt-0.5 shrink-0" size={16}/>{error}</p>}
        {(mode === "income" || mode === "expense" || mode === "transfer") && <form action={(data) => save(createCashTransaction, data)} className="grid gap-4"><input name="type" type="hidden" value={mode.toUpperCase()}/><Field label="Description"><input className="field" name="description" required/></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Amount"><input className="field" inputMode="decimal" name="amount" required/></Field><Field label="Date"><input className="field" defaultValue={props.today} name="occurredAt" required type="date"/></Field></div><Field label={mode === "transfer" ? "From account" : "Account"}><Select name="accountId" options={props.accounts}/></Field>{mode === "transfer" ? <Field label="To account"><Select name="destinationAccountId" options={props.accounts}/></Field> : <Field label="Category"><Select name="categoryId" options={mode === "income" ? props.incomeCategories : props.expenseCategories}/></Field>}<Field label="Vendor (optional)"><Select name="vendorId" options={props.vendors} optional/></Field><Field label="Reference (optional)"><input className="field" name="reference"/></Field><Submit pending={saving}/></form>}
        {mode === "bill" && <form action={(data) => save(createSupplierBill, data)} className="grid gap-4"><Field label="Vendor"><Select name="vendorId" options={props.vendors}/></Field><Field label="Description"><input className="field" name="description" required/></Field><Field label="Expense category"><Select name="categoryId" options={props.expenseCategories}/></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Amount"><input className="field" inputMode="decimal" name="amount" required/></Field><Field label="Bill number"><input className="field" name="billNumber"/></Field><Field label="Issue date"><input className="field" defaultValue={props.today} name="issueDate" required type="date"/></Field><Field label="Due date"><input className="field" name="dueDate" type="date"/></Field></div><label className="flex items-center gap-2 text-sm"><input name="draft" type="checkbox"/>Save as draft</label><Submit pending={saving}/></form>}
        {mode === "invoice" && <form action={(data) => save((formData) => createCustomerInvoice(String(formData.get("appointmentId")), formData), data)} className="grid gap-4"><Field label="Finalized appointment"><select className="field" name="appointmentId" required><option value="">Choose appointment</option>{props.invoiceAppointments.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.subtitle}</option>)}</select></Field><Field label="Due date"><input className="field" name="dueDate" type="date"/></Field><Field label="Notes"><textarea className="field min-h-24" name="notes"/></Field><Submit pending={saving}/></form>}
        {mode === "vendor" && <form action={(data) => save(createVendor, data)} className="grid gap-4"><Field label="Vendor name"><input className="field" name="name" required/></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Email"><input className="field" name="email" type="email"/></Field><Field label="Phone"><input className="field" name="phone"/></Field></div><Submit pending={saving}/></form>}
        {mode === "account" && <form action={(data) => save(createFinancialAccount, data)} className="grid gap-4"><Field label="Account name"><input className="field" name="name" required/></Field><Field label="Type"><select className="field" name="type"><option value="CASH">Cash</option><option value="BANK">Bank</option><option value="CARD">Card</option><option value="E_WALLET">E-wallet</option><option value="OTHER">Other</option></select></Field><Field label="Opening balance"><input className="field" defaultValue="0.00" inputMode="decimal" name="openingBalance"/></Field><Submit pending={saving}/></form>}
        {mode === "category" && <form action={(data) => save(createFinancialCategory, data)} className="grid gap-4"><Field label="Category name"><input className="field" name="name" required/></Field><Field label="Type"><select className="field" name="type"><option value="INCOME">Income</option><option value="EXPENSE">Expense</option></select></Field><Submit pending={saving}/></form>}
        {mode === "recurring" && <form action={(data) => save(createRecurringBill, data)} className="grid gap-4"><Field label="Vendor"><Select name="vendorId" options={props.vendors}/></Field><Field label="Description"><input className="field" name="description" required/></Field><Field label="Expense category"><Select name="categoryId" options={props.expenseCategories}/></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Amount"><input className="field" inputMode="decimal" name="amount" required/></Field><Field label="Frequency"><select className="field" name="frequency"><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option><option value="QUARTERLY">Quarterly</option><option value="YEARLY">Yearly</option></select></Field><Field label="First issue date"><input className="field" defaultValue={props.today} name="nextIssueDate" required type="date"/></Field><Field label="Payment due after"><div className="flex items-center gap-2"><input className="field" defaultValue="0" min="0" name="dueAfterDays" type="number"/><span className="text-sm text-slate-500">days</span></div></Field></div><Submit pending={saving}/></form>}
        </>}
      </div>
    </dialog>
  </>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="label">{label}</span>{children}</label>; }
function Select({ name, options, optional = false }: { name: string; options: Option[]; optional?: boolean }) { return <select className="field" name={name} required={!optional}><option value="">{optional ? "None" : "Choose"}</option>{options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>; }
function Submit({ pending }: { pending: boolean }) { return <button className="button mt-2" disabled={pending} type="submit">{pending ? <><LoaderCircle className="animate-spin" size={16}/>Saving…</> : "Save"}</button>; }
function Completion({ mode, onDone, onAddAnother }: { mode: (typeof actions)[number][0]; onDone: () => void; onAddAnother: () => void }) { const label = actions.find(([value]) => value === mode)?.[1] || "Record"; return <div className="py-7 text-center"><span className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300"><CheckCircle2 size={27}/></span><h3 className="mt-4 text-lg font-semibold">{label} saved</h3><p className="mt-2 text-sm text-slate-500">The financial records and balances are now up to date.</p><div className="mt-6 flex justify-center gap-2"><button className="button-secondary" onClick={onAddAnother} type="button">Add another</button><button className="button" onClick={onDone} type="button">Done</button></div></div>; }
