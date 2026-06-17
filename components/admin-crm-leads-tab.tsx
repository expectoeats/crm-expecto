"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  RiTimeLine,
  RiExternalLinkLine,
  RiWhatsappLine,
  RiPhoneLine,
  RiSearchLine,
  RiSparklingLine,
  RiCloseLine,
  RiEqualizerLine,
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
  assignedTo?: string | null;
  linked_website_lead_id?: { _id: string; name?: string } | string | null;
  followUpDate?: string;
  createdAt?: string;
  // Fields needed for CallUpdateModal (LeadRecord compatible subset)
  leadQuality?: string;
  pitchMessage?: string;
};

type CrmLeadsResponse = {
  leads: CrmLead[];
  pagination: { page: number; pages: number; total: number };
};

type Employee = { _id: string; name: string };
type SubTab = "active" | "blocked";

// ─── Fetchers ─────────────────────────────────────────────────────────────────

const crmFetcher = async (path: string) =>
  (await apiFetch<CrmLeadsResponse>(path)).data ??
  { leads: [], pagination: { page: 1, pages: 1, total: 0 } };

const employeesFetcher = async () =>
  (await apiFetch<{ employees: Employee[] }>("/users/employees")).data?.employees ?? [];

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

// Cast CrmLead to a minimal LeadRecord shape for modal compatibility
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

// ─── Assign Dropdown ─────────────────────────────────────────────────────────

function CrmAssignDropdown({ lead, employees, onAssigned }: {
  lead: CrmLead; employees: Employee[]; onAssigned: () => void;
}) {
  const [value, setValue] = useState(lead.assignedTo ?? "");
  const [saving, setSaving] = useState(false);

  async function assign(v: string) {
    setValue(v);
    setSaving(true);
    try {
      await apiFetch(`/crm-leads/${lead._id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ assignedTo: v || null }),
      });
      onAssigned();
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={value}
      onChange={(e) => assign(e.target.value)}
      disabled={saving}
      className="h-8 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-slate-400 disabled:opacity-60"
    >
      <option value="">— Unassigned —</option>
      {employees.map((e) => (
        <option key={e._id} value={e._id}>{e.name}</option>
      ))}
    </select>
  );
}

// ─── CRM Lead Card (Admin) ────────────────────────────────────────────────────

function AdminCrmLeadCard({ lead, employees, onMutate }: {
  lead: CrmLead; employees: Employee[]; onMutate: () => void;
}) {
  const isBlocked = lead.status === "blocked_needs_website";
  const [callModalOpen, setCallModalOpen] = useState(false);

  const linkedId =
    typeof lead.linked_website_lead_id === "object" && lead.linked_website_lead_id !== null
      ? lead.linked_website_lead_id._id
      : lead.linked_website_lead_id;
  const linkedName =
    typeof lead.linked_website_lead_id === "object" && lead.linked_website_lead_id !== null
      ? lead.linked_website_lead_id.name
      : null;

  function handleCallClick() {
    if (isBlocked) return;
    window.location.href = `tel:${lead.phone}`;
    setCallModalOpen(true);
  }

  return (
    <>
      <div className={cn(
        "overflow-hidden rounded-2xl bg-white ring-1 shadow-sm",
        isBlocked ? "ring-amber-200" : "ring-slate-200"
      )}>
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

          {/* Name + niche + score */}
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold text-slate-950">{displayName(lead)}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {lead.phone}{lead.city ? ` · ${lead.city}` : ""}
              </p>
            </div>
            <NicheBadge niche={displayNiche(lead)} />
            {lead.crm_lead_score != null ? (
              <span className="shrink-0 inline-flex items-center rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold text-violet-700 ring-1 ring-violet-300">
                Score {lead.crm_lead_score}
              </span>
            ) : null}
          </div>

          {/* Status badge */}
          <div>
            {isBlocked ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-300">
                <RiTimeLine className="h-3 w-3" />
                Blocked · Awaiting Website
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-300">
                <RiSparklingLine className="h-3 w-3" />
                {lead.status.replaceAll("_", " ")}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
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
              <RiWhatsappLine className="h-4 w-4" />
              WA
            </a>
          </div>
        </div>

        {/* Assign footer */}
        <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2.5">
          <span className="shrink-0 text-[11px] font-semibold text-slate-400">Assign:</span>
          <div className="flex-1">
            <CrmAssignDropdown lead={lead} employees={employees} onAssigned={onMutate} />
          </div>
          <span className="shrink-0 text-[11px] text-slate-400">{lead.phone}</span>
        </div>
      </div>

      {!isBlocked ? (
        <CallUpdateModal
          lead={toLeadRecord(lead)}
          open={callModalOpen}
          onClose={() => setCallModalOpen(false)}
          onSaved={async () => { onMutate(); }}
        />
      ) : null}
    </>
  );
}

// ─── Main Admin CRM Tab ───────────────────────────────────────────────────────

export function AdminCrmLeadsTab() {
  const [subTab, setSubTab] = useState<SubTab>("active");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const statusFilter = subTab === "blocked" ? "blocked_needs_website" : "";
  const swrKey = `/crm-leads?status=${statusFilter}&search=${encodeURIComponent(debouncedSearch)}&limit=100`;

  const { data, isLoading, mutate } = useSWR(swrKey, crmFetcher);
  const { data: employees = [] } = useSWR("admin-crm-employees", employeesFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });

  const allLeads = data?.leads ?? [];
  const displayLeads =
    subTab === "active"
      ? allLeads.filter((l) => l.status !== "blocked_needs_website")
      : allLeads;

  const blockedSwrKey = `/crm-leads?status=blocked_needs_website&limit=1`;
  const { data: blockedData } = useSWR(blockedSwrKey, crmFetcher, { revalidateOnFocus: false, dedupingInterval: 30_000 });
  const blockedCount = blockedData?.pagination.total ?? 0;

  function handleSearch(val: string) {
    setSearch(val);
    setTimeout(() => setDebouncedSearch(val), 300);
  }

  function clearSearch() {
    setSearch("");
    setDebouncedSearch("");
  }

  return (
    <div className="space-y-4">

      {/* Page header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Manage</p>
        <h1 className="text-xl font-bold text-slate-950">CRM Leads</h1>
      </div>

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
          Active CRM Leads
        </button>
        <button
          type="button"
          onClick={() => setSubTab("blocked")}
          className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
            subTab === "blocked" ? "bg-white text-amber-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <RiTimeLine className="h-4 w-4" />
          Blocked
          {blockedCount > 0 ? (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-white">
              {blockedCount > 99 ? "99+" : blockedCount}
            </span>
          ) : null}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <RiSearchLine className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by name or phone…"
          className="pl-11"
        />
        {search ? (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <RiCloseLine className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* Count */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <RiEqualizerLine className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">
            {subTab === "blocked" ? "Awaiting website delivery" : "CRM prospects"}
          </span>
        </div>
        {!isLoading ? (
          <span className="text-xs text-slate-400">
            {displayLeads.length} lead{displayLeads.length !== 1 ? "s" : ""}
          </span>
        ) : null}
      </div>

      {/* Lead grid — 2 columns on desktop */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : displayLeads.length ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {displayLeads.map((lead) => (
            <AdminCrmLeadCard
              key={lead._id}
              lead={lead}
              employees={employees}
              onMutate={() => mutate()}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={subTab === "blocked" ? "No blocked CRM leads" : "No active CRM leads"}
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
