"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import useSWR from "swr";
import {
  RiCheckboxCircleLine,
  RiTimeLine,
  RiExternalLinkLine,
  RiWhatsappLine,
  RiPhoneLine,
  RiSearchLine,
  RiSparklingLine,
  RiEyeLine,
  RiCloseLine,
  RiBarChartLine,
} from "react-icons/ri";
import { EmptyState, Input, SkeletonCard } from "@/components/ui";
import { NicheBadge } from "@/components/badges";
import { apiFetch } from "@/lib/http";
import { cn } from "@/lib/ui";
import { CallUpdateModal } from "@/components/call-update-modal";
import type { LeadRecord } from "@/components/lead-utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type CrmLead = {
  _id: string;
  name?: string;
  business_name?: string;
  phone: string;
  whatsapp?: string;
  niche?: string;
  category?: string;
  city?: string;
  crm_lead_score?: number | null;
  status: string;
  linked_website_lead_id?: { _id: string; name?: string } | string | null;
  followUpDate?: string;
  contact_history?: Array<{ _id: string; action: string; note: string; at: string }>;
  createdAt?: string;
  leadQuality?: string;
  pitchMessage?: string;
};

type CrmLeadsResponse = {
  leads: CrmLead[];
  pagination: { page: number; pages: number; total: number };
};

type SubTab = "active" | "blocked";

// ─── Fetcher ─────────────────────────────────────────────────────────────────

const fetcher = async (path: string) =>
  (await apiFetch<CrmLeadsResponse>(path)).data ?? { leads: [], pagination: { page: 1, pages: 1, total: 0 } };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function displayName(lead: CrmLead) {
  return lead.name ?? lead.business_name ?? "Unnamed";
}

function displayNiche(lead: CrmLead) {
  return lead.niche ?? lead.category ?? "Other";
}

function relativeTime(dateStr?: string) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function toLeadRecord(lead: CrmLead): LeadRecord {
  return {
    _id: lead._id,
    name: displayName(lead),
    phone: lead.phone,
    whatsapp: lead.whatsapp,
    niche: displayNiche(lead),
    leadQuality: lead.leadQuality ?? "warm",
    status: lead.status,
    pitchMessage: lead.pitchMessage,
  };
}

