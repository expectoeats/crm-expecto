"use client";

import useSWR from "swr";
import Link from "next/link";
import {
  BarChart, Bar, Cell, PieChart, Pie, ResponsiveContainer, Tooltip, XAxis, YAxis, LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import {
  Users, TrendingUp, PhoneCall, MessageCircle, Flame, CheckCircle,
  Clock, XCircle, RefreshCw, Send, Zap, ThumbsDown, Circle,
  Phone, Plus, Shuffle, ArrowRight, Activity, Target, Award, AlertCircle,
} from "lucide-react";
import { Button, Card, EmptyState, SectionTitle, SkeletonCard } from "@/components/ui";
import { apiFetch } from "@/lib/http";
import { cn } from "@/lib/ui";

// ─── Types ──────────────────────────────────────────────────────────────────

type StatsSummary = {
  summary: {
    totalLeads: number;
    todayFollowUps: number;
    hotLeads: number;
    closedWon: number;
    conversionRate: number;
    employees: number;
  };
  leadsByStatus: Array<{ _id: string; count: number }>;
  leadsByNiche: Array<{ _id: string; count: number }>;
  leadsByEmployee: Array<{ _id: string; name?: string; count: number }>;
};

type LeadStats = {
  total: number;
  new_today: number;
  contacted: number;
  interested: number;
  follow_ups_today: number;
};

type EmployeeStats = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  totalLeads: number;
  activeLeads: number;
  callsMade: number;
  interestedLeads: number;
  closedLeads: number;
};

// ─── Fetchers ────────────────────────────────────────────────────────────────

const statsFetcher    = async () => (await apiFetch<StatsSummary>("/stats")).data;
const leadStatsFetcher = async () => (await apiFetch<LeadStats>("/leads/stats")).data ?? null;
const employeesFetcher = async () =>
  (await apiFetch<{ employees: EmployeeStats[] }>("/users/employees")).data?.employees ?? [];

// ─── Status display config ───────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; ring: string }> = {
  new:            { label: "New",           icon: <Circle className="h-4 w-4" />,       color: "text-slate-600",  bg: "bg-slate-50",    ring: "ring-slate-200" },
  reached_out:    { label: "Reached Out",   icon: <Phone className="h-4 w-4" />,        color: "text-blue-700",   bg: "bg-blue-50",     ring: "ring-blue-200"  },
  in_talks:       { label: "In Talks",      icon: <MessageCircle className="h-4 w-4" />,color: "text-yellow-700", bg: "bg-yellow-50",   ring: "ring-yellow-200"},
  interested:     { label: "Interested",    icon: <Flame className="h-4 w-4" />,        color: "text-orange-700", bg: "bg-orange-50",   ring: "ring-orange-200"},
  converted:      { label: "Converted",     icon: <CheckCircle className="h-4 w-4" />,  color: "text-emerald-700",bg: "bg-emerald-50",  ring: "ring-emerald-200"},
  not_interested: { label: "Not Interested",icon: <XCircle className="h-4 w-4" />,      color: "text-red-700",    bg: "bg-red-50",      ring: "ring-red-200"   },
  follow_up:      { label: "Follow Up",     icon: <Clock className="h-4 w-4" />,        color: "text-purple-700", bg: "bg-purple-50",   ring: "ring-purple-200"},
  called:         { label: "Called",        icon: <PhoneCall className="h-4 w-4" />,    color: "text-blue-700",   bg: "bg-blue-50",     ring: "ring-blue-200"  },
  callback:       { label: "Callback",      icon: <RefreshCw className="h-4 w-4" />,    color: "text-orange-700", bg: "bg-orange-50",   ring: "ring-orange-200"},
  proposal_sent:  { label: "Proposal Sent", icon: <Send className="h-4 w-4" />,         color: "text-teal-700",   bg: "bg-teal-50",     ring: "ring-teal-200"  },
  closed_won:     { label: "Closed Won",    icon: <Zap className="h-4 w-4" />,          color: "text-emerald-700",bg: "bg-emerald-50",  ring: "ring-emerald-200"},
  closed_lost:    { label: "Closed Lost",   icon: <ThumbsDown className="h-4 w-4" />,   color: "text-red-700",    bg: "bg-red-50",      ring: "ring-red-200"   },
};

