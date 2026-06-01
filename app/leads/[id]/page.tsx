"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import useSWR, { mutate } from "swr";
import { AlertTriangle, CalendarDays, ExternalLink, PhoneCall, Save, StickyNote, X } from "lucide-react";
import { EmployeeShell } from "@/components/employee-shell";
import { Button, Card, EmptyState, Input, Select, Textarea } from "@/components/ui";
import { LeadQualityBadge, NicheBadge, StatusBadge, WebsiteStatusBadge } from "@/components/badges";
import { LeadTimeline, type LeadRecord } from "@/components/lead-utils";
import { CallUpdateModal } from "@/components/call-update-modal";
import { apiFetch } from "@/lib/http";
import { formatReadableDate } from "@/lib/time";
import { cn } from "@/lib/ui";

const fetcher = async (path: string) => (await apiFetch<{ lead: LeadRecord }>(path)).data?.lead ?? null;

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const [status, setStatus] = useState<string | null>(null);
  const [callOpen, setCallOpen] = useState(false);
  const [followupOpen, setFollowupOpen] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");
  const { data: lead, isLoading } = useSWR(params?.id ? `/leads/${params.id}` : null, fetcher);

  async function updateStatus(nextStatus: string) {
    if (!lead) return;
    await apiFetch(`/leads/${lead._id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    });
    setStatus(nextStatus);
    await mutate(`/leads/${lead._id}`);
  }

  async function saveFollowUp() {
    if (!lead) return;
    await apiFetch(`/leads/${lead._id}/followup`, {
      method: "PATCH",
      body: JSON.stringify({ followUpDate, followUpNote }),
    });
    setFollowupOpen(false);
    setFollowUpDate("");
    setFollowUpNote("");
    await mutate(`/leads/${lead._id}`);
  }

  if (isLoading) {
    return (
      <EmployeeShell>
        <Card className="animate-pulse space-y-3">
          <div className="h-6 w-3/4 rounded-full bg-slate-200" />
          <div className="h-4 w-1/2 rounded-full bg-slate-200" />
          <div className="h-24 rounded-3xl bg-slate-200" />
        </Card>
      </EmployeeShell>
    );
  }

  if (!lead) {
    return (
      <EmployeeShell>
        <EmptyState title="Lead not found" description="This lead may have been reassigned or removed." />
      </EmployeeShell>
    );
  }

  const isWebsiteBad = lead.websiteStatus === "website_is_bad";
  const currentStatus = status ?? lead.status;

  return (
    <EmployeeShell>
      <div className="space-y-5 pb-32">
        <Card className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Lead identity</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">{lead.name}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {lead.ownerName ?? "Owner not added"} · {lead.city ?? "City not added"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <NicheBadge niche={lead.niche} />
            <WebsiteStatusBadge websiteStatus={lead.websiteStatus ?? "no_website"} />
            <LeadQualityBadge quality={lead.leadQuality} />
            <StatusBadge status={lead.status} />
          </div>
        </Card>

        <Card className={cn("space-y-4", "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50")}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Why call this lead?</p>
          {lead.strongHook ? (
            <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-amber-200">
              <p className="text-sm font-semibold text-slate-700">Strong hook</p>
              <p className="mt-1 text-base font-semibold text-amber-950">{lead.strongHook}</p>
            </div>
          ) : null}
          {lead.suggestedService ? <p className="text-sm text-slate-700"><span className="font-semibold">Suggested service:</span> {lead.suggestedService}</p> : null}
          {lead.weakPoints?.length ? (
            <div className="space-y-2">
              {lead.weakPoints.map((point) => (
                <div key={point} className="flex items-start gap-2 rounded-2xl bg-white/80 px-3 py-2 text-sm text-slate-700 ring-1 ring-amber-100">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          ) : null}
        </Card>

        <Card className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Website info</p>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-700">Website status</p>
            <WebsiteStatusBadge websiteStatus={lead.websiteStatus ?? "no_website"} />
          </div>
          {lead.websiteUrl ? (
            <a href={lead.websiteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 underline decoration-blue-200 underline-offset-4">
              {lead.websiteUrl}
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
          {isWebsiteBad ? (
            <div className="rounded-2xl bg-orange-50 p-3 text-sm text-orange-800 ring-1 ring-orange-200">
              Website needs improvement before the pitch lands.
            </div>
          ) : null}
        </Card>

        {lead.callScript ? (
          <Card className="space-y-3 border-slate-200 bg-slate-50">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Read before calling</p>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{lead.callScript}</p>
          </Card>
        ) : null}

        <Card className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Call history</p>
          <LeadTimeline logs={lead.callLogs} />
        </Card>

        <Card className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Follow-up</p>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Current follow-up</p>
            <p className="mt-1 text-base font-semibold text-slate-950">{formatReadableDate(lead.followUpDate)}</p>
            {lead.followUpNote ? <p className="mt-2 text-sm text-slate-600">{lead.followUpNote}</p> : null}
          </div>
          <Button variant="secondary" className="w-full" onClick={() => setFollowupOpen(true)}>
            <CalendarDays className="h-4 w-4" />
            Set follow-up
          </Button>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 py-3 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto] gap-2">
          <a
            href={`tel:${lead.phone}`}
            onClick={() => setCallOpen(true)}
            className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white"
          >
            <PhoneCall className="h-4 w-4" />
            Call
          </a>
          <Button variant="secondary" className="min-h-[52px]" onClick={() => setCallOpen(true)}>
            <StickyNote className="h-4 w-4" />
            Update
          </Button>
        </div>

        <div className="mx-auto mt-2 grid max-w-6xl gap-2 sm:grid-cols-[1fr_auto]">
            <Select value={currentStatus} onChange={(event) => updateStatus(event.target.value)}>
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
      </div>

      <CallUpdateModal lead={lead} open={callOpen} onClose={() => setCallOpen(false)} onSaved={() => mutate(`/leads/${lead._id}`)} />

      {followupOpen ? (
        <div className="fixed inset-0 z-40 flex items-end bg-slate-950/40">
          <div className="w-full rounded-t-[28px] bg-white p-4 shadow-2xl">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-950">Set follow-up</h2>
              <Button variant="ghost" onClick={() => setFollowupOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              <Input type="datetime-local" value={followUpDate} onChange={(event) => setFollowUpDate(event.target.value)} />
              <Textarea value={followUpNote} onChange={(event) => setFollowUpNote(event.target.value)} placeholder="Follow-up note" />
              <Button className="w-full" onClick={saveFollowUp}>
                <Save className="h-4 w-4" />
                Save follow-up
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </EmployeeShell>
  );
}
