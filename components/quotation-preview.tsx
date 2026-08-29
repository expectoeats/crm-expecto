"use client";

import React from "react";
import { RiArrowLeftLine, RiPrinterLine, RiDownloadLine, RiWhatsappLine, RiMailLine, RiCheckLine, RiShieldCheckLine } from "react-icons/ri";
import { COMPANY, PAYMENT } from "@/lib/quotation-defaults";
import type { QuotationData } from "@/lib/quotation-types";

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

function QuotationDocumentPremium({ q, upiDeepLink, waPhone }: {
  q: QuotationData; upiDeepLink: (n: number) => string; waPhone: string;
}) {
  const hasDiscount = q.discountAmount > 0;
  const hasTax = q.taxAmount > 0;

  const FONT = "'Plus Jakarta Sans','Inter','Segoe UI',system-ui,sans-serif";
  const INK = "#0F172A";
  const MUTED = "#475569";
  const FAINT = "#64748B";
  const LINE = "#E2E8F0";
  const SOFT = "#F8FAFC";
  const EMERALD = "#0F766E";
  const HERO = "linear-gradient(120deg, #0B1220 0%, #0F172A 44%, #0F766E 122%)";
  const HERO_GLOW = "radial-gradient(130% 130% at 100% 0%, rgba(16,185,129,0.30), rgba(16,185,129,0) 46%)";
  const SBI_LOGO = "https://www.freepnglogos.com/uploads/sbi-logo-png/sbi-logo-sbi-symbol-meaning-history-and-evolution-11.png";
  const UPI_LOGO = "https://i.pinimg.com/originals/56/61/37/5661371d261b5689f7515091a4578727.jpg?nii=t";
  const paymentDetails: [string, string, string?][] = [
    ["Account Name", PAYMENT.accountName],
    ["Bank", PAYMENT.bankName, SBI_LOGO],
    ["Account No.", PAYMENT.accountNumber],
    ["IFSC Code", PAYMENT.ifsc],
    ["UPI ID", PAYMENT.upiId, UPI_LOGO],
    ["Mobile", PAYMENT.mobile],
  ];

  const Pill = ({ children, tone = "emerald" }: { children: React.ReactNode; tone?: "emerald" | "amber" }) => (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: "999px", fontSize: "9.5px", fontWeight: 800,
      letterSpacing: "0.04em",
      background: tone === "emerald" ? "#ECFDF5" : "#FFFBEB",
      color: tone === "emerald" ? "#047857" : "#B45309",
      border: `1px solid ${tone === "emerald" ? "#A7F3D1" : "#FDE68A"}`,
    }}>{children}</span>
  );

  return (
    <article className="quotation-document premium-quotation" style={{ width: "100%", background: "#ffffff", color: INK, fontFamily: FONT, padding: 0 }}>
      <style>{`
        .premium-print-only { display: none; }
        @media print {
          .screen-only { display: none !important; }
          .premium-print-only { display: block !important; }
        }
      `}</style>
      <section className="premium-page premium-page-one">
        <div className="premium-hero" style={{ position: "relative", overflow: "hidden", background: HERO, color: "#fff", padding: "34px 38px 30px" }}>
          <div style={{ position: "absolute", inset: 0, background: HERO_GLOW }} />
          <div style={{ position: "absolute", left: "-60px", bottom: "-90px", width: "220px", height: "220px", borderRadius: "999px", background: "rgba(16,185,129,0.18)", filter: "blur(8px)" }} />
          <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ width: "54px", height: "54px", borderRadius: "14px", overflow: "hidden", background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.22)", boxShadow: "0 12px 30px rgba(0,0,0,0.25)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/img/logo.png" alt="Expecto Digital" style={{ width: "54px", height: "54px", display: "block", objectFit: "cover" }} />
                </div>
                <div>
                  <p style={{ fontSize: "17px", fontWeight: 800, letterSpacing: "-0.01em" }}>{COMPANY.name}</p>
                  <p style={{ marginTop: "3px", fontSize: "10.5px", color: "#b9c6d6" }}>Digital products, websites and automation</p>
                </div>
              </div>
              <div style={{ marginTop: "30px" }}>
                <p style={{ fontSize: "8px", fontWeight: 800, letterSpacing: "0.42em", textTransform: "uppercase", color: "#6ee7b7" }}>Commercial Proposal</p>
                <h1 style={{ marginTop: "10px", fontSize: "34px", lineHeight: 1.05, fontWeight: 800, letterSpacing: "-0.03em", color: "#ffffff" }}>Quotation</h1>
                <p style={{ marginTop: "12px", maxWidth: "380px", fontSize: "11.5px", lineHeight: 1.65, color: "#cbd5e1" }}>
                  A focused project estimate with scope, pricing, payment schedule and delivery terms.
                </p>
              </div>
            </div>
            <div style={{ position: "relative" }}>
              <div style={{ padding: "16px 18px", borderRadius: "16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.16)", boxShadow: "0 0 0 1px rgba(16,185,129,0.20), 0 18px 40px rgba(0,0,0,0.30)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p style={{ fontSize: "8px", fontWeight: 800, letterSpacing: "0.34em", textTransform: "uppercase", color: "#a7f3d0" }}>Quotation No.</p>
                  {q.validTill && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "999px", fontSize: "8.5px", fontWeight: 800, letterSpacing: "0.02em", color: "#ecfdf5", background: "rgba(16,185,129,0.18)", border: "1px solid rgba(110,231,183,0.45)", boxShadow: "0 0 14px rgba(16,185,129,0.35)" }}>
                      Valid till {fmtDate(q.validTill)}
                    </span>
                  )}
                </div>
                <p style={{ marginTop: "8px", fontSize: "24px", lineHeight: 1.1, fontWeight: 900, letterSpacing: "-0.01em", textShadow: "0 0 18px rgba(110,231,183,0.45)" }}>{q.quotationNumber || "DRAFT"}</p>
                <div style={{ display: "grid", gap: "7px", marginTop: "16px" }}>
                  {[
                    ["Date", fmtDate(q.date)],
                    ["Currency", q.currency],
                    ...(q.salesExecutive ? [["Executive", q.salesExecutive]] : []),
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: "16px", paddingBottom: "7px", borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
                      <span style={{ fontSize: "8px", letterSpacing: "0.18em", textTransform: "uppercase", color: "#9fb0c3" }}>{label}</span>
                      <span style={{ fontSize: "11px", fontWeight: 700, textAlign: "right", color: "#eef2f7" }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", marginTop: "22px", padding: "0 38px" }}>
          <div style={{ padding: "0 28px 4px 0", borderRight: `1px solid ${LINE}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "10px" }}>
              <span style={{ display: "inline-block", width: "3px", height: "14px", borderRadius: "2px", background: EMERALD }} />
              <p style={{ fontSize: "8px", fontWeight: 800, letterSpacing: "0.32em", textTransform: "uppercase", color: EMERALD }}>Prepared For</p>
            </div>
            <p style={{ fontSize: "17px", fontWeight: 800, color: INK, letterSpacing: "-0.015em" }}>{q.clientName || "-"}</p>
            {q.clientCompany && q.clientCompany !== q.clientName && <p style={{ marginTop: "3px", fontSize: "11.5px", color: MUTED }}>{q.clientCompany}</p>}
            <div style={{ display: "grid", gap: "3px", marginTop: "10px", fontSize: "10.5px", lineHeight: 1.45, color: FAINT }}>
              {q.clientPhone && <span>{q.clientPhone}</span>}
              {q.clientEmail && <span>{q.clientEmail}</span>}
              {q.clientAddress && <span>{q.clientAddress}</span>}
              {q.clientGst && <span>GSTIN: {q.clientGst}</span>}
            </div>
          </div>
          <div style={{ padding: "0 2px 4px 28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "10px" }}>
              <span style={{ display: "inline-block", width: "3px", height: "14px", borderRadius: "2px", background: INK }} />
              <p style={{ fontSize: "8px", fontWeight: 800, letterSpacing: "0.32em", textTransform: "uppercase", color: INK }}>Project Brief</p>
            </div>
            <p style={{ fontSize: "17px", fontWeight: 800, color: INK, letterSpacing: "-0.015em" }}>{q.projectType || "Custom Project"}</p>
            <div style={{ display: "grid", gap: "6px", marginTop: "10px", fontSize: "10.5px", color: MUTED }}>
              <span><strong style={{ color: INK }}>Timeline:</strong> {q.timeline}</span>
              <span><strong style={{ color: INK }}>Payment:</strong> {q.paymentTerms}</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "20px", padding: "0 38px" }}>
          <div style={{ overflow: "hidden", borderRadius: "12px", border: `1px solid ${LINE}`, boxShadow: "0 10px 26px rgba(15,23,42,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", background: SOFT, borderBottom: `1px solid ${LINE}` }}>
              <div>
                <p style={{ fontSize: "8px", fontWeight: 800, letterSpacing: "0.36em", color: EMERALD, textTransform: "uppercase" }}>Scope &amp; Pricing</p>
                <p style={{ marginTop: "3px", fontSize: "10.5px", color: FAINT }}>Services and features included in this proposal</p>
              </div>
              <div style={{ padding: "6px 11px", borderRadius: "999px", background: INK, color: "#fff", fontSize: "10px", fontWeight: 800, letterSpacing: "0.02em" }}>{q.lineItems.length} Items</div>
            </div>
            <table className="premium-scope-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead>
                <tr style={{ background: INK, color: "#fff" }}>
                  <th style={{ width: "40px", padding: "11px 0 11px 16px", textAlign: "left", fontSize: "7px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" }}>#</th>
                  <th style={{ padding: "11px 10px", textAlign: "left", fontSize: "7px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" }}>Deliverable</th>
                  <th style={{ width: "44px", padding: "11px 8px", textAlign: "center", fontSize: "7px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" }}>Qty</th>
                  <th style={{ width: "92px", padding: "11px 8px", textAlign: "right", fontSize: "7px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" }}>Unit</th>
                  <th style={{ width: "96px", padding: "11px 16px 11px 8px", textAlign: "right", fontSize: "7px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {q.lineItems.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #eef2f7", background: idx % 2 ? SOFT : "#fff" }}>
                    <td style={{ padding: "9px 0 9px 16px", color: "#94a3b8", fontSize: "9px", fontWeight: 700 }}>{idx + 1}</td>
                    <td style={{ padding: "9px 10px", color: INK, fontWeight: 700 }}>
                      {item.name}
                      {item.defaultPrice > 0 && item.price !== item.defaultPrice && <span style={{ display: "block", marginTop: "2px", color: "#94a3b8", fontSize: "8.5px", fontWeight: 500 }}>List: {fmt(item.defaultPrice)}</span>}
                    </td>
                    <td style={{ padding: "9px 8px", textAlign: "center", color: MUTED }}>{item.qty}</td>
                    <td style={{ padding: "9px 8px", textAlign: "right", color: FAINT }}>{item.price > 0 ? fmt(item.price) : <Pill tone="emerald">Included</Pill>}</td>
                    <td style={{ padding: "9px 16px 9px 8px", textAlign: "right", color: INK, fontWeight: 800 }}>{item.total > 0 ? fmt(item.total) : <Pill tone="emerald">Included</Pill>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: "18px", padding: "0 38px" }}>
          <div style={{ position: "relative", overflow: "hidden", padding: "20px 24px", borderRadius: "12px", background: HERO, color: "#fff", boxShadow: "0 18px 40px rgba(15,23,42,0.20)" }}>
            <div style={{ position: "absolute", inset: 0, background: HERO_GLOW }} />
            {(hasDiscount || hasTax) && (
              <div style={{ position: "relative", display: "flex", justifyContent: "flex-end", paddingBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.14)" }}>
                <div style={{ width: "300px", display: "grid", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", color: "#cbd5e1" }}><span>Subtotal</span><strong>{fmt(q.subtotal)}</strong></div>
                  {hasDiscount && <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", color: "#fca5a5" }}><span>{q.discountType === "percent" ? `Discount (${q.discountValue}%)` : "Discount"}</span><strong>-{fmt(q.discountAmount)}</strong></div>}
                  {hasTax && <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", color: "#cbd5e1" }}><span>GST ({q.taxRate}%)</span><strong>{fmt(q.taxAmount)}</strong></div>}
                </div>
              </div>
            )}
            <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: (hasDiscount || hasTax) ? "12px" : "2px" }}>
              <span style={{ fontSize: "11px", color: "#a7f3d0", fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase" }}>Grand Total</span>
              <strong style={{ fontSize: "26px", lineHeight: 1, letterSpacing: "-0.02em", textShadow: "0 0 22px rgba(110,231,183,0.40)" }}>{fmt(q.grandTotal)}</strong>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginTop: "14px" }}>
            <div style={{ padding: "16px 18px", borderRadius: "12px", background: "#ECFDF5", border: "1px solid #A7F3D1", boxShadow: "0 10px 24px rgba(16,185,129,0.10)" }}>
              <p style={{ fontSize: "8px", fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#047857" }}>Advance ({q.advancePercent}%)</p>
              <p style={{ marginTop: "4px", fontSize: "18px", fontWeight: 900, color: "#064e3b", letterSpacing: "-0.015em" }}>{fmt(q.advanceAmount)}</p>
            </div>
            <div style={{ padding: "16px 18px", borderRadius: "12px", background: "#FFFBEB", border: "1px solid #FDE68A", boxShadow: "0 10px 24px rgba(245,158,11,0.10)" }}>
              <p style={{ fontSize: "8px", fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#B45309" }}>Balance Due</p>
              <p style={{ marginTop: "4px", fontSize: "18px", fontWeight: 900, color: "#78350f", letterSpacing: "-0.015em" }}>{fmt(q.remainingAmount)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="premium-page premium-page-two" style={{ padding: "30px 38px 34px", background: "#ffffff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            <p style={{ fontSize: "8px", fontWeight: 800, letterSpacing: "0.42em", textTransform: "uppercase", color: EMERALD }}>Payment &amp; Terms</p>
            <h2 style={{ marginTop: "6px", fontSize: "24px", fontWeight: 900, letterSpacing: "-0.03em", color: INK }}>Next steps to begin</h2>
          </div>
          <span style={{ padding: "6px 12px", borderRadius: "999px", fontSize: "10px", fontWeight: 800, color: "#fff", background: INK, letterSpacing: "0.02em" }}>{q.quotationNumber || "DRAFT"}</span>
        </div>
        <div className="premium-payment-card" style={{ overflow: "hidden", borderRadius: "12px", border: `1px solid ${LINE}`, boxShadow: "0 14px 32px rgba(15,23,42,0.07)", background: "#fff" }}>
          <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 240px", gap: "20px", padding: "22px 24px", background: HERO, color: "#fff" }}>
            <div style={{ position: "absolute", inset: 0, background: HERO_GLOW }} />
            <div style={{ position: "relative" }}>
              <p style={{ fontSize: "8px", fontWeight: 800, letterSpacing: "0.36em", textTransform: "uppercase", color: "#a7f3d0" }}>Payment Details</p>
              <p style={{ marginTop: "8px", maxWidth: "380px", fontSize: "11.5px", lineHeight: 1.65, color: "#cbd5e1" }}>Please mention quotation number <strong style={{ color: "#fff" }}>{q.quotationNumber || "DRAFT"}</strong> in the payment reference.</p>
            </div>
            <div style={{ position: "relative", padding: "14px 16px", borderRadius: "10px", background: "rgba(236,253,245,0.12)", border: "1px solid rgba(167,243,209,0.45)", color: "#ECFDF5" }}>
              <p style={{ fontSize: "8px", fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "#a7f3d0" }}>Advance Payable</p>
              <p style={{ marginTop: "4px", fontSize: "22px", fontWeight: 900, letterSpacing: "-0.015em", color: "#fff" }}>{fmt(q.advanceAmount)}</p>
              <p style={{ marginTop: "4px", fontSize: "9.5px", fontWeight: 700, color: "#d1fae5" }}>UPI: {PAYMENT.upiId}</p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
            {paymentDetails.map(([label, value, icon], i) => (
              <div key={label} style={{ padding: "16px 20px", borderRight: i % 3 !== 2 ? "1px solid #eef2f6" : "none", borderBottom: i < 3 ? "1px solid #eef2f6" : "none" }}>
                <p style={{ fontSize: "7px", fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: "#94a3b8" }}>{label}</p>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
                  {icon && <img src={icon} alt="" style={{ height: label === "Bank" ? "22px" : "18px", width: "auto", objectFit: "contain" }} />}
                  <p style={{ fontSize: (label.includes("No.") || label.includes("IFSC") || label.includes("UPI")) ? "10.5px" : "11.5px", fontFamily: (label.includes("No.") || label.includes("IFSC") || label.includes("UPI")) ? "ui-monospace, SFMono-Regular, Consolas, monospace" : "inherit", fontWeight: 800, color: INK }}>{value}</p>
                </div>
              </div>
            ))}
          </div>
          {q.grandTotal > 0 && (
            <div className="screen-only" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", padding: "16px 22px", borderTop: `1px solid ${LINE}`, background: SOFT }}>
              <a href={upiDeepLink(q.advanceAmount)} style={{ display: "block", borderRadius: "10px", padding: "14px", background: "#ECFDF5", border: "1px solid #A7F3D1", textAlign: "center", textDecoration: "none" }}>
                <p style={{ fontSize: "8.5px", fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#047857" }}>Pay Advance</p>
                <p style={{ marginTop: "3px", fontSize: "17px", fontWeight: 900, color: "#064e3b", letterSpacing: "-0.015em" }}>{fmt(q.advanceAmount)}</p>
              </a>
              <a href={"https://wa.me/" + waPhone + "?text=" + encodeURIComponent("Hi, I would like to confirm payment for quotation " + (q.quotationNumber ?? "") + ".\nAmount: " + fmt(q.grandTotal))} target="_blank" rel="noreferrer" style={{ display: "block", borderRadius: "10px", padding: "14px", background: "#EFF6FF", border: "1px solid #BFDBFE", textAlign: "center", textDecoration: "none" }}>
                <p style={{ fontSize: "8.5px", fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#2563eb" }}>Confirm on WhatsApp</p>
                <p style={{ marginTop: "3px", fontSize: "17px", fontWeight: 900, color: "#1e3a8a", letterSpacing: "-0.015em" }}>{fmt(q.grandTotal)}</p>
              </a>
            </div>
          )}
        </div>
        <div className="premium-notes-footer" style={{ marginTop: "14px", breakInside: "avoid", pageBreakInside: "avoid" }}>
          {(q.notes.filter(Boolean).length > 0 || q.termsAndConditions.filter(Boolean).length > 0) && (
            <div className="premium-notes-terms" style={{ display: "grid", gridTemplateColumns: "0.78fr 1.22fr", gap: "14px" }}>
              {q.notes.filter(Boolean).length > 0 && (
                <div style={{ padding: "12px 14px", borderRadius: "12px", background: "#fff", border: `1px solid ${LINE}`, boxShadow: "0 8px 20px rgba(15,23,42,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "9px" }}>
                    <span style={{ display: "inline-block", width: "3px", height: "12px", borderRadius: "2px", background: EMERALD }} />
                    <p style={{ fontSize: "8px", fontWeight: 800, letterSpacing: "0.32em", textTransform: "uppercase", color: EMERALD }}>Notes</p>
                  </div>
                  <div style={{ display: "grid", gap: "7px" }}>
                    {q.notes.filter(Boolean).map((note, i) => (
                      <div key={i} style={{ display: "flex", gap: "8px", fontSize: "10px", lineHeight: 1.45, color: MUTED }}>
                        <RiCheckLine style={{ marginTop: "2px", minWidth: "13px", color: "#059669" }} /> <span>{note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {q.termsAndConditions.filter(Boolean).length > 0 && (
                <div style={{ padding: "12px 14px", borderRadius: "12px", background: "#fff", border: `1px solid ${LINE}`, boxShadow: "0 8px 20px rgba(15,23,42,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "9px" }}>
                    <RiShieldCheckLine style={{ color: INK }} />
                    <p style={{ fontSize: "8px", fontWeight: 800, letterSpacing: "0.32em", textTransform: "uppercase", color: INK }}>Terms &amp; Conditions</p>
                  </div>
                  <ol style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "5px 14px", listStyle: "none" }}>
                    {q.termsAndConditions.filter(Boolean).map((t, i) => (
                      <li key={i} style={{ display: "grid", gridTemplateColumns: "16px 1fr", gap: "5px", fontSize: "10px", lineHeight: 1.4, color: MUTED }}>
                        <span style={{ fontWeight: 800, color: INK }}>{i + 1}.</span><span>{t}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
          <div className="premium-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: "18px", marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${LINE}` }}>
            <div>
              <p style={{ fontSize: "10px", color: "#94a3b8" }}>Thank you for your business.</p>
              <p style={{ marginTop: "3px", fontSize: "9px", color: "#64748b" }}>Website: <strong>https://expecto.online</strong>&nbsp;&nbsp; | &nbsp;&nbsp;Contact no.: <strong>8707224376</strong>&nbsp;&nbsp; | &nbsp;&nbsp;Email: <strong>hello@expecto.online</strong></p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ width: "150px", borderTop: `2px solid ${EMERALD}`, marginBottom: "6px" }} />
              <p style={{ fontSize: "10px", fontWeight: 800, color: INK }}>Authorised Signature</p>
              <p style={{ marginTop: "2px", fontSize: "9px", color: "#94a3b8" }}>{COMPANY.name}</p>
            </div>
          </div>
        </div>
      </section>
    </article>
  );
}

// ─── Preview Wrapper (exported) ───────────────────────────────────────────────
export function QuotationPreview({
  q, onBack, onSave, saving, upiDeepLink, waMsg, waPhone, mailtoLink,
}: {
  q: QuotationData; onBack: () => void; onSave: () => void; saving: boolean;
  upiDeepLink: (amount: number) => string; waMsg: string; waPhone: string; mailtoLink: string;
}) {
  function handlePrint() {
    const safeName = (q.clientName || "Client").replace(/[^a-zA-Z0-9 _-]/g, "").trim().replace(/\s+/g, "_");
    const num = q.quotationNumber || "DRAFT";
    const prevTitle = document.title;
    document.title = `${safeName}_Quotation_${num}`;
    const restore = () => {
      document.title = prevTitle;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  }

  return (
    <div className="space-y-4 pb-6">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @page { size: A4 portrait; margin: 0; }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * { visibility: hidden !important; }
          .quotation-print-root, .quotation-print-root * { visibility: visible !important; }
          .quotation-print-root { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; }
          .no-print { display: none !important; }
          .screen-only { display: none !important; }

          /* Edge-to-edge: neutralise the on-screen preview shell so the
             white content card spans the full printable width. */
          .quotation-preview-shell {
            max-width: none !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            background: #fff !important;
          }
          .quotation-document {
            width: 100% !important;
            padding: 0 !important;
            background: #fff !important;
            color: #142033 !important;
            font-family: 'Plus Jakarta Sans', 'Inter', 'Segoe UI', system-ui, sans-serif !important;
          }
          .premium-page {
            width: 100% !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: #fff !important;
          }

          /* Natural page-break control — only small cohesive blocks stay
             intact; the table and large sections are allowed to split. */
          .premium-scope-table thead { display: table-header-group; }
          .premium-scope-table thead tr { break-inside: avoid; break-after: avoid; }
          .premium-scope-table tbody tr { break-inside: avoid; }
          .premium-total-band > div,
          .premium-payment-card,
          .premium-notes-footer { break-inside: avoid; page-break-inside: avoid; }
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
      <div className="quotation-preview-shell mx-auto max-w-[794px] bg-white shadow-sm ring-1 ring-slate-200">
        <div className="quotation-print-root">
          <QuotationDocumentPremium q={q} upiDeepLink={upiDeepLink} waPhone={waPhone} />
        </div>
      </div>
    </div>
  );
}
