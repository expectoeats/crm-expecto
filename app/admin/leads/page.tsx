"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import {
  ChevronDown, ChevronLeft, ChevronRight, Download, Filter,
  MessageCircle, PhoneCall, Plus, Search, Shuffle, Star, X,
} from "lucide-react";
import { Card, EmptyState, Input, Select, SectionTitle, Button, SkeletonCard } from "@/components/ui";
import { LeadQualityBadge, NicheBadge } from "@/components/badges";
import { type LeadRecord } from "@/components/lead-utils";
import { LeadDrawer } from "@/components/lead-drawer";
import { apiFetch } from "@/lib/http";
import { statusConfig, ALL_STATUSES } from "@/lib/ui";

type Employee = { _id: string; name: string };
type LeadPageResponse = {
  leads: LeadRecord[];
  pagination: { page: number; pages: number; total: number; limit: number };
};
type Stats = {
  total: number; new_today: number; contacted: number;
  interested: number; follow_ups_today: number;
};
type NichesResponse = { categories: string[]; rawToBroad: Record<string, string> };

const leadsFetcher   = async (path: string) => (await apiFetch<LeadPageResponse>(path)).data;
const employeesFetcher = async () =>
  (await apiFetch<{ employees: Employee[] }>("/users/employees")).data?.employees ?? [];
const statsFetcher   = async () => (await apiFetch<Stats>("/leads/stats")).data ?? null;
const nichesFetcher  = async () =>
  (await apiFetch<NichesResponse>("/leads/niches")).data ?? { categories: [], rawToBroad: {} };

