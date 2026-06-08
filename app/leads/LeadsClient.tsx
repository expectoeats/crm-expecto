"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { CheckCircle2, Clock, Filter, Inbox, Search, Sparkles } from "lucide-react";
import { EmployeeShell } from "@/components/employee-shell";
import { EmptyState, Input, SkeletonCard } from "@/components/ui";
import { LeadCard, type LeadRecord } from "@/components/lead-utils";
import { apiFetch } from "@/lib/http";

const fetcher = async (path: string) =>
  (await apiFetch<{ leads: LeadRecord[] }>(path)).data?.leads ?? [];

function startOfIstDate(value: Date) {
  return value.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

const ACTIVE_STATUSES = new Set(["new"]);
const CONTACTED_STATUSES = new Set([
  "called",
  "interested",
  "callback",
  "proposal_sent",
  "closed_won",
  "closed_lost",
  "not_interested",
]);

type Tab = "active" | "contacted";

export default function LeadsClient({
  initialStatus = "",
  initialFollowupOnly = false,
}: {
  initialStatus?: string;
  initialFollowupOnly?: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("active");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [followupOnly, setFollowupOnly] = useState(initialFollowupOnly);

  // If an explicit status filter was passed in URL, auto-switch tab
  useEffect(() => {
    if (initialStatus && CONTACTED_STATUSES.has(initialStatus)) {
      setTab("contacted");
    }
  }, [initialStatus]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const { data: leads, isLoading } = useSWR(`/leads/my`, fetcher);

  const { activeLeads, contactedLeads } = useMemo(() => {
    const today = startOfIstDate(new Date());
    const all = leads ?? [];

    const active = all
      .filter((l) => ACTIVE_STATUSES.has(l.status))
      .filter((l) => {
        const q = debouncedSearch.trim().toLowerCase();
        return !q || `${l.name} ${l.phone} ${l.ownerName ?? ""}`.toLowerCase().includes(q);
      })
      .filter((l) => {
        if (!followupOnly) return true;
        return l.followUpDate
          ? startOfIstDate(new Date(l.followUpDate)) === today
          : false;
      })
      .sort((a, b) => {
        // HOT first, then WARM, then by score desc
        const qualityOrder: Record<string, number> = { hot: 0, warm: 1, cold: 2 };
        const qa = qualityOrder[a.leadQuality] ?? 3;
        const qb = qualityOrder[b.leadQuality] ?? 3;
        if (qa !== qb) return qa - qb;
        return (b.score ?? 0) - (a.score ?? 0);
      });

    const contacted = all
      .filter((l) => CONTACTED_STATUSES.has(l.status))
      .filter((l) => {
        const q = debouncedSearch.trim().toLowerCase();
        return !q || `${l.name} ${l.phone} ${l.ownerName ?? ""}`.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        // Most recently updated first
        return (
          new Date(b.updatedAt ?? 0).getTime() -
          new Date(a.updatedAt ?? 0).getTime()
        );
      });

    return { activeLeads: active, contactedLeads: contacted };
  }, [leads, debouncedSearch, followupOnly]);

  const currentLeads = tab === "active" ? activeLeads : contactedLeads;

  return (
    <EmployeeShell>
      <div className="space-y-4">

        {/* Search bar — always visible */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone…"
            className="pl-11"
          />
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 rounded-2xl bg-slate-100 p-1">
          <TabButton
            active={tab === "active"}
            onClick={() => setTab("active")}
            icon={<Sparkles className="h-4 w-4" />}
            label="Active"
            count={isLoading ? null : activeLeads.length}
            countColor="bg-emerald-500"
          />
          <TabButton
            active={tab === "contacted"}
            onClick={() => setTab("contacted")}
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Contacted"
            count={isLoading ? null : contactedLeads.length}
            countColor="bg-slate-400"
          />
        </div>

        {/* Follow-up filter — only on active tab */}
        {tab === "active" ? (
          <button
            type="button"
            onClick={() => {
              setFollowupOnly((v) => !v);
              router.replace(followupOnly ? "/leads" : "/leads?followup=today");
            }}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              followupOnly
                ? "bg-orange-500 text-white shadow-sm"
                : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {followupOnly ? (
              <Clock className="h-4 w-4" />
            ) : (
              <Filter className="h-4 w-4" />
            )}
            {followupOnly
              ? "Showing today's follow-ups"
              : "Filter: today's follow-ups"}
          </button>
        ) : null}

        {/* Section header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            {tab === "active" ? (
              <>
                <Inbox className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">
                  Fresh leads to contact
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">
                  Contact history
                </span>
              </>
            )}
          </div>
          {!isLoading ? (
            <span className="text-xs text-slate-400">
              {currentLeads.length} lead{currentLeads.length !== 1 ? "s" : ""}
            </span>
          ) : null}
        </div>

        {/* Lead list */}
        {isLoading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : currentLeads.length ? (
          <div className="space-y-3">
            {currentLeads.map((lead) => (
              <LeadCard key={lead._id} lead={lead} />
            ))}
          </div>
        ) : tab === "active" ? (
          <EmptyState
            title="No active leads"
            description={
              followupOnly
                ? "No follow-ups scheduled for today."
                : "All leads have been contacted. Check the Contacted tab."
            }
            action={
              followupOnly ? (
                <button
                  type="button"
                  onClick={() => setFollowupOnly(false)}
                  className="mt-2 text-sm font-semibold text-slate-700 underline underline-offset-4"
                >
                  Show all active leads
                </button>
              ) : undefined
            }
          />
        ) : (
          <EmptyState
            title="No contacted leads yet"
            description="Once you call or WhatsApp a lead, it will appear here."
          />
        )}
      </div>
    </EmployeeShell>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
  countColor,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number | null;
  countColor: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
        active
          ? "bg-white text-slate-950 shadow-sm"
          : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {icon}
      {label}
      {count !== null ? (
        <span
          className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white ${countColor}`}
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  );
}
