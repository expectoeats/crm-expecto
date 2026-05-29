"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Download, Grid2X2, List, Search, SlidersHorizontal } from "lucide-react";
import { Card, EmptyState, Input, Select, SectionTitle, Button, SkeletonCard } from "@/components/ui";
import { LeadCard, type LeadRecord } from "@/components/lead-utils";
import { StatusBadge } from "@/components/badges";
import { apiFetch } from "@/lib/http";

type Employee = { _id: string; name: string };
type LeadPageResponse = { leads: LeadRecord[]; pagination: { page: number; pages: number; total: number; limit: number } };

const leadsFetcher = async (path: string) => (await apiFetch<LeadPageResponse>(path)).data;
const employeesFetcher = async () => (await apiFetch<{ employees: Employee[] }>("/users/employees")).data?.employees ?? [];

function buildCsv(leads: LeadRecord[]) {
  const header = ["Business Name", "Owner", "Phone", "Niche", "Status", "Lead Quality", "City"];
  const rows = leads.map((lead) => [lead.name, lead.ownerName ?? "", lead.phone, lead.niche, lead.status, lead.leadQuality, lead.city ?? ""]);
  return [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
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

  const { data, isLoading } = useSWR(
    `/leads?page=${page}&limit=20&status=${status}&niche=${niche}&assignedTo=${employee}&leadQuality=${leadQuality}&websiteStatus=${websiteStatus}&city=${city}&search=${debouncedSearch}&from=${fromDate}&to=${toDate}`,
    leadsFetcher
  );
  const { data: employees = [] } = useSWR("admin-lead-employees", employeesFetcher);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const leads = data?.leads ?? [];
  const pagination = data?.pagination;

  async function reassignSelected() {
    await Promise.all(selected.map((leadId) => apiFetch(`/leads/${leadId}/assign`, { method: "PATCH", body: JSON.stringify({ assignedTo: reassignTo || null }) })));
    setSelected([]);
    window.location.reload();
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
          <div className="flex gap-2">
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

      <Card className="space-y-3">
        <div className="grid gap-3 xl:grid-cols-3">
          <div className="relative xl:col-span-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or phone" className="pl-11" />
          </div>
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All status</option>
            <option value="new">New</option>
            <option value="called">Called</option>
            <option value="interested">Interested</option>
            <option value="callback">Callback</option>
            <option value="proposal_sent">Proposal sent</option>
            <option value="closed_won">Closed won</option>
            <option value="closed_lost">Closed lost</option>
            <option value="not_interested">Not interested</option>
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
            setStatus("");
            setNiche("");
            setEmployee("");
            setLeadQuality("");
            setWebsiteStatus("");
            setCity("");
            setSearch("");
            setDebouncedSearch("");
            setFromDate("");
            setToDate("");
            setPage(1);
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
              <div key={lead._id} className="space-y-2">
                <LeadCard lead={lead} />
                <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" checked={selected.includes(lead._id)} onChange={(event) => {
                      setSelected((current) => event.target.checked ? [...current, lead._id] : current.filter((id) => id !== lead._id));
                    }} />
                    Select
                  </label>
                  <StatusBadge status={lead.status} />
                </div>
              </div>
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
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Lead Quality</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead._id} className="border-t border-slate-200">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(lead._id)}
                        onChange={(event) => setSelected((current) => event.target.checked ? [...current, lead._id] : current.filter((id) => id !== lead._id))}
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-950">{lead.name}</td>
                    <td className="px-4 py-3">{lead.niche}</td>
                    <td className="px-4 py-3">{lead.ownerName ?? "-"}</td>
                    <td className="px-4 py-3">{lead.phone}</td>
                    <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                    <td className="px-4 py-3">{lead.leadQuality}</td>
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
            Page {pagination.page} of {pagination.pages}
          </p>
          <Button variant="secondary" disabled={pagination.page >= pagination.pages} onClick={() => setPage((value) => value + 1)}>
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
