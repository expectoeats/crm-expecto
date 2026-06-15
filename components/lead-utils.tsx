"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { Calendar, CheckCircle, Circle, Clock, Eye, Flame, MessageCircle, Phone, PhoneCall, RefreshCw, Send, Star, ThumbsDown, X, Zap } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui";
import { LeadQualityBadge, NicheBadge, TierBadge } from "@/components/badges";
import { formatReadableDate, formatReadableDateTime } from "@/lib/time";
import { apiFetch } from "@/lib/http";
import { statusConfig, cn } from "@/lib/ui";
import { QuickNoteToast } from "@/components/quick-note-toast";

export type ContactEntry = {
  _id: string;
  action: "called" | "whatsapped";
  by_name: string;
  by_id: string;
  at: string;
  note: string;
};

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
  priority_score?: number;
  tier?: "hot" | "warm" | "cold";
  tierLabel?: string;
  tierColor?: string;
  pitchMessage?: string;
  isGeneric?: boolean;
  hasWebsite?: boolean;
  leadQuality: string;
  status: string;
  assignedTo?: { _id: string; name?: string } | string | null;
  // New contact tracking fields
  contact_history?: ContactEntry[];
  last_contacted_at?: string;
  last_contacted_by?: string;
  last_action?: "called" | "whatsapped" | null;
  // Legacy call logs
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

/** Fire contact-action API */
export async function markContacted(
  leadId: string,
  via: "call" | "whatsapp",
  userName: string,
  userId: string
): Promise<{ history_entry_id?: string }> {
  const res = await apiFetch<{ lead: LeadRecord }>(`/leads/${leadId}/contact-action`, {
    method: "PATCH",
    body: JSON.stringify({
      action: via === "whatsapp" ? "whatsapped" : "called",
      employee_id: userId,
      employee_name: userName,
      timestamp: new Date().toISOString(),
    }),
  });
  const history = (res.data?.lead as LeadRecord & { contact_history?: ContactEntry[] })?.contact_history ?? [];
  const last = history[history.length - 1];
  return { history_entry_id: last?._id };
}

function getWhatsAppUrl(lead: LeadRecord) {
  const number = (lead.whatsapp || lead.phone).replace(/\D/g, "");
  const message = lead.pitchMessage
    ? encodeURIComponent(lead.pitchMessage)
    : encodeURIComponent(`Namaste! ${lead.name} wale hain aap? Main aapke business ke baare mein baat karna chahta tha.`);
  return `https://wa.me/${number}?text=${message}`;
}

function relativeTime(dateStr?: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  new:            <Circle className="h-3 w-3" />,
  reached_out:    <Phone className="h-3 w-3" />,
  in_talks:       <MessageCircle className="h-3 w-3" />,
  interested:     <Flame className="h-3 w-3" />,
  converted:      <CheckCircle className="h-3 w-3" />,
  not_interested: <X className="h-3 w-3" />,
  follow_up:      <Calendar className="h-3 w-3" />,
  called:         <PhoneCall className="h-3 w-3" />,
  callback:       <RefreshCw className="h-3 w-3" />,
  proposal_sent:  <Send className="h-3 w-3" />,
  closed_won:     <Zap className="h-3 w-3" />,
  closed_lost:    <ThumbsDown className="h-3 w-3" />,
};

function StatusBadgeNew({ status }: { status: string }) {
  const cfg  = statusConfig[status];
  const icon = STATUS_ICONS[status];
  if (!cfg) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset", cfg.className)}>
      {icon}
      {cfg.label}
    </span>
  );
}

