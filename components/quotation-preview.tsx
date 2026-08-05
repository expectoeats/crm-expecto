"use client";

import React, { useRef } from "react";
import { RiArrowLeftLine, RiPrinterLine, RiDownloadLine, RiWhatsappLine, RiMailLine, RiCheckLine, RiShieldCheckLine } from "react-icons/ri";
import { COMPANY, PAYMENT } from "@/lib/quotation-defaults";
import type { QuotationData } from "@/lib/quotation-types";
import { cn } from "@/lib/ui";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
function fmtLineAmount(n: number) {
  return n > 0 ? fmt(n) : "Included";
}
function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between" style={{ gap: "18px" }}>
      <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{label}</span>
      <span className="text-[11px] font-medium text-slate-700">{value}</span>
    </div>
  );
}

function TRow({ label, value, red, bold }: { label: string; value: string; red?: boolean; bold?: boolean }) {
  return (
    <div className={bold ? "flex items-center justify-between py-2" : "flex items-center justify-between py-1.5"}>
      <span className={bold ? "text-[13px] font-bold text-slate-900" : "text-[11px] text-slate-500"}>{label}</span>
      <span className={red ? "text-[11px] font-semibold text-red-500" : bold ? "text-[16px] font-bold text-slate-900" : "text-[11px] font-semibold text-slate-700"}>{value}</span>
    </div>
  );
}

