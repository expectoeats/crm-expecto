"use client";

import { useCallback, useState } from "react";
import {
  RiSaveLine, RiEyeLine, RiFilePdfLine, RiMailLine, RiWhatsappLine,
  RiAddLine, RiDeleteBin6Line, RiCheckboxCircleLine, RiMoneyDollarCircleLine,
} from "react-icons/ri";
import { Input, Select, Button } from "@/components/ui";
import { apiFetch } from "@/lib/http";
import { cn } from "@/lib/ui";
import {
  PAYMENT, PROJECT_TYPES, BASIC_FEATURES, PREMIUM_FEATURES,
  EXTRA_SERVICES, DEFAULT_TERMS, DEFAULT_NOTES, type FeatureDef,
} from "@/lib/quotation-defaults";
import type { QuotationData, LineItem } from "@/lib/quotation-types";
import { QuotationPreview } from "@/components/quotation-preview";

export type { QuotationData, LineItem };

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
function todayStr() { return new Date().toISOString().slice(0, 10); }
function validTillStr() { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); }

function calcTotals(items: LineItem[], discountType: "percent"|"fixed", discountValue: number, taxRate: number, advancePercent: number) {
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const discountAmount = discountType === "percent" ? Math.round((subtotal * discountValue) / 100) : discountValue;
  const afterDiscount = Math.max(subtotal - discountAmount, 0);
  const taxAmount = Math.round((afterDiscount * taxRate) / 100);
  const grandTotal = afterDiscount + taxAmount;
  const advanceAmount = Math.round((grandTotal * advancePercent) / 100);
  return { subtotal, discountAmount, taxAmount, grandTotal, advanceAmount, remainingAmount: grandTotal - advanceAmount };
}

function defaultQ(): QuotationData {
  return {
    clientName: "", clientCompany: "", clientPhone: "", clientEmail: "",
    clientAddress: "", clientGst: "", salesExecutive: "", currency: "INR",
    date: todayStr(), validTill: validTillStr(), projectType: "", lineItems: [],
    subtotal: 0, discountType: "fixed", discountValue: 0, discountAmount: 0,
    taxRate: 0, taxAmount: 0, grandTotal: 0, advancePercent: 50,
    advanceAmount: 0, remainingAmount: 0, timeline: "15 Days",
    paymentTerms: "50% Advance, 50% Before Delivery",
    notes: [...DEFAULT_NOTES], termsAndConditions: [...DEFAULT_TERMS], status: "draft",
  };
}

