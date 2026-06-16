"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import {
  CheckCircle2, Clock, ExternalLink, MessageCircle, PhoneCall, Search, Sparkles,
} from "lucide-react";
import { EmptyState, Input, SkeletonCard } from "@/components/ui";
import { NicheBadge } from "@/components/badges";
import { apiFetch } from "@/lib/http";
import { cn } from "@/lib/ui";

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

function getWhatsAppUrl(lead: CrmLead) {
  const number = (lead.whatsapp ?? lead.phone).replace(/\D/g, "");
  return `https://wa.me/${number}`;
}

function relativeTime(dateStr?: string) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

// ─── CRM Lead Card ───────────────────────────────────────────────────────────

function CrmLeadCard({ lead }: { lead: CrmLead }) {
  const isBlocked = lead.status === "blocked_needs_website";
  const linkedId =
    typeof lead.linked_website_lead_id === "object" && lead.linked_website_lead_id !== null
      ? lead.linked_website_lead_id._id
      : lead.linked_website_lead_id;
  const linkedName =
    typeof lead.linked_website_lead_id === "object" && lead.linked_website_lead_id !== null
      ? lead.linked_website_lead_id.name
      : null;

  return (
    <div className={cn(
      "overflow-hidden rounded-2xl bg-white ring-1 transition-all shadow-sm",
      isBlocked ? "ring-amber-200" : "ring-slate-200"
    )}>
      <div className="p-4 space-y-3">

        {/* Blocked banner */}
        {isBlocked ? (
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 ring-1 ring-amber-200">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-amber-800">
                ⏳ Website deal in progress — CRM pitch unlocks automatically when website is delivered
              </p>
              {linkedId ? (
                <a
                  href={`/leads/${linkedId}`}
                  className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900"
                >
                  View website lead {linkedName ? `(${linkedName})` : ""} →
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Name + niche */}
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold text-slate-950">{displayName(lead)}</p>
            <p className="mt-0.5 text-xs text-slate-500">{lead.phone}{lead.city ? ` · ${lead.city}` : ""}</p>
          </div>
          <NicheBadge niche={displayNiche(lead)} />
          {lead.crm_lead_score != null ? (
            <span className="shrink-0 inline-flex items-center rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold text-violet-700 ring-1 ring-violet-300">
              Score {lead.crm_lead_score}
            </span>
          ) : null}
        </div>

        {/* Status */}
        <div>
          {isBlocked ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-300">
              <Clock className="h-3 w-3" />
              Blocked · Awaiting Website
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-300">
              <Sparkles className="h-3 w-3" />
              {lead.status.replaceAll("_", " ")}
            </span>
          )}
          {lead.followUpDate ? (
            <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 ring-1 ring-purple-200">
              <Clock className="h-2.5 w-2.5" />
              Follow up {relativeTime(lead.followUpDate)}
            </span>
          ) : null}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <a
            href={isBlocked ? undefined : `tel:${lead.phone}`}
            className={cn(
              "inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition",
              isBlocked
                ? "cursor-not-allowed bg-slate-100 text-slate-400 opacity-60"
                : "bg-emerald-500 text-white active:scale-[0.97] hover:bg-emerald-600"
            )}
            aria-disabled={isBlocked}
            tabIndex={isBlocked ? -1 : 0}
          >
            <PhoneCall className="h-4 w-4" />
            Call
          </a>
          <a
            href={isBlocked ? undefined : getWhatsAppUrl(lead)}
            target={isBlocked ? undefined : "_blank"}
            rel="noopener noreferrer"
            className={cn(
              "inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition",
              isBlocked
                ? "cursor-not-allowed bg-slate-100 text-slate-400 opacity-60"
                : "bg-[#25D366] text-white active:scale-[0.97] hover:bg-[#1fba58]"
            )}
            aria-disabled={isBlocked}
            tabIndex={isBlocked ? -1 : 0}
          >
            <MessageCircle className="h-4 w-4" />
            WA
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Main Tab Component ───────────────────────────────────────────────────────

export function CrmLeadsTab() {
  const [subTab, setSubTab] = useState<SubTab>("active");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const statusFilter = subTab === "blocked" ? "blocked_needs_website" : "";
  const swrKey = `/crm-leads?status=${statusFilter}&search=${encodeURIComponent(debouncedSearch)}&limit=50`;

  const { data, isLoading } = useSWR(swrKey, fetcher);

  const leads = data?.leads ?? [];
  const total = data?.pagination.total ?? 0;

  // Filter active = everything except blocked
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
          <Sparkles className="h-4 w-4" />
          Active
        </button>
        <button
          type="button"
          onClick={() => setSubTab("blocked")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
            subTab === "blocked" ? "bg-white text-amber-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Clock className="h-4 w-4" />
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
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
            ? <><Clock className="h-4 w-4 text-amber-400" /><span className="text-sm font-semibold text-slate-700">Awaiting website delivery</span></>
            : <><CheckCircle2 className="h-4 w-4 text-slate-400" /><span className="text-sm font-semibold text-slate-700">CRM prospects to pitch</span></>
          }
        </div>
        {!isLoading ? (
          <span className="text-xs text-slate-400">{displayLeads.length} lead{displayLeads.length !== 1 ? "s" : ""}</span>
        ) : null}
      </div>

      {/* Lead list */}
      {isLoading ? (
        <div className="space-y-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : displayLeads.length ? (
        <div className="space-y-3 grid lg:grid-cols-2 md:grid-cols-2 sm:grid-cols-1 gap-3">
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
