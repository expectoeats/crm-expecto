"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { CheckCircle2, Clock, MessageCircle, PhoneCall, Star } from "lucide-react";
import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { LeadQualityBadge, NicheBadge, StatusBadge } from "@/components/badges";
import { formatReadableDate, formatReadableDateTime } from "@/lib/time";
import { CallUpdateModal } from "@/components/call-update-modal";
import { apiFetch } from "@/lib/http";

export type LeadRecord = {
  _id: string;
  name: string;
  ownerName?: string;
  phone: string;
  whatsapp?: string;
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
  rating?: number;
  reviewCount?: number;
  score?: number;
  pitchMessage?: string;
  isGeneric?: boolean;
  hasWebsite?: boolean;
  leadQuality: string;
  status: string;
  assignedTo?: { _id: string; name?: string } | string | null;
  callLogs?: Array<{
    calledBy?: { name?: string } | string;
    calledAt?: string;
    connected?: boolean;
    notes?: string;
    outcome?: string;
    duration?: string;
    via?: "call" | "whatsapp";
  }>;
  followUpDate?: string;
  followUpNote?: string;
  createdAt?: string;
  updatedAt?: string;
};

/** Mark a lead as contacted via call or whatsapp (auto log, no modal needed) */
export async function markContacted(
  leadId: string,
  via: "call" | "whatsapp"
): Promise<void> {
  await apiFetch(`/leads/${leadId}/calllog`, {
    method: "POST",
    body: JSON.stringify({
      outcome: "no_answer",
      connected: via === "whatsapp",
      notes: via === "whatsapp" ? "WhatsApp message sent" : "Call initiated",
      duration: "",
      via,
      followUpDate: "",
      followUpNote: "",
    }),
  });
}

function getWhatsAppUrl(lead: LeadRecord) {
  const number = (lead.whatsapp || lead.phone).replace(/\D/g, "");
  const message = lead.pitchMessage
    ? encodeURIComponent(lead.pitchMessage)
    : encodeURIComponent(
        `Namaste! ${lead.name} wale hain aap? Main aapke business ke baare mein baat karna chahta tha.`
      );
  return `https://wa.me/${number}?text=${message}`;
}