/** Build a short, punchy WhatsApp pitch for CRM product */
function getCrmWhatsAppUrl(lead: CrmLead): string {
  const number = (lead.whatsapp ?? lead.phone).replace(/\D/g, "");
  const name = displayName(lead);
  const niche = displayNiche(lead);

  // Short, punchy, manipulative pitch tailored to the business type
  const msg = `Namaste ${name}! 👋

Aapke ${niche} business ke liye ek CRM system hai jo:
• Leads track kare automatically
• Follow-up miss na ho
• Sales 2x kare

*30-day free trial* available hai.

Baat karte hain? 2 min mein demo de sakta hoon.`;

  return `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
}

/** Score label based on crm_lead_score */
function scoreLabel(score?: number | null): { label: string; cls: string } {
  if (score == null) return { label: "—", cls: "bg-slate-100 text-slate-400 ring-slate-200" };
  if (score >= 80) return { label: `${score} 🔥`, cls: "bg-red-100 text-red-700 ring-red-300" };
  if (score >= 60) return { label: `${score} ⚡`, cls: "bg-amber-100 text-amber-700 ring-amber-300" };
  return { label: `${score}`, cls: "bg-violet-100 text-violet-700 ring-violet-300" };
}

// ─── CRM Lead Card ────────────────────────────────────────────────────────────

function CrmLeadCard({ lead }: { lead: CrmLead }) {
  const isBlocked = lead.status === "blocked_needs_website";
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [waModalOpen, setWaModalOpen] = useState(false);

  const linkedId =
    typeof lead.linked_website_lead_id === "object" && lead.linked_website_lead_id !== null
      ? lead.linked_website_lead_id._id
      : lead.linked_website_lead_id;
  const linkedName =
    typeof lead.linked_website_lead_id === "object" && lead.linked_website_lead_id !== null
      ? lead.linked_website_lead_id.name
      : null;

  const waUrl = getCrmWhatsAppUrl(lead);
  const score = scoreLabel(lead.crm_lead_score);

  function handleCallClick() {
    if (isBlocked) return;
    window.location.href = `tel:${lead.phone}`;
    setCallModalOpen(true);
  }

  return (
    <>
      <div className={cn(
        "overflow-hidden rounded-2xl bg-white ring-1 transition-all shadow-sm",
        isBlocked ? "ring-amber-200" : "ring-slate-200 hover:shadow-md"
      )}>
        {/* Score accent bar */}
        {!isBlocked && lead.crm_lead_score != null ? (
          <div className={cn(
            "h-1 w-full",
            lead.crm_lead_score >= 80 ? "bg-red-400" :
            lead.crm_lead_score >= 60 ? "bg-amber-400" : "bg-violet-400"
          )} />
        ) : null}

        <div className="p-4 space-y-3">
          {/* Blocked banner */}
          {isBlocked ? (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 ring-1 ring-amber-200">
              <RiTimeLine className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-amber-800">
                  Website deal in progress — CRM pitch unlocks when website is delivered
                </p>
                {linkedId ? (
                  <a
                    href={`/leads/${linkedId}`}
                    className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900"
                  >
                    View website lead {linkedName ? `(${linkedName})` : ""} →
                    <RiExternalLinkLine className="h-2.5 w-2.5" />
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Name row */}
          <div className="flex items-start gap-2 min-w-0">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold text-slate-950">{displayName(lead)}</p>
              <p className="mt-0.5 text-xs text-slate-500">{lead.phone}{lead.city ? ` · ${lead.city}` : ""}</p>
            </div>
            <NicheBadge niche={displayNiche(lead)} />
          </div>

          {/* Score + Status row */}
          <div className="flex flex-wrap items-center gap-1.5">
            {lead.crm_lead_score != null ? (
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset", score.cls)}>
                <RiBarChartLine className="h-3 w-3" />
                Score {score.label}
              </span>
            ) : null}
            {isBlocked ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-300">
                <RiTimeLine className="h-3 w-3" />
                Blocked
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-300">
                <RiSparklingLine className="h-3 w-3" />
                {lead.status.replaceAll("_", " ")}
              </span>
            )}
            {lead.followUpDate ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 ring-1 ring-purple-200">
                <RiTimeLine className="h-2.5 w-2.5" />
                Follow up {relativeTime(lead.followUpDate)}
              </span>
            ) : null}
          </div>

          {/* Action buttons — 3 buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleCallClick}
              disabled={isBlocked}
              className={cn(
                "inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition",
                isBlocked
                  ? "cursor-not-allowed bg-slate-100 text-slate-400 opacity-60"
                  : "bg-emerald-500 text-white active:scale-[0.97] hover:bg-emerald-600"
              )}
            >
              <RiPhoneLine className="h-4 w-4" />
              Call
            </button>
            <button
              type="button"
              onClick={() => { if (!isBlocked) setWaModalOpen(true); }}
              disabled={isBlocked}
              className={cn(
                "inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition",
                isBlocked
                  ? "cursor-not-allowed bg-slate-100 text-slate-400 opacity-60"
                  : "bg-[#25D366] text-white active:scale-[0.97] hover:bg-[#1fba58]"
              )}
            >
              <RiWhatsappLine className="h-4 w-4" />
              WA
            </button>
            <a
              href={linkedId ? `/leads/${linkedId}` : undefined}
              className={cn(
                "inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition",
                linkedId
                  ? "bg-slate-100 text-slate-700 active:scale-[0.97] hover:bg-slate-200"
                  : "bg-slate-50 text-slate-400 cursor-not-allowed opacity-60"
              )}
              tabIndex={linkedId ? 0 : -1}
            >
              <RiEyeLine className="h-4 w-4" />
              View
            </a>
          </div>
        </div>
      </div>

      {/* Call modal */}
      {!isBlocked ? (
        <CallUpdateModal
          lead={toLeadRecord(lead)}
          open={callModalOpen}
          onClose={() => setCallModalOpen(false)}
          onSaved={async () => {}}
        />
      ) : null}

      {/* WA modal — portal */}
      {waModalOpen && typeof document !== "undefined" ? createPortal(
        <div className="fixed inset-0 overflow-y-auto" style={{ zIndex: 99999, background: "linear-gradient(160deg,#075E54 0%,#128C7E 60%,#0d7a6b 100%)" }}>
          <div className="min-h-full px-4 pb-8 pt-5 text-white">
            <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-emerald-200/80">WhatsApp · CRM Pitch</p>
                <h2 className="mt-1 text-xl font-bold">{displayName(lead)}</h2>
                <p className="mt-0.5 text-sm text-white/50">{lead.phone}</p>
              </div>
              <button
                type="button"
                onClick={() => setWaModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/20 transition"
              >
                <RiCloseLine className="h-5 w-5" />
              </button>
            </div>

            <div className="mx-auto mt-5 max-w-lg space-y-3">
              {/* Message preview */}
              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/20">
                <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-200 mb-2">Message Preview</p>
                <p className="text-sm leading-relaxed text-white/90 whitespace-pre-line">{`Namaste ${displayName(lead)}! 👋\n\nAapke ${displayNiche(lead)} business ke liye ek CRM system hai jo:\n• Leads track kare automatically\n• Follow-up miss na ho\n• Sales 2x kare\n\n*30-day free trial* available hai.\n\nBaat karte hain? 2 min mein demo de sakta hoon.`}</p>
              </div>

              {/* Send button */}
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[54px] items-center justify-center gap-2.5 rounded-2xl bg-[#25D366] px-5 py-3.5 text-[15px] font-bold text-white shadow-[0_12px_32px_rgba(37,211,102,0.4)] hover:bg-[#1fba58] transition active:scale-[0.97]"
              >
                <RiWhatsappLine className="h-5 w-5" />
                Send CRM Pitch
              </a>

              <button
                type="button"
                onClick={() => setWaModalOpen(false)}
                className="w-full rounded-2xl bg-white/10 py-3 text-sm font-semibold text-white hover:bg-white/20 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}

// ─── Main Tab Component ───────────────────────────────────────────────────────

export function CrmLeadsTab() {
  const [subTab, setSubTab] = useState<SubTab>("active");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const statusFilter = subTab === "blocked" ? "blocked_needs_website" : "";
  const swrKey = `/crm-leads?status=${statusFilter}&search=${encodeURIComponent(debouncedSearch)}&limit=50`;

  const { data, isLoading } = useSWR(swrKey, fetcher);

  const leads = data?.leads ?? [];
  const total = data?.pagination.total ?? 0;

  const displayLeads =
    subTab === "active"
      ? leads.filter((l) => l.status !== "blocked_needs_website")
      : leads;

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 rounded-2xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setSubTab("active")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
            subTab === "active" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <RiSparklingLine className="h-4 w-4" />
          Active
        </button>
        <button
          type="button"
          onClick={() => setSubTab("blocked")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
            subTab === "blocked" ? "bg-white text-amber-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <RiTimeLine className="h-4 w-4" />
          Blocked
          {subTab !== "blocked" && total > 0 ? (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-white">
              {total > 99 ? "99+" : total}
            </span>
          ) : null}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <RiSearchLine className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone…"
          className="pl-11"
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {subTab === "blocked"
            ? <><RiTimeLine className="h-4 w-4 text-amber-400" /><span className="text-sm font-semibold text-slate-700">Awaiting website delivery</span></>
            : <><RiCheckboxCircleLine className="h-4 w-4 text-slate-400" /><span className="text-sm font-semibold text-slate-700">CRM prospects · sorted by score</span></>
          }
        </div>
        {!isLoading ? (
          <span className="text-xs text-slate-400">{displayLeads.length} lead{displayLeads.length !== 1 ? "s" : ""}</span>
        ) : null}
      </div>

      {/* Lead list */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : displayLeads.length ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {displayLeads.map((lead) => (
            <CrmLeadCard key={lead._id} lead={lead} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={subTab === "blocked" ? "No blocked CRM leads" : "No CRM leads yet"}
          description={
            subTab === "blocked"
              ? "No leads are blocked pending website delivery."
              : "CRM buyer leads will appear here once added."
          }
        />
      )}
    </div>
  );
}
