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
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function PrintPage({ id }: { id: string }) {
  const { data: q, isLoading } = useSWR(id ? `/quotations/${id}` : null, fetcher, { revalidateOnFocus: false });

  useEffect(() => {
    if (q) {
      const safeName = (q.clientName || "Client").replace(/[^a-zA-Z0-9 _-]/g, "").trim().replace(/\s+/g, "_");
      const num = q.quotationNumber || "DRAFT";
      document.title = `${safeName}_Quotation_${num}`;
      const t = setTimeout(() => window.print(), 700);
      return () => clearTimeout(t);
    }
  }, [q]);

  if (isLoading || !q) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"system-ui" }}>
        <p style={{ color:"#6b7280" }}>Loading quotation…</p>
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

  const SBI_LOGO = "https://www.freepnglogos.com/uploads/sbi-logo-png/sbi-logo-sbi-symbol-meaning-history-and-evolution-11.png";
  const UPI_LOGO = "https://i.pinimg.com/originals/56/61/37/5661371d261b5689f7515091a4578727.jpg?nii=t";

  const payItems = [
    { label: "Account Name",  value: PAYMENT.accountName,   mono: false },
    { label: "Bank",          value: PAYMENT.bankName,       mono: false, logo: SBI_LOGO },
    { label: "Account No.",   value: PAYMENT.accountNumber,  mono: true  },
    { label: "IFSC Code",     value: PAYMENT.ifsc,           mono: true  },
    { label: "UPI ID",        value: PAYMENT.upiId,          mono: true,  logo: UPI_LOGO },
    { label: "Mobile",        value: PAYMENT.mobile,         mono: false },
  ];

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Plus Jakarta Sans', 'Inter', 'Segoe UI', system-ui, sans-serif; background: #fff; color: #111827; font-size: 12px; }
    @page { size: A4 portrait; margin: 0; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    table { border-collapse: collapse; width: 100%; }

    /* ── HEADER BAND ── */
    .hdr-band { background: #0f172a; padding: 18px 28px; display: flex; justify-content: space-between; align-items: center; }
    .hdr-left { display: flex; align-items: center; gap: 14px; }
    .hdr-logo { width: 40px; height: 40px; min-width: 40px; border-radius: 6px; overflow: hidden; background: #1e293b; }
    .hdr-logo img { width: 40px; height: 40px; object-fit: cover; display: block; }
    .hdr-co-name { font-size: 16px; font-weight: 700; color: #fff; letter-spacing: -0.02em; }
    .hdr-co-sub { font-size: 10px; color: #94a3b8; margin-top: 3px; }
    .hdr-right { text-align: right; }
    .hdr-q-label { font-size: 7px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4em; color: #6366f1; }
    .hdr-q-num { font-size: 24px; font-weight: 900; color: #6366f1; letter-spacing: -0.03em; margin-top: 2px; line-height: 1; }
    .hdr-status { display: inline-block; margin-top: 6px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; padding: 3px 10px; border-radius: 99px; border: 1px solid #334155; color: #94a3b8; }

    /* ── INFO STRIP ── */
    .info-strip { background: #f9fafb; border-bottom: 1px solid #e5e7eb; display: grid; grid-template-columns: repeat(4, 1fr); }
    .info-strip-cell { padding: 10px 20px; border-right: 1px solid #e5e7eb; }
    .info-strip-cell:last-child { border-right: none; }
    .strip-lbl { font-size: 7px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4em; color: #6366f1; margin-bottom: 3px; }
    .strip-val { font-size: 12px; font-weight: 600; color: #111827; }

    /* ── BILL TO / PROJECT ── */
    .client-section { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border-bottom: 1px solid #e5e7eb; }
    .client-col { padding: 16px 28px; }
    .client-col:first-child { border-right: 1px solid #e5e7eb; }
    .sec-label { font-size: 7px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4em; color: #0f172a;
      padding-left: 0; border-left: none; margin-bottom: 8px; display: inline-flex; align-items: center; gap: 8px; }
    .sec-label::before { content: ''; display: inline-block; width: 3px; height: 11px; border-radius: 2px; background: #1d4ed8; }
    .client-col:last-child .sec-label::before { background: #0f766e; }
    .client-col:last-child .sec-label { color: #0f766e; }
    .cl-name { font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 3px; letter-spacing: -0.015em; }
    .cl-company { font-size: 12px; color: #374151; margin-bottom: 2px; }
    .cl-muted { font-size: 11px; color: #6b7280; line-height: 1.5; }

    /* ── TABLE ── */
    .tbl-wrap { padding: 0; margin: 20px 28px 0; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
    .tbl-head-row { background: #0f172a; }
    .tbl-head-row th { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.22em;
      color: #fff; padding: 9px 8px; text-align: left; }
    .tbl-head-row th:not(:first-child) { text-align: right; }
    .tbl-head-row th:nth-child(3) { text-align: center; }
    td { font-size: 12px; color: #374151; padding: 9px 8px; border-bottom: 1px solid #f3f4f6; vertical-align: top; line-height: 1.5; }
    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) td { background: #f9fafb; }
    .td-right { text-align: right; }
    .td-center { text-align: center; }
    .td-item-name { font-weight: 600; color: #111827; }
    .td-list-price { font-size: 10px; color: #9ca3af; display: block; margin-top: 2px; }
    .td-total { font-weight: 700; color: #111827; }
    .td-included { color: #9ca3af; font-style: italic; }

    /* ── TOTALS ── */
    .totals-section { padding: 10px 28px 0; }
    .totals-inner { width: 100%; }
    .tot-rows-wrap { display: flex; flex-direction: column; align-items: flex-end; margin-bottom: 0; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
    .tot-row { display: flex; justify-content: space-between; padding: 3px 0; width: 300px; }
    .tot-lbl { font-size: 11px; color: #6b7280; }
    .tot-val { font-size: 11px; font-weight: 600; color: #374151; }
    .tot-red { color: #ef4444; }
    .gt-row { display: flex; justify-content: space-between; align-items: baseline; padding: 10px 28px; background: #f8fafc; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; margin: 8px 28px 0; border-radius: 6px; }
    .gt-lbl { font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.06em; }
    .gt-val { font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: -0.02em; }
    .badges-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin: 10px 28px 0; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
    .badge-adv { background: #ecfdf5; border-right: 1px solid #86efac; padding: 10px 16px; text-align: center; }
    .badge-bal { background: #fffbeb; padding: 10px 16px; text-align: center; }
    .badge-lbl { font-size: 7px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.25em; color: #6b7280; }
    .badge-val { font-size: 14px; font-weight: 800; color: #111827; margin-top: 2px; letter-spacing: -0.015em; }

    /* ── PAGE BREAK CONTROL ──
       No forced page breaks. Content flows naturally and only small
       cohesive blocks are kept intact across page boundaries. */
    thead { display: table-header-group; }      /* repeat header on every page */
    tr.tbl-head-row { break-inside: avoid; break-after: avoid; }  /* keep header attached to data */
    tbody tr { break-inside: avoid; }            /* never clip a single row */
    .tot-rows-wrap, .gt-row, .badges-row, .pay-table, .pay-section,
    .notes-block, .nt-section, .sig-area, .footer-band { break-inside: avoid; }
    .pay-cell, .note-item, .term-item { break-inside: avoid; }

    /* ── PAYMENT SECTION ── */
    .pay-section { padding: 20px 28px; border-bottom: 1px solid #e5e7eb; }
    .pay-section-hdr { font-size: 7px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4em;
      color: #0f172a; padding-bottom: 10px; border-bottom: 2px solid #0f172a; margin-bottom: 14px; display: inline-flex; align-items: center; gap: 8px; }
    .pay-section-hdr::before { content: ''; display: inline-block; width: 3px; height: 11px; border-radius: 2px; background: #1d4ed8; }
    .pay-table { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
    .pay-cell { padding: 10px 14px; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; }
    .pay-cell:nth-child(3), .pay-cell:nth-child(6) { border-right: none; }
    .pay-cell:nth-child(4), .pay-cell:nth-child(5), .pay-cell:nth-child(6) { border-bottom: none; }
    .pay-lbl { font-size: 7px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3em; color: #9ca3af; margin-bottom: 4px; }
    .pay-val { font-size: 12px; font-weight: 700; color: #111827; }
    .pay-mono { font-size: 12px; font-weight: 700; color: #111827; font-family: 'Courier New', monospace; }

    /* ── NOTES + TERMS ── */
    .nt-section { padding: 20px 28px; border-bottom: 1px solid #e5e7eb; }
    .notes-block { margin-bottom: 16px; }
    .note-item { display: flex; align-items: flex-start; gap: 7px; font-size: 11px; color: #374151; margin-bottom: 5px; line-height: 1.5; }
    .note-check { color: #6366f1; font-weight: 900; flex-shrink: 0; font-size: 12px; }
    .terms-list { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(2, 1fr); gap: 5px 14px; }
    .term-item { display: flex; gap: 8px; font-size: 11px; color: #6b7280; line-height: 1.6; text-align: left; }
    .term-num { font-weight: 700; color: #6366f1; flex-shrink: 0; min-width: 16px; }

    /* ── FOOTER BAND ── */
    .footer-band { background: #0f172a; padding: 14px 28px; display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
    .ft-left { font-size: 11px; font-weight: 600; color: #fff; }
    .ft-right { text-align: right; }
    .ft-line { font-size: 10px; color: #94a3b8; line-height: 1.7; }
    .ft-link { color: #818cf8; font-weight: 600; }
    .sig-area { padding: 16px 28px 4px; display: flex; justify-content: flex-end; }
    .sig-box { text-align: center; }
    .sig-line { border-bottom: 1px dashed #d1d5db; width: 130px; margin-bottom: 6px; }
    .sig-lbl { font-size: 10px; font-weight: 600; color: #6b7280; }
    .sig-co { font-size: 10px; color: #9ca3af; margin-top: 2px; }
  `;

  return (
    <>
      <style>{CSS}</style>

      {/* ═══════════════ PAGE 1 ═══════════════ */}

      {/* HEADER BAND */}
      <div className="hdr-band">
        <div className="hdr-left">
          <div className="hdr-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_BASE64} alt="logo" />
          </div>
          <div>
            <p className="hdr-co-name">{COMPANY.name}</p>
            <p className="hdr-co-sub">{COMPANY.email}&nbsp;&nbsp;·&nbsp;&nbsp;{COMPANY.phone}</p>
          </div>
        </div>
        <div className="hdr-right">
          <p className="hdr-q-label">Quotation</p>
          <p className="hdr-q-num">{normalized.quotationNumber || "DRAFT"}</p>
          <span className="hdr-status">{normalized.status.toUpperCase()}</span>
        </div>
      </div>

      {/* INFO STRIP */}
      <div className="info-strip">
        <div className="info-strip-cell">
          <p className="strip-lbl">Date</p>
          <p className="strip-val">{fmtDate(normalized.date)}</p>
        </div>
        <div className="info-strip-cell">
          <p className="strip-lbl">Valid Till</p>
          <p className="strip-val">{fmtDate(normalized.validTill)}</p>
        </div>
        <div className="info-strip-cell">
          <p className="strip-lbl">Executive</p>
          <p className="strip-val">{normalized.salesExecutive || "—"}</p>
        </div>
        <div className="info-strip-cell">
          <p className="strip-lbl">Currency</p>
          <p className="strip-val">{normalized.currency}</p>
        </div>
      </div>

      {/* BILL TO + PROJECT */}
      <div className="client-section">
        <div className="client-col">
          <p className="sec-label">Bill To</p>
          <p className="cl-name">{normalized.clientName || "—"}</p>
          {normalized.clientCompany && normalized.clientCompany !== normalized.clientName &&
            <p className="cl-company">{normalized.clientCompany}</p>}
          {normalized.clientPhone   && <p className="cl-muted">{normalized.clientPhone}</p>}
          {normalized.clientEmail   && <p className="cl-muted">{normalized.clientEmail}</p>}
          {normalized.clientAddress && <p className="cl-muted">{normalized.clientAddress}</p>}
          {normalized.clientGst     && <p className="cl-muted" style={{ marginTop: "4px", fontSize: "10px" }}>GSTIN: {normalized.clientGst}</p>}
        </div>
        <div className="client-col">
          <p className="sec-label">Project</p>
          <p className="cl-name">{normalized.projectType || "Custom Project"}</p>
          <p className="cl-muted" style={{ marginTop: "4px" }}>
            <span style={{ fontWeight: 600, color: "#374151" }}>Timeline:</span> {normalized.timeline}
          </p>
          <p className="cl-muted" style={{ marginTop: "3px" }}>
            <span style={{ fontWeight: 600, color: "#374151" }}>Payment:</span> {normalized.paymentTerms}
          </p>
        </div>
      </div>

      {/* LINE ITEMS TABLE */}
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr className="tbl-head-row">
              <th style={{ width: "26px" }}>#</th>
              <th>Service / Feature</th>
              <th style={{ textAlign: "center", width: "36px" }}>Qty</th>
              <th style={{ textAlign: "right", width: "90px" }}>Unit Price</th>
              <th style={{ textAlign: "right", width: "90px" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {normalized.lineItems.map((item, idx) => {
              const isIncluded = item.price === 0;
              return (
                <tr key={idx}>
                  <td style={{ color: "#9ca3af", fontSize: "10px" }}>{idx + 1}</td>
                  <td>
                    <span className="td-item-name">{item.name}</span>
                    {item.defaultPrice > 0 && item.price !== item.defaultPrice && (
                      <span className="td-list-price">List: {fmt(item.defaultPrice)}</span>
                    )}
                  </td>
                  <td className="td-center">{item.qty}</td>
                  <td className="td-right">
                    {isIncluded ? <span className="td-included">Included</span> : fmt(item.price)}
                  </td>
                  <td className="td-right td-total">
                    {isIncluded ? <span className="td-included">Included</span> : fmt(item.total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* TOTALS */}
      <div className="totals-section">
        <div className="totals-inner">
          {(hasDiscount || hasTax) && (
            <div className="tot-rows-wrap">
              <div className="tot-row">
                <span className="tot-lbl">Subtotal</span>
                <span className="tot-val">{fmt(normalized.subtotal)}</span>
              </div>
              {hasDiscount && (
                <div className="tot-row">
                  <span className="tot-lbl">
                    {normalized.discountType === "percent"
                      ? `Discount (${normalized.discountValue}%)`
                      : "Discount"}
                  </span>
                  <span className="tot-val tot-red">−{fmt(normalized.discountAmount)}</span>
                </div>
              )}
              {hasTax && (
                <div className="tot-row">
                  <span className="tot-lbl">GST ({normalized.taxRate}%)</span>
                  <span className="tot-val">{fmt(normalized.taxAmount)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Grand Total — full width accent bar */}
      <div className="gt-row">
        <span className="gt-lbl">Grand Total</span>
        <span className="gt-val">{fmt(normalized.grandTotal)}</span>
      </div>
      {/* Advance / Balance — full width two-col */}
      <div className="badges-row">
        <div className="badge-adv">
          <p className="badge-lbl">Advance ({normalized.advancePercent}%)</p>
          <p className="badge-val" style={{ color: "#065f46" }}>{fmt(normalized.advanceAmount)}</p>
        </div>
        <div className="badge-bal">
          <p className="badge-lbl">Balance Due</p>
          <p className="badge-val" style={{ color: "#92400e" }}>{fmt(normalized.remainingAmount)}</p>
        </div>
      </div>

      {/* PAYMENT DETAILS — flows naturally onto page 1 or 2 as needed */}
      <div className="pay-section">
        <p className="pay-section-hdr">Payment Details</p>
        <div className="pay-table">
              {payItems.map((item, i) => (
                <div key={i} className="pay-cell">
                  <p className="pay-lbl">{item.label}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {item.logo && <img src={item.logo} alt="" style={{ height: item.label === "Bank" ? "20px" : "16px", width: "auto", objectFit: "contain" }} />}
                    <p className={item.mono ? "pay-mono" : "pay-val"}>{item.value}</p>
                  </div>
                </div>
              ))}
        </div>
      </div>

      {/* NOTES + TERMS */}
      {(normalized.notes.filter(Boolean).length > 0 || normalized.termsAndConditions.filter(Boolean).length > 0) && (
        <div className="nt-section">
          {normalized.notes.filter(Boolean).length > 0 && (
            <div className="notes-block">
              <p className="sec-label" style={{ marginBottom: "10px" }}>Notes</p>
              {normalized.notes.filter(Boolean).map((note, i) => (
                <div key={i} className="note-item">
                  <span className="note-check">✦</span>
                  <span>{note}</span>
                </div>
              ))}
            </div>
          )}
          {normalized.termsAndConditions.filter(Boolean).length > 0 && (
            <div>
              <p className="sec-label" style={{ marginBottom: "10px" }}>Terms &amp; Conditions</p>
              <ol className="terms-list">
                {normalized.termsAndConditions.filter(Boolean).map((t, i) => (
                  <li key={i} className="term-item">
                    <span className="term-num">{i + 1}.</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* SIGNATURE */}
      <div className="sig-area">
        <div className="sig-box">
          <div className="sig-line" />
          <p className="sig-lbl">Authorised Signature</p>
          <p className="sig-co">{COMPANY.name}</p>
        </div>
      </div>

      {/* FOOTER BAND */}
      <div className="footer-band">
        <div className="ft-left">Thank you for your business!</div>
        <div className="ft-right">
          <p className="ft-line">
            <span className="ft-link">https://expecto.online</span>
            &nbsp;&nbsp;·&nbsp;&nbsp;+91 87072 24376
            &nbsp;&nbsp;·&nbsp;&nbsp;hello@expecto.online
          </p>
        </div>
      </div>
    </>
  );
}

export default function QuotationPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<div style={{ padding: "40px", fontFamily: "system-ui", color: "#6b7280" }}>Loading…</div>}>
      <PrintPage id={id} />
    </Suspense>
  );
}