export function LeadCard({
  lead,
  showActions = true,
  onViewDetails,
  currentUser,
}: {
  lead: LeadRecord;
  showActions?: boolean;
  onViewDetails?: (id: string) => void;
  currentUser?: { id: string; name: string };
}) {
  const [toast, setToast] = useState<{ via: "call" | "whatsapp"; historyEntryId?: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { mutate } = useSWRConfig();
  const [pitchExpanded, setPitchExpanded] = useState(false);

  const refreshLeadLists = useCallback(async () => {
    await mutate((key) => typeof key === "string" && key.startsWith("/leads"));
  }, [mutate]);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  async function handleContact(via: "call" | "whatsapp") {
    const userName = currentUser?.name ?? "Team member";
    const userId = currentUser?.id ?? "";
    const result = await markContacted(lead._id, via, userName, userId);
    await refreshLeadLists();

    // Show quick note toast after 3 seconds
    toastTimer.current = setTimeout(() => {
      setToast({ via, historyEntryId: result.history_entry_id });
    }, 3000);
  }

  const whatsappUrl = getWhatsAppUrl(lead);
  const isContacted = lead.status !== "new";
  const lastContact = lead.contact_history?.[lead.contact_history.length - 1];
  const lastContactTime = lead.last_contacted_at;
  const pitchLines = (lead.pitchMessage ?? "").split("\n");
  const pitchPreview = pitchLines.slice(0, 2).join("\n");
  const hasPitchMore = pitchLines.length > 2 || (lead.pitchMessage?.length ?? 0) > 120;
  const assignedName = typeof lead.assignedTo === "object" && lead.assignedTo !== null
    ? lead.assignedTo.name ?? ""
    : "";

  return (
    <>
      <div className={cn(
        "overflow-hidden rounded-2xl bg-white ring-1 transition-all",
        isContacted ? "ring-slate-200" : "ring-slate-200 shadow-sm hover:shadow-md"
      )}>
        {/* TOP ROW */}
        <div className="flex items-start gap-2 px-4 pt-4">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onViewDetails?.(lead._id)}
              className="text-left"
            >
              <span className="text-base font-bold text-slate-950 hover:text-slate-700">{lead.name}</span>
            </button>
          </div>
          <NicheBadge niche={lead.niche} />
          <TierBadge tier={lead.tier} label={lead.tierLabel} />
          {/* Assign initials */}
          {assignedName ? (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600" title={assignedName}>
              {getInitials(assignedName)}
            </div>
          ) : null}
        </div>

        {/* SECOND ROW — compact info */}
        <div className="mt-4 flex items-center gap-2 px-4 text-xs text-slate-500">
          {lead.rating != null ? (
            <span className="flex items-center gap-1 font-semibold text-amber-600">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {lead.rating}
              {lead.reviewCount != null ? ` (${lead.reviewCount})` : ""}
            </span>
          ) : null}
          {lead.rating != null && lead.city ? <span>·</span> : null}
          {lead.city ? <span>{lead.city}</span> : null}
        </div>

        {/* THIRD ROW — contact status */}
        <div className="mt-2 px-4">
          {lastContactTime ? (
            <p className={cn(
              "inline-flex items-center gap-1.5 text-xs font-semibold",
              lead.last_action === "whatsapped" ? "text-[#1a9e4a]" : "text-blue-600"
            )}>
              {lead.last_action === "whatsapped"
                ? <MessageCircle className="h-3.5 w-3.5" />
                : <PhoneCall className="h-3.5 w-3.5" />}
              {lead.last_action === "whatsapped" ? "WhatsApped" : "Called"} by {lead.last_contacted_by} · {relativeTime(lastContactTime)}
            </p>
          ) : (
            <p className="inline-flex items-center gap-1 text-xs text-slate-400">
              <span className="h-2 w-2 rounded-full bg-slate-300" />
              Never contacted
            </p>
          )}
        </div>

        {/* FOURTH ROW — status badges */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 px-4">
          <LeadQualityBadge quality={lead.leadQuality} />
          <StatusBadgeNew status={lead.status} />
          {lead.followUpDate ? (
            <Badge className="bg-purple-50 text-purple-700 ring-purple-200">
              <Clock className="mr-1 h-3 w-3" />
              {formatReadableDate(lead.followUpDate)}
            </Badge>
          ) : null}
        </div>

        {/* PITCH — collapsed by default */}
        {lead.pitchMessage ? (
          <div className="mt-3 px-4">
            <div className="rounded-xl bg-blue-50 px-3 py-2.5 ring-1 ring-blue-100">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">Pitch</p>
              <p className="mt-1 text-xs leading-relaxed text-blue-900 whitespace-pre-line">
                {pitchExpanded ? lead.pitchMessage : pitchPreview}
              </p>
              {hasPitchMore ? (
                <button
                  type="button"
                  onClick={() => setPitchExpanded((v) => !v)}
                  className="mt-1 text-[11px] font-semibold text-blue-600 hover:underline"
                >
                  {pitchExpanded ? "Show less ↑" : "Show more ↓"}
                </button>
              ) : null}
            </div>
          </div>
        ) : lead.strongHook ? (
          <div className="mt-3 px-4">
            <div className="rounded-xl bg-amber-50 px-3 py-2.5 ring-1 ring-amber-100">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600">Why call?</p>
              <p className="mt-1 line-clamp-2 text-xs text-amber-900">{lead.strongHook}</p>
            </div>
          </div>
        ) : null}

        {/* BUTTONS */}
        <div className="mt-3 grid grid-cols-3 gap-2 px-4 pb-4">
          <a
            href={`tel:${lead.phone}`}
            onClick={() => handleContact("call")}
            className="inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl bg-emerald-500 text-sm font-semibold text-white transition active:scale-[0.97] hover:bg-emerald-600"
          >
            <PhoneCall className="h-4 w-4" />
            Call
          </a>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleContact("whatsapp")}
            className="inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl bg-[#25D366] text-sm font-semibold text-white transition active:scale-[0.97] hover:bg-[#1fba58]"
          >
            <MessageCircle className="h-4 w-4" />
            WA
          </a>
          {onViewDetails ? (
            <button
              type="button"
              onClick={() => onViewDetails(lead._id)}
              className="inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 transition active:scale-[0.97] hover:bg-slate-200"
            >
              <Eye className="h-4 w-4" />
              View
            </button>
          ) : (
            <Link
              href={`/leads/${lead._id}`}
              className="inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700"
            >
              <Eye className="h-4 w-4" />
              View
            </Link>
          )}
        </div>

        {/* Footer hint */}
        {showActions && !isContacted ? (
          <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-400">
            Tap <span className="font-semibold text-emerald-600">Call</span> or <span className="font-semibold text-[#25D366]">WA</span> → moves to history automatically
          </div>
        ) : null}
      </div>

      {/* Quick note toast */}
      {toast ? (
        <QuickNoteToast
          leadId={lead._id}
          leadName={lead.name}
          via={toast.via}
          historyEntryId={toast.historyEntryId}
          onClose={() => setToast(null)}
          onSaved={refreshLeadLists}
        />
      ) : null}
    </>
  );
}