// ─── Feature Section ──────────────────────────────────────────────────────────
function FeatureSection({ title, features, selectedNames, onToggle, onPriceEdit, editedPrices }: {
  title: string; features: FeatureDef[]; selectedNames: Set<string>;
  onToggle: (f: FeatureDef) => void; onPriceEdit: (name: string, price: number) => void;
  editedPrices: Record<string, number>;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{title}</p>
      <div className="divide-y divide-slate-100 rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden">
        {features.map((f) => {
          const checked = selectedNames.has(f.name);
          const price = editedPrices[f.name] ?? f.defaultPrice;
          return (
            <div key={f.name} className={cn("flex items-center gap-3 px-3 py-2.5 transition", checked && "bg-slate-50")}>
              <button type="button" onClick={() => onToggle(f)}
                className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition",
                  checked ? "border-slate-900 bg-slate-900" : "border-slate-300 bg-white")}>
                {checked && <RiCheckboxCircleLine className="h-3.5 w-3.5 text-white" />}
              </button>
              <span className={cn("flex-1 text-sm", checked ? "font-semibold text-slate-900" : "text-slate-600")}>{f.name}</span>
              <div className="flex items-center gap-1.5">
                {f.defaultPrice === 0 && <span className="text-[10px] font-semibold text-emerald-600">Free</span>}
                {f.defaultPrice > 0 && price !== f.defaultPrice && (
                  <span className="text-[10px] text-slate-400 line-through">{fmt(f.defaultPrice)}</span>
                )}
                <input type="number" min={0} value={price}
                  onChange={(e) => onPriceEdit(f.name, Number(e.target.value))}
                  onClick={(e) => { if (!checked) onToggle(f); e.stopPropagation(); }}
                  className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right text-xs font-semibold text-slate-900 outline-none focus:border-slate-400" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Line Items Table ─────────────────────────────────────────────────────────
function LineItemsTable({ items, onChange }: { items: LineItem[]; onChange: (items: LineItem[]) => void }) {
  function update(idx: number, field: keyof LineItem, val: number | string) {
    const next = items.map((item, i) => {
      if (i !== idx) return item;
      const n = { ...item, [field]: val };
      if (field === "price" || field === "qty") n.total = Number(n.price) * Number(n.qty);
      return n;
    });
    onChange(next);
  }
  function remove(idx: number) { onChange(items.filter((_, i) => i !== idx)); }
  function addCustom() { onChange([...items, { name: "", category: "custom", defaultPrice: 0, price: 0, qty: 1, total: 0 }]); }

  if (!items.length) return (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 py-8 text-center">
      <RiMoneyDollarCircleLine className="mx-auto h-8 w-8 text-slate-300" />
      <p className="mt-2 text-sm text-slate-400">Select project type & features above to populate items.</p>
      <button type="button" onClick={addCustom}
        className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200">
        <RiAddLine className="h-3.5 w-3.5" /> Add Custom Item
      </button>
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Service</th>
              <th className="w-14 px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Qty</th>
              <th className="w-28 px-2 py-2.5 text-right text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Price (₹)</th>
              <th className="w-24 px-2 py-2.5 text-right text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Total</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item, idx) => (
              <tr key={idx} className="group">
                <td className="px-3 py-2">
                  <input value={item.name} onChange={(e) => update(idx, "name", e.target.value)}
                    className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-300"
                    placeholder="Service name" />
                  {item.defaultPrice > 0 && item.price !== item.defaultPrice && (
                    <p className="text-[10px] text-slate-400">Default: {fmt(item.defaultPrice)}</p>
                  )}
                </td>
                <td className="px-2 py-2">
                  <input type="number" min={1} value={item.qty} onChange={(e) => update(idx, "qty", Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1 text-center text-xs font-semibold outline-none focus:border-slate-400" />
                </td>
                <td className="px-2 py-2">
                  <input type="number" min={0} value={item.price} onChange={(e) => update(idx, "price", Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1 text-right text-xs font-semibold outline-none focus:border-slate-400" />
                </td>
                <td className="px-3 py-2 text-right text-sm font-bold text-slate-900">{fmt(item.total)}</td>
                <td className="pr-2">
                  <button type="button" onClick={() => remove(idx)}
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100">
                    <RiDeleteBin6Line className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={addCustom}
        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200">
        <RiAddLine className="h-3.5 w-3.5" /> Add Custom Item
      </button>
    </div>
  );
}

// ─── Section + Label helpers ──────────────────────────────────────────────────
function Section({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200 shadow-sm space-y-4">
      <div>
        {eyebrow && <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">{eyebrow}</p>}
        <h2 className="mt-0.5 text-base font-bold text-slate-950">{title}</h2>
      </div>
      {children}
    </div>
  );
}
function Lbl({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-xs font-semibold text-slate-600">{children}</p>;
}

// ─── Main QuotationBuilder ────────────────────────────────────────────────────
export function QuotationBuilder({ initial, onSaved }: {
  initial?: Partial<QuotationData>; onSaved?: (q: QuotationData) => void;
}) {
  const [q, setQ] = useState<QuotationData>(() => ({ ...defaultQ(), ...initial }));
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(initial?._id ?? "");
  const [showPreview, setShowPreview] = useState(false);
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(() => {
    const s = new Set<string>();
    (initial?.lineItems ?? []).forEach((li) => { if (li.category !== "project") s.add(li.name); });
    return s;
  });
  const [editedPrices, setEditedPrices] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    (initial?.lineItems ?? []).forEach((li) => { if (li.price !== li.defaultPrice) m[li.name] = li.price; });
    return m;
  });

  const recalc = useCallback((items: LineItem[], dt: "percent"|"fixed", dv: number, tr: number, ap: number) => {
    const t = calcTotals(items, dt, dv, tr, ap);
    setQ((prev) => ({ ...prev, ...t, lineItems: items }));
  }, []);

  function setField<K extends keyof QuotationData>(key: K, val: QuotationData[K]) {
    setQ((prev) => ({ ...prev, [key]: val }));
  }

  function selectProject(label: string, price: number) {
    const rest = q.lineItems.filter((li) => li.category !== "project");
    const newItems = label ? [{ name: label, category: "project", defaultPrice: price, price, qty: 1, total: price }, ...rest] : rest;
    setQ((prev) => ({ ...prev, projectType: label }));
    recalc(newItems, q.discountType, q.discountValue, q.taxRate, q.advancePercent);
  }

  function toggleFeature(f: FeatureDef) {
    const price = editedPrices[f.name] ?? f.defaultPrice;
    setSelectedFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(f.name)) {
        next.delete(f.name);
        recalc(q.lineItems.filter((li) => li.name !== f.name), q.discountType, q.discountValue, q.taxRate, q.advancePercent);
      } else {
        next.add(f.name);
        recalc([...q.lineItems, { name: f.name, category: f.category, defaultPrice: f.defaultPrice, price, qty: 1, total: price }],
          q.discountType, q.discountValue, q.taxRate, q.advancePercent);
      }
      return next;
    });
  }

  function handlePriceEdit(name: string, price: number) {
    setEditedPrices((prev) => ({ ...prev, [name]: price }));
    recalc(q.lineItems.map((li) => li.name === name ? { ...li, price, total: price * li.qty } : li),
      q.discountType, q.discountValue, q.taxRate, q.advancePercent);
  }

  function applyDiscount(type: "percent"|"fixed", val: number) {
    setQ((prev) => ({ ...prev, discountType: type, discountValue: val }));
    recalc(q.lineItems, type, val, q.taxRate, q.advancePercent);
  }

  function applyTax(rate: number) {
    setQ((prev) => ({ ...prev, taxRate: rate }));
    recalc(q.lineItems, q.discountType, q.discountValue, rate, q.advancePercent);
  }

  function applyAdvance(pct: number) {
    setQ((prev) => ({ ...prev, advancePercent: pct }));
    recalc(q.lineItems, q.discountType, q.discountValue, q.taxRate, pct);
  }

  async function handleSave(status: "draft" | "sent" = "draft") {
    setSaving(true);
    try {
      const payload = { ...q, status };
      const res = savedId
        ? await apiFetch<{ quotation: QuotationData }>(`/quotations/${savedId}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await apiFetch<{ quotation: QuotationData }>("/quotations", { method: "POST", body: JSON.stringify(payload) });
      const saved = res.data?.quotation;
      if (saved?._id) { setSavedId(saved._id); setQ((prev) => ({ ...prev, ...saved, status })); onSaved?.(saved); }
    } finally { setSaving(false); }
  }

  function getWaMsg() {
    return encodeURIComponent(`Hello ${q.clientName || "there"},\n\nYour quotation *${q.quotationNumber ?? ""}* from *Expecto Digital*.\n\nProject: ${q.projectType || "Custom"}\nTotal: ${fmt(q.grandTotal)}\nValid Till: ${q.validTill}\n\nFor queries, feel free to reach out!`);
  }

  function getMailto() {
    const sub = encodeURIComponent(`Quotation ${q.quotationNumber ?? ""} — Expecto Digital`);
    const body = encodeURIComponent(`Dear ${q.clientName || "Sir/Madam"},\n\nKindly find your quotation.\n\nProject: ${q.projectType}\nAmount: ${fmt(q.grandTotal)}\n\nRegards,\n${q.salesExecutive || "Expecto Digital"}`);
    return `mailto:${q.clientEmail}?subject=${sub}&body=${body}`;
  }

  const upiDeepLink = (amount: number) =>
    `upi://pay?pa=${PAYMENT.upiId}&pn=${encodeURIComponent(PAYMENT.accountName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Quotation ${q.quotationNumber ?? ""} - ${q.clientName}`)}`;

  if (showPreview) {
    return (
      <QuotationPreview q={q} onBack={() => setShowPreview(false)}
        onSave={() => handleSave("sent")} saving={saving}
        upiDeepLink={upiDeepLink} waMsg={getWaMsg()}
        waPhone={PAYMENT.mobile.replace(/\D/g, "")} mailtoLink={getMailto()} />
    );
  }

  return (
    <div className="space-y-6 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{q.quotationNumber ?? "New Quotation"}</p>
          <h1 className="text-xl font-bold text-slate-950">Quotation Builder</h1>
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-bold ring-1",
          q.status === "draft" ? "bg-slate-100 text-slate-600 ring-slate-200"
          : q.status === "sent" ? "bg-blue-100 text-blue-700 ring-blue-200"
          : q.status === "accepted" ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
          : "bg-red-100 text-red-700 ring-red-200"
        )}>{q.status.toUpperCase()}</span>
      </div>

      {/* 1. Quotation Info */}
      <Section title="Quotation Information" eyebrow="Auto">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div><Lbl>Sales Executive</Lbl><Input value={q.salesExecutive} onChange={(e) => setField("salesExecutive", e.target.value)} placeholder="Your name" /></div>
          <div><Lbl>Date</Lbl><Input type="date" value={q.date} onChange={(e) => setField("date", e.target.value)} /></div>
          <div><Lbl>Valid Till</Lbl><Input type="date" value={q.validTill} onChange={(e) => setField("validTill", e.target.value)} /></div>
          <div><Lbl>Currency</Lbl>
            <Select value={q.currency} onChange={(e) => setField("currency", e.target.value)}>
              <option value="INR">INR — Indian Rupee</option>
              <option value="USD">USD — US Dollar</option>
            </Select>
          </div>
          <div><Lbl>Status</Lbl>
            <Select value={q.status} onChange={(e) => setField("status", e.target.value as QuotationData["status"])}>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </Select>
          </div>
        </div>
      </Section>

      {/* 2. Client Details */}
      <Section title="Client Details" eyebrow="Bill To">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-1"><Lbl>Client Name *</Lbl><Input value={q.clientName} onChange={(e) => setField("clientName", e.target.value)} placeholder="Full name" /></div>
          <div><Lbl>Company Name</Lbl><Input value={q.clientCompany} onChange={(e) => setField("clientCompany", e.target.value)} placeholder="Business name" /></div>
          <div><Lbl>Phone</Lbl><Input value={q.clientPhone} onChange={(e) => setField("clientPhone", e.target.value)} placeholder="+91 XXXXX XXXXX" /></div>
          <div><Lbl>Email</Lbl><Input type="email" value={q.clientEmail} onChange={(e) => setField("clientEmail", e.target.value)} placeholder="client@email.com" /></div>
          <div><Lbl>Address</Lbl><Input value={q.clientAddress} onChange={(e) => setField("clientAddress", e.target.value)} placeholder="City, State" /></div>
          <div><Lbl>GST No. (Optional)</Lbl><Input value={q.clientGst} onChange={(e) => setField("clientGst", e.target.value)} placeholder="22XXXXX1234X1ZX" /></div>
        </div>
      </Section>

      {/* 3. Project Type */}
      <Section title="Project Type" eyebrow="Select One">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {PROJECT_TYPES.map((pt) => (
            <button key={pt.label} type="button"
              onClick={() => selectProject(q.projectType === pt.label ? "" : pt.label, pt.price)}
              className={cn("flex flex-col items-start rounded-2xl p-3.5 ring-1 text-left transition",
                q.projectType === pt.label ? "bg-slate-950 text-white ring-slate-950 shadow-md" : "bg-white text-slate-700 ring-slate-200 hover:ring-slate-400")}>
              <span className={cn("text-sm font-bold leading-tight", q.projectType === pt.label ? "text-white" : "text-slate-900")}>{pt.label}</span>
              <span className={cn("mt-1 text-xs font-semibold", q.projectType === pt.label ? "text-white/70" : "text-slate-500")}>
                {pt.price > 0 ? fmt(pt.price) : "Custom Price"}
              </span>
            </button>
          ))}
        </div>
      </Section>

      {/* 4. Features */}
      <Section title="Features & Services" eyebrow="Tick to Add · Edit Price Inline">
        <div className="space-y-4">
          <FeatureSection title="Basic Website Features" features={BASIC_FEATURES} selectedNames={selectedFeatures} onToggle={toggleFeature} onPriceEdit={handlePriceEdit} editedPrices={editedPrices} />
          <FeatureSection title="Premium Features" features={PREMIUM_FEATURES} selectedNames={selectedFeatures} onToggle={toggleFeature} onPriceEdit={handlePriceEdit} editedPrices={editedPrices} />
          <FeatureSection title="Extra Services" features={EXTRA_SERVICES} selectedNames={selectedFeatures} onToggle={toggleFeature} onPriceEdit={handlePriceEdit} editedPrices={editedPrices} />
        </div>
      </Section>

      {/* 5. Line Items */}
      <Section title="Quotation Items" eyebrow="Review & Edit Prices">
        <LineItemsTable items={q.lineItems} onChange={(items) => recalc(items, q.discountType, q.discountValue, q.taxRate, q.advancePercent)} />
      </Section>

      {/* 6. Pricing */}
      <Section title="Pricing Summary" eyebrow="Discount · GST · Totals">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Lbl>Discount Type</Lbl>
            <div className="flex gap-2">
              {(["fixed","percent"] as const).map((t) => (
                <button key={t} type="button" onClick={() => applyDiscount(t, q.discountValue)}
                  className={cn("flex-1 rounded-xl py-2.5 text-sm font-semibold ring-1 transition",
                    q.discountType === t ? "bg-slate-950 text-white ring-slate-950" : "bg-white text-slate-600 ring-slate-200")}>
                  {t === "fixed" ? "₹ Fixed" : "% Percent"}
                </button>
              ))}
            </div>
            <Input type="number" min={0} value={q.discountValue}
              placeholder={q.discountType === "percent" ? "e.g. 10" : "e.g. 500"}
              onChange={(e) => applyDiscount(q.discountType, Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Lbl>GST / Tax</Lbl>
            <div className="flex flex-wrap gap-1.5">
              {[0, 5, 12, 18].map((r) => (
                <button key={r} type="button" onClick={() => applyTax(r)}
                  className={cn("rounded-xl px-3 py-2 text-sm font-semibold ring-1 transition",
                    q.taxRate === r ? "bg-slate-950 text-white ring-slate-950" : "bg-white text-slate-600 ring-slate-200")}>{r}%</button>
              ))}
              <input type="number" min={0} max={100} placeholder="Custom %"
                value={![0,5,12,18].includes(q.taxRate) ? q.taxRate : ""}
                onChange={(e) => applyTax(Number(e.target.value))}
                className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
            </div>
          </div>
        </div>
        {/* Summary */}
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 space-y-2">
          {[
            { label: "Subtotal", val: q.subtotal, cls: "" },
            { label: `Discount${q.discountType === "percent" ? ` (${q.discountValue}%)` : ""}`, val: -q.discountAmount, cls: "text-red-600" },
            { label: `GST (${q.taxRate}%)`, val: q.taxAmount, cls: "" },
          ].map(({ label, val, cls }) => (
            <div key={label} className="flex items-center justify-between text-sm">
              <span className="text-slate-500">{label}</span>
              <span className={cn("font-semibold text-slate-800", cls)}>{val < 0 ? `-${fmt(-val)}` : fmt(val)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t-2 border-slate-200 pt-2">
            <span className="text-base font-black text-slate-950">Grand Total</span>
            <span className="text-2xl font-black text-slate-950">{fmt(q.grandTotal)}</span>
          </div>
        </div>
        {/* Advance */}
        <div className="space-y-2">
          <Lbl>Advance Payment (%)</Lbl>
          <div className="flex flex-wrap gap-1.5">
            {[25,50,75,100].map((p) => (
              <button key={p} type="button" onClick={() => applyAdvance(p)}
                className={cn("rounded-xl px-3 py-2 text-sm font-semibold ring-1 transition",
                  q.advancePercent === p ? "bg-slate-950 text-white ring-slate-950" : "bg-white text-slate-600 ring-slate-200")}>{p}%</button>
            ))}
            <input type="number" min={0} max={100} placeholder="Custom"
              value={![25,50,75,100].includes(q.advancePercent) ? q.advancePercent : ""}
              onChange={(e) => applyAdvance(Number(e.target.value))}
              className="w-20 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
            <div><p className="text-xs font-semibold text-emerald-700">Advance ({q.advancePercent}%)</p><p className="text-xl font-black text-emerald-800">{fmt(q.advanceAmount)}</p></div>
            <div><p className="text-xs font-semibold text-slate-600">Remaining</p><p className="text-xl font-black text-slate-800">{fmt(q.remainingAmount)}</p></div>
          </div>
        </div>
      </Section>

      {/* 7. Timeline & Terms */}
      <Section title="Timeline & Terms" eyebrow="Delivery">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Lbl>Development Timeline</Lbl>
            <div className="flex flex-wrap gap-1.5">
              {["7 Days","15 Days","30 Days"].map((t) => (
                <button key={t} type="button" onClick={() => setField("timeline", t)}
                  className={cn("rounded-xl px-3 py-2 text-sm font-semibold ring-1 transition",
                    q.timeline === t ? "bg-slate-950 text-white ring-slate-950" : "bg-white text-slate-600 ring-slate-200")}>{t}</button>
              ))}
            </div>
            <Input value={q.timeline} onChange={(e) => setField("timeline", e.target.value)} placeholder="Custom timeline" />
          </div>
          <div><Lbl>Payment Terms</Lbl><Input value={q.paymentTerms} onChange={(e) => setField("paymentTerms", e.target.value)} /></div>
        </div>
        {/* Notes */}
        <div className="space-y-2">
          <Lbl>Notes</Lbl>
          {q.notes.map((note, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={note} onChange={(e) => { const n=[...q.notes]; n[i]=e.target.value; setField("notes",n); }}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400" />
              <button type="button" onClick={() => setField("notes", q.notes.filter((_,j)=>j!==i))} className="text-slate-300 hover:text-red-500"><RiDeleteBin6Line className="h-4 w-4" /></button>
            </div>
          ))}
          <button type="button" onClick={() => setField("notes",[...q.notes,""])}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800">
            <RiAddLine className="h-3.5 w-3.5" /> Add Note
          </button>
        </div>
        {/* T&C */}
        <div className="space-y-2">
          <Lbl>Terms & Conditions</Lbl>
          {q.termsAndConditions.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-xs font-bold text-slate-400">{i+1}.</span>
              <input value={t} onChange={(e) => { const arr=[...q.termsAndConditions]; arr[i]=e.target.value; setField("termsAndConditions",arr); }}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400" />
              <button type="button" onClick={() => setField("termsAndConditions", q.termsAndConditions.filter((_,j)=>j!==i))} className="text-slate-300 hover:text-red-500"><RiDeleteBin6Line className="h-4 w-4" /></button>
            </div>
          ))}
          <button type="button" onClick={() => setField("termsAndConditions",[...q.termsAndConditions,""])}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800">
            <RiAddLine className="h-3.5 w-3.5" /> Add Term
          </button>
        </div>
      </Section>

      {/* ── Sticky Action Bar ── */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/96 px-4 py-3 backdrop-blur xl:pl-[304px]">
        <div className="mx-auto flex max-w-4xl items-center gap-2 overflow-x-auto">
          <Button onClick={() => handleSave("draft")} disabled={saving} variant="secondary" className="shrink-0 gap-2 px-4 py-2.5 text-sm">
            <RiSaveLine className="h-4 w-4" />{saving ? "Saving…" : "Save Draft"}
          </Button>
          <Button onClick={() => setShowPreview(true)} className="shrink-0 gap-2 bg-violet-600 px-4 py-2.5 text-sm hover:bg-violet-700">
            <RiEyeLine className="h-4 w-4" />Preview &amp; Export
          </Button>
          <Button onClick={() => handleSave("sent")} disabled={saving} className="shrink-0 gap-2 bg-blue-600 px-4 py-2.5 text-sm hover:bg-blue-700">
            <RiFilePdfLine className="h-4 w-4" />Save &amp; Mark Sent
          </Button>
          {q.clientEmail && (
            <a href={getMailto()} className="shrink-0 inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200">
              <RiMailLine className="h-4 w-4" />Email
            </a>
          )}
          {q.clientPhone && (
            <a href={`https://wa.me/${q.clientPhone.replace(/\D/g,"")}?text=${getWaMsg()}`} target="_blank" rel="noreferrer"
              className="shrink-0 inline-flex items-center gap-2 rounded-2xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1fba58]">
              <RiWhatsappLine className="h-4 w-4" />WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
