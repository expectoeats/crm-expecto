"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Filter, Search } from "lucide-react";
import { EmployeeShell } from "@/components/employee-shell";
import { Card, EmptyState, Input, Select, SkeletonCard, SectionTitle } from "@/components/ui";
import { LeadCard, type LeadRecord } from "@/components/lead-utils";
import { apiFetch } from "@/lib/http";

const fetcher = async (path: string) => (await apiFetch<{ leads: LeadRecord[] }>(path)).data?.leads ?? [];

function startOfIstDate(value: Date) {
  return value.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export default function LeadsClient({
  initialStatus = "",
  initialFollowupOnly = false,
}: {
  initialStatus?: string;
  initialFollowupOnly?: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [followupOnly, setFollowupOnly] = useState(initialFollowupOnly);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const { data: leads, isLoading } = useSWR(`/leads/my?status=${encodeURIComponent(status)}`, fetcher);

  const filteredLeads = useMemo(() => {
    const today = startOfIstDate(new Date());
    const source = [...(leads ?? [])];
    const searched = source.filter((lead) => {
      const query = debouncedSearch.trim().toLowerCase();
      const matchesSearch = !query || `${lead.name} ${lead.phone} ${lead.ownerName ?? ""}`.toLowerCase().includes(query);
      const matchesFollowUp = !followupOnly || (lead.followUpDate ? startOfIstDate(new Date(lead.followUpDate)) === today : false);
      return matchesSearch && matchesFollowUp;
    });

    return searched.sort((left, right) => {
      const leftFollow = left.followUpDate ? new Date(left.followUpDate).getTime() : Number.MAX_SAFE_INTEGER;
      const rightFollow = right.followUpDate ? new Date(right.followUpDate).getTime() : Number.MAX_SAFE_INTEGER;
      if (leftFollow !== rightFollow) return leftFollow - rightFollow;
      if (left.status === "new" && right.status !== "new") return -1;
      if (right.status === "new" && left.status !== "new") return 1;
      return new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime();
    });
  }, [debouncedSearch, followupOnly, leads]);

  return (
    <EmployeeShell>
      <div className="space-y-5">
        <Card className="sticky top-[78px] z-10 space-y-3 border-slate-200/80">
          <SectionTitle eyebrow="Lead list" title="Your assigned leads" description="Search, filter, and call in one thumb-friendly view." />
          <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or phone" className="pl-11" />
            </div>
            <Select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
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

          <button
            type="button"
            onClick={() => {
              setFollowupOnly((value) => !value);
              router.replace(followupOnly ? "/leads" : "/leads?followup=today");
            }}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${followupOnly ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-700"}`}
          >
            <Filter className="h-4 w-4" />
            {followupOnly ? "Showing today's follow-ups" : "Show today's follow-ups first"}
          </button>
        </Card>

        {isLoading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : filteredLeads.length ? (
          <div className="space-y-3">
            {filteredLeads.map((lead) => (
              <LeadCard key={lead._id} lead={lead} />
            ))}
          </div>
        ) : (
          <EmptyState title="No matching leads" description="Try a different search or clear the filters." />
        )}
      </div>
    </EmployeeShell>
  );
}

