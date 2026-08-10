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
  const accentLine = "linear-gradient(90deg, #0f172a 0%, #1d4ed8 48%, #059669 100%)";

  return (
    <div className="quotation-document bg-white" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", padding: "56px 60px 48px", color: "#172033", background: "#ffffff" }}>
      <style>{`
        .print-only { display: none; }
        @media print {
          .screen-only { display: none !important; }
          .print-only { display: block !important; }
        }
      `}</style>
      <div className="q-accent-line" style={{ height: "4px", borderRadius: "2px", background: accentLine, marginBottom: "28px" }} />

      {/* ── HEADER ── */}
      <div className="q-header q-avoid-break flex items-start justify-between pb-7" style={{ borderBottom: "1px solid #e2e8f0" }}>
        {/* Left: Logo + Company */}
        <div className="flex items-center" style={{ gap: "14px" }}>
          <div className="relative h-12 w-12 shrink-0 overflow-hidden" style={{ background: "#0f172a", width: "48px", height: "48px", minWidth: "48px", borderRadius: "10px", boxShadow: "0 10px 22px rgba(15, 23, 42, 0.14)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/logo.png"
              alt="Expecto Digital"
              style={{ display: "block", width: "48px", height: "48px", objectFit: "cover" }}
            />
          </div>
          <div>
            <p className="text-[16px] font-bold text-slate-950" style={{ letterSpacing: "-0.02em" }}>{COMPANY.name}</p>
            <p className="text-[11px] mt-1 text-slate-500">Digital products, websites and automation</p>
            <p className="text-[10px] mt-1 text-slate-400">{COMPANY.email}&nbsp;&nbsp;&bull;&nbsp;&nbsp;{COMPANY.phone}</p>
          </div>
        </div>
        {/* Right: Quotation # + meta */}
        <div className="text-right">
          <p className="text-[8px] font-bold uppercase tracking-[0.45em]" style={{ color: "#1d4ed8" }}>Quotation</p>
          <p className="text-[24px] font-bold mt-1 text-slate-950" style={{ letterSpacing: "-0.03em" }}>
            {q.quotationNumber || "DRAFT"}
          </p>
          <div className="mt-4 space-y-2" style={{ minWidth: "196px" }}>
            <MetaRow label="Date" value={fmtDate(q.date)} />
            <MetaRow label="Valid Till" value={fmtDate(q.validTill)} />
            {q.salesExecutive && <MetaRow label="Executive" value={q.salesExecutive} />}
            <MetaRow label="Currency" value={q.currency} />
          </div>
        </div>
      </div>

      {/* ── BILL TO + PROJECT ── */}
      <div className="q-info-grid mt-8 grid grid-cols-2 pb-8" style={{ borderBottom: "1px solid #e2e8f0", columnGap: "0" }}>
        <div className="q-info-card relative" style={{ padding: "4px 28px 0 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <span style={{ display: "inline-block", width: "3px", height: "14px", borderRadius: "2px", background: "#1d4ed8" }} />
            <p className="text-[8px] font-bold uppercase tracking-[0.42em]" style={{ color: "#1d4ed8" }}>Bill To</p>
          </div>
          <p className="text-[15px] font-bold text-slate-950 leading-snug" style={{ letterSpacing: "-0.015em" }}>{q.clientName || "—"}</p>
          {q.clientCompany && q.clientCompany !== q.clientName &&
            <p className="text-[12px] text-slate-600 mt-0.5" style={{ letterSpacing: "-0.005em" }}>{q.clientCompany}</p>}
          <div className="mt-3 space-y-1.5">
            {q.clientPhone && <p className="text-[11px] text-slate-500">{q.clientPhone}</p>}
            {q.clientEmail && <p className="text-[11px] text-slate-500">{q.clientEmail}</p>}
            {q.clientAddress && <p className="text-[11px] text-slate-500">{q.clientAddress}</p>}
            {q.clientGst && <p className="text-[10px] text-slate-400 mt-1">GSTIN: {q.clientGst}</p>}
          </div>
        </div>
        <div className="q-info-card q-project-card relative" style={{ padding: "4px 0 0 28px", borderLeft: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <span style={{ display: "inline-block", width: "3px", height: "14px", borderRadius: "2px", background: "#0f766e" }} />
            <p className="text-[8px] font-bold uppercase tracking-[0.42em]" style={{ color: "#0f766e" }}>Project</p>
          </div>
          <p className="text-[15px] font-bold text-slate-950 leading-snug" style={{ letterSpacing: "-0.015em" }}>{q.projectType || "Custom Project"}</p>
          <div className="mt-3 space-y-1.5">
            <p className="text-[11px] text-slate-500">Timeline:&nbsp;<span className="font-semibold text-slate-800">{q.timeline}</span></p>
            <p className="text-[11px] text-slate-500">Payment:&nbsp;<span className="font-semibold text-slate-800">{q.paymentTerms}</span></p>
          </div>
        </div>
      </div>

      {/* ── LINE ITEMS ── */}
      <div className="q-items-wrap mt-8 overflow-hidden" style={{ border: "1px solid #e2e8f0", borderRadius: "6px" }}>
        <table className="q-items-table w-full border-collapse" style={{ fontSize: "12px" }}>
          <thead>
            <tr style={{ background: "#0f172a", borderBottom: "1px solid #0f172a" }}>
              <th className="py-3.5 pl-4 text-left text-[8px] font-bold uppercase tracking-[0.3em] text-white w-8">#</th>
              <th className="py-3.5 text-left text-[8px] font-bold uppercase tracking-[0.3em] text-white">Service / Feature</th>
              <th className="py-3.5 text-center text-[8px] font-bold uppercase tracking-[0.3em] text-white w-12">Qty</th>
              <th className="py-3.5 text-right text-[8px] font-bold uppercase tracking-[0.3em] text-white w-28">Unit Price</th>
              <th className="py-3.5 pr-4 text-right text-[8px] font-bold uppercase tracking-[0.3em] text-white w-28">Total</th>
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

      {/* ── TOTALS — full width below table ── */}
      <div className="q-totals-wrap q-avoid-break mt-7">
        <div className="q-totals-card w-full" style={{ padding: "16px 20px 14px", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#ffffff", boxShadow: "0 8px 20px rgba(15, 23, 42, 0.05)" }}>
          {(hasDiscount || hasTax) && (
            <div className="flex justify-end pb-3" style={{ borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ width: "300px" }} className="space-y-1.5">
                <TRow label="Subtotal" value={fmt(q.subtotal)} />
                {hasDiscount && (
                  <TRow
                    label={q.discountType === "percent" ? ("Discount (" + q.discountValue + "%)") : "Discount"}
                    value={"−" + fmt(q.discountAmount)} red
                  />
                )}
                {hasTax && <TRow label={"GST (" + q.taxRate + "%)"} value={fmt(q.taxAmount)} />}
              </div>
            </div>
          )}
          <div className={(hasDiscount || hasTax) ? "pt-3" : "pt-0"} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingLeft: "8px", paddingRight: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a", letterSpacing: "0.06em", textTransform: "uppercase" }}>Grand Total</span>
            <span style={{ fontSize: "22px", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.02em" }}>{fmt(q.grandTotal)}</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-0 overflow-hidden" style={{ borderRadius: "6px", border: "1px solid #e2e8f0" }}>
            <div className="px-4 py-3.5 text-center" style={{ background: "#f0fdf4", borderRight: "1px solid #86efac" }}>
              <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-green-700">Advance ({q.advancePercent}%)</p>
              <p className="text-[14px] font-bold mt-1 text-green-900" style={{ letterSpacing: "-0.01em" }}>{fmt(q.advanceAmount)}</p>
            </div>
            <div className="px-4 py-3.5 text-center" style={{ background: "#fefce8" }}>
              <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-amber-700">Balance Due</p>
              <p className="text-[14px] font-bold mt-1 text-amber-900" style={{ letterSpacing: "-0.01em" }}>{fmt(q.remainingAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── PAYMENT DETAILS ── */}
      <div className="q-payment-section q-avoid-break mt-6 overflow-hidden" style={{ border: "1px solid #cbd5e1", borderRadius: "6px" }}>
        <div className="px-6 py-3.5" style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
          <p className="text-[9px] font-bold uppercase tracking-[0.38em]" style={{ color: "#0f172a" }}>Payment Details</p>
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

        <div className="print-only" style={{ padding: "18px 22px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "22px", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <span style={{ display: "inline-block", width: "3px", height: "12px", borderRadius: "2px", background: "#0f766e" }} />
                <p className="text-[8px] font-bold uppercase tracking-[0.28em]" style={{ color: "#0f766e" }}>Payment Instruction</p>
              </div>
              <p className="text-[12px] text-slate-600 leading-relaxed">
                Please mention quotation number <span className="font-bold text-slate-900">{q.quotationNumber || "DRAFT"}</span> in the payment reference.
              </p>
            </div>
            <div style={{ padding: "14px 18px", borderRadius: "6px", border: "1px solid #a7f3d0", background: "#f0fdf4" }}>
              <p className="text-[8px] font-bold uppercase tracking-[0.24em] text-green-700">Advance Payable</p>
              <p className="mt-1 text-[18px] font-bold text-green-950" style={{ letterSpacing: "-0.015em" }}>{fmt(q.advanceAmount)}</p>
              <p className="mt-1 text-[10px] font-semibold text-green-700">UPI: {PAYMENT.upiId}</p>
            </div>
          </div>
        </div>

        {/* Pay buttons — light style, screen only */}
        {q.grandTotal > 0 && (
          <div className="screen-only grid grid-cols-2 gap-4 px-6 py-5" style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
            <a href={upiDeepLink(q.advanceAmount)}
              className="flex flex-col items-center justify-center gap-1.5 py-4.5 transition active:scale-[0.98]"
              style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "6px" }}>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-green-700">Pay {q.advancePercent}% Advance</p>
              <p className="text-[18px] font-bold text-green-900" style={{ letterSpacing: "-0.015em" }}>{fmt(q.advanceAmount)}</p>
              <p className="text-[9px] text-green-600">Tap to open UPI app</p>
            </a>
            <a href={upiDeepLink(q.grandTotal)}
              className="flex flex-col items-center justify-center gap-1.5 py-4.5 transition active:scale-[0.98]"
              style={{ background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: "6px" }}>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-blue-700">Pay Full Amount</p>
              <p className="text-[18px] font-bold text-blue-900" style={{ letterSpacing: "-0.015em" }}>{fmt(q.grandTotal)}</p>
              <p className="text-[9px] text-blue-500">Tap to open UPI app</p>
            </a>
          </div>
        )}

        {/* WhatsApp confirm */}
        {q.grandTotal > 0 && (
          <div className="screen-only" style={{ borderTop: "1px solid #e2e8f0" }}>
            <a
              href={"https://wa.me/" + waPhone + "?text=" + encodeURIComponent("Hi, I would like to confirm payment for quotation " + (q.quotationNumber ?? "") + ".\nAmount: " + fmt(q.grandTotal))}
              target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 py-3.5 text-[12px] font-semibold transition hover:opacity-80"
              style={{ background: "#f0fdf4", color: "#15803d" }}>
              <RiWhatsappLine className="h-4 w-4" />
              Confirm Payment via WhatsApp
            </a>
          </div>
        )}
      </div>

      {/* ── NOTES + TERMS ── */}
      {(q.notes.filter(Boolean).length > 0 || q.termsAndConditions.filter(Boolean).length > 0) && (
        <div className="q-notes-terms mt-9 grid grid-cols-2 gap-12">
          {q.notes.filter(Boolean).length > 0 && (
            <div style={{ paddingTop: "2px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                  <span style={{ display: "inline-block", width: "3px", height: "12px", borderRadius: "2px", background: "#1d4ed8" }} />
                  <p className="text-[8px] font-bold uppercase tracking-[0.4em]" style={{ color: "#1d4ed8" }}>Notes</p>
                </div>
              <ul className="space-y-2.5">
                {q.notes.filter(Boolean).map((note, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[11px] text-slate-600" style={{ lineHeight: 1.65 }}>
                    <RiCheckLine className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />{note}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {q.termsAndConditions.filter(Boolean).length > 0 && (
            <div className="q-terms-block">
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <RiShieldCheckLine className="h-2.5 w-2.5" style={{ color: "#0f172a" }} />
                <p className="text-[8px] font-bold uppercase tracking-[0.4em]" style={{ color: "#0f172a" }}>Terms &amp; Conditions</p>
              </div>
              <ol className="space-y-2">
                {q.termsAndConditions.filter(Boolean).map((t, i) => (
                  <li key={i} className="text-[10.5px] text-slate-600" style={{ lineHeight: 1.7 }}>
                    <span className="font-semibold text-slate-800 mr-1">{i + 1}.</span>{t}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* ── FOOTER ── */}
      <div className="q-screen-footer mt-14 flex items-end justify-between pt-7 gap-4" style={{ borderTop: "1px solid #e2e8f0" }}>
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

      <div className="q-print-footer print-only">
        <div>
          <p className="text-[11px] text-slate-400">Thank you for your business!</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Website: <strong style={{ color: "#475569" }}>https://expecto.online</strong>
            &nbsp;&nbsp;&bull;&nbsp;&nbsp;
            Contact no.: <strong style={{ color: "#475569" }}>8707224376</strong>
            &nbsp;&nbsp;&bull;&nbsp;&nbsp;
            Email: <strong style={{ color: "#475569" }}>hello@expecto.online</strong>
          </p>
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
function QuotationDocumentPremium({ q, upiDeepLink, waPhone }: {
  q: QuotationData; upiDeepLink: (n: number) => string; waPhone: string;
}) {
  const hasDiscount = q.discountAmount > 0;
  const hasTax = q.taxAmount > 0;
  const paymentDetails = [
    ["Account Name", PAYMENT.accountName],
    ["Bank", PAYMENT.bankName],
    ["Account No.", PAYMENT.accountNumber],
    ["IFSC Code", PAYMENT.ifsc],
    ["UPI ID", PAYMENT.upiId],
    ["Mobile", PAYMENT.mobile],
  ];

  return (
    <article className="quotation-document premium-quotation" style={{ width: "100%", background: "#ffffff", color: "#101827", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <style>{`
        .premium-print-only { display: none; }
        @media print {
          .screen-only { display: none !important; }
          .premium-print-only { display: block !important; }
        }
      `}</style>
      <section className="premium-page premium-page-one" style={{ minHeight: "1122px", padding: "40px 46px 34px", background: "#ffffff" }}>
        <div className="premium-hero" style={{ overflow: "hidden", borderRadius: "10px", background: "linear-gradient(135deg, #06111f 0%, #102a43 58%, #0f766e 100%)", color: "#fff", boxShadow: "0 20px 48px rgba(15, 23, 42, 0.18)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: "26px", padding: "26px 30px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ width: "50px", height: "50px", borderRadius: "10px", overflow: "hidden", background: "#fff", boxShadow: "0 12px 24px rgba(0,0,0,0.24)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/img/logo.png" alt="Expecto Digital" style={{ width: "50px", height: "50px", display: "block", objectFit: "cover" }} />
                </div>
                <div>
                  <p style={{ fontSize: "17px", fontWeight: 850, letterSpacing: "-0.02em" }}>{COMPANY.name}</p>
                  <p style={{ marginTop: "3px", fontSize: "10.5px", color: "#c8d7e3" }}>Digital products, websites and automation</p>
                </div>
              </div>
              <div style={{ marginTop: "28px" }}>
                <p style={{ fontSize: "8px", fontWeight: 850, letterSpacing: "0.44em", textTransform: "uppercase", color: "#7dd3fc" }}>Commercial Proposal</p>
                <h1 style={{ marginTop: "8px", fontSize: "32px", lineHeight: 1, fontWeight: 900, letterSpacing: "-0.045em" }}>Quotation</h1>
                <p style={{ marginTop: "10px", maxWidth: "370px", fontSize: "11.5px", lineHeight: 1.65, color: "#dbe8f2" }}>
                  A focused project estimate with scope, pricing, payment schedule and delivery terms.
                </p>
              </div>
            </div>
            <div style={{ border: "1px solid rgba(255,255,255,0.14)", borderRadius: "10px", padding: "17px 19px", background: "rgba(255,255,255,0.07)" }}>
              <p style={{ fontSize: "8px", fontWeight: 850, letterSpacing: "0.36em", textTransform: "uppercase", color: "#a7f3d0" }}>Quotation No.</p>
              <p style={{ marginTop: "6px", fontSize: "22px", lineHeight: 1.1, fontWeight: 900 }}>{q.quotationNumber || "DRAFT"}</p>
              <div style={{ display: "grid", gap: "8px", marginTop: "18px" }}>
                {[
                  ["Date", fmtDate(q.date)],
                  ["Valid Till", fmtDate(q.validTill)],
                  ["Currency", q.currency],
                  ...(q.salesExecutive ? [["Executive", q.salesExecutive]] : []),
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: "16px", paddingBottom: "7px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                    <span style={{ fontSize: "8.5px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#a9bfd0" }}>{label}</span>
                    <span style={{ fontSize: "11px", fontWeight: 750, textAlign: "right" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="premium-party-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0", marginTop: "18px", paddingBottom: "18px", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ padding: "6px 28px 0 2px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "10px" }}>
              <span style={{ display: "inline-block", width: "3px", height: "14px", borderRadius: "2px", background: "#2563eb" }} />
              <p style={{ fontSize: "8px", fontWeight: 850, letterSpacing: "0.34em", textTransform: "uppercase", color: "#2563eb" }}>Prepared For</p>
            </div>
            <p style={{ fontSize: "16px", fontWeight: 850, color: "#0f172a", letterSpacing: "-0.015em" }}>{q.clientName || "-"}</p>
            {q.clientCompany && q.clientCompany !== q.clientName && <p style={{ marginTop: "3px", fontSize: "11.5px", color: "#475569" }}>{q.clientCompany}</p>}
            <div style={{ display: "grid", gap: "3px", marginTop: "10px", fontSize: "10.5px", lineHeight: 1.45, color: "#64748b" }}>
              {q.clientPhone && <span>{q.clientPhone}</span>}
              {q.clientEmail && <span>{q.clientEmail}</span>}
              {q.clientAddress && <span>{q.clientAddress}</span>}
              {q.clientGst && <span>GSTIN: {q.clientGst}</span>}
            </div>
          </div>
          <div style={{ padding: "6px 2px 0 28px", borderLeft: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "10px" }}>
              <span style={{ display: "inline-block", width: "3px", height: "14px", borderRadius: "2px", background: "#0f766e" }} />
              <p style={{ fontSize: "8px", fontWeight: 850, letterSpacing: "0.34em", textTransform: "uppercase", color: "#0f766e" }}>Project Brief</p>
            </div>
            <p style={{ fontSize: "16px", fontWeight: 850, color: "#0f172a", letterSpacing: "-0.015em" }}>{q.projectType || "Custom Project"}</p>
            <div style={{ display: "grid", gap: "6px", marginTop: "10px", fontSize: "10.5px", color: "#475569" }}>
              <span><strong style={{ color: "#0f172a" }}>Timeline:</strong> {q.timeline}</span>
              <span><strong style={{ color: "#0f172a" }}>Payment:</strong> {q.paymentTerms}</span>
            </div>
          </div>
        </div>

        <div className="premium-scope-card" style={{ marginTop: "16px", overflow: "hidden", border: "1px solid #dbe4ef", borderRadius: "6px", boxShadow: "0 10px 22px rgba(15,23,42,0.045)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            <div>
              <p style={{ fontSize: "8px", fontWeight: 850, letterSpacing: "0.38em", color: "#2563eb", textTransform: "uppercase" }}>Scope & Pricing</p>
              <p style={{ marginTop: "3px", fontSize: "10.5px", color: "#64748b" }}>Services and features included in this proposal</p>
            </div>
            <div style={{ padding: "6px 10px", borderRadius: "999px", background: "#0f172a", color: "#fff", fontSize: "10px", fontWeight: 850 }}>{q.lineItems.length} Items</div>
          </div>
          <table className="premium-scope-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <thead>
              <tr style={{ background: "#0f172a", color: "#fff" }}>
                <th style={{ width: "36px", padding: "10px 0 10px 14px", textAlign: "left", fontSize: "7.5px", letterSpacing: "0.22em", textTransform: "uppercase" }}>#</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: "7.5px", letterSpacing: "0.22em", textTransform: "uppercase" }}>Deliverable</th>
                <th style={{ width: "42px", padding: "10px 8px", textAlign: "center", fontSize: "7.5px", letterSpacing: "0.22em", textTransform: "uppercase" }}>Qty</th>
                <th style={{ width: "86px", padding: "10px 8px", textAlign: "right", fontSize: "7.5px", letterSpacing: "0.22em", textTransform: "uppercase" }}>Unit</th>
                <th style={{ width: "88px", padding: "10px 14px 10px 8px", textAlign: "right", fontSize: "7.5px", letterSpacing: "0.22em", textTransform: "uppercase" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {q.lineItems.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #edf2f7", background: idx % 2 ? "#fbfdff" : "#fff" }}>
                  <td style={{ padding: "7px 0 7px 14px", color: "#94a3b8", fontSize: "9px" }}>{idx + 1}</td>
                  <td style={{ padding: "7px 8px", color: "#0f172a", fontWeight: 750 }}>
                    {item.name}
                    {item.defaultPrice > 0 && item.price !== item.defaultPrice && <span style={{ display: "block", marginTop: "1px", color: "#94a3b8", fontSize: "8.5px", fontWeight: 500 }}>List: {fmt(item.defaultPrice)}</span>}
                  </td>
                  <td style={{ padding: "7px 8px", textAlign: "center", color: "#475569" }}>{item.qty}</td>
                  <td style={{ padding: "7px 8px", textAlign: "right", color: "#64748b" }}>{fmtLineAmount(item.price)}</td>
                  <td style={{ padding: "7px 14px 7px 8px", textAlign: "right", color: "#0f172a", fontWeight: 850 }}>{fmtLineAmount(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="premium-total-band" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px", marginTop: "14px" }}>
          <div style={{ padding: "13px 18px", borderRadius: "6px", background: "#0f172a", color: "#fff", boxShadow: "0 14px 28px rgba(15,23,42,0.14)" }}>
            {(hasDiscount || hasTax) && (
              <div style={{ display: "flex", justifyContent: "flex-end", paddingBottom: "10px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                <div style={{ width: "320px", display: "grid", gap: "5px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", color: "#cbd5e1" }}><span>Subtotal</span><strong>{fmt(q.subtotal)}</strong></div>
                  {hasDiscount && <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", color: "#fca5a5" }}><span>{q.discountType === "percent" ? `Discount (${q.discountValue}%)` : "Discount"}</span><strong>-{fmt(q.discountAmount)}</strong></div>}
                  {hasTax && <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", color: "#cbd5e1" }}><span>GST ({q.taxRate}%)</span><strong>{fmt(q.taxAmount)}</strong></div>}
                </div>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: (hasDiscount || hasTax) ? "10px" : "2px", paddingLeft: "6px", paddingRight: "6px" }}>
              <span style={{ fontSize: "11px", color: "#93c5fd", fontWeight: 850, letterSpacing: "0.2em", textTransform: "uppercase" }}>Grand Total</span>
              <strong style={{ fontSize: "23px", lineHeight: 1, letterSpacing: "-0.02em" }}>{fmt(q.grandTotal)}</strong>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0", borderRadius: "6px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
            <div style={{ padding: "12px 16px", background: "#ecfdf5" }}>
              <p style={{ fontSize: "8px", fontWeight: 850, letterSpacing: "0.16em", textTransform: "uppercase", color: "#047857" }}>Advance ({q.advancePercent}%)</p>
              <p style={{ marginTop: "3px", fontSize: "16px", fontWeight: 900, color: "#064e3b", letterSpacing: "-0.015em" }}>{fmt(q.advanceAmount)}</p>
            </div>
            <div style={{ padding: "12px 16px", background: "#fffbeb", borderLeft: "1px solid #fbbf24" }}>
              <p style={{ fontSize: "8px", fontWeight: 850, letterSpacing: "0.16em", textTransform: "uppercase", color: "#b45309" }}>Balance Due</p>
              <p style={{ marginTop: "3px", fontSize: "16px", fontWeight: 900, color: "#78350f", letterSpacing: "-0.015em" }}>{fmt(q.remainingAmount)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="premium-page premium-page-two" style={{ minHeight: "1122px", padding: "48px", background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 45%)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "22px" }}>
          <div>
            <p style={{ fontSize: "8px", fontWeight: 850, letterSpacing: "0.42em", textTransform: "uppercase", color: "#2563eb" }}>Payment & Terms</p>
            <h2 style={{ marginTop: "6px", fontSize: "23px", fontWeight: 900, letterSpacing: "-0.035em", color: "#0f172a" }}>Next steps to begin</h2>
          </div>
          <p style={{ fontSize: "11px", fontWeight: 800, color: "#64748b" }}>{q.quotationNumber || "DRAFT"}</p>
        </div>
        <div className="premium-payment-card" style={{ overflow: "hidden", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff", boxShadow: "0 14px 32px rgba(15,23,42,0.06)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 250px", gap: "22px", padding: "20px 22px", background: "#0f172a", color: "#fff" }}>
            <div>
              <p style={{ fontSize: "8px", fontWeight: 850, letterSpacing: "0.38em", textTransform: "uppercase", color: "#7dd3fc" }}>Payment Details</p>
              <p style={{ marginTop: "8px", maxWidth: "360px", fontSize: "11.5px", lineHeight: 1.65, color: "#cbd5e1" }}>Please mention quotation number <strong style={{ color: "#fff" }}>{q.quotationNumber || "DRAFT"}</strong> in the payment reference.</p>
            </div>
            <div style={{ padding: "14px 16px", borderRadius: "6px", background: "#ecfdf5", color: "#064e3b" }}>
              <p style={{ fontSize: "8px", fontWeight: 850, letterSpacing: "0.22em", textTransform: "uppercase", color: "#047857" }}>Advance Payable</p>
              <p style={{ marginTop: "3px", fontSize: "22px", fontWeight: 900, letterSpacing: "-0.015em" }}>{fmt(q.advanceAmount)}</p>
              <p style={{ marginTop: "3px", fontSize: "9.5px", fontWeight: 750 }}>UPI: {PAYMENT.upiId}</p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
            {paymentDetails.map(([label, value], i) => (
              <div key={label} style={{ padding: "18px 22px", borderRight: i % 3 !== 2 ? "1px solid #e2e8f0" : undefined, borderBottom: i < 3 ? "1px solid #e2e8f0" : undefined }}>
                <p style={{ fontSize: "7.5px", fontWeight: 850, letterSpacing: "0.24em", textTransform: "uppercase", color: "#94a3b8" }}>{label}</p>
                <p style={{ marginTop: "7px", fontSize: label.includes("No.") || label.includes("IFSC") || label.includes("UPI") ? "10.5px" : "11.5px", fontFamily: label.includes("No.") || label.includes("IFSC") || label.includes("UPI") ? "ui-monospace, SFMono-Regular, Consolas, monospace" : "inherit", fontWeight: 800, color: "#0f172a" }}>{value}</p>
              </div>
            ))}
          </div>
          {q.grandTotal > 0 && (
            <div className="screen-only" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", padding: "16px 22px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
              <a href={upiDeepLink(q.advanceAmount)} style={{ display: "block", borderRadius: "6px", padding: "14px", background: "#ecfdf5", border: "1px solid #86efac", textAlign: "center", textDecoration: "none" }}>
                <p style={{ fontSize: "8.5px", fontWeight: 850, letterSpacing: "0.18em", textTransform: "uppercase", color: "#047857" }}>Pay Advance</p>
                <p style={{ marginTop: "3px", fontSize: "17px", fontWeight: 900, color: "#064e3b", letterSpacing: "-0.015em" }}>{fmt(q.advanceAmount)}</p>
              </a>
              <a href={"https://wa.me/" + waPhone + "?text=" + encodeURIComponent("Hi, I would like to confirm payment for quotation " + (q.quotationNumber ?? "") + ".\nAmount: " + fmt(q.grandTotal))} target="_blank" rel="noreferrer" style={{ display: "block", borderRadius: "6px", padding: "14px", background: "#eff6ff", border: "1px solid #93c5fd", textAlign: "center", textDecoration: "none" }}>
                <p style={{ fontSize: "8.5px", fontWeight: 850, letterSpacing: "0.18em", textTransform: "uppercase", color: "#2563eb" }}>Confirm on WhatsApp</p>
                <p style={{ marginTop: "3px", fontSize: "17px", fontWeight: 900, color: "#1e3a8a", letterSpacing: "-0.015em" }}>{fmt(q.grandTotal)}</p>
              </a>
            </div>
          )}
        </div>
        {(q.notes.filter(Boolean).length > 0 || q.termsAndConditions.filter(Boolean).length > 0) && (
          <div className="premium-notes-terms" style={{ display: "grid", gridTemplateColumns: "0.78fr 1.22fr", gap: "22px", marginTop: "24px" }}>
            {q.notes.filter(Boolean).length > 0 && (
              <div style={{ padding: "0 2px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <span style={{ display: "inline-block", width: "3px", height: "12px", borderRadius: "2px", background: "#0f766e" }} />
                  <p style={{ fontSize: "8px", fontWeight: 850, letterSpacing: "0.34em", textTransform: "uppercase", color: "#0f766e" }}>Notes</p>
                </div>
                <div style={{ display: "grid", gap: "8px" }}>
                  {q.notes.filter(Boolean).map((note, i) => (
                    <div key={i} style={{ display: "flex", gap: "8px", fontSize: "10.5px", lineHeight: 1.55, color: "#475569" }}>
                      <RiCheckLine style={{ marginTop: "2px", minWidth: "12px", color: "#059669" }} /> <span>{note}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {q.termsAndConditions.filter(Boolean).length > 0 && (
              <div style={{ padding: "0 2px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <RiShieldCheckLine style={{ color: "#0f172a" }} />
                  <p style={{ fontSize: "8px", fontWeight: 850, letterSpacing: "0.34em", textTransform: "uppercase", color: "#0f172a" }}>Terms & Conditions</p>
                </div>
                <ol style={{ display: "grid", gap: "7px", listStyle: "none" }}>
                  {q.termsAndConditions.filter(Boolean).map((t, i) => (
                    <li key={i} style={{ display: "grid", gridTemplateColumns: "20px 1fr", gap: "6px", fontSize: "10.2px", lineHeight: 1.55, color: "#475569" }}>
                      <span style={{ fontWeight: 850, color: "#0f172a" }}>{i + 1}.</span><span>{t}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
        <div className="premium-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: "18px", marginTop: "30px", paddingTop: "18px", borderTop: "1px solid #e2e8f0" }}>
          <div>
            <p style={{ fontSize: "10.5px", color: "#94a3b8" }}>Thank you for your business.</p>
            <p style={{ marginTop: "4px", fontSize: "9.5px", color: "#64748b" }}>Website: <strong>https://expecto.online</strong>&nbsp;&nbsp; | &nbsp;&nbsp;Contact no.: <strong>8707224376</strong>&nbsp;&nbsp; | &nbsp;&nbsp;Email: <strong>hello@expecto.online</strong></p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ width: "142px", borderTop: "1px dashed #cbd5e1", marginBottom: "8px" }} />
            <p style={{ fontSize: "10.5px", fontWeight: 800, color: "#475569" }}>Authorised Signature</p>
            <p style={{ marginTop: "3px", fontSize: "9.5px", color: "#94a3b8" }}>{COMPANY.name}</p>
          </div>
        </div>
      </section>
    </article>
  );
}

function printQuotation(contentHtml: string) {
  const printWindow = window.open("", "_blank", "width=900,height=1200");
  if (!printWindow) {
    return;
  }
  const doc = printWindow.document;
  const stylesheets = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'))
    .map((link) => `<link rel="stylesheet" href="${link.href}">`)
    .join("");
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Quotation</title>
${stylesheets}
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: white; color: #1e293b; }
  html, body { width: 100%; min-height: 100%; }
  @page { margin: 8mm 10mm; size: A4; }
  @media print {
    body { margin: 0 !important; }
    .no-print { display: none !important; }
    .q-avoid-break { break-inside: avoid; page-break-inside: avoid; }
    .quotation-document {
      padding: 40px 52px 38px !important;
      color: #142033 !important;
    }
    .q-accent-line {
      height: 5px !important;
      margin-bottom: 28px !important;
    }
    .q-header {
      padding-bottom: 26px !important;
      border-bottom-color: #bfdbfe !important;
    }
    .q-info-grid {
      gap: 0 !important;
      margin-top: 26px !important;
      padding-bottom: 26px !important;
      border-bottom-color: #e2e8f0 !important;
    }
    .q-info-card {
      min-height: unset !important;
      padding: 4px 26px 0 0 !important;
      border-radius: 0 !important;
      border: none !important;
      background: transparent !important;
      box-shadow: none !important;
    }
    .q-info-card.q-project-card {
      padding: 4px 0 0 26px !important;
      border-left: 1px solid #e2e8f0 !important;
      background: transparent !important;
    }
    .q-items-wrap {
      margin-top: 24px !important;
      padding: 0 !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 6px !important;
      overflow: hidden !important;
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04) !important;
    }
    .q-items-table thead tr {
      background: #0f172a !important;
    }
    .q-items-table th {
      padding-top: 10px !important;
      padding-bottom: 10px !important;
      border-radius: 0 !important;
    }
    .q-items-table td {
      padding-top: 8px !important;
      padding-bottom: 8px !important;
      border-color: #edf2f7 !important;
      line-height: 1.35 !important;
    }
    .q-items-table tbody tr:nth-child(even) {
      background: #fbfdff !important;
    }
    .q-totals-wrap {
      margin-top: 16px !important;
    }
    .q-totals-card {
      width: 100% !important;
      padding: 14px 18px 14px !important;
      border-radius: 6px !important;
      border-color: #cbd5e1 !important;
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05) !important;
    }
    .q-totals-card .py-2 {
      padding-top: 4px !important;
      padding-bottom: 4px !important;
    }
    .q-totals-card .py-1\\.5 {
      padding-top: 3px !important;
      padding-bottom: 3px !important;
    }
    .q-totals-card .mt-4 {
      margin-top: 10px !important;
    }
    .q-totals-card .pt-3 {
      padding-top: 8px !important;
    }
    .q-totals-card .pb-3 {
      padding-bottom: 8px !important;
    }
    .q-payment-section {
      break-before: page !important;
      page-break-before: always !important;
      width: 92% !important;
      margin: 20px auto 0 !important;
      border-radius: 6px !important;
      border-color: #cbd5e1 !important;
      box-shadow: 0 10px 26px rgba(15, 23, 42, 0.05) !important;
    }
    .q-payment-section > div:first-child {
      padding: 18px 24px !important;
    }
    .q-payment-section .grid.grid-cols-3 > div {
      padding: 20px 24px !important;
    }
    .q-payment-section .print-only {
      padding: 30px 30px !important;
    }
    .q-notes-terms {
      display: block !important;
      margin-top: 44px !important;
    }
    .q-terms-block {
      margin-top: 34px !important;
      text-align: left !important;
      max-width: 540px !important;
    }
    .q-terms-block ol,
    .q-terms-block li,
    .q-terms-block p,
    .q-terms-block div {
      text-align: left !important;
    }
    .q-screen-footer {
      display: none !important;
    }
    .q-print-footer {
      display: flex !important;
      align-items: flex-end !important;
      justify-content: space-between !important;
      gap: 16px !important;
      margin-top: 54px !important;
      padding-top: 22px !important;
      border-top: 1px solid #e2e8f0 !important;
    }
  }
  .q-avoid-break { break-inside: avoid; page-break-inside: avoid; }
  img[alt="Expecto Digital"] { position: static !important; width: 50px !important; height: 50px !important; object-fit: cover !important; inset: auto !important; }
</style>
</head><body>${contentHtml}</body></html>`);
  doc.close();
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 450);
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
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          .quotation-print-root, .quotation-print-root * { visibility: visible !important; }
          .quotation-print-root { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; }
          .no-print { display: none !important; }
        }
      `}</style>
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
        <div ref={docRef} className="quotation-print-root">
          <QuotationDocument q={q} upiDeepLink={upiDeepLink} waPhone={waPhone} />
        </div>
      </div>
    </div>
  );
}
