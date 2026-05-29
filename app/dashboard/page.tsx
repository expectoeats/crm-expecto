"use client";

import Link from "next/link";
import useSWR from "swr";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { EmployeeShell } from "@/components/employee-shell";
import { Card, EmptyState, SectionTitle, SkeletonCard } from "@/components/ui";
import { LeadCard, type LeadRecord } from "@/components/lead-utils";
import { apiFetch } from "@/lib/http";

const fetcher = async (path: string) => (await apiFetch<{ leads: LeadRecord[] }>(path)).data?.leads ?? [];

export default function DashboardPage() {
  const { data: leads, isLoading } = useSWR("/leads/my", fetcher);
  const { data: todayFollowUps = [] } = useSWR("/leads/my/today-followups", fetcher);

  const total = leads?.length ?? 0;
  const called = leads?.filter((lead) => lead.status === "called").length ?? 0;
  const interested = leads?.filter((lead) => lead.status === "interested").length ?? 0;
  const pending = leads?.filter((lead) => ["new", "callback", "proposal_sent"].includes(lead.status)).length ?? 0;
  const recentLeads = [...(leads ?? [])].slice(0, 5);

  return (
    <EmployeeShell>
      <div className="space-y-5">
        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-white">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-700">Follow-ups today</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">You have {todayFollowUps.length} follow-ups today</p>
              <p className="mt-1 text-sm text-slate-600">Tap to jump into your follow-up list and clear the day.</p>
            </div>
            <Link href="/leads?followup=today" className="inline-flex items-center gap-1 rounded-2xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white">
              Open
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Leads", value: total },
            { label: "Called", value: called },
            { label: "Interested", value: interested },
            { label: "Pending", value: pending },
          ].map((item) => (
            <Card key={item.label} className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{item.value}</p>
            </Card>
          ))}
        </div>

        <SectionTitle eyebrow="Leads" title="Recent leads" description="Your latest assigned leads and the fastest call actions." />

        {isLoading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : recentLeads.length ? (
          <div className="space-y-3">
            {recentLeads.map((lead) => (
              <LeadCard key={lead._id} lead={lead} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No leads assigned yet"
            description="Your assigned leads will appear here as soon as the admin assigns them."
          />
        )}
      </div>
    </EmployeeShell>
  );
}