export function LeadCompactRow({
  lead,
  checked,
  onCheckedChange,
  onViewDetails,
  currentUser,
}: {
  lead: LeadRecord;
  checked?: boolean;
  onCheckedChange?: (value: boolean) => void;
  onViewDetails?: (id: string) => void;
  currentUser?: { id: string; name: string };
}) {
  const { mutate } = useSWRConfig();

  async function handleContact(via: "call" | "whatsapp") {
    const userName = currentUser?.name ?? "Team member";
    const userId = currentUser?.id ?? "";
    await markContacted(lead._id, via, userName, userId);
    await mutate((key) => typeof key === "string" && key.startsWith("/leads"));
  }

  const whatsappUrl = getWhatsAppUrl(lead);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {onCheckedChange ? (
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onCheckedChange(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-slate-300"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-slate-950">{lead.name}</p>
              <p className="truncate text-sm text-slate-500">{lead.phone}</p>
            </div>
            <NicheBadge niche={lead.niche} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <LeadQualityBadge quality={lead.leadQuality} />
            <StatusBadgeNew status={lead.status} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a
              href={`tel:${lead.phone}`}
              onClick={() => handleContact("call")}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-semibold text-white"
            >
              <PhoneCall className="h-4 w-4" />Call
            </a>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleContact("whatsapp")}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-semibold text-white"
            >
              <MessageCircle className="h-4 w-4" />WA
            </a>
          </div>
          {onViewDetails ? (
            <button
              type="button"
              onClick={() => onViewDetails(lead._id)}
              className="mt-2 w-full text-center text-sm font-semibold text-slate-500 underline underline-offset-4"
            >View Details</button>
          ) : (
            <Link
              href={`/leads/${lead._id}`}
              className="mt-2 block text-center text-sm font-semibold text-slate-500 underline underline-offset-4"
            >View Details</Link>
          )}
        </div>
      </div>
    </div>
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
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />
      {logs.map((log, index) => (
        <div key={`${log.calledAt ?? index}`} className="relative flex gap-4 pb-5 last:pb-0">
          <div className={cn(
            "relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-white",
            log.connected ? "bg-emerald-500" : "bg-slate-300"
          )} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  {typeof log.calledBy === "string" ? "Team member" : (log.calledBy?.name ?? "Team member")}
                </p>
                {(log as { via?: string }).via === "whatsapp" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#25D366]/10 px-2 py-0.5 text-[10px] font-semibold text-[#1a9e4a]">
                    <MessageCircle className="h-2.5 w-2.5" />WA
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    <PhoneCall className="h-2.5 w-2.5" />Call
                  </span>
                )}
              </div>
              <p className="shrink-0 text-[11px] text-slate-400">{formatReadableDateTime(log.calledAt)}</p>
            </div>
            <p className="mt-1 text-sm text-slate-600">{log.notes || "No notes"}</p>
            <div className="mt-1 flex flex-wrap gap-2 text-xs">
              <span className={log.connected ? "font-semibold text-emerald-600" : "text-slate-400"}>
                {log.connected ? "✓ Connected" : "✗ Not connected"}
              </span>
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
