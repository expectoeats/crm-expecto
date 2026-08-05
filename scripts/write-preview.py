import os, sys
os.chdir(r'd:/main/Project/crm-expecto')

content = r'''"use client";

import Image from "next/image";
import { useRef } from "react";
import { RiArrowLeftLine, RiPrinterLine, RiDownloadLine, RiWhatsappLine, RiMailLine, RiCheckLine, RiShieldCheckLine } from "react-icons/ri";
import { COMPANY, PAYMENT } from "@/lib/quotation-defaults";
import type { QuotationData } from "@/lib/quotation-types";
import { cn } from "@/lib/ui";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{label}</span>
      <span className="text-[11px] font-medium text-slate-700">{value}</span>
    </div>
  );
}

function TRow({ label, value, red, bold }: { label: string; value: string; red?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={bold ? "text-[12px] font-bold text-slate-900" : "text-[11px] text-slate-500"}>{label}</span>
      <span className={red ? "text-[11px] font-semibold text-red-500" : bold ? "text-[14px] font-bold text-slate-900" : "text-[11px] font-semibold text-slate-700"}>{value}</span>
    </div>
  );
}

// ─── Printable Document ────────────────────────────────────────────────────────
function QuotationDocument({ q, upiDeepLink, waPhone }: {
  q: QuotationData; upiDeepLink: (n: number) => string; waPhone: string;
}) {
  const hasDiscount = q.discountAmount > 0;
  const hasTax = q.taxAmount > 0;

  return (
    <div className="bg-white" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", padding: "44px 48px" }}>

      {/* ── HEADER ── */}
      <div className="q-avoid-break flex items-start justify-between pb-6" style={{ borderBottom: "1.5px solid #e2e8f0" }}>
        {/* Left: Logo + Company */}
        <div className="flex items-center gap-3.5">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl" style={{ background: "#0f172a" }}>
            <Image src="/img/logo.png" alt="Expecto Digital" fill className="object-cover" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-slate-800" style={{ letterSpacing: "-0.01em" }}>{COMPANY.name}</p>
            <p className="text-[11px] mt-0.5 text-slate-400">{COMPANY.email}&nbsp;&nbsp;&bull;&nbsp;&nbsp;{COMPANY.phone}</p>
          </div>
        </div>
        {/* Right: Quotation # + meta */}
        <div className="text-right">
          <p className="text-[8px] font-bold uppercase tracking-[0.45em] text-slate-400">Quotation</p>
          <p className="text-[22px] font-bold mt-0.5 text-slate-900" style={{ letterSpacing: "-0.025em" }}>
            {q.quotationNumber || "DRAFT"}
          </p>
          <div className="mt-3 space-y-1.5" style={{ minWidth: "176px" }}>
            <MetaRow label="Date" value={fmtDate(q.date)} />
            <MetaRow label="Valid Till" value={fmtDate(q.validTill)} />
            {q.salesExecutive && <MetaRow label="Executive" value={q.salesExecutive} />}
            <MetaRow label="Currency" value={q.currency} />
          </div>
        </div>
      </div>

      {/* ── BILL TO + PROJECT ── */}
      <div className="mt-6 grid grid-cols-2 gap-12 pb-5" style={{ borderBottom: "1px solid #f1f5f9" }}>
        <div>
          <p className="text-[8px] font-bold uppercase tracking-[0.42em] text-slate-400 mb-2.5">Bill To</p>
          <p className="text-[14px] font-semibold text-slate-900 leading-snug">{q.clientName || "—"}</p>
          {q.clientCompany && q.clientCompany !== q.clientName &&
            <p className="text-[12px] text-slate-600 mt-0.5">{q.clientCompany}</p>}
          <div className="mt-2 space-y-0.5">
            {q.clientPhone && <p className="text-[11px] text-slate-500">{q.clientPhone}</p>}
            {q.clientEmail && <p className="text-[11px] text-slate-500">{q.clientEmail}</p>}
            {q.clientAddress && <p className="text-[11px] text-slate-500">{q.clientAddress}</p>}
            {q.clientGst && <p className="text-[10px] text-slate-400 mt-1">GSTIN: {q.clientGst}</p>}
          </div>
        </div>
        <div>
          <p className="text-[8px] font-bold uppercase tracking-[0.42em] text-slate-400 mb-2.5">Project</p>
          <p className="text-[14px] font-semibold text-slate-900 leading-snug">{q.projectType || "Custom Project"}</p>
          <div className="mt-2 space-y-0.5">
            <p className="text-[11px] text-slate-500">Timeline:&nbsp;<span className="font-medium text-slate-700">{q.timeline}</span></p>
            <p className="text-[11px] text-slate-500">Payment:&nbsp;<span className="font-medium text-slate-700">{q.paymentTerms}</span></p>
          </div>
        </div>
      </div>

      {/* ── LINE ITEMS ── */}
      <div className="mt-6">
        <table className="w-full border-collapse" style={{ fontSize: "12px" }}>
          <thead>
            <tr style={{ borderBottom: "1.5px solid #334155" }}>
              <th className="pb-2.5 text-left text-[8px] font-bold uppercase tracking-[0.3em] text-slate-500 w-7">#</th>
              <th className="pb-2.5 text-left text-[8px] font-bold uppercase tracking-[0.3em] text-slate-500">Service / Feature</th>
              <th className="pb-2.5 text-center text-[8px] font-bold uppercase tracking-[0.3em] text-slate-500 w-10">Qty</th>
              <th className="pb-2.5 text-right text-[8px] font-bold uppercase tracking-[0.3em] text-slate-500 w-24">Unit Price</th>
              <th className="pb-2.5 text-right text-[8px] font-bold uppercase tracking-[0.3em] text-slate-500 w-24">Total</th>
            </tr>
          </thead>
          <tbody>
            {q.lineItems.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #f8fafc" }}>
                <td className="py-2.5 text-[10px] text-slate-400">{idx + 1}</td>
                <td className="py-2.5 pr-3">
                  <p className="text-[12px] font-medium text-slate-800">{item.name}</p>
                  {item.defaultPrice > 0 && item.price !== item.defaultPrice && (
                    <p className="text-[9px] text-slate-400 mt-0.5">List: {fmt(item.defaultPrice)}</p>
                  )}
                </td>
                <td className="py-2.5 text-center text-[12px] text-slate-600">{item.qty}</td>
                <td className="py-2.5 text-right text-[12px] text-slate-500">{fmt(item.price)}</td>
                <td className="py-2.5 text-right text-[12px] font-semibold text-slate-900">{fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── TOTALS — flush right below table ── */}
      <div className="q-avoid-break mt-3 flex justify-end">
        <div style={{ width: "230px" }}>
          <div className="space-y-0.5 pb-3" style={{ borderBottom: "1px solid #e2e8f0" }}>
            <TRow label="Subtotal" value={fmt(q.subtotal)} />
            {hasDiscount && (
              <TRow
                label={q.discountType === "percent" ? ("Discount (" + q.discountValue + "%)") : "Discount"}
                value={"−" + fmt(q.discountAmount)} red
              />
            )}
            {hasTax && <TRow label={"GST (" + q.taxRate + "%)"} value={fmt(q.taxAmount)} />}
          </div>
          <div className="pt-3">
            <TRow label="Grand Total" value={fmt(q.grandTotal)} bold />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg px-3 py-2 text-center" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-green-700">Advance ({q.advancePercent}%)</p>
              <p className="text-[13px] font-bold mt-0.5 text-green-900">{fmt(q.advanceAmount)}</p>
            </div>
            <div className="rounded-lg px-3 py-2 text-center" style={{ background: "#fefce8", border: "1px solid #fde68a" }}>
              <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-amber-700">Balance Due</p>
              <p className="text-[13px] font-bold mt-0.5 text-amber-900">{fmt(q.remainingAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── PAYMENT DETAILS ── */}
      <div className="q-avoid-break mt-8 overflow-hidden rounded-xl" style={{ border: "1px solid #e2e8f0" }}>
        <div className="px-5 py-3" style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
          <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-slate-500">Payment Details</p>
        </div>
        <div className="grid grid-cols-3 bg-white">
          {[
            { label: "Account Name", value: PAYMENT.accountName, mono: false },
            { label: "Bank", value: PAYMENT.bankName, mono: false },
            { label: "Account No.", value: PAYMENT.accountNumber, mono: true },
            { label: "IFSC Code", value: PAYMENT.ifsc, mono: true },
            { label: "UPI ID", value: PAYMENT.upiId, mono: true },
            { label: "Mobile", value: PAYMENT.mobile, mono: false },
          ].map((item, i) => (
            <div key={i} className={cn("px-4 py-3", i < 3 ? "border-b border-slate-100" : "", i % 3 !== 2 ? "border-r border-slate-100" : "")}>
              <p className="text-[8px] font-bold uppercase tracking-[0.25em] text-slate-400">{item.label}</p>
              <p className={cn("mt-1 text-[12px] font-semibold text-slate-800", item.mono ? "font-mono text-[11px]" : "")}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Pay buttons — light style, screen only */}
        {q.grandTotal > 0 && (
          <div className="no-print grid grid-cols-2 gap-3 px-4 py-4" style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
            <a href={upiDeepLink(q.advanceAmount)}
              className="flex flex-col items-center justify-center gap-1 rounded-xl py-3.5 transition active:scale-[0.98]"
              style={{ background: "#f0fdf4", border: "1.5px solid #86efac" }}>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-green-600">Pay {q.advancePercent}% Advance</p>
              <p className="text-[16px] font-bold text-green-900">{fmt(q.advanceAmount)}</p>
              <p className="text-[9px] text-green-500">Tap to open UPI app</p>
            </a>
            <a href={upiDeepLink(q.grandTotal)}
              className="flex flex-col items-center justify-center gap-1 rounded-xl py-3.5 transition active:scale-[0.98]"
              style={{ background: "#eff6ff", border: "1.5px solid #93c5fd" }}>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-blue-600">Pay Full Amount</p>
              <p className="text-[16px] font-bold text-blue-900">{fmt(q.grandTotal)}</p>
              <p className="text-[9px] text-blue-400">Tap to open UPI app</p>
            </a>
          </div>
        )}

        {/* WhatsApp confirm */}
        {q.grandTotal > 0 && (
          <div className="no-print" style={{ borderTop: "1px solid #e2e8f0" }}>
            <a
              href={"https://wa.me/" + waPhone + "?text=" + encodeURIComponent("Hi, I would like to confirm payment for quotation " + (q.quotationNumber ?? "") + ".\nAmount: " + fmt(q.grandTotal))}
              target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 py-3 text-[12px] font-semibold transition hover:opacity-80"
              style={{ background: "#f0fdf4", color: "#16a34a" }}>
              <RiWhatsappLine className="h-4 w-4" />
              Confirm Payment via WhatsApp
            </a>
          </div>
        )}
      </div>

      {/* ── NOTES + TERMS ── */}
      {(q.notes.filter(Boolean).length > 0 || q.termsAndConditions.filter(Boolean).length > 0) && (
        <div className="mt-7 grid grid-cols-2 gap-8">
          {q.notes.filter(Boolean).length > 0 && (
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.4em] text-slate-400 mb-3">Notes</p>
              <ul className="space-y-2">
                {q.notes.filter(Boolean).map((note, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] text-slate-600">
                    <RiCheckLine className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />{note}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {q.termsAndConditions.filter(Boolean).length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <RiShieldCheckLine className="h-2.5 w-2.5 text-slate-400" />
                <p className="text-[8px] font-bold uppercase tracking-[0.4em] text-slate-400">Terms &amp; Conditions</p>
              </div>
              <ol className="space-y-1.5">
                {q.termsAndConditions.filter(Boolean).map((t, i) => (
                  <li key={i} className="text-[10.5px] text-slate-500 leading-relaxed">
                    <span className="font-semibold text-slate-600 mr-1">{i + 1}.</span>{t}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* ── FOOTER ── */}
      <div className="mt-10 flex items-end justify-between pt-5 gap-4" style={{ borderTop: "1px solid #e2e8f0" }}>
        <div>
          <p className="text-[11px] text-slate-400">Thank you for your business!</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{COMPANY.name}&nbsp;&bull;&nbsp;{COMPANY.email}&nbsp;&bull;&nbsp;{COMPANY.phone}</p>
        </div>
        <div className="text-right">
          <div className="mb-7 h-px w-36" style={{ borderTop: "1px dashed #cbd5e1" }} />
          <p className="text-[11px] font-medium text-slate-600">Authorised Signature</p>
          <p className="text-[10px] text-slate-400">{COMPANY.name}</p>
        </div>
      </div>

    </div>
  );
}

// ─── Preview Wrapper (exported) ───────────────────────────────────────────────
export function QuotationPreview({
  q, onBack, onSave, saving, upiDeepLink, waMsg, waPhone, mailtoLink,
}: {
  q: QuotationData; onBack: () => void; onSave: () => void; saving: boolean;
  upiDeepLink: (amount: number) => string; waMsg: string; waPhone: string; mailtoLink: string;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  void printRef;

  return (
    <div className="space-y-4 pb-6">
      {/* Toolbar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200">
          <RiArrowLeftLine className="h-4 w-4" /> Back to Edit
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onSave} disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving\u2026" : "Mark as Sent"}
          </button>
          <button type="button" onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
            <RiDownloadLine className="h-4 w-4" /> Download PDF
          </button>
          <button type="button" onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200">
            <RiPrinterLine className="h-4 w-4" /> Print
          </button>
          {q.clientEmail && (
            <a href={mailtoLink} className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200">
              <RiMailLine className="h-4 w-4" /> Email
            </a>
          )}
          {q.clientPhone && (
            <a href={"https://wa.me/" + q.clientPhone.replace(/\D/g, "") + "?text=" + waMsg} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1fba58]">
              <RiWhatsappLine className="h-4 w-4" /> WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* Printable area */}
      <div id="quotation-print" className="mx-auto max-w-[794px] bg-white shadow-sm ring-1 ring-slate-200 print:shadow-none print:ring-0">
        <QuotationDocument q={q} upiDeepLink={upiDeepLink} waPhone={waPhone} />
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #quotation-print, #quotation-print * { visibility: visible !important; }
          #quotation-print { position: fixed; inset: 0; margin: 0; }
          .no-print { display: none !important; }
          @page { margin: 0; size: A4; }
        }
      `}</style>
    </div>
  );
}
'''

with open('components/quotation-preview.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

size = os.path.getsize('components/quotation-preview.tsx')
lines = content.count('\n')
print(f'Written: {size} bytes, {lines} lines')