function buildCsv(leads: LeadRecord[]) {
  const header = ["Business Name","Owner","Phone","WhatsApp","Niche","Status","Quality","City","Rating","Score"];
  const rows = leads.map((l) => [
    l.name, l.ownerName ?? "", l.phone, l.whatsapp ?? "",
    l.niche, l.status, l.leadQuality, l.city ?? "", l.rating ?? "", l.score ?? "",
  ]);
  return [header, ...rows]
    .map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

function getWaUrl(lead: LeadRecord) {
  const n = (lead.whatsapp || lead.phone).replace(/\D/g, "");
  const m = lead.pitchMessage
    ? encodeURIComponent(lead.pitchMessage)
    : encodeURIComponent(`Namaste! ${lead.name} wale hain aap?`);
  return `https://wa.me/${n}?text=${m}`;
}

function AssignDropdown({ lead, employees, onAssigned }: {
  lead: LeadRecord; employees: Employee[]; onAssigned: () => void;
}) {
  const resolveAssignee = () => {
    if (!lead.assignedTo) return "";
    if (typeof lead.assignedTo === "object") return lead.assignedTo._id;
    return lead.assignedTo as string;
  };

  const [value, setValue] = useState(resolveAssignee);
  const [saving, setSaving] = useState(false);

  // sync if lead.assignedTo changes (after mutate)
  useEffect(() => {
    setValue(resolveAssignee());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.assignedTo]);

  async function assign(v: string) {
    setValue(v);
    setSaving(true);
    try {
      await apiFetch(`/leads/${lead._id}/assign`, {
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

export default function AdminLeadsPage() {
  // filters
  const [status, setStatus]               = useState("");
  const [niche, setNiche]                 = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [employee, setEmployee]           = useState("");
  const [leadQuality, setLeadQuality]     = useState("");
  const [websiteStatus, setWebsiteStatus] = useState("");
  const [city, setCity]                   = useState("");
  const [search, setSearch]               = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [fromDate, setFromDate]           = useState("");
  const [toDate, setToDate]               = useState("");
  const [filtersOpen, setFiltersOpen]     = useState(false);

  // pagination — resets on any filter change
  const [page, setPage] = useState(1);

  // other state
  const [selected, setSelected]       = useState<string[]>([]);
  const [reassignTo, setReassignTo]   = useState("");
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [drawerLeadId, setDrawerLeadId]   = useState<string | null>(null);

  useEffect(() => { setPage(1); }, [status, niche, employee, leadQuality, websiteStatus, city, debouncedSearch, fromDate, toDate]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const swrKey = `/leads?page=${page}&limit=20&status=${status}&niche=${encodeURIComponent(niche)}&assignedTo=${employee}&leadQuality=${leadQuality}&websiteStatus=${websiteStatus}&city=${city}&search=${debouncedSearch}&from=${fromDate}&to=${toDate}`;

  const { data, isLoading, mutate } = useSWR(swrKey, leadsFetcher);
  const { data: employees = [] }    = useSWR("admin-lead-employees", employeesFetcher);
  const { data: stats }             = useSWR("admin-leads-stats", statsFetcher);
  const { data: nichesData }        = useSWR("admin-lead-niches", nichesFetcher);
  const categories  = nichesData?.categories ?? [];
  const rawToBroad  = nichesData?.rawToBroad ?? {};

  const leads      = data?.leads ?? [];
  const pagination = data?.pagination;

  const activeFilterCount = [status, selectedCategory, employee, leadQuality, websiteStatus, city, fromDate, toDate]
    .filter(Boolean).length;

  function clearAll() {
    setStatus(""); setNiche(""); setSelectedCategory(""); setEmployee(""); setLeadQuality("");
    setWebsiteStatus(""); setCity(""); setSearch(""); setDebouncedSearch("");
    setFromDate(""); setToDate(""); setPage(1);
  }

  async function reassignSelected() {
    await Promise.all(
      selected.map((id) =>
        apiFetch(`/leads/${id}/assign`, {
          method: "PATCH",
          body: JSON.stringify({ assignedTo: reassignTo || null }),
        })
      )
    );
    setSelected([]);
    await mutate();
  }

  async function handleAutoAssign() {
    setAutoAssigning(true);
    try {
      await apiFetch("/leads/auto-assign", { method: "POST" });
      await mutate();
    } finally {
      setAutoAssigning(false);
    }
  }

  function exportCsv() {
    const blob = new Blob([buildCsv(leads)], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "leads.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 pb-6">

      {/* ── PAGE HEADER ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Manage</p>
          <h1 className="text-xl font-bold text-slate-950">All Leads</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => (window.location.href = "/admin/leads/new")} className="h-10 px-3">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add</span>
          </Button>
          <Button variant="accent" onClick={handleAutoAssign} disabled={autoAssigning} className="h-10 px-3">
            <Shuffle className="h-4 w-4" />
            <span className="hidden sm:inline">{autoAssigning ? "..." : "Auto-Assign"}</span>
          </Button>
          <Button variant="secondary" onClick={exportCsv} className="h-10 px-3">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      {stats ? (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Total",     value: stats.total,      filter: "",           color: "text-slate-800" },
            { label: "New Today", value: stats.new_today,  filter: "new",        color: "text-blue-700"  },
            { label: "Contacted", value: stats.contacted,  filter: "",           color: "text-emerald-700"},
            { label: "Interested",value: stats.interested, filter: "interested", color: "text-orange-700"},
          ].map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => {
                setStatus(status === s.filter && s.filter ? "" : s.filter);
                setPage(1);
              }}
              className={`flex flex-col items-center rounded-2xl py-3 transition active:scale-[0.97] ${
                status === s.filter && s.filter
                  ? "bg-slate-950 shadow-md"
                  : "bg-white ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              <span className={`text-xl font-bold leading-none ${status === s.filter && s.filter ? "text-white" : s.color}`}>
                {s.value}
              </span>
              <span className={`mt-1 text-[10px] font-semibold leading-tight ${status === s.filter && s.filter ? "text-white/70" : "text-slate-500"}`}>
                {s.label}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {/* ── SEARCH + FILTER TOGGLE ── */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or phone…"
            className="pl-10"
          />
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className={`relative flex h-12 items-center gap-2 rounded-2xl px-4 text-sm font-semibold transition ${
            filtersOpen || activeFilterCount > 0
              ? "bg-slate-950 text-white"
              : "bg-white text-slate-700 ring-1 ring-slate-200"
          }`}
        >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          ) : null}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* ── FILTER PANEL (collapsible) ── */}
      {filtersOpen ? (
        <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200 shadow-sm">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All status</option>
              {ALL_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
            <Select value={leadQuality} onChange={(e) => setLeadQuality(e.target.value)}>
              <option value="">All quality</option>
              <option value="hot">🔥 Hot</option>
              <option value="warm">☀️ Warm</option>
              <option value="cold">❄️ Cold</option>
            </Select>
            <Select value={employee} onChange={(e) => setEmployee(e.target.value)}>
              <option value="">All employees</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>{emp.name}</option>
              ))}
            </Select>
            <Select
              value={selectedCategory}
              onChange={(e) => {
                const broad = e.target.value;
                setSelectedCategory(broad);
                if (!broad) { setNiche(""); return; }
                // Find all raw values mapping to this broad category
                const rawValues = Object.entries(rawToBroad)
                  .filter(([, b]) => b === broad)
                  .map(([raw]) => raw);
                setNiche(rawValues.length > 0 ? rawValues.join(",") : broad);
              }}
            >
              <option value="">All categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Select>
            <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
            <Select value={websiteStatus} onChange={(e) => setWebsiteStatus(e.target.value)}>
              <option value="">Website</option>
              <option value="no_website">No Website</option>
              <option value="has_website">Has Website</option>
              <option value="website_is_bad">Bad Website</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-1.5 text-sm font-semibold text-red-500 hover:text-red-600"
            >
              <X className="h-4 w-4" />
              Clear all filters
            </button>
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
            >
              Apply
            </button>
          </div>
        </div>
      ) : null}

      {/* ── BULK REASSIGN BAR ── */}
      {selected.length > 0 ? (
        <div className="flex items-center gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-white">
          <span className="text-sm font-semibold">{selected.length} selected</span>
          <select
            value={reassignTo}
            onChange={(e) => setReassignTo(e.target.value)}
            className="flex-1 rounded-xl bg-white/10 px-3 py-2 text-sm text-white outline-none"
          >
            <option value="">Reassign to…</option>
            {employees.map((e) => (
              <option key={e._id} value={e._id}>{e.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={reassignSelected}
            className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-950"
          >
            Go
          </button>
          <button type="button" onClick={() => setSelected([])} className="text-white/60 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* ── LEAD LIST ── */}
      {isLoading ? (
        <div className="space-y-3">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : leads.length > 0 ? (
        <div className="space-y-3">
          {leads.map((lead) => (
            <LeadCardAdmin
              key={lead._id}
              lead={lead}
              employees={employees}
              selected={selected.includes(lead._id)}
              onSelect={(v) =>
                setSelected((c) =>
                  v ? [...c, lead._id] : c.filter((id) => id !== lead._id)
                )
              }
              onView={() => setDrawerLeadId(lead._id)}
              onAssigned={() => mutate()}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No leads found"
          description="Try clearing some filters or broadening your search."
          action={
            activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={clearAll}
                className="text-sm font-semibold text-slate-700 underline underline-offset-4"
              >
                Clear all filters
              </button>
            ) : undefined
          }
        />
      )}

      {/* ── PAGINATION ── */}
      {pagination && pagination.pages > 1 ? (
        <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-40 active:scale-[0.97]"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </button>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-950">
              {pagination.page} / {pagination.pages}
            </p>
            <p className="text-xs text-slate-400">{pagination.total} leads</p>
          </div>
          <button
            type="button"
            disabled={pagination.page >= pagination.pages}
            onClick={() => setPage((p) => p + 1)}
            className="flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40 active:scale-[0.97]"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <LeadDrawer
        leadId={drawerLeadId}
        onClose={() => setDrawerLeadId(null)}
        onUpdated={() => mutate()}
      />
    </div>
  );
}

/* ── ADMIN LEAD CARD ── */
function LeadCardAdmin({
  lead, employees, selected, onSelect, onView, onAssigned,
}: {
  lead: LeadRecord;
  employees: Employee[];
  selected: boolean;
  onSelect: (v: boolean) => void;
  onView: () => void;
  onAssigned: () => void;
}) {
  const cfg = statusConfig[lead.status];
  const lastContact = (lead as LeadRecord & { last_contacted_by?: string; last_action?: string }).last_contacted_by;
  const lastAction  = (lead as LeadRecord & { last_contacted_by?: string; last_action?: string }).last_action;

  return (
    <div className={`overflow-hidden rounded-2xl bg-white ring-1 transition-all ${selected ? "ring-slate-950 shadow-md" : "ring-slate-200 shadow-sm"}`}>
      <div className="p-4 space-y-3">

        {/* ROW 1 — name + niche + checkbox */}
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <button type="button" onClick={onView} className="text-left">
              <p className="truncate text-[15px] font-bold text-slate-950 hover:text-slate-700">{lead.name}</p>
            </button>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
              {lead.rating != null ? (
                <span className="inline-flex items-center gap-0.5 font-semibold text-amber-600">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {lead.rating}
                  {lead.reviewCount != null ? ` (${lead.reviewCount})` : ""}
                </span>
              ) : null}
              {lead.city ? <><span>·</span><span className="truncate">{lead.city}</span></> : null}
            </p>
          </div>
          <NicheBadge niche={lead.niche} />
          <label className="flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelect(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-slate-950"
            />
          </label>
        </div>

        {/* ROW 2 — badges + contact status */}
        <div className="flex flex-wrap items-center gap-1.5">
          <LeadQualityBadge quality={lead.leadQuality} />
          {cfg ? (
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${cfg.className}`}>
              {cfg.label}
            </span>
          ) : null}
          {lastContact ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
              {lastAction === "whatsapped"
                ? <MessageCircle className="h-3 w-3 text-[#1a9e4a]" />
                : <PhoneCall className="h-3 w-3 text-blue-500" />}
              {lastContact}
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">Never contacted</span>
          )}
        </div>

        {/* ROW 3 — pitch preview */}
        {lead.pitchMessage ? (
          <p className="line-clamp-1 rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-800 ring-1 ring-blue-100">
            {lead.pitchMessage}
          </p>
        ) : null}

        {/* ROW 4 — action buttons */}
        <div className="grid grid-cols-3 gap-2">
          <a
            href={`tel:${lead.phone}`}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-emerald-500 text-sm font-semibold text-white active:scale-[0.97]"
          >
            <PhoneCall className="h-4 w-4" />
            Call
          </a>
          <a
            href={getWaUrl(lead)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-[#25D366] text-sm font-semibold text-white active:scale-[0.97]"
          >
            <MessageCircle className="h-4 w-4" />
            WA
          </a>
          <button
            type="button"
            onClick={onView}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 active:scale-[0.97]"
          >
            View
          </button>
        </div>
      </div>

      {/* ASSIGN FOOTER */}
      <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2.5">
        <span className="shrink-0 text-[11px] font-semibold text-slate-400">Assign:</span>
        <div className="flex-1">
          <AssignDropdown lead={lead} employees={employees} onAssigned={onAssigned} />
        </div>
        <span className="shrink-0 text-[11px] text-slate-400">{lead.phone}</span>
      </div>
    </div>
  );
}
