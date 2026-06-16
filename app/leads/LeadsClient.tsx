"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  Bell, CheckCircle2, Clock, Filter, Inbox, Search, Sparkles, TrendingUp, Globe, ShoppingCart,
} from "lucide-react";
import { EmployeeShell } from "@/components/employee-shell";
import { EmptyState, Input, SkeletonCard } from "@/components/ui";
import { LeadCard, type LeadRecord } from "@/components/lead-utils";
import { LeadDrawer } from "@/components/lead-drawer";
import { CrmLeadsTab } from "@/components/crm-leads-tab";
import { apiFetch } from "@/lib/http";
import { ACTIVE_STATUSES, CONTACTED_STATUSES } from "@/lib/ui";

type Stats = { total: number; new_today: number; contacted: number; interested: number; follow_ups_today: number };

const fetcher = async (path: string) =>
  (await apiFetch<{ leads: LeadRecord[] }>(path)).data?.leads ?? [];
const statsFetcher = async () =>
  (await apiFetch<Stats>("/leads/stats")).data ?? null;
const meFetcher = async () =>
  (await apiFetch<{ user: { id: string; name: string; role: string } }>("/auth/me")).data?.user ?? null;

function startOfIstDate(value: Date) {
  return value.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

type Tab = "active" | "contacted";
type TierFilter = "all" | "hot" | "warm" | "cold";
type SortOption = "priority_score" | "rating" | "review_count" | "newest";
type Pipeline = "website" | "crm";

export default function LeadsClient({
  initialStatus = "",
  initialFollowupOnly = false,
}: {
  initialStatus?: string;
  initialFollowupOnly?: boolean;
}) {
  const router = useRouter();
  const [pipeline, setPipeline] = useState<Pipeline>("website");
  const [tab, setTab] = useState<Tab>("active");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [followupOnly, setFollowupOnly] = useState(initialFollowupOnly);
  const [drawerLeadId, setDrawerLeadId] = useState<string | null>(null);
  const [activeStatFilter, setActiveStatFilter] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("priority_score");
  const lastPollRef = useRef(new Date().toISOString());

  useEffect(() => {
    if (initialStatus && CONTACTED_STATUSES.includes(initialStatus)) setTab("contacted");
  }, [initialStatus]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: leads, isLoading, mutate } = useSWR(`/leads/my`, fetcher);
  const { data: stats, mutate: mutateStats } = useSWR("/leads/stats", statsFetcher);
  const { data: currentUser } = useSWR("employee-me", meFetcher);

  // 15-second polling for real-time updates
  const poll = useCallback(async () => {
    try {
      const res = await apiFetch<{ leads: LeadRecord[] }>(
        `/leads/recent-updates?since=${encodeURIComponent(lastPollRef.current)}`
      );
      if ((res.data?.leads?.length ?? 0) > 0) {
        lastPollRef.current = new Date().toISOString();
        await mutate();
        await mutateStats();
      }
    } catch { /* silent */ }
  }, [mutate, mutateStats]);

  useEffect(() => {
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, [poll]);

  const { activeLeads, contactedLeads } = useMemo(() => {
    const today = startOfIstDate(new Date());
    const all = leads ?? [];

    function applySort(arr: LeadRecord[]): LeadRecord[] {
      return [...arr].sort((a, b) => {
        if (sortOption === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
        if (sortOption === "review_count") return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
        if (sortOption === "newest") return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
        // default: priority_score
        return (b.priority_score ?? b.score ?? 0) - (a.priority_score ?? a.score ?? 0);
      });
    }

    const active = applySort(
      all
        .filter((l) => ACTIVE_STATUSES.includes(l.status))
        .filter((l) => {
          if (!activeStatFilter) return true;
          if (activeStatFilter === "new_today") {
            const created = startOfIstDate(new Date(l.createdAt ?? 0));
            return created === today;
          }
          return true;
        })
        .filter((l) => {
          if (tierFilter === "all") return true;
          return l.tier === tierFilter;
        })
        .filter((l) => {
          const q = debouncedSearch.trim().toLowerCase();
          return !q || `${l.name} ${l.phone} ${l.ownerName ?? ""}`.toLowerCase().includes(q);
        })
        .filter((l) => {
          if (!followupOnly) return true;
          return l.followUpDate ? startOfIstDate(new Date(l.followUpDate)) === today : false;
        })
    );

    const contacted = all
      .filter((l) => CONTACTED_STATUSES.includes(l.status))
      .filter((l) => {
        const q = debouncedSearch.trim().toLowerCase();
        return !q || `${l.name} ${l.phone} ${l.ownerName ?? ""}`.toLowerCase().includes(q);
      })
      .sort((a, b) =>
        new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime()
      );

    return { activeLeads: active, contactedLeads: contacted };
  }, [leads, debouncedSearch, followupOnly, activeStatFilter, tierFilter, sortOption]);

  const currentLeads = tab === "active" ? activeLeads : contactedLeads;
  const followUpsToday = stats?.follow_ups_today ?? 0;

  function handleStatClick(filter: string) {
    if (filter === "contacted") { setTab("contacted"); setActiveStatFilter(null); return; }
    if (filter === "interested") { setTab("contacted"); setActiveStatFilter(null); return; }
    setTab("active");
    setActiveStatFilter(activeStatFilter === filter ? null : filter);
  }

  return (
    <EmployeeShell followUpCount={followUpsToday}>
      <div className="space-y-4">

        {/* PIPELINE SWITCHER */}
        <div className="flex gap-1 rounded-2xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setPipeline("website")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              pipeline === "website" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Globe className="h-4 w-4" />
            Website Leads
          </button>
          <button
            type="button"
            onClick={() => setPipeline("crm")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              pipeline === "crm" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            CRM Leads
          </button>
        </div>

        {/* CRM PIPELINE */}
        {pipeline === "crm" ? (
          <CrmLeadsTab />
        ) : (

        /* WEBSITE PIPELINE — existing UI below */
        <div className="space-y-4">

        {/* STATS BAR */}
        {stats ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatPill
              label="Total"
              value={stats.total}
              active={false}
              onClick={() => { setTab("active"); setActiveStatFilter(null); }}
              color="text-slate-700"
            />
            <StatPill
              label="New Today"
              value={stats.new_today}
              active={activeStatFilter === "new_today"}
              onClick={() => handleStatClick("new_today")}
              color="text-blue-700"
            />
            <StatPill
              label="Contacted"
              value={stats.contacted}
              active={tab === "contacted" && !activeStatFilter}
              onClick={() => handleStatClick("contacted")}
              color="text-emerald-700"
            />
            <StatPill
              label="Interested"
              value={stats.interested}
              active={false}
              onClick={() => handleStatClick("interested")}
              color="text-orange-700"
            />
          </div>
        ) : null}

        {/* Follow-up today banner */}
        {followUpsToday > 0 ? (
          <button
            type="button"
            onClick={() => { setFollowupOnly(true); setTab("active"); router.replace("/leads?followup=today"); }}
            className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-purple-500 to-violet-600 px-4 py-3 text-left text-white shadow-sm"
          >
            <Bell className="h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold">
                {followUpsToday} Follow-up{followUpsToday !== 1 ? "s" : ""} Today
              </p>
              <p className="text-xs text-white/80">Tap to see follow-ups</p>
            </div>
          </button>
        ) : null}

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

        {/* TIER FILTER BUTTONS + SORT */}
        {tab === "active" ? (
          <div className="space-y-2">
            {/* Tier filter row */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {(
                [
                  { key: "all", label: "📋 All" },
                  { key: "hot", label: "🔥 Hot" },
                  { key: "warm", label: "⚡ Warm" },
                  { key: "cold", label: "🧊 Cold" },
                ] as { key: TierFilter; label: string }[]
              ).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTierFilter(key)}
                  className={`shrink-0 rounded-2xl px-4 py-2 text-xs font-bold transition ${
                    tierFilter === key
                      ? key === "hot"
                        ? "bg-red-500 text-white shadow-sm"
                        : key === "warm"
                        ? "bg-amber-400 text-white shadow-sm"
                        : key === "cold"
                        ? "bg-slate-400 text-white shadow-sm"
                        : "bg-slate-950 text-white shadow-sm"
                      : "bg-white text-slate-600 ring-1 ring-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Sort dropdown */}
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 shrink-0 text-slate-400" />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400"
              >
                <option value="priority_score">🏆 Score (Best First)</option>
                <option value="rating">⭐ Best Rating</option>
                <option value="review_count">💬 Most Reviews</option>
                <option value="newest">🕐 Newest First</option>
              </select>
            </div>
          </div>
        ) : null}

        {/* Tabs */}
        <div className="flex gap-1 rounded-2xl bg-slate-100 p-1">
          <TabButton active={tab === "active"} onClick={() => setTab("active")}
            icon={<Sparkles className="h-4 w-4" />} label="Active"
            count={isLoading ? null : activeLeads.length} countColor="bg-emerald-500" />
          <TabButton active={tab === "contacted"} onClick={() => setTab("contacted")}
            icon={<CheckCircle2 className="h-4 w-4" />} label="Contacted"
            count={isLoading ? null : contactedLeads.length} countColor="bg-slate-400" />
        </div>

        {/* Follow-up filter */}
        {tab === "active" ? (
          <button
            type="button"
            onClick={() => { setFollowupOnly((v) => !v); router.replace(followupOnly ? "/leads" : "/leads?followup=today"); }}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              followupOnly ? "bg-purple-500 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {followupOnly ? <Clock className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
            {followupOnly ? "Showing follow-ups only" : "Filter: today's follow-ups"}
            {followupOnly && followUpsToday > 0 ? (
              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[11px] font-bold">{followUpsToday}</span>
            ) : null}
          </button>
        ) : null}

        {/* Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            {tab === "active"
              ? <><Inbox className="h-4 w-4 text-slate-400" /><span className="text-sm font-semibold text-slate-700">Fresh leads to contact</span></>
              : <><CheckCircle2 className="h-4 w-4 text-slate-400" /><span className="text-sm font-semibold text-slate-700">Contact history</span></>
            }
          </div>
          {!isLoading ? (
            <span className="text-xs text-slate-400">{currentLeads.length} lead{currentLeads.length !== 1 ? "s" : ""}</span>
          ) : null}
        </div>

        {/* Lead list */}
        {isLoading ? (
          <div className="space-y-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
        ) : currentLeads.length ? (
          <div className="space-y-3 grid lg:grid-cols-2 md:grid-cols-2 sm:grid-cols-1 gap-3" >
            {currentLeads.map((lead) => (
              <LeadCard
                key={lead._id}
                lead={lead}
                onViewDetails={setDrawerLeadId}
                currentUser={currentUser ?? undefined}
              />
            ))}
          </div>
        ) : tab === "active" ? (
          <EmptyState
            title="No active leads"
            description={followupOnly ? "No follow-ups for today." : "All leads contacted! Check Contacted tab."}
            action={followupOnly ? (
              <button type="button" onClick={() => setFollowupOnly(false)}
                className="text-sm font-semibold text-slate-700 underline underline-offset-4">
                Show all active leads
              </button>
            ) : undefined}
          />
        ) : (
          <EmptyState title="No contacted leads yet" description="Call or WhatsApp a lead to see history here." />
        )}
        </div> {/* end website pipeline space-y-4 */}
        )} {/* end pipeline === "crm" ? ... : ... */}

      {/* Lead drawer — shown for website pipeline only */}
      <LeadDrawer
        leadId={drawerLeadId}
        onClose={() => setDrawerLeadId(null)}
        onUpdated={() => { mutate(); mutateStats(); }}
      />
    </EmployeeShell>
  );
}

function StatPill({ label, value, active, onClick, color }: {
  label: string; value: number; active: boolean; onClick: () => void; color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center rounded-2xl px-3 py-3 text-center transition ${
        active ? "bg-slate-950 text-white shadow-sm" : "bg-white ring-1 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      <span className={`text-xl font-bold ${active ? "text-white" : color}`}>{value}</span>
      <span className={`text-[11px] font-semibold ${active ? "text-white/70" : "text-slate-500"}`}>{label}</span>
    </button>
  );
}

function TabButton({ active, onClick, icon, label, count, countColor }: {
  active: boolean; onClick: () => void; icon: React.ReactNode;
  label: string; count: number | null; countColor: string;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
        active ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {icon}{label}
      {count !== null ? (
        <span className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white ${countColor}`}>
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  );
}
