"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { PhoneCall } from "lucide-react";
import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { LeadQualityBadge, NicheBadge, StatusBadge } from "@/components/badges";
import { formatReadableDate, formatReadableDateTime } from "@/lib/time";
import { CallUpdateModal } from "@/components/call-update-modal";

export type LeadRecord = {
  _id: string;
  name: string;
  ownerName?: string;
  phone: string;
  email?: string;
  city?: string;
  niche: string;
  businessDescription?: string;
  websiteStatus?: string;
  websiteUrl?: string;
  weakPoints?: string[];
  strongHook?: string;
  suggestedService?: string;
  callScript?: string;
  source?: string;
  leadQuality: string;
  status: string;
  assignedTo?: { _id: string; name?: string } | string | null;
  callLogs?: Array<{ calledBy?: { name?: string } | string; calledAt?: string; connected?: boolean; notes?: string; outcome?: string; duration?: string }>;
  followUpDate?: string;
  followUpNote?: string;
  createdAt?: string;
  updatedAt?: string;
};

export function LeadCard({
  lead,
  showActions = true,
}: {
  lead: LeadRecord;
  showActions?: boolean;
}) {
  const [callOpen, setCallOpen] = useState(false);
  const { mutate } = useSWRConfig();

  async function refreshLeadLists() {
    await mutate((key) => typeof key === "string" && key.startsWith("/leads"));
  }

  return (
    <>
      <Card className="overflow-hidden p-0">
        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-950">{lead.name}</h3>
              <p className="mt-1 text-sm text-slate-600">
                {lead.ownerName ?? "Owner not added"} - {lead.city ?? "No city"}
              </p>
            </div>
            <NicheBadge niche={lead.niche} />
          </div>

          <div className="flex flex-wrap gap-2">
            <LeadQualityBadge quality={lead.leadQuality} />
            <StatusBadge status={lead.status} />
            {lead.followUpDate ? <Badge className="bg-orange-100 text-orange-800 ring-orange-200">Follow-up {formatReadableDate(lead.followUpDate)}</Badge> : null}
          </div>

          {lead.strongHook ? (
            <div className="rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700">Why call this lead?</p>
              <p className="mt-2 text-sm font-semibold text-amber-950">{lead.strongHook}</p>
            </div>
          ) : null}

          <div className="flex gap-2">
            <a
              href={`tel:${lead.phone}`}
              onClick={() => setCallOpen(true)}
              className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
            >
              <PhoneCall className="h-4 w-4" />
              Call
            </a>
            <Link
              href={`/leads/${lead._id}`}
              className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900"
            >
              View Details
            </Link>
          </div>
        </div>
        {showActions ? <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">Tap Call, then save what happened after the conversation.</div> : null}
      </Card>
      <CallUpdateModal lead={lead} open={callOpen} onClose={() => setCallOpen(false)} onSaved={refreshLeadLists} />
    </>
  );
}

export function LeadCompactRow({
  lead,
  checked,
  onCheckedChange,
}: {
  lead: LeadRecord;
  checked?: boolean;
  onCheckedChange?: (value: boolean) => void;
}) {
  const [callOpen, setCallOpen] = useState(false);
  const { mutate } = useSWRConfig();

  async function refreshLeadLists() {
    await mutate((key) => typeof key === "string" && key.startsWith("/leads"));
  }

  return (
    <>
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          {onCheckedChange ? (
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => onCheckedChange(event.target.checked)}
              className="mt-1 h-5 w-5 rounded border-slate-300 text-slate-950"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-slate-950">{lead.name}</p>
                <p className="truncate text-sm text-slate-600">
                  {lead.ownerName ?? "Owner not added"} - {lead.phone}
                </p>
              </div>
              <NicheBadge niche={lead.niche} />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <LeadQualityBadge quality={lead.leadQuality} />
              <StatusBadge status={lead.status} />
              {lead.assignedTo ? <Badge className="bg-slate-100 text-slate-700 ring-slate-200">Assigned</Badge> : null}
            </div>

            <div className="mt-4 grid gap-2">
              <a
                href={`tel:${lead.phone}`}
                onClick={() => setCallOpen(true)}
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 text-sm font-semibold text-white"
              >
                <PhoneCall className="h-4 w-4" />
                Call
              </a>
              <Link
                href={`/leads/${lead._id}`}
                className="text-center text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4"
              >
                View Details
              </Link>
            </div>
          </div>
        </div>
      </div>
      <CallUpdateModal lead={lead} open={callOpen} onClose={() => setCallOpen(false)} onSaved={refreshLeadLists} />
    </>
  );
}

export function LeadTimeline({ logs = [] }: { logs?: LeadRecord["callLogs"] }) {
  if (!logs.length) {
    return <p className="text-sm text-slate-500">No call logs yet.</p>;
  }

  return (
    <div className="space-y-3">
      {logs.map((log, index) => (
        <div key={`${log.calledAt ?? index}`} className="flex gap-3">
          <div className="mt-1 h-3 w-3 rounded-full bg-slate-950" />
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-950">{typeof log.calledBy === "string" ? "Team member" : log.calledBy?.name ?? "Team member"}</p>
              <p className="text-xs text-slate-500">{formatReadableDateTime(log.calledAt)}</p>
            </div>
            <p className="mt-1 text-sm text-slate-600">{log.notes || "No notes added"}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
              <span className={log.connected ? "text-emerald-700" : "text-orange-700"}>{log.connected ? "Connected" : "Not connected"}</span>
              {log.duration ? <span className="text-slate-500">Duration: {log.duration}</span> : null}
              {log.outcome ? <span className="text-slate-500">Outcome: {log.outcome.replaceAll("_", " ")}</span> : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