// ─── Printable Document ────────────────────────────────────────────────────────
function QuotationDocument({ q, upiDeepLink, waPhone }: {
  q: QuotationData; upiDeepLink: (n: number) => string; waPhone: string;
}) {
  const hasDiscount = q.discountAmount > 0;
  const hasTax = q.taxAmount > 0;
  const accentLine = "linear-gradient(90deg, #0f172a 0%, #2563eb 54%, #10b981 100%)";

  return (
    <div className="bg-white" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", padding: "58px 64px 54px", color: "#172033" }}>
      <style>{`
        .print-only { display: none; }
        @media print {
          .screen-only { display: none !important; }
          .print-only { display: block !important; }
        }
      `}</style>
      <div style={{ height: "5px", borderRadius: "999px", background: accentLine, marginBottom: "38px" }} />

      {/* ── HEADER ── */}
      <div className="q-avoid-break flex items-start justify-between pb-9" style={{ borderBottom: "1.5px solid #dbeafe" }}>
        {/* Left: Logo + Company */}
        <div className="flex items-center" style={{ gap: "16px" }}>
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl" style={{ background: "#0f172a", width: "50px", height: "50px", minWidth: "50px", boxShadow: "0 8px 22px rgba(15, 23, 42, 0.12)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/logo.png"
              alt="Expecto Digital"
              style={{ display: "block", width: "50px", height: "50px", objectFit: "cover" }}
            />
          </div>
          <div>
            <p className="text-[16px] font-bold text-slate-900">{COMPANY.name}</p>
            <p className="text-[11px] mt-1 text-slate-500">{COMPANY.email}&nbsp;&nbsp;&bull;&nbsp;&nbsp;{COMPANY.phone}</p>
          </div>
        </div>
        {/* Right: Quotation # + meta */}
        <div className="text-right">
          <p className="text-[8px] font-bold uppercase tracking-[0.45em]" style={{ color: "#2563eb" }}>Quotation</p>
          <p className="text-[25px] font-bold mt-1 text-slate-950">
            {q.quotationNumber || "DRAFT"}
          </p>
          <div className="mt-5 space-y-2.5" style={{ minWidth: "196px" }}>
            <MetaRow label="Date" value={fmtDate(q.date)} />
            <MetaRow label="Valid Till" value={fmtDate(q.validTill)} />
            {q.salesExecutive && <MetaRow label="Executive" value={q.salesExecutive} />}
            <MetaRow label="Currency" value={q.currency} />
          </div>
        </div>
      </div>

      {/* ── BILL TO + PROJECT ── */}
      <div className="mt-9 grid grid-cols-2 gap-12 pb-9" style={{ borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ padding: "20px 22px", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#f8fafc" }}>
          <p className="text-[8px] font-bold uppercase tracking-[0.42em] mb-4" style={{ color: "#2563eb" }}>Bill To</p>
          <p className="text-[15px] font-bold text-slate-950 leading-snug">{q.clientName || "—"}</p>
          {q.clientCompany && q.clientCompany !== q.clientName &&
            <p className="text-[12px] text-slate-600 mt-0.5">{q.clientCompany}</p>}
          <div className="mt-4 space-y-1.5">
            {q.clientPhone && <p className="text-[11px] text-slate-500">{q.clientPhone}</p>}
            {q.clientEmail && <p className="text-[11px] text-slate-500">{q.clientEmail}</p>}
            {q.clientAddress && <p className="text-[11px] text-slate-500">{q.clientAddress}</p>}
            {q.clientGst && <p className="text-[10px] text-slate-400 mt-1">GSTIN: {q.clientGst}</p>}
          </div>
        </div>
        <div style={{ padding: "20px 22px", border: "1px solid #dbeafe", borderRadius: "12px", background: "#eff6ff" }}>
          <p className="text-[8px] font-bold uppercase tracking-[0.42em] mb-4" style={{ color: "#2563eb" }}>Project</p>
          <p className="text-[15px] font-bold text-slate-950 leading-snug">{q.projectType || "Custom Project"}</p>
          <div className="mt-4 space-y-1.5">
            <p className="text-[11px] text-slate-500">Timeline:&nbsp;<span className="font-medium text-slate-700">{q.timeline}</span></p>
            <p className="text-[11px] text-slate-500">Payment:&nbsp;<span className="font-medium text-slate-700">{q.paymentTerms}</span></p>
          </div>
        </div>
      </div>

      {/* ── LINE ITEMS ── */}
      <div className="mt-10">
        <table className="w-full border-collapse" style={{ fontSize: "12px" }}>
          <thead>
            <tr style={{ background: "#0f172a", borderBottom: "1px solid #0f172a" }}>
              <th className="py-4 pl-4 text-left text-[8px] font-bold uppercase tracking-[0.3em] text-white w-8" style={{ borderTopLeftRadius: "9px" }}>#</th>
              <th className="py-4 text-left text-[8px] font-bold uppercase tracking-[0.3em] text-white">Service / Feature</th>
              <th className="py-4 text-center text-[8px] font-bold uppercase tracking-[0.3em] text-white w-12">Qty</th>
              <th className="py-4 text-right text-[8px] font-bold uppercase tracking-[0.3em] text-white w-28">Unit Price</th>
              <th className="py-4 pr-4 text-right text-[8px] font-bold uppercase tracking-[0.3em] text-white w-28" style={{ borderTopRightRadius: "9px" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {q.lineItems.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #eef2f7" }}>
                <td className="py-3.5 pl-4 text-[10px] text-slate-400">{idx + 1}</td>
                <td className="py-3.5 pr-4">
                  <p className="text-[12px] font-semibold text-slate-800">{item.name}</p>
                  {item.defaultPrice > 0 && item.price !== item.defaultPrice && (
                    <p className="text-[9px] text-slate-400 mt-0.5">List: {fmt(item.defaultPrice)}</p>
                  )}
                </td>
                <td className="py-3.5 text-center text-[12px] text-slate-600">{item.qty}</td>
                <td className="py-3.5 text-right text-[12px] text-slate-500">{fmtLineAmount(item.price)}</td>
                <td className="py-3.5 pr-4 text-right text-[12px] font-bold text-slate-900">{fmtLineAmount(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── TOTALS — flush right below table ── */}
      <div className="q-avoid-break mt-10 flex justify-end">
        <div style={{ width: "310px", padding: "22px 22px 20px", border: "1px solid #dbeafe", borderRadius: "14px", background: "#ffffff", boxShadow: "0 10px 26px rgba(15, 23, 42, 0.05)" }}>
          <div className="space-y-1.5 pb-5" style={{ borderBottom: "1px solid #e2e8f0" }}>
            <TRow label="Subtotal" value={fmt(q.subtotal)} />
            {hasDiscount && (
              <TRow
                label={q.discountType === "percent" ? ("Discount (" + q.discountValue + "%)") : "Discount"}
                value={"−" + fmt(q.discountAmount)} red
              />
            )}
            {hasTax && <TRow label={"GST (" + q.taxRate + "%)"} value={fmt(q.taxAmount)} />}
          </div>
          <div className="pt-5">
            <TRow label="Grand Total" value={fmt(q.grandTotal)} bold />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-5">
            <div className="rounded-lg px-3 py-4 text-center" style={{ background: "#f0fdf4", border: "1px solid #86efac" }}>
              <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-green-700">Advance ({q.advancePercent}%)</p>
              <p className="text-[14px] font-bold mt-1 text-green-900">{fmt(q.advanceAmount)}</p>
            </div>
            <div className="rounded-lg px-3 py-4 text-center" style={{ background: "#fefce8", border: "1px solid #facc15" }}>
              <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-amber-700">Balance Due</p>
              <p className="text-[14px] font-bold mt-1 text-amber-900">{fmt(q.remainingAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── PAYMENT DETAILS ── */}
      <div className="q-avoid-break mt-11 overflow-hidden rounded-xl" style={{ border: "1px solid #dbeafe" }}>
        <div className="px-6 py-4" style={{ background: "#eff6ff", borderBottom: "1px solid #dbeafe" }}>
          <p className="text-[9px] font-bold uppercase tracking-[0.35em]" style={{ color: "#2563eb" }}>Payment Details</p>
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
            <div key={i} className={cn("px-5 py-5", i < 3 ? "border-b border-slate-100" : "", i % 3 !== 2 ? "border-r border-slate-100" : "")}>
              <p className="text-[8px] font-bold uppercase tracking-[0.25em] text-slate-400">{item.label}</p>
              <p className={cn("mt-2 text-[12px] font-semibold text-slate-800", item.mono ? "font-mono text-[11px]" : "")}>{item.value}</p>
            </div>
          ))}
        </div>

        <div className="print-only" style={{ padding: "22px 24px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "24px", alignItems: "center" }}>
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.28em]" style={{ color: "#2563eb" }}>Payment Instruction</p>
              <p className="mt-2 text-[12px] text-slate-600 leading-relaxed">
                Please mention quotation number <span className="font-bold text-slate-900">{q.quotationNumber || "DRAFT"}</span> in the payment reference.
              </p>
            </div>
            <div style={{ padding: "18px 20px", borderRadius: "12px", border: "1px solid #86efac", background: "#f0fdf4" }}>
              <p className="text-[8px] font-bold uppercase tracking-[0.24em] text-green-700">Advance Payable</p>
              <p className="mt-1 text-[18px] font-bold text-green-950">{fmt(q.advanceAmount)}</p>
              <p className="mt-1 text-[10px] font-semibold text-green-700">UPI: {PAYMENT.upiId}</p>
            </div>
          </div>
        </div>

        {/* Pay buttons — light style, screen only */}
        {q.grandTotal > 0 && (
          <div className="screen-only grid grid-cols-2 gap-5 px-6 py-6" style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
            <a href={upiDeepLink(q.advanceAmount)}
              className="flex flex-col items-center justify-center gap-1.5 rounded-xl py-5 transition active:scale-[0.98]"
              style={{ background: "#f0fdf4", border: "1.5px solid #86efac" }}>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-green-600">Pay {q.advancePercent}% Advance</p>
              <p className="text-[19px] font-bold text-green-900">{fmt(q.advanceAmount)}</p>
              <p className="text-[9px] text-green-500">Tap to open UPI app</p>
            </a>
            <a href={upiDeepLink(q.grandTotal)}
              className="flex flex-col items-center justify-center gap-1.5 rounded-xl py-5 transition active:scale-[0.98]"
              style={{ background: "#eff6ff", border: "1.5px solid #93c5fd" }}>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-blue-600">Pay Full Amount</p>
              <p className="text-[19px] font-bold text-blue-900">{fmt(q.grandTotal)}</p>
              <p className="text-[9px] text-blue-400">Tap to open UPI app</p>
            </a>
          </div>
        )}

        {/* WhatsApp confirm */}
        {q.grandTotal > 0 && (
          <div className="screen-only" style={{ borderTop: "1px solid #dbeafe" }}>
            <a
              href={"https://wa.me/" + waPhone + "?text=" + encodeURIComponent("Hi, I would like to confirm payment for quotation " + (q.quotationNumber ?? "") + ".\nAmount: " + fmt(q.grandTotal))}
              target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 py-4 text-[13px] font-semibold transition hover:opacity-80"
              style={{ background: "#f0fdf4", color: "#16a34a" }}>
              <RiWhatsappLine className="h-4 w-4" />
              Confirm Payment via WhatsApp
            </a>
          </div>
        )}
      </div>

      {/* ── NOTES + TERMS ── */}
      {(q.notes.filter(Boolean).length > 0 || q.termsAndConditions.filter(Boolean).length > 0) && (
        <div className="mt-11 grid grid-cols-2 gap-14">
          {q.notes.filter(Boolean).length > 0 && (
            <div style={{ paddingTop: "2px" }}>
              <p className="text-[8px] font-bold uppercase tracking-[0.4em] mb-5" style={{ color: "#2563eb" }}>Notes</p>
              <ul className="space-y-3">
                {q.notes.filter(Boolean).map((note, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[11px] text-slate-600" style={{ lineHeight: 1.65 }}>
                    <RiCheckLine className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />{note}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {q.termsAndConditions.filter(Boolean).length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-5">
                <RiShieldCheckLine className="h-2.5 w-2.5" style={{ color: "#2563eb" }} />
                <p className="text-[8px] font-bold uppercase tracking-[0.4em]" style={{ color: "#2563eb" }}>Terms &amp; Conditions</p>
              </div>
              <ol className="space-y-2.5">
                {q.termsAndConditions.filter(Boolean).map((t, i) => (
                  <li key={i} className="text-[10.5px] text-slate-500" style={{ lineHeight: 1.7 }}>
                    <span className="font-semibold text-slate-600 mr-1">{i + 1}.</span>{t}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* ── FOOTER ── */}
      <div className="mt-14 flex items-end justify-between pt-7 gap-4" style={{ borderTop: "1px solid #e2e8f0" }}>
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

// ─── Print helper ─────────────────────────────────────────────────────────────
function printQuotation(contentHtml: string) {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:none;visibility:hidden";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  const stylesheets = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'))
    .map((link) => `<link rel="stylesheet" href="${link.href}">`)
    .join("");
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Quotation</title>
${stylesheets}
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: white; color: #1e293b; }
  @page { margin: 10mm 12mm; size: A4; }
  @media print {
    .no-print { display: none !important; }
    .q-avoid-break { break-inside: avoid; page-break-inside: avoid; }
  }
  .q-avoid-break { break-inside: avoid; page-break-inside: avoid; }
  img[alt="Expecto Digital"] { position: static !important; width: 50px !important; height: 50px !important; object-fit: cover !important; inset: auto !important; }
</style>
</head><body>${contentHtml}</body></html>`);
  doc.close();
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow!.focus();
      iframe.contentWindow!.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 300);
  };
}

// ─── Preview Wrapper (exported) ───────────────────────────────────────────────
export function QuotationPreview({
  q, onBack, onSave, saving, upiDeepLink, waMsg, waPhone, mailtoLink,
}: {
  q: QuotationData; onBack: () => void; onSave: () => void; saving: boolean;
  upiDeepLink: (amount: number) => string; waMsg: string; waPhone: string; mailtoLink: string;
}) {
  const docRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    if (docRef.current) {
      printQuotation(docRef.current.innerHTML);
    }
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200">
          <RiArrowLeftLine className="h-4 w-4" /> Back to Edit
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onSave} disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving\u2026" : "Mark as Sent"}
          </button>
          <button type="button" onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
            <RiDownloadLine className="h-4 w-4" /> Download PDF
          </button>
          <button type="button" onClick={handlePrint}
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

      {/* Screen preview */}
      <div className="mx-auto max-w-[794px] bg-white shadow-sm ring-1 ring-slate-200">
        <div ref={docRef}>
          <QuotationDocument q={q} upiDeepLink={upiDeepLink} waPhone={waPhone} />
        </div>
      </div>
    </div>
  );
}
