"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import {
  RiArrowDownSLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiDownloadLine,
  RiEqualizerLine,
  RiWhatsappLine,
  RiPhoneLine,
  RiAddLine,
  RiSearchLine,
  RiShuffleLine,
  RiStarFill,
  RiLineChartLine,
  RiCloseLine,
  RiGlobeLine,
  RiShoppingCartLine,
  RiFireLine,
  RiSnowflakeLine,
  RiTrophyLine,
  RiChatSmileLine,
  RiTimeLine,
  RiEyeLine,
  RiDeleteBin6Line,
  RiBarChartLine,
} from "react-icons/ri";
import { Card, EmptyState, Input, Select, SectionTitle, Button, SkeletonCard } from "@/components/ui";
import { LeadQualityBadge, NicheBadge, TierBadge } from "@/components/badges";
import { type LeadRecord } from "@/components/lead-utils";
import { getLastContactInfo } from "@/components/lead-utils";
import { formatReadableDateTime } from "@/lib/time";
import { LeadDrawer } from "@/components/lead-drawer";
import { AdminCrmLeadsTab } from "@/components/admin-crm-leads-tab";
import { CallUpdateModal } from "@/components/call-update-modal";
import { apiFetch } from "@/lib/http";
import { statusConfig, ALL_STATUSES, cn } from "@/lib/ui";

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
  return (
    <Suspense fallback={<div className="space-y-3 p-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>}>
      <AdminLeadsInner />
    </Suspense>
  );
}

