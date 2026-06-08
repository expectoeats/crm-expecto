"use client";

import Link from "next/link";
import useSWR from "swr";
import { AlertTriangle, ArrowRight, CheckCircle2, Inbox, Sparkles, TrendingUp } from "lucide-react";
import { EmployeeShell } from "@/components/employee-shell";
import { Card, EmptyState, SkeletonCard } from "@/components/ui";
import { LeadCard, type LeadRecord } from "@/components/lead-utils";
import { apiFetch } from "@/lib/http";

const fetcher = async (path: string) =>
  (await apiFetch<{ leads: LeadRecord[] }>(path)).data?.leads ?? [];

export default function DashboardPage() {
  const { data: leads, isLoading } = useSWR("/leads/my", fetcher);
  const { data: todayFollowUps = [] } = useSWR("/leads/my/today-followups", fetcher);

  const activeLeads = leads?.filter((l) => l.status === "new") ?? [];
  const contactedLeads = leads?.filter((l) => l.status !== "new") ?? [];
  const interestedCount = leads?.filter((l) => l.status === "interested").length ?? 0;
  const closedCount = leads?.filter((l) => l.status === "closed_won").length ?? 0;

  // Top 3 active leads (hot first)
  const topActive = [...activeLeads]
    .sort((a, b) => {
      const q: Record<string, number> = { hot: 0, warm: 1, cold: 2 };
      return (q[a.leadQuality] ?? 3) - (q[b.leadQuality] ?? 3);
    })
    .slice(0, 3);

  return (
    <EmployeeShell>
      <div className="space-y-4">

        {/* Follow-up banner */}
        {todayFollowUps.length > 0 ? (
          <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">
                  Follow-ups today
                </p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">
                  {todayFollowUps.length} lead{todayFollowUps.length !== 1 ? "s" : ""} waiting
                </p>
              </div>
              <Link
                href="/leads?followup=today"
                className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white"
              >
                Open
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Card>
        ) : null}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={<Inbox className="h-5 w-5" />}
            label="Active"
            value={activeLeads.length}
            color="bg-emerald-500"
            href="/leads"
          />
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Contacted"
            value={contactedLeads.length}
            color="bg-slate-600"
            href="/leads"
          />
          <StatCard
            icon={<Sparkles className="h-5 w-5" />}
            label="Interested"
            value={interestedCount}
            color="bg-blue-500"
            href="/leads"
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Closed Won"
            value={closedCount}
            color="bg-violet-500"
            href="/leads"
          />
        </div>

        {/* Active leads section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Inbox className="h-4 w-4 text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">Active leads to call</p>
            </div>
            <Link
              href="/leads"
              className="text-xs font-semibold text-slate-500 underline underline-offset-4"
            >
              View all
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : topActive.length ? (
            <div className="space-y-3">
              {topActive.map((lead) => (
                <LeadCard key={lead._id} lead={lead} />
              ))}
              {activeLeads.length > 3 ? (
                <Link
                  href="/leads"
                  className="flex items-center justify-center gap-2 rounded-2xl bg-slate-100 py-3 text-sm font-semibold text-slate-600"
                >
                  +{activeLeads.length - 3} more active leads
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          ) : (
            <EmptyState
              title="All leads contacted!"
              description="Great work — no active leads left. Check the Contacted tab for follow-ups."
            />
          )}
        </div>
      </div>
    </EmployeeShell>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="flex flex-col gap-3 p-4 transition hover:shadow-md active:scale-[0.98]">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-white ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-950">{value}</p>
          <p className="text-xs font-semibold text-slate-400">{label}</p>
        </div>
      </Card>
    </Link>
  );
}