// Bar chart colors per status
const STATUS_CHART_COLORS: Record<string, string> = {
  new:            "#94a3b8",
  reached_out:    "#3b82f6",
  in_talks:       "#eab308",
  interested:     "#f97316",
  converted:      "#10b981",
  not_interested: "#ef4444",
  follow_up:      "#8b5cf6",
  called:         "#60a5fa",
  callback:       "#fb923c",
  proposal_sent:  "#14b8a6",
  closed_won:     "#059669",
  closed_lost:    "#dc2626",
};

const NICHE_COLORS = ["#0f172a", "#f97316", "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899", "#eab308", "#10b981"];

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon, color, sub, href,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  sub?: string;
  href?: string;
}) {
  const inner = (
    <div className={cn("glass-panel group flex items-start gap-4 rounded-3xl p-5 transition hover:shadow-md", href && "cursor-pointer")}>
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", color)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold leading-none text-slate-950">{value}</p>
        {sub ? <p className="mt-1 text-xs text-slate-400">{sub}</p> : null}
      </div>
      {href ? <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-slate-600" /> : null}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

// ─── Status Breakdown Grid ────────────────────────────────────────────────────

function StatusBreakdownGrid({ data }: { data: Array<{ _id: string; count: number }> }) {
  // sort by count desc
  const sorted = [...data].sort((a, b) => b.count - a.count);
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
      {sorted.map(({ _id, count }) => {
        const meta = STATUS_META[_id];
        if (!meta) return null;
        return (
          <Link
            key={_id}
            href={`/admin/leads?status=${_id}`}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-4 py-3.5 ring-1 transition hover:shadow-sm active:scale-[0.98]",
              meta.bg,
              meta.ring
            )}
          >
            <span className={meta.color}>{meta.icon}</span>
            <div className="min-w-0 flex-1">
              <p className={cn("text-[11px] font-semibold uppercase tracking-[0.16em]", meta.color)}>{meta.label}</p>
              <p className={cn("mt-0.5 text-xl font-bold leading-none", meta.color)}>{count}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Employee Performance Table ───────────────────────────────────────────────

function EmployeeTable({ employees, loading }: { employees: EmployeeStats[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    );
  }

  if (!employees.length) {
    return (
      <EmptyState
        title="No employees yet"
        description="Create employee accounts to see performance here."
        action={
          <Link href="/admin/employees">
            <Button>
              <Users className="h-4 w-4" />
              Manage Employees
            </Button>
          </Link>
        }
      />
    );
  }

  // sort by totalLeads desc
  const sorted = [...employees].sort((a, b) => b.totalLeads - a.totalLeads);

  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Employee</th>
            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Assigned</th>
            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Called</th>
            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Interested</th>
            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Closed</th>
            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Call Rate</th>
            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Conv. Rate</th>
            <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((emp, index) => {
            const callRate = emp.totalLeads > 0 ? Math.round((emp.callsMade / emp.totalLeads) * 100) : 0;
            const convRate = emp.totalLeads > 0 ? Math.round((emp.closedLeads / emp.totalLeads) * 100) : 0;
            const isTop = index === 0 && emp.closedLeads > 0;
            return (
              <tr key={emp._id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-[12px] font-bold text-slate-600">
                      {emp.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-slate-950">{emp.name}</p>
                        {isTop ? <Award className="h-3.5 w-3.5 text-amber-500" /> : null}
                      </div>
                      <p className="text-xs text-slate-400">{emp.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-base font-bold text-slate-800">{emp.totalLeads}</span>
                  <p className="text-[10px] text-slate-400">{emp.activeLeads} active</p>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-base font-bold text-blue-700">{emp.callsMade}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-base font-bold text-orange-600">{emp.interestedLeads}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-base font-bold text-emerald-600">{emp.closedLeads}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-center gap-1">
                    <span className={cn("text-sm font-bold", callRate >= 50 ? "text-emerald-600" : callRate >= 25 ? "text-amber-600" : "text-red-500")}>
                      {callRate}%
                    </span>
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={cn("h-full rounded-full", callRate >= 50 ? "bg-emerald-500" : callRate >= 25 ? "bg-amber-400" : "bg-red-400")}
                        style={{ width: `${Math.min(callRate, 100)}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-center gap-1">
                    <span className={cn("text-sm font-bold", convRate >= 10 ? "text-emerald-600" : convRate >= 5 ? "text-amber-600" : "text-slate-400")}>
                      {convRate}%
                    </span>
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.min(convRate * 5, 100)}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
                    emp.isActive
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : "bg-red-50 text-red-700 ring-red-200"
                  )}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", emp.isActive ? "bg-emerald-500" : "bg-red-500")} />
                    {emp.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Custom Tooltip for Charts ────────────────────────────────────────────────

function CustomBarTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { _id: string }; value: number }> }) {
  if (!active || !payload?.length) return null;
  const { _id, count: _count } = payload[0].payload as { _id: string; count: number };
  const meta = STATUS_META[_id];
  return (
    <div className="rounded-2xl bg-white px-3 py-2 shadow-lg ring-1 ring-slate-200 text-sm">
      <p className="font-semibold text-slate-950">{meta?.label ?? _id}</p>
      <p className="text-slate-500">{payload[0].value} leads</p>
    </div>
  );
}

function CustomPieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl bg-white px-3 py-2 shadow-lg ring-1 ring-slate-200 text-sm">
      <p className="font-semibold text-slate-950">{payload[0].name}</p>
      <p className="text-slate-500">{payload[0].value} leads</p>
    </div>
  );
}

// ─── Pipeline Funnel ─────────────────────────────────────────────────────────

function PipelineFunnel({ data }: { data: Array<{ _id: string; count: number }> }) {
  const funnelOrder = ["new", "reached_out", "in_talks", "interested", "converted", "closed_won"];
  const funnelData = funnelOrder
    .map((status) => {
      const found = data.find((d) => d._id === status);
      return { status, count: found?.count ?? 0, meta: STATUS_META[status] };
    })
    .filter((d) => d.meta);

  const maxCount = Math.max(...funnelData.map((d) => d.count), 1);

  return (
    <div className="space-y-2">
      {funnelData.map(({ status, count, meta }, i) => {
        const width = Math.max((count / maxCount) * 100, count > 0 ? 8 : 2);
        const prevCount = i > 0 ? funnelData[i - 1].count : count;
        const dropRate = prevCount > 0 && i > 0 ? Math.round(((prevCount - count) / prevCount) * 100) : null;
        return (
          <Link key={status} href={`/admin/leads?status=${status}`} className="block group">
            <div className="flex items-center gap-3">
              <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", meta.bg, "ring-1", meta.ring)}>
                <span className={meta.color}>{meta.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-700">{meta.label}</span>
                  <div className="flex items-center gap-2">
                    {dropRate !== null && dropRate > 0 ? (
                      <span className="text-[10px] text-red-400">−{dropRate}%</span>
                    ) : null}
                    <span className={cn("text-sm font-bold", meta.color)}>{count}</span>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", meta.bg.replace("bg-", "bg-").replace("-50", "-400"))}
                    style={{ width: `${width}%`, backgroundColor: STATUS_CHART_COLORS[status] }}
                  />
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Main Dashboard Page ─────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { data: stats, isLoading: statsLoading }           = useSWR("admin-stats", statsFetcher);
  const { data: leadStats, isLoading: leadStatsLoading }   = useSWR("admin-lead-stats", leadStatsFetcher);
  const { data: employees = [], isLoading: empLoading }    = useSWR("admin-employees", employeesFetcher);

  const summary = stats?.summary;
  const byStatus = stats?.leadsByStatus ?? [];
  const byNiche  = stats?.leadsByNiche ?? [];

  // Derive key pipeline counts from status data
  const countFor = (id: string) => byStatus.find((s) => s._id === id)?.count ?? 0;
  const reachedOut = countFor("reached_out");
  const inTalks    = countFor("in_talks");
  const interested = countFor("interested");
  const converted  = countFor("converted") + countFor("closed_won");
  const notInterested = countFor("not_interested") + countFor("closed_lost");
  const followUp   = countFor("follow_up");
  const newLeads   = countFor("new");

  // Employee totals
  const totalCalls    = employees.reduce((s, e) => s + e.callsMade, 0);
  const totalInterested = employees.reduce((s, e) => s + e.interestedLeads, 0);
  const totalClosed   = employees.reduce((s, e) => s + e.closedLeads, 0);

  // Top performer
  const topPerformer = employees.reduce<EmployeeStats | null>((best, e) =>
    !best || e.closedLeads > best.closedLeads ? e : best, null);

  return (
    <div className="space-y-6">
      {/* ── PAGE HEADER ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Overview</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Track every lead, activity, and team performance in real time.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link href="/admin/leads/new">
            <Button variant="secondary">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Lead</span>
            </Button>
          </Link>
          <Button onClick={async () => {
            await apiFetch("/leads/auto-assign", { method: "POST" });
            window.location.reload();
          }}>
            <Shuffle className="h-4 w-4" />
            <span className="hidden sm:inline">Auto-Assign</span>
          </Button>
        </div>
      </div>

      {/* ── TOP KPI CARDS ── */}
      {statsLoading || leadStatsLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Leads"
            value={summary?.totalLeads ?? 0}
            icon={<Target className="h-5 w-5 text-white" />}
            color="bg-slate-950"
            sub={`${leadStats?.new_today ?? 0} added today`}
            href="/admin/leads"
          />
          <StatCard
            label="Contacted"
            value={leadStats?.contacted ?? 0}
            icon={<PhoneCall className="h-5 w-5 text-white" />}
            color="bg-blue-600"
            sub={`${summary?.totalLeads ? Math.round(((leadStats?.contacted ?? 0) / summary.totalLeads) * 100) : 0}% of total`}
            href="/admin/leads?status=reached_out"
          />
          <StatCard
            label="Hot Pipeline"
            value={leadStats?.interested ?? 0}
            icon={<Flame className="h-5 w-5 text-white" />}
            color="bg-orange-500"
            sub="Interested + In talks"
            href="/admin/leads?status=interested"
          />
          <StatCard
            label="Closed Won"
            value={summary?.closedWon ?? 0}
            icon={<Zap className="h-5 w-5 text-white" />}
            color="bg-emerald-600"
            sub={`${summary?.conversionRate ?? 0}% conversion rate`}
            href="/admin/leads?status=closed_won"
          />
        </div>
      )}

      {/* ── SECONDARY KPI ROW ── */}
      {!statsLoading && !leadStatsLoading ? (
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {[
            { label: "New", value: newLeads, color: "text-slate-700", bg: "bg-slate-50", ring: "ring-slate-200", href: "/admin/leads?status=new" },
            { label: "Reached Out", value: reachedOut, color: "text-blue-700", bg: "bg-blue-50", ring: "ring-blue-200", href: "/admin/leads?status=reached_out" },
            { label: "In Talks", value: inTalks, color: "text-yellow-700", bg: "bg-yellow-50", ring: "ring-yellow-200", href: "/admin/leads?status=in_talks" },
            { label: "Interested", value: interested, color: "text-orange-700", bg: "bg-orange-50", ring: "ring-orange-200", href: "/admin/leads?status=interested" },
            { label: "Follow Ups Today", value: leadStats?.follow_ups_today ?? followUp, color: "text-purple-700", bg: "bg-purple-50", ring: "ring-purple-200", href: "/admin/leads?status=follow_up" },
            { label: "Not Interested", value: notInterested, color: "text-red-700", bg: "bg-red-50", ring: "ring-red-200", href: "/admin/leads?status=not_interested" },
          ].map((item) => (
            <Link key={item.label} href={item.href} className="group">
              <div className={cn(
                "glass-panel flex flex-col rounded-2xl px-4 py-3.5 ring-1 transition hover:shadow-sm active:scale-[0.98]",
                item.bg, item.ring
              )}>
                <p className={cn("text-[10px] font-bold uppercase tracking-[0.18em]", item.color)}>{item.label}</p>
                <p className={cn("mt-1 text-2xl font-bold leading-none", item.color)}>{item.value}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      {/* ── TEAM QUICK STATS ── */}
      {!empLoading && employees.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="glass-panel rounded-3xl p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Active Team</p>
                <p className="text-xl font-bold text-slate-950">{employees.filter((e) => e.isActive).length} / {employees.length}</p>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total Calls</p>
                <p className="text-xl font-bold text-slate-950">{totalCalls}</p>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500">
                <Flame className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Team Interested</p>
                <p className="text-xl font-bold text-slate-950">{totalInterested}</p>
              </div>
            </div>
          </div>

          {topPerformer ? (
            <div className="glass-panel rounded-3xl p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500">
                  <Award className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Top Performer</p>
                  <p className="truncate text-base font-bold text-slate-950">{topPerformer.name}</p>
                  <p className="text-xs text-slate-400">{topPerformer.closedLeads} closed</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel rounded-3xl p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total Closed</p>
                  <p className="text-xl font-bold text-slate-950">{totalClosed}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* ── PIPELINE FUNNEL + STATUS BREAKDOWN ── */}
      <div className="grid gap-4 xl:grid-cols-2">
        {/* Sales Pipeline Funnel */}
        <Card className="space-y-4">
          <SectionTitle
            eyebrow="Pipeline"
            title="Sales funnel"
            description="Lead progression from new to closed."
          />
          {statsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-10 animate-pulse rounded-2xl bg-slate-100" />)}
            </div>
          ) : byStatus.length ? (
            <PipelineFunnel data={byStatus} />
          ) : (
            <EmptyState title="No pipeline data" description="Create some leads to see the funnel." />
          )}
        </Card>

        {/* All statuses grid */}
        <Card className="space-y-4">
          <SectionTitle
            eyebrow="Activity"
            title="All lead statuses"
            description="Click any status to filter leads."
          />
          {statsLoading ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}
            </div>
          ) : byStatus.length ? (
            <StatusBreakdownGrid data={byStatus} />
          ) : (
            <EmptyState title="No status data" description="Leads will appear here once created." />
          )}
        </Card>
      </div>

      {/* ── CHARTS ROW ── */}
      <div className="grid gap-4 xl:grid-cols-2">
        {/* Bar chart: leads by status */}
        <Card className="space-y-4">
          <SectionTitle eyebrow="Chart" title="Leads by status" />
          {statsLoading ? (
            <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
          ) : byStatus.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byStatus} margin={{ top: 4, right: 4, bottom: 24, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="_id"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickFormatter={(v) => STATUS_META[v]?.label?.split(" ")[0] ?? v}
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {byStatus.map((entry) => (
                      <Cell key={entry._id} fill={STATUS_CHART_COLORS[entry._id] ?? "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No data yet" description="Create some leads to populate the chart." />
          )}
        </Card>

        {/* Donut chart: leads by niche */}
        <Card className="space-y-4">
          <SectionTitle eyebrow="Chart" title="Leads by niche" />
          {statsLoading ? (
            <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
          ) : byNiche.length ? (
            <div className="flex h-72 items-center gap-4">
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={byNiche.slice(0, 8)}
                      dataKey="count"
                      nameKey="_id"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                    >
                      {byNiche.slice(0, 8).map((entry, index) => (
                        <Cell key={entry._id} fill={NICHE_COLORS[index % NICHE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div className="shrink-0 space-y-1.5 max-w-[130px]">
                {byNiche.slice(0, 8).map((entry, index) => (
                  <div key={entry._id} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: NICHE_COLORS[index % NICHE_COLORS.length] }} />
                    <span className="truncate text-[11px] font-medium text-slate-600">{entry._id}</span>
                    <span className="ml-auto text-[11px] font-bold text-slate-900">{entry.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState title="No niche data" description="Niche distribution will appear here once leads are added." />
          )}
        </Card>
      </div>

      {/* ── EMPLOYEE PERFORMANCE ── */}
      <Card className="space-y-4">
        <SectionTitle
          eyebrow="Team"
          title="Employee performance"
          description="Full breakdown of assigned leads, calls made, interested prospects, and closed deals."
          action={
            <Link href="/admin/employees">
              <Button variant="secondary">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Manage</span>
              </Button>
            </Link>
          }
        />
        <EmployeeTable employees={employees} loading={empLoading} />
      </Card>

      {/* ── ALERT: Follow-ups today ── */}
      {!leadStatsLoading && (leadStats?.follow_ups_today ?? 0) > 0 ? (
        <Link href="/admin/leads?status=follow_up">
          <div className="flex items-center gap-4 rounded-3xl bg-purple-50 px-5 py-4 ring-1 ring-purple-200 hover:shadow-sm transition">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-purple-500">
              <AlertCircle className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-purple-900">
                {leadStats?.follow_ups_today} follow-up{leadStats?.follow_ups_today !== 1 ? "s" : ""} scheduled for today
              </p>
              <p className="text-xs text-purple-600">Tap to view and action them before the day ends.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-purple-400" />
          </div>
        </Link>
      ) : null}

      {/* ── BY EMPLOYEE CHART ── */}
      {!empLoading && employees.length > 1 ? (
        <Card className="space-y-4">
          <SectionTitle
            eyebrow="Chart"
            title="Leads per employee"
            description="Assigned vs called vs interested vs closed."
          />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={employees.map((e) => ({
                  name: e.name.split(" ")[0],
                  Assigned: e.totalLeads,
                  Called: e.callsMade,
                  Interested: e.interestedLeads,
                  Closed: e.closedLeads,
                }))}
                margin={{ top: 4, right: 4, bottom: 8, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Assigned"  fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Called"    fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Interested" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Closed"    fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
