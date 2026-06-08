"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Download, Grid2X2, List, MessageCircle, PhoneCall, Plus, Search, Shuffle, SlidersHorizontal, Star } from "lucide-react";
import { Card, EmptyState, Input, Select, SectionTitle, Button, SkeletonCard } from "@/components/ui";
import { LeadQualityBadge, NicheBadge } from "@/components/badges";
import { type LeadRecord } from "@/components/lead-utils";
import { LeadDrawer } from "@/components/lead-drawer";
import { apiFetch } from "@/lib/http";
import { statusConfig, ALL_STATUSES } from "@/lib/ui";

type Employee = { _id: string; name: string };
type LeadPageResponse = { leads: LeadRecord[]; pagination: { page: number; pages: number; total: number; limit: number } };
type Stats = { total: number; new_today: number; contacted: number; interested: number; follow_ups_today: number };

const leadsFetcher = async (path: string) => (await apiFetch<LeadPageResponse>(path)).data;
const employeesFetcher = async () => (await apiFetch<{ employees: Employee[] }>("/users/employees")).data?.employees ?? [];
const statsFetcher = async () => (await apiFetch<Stats>("/leads/stats")).data ?? null;

function buildCsv(leads: LeadRecord[]) {
  const header = ["Business Name", "Owner", "Phone", "WhatsApp", "Niche", "Status", "Lead Quality", "City", "Rating", "Score"];
  const rows = leads.map((lead) => [
    lead.name,
    lead.ownerName ?? "",
    lead.phone,
    lead.whatsapp ?? "",
    lead.niche,
    lead.status,
    lead.leadQuality,
    lead.city ?? "",
    lead.rating ?? "",
    lead.score ?? "",
  ]);
  return [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
}

function getWhatsAppUrl(lead: LeadRecord) {
  const number = (lead.whatsapp || lead.phone).replace(/\D/g, "");
  const message = lead.pitchMessage
    ? encodeURIComponent(lead.pitchMessage)
    : encodeURIComponent(`Namaste! ${lead.name} wale hain aap? Main aapke business ke baare mein baat karna chahta tha.`);
  return `https://wa.me/${number}?text=${message}`;
}

function AssignDropdown({ lead, employees, onAssigned }: { lead: LeadRecord; employees: Employee[]; onAssigned: () => void }) {
  const currentAssignee = typeof lead.assignedTo === "object" && lead.assignedTo !== null ? lead.assignedTo._id : (lead.assignedTo as string | null | undefined) ?? "";
  const [value, setValue] = useState(currentAssignee);
  const [saving, setSaving] = useState(false);

  async function assign(newValue: string) {
    setValue(newValue);
    setSaving(true);
    try {
      await apiFetch(`/leads/${lead._id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ assignedTo: newValue || null }),
      });
      onAssigned();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Select
      value={value}
      onChange={(event) => assign(event.target.value)}
      disabled={saving}
      className="h-9 text-xs"
    >
      <option value="">Unassigned</option>
      {employees.map((emp) => (
        <option key={emp._id} value={emp._id}>
          {emp.name}
        </option>
      ))}
    </Select>
  );
}

export default function AdminLeadsPage() {
  const [view, setView] = useState<"table" | "cards">("cards");
  const [status, setStatus] = useState("");
  const [niche, setNiche] = useState("");
  const [employee, setEmployee] = useState("");
  const [leadQuality, setLeadQuality] = useState("");
  const [websiteStatus, setWebsiteStatus] = useState("");
  const [city, setCity] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [reassignTo, setReassignTo] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [drawerLeadId, setDrawerLeadId] = useState<string | null>(null);

  const { data, isLoading, mutate } = useSWR(
    `/leads?page=${page}&limit=20&status=${status}&niche=${niche}&assignedTo=${employee}&leadQuality=${leadQuality}&websiteStatus=${websiteStatus}&city=${city}&search=${debouncedSearch}&from=${fromDate}&to=${toDate}`,
    leadsFetcher
  );
  const { data: employees = [] } = useSWR("admin-lead-employees", employeesFetcher);
  const { data: stats } = useSWR("admin-leads-stats", statsFetcher);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const leads = data?.leads ?? [];
  const pagination = data?.pagination;

  async function reassignSelected() {
    await Promise.all(selected.map((leadId) => apiFetch(`/leads/${leadId}/assign`, { method: "PATCH", body: JSON.stringify({ assignedTo: reassignTo || null }) })));
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
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "expectocrm-leads.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Manage"
        title="All leads"
        description="Filter, assign, and export your complete lead pipeline."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => (window.location.href = "/admin/leads/new")}>
              <Plus className="h-4 w-4" />
              Add Lead
            </Button>
            <Button variant="accent" onClick={handleAutoAssign} disabled={autoAssigning}>
              <Shuffle className="h-4 w-4" />
              {autoAssigning ? "Assigning..." : "Auto-Assign"}
            </Button>
            <Button variant="secondary" onClick={exportCsv}>
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button variant={view === "cards" ? "primary" : "secondary"} onClick={() => setView("cards")}>
              <Grid2X2 className="h-4 w-4" />
            </Button>
            <Button variant={view === "table" ? "primary" : "secondary"} onClick={() => setView("table")}>
              <List className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* STATS BAR */}
      {stats ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total", value: stats.total, filter: "", color: "text-slate-700" },
            { label: "New Today", value: stats.new_today, filter: "new_today", color: "text-blue-700" },
            { label: "Contacted", value: stats.contacted, filter: "reached_out", color: "text-emerald-700" },
            { label: "Interested 🔥", value: stats.interested, filter: "interested", color: "text-orange-700" },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => item.filter && setStatus(item.filter)}
              className="flex flex-col items-center rounded-2xl bg-white px-3 py-4 text-center ring-1 ring-slate-200 transition hover:bg-slate-50 active:scale-[0.98]"
            >
              <span className={`text-2xl font-bold ${item.color}`}>{item.value}</span>
              <span className="mt-1 text-xs font-semibold text-slate-500">{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      <Card className="space-y-3">
        <div className="grid gap-3 xl:grid-cols-3">
          <div className="relative xl:col-span-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or phone" className="pl-11" />
          </div>
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All status</option>
            {ALL_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
        </div>

        <div className="grid gap-3 xl:grid-cols-5">
          <Input placeholder="Niche" value={niche} onChange={(event) => setNiche(event.target.value)} />
          <Input placeholder="City" value={city} onChange={(event) => setCity(event.target.value)} />
          <Select value={leadQuality} onChange={(event) => setLeadQuality(event.target.value)}>
            <option value="">All quality</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
          </Select>
          <Select value={websiteStatus} onChange={(event) => setWebsiteStatus(event.target.value)}>
            <option value="">Website status</option>
            <option value="no_website">No Website</option>
            <option value="has_website">Has Website</option>
            <option value="website_is_bad">Website Is Bad</option>
          </Select>
          <Select value={employee} onChange={(event) => setEmployee(event.target.value)}>
            <option value="">All employees</option>
            {employees.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          <Button variant="secondary" onClick={() => {
            setStatus(""); setNiche(""); setEmployee(""); setLeadQuality("");
            setWebsiteStatus(""); setCity(""); setSearch(""); setDebouncedSearch("");
            setFromDate(""); setToDate(""); setPage(1);
          }}>
            <SlidersHorizontal className="h-4 w-4" />
            Clear filters
          </Button>
        </div>
      </Card>

      {selected.length ? (
        <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-slate-950">{selected.length} leads selected</p>
          <div className="flex gap-2">
            <Select value={reassignTo} onChange={(event) => setReassignTo(event.target.value)} className="max-w-52">
              <option value="">Reassign to...</option>
              {employees.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name}
                </option>
              ))}
            </Select>
            <Button onClick={reassignSelected}>Reassign</Button>
          </div>
        </Card>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : leads.length ? (
        view === "cards" ? (
          <div className="space-y-3">
            {leads.map((lead) => (
              <Card key={lead._id} className="overflow-hidden p-0">
                <div className="space-y-3 p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-950">{lead.name}</h3>
                      <p className="mt-0.5 text-sm text-slate-600">
                        {lead.ownerName ?? "No owner"} · {lead.city ?? "No city"}
                      </p>
                      {lead.rating != null ? (
                        <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-amber-600">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {lead.rating}
                          {lead.reviewCount != null ? ` (${lead.reviewCount})` : ""}
                          {lead.score != null ? <span className="ml-1 text-slate-400">· Score: {lead.score}</span> : null}
                        </p>
                      ) : null}
                    </div>
                    <NicheBadge niche={lead.niche} />
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <LeadQualityBadge quality={lead.leadQuality} />
                    {(() => {
                      const cfg = statusConfig[lead.status];
                      return cfg ? (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${cfg.className}`}>
                          {cfg.emoji} {cfg.label}
                        </span>
                      ) : null;
                    })()}
                    <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-slate-500">
                      <input
                        type="checkbox"
                        checked={selected.includes(lead._id)}
                        onChange={(event) => setSelected((current) =>
                          event.target.checked ? [...current, lead._id] : current.filter((id) => id !== lead._id)
                        )}
                        className="h-4 w-4 rounded"
                      />
                      Select
                    </label>
                  </div>

                  {/* Pitch message */}
                  {lead.pitchMessage ? (
                    <div className="rounded-2xl bg-blue-50 p-3 ring-1 ring-blue-200">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-700">Pitch message</p>
                      <p className="mt-1 line-clamp-2 text-sm text-blue-950">{lead.pitchMessage}</p>
                    </div>
                  ) : lead.strongHook ? (
                    <div className="rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700">Why call?</p>
                      <p className="mt-1 text-sm text-amber-950">{lead.strongHook}</p>
                    </div>
                  ) : null}

                  {/* Action buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <a
                      href={`tel:${lead.phone}`}
                      className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-3 text-sm font-semibold text-white transition active:scale-[0.98]"
                    >
                      <PhoneCall className="h-4 w-4" />
                      Call
                    </a>
                    <a
                      href={getWhatsAppUrl(lead)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-3 text-sm font-semibold text-white transition active:scale-[0.98]"
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </a>
                    <button
                      type="button"
                      onClick={() => setDrawerLeadId(lead._id)}
                      className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-slate-100 px-3 text-sm font-semibold text-slate-700 transition active:scale-[0.98]"
                    >
                      View
                    </button>
                  </div>
                </div>

                {/* Assign row */}
                <div className="flex items-center gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold text-slate-500">Assign to:</p>
                  <div className="flex-1">
                    <AssignDropdown lead={lead} employees={employees} onAssigned={() => mutate()} />
                  </div>
                  {lead.phone ? (
                    <p className="shrink-0 text-xs text-slate-400">{lead.phone}</p>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">Select</th>
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3">Niche</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Quality</th>
                  <th className="px-4 py-3">Assign</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead._id} className="border-t border-slate-200">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(lead._id)}
                        onChange={(event) => setSelected((current) =>
                          event.target.checked ? [...current, lead._id] : current.filter((id) => id !== lead._id)
                        )}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-950">{lead.name}</p>
                      <p className="text-xs text-slate-500">{lead.city ?? ""}</p>
                      {lead.rating != null ? (
                        <p className="flex items-center gap-1 text-xs text-amber-600">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {lead.rating}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3"><NicheBadge niche={lead.niche} /></td>
                    <td className="px-4 py-3 text-xs text-slate-600">{lead.phone}</td>
                    <td className="px-4 py-3">{(() => {
                      const cfg = statusConfig[lead.status];
                      return cfg ? <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${cfg.className}`}>{cfg.emoji} {cfg.label}</span> : <span>{lead.status}</span>;
                    })()}</td>
                    <td className="px-4 py-3"><LeadQualityBadge quality={lead.leadQuality} /></td>
                    <td className="px-4 py-3 min-w-[160px]">
                      <AssignDropdown lead={lead} employees={employees} onAssigned={() => mutate()} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <a href={`tel:${lead.phone}`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white">
                          <PhoneCall className="h-3.5 w-3.5" />Call
                        </a>
                        <a href={getWhatsAppUrl(lead)} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-2 text-xs font-semibold text-white">
                          <MessageCircle className="h-3.5 w-3.5" />WA
                        </a>
                        <button type="button" onClick={() => setDrawerLeadId(lead._id)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      ) : (
        <EmptyState title="No leads found" description="Try broadening the filters or clearing the search." />
      )}

      {pagination ? (
        <div className="flex items-center justify-between">
          <Button variant="secondary" disabled={pagination.page <= 1} onClick={() => setPage((value) => Math.max(value - 1, 1))}>
            Previous
          </Button>
          <p className="text-sm text-slate-600">
            Page {pagination.page} of {pagination.pages} · {pagination.total} leads
          </p>
          <Button variant="secondary" disabled={pagination.page >= pagination.pages} onClick={() => setPage((value) => value + 1)}>
            Next
          </Button>
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
