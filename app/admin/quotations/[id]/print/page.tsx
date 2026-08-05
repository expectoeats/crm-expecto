"use client";

import { use, useEffect } from "react";
import useSWR from "swr";
import { Suspense } from "react";
import { apiFetch } from "@/lib/http";
import { COMPANY, PAYMENT } from "@/lib/quotation-defaults";
import { LOGO_BASE64 } from "@/lib/logo-base64";
import type { QuotationData } from "@/lib/quotation-types";

const fetcher = async (path: string) =>
  (await apiFetch<{ quotation: QuotationData }>(path)).data?.quotation ?? null;

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(n);
}
function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function PrintPage({ id }: { id: string }) {
  const { data: q, isLoading } = useSWR(
    id ? `/quotations/${id}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (q) {
      // Auto-print once data loads
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [q]);

  if (isLoading || !q) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui" }}>
        <p style={{ color: "#64748b" }}>Loading quotation…</p>
      </div>
    );
  }

  const normalized: QuotationData = {
    ...q,
    date: q.date ? new Date(q.date as unknown as string).toISOString().slice(0, 10) : "",
    validTill: q.validTill ? new Date(q.validTill as unknown as string).toISOString().slice(0, 10) : "",
  };

  const hasDiscount = normalized.discountAmount > 0;
  const hasTax = normalized.taxAmount > 0;

  const payItems = [
    { label: "Account Name", value: PAYMENT.accountName, mono: false },
    { label: "Bank",          value: PAYMENT.bankName,    mono: false },
    { label: "Account No.",   value: PAYMENT.accountNumber, mono: true },
    { label: "IFSC Code",     value: PAYMENT.ifsc,        mono: true  },
    { label: "UPI ID",        value: PAYMENT.upiId,       mono: true  },
    { label: "Mobile",        value: PAYMENT.mobile,      mono: false },
  ];

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', system-ui, sans-serif; background: #fff; color: #1e293b; }
        @page { margin: 14mm 16mm; size: A4; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        table { border-collapse: collapse; width: 100%; }
        .page { padding: 28px 32px; }
        .hdr { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 1.5px solid #e2e8f0; }
        .logo-box { width: 44px; height: 44px; min-width: 44px; border-radius: 10px; overflow: hidden; background: #0f172a; }
        .logo-box img { width: 44px; height: 44px; object-fit: cover; display: block; }
        .co-name { font-size: 15px; font-weight: 600; color: #1e293b; letter-spacing: -0.01em; }
        .co-sub { font-size: 11px; color: #94a3b8; margin-top: 4px; }
        .q-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4em; color: #94a3b8; text-align: right; }
        .q-num { font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.025em; text-align: right; margin-top: 2px; }
        .meta-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
        .meta-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.18em; color: #94a3b8; }
        .meta-value { font-size: 11px; font-weight: 500; color: #334155; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; padding: 24px 0; border-bottom: 1px solid #f1f5f9; }
        .sec-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.35em; color: #94a3b8; margin-bottom: 10px; }
        .client-name { font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 4px; }
        .client-sub { font-size: 12px; color: #475569; margin-top: 4px; }
        .client-muted { font-size: 11px; color: #64748b; margin-top: 4px; line-height: 1.5; }
        .items-table { margin-top: 24px; }
        th { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.25em; color: #64748b; padding-bottom: 10px; }
        td { font-size: 12px; color: #334155; padding: 10px 0; border-bottom: 1px solid #f1f5f9; vertical-align: top; line-height: 1.55; }
        .td-name { font-weight: 500; color: #1e293b; }
        .td-list { font-size: 10px; color: #94a3b8; display: block; margin-top: 3px; }
        .td-bold { font-weight: 600; color: #1e293b; }
        .totals-wrap { width: 230px; margin-left: auto; margin-top: 20px; }
        .tot-row { display: flex; justify-content: space-between; padding: 5px 0; }
        .tot-lbl { font-size: 11px; color: #64748b; }
        .tot-val { font-size: 11px; font-weight: 600; color: #334155; }
        .tot-red { color: #ef4444; }
        .gt-row { display: flex; justify-content: space-between; padding: 12px 0 8px; border-top: 1.5px solid #1e293b; margin-top: 8px; }
        .gt-lbl { font-size: 13px; font-weight: 700; color: #0f172a; }
        .gt-val { font-size: 15px; font-weight: 700; color: #0f172a; }
        .amt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
        .adv-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; text-align: center; }
        .bal-box { background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 14px; text-align: center; }
        .amt-box-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; }
        .amt-box-val { font-size: 13px; font-weight: 700; margin-top: 5px; }
        .pay-wrap { border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-top: 32px; }
        .pay-hdr { background: #f8fafc; padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.32em; color: #64748b; }
        .pay-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; }
        .pay-cell { padding: 14px 18px; }
        .pay-lbl { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.22em; color: #94a3b8; margin-bottom: 6px; }
        .pay-val { font-size: 12px; font-weight: 600; color: #1e293b; line-height: 1.4; }
        .pay-mono { font-size: 11px; font-weight: 600; color: #1e293b; font-family: monospace; line-height: 1.4; }
        .nt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 32px; }
        .note-item { display: flex; align-items: flex-start; gap: 6px; font-size: 11px; color: #475569; margin-bottom: 8px; line-height: 1.5; }
        .note-check { color: #10b981; flex-shrink: 0; }
        .term-item { font-size: 10.5px; color: #64748b; margin-bottom: 7px; line-height: 1.6; }
        .term-num { font-weight: 600; color: #475569; margin-right: 4px; }
        .footer { display: flex; justify-content: space-between; align-items: flex-end; padding-top: 24px; margin-top: 36px; border-top: 1px solid #e2e8f0; }
        .ft-txt { font-size: 10px; color: #94a3b8; line-height: 1.6; }
        .sig-line { border-bottom: 1px dashed #cbd5e1; width: 140px; margin-bottom: 28px; }
        .sig-lbl { font-size: 11px; font-weight: 500; color: #475569; }
      `}</style>

      <div className="page">

        {/* HEADER */}
        <div className="hdr">
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div className="logo-box">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO_BASE64} alt="logo" />
            </div>
            <div>
              <p className="co-name">{COMPANY.name}</p>
              <p className="co-sub">{COMPANY.email} &bull; {COMPANY.phone}</p>
            </div>
          </div>
          <div>
            <p className="q-label">Quotation</p>
            <p className="q-num">{normalized.quotationNumber || "DRAFT"}</p>
            <div style={{ marginTop: "12px", minWidth: "172px" }}>
              <div className="meta-row"><span className="meta-label">Date</span><span className="meta-value">{fmtDate(normalized.date)}</span></div>
              <div className="meta-row"><span className="meta-label">Valid Till</span><span className="meta-value">{fmtDate(normalized.validTill)}</span></div>
              {normalized.salesExecutive && <div className="meta-row"><span className="meta-label">Executive</span><span className="meta-value">{normalized.salesExecutive}</span></div>}
              <div className="meta-row"><span className="meta-label">Currency</span><span className="meta-value">{normalized.currency}</span></div>
            </div>
          </div>
        </div>

        {/* BILL TO + PROJECT */}
        <div className="info-grid">
          <div>
            <p className="sec-label">Bill To</p>
            <p className="client-name">{normalized.clientName || "—"}</p>
            {normalized.clientCompany && normalized.clientCompany !== normalized.clientName && <p className="client-sub">{normalized.clientCompany}</p>}
            {normalized.clientPhone   && <p className="client-muted">{normalized.clientPhone}</p>}
            {normalized.clientEmail   && <p className="client-muted">{normalized.clientEmail}</p>}
            {normalized.clientAddress && <p className="client-muted">{normalized.clientAddress}</p>}
            {normalized.clientGst     && <p style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px" }}>GSTIN: {normalized.clientGst}</p>}
          </div>
          <div>
            <p className="sec-label">Project</p>
            <p className="client-name">{normalized.projectType || "Custom Project"}</p>
            <p className="client-muted">Timeline: <strong style={{ color: "#475569" }}>{normalized.timeline}</strong></p>
            <p className="client-muted">Payment: <strong style={{ color: "#475569" }}>{normalized.paymentTerms}</strong></p>
          </div>
        </div>

        {/* LINE ITEMS */}
        <div className="items-table">
          <table>
            <thead>
              <tr style={{ borderBottom: "1.5px solid #334155" }}>
                <th style={{ textAlign: "left", width: "28px" }}>#</th>
                <th style={{ textAlign: "left" }}>Service / Feature</th>
                <th style={{ textAlign: "center", width: "40px" }}>Qty</th>
                <th style={{ textAlign: "right", width: "100px" }}>Unit Price</th>
                <th style={{ textAlign: "right", width: "100px" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {normalized.lineItems.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ fontSize: "10px", color: "#94a3b8" }}>{idx + 1}</td>
                  <td>
                    <span className="td-name">{item.name}</span>
                    {item.defaultPrice > 0 && item.price !== item.defaultPrice && (
                      <span className="td-list">List: {fmt(item.defaultPrice)}</span>
                    )}
                  </td>
                  <td style={{ textAlign: "center" }}>{item.qty}</td>
                  <td style={{ textAlign: "right" }}>{fmt(item.price)}</td>
                  <td style={{ textAlign: "right" }} className="td-bold">{fmt(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TOTALS */}
        <div className="totals-wrap">
          {(hasDiscount || hasTax) && (
            <div style={{ paddingBottom: "8px", borderBottom: "1px solid #e2e8f0" }}>
              <div className="tot-row"><span className="tot-lbl">Subtotal</span><span className="tot-val">{fmt(normalized.subtotal)}</span></div>
              {hasDiscount && (
                <div className="tot-row">
                  <span className="tot-lbl">{normalized.discountType === "percent" ? `Discount (${normalized.discountValue}%)` : "Discount"}</span>
                  <span className="tot-val tot-red">−{fmt(normalized.discountAmount)}</span>
                </div>
              )}
              {hasTax && <div className="tot-row"><span className="tot-lbl">GST ({normalized.taxRate}%)</span><span className="tot-val">{fmt(normalized.taxAmount)}</span></div>}
            </div>
          )}
          <div className="gt-row">
            <span className="gt-lbl">Grand Total</span>
            <span className="gt-val">{fmt(normalized.grandTotal)}</span>
          </div>
          <div className="amt-grid">
            <div className="adv-box">
              <p className="amt-box-label" style={{ color: "#166534" }}>Advance ({normalized.advancePercent}%)</p>
              <p className="amt-box-val" style={{ color: "#14532d" }}>{fmt(normalized.advanceAmount)}</p>
            </div>
            <div className="bal-box">
              <p className="amt-box-label" style={{ color: "#92400e" }}>Balance Due</p>
              <p className="amt-box-val" style={{ color: "#78350f" }}>{fmt(normalized.remainingAmount)}</p>
            </div>
          </div>
        </div>

        {/* PAYMENT DETAILS */}
        <div className="pay-wrap">
          <div className="pay-hdr">Payment Details</div>
          <div className="pay-grid">
            {payItems.map((item, i) => (
              <div key={i} className="pay-cell" style={{
                borderBottom: i < 3 ? "1px solid #f1f5f9" : undefined,
                borderRight: i % 3 !== 2 ? "1px solid #f1f5f9" : undefined,
              }}>
                <p className="pay-lbl">{item.label}</p>
                <p className={item.mono ? "pay-mono" : "pay-val"}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* NOTES + TERMS */}
        {(normalized.notes.filter(Boolean).length > 0 || normalized.termsAndConditions.filter(Boolean).length > 0) && (
          <div className="nt-grid">
            {normalized.notes.filter(Boolean).length > 0 && (
              <div>
                <p className="sec-label">Notes</p>
                {normalized.notes.filter(Boolean).map((note, i) => (
                  <div key={i} className="note-item">
                    <span className="note-check">✓</span>{note}
                  </div>
                ))}
              </div>
            )}
            {normalized.termsAndConditions.filter(Boolean).length > 0 && (
              <div>
                <p className="sec-label">Terms &amp; Conditions</p>
                {normalized.termsAndConditions.filter(Boolean).map((t, i) => (
                  <p key={i} className="term-item"><span className="term-num">{i + 1}.</span>{t}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FOOTER */}
        <div className="footer">
          <div>
            <p className="ft-txt">Thank you for your business!</p>
            <p className="ft-txt" style={{ marginTop: "3px" }}>{COMPANY.name} &bull; {COMPANY.email} &bull; {COMPANY.phone}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="sig-line" />
            <p className="sig-lbl">Authorised Signature</p>
            <p className="ft-txt">{COMPANY.name}</p>
          </div>
        </div>

      </div>
    </>
  );
}

export default function QuotationPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<div style={{ padding: "40px", fontFamily: "system-ui", color: "#64748b" }}>Loading…</div>}>
      <PrintPage id={id} />
    </Suspense>
  );
}