function AdminLeadsInner() {
  const searchParams = useSearchParams();

  // pipeline switcher
  const [pipeline, setPipeline] = useState<"website" | "crm">("website");

  // filters — initialise from URL query params so dashboard links work
  const [status, setStatus]               = useState(() => searchParams.get("status") ?? "");
  const [niche, setNiche]                 = useState(() => searchParams.get("niche") ?? "");
  const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get("niche") ?? "");
  const [employee, setEmployee]           = useState(() => searchParams.get("assignedTo") ?? "");
  const [leadQuality, setLeadQuality]     = useState(() => searchParams.get("leadQuality") ?? "");
  const [websiteStatus, setWebsiteStatus] = useState(() => searchParams.get("websiteStatus") ?? "");
  const [city, setCity]                   = useState(() => searchParams.get("city") ?? "");
  const [search, setSearch]               = useState(() => searchParams.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get("search") ?? "");
  const [fromDate, setFromDate]           = useState(() => searchParams.get("from") ?? "");
  const [toDate, setToDate]               = useState(() => searchParams.get("to") ?? "");
  const [filtersOpen, setFiltersOpen]     = useState(() => searchParams.get("status") !== null && searchParams.get("status") !== "");
  const [tierFilter, setTierFilter]       = useState(() => searchParams.get("tier") ?? "");
  const [sortOption, setSortOption]       = useState(() => searchParams.get("sort") ?? "priority_score");

  // pagination — resets on any filter change
  const [page, setPage] = useState(1);

  // other state
  const [selected, setSelected]       = useState<string[]>([]);
  const [reassignTo, setReassignTo]   = useState("");
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [drawerLeadId, setDrawerLeadId]   = useState<string | null>(null);

  // delete state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<"multi" | "niche">("multi");
  const [deleteNiche, setDeleteNiche] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { setPage(1); }, [status, niche, employee, leadQuality, websiteStatus, city, debouncedSearch, fromDate, toDate, tierFilter, sortOption]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const swrKey = `/leads?page=${page}&limit=20&status=${status}&niche=${encodeURIComponent(niche)}&assignedTo=${employee}&leadQuality=${leadQuality}&websiteStatus=${websiteStatus}&city=${city}&search=${debouncedSearch}&from=${fromDate}&to=${toDate}&tier=${tierFilter}&sort=${sortOption}`;

  const SWR_STATIC = { revalidateOnFocus: false, dedupingInterval: 30_000 } as const;

  const { data, isLoading, mutate } = useSWR(swrKey, leadsFetcher, { revalidateOnFocus: false });
  const { data: employees = [] }    = useSWR("admin-lead-employees", employeesFetcher, SWR_STATIC);
  const { data: stats }             = useSWR("admin-leads-stats", statsFetcher, SWR_STATIC);
  const { data: nichesData }        = useSWR("admin-lead-niches", nichesFetcher, { ...SWR_STATIC, dedupingInterval: 300_000 });
  const categories  = nichesData?.categories ?? [];
  const rawToBroad  = nichesData?.rawToBroad ?? {};

  const leads      = data?.leads ?? [];
  const pagination = data?.pagination;

  const activeFilterCount = [status, selectedCategory, employee, leadQuality, websiteStatus, city, fromDate, toDate, tierFilter]
    .filter(Boolean).length;

  function clearAll() {
    setStatus(""); setNiche(""); setSelectedCategory(""); setEmployee(""); setLeadQuality("");
    setWebsiteStatus(""); setCity(""); setSearch(""); setDebouncedSearch("");
    setFromDate(""); setToDate(""); setTierFilter(""); setSortOption("priority_score"); setPage(1);
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

  async function deleteSingleLead(id: string) {
    setDeleting(true);
    try {
      await apiFetch(`/leads/${id}`, { method: "DELETE" });
      setSelected((c) => c.filter((x) => x !== id));
      await mutate();
    } finally {
      setDeleting(false);
    }
  }

  async function deleteSelected() {
    if (selected.length === 0) return;
    setDeleting(true);
    try {
      await apiFetch("/leads/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids: selected }),
      });
      setSelected([]);
      await mutate();
      setDeleteModalOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  async function deleteByNiche() {
    if (!deleteNiche) return;
    setDeleting(true);
    try {
      // Find all raw DB values that map to this broad category
      const rawValues = Object.entries(rawToBroad)
        .filter(([, broad]) => broad === deleteNiche)
        .map(([raw]) => raw);
      // Also include the broad category itself in case some leads use it directly
      if (!rawValues.includes(deleteNiche)) rawValues.push(deleteNiche);

      await apiFetch("/leads/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ niche: deleteNiche, rawValues }),
      });
      setDeleteNiche("");
      await mutate();
      setDeleteModalOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4 pb-6">

      {/* ── PIPELINE SWITCHER ── */}
      <div className="flex gap-1 rounded-2xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setPipeline("website")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
            pipeline === "website" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <RiGlobeLine className="h-4 w-4" />
          Website / Portfolio
        </button>
        <button
          type="button"
          onClick={() => setPipeline("crm")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
            pipeline === "crm" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <RiShoppingCartLine className="h-4 w-4" />
          CRM Leads
        </button>
      </div>

      {/* ── CRM PIPELINE ── */}
      {pipeline === "crm" ? (
        <AdminCrmLeadsTab />
      ) : (<>

      {/* ── PAGE HEADER ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Manage</p>
          <h1 className="text-xl font-bold text-slate-950">All Leads</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => (window.location.href = "/admin/leads/new")} className="h-10 px-3">
            <RiAddLine className="h-4 w-4" />
            <span className="hidden sm:inline">Add</span>
          </Button>
          <Button variant="accent" onClick={handleAutoAssign} disabled={autoAssigning} className="h-10 px-3">
            <RiShuffleLine className="h-4 w-4" />
            <span className="hidden sm:inline">{autoAssigning ? "..." : "Auto-Assign"}</span>
          </Button>
          <Button variant="secondary" onClick={exportCsv} className="h-10 px-3">
            <RiDownloadLine className="h-4 w-4" />
          </Button>
          <Button variant="secondary" onClick={() => setDeleteModalOpen(true)} className="h-10 px-3 text-red-600 hover:text-red-700">
            <RiDeleteBin6Line className="h-4 w-4" />
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

      {/* ── TIER FILTER BUTTONS + SORT ── */}
      <div className="space-y-2">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {(
            [
          { key: "",     label: "All",  icon: null },
              { key: "hot",  label: "Hot",  icon: <RiFireLine className="h-3.5 w-3.5" /> },
              { key: "warm", label: "Warm", icon: <RiStarFill className="h-3.5 w-3.5" /> },
              { key: "cold", label: "Cold", icon: <RiSnowflakeLine className="h-3.5 w-3.5" /> },
            ] as { key: string; label: string; icon: React.ReactNode }[]
          ).map(({ key, label, icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => { setTierFilter(key); setPage(1); }}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 text-xs font-bold transition active:scale-[0.97] ${
                tierFilter === key
                  ? key === "hot"
                    ? "bg-red-500 text-white shadow-sm"
                    : key === "warm"
                    ? "bg-amber-400 text-white shadow-sm"
                    : key === "cold"
                    ? "bg-slate-400 text-white shadow-sm"
                    : "bg-slate-950 text-white shadow-sm"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <RiLineChartLine className="h-4 w-4 shrink-0 text-slate-400" />
          <select
            value={sortOption}
            onChange={(e) => { setSortOption(e.target.value); setPage(1); }}
            className="w-auto max-w-[220px] rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400"
          >
            <option value="priority_score">Score (Best First)</option>
            <option value="rating">Best Rating</option>
            <option value="review_count">Most Reviews</option>
            <option value="newest">Newest First</option>
          </select>
        </div>
      </div>

      {/* ── SEARCH + FILTER TOGGLE ── */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <RiSearchLine className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
          <RiEqualizerLine className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          ) : null}
          <RiArrowDownSLine className={`h-3.5 w-3.5 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
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
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
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
              <RiCloseLine className="h-4 w-4" />
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
            <RiCloseLine className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* ── LEAD LIST ── */}
      {isLoading ? (
        <div className="space-y-3">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : leads.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
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
              onDelete={(id) => deleteSingleLead(id)}
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
            <RiArrowLeftSLine className="h-4 w-4" />
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
            <RiArrowRightSLine className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <LeadDrawer
        leadId={drawerLeadId}
        onClose={() => setDrawerLeadId(null)}
        onUpdated={() => mutate()}
      />

      {/* ── DELETE MODAL ── */}
      {deleteModalOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-end bg-slate-950/60 backdrop-blur-sm sm:items-center sm:justify-center">
          <div className="w-full rounded-t-[28px] bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-[28px]">
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" />

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Delete Leads</h2>
                <p className="mt-0.5 text-sm text-slate-500">This action is permanent and cannot be undone.</p>
              </div>
              <button type="button" onClick={() => setDeleteModalOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200">
                <RiCloseLine className="h-4 w-4" />
              </button>
            </div>

            {/* Mode tabs */}
            <div className="flex gap-1 rounded-2xl bg-slate-100 p-1 mb-5">
              {([
                { key: "multi", label: `Selected (${selected.length})` },
                { key: "niche", label: "By Niche" },
              ] as { key: "multi" | "niche"; label: string }[]).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDeleteMode(key)}
                  className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    deleteMode === key ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Multi delete */}
            {deleteMode === "multi" ? (
              <div className="space-y-4">
                {selected.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center">
                    <p className="text-sm text-slate-500">No leads selected. Check the boxes on lead cards first.</p>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-red-50 px-4 py-4 ring-1 ring-red-200">
                    <p className="text-sm font-semibold text-red-800">{selected.length} lead{selected.length !== 1 ? "s" : ""} will be permanently deleted.</p>
                    <p className="mt-1 text-xs text-red-600">This cannot be undone.</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={deleteSelected}
                  disabled={selected.length === 0 || deleting}
                  className="w-full rounded-2xl bg-red-600 py-3.5 text-sm font-bold text-white hover:bg-red-700 transition disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : `Delete ${selected.length} Lead${selected.length !== 1 ? "s" : ""}`}
                </button>
              </div>
            ) : null}

            {/* Niche delete */}
            {deleteMode === "niche" ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Select niche to delete</label>
                  <Select value={deleteNiche} onChange={(e) => setDeleteNiche(e.target.value)}>
                    <option value="">— Choose a niche —</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </Select>
                </div>
                {deleteNiche ? (
                  <div className="rounded-2xl bg-red-50 px-4 py-4 ring-1 ring-red-200">
                    <p className="text-sm font-semibold text-red-800">All leads in <span className="font-bold">&ldquo;{deleteNiche}&rdquo;</span> will be permanently deleted.</p>
                    <p className="mt-1 text-xs text-red-600">This cannot be undone.</p>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={deleteByNiche}
                  disabled={!deleteNiche || deleting}
                  className="w-full rounded-2xl bg-red-600 py-3.5 text-sm font-bold text-white hover:bg-red-700 transition disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : `Delete All "${deleteNiche || "..."}" Leads`}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      </>) /* end website pipeline */}
    </div>
  );
}

/* ── ADMIN LEAD CARD ── */
function LeadCardAdmin({
  lead, employees, selected, onSelect, onView, onAssigned, onDelete,
}: {
  lead: LeadRecord;
  employees: Employee[];
  selected: boolean;
  onSelect: (v: boolean) => void;
  onView: () => void;
  onAssigned: () => void;
  onDelete: (id: string) => void;
}) {
  const cfg = statusConfig[lead.status];
  const lc = getLastContactInfo(lead);
  const lastContact = lc ? (lc.by ?? null) : null;
  const lastAction = lc ? (lc.action ?? null) : null;
  const [callModalOpen, setCallModalOpen] = useState(false);

  function handleCallClick() {
    window.location.href = `tel:${lead.phone}`;
    setCallModalOpen(true);
  }

  return (
    <>
      <div className={cn(
        "overflow-hidden rounded-2xl ring-1 transition-all",
        selected
          ? "ring-slate-950 shadow-md bg-white"
          : lead.status === "not_interested" || lead.status === "closed_lost"
          ? "bg-red-50 ring-red-200 shadow-sm"
          : lead.status === "interested" || lead.status === "closed_won" || lead.status === "converted"
          ? "bg-emerald-50 ring-emerald-200 shadow-sm"
          : "bg-white ring-slate-200 shadow-sm"
      )}>
        <div className="p-4 space-y-3">

          {/* ROW 1 — name + city/rating + delete + checkbox */}
          <div className="flex items-start gap-2 min-w-0">
            <div className="min-w-0 flex-1">
              <button type="button" onClick={onView} className="text-left w-full">
                <p className="truncate text-[15px] font-bold text-slate-950 hover:text-slate-700 pr-1">{lead.name}</p>
              </button>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0 text-xs text-slate-500">
                {lead.rating != null ? (
                  <span className="inline-flex items-center gap-0.5 font-semibold text-amber-600">
                    <RiStarFill className="h-3 w-3 text-amber-400" />
                    {lead.rating}
                    {lead.reviewCount != null ? ` (${lead.reviewCount})` : ""}
                  </span>
                ) : null}
                {lead.city ? <><span className="text-slate-300">·</span><span className="truncate">{lead.city}</span></> : null}
              </p>
            </div>
            {/* Controls — always on right, never pushed out */}
            <div className="flex shrink-0 items-center gap-1.5 ml-1">
              <button
                type="button"
                onClick={() => onDelete(lead._id)}
                className="flex h-7 w-7 items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition"
                title="Delete lead"
              >
                <RiDeleteBin6Line className="h-3.5 w-3.5" />
              </button>
              <label className="flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(e) => onSelect(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-slate-950"
                />
              </label>
            </div>
          </div>

          {/* ROW 2 — niche + tier + status + score badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <NicheBadge niche={lead.niche} />
            {lead.tier ? <TierBadge tier={lead.tier} label={lead.tierLabel} /> : null}
            {cfg ? (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${cfg.className}`}>
                {cfg.label}
              </span>
            ) : null}
            {/* Scraper score badge */}
            {(lead.leadScore ?? lead.score) != null ? (
              <span className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset",
                (lead.leadScore ?? lead.score ?? 0) >= 80
                  ? "bg-red-50 text-red-700 ring-red-200"
                  : (lead.leadScore ?? lead.score ?? 0) >= 60
                  ? "bg-amber-50 text-amber-700 ring-amber-200"
                  : "bg-slate-100 text-slate-500 ring-slate-200"
              )}>
                <RiBarChartLine className="h-2.5 w-2.5" />
                {lead.leadScore ?? lead.score}
              </span>
            ) : null}
            {lc ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                {lastAction === "whatsapped"
                  ? <RiWhatsappLine className="h-3 w-3 text-[#1a9e4a]" />
                  : <RiPhoneLine className="h-3 w-3 text-blue-500" />}
                {lastAction === "whatsapped" ? "WA" : "Called"}&nbsp;·&nbsp;{lastContact ?? "Team member"}&nbsp;·&nbsp;{formatReadableDateTime(lc.at)}
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
            <button
              type="button"
              onClick={handleCallClick}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-emerald-500 text-sm font-semibold text-white active:scale-[0.97] hover:bg-emerald-600 transition"
            >
              <RiPhoneLine className="h-4 w-4" />
              Call
            </button>
            <a
              href={getWaUrl(lead)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-[#25D366] text-sm font-semibold text-white active:scale-[0.97] hover:bg-[#1fba58] transition"
            >
              <RiWhatsappLine className="h-4 w-4" />
              WA
            </a>
            <button
              type="button"
              onClick={onView}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 active:scale-[0.97] hover:bg-slate-200 transition"
            >
              <RiEyeLine className="h-4 w-4" />
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

      <CallUpdateModal
        lead={lead}
        open={callModalOpen}
        onClose={() => setCallModalOpen(false)}
        onSaved={async () => { onAssigned(); }}
      />
    </>
  );
}