export function LeadCard({
  lead,
  showActions = true,
}: {
  lead: LeadRecord;
  showActions?: boolean;
}) {
  const [callOpen, setCallOpen] = useState(false);
  const [contacting, setContacting] = useState(false);
  const { mutate } = useSWRConfig();

  async function refreshLeadLists() {
    await mutate((key) => typeof key === "string" && key.startsWith("/leads"));
  }

  async function handleCall() {
    setContacting(true);
    setCallOpen(true);
    try {
      await markContacted(lead._id, "call");
      await refreshLeadLists();
    } finally {
      setContacting(false);
    }
  }

  async function handleWhatsApp() {
    setContacting(true);
    try {
      await markContacted(lead._id, "whatsapp");
      await refreshLeadLists();
    } finally {
      setContacting(false);
    }
  }

  const whatsappUrl = getWhatsAppUrl(lead);
  const isContacted = lead.status !== "new";
  const lastLog = lead.callLogs?.[lead.callLogs.length - 1];

  return (
    <>
      <Card className={`overflow-hidden p-0 transition-all ${isContacted ? "opacity-90 ring-1 ring-slate-200" : "shadow-sm"}`}>
        {/* Contacted ribbon */}
        {isContacted ? (
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Contacted · {lead.status.replaceAll("_", " ")}
            </span>
            {lastLog?.calledAt ? (
              <span className="ml-auto text-[11px] text-slate-400">
                {formatReadableDateTime(lastLog.calledAt)}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-3 p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-semibold text-slate-950">{lead.name}</h3>
              <p className="mt-0.5 truncate text-sm text-slate-500">
                {lead.ownerName ? `${lead.ownerName} · ` : ""}{lead.city ?? "No city"}
              </p>
              {lead.rating != null ? (
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-amber-600">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {lead.rating}
                  {lead.reviewCount != null ? (
                    <span className="text-slate-400">({lead.reviewCount})</span>
                  ) : null}
                </p>
              ) : null}
            </div>
            <NicheBadge niche={lead.niche} />
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5">
            <LeadQualityBadge quality={lead.leadQuality} />
            <StatusBadge status={lead.status} />
            {lead.followUpDate ? (
              <Badge className="bg-orange-100 text-orange-700 ring-orange-200">
                <Clock className="mr-1 h-3 w-3" />
                {formatReadableDate(lead.followUpDate)}
              </Badge>
            ) : null}
          </div>

          {/* Pitch / Hook */}
          {lead.pitchMessage ? (
            <div className="rounded-xl bg-blue-50 px-3 py-2.5 ring-1 ring-blue-100">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600">
                Pitch
              </p>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-blue-900">
                {lead.pitchMessage}
              </p>
            </div>
          ) : lead.strongHook ? (
            <div className="rounded-xl bg-amber-50 px-3 py-2.5 ring-1 ring-amber-100">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-600">
                Why call?
              </p>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-amber-900">
                {lead.strongHook}
              </p>
            </div>
          ) : null}

          {/* Last contact note (if contacted) */}
          {isContacted && lastLog?.notes ? (
            <div className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Last note
              </p>
              <p className="mt-1 line-clamp-1 text-xs text-slate-600">{lastLog.notes}</p>
            </div>
          ) : null}

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <a
              href={`tel:${lead.phone}`}
              onClick={handleCall}
              className={`inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-white transition active:scale-[0.97] ${
                contacting ? "bg-emerald-400" : "bg-emerald-500 hover:bg-emerald-600"
              }`}
            >
              <PhoneCall className="h-4 w-4" />
              Call
            </a>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleWhatsApp}
              className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-[#25D366] text-sm font-semibold text-white transition hover:bg-[#1fba58] active:scale-[0.97]"
            >
              <MessageCircle className="h-4 w-4" />
              WA
            </a>
            <Link
              href={`/leads/${lead._id}`}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 active:scale-[0.97]"
            >
              Details
            </Link>
          </div>
        </div>

        {showActions && !isContacted ? (
          <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] text-slate-400">
            Tap <span className="font-semibold text-emerald-600">Call</span> or{" "}
            <span className="font-semibold text-[#25D366]">WhatsApp</span> to contact · lead moves to history automatically
          </div>
        ) : null}
      </Card>

      <CallUpdateModal
        lead={lead}
        open={callOpen}
        onClose={() => setCallOpen(false)}
        onSaved={refreshLeadLists}
      />
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

  async function handleCall() {
    setCallOpen(true);
    await markContacted(lead._id, "call");
    await refreshLeadLists();
  }

  async function handleWhatsApp() {
    await markContacted(lead._id, "whatsapp");
    await refreshLeadLists();
  }

  const whatsappUrl = getWhatsAppUrl(lead);

  return (
    <>
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          {onCheckedChange ? (
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => onCheckedChange(event.target.checked)}
              className="mt-1 h-5 w-5 rounded border-slate-300"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-slate-950">{lead.name}</p>
                <p className="truncate text-sm text-slate-500">
                  {lead.ownerName ?? "No owner"} · {lead.phone}
                </p>
              </div>
              <NicheBadge niche={lead.niche} />
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <LeadQualityBadge quality={lead.leadQuality} />
              <StatusBadge status={lead.status} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <a
                href={`tel:${lead.phone}`}
                onClick={handleCall}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-semibold text-white"
              >
                <PhoneCall className="h-4 w-4" />
                Call
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleWhatsApp}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-semibold text-white"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </div>
            <Link
              href={`/leads/${lead._id}`}
              className="mt-2 block text-center text-sm font-semibold text-slate-600 underline decoration-slate-300 underline-offset-4"
            >
              View Details
            </Link>
          </div>
        </div>
      </div>
      <CallUpdateModal
        lead={lead}
        open={callOpen}
        onClose={() => setCallOpen(false)}
        onSaved={refreshLeadLists}
      />
    </>
  );
}

export function LeadTimeline({ logs = [] }: { logs?: LeadRecord["callLogs"] }) {
  if (!logs.length) {
    return (
      <div className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
        No contact history yet.
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      {/* Vertical line */}
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />

      {logs.map((log, index) => (
        <div key={`${log.calledAt ?? index}`} className="relative flex gap-4 pb-5 last:pb-0">
          {/* Dot */}
          <div
            className={`relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-white ${
              log.connected ? "bg-emerald-500" : "bg-slate-300"
            }`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  {typeof log.calledBy === "string"
                    ? "Team member"
                    : (log.calledBy?.name ?? "Team member")}
                </p>
                {(log as { via?: string }).via === "whatsapp" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#25D366]/10 px-2 py-0.5 text-[10px] font-semibold text-[#1a9e4a]">
                    <MessageCircle className="h-2.5 w-2.5" />
                    WhatsApp
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    <PhoneCall className="h-2.5 w-2.5" />
                    Call
                  </span>
                )}
              </div>
              <p className="shrink-0 text-[11px] text-slate-400">
                {formatReadableDateTime(log.calledAt)}
              </p>
            </div>

            <p className="mt-1 text-sm text-slate-600">
              {log.notes || "No notes added"}
            </p>

            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`font-semibold ${
                  log.connected ? "text-emerald-600" : "text-slate-400"
                }`}
              >
                {log.connected ? "✓ Connected" : "✗ Not connected"}
              </span>
              {log.duration ? (
                <span className="text-slate-400">· {log.duration}</span>
              ) : null}
              {log.outcome ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">
                  {log.outcome.replaceAll("_", " ")}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
