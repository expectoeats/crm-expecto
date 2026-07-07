"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSWRConfig } from "swr";
import {
  RiPhoneLine,
  RiWhatsappLine,
  RiEyeLine,
  RiStarLine,
  RiStarFill,
  RiCalendarLine,
  RiTimeLine,
  RiMessageLine,
  RiPhoneLine as RiPhoneOffLine,
  RiCheckDoubleLine,
  RiThumbDownLine,
  RiSendPlaneLine,
  RiLightbulbFlashLine,
  RiRefreshLine,
  RiCircleLine,
  RiEditLine,
  RiFlashlightLine,
  RiCheckboxCircleLine,
  RiCloseLine,
  RiBarChartLine,
} from "react-icons/ri";
import Link from "next/link";
import { Badge as _Badge } from "@/components/ui";
import { LeadQualityBadge, NicheBadge, TierBadge } from "@/components/badges";
import { formatReadableDate, formatReadableDateTime } from "@/lib/time";
import { apiFetch } from "@/lib/http";
import { statusConfig, cn } from "@/lib/ui";
import { QuickNoteToast } from "@/components/quick-note-toast";
import { CallUpdateModal } from "@/components/call-update-modal";

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
  contact_history?: ContactEntry[];
  last_contacted_at?: string;
  last_contacted_by?: string;
  last_action?: "called" | "whatsapped" | null;
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
  future_crm_opportunity?: boolean;
  crm_lead_score?: number;
  // Scraper-stored fields
  leadScore?: number;
  lead_tier?: "hot" | "warm" | "cold";
  isHotLead?: boolean;
  crm_score?: number;
  crm_score_reasons?: string[];
  score_reasons?: string[];
  lead_type?: string;
  sourcePlatform?: string;
  estimatedBudget?: string;
  photo_count?: number;
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

export function getLastContactInfo(lead: LeadRecord) {
  // Prefer explicit last_* fields, fall back to contact_history, then callLogs
  if (lead.last_contacted_at) {
    return {
      at: lead.last_contacted_at,
      by: lead.last_contacted_by ?? null,
      action: lead.last_action ?? null,
    };
  }

  const history = Array.isArray(lead.contact_history) ? lead.contact_history : [];
  if (history.length) {
    const last = history[history.length - 1];
    return { at: last.at, by: last.by_name ?? null, action: last.action ?? null };
  }

  const logs = Array.isArray(lead.callLogs) ? lead.callLogs : [];
  if (logs.length) {
    const last = logs[logs.length - 1];
    return {
      at: last.calledAt ?? null,
      by: typeof last.calledBy === "string" ? "Team member" : (last.calledBy?.name ?? "Team member"),
      action: (last.via === "whatsapp" ? "whatsapped" : "called"),
    };
  }

  return null;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  new:            <RiCircleLine className="h-3 w-3" />,
  reached_out:    <RiPhoneLine className="h-3 w-3" />,
  in_talks:       <RiMessageLine className="h-3 w-3" />,
  interested:     <RiLightbulbFlashLine className="h-3 w-3" />,
  converted:      <RiCheckboxCircleLine className="h-3 w-3" />,
  not_interested: <RiThumbDownLine className="h-3 w-3" />,
  follow_up:      <RiCalendarLine className="h-3 w-3" />,
  called:         <RiPhoneLine className="h-3 w-3" />,
  callback:       <RiRefreshLine className="h-3 w-3" />,
  proposal_sent:  <RiSendPlaneLine className="h-3 w-3" />,
  closed_won:     <RiFlashlightLine className="h-3 w-3" />,
  closed_lost:    <RiThumbDownLine className="h-3 w-3" />,
};

function StatusBadgeNew({ status }: { status: string }) {
  const cfg  = statusConfig[status];
  const icon = STATUS_ICONS[status];
  if (!cfg) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ring-violet-200 text-violet-700">
        <RiEditLine className="h-3 w-3" />
        {status}
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset", cfg.className)}>
      {icon}
      {cfg.label}
    </span>
  );
}

function CrmUpsellBadge({ score }: { score?: number | null }) {
  const [open, setOpen] = useState(false);
  const label = score != null ? `Future CRM Upsell (Score: ${score})` : "Future CRM Upsell";

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label="Future CRM Upsell opportunity details"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700 ring-1 ring-inset ring-violet-300 transition hover:bg-violet-200"
      >
        <RiFlashlightLine className="h-3 w-3" />
        {label}
      </button>
      {open ? (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-0 z-50 mb-1.5 w-64 rounded-xl bg-violet-900 px-3 py-2.5 text-[11px] leading-relaxed text-white shadow-xl"
        >
          This business also qualifies as a strong CRM product buyer. Recommended: deliver their website first, then pitch the CRM 30–60 days after launch.
          <span className="absolute left-4 top-full h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-violet-900" />
        </span>
      ) : null}
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
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [waModalOpen, setWaModalOpen] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { mutate } = useSWRConfig();
  const [pitchExpanded, setPitchExpanded] = useState(false);

  const refreshLeadLists = useCallback(async () => {
    await mutate((key) => typeof key === "string" && key.startsWith("/leads"));
  }, [mutate]);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  async function handleWhatsApp() {
    const userName = currentUser?.name ?? "Team member";
    const userId = currentUser?.id ?? "";
    const result = await markContacted(lead._id, "whatsapp", userName, userId);
    await refreshLeadLists();
    toastTimer.current = setTimeout(() => {
      setToast({ via: "whatsapp", historyEntryId: result.history_entry_id });
    }, 3000);
  }

  function handleCallClick(e: React.MouseEvent) {
    // Let the tel: link fire, then open the modal
    e.preventDefault();
    // Open tel: manually
    window.location.href = `tel:${lead.phone}`;
    // Open update modal
    setCallModalOpen(true);
  }

  const whatsappUrl = getWhatsAppUrl(lead);
  const lastContact = getLastContactInfo(lead);
  const isContacted = Boolean(lastContact) || lead.status !== "new";
  const lastContactTime = lastContact?.at ?? null;
  const lastContactBy = lastContact?.by ?? null;
  const lastContactAction = lastContact?.action ?? null;
  const pitchLines = (lead.pitchMessage ?? "").split("\n");
  const pitchPreview = pitchLines.slice(0, 2).join("\n");
  const hasPitchMore = pitchLines.length > 2 || (lead.pitchMessage?.length ?? 0) > 120;
  const assignedName = typeof lead.assignedTo === "object" && lead.assignedTo !== null
    ? lead.assignedTo.name ?? ""
    : "";

  return (
    <>
      <div className={cn(
        "overflow-hidden rounded-2xl ring-1 transition-all",
        lead.status === "not_interested" || lead.status === "closed_lost"
          ? "bg-red-50/80 ring-red-200"
          : lead.status === "interested" || lead.status === "closed_won" || lead.status === "converted"
          ? "bg-emerald-50/80 ring-emerald-200"
          : isContacted
          ? "bg-white ring-slate-200"
          : "bg-white ring-slate-200 shadow-sm hover:shadow-md"
      )}>
        {/* Status accent bar */}
        {(lead.status === "not_interested" || lead.status === "closed_lost") ? (
          <div className="h-1 w-full bg-red-400" />
        ) : (lead.status === "interested" || lead.status === "closed_won" || lead.status === "converted") ? (
          <div className="h-1 w-full bg-emerald-400" />
        ) : null}

        {/* HEADER */}
        <div className="px-4 pt-4 pb-3">
          {/* Row 1: Name + assigned avatar */}
          <div className="flex items-start justify-between gap-2 min-w-0">
            <button
              type="button"
              onClick={() => onViewDetails?.(lead._id)}
              className="min-w-0 flex-1 text-left"
            >
              <h3 className="truncate text-[15px] font-bold leading-tight text-slate-950 hover:text-slate-700">
                {lead.name}
              </h3>
            </button>
            {assignedName ? (
              <div
                className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600"
                title={assignedName}
              >
                {getInitials(assignedName)}
              </div>
            ) : null}
          </div>

          {/* Row 2: Rating + city — compact single line */}
          {(lead.rating != null || lead.city || lead.ownerName) ? (
            <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500 min-w-0">
              {lead.rating != null ? (
                <span className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-amber-600">
                  <RiStarFill className="h-3 w-3 text-amber-400" />
                  {lead.rating}
                  {lead.reviewCount != null ? (
                    <span className="font-normal text-slate-400">({lead.reviewCount})</span>
                  ) : null}
                </span>
              ) : null}
              {lead.city ? (
                <>
                  {lead.rating != null ? <span className="text-slate-300 shrink-0">·</span> : null}
                  <span className="truncate">{lead.city}</span>
                </>
              ) : null}
              {lead.ownerName ? (
                <>
                  <span className="text-slate-300 shrink-0">·</span>
                  <span className="truncate text-slate-400">{lead.ownerName}</span>
                </>
              ) : null}
            </div>
          ) : null}

          {/* Row 3: Badges — wrapping cleanly */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <NicheBadge niche={lead.niche} />
            {lead.tier ? <TierBadge tier={lead.tier} label={lead.tierLabel} /> : null}
            <StatusBadgeNew status={lead.status} />
            {/* Show actual lead score from scraper if available */}
            {(lead.leadScore ?? lead.score) != null ? (
              <span className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset",
                (lead.leadScore ?? lead.score ?? 0) >= 80
                  ? "bg-red-50 text-red-700 ring-red-200"
                  : (lead.leadScore ?? lead.score ?? 0) >= 60
                  ? "bg-amber-50 text-amber-700 ring-amber-200"
                  : "bg-slate-100 text-slate-500 ring-slate-200"
              )}>
                <RiBarChartLine className="h-2.5 w-2.5" />
                {lead.leadScore ?? lead.score}
              </span>
            ) : null}
            {lead.future_crm_opportunity ? (
              <CrmUpsellBadge score={lead.crm_lead_score} />
            ) : null}
          </div>

          {/* Row 4: Last contact / never contacted + follow-up date */}
          <div className="mt-2 flex items-center justify-between gap-2">
            {lastContact ? (
              <p className={cn(
                "inline-flex min-w-0 items-center gap-2 truncate text-base md:text-lg font-extrabold",
                lastContactAction === "whatsapped" ? "text-[#1a9e4a]" : "text-blue-600"
              )}>
                {lastContactAction === "whatsapped"
                  ? <RiWhatsappLine className="h-5 w-5 shrink-0" />
                  : <RiPhoneLine className="h-5 w-5 shrink-0" />}
                <span className="truncate">
                  {lastContactAction === "whatsapped" ? "WA" : "Called"}&nbsp;·&nbsp;{lastContactBy ?? "Team member"}&nbsp;·&nbsp;{formatReadableDateTime(lastContactTime)}
                </span>
              </p>
            ) : (
              <p className="inline-flex items-center gap-1 text-xs text-slate-400">
                <span className="h-2 w-2 shrink-0 rounded-full bg-slate-300" />
                Never contacted
              </p>
            )}
            {lead.followUpDate ? (
              <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 ring-1 ring-inset ring-purple-200">
                <RiTimeLine className="h-2.5 w-2.5" />
                {formatReadableDate(lead.followUpDate)}
              </span>
            ) : null}
          </div>
        </div>

        {/* PITCH / HOOK */}
        {lead.pitchMessage ? (
          <div className={cn(
            "mx-4 mb-3 rounded-xl px-3 py-2.5 ring-1",
            lead.status === "not_interested" || lead.status === "closed_lost"
              ? "bg-red-100/60 ring-red-200"
              : lead.status === "interested" || lead.status === "closed_won" || lead.status === "converted"
              ? "bg-emerald-100/60 ring-emerald-200"
              : "bg-blue-50 ring-blue-100"
          )}>
            <p className={cn(
              "text-[10px] font-bold uppercase tracking-widest mb-1",
              lead.status === "not_interested" || lead.status === "closed_lost"
                ? "text-red-500"
                : lead.status === "interested" || lead.status === "closed_won" || lead.status === "converted"
                ? "text-emerald-600"
                : "text-blue-500"
            )}>Pitch</p>
            <p className={cn(
              "text-xs leading-relaxed whitespace-pre-line",
              lead.status === "not_interested" || lead.status === "closed_lost"
                ? "text-red-900"
                : lead.status === "interested" || lead.status === "closed_won" || lead.status === "converted"
                ? "text-emerald-900"
                : "text-blue-900"
            )}>
              {pitchExpanded ? lead.pitchMessage : pitchPreview}
            </p>
            {hasPitchMore ? (
              <button
                type="button"
                onClick={() => setPitchExpanded((v) => !v)}
                className={cn(
                  "mt-1.5 text-[11px] font-semibold hover:underline",
                  lead.status === "not_interested" || lead.status === "closed_lost"
                    ? "text-red-500"
                    : lead.status === "interested" || lead.status === "closed_won" || lead.status === "converted"
                    ? "text-emerald-600"
                    : "text-blue-600"
                )}
              >
                {pitchExpanded ? "Show less" : "Show more"}
              </button>
            ) : null}
          </div>
        ) : lead.strongHook ? (
          <div className="mx-4 mb-3 rounded-xl bg-amber-50 px-3 py-2.5 ring-1 ring-amber-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-1">Why call?</p>
            <p className="line-clamp-2 text-xs text-amber-900">{lead.strongHook}</p>
          </div>
        ) : null}

        {/* ACTION BUTTONS */}
        <div className="grid grid-cols-3 gap-2 px-4 pb-4">
          <button
            type="button"
            onClick={handleCallClick}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 text-sm font-semibold text-white transition active:scale-[0.97] hover:bg-emerald-600"
          >
            <RiPhoneLine className="h-4 w-4" />
            Call
          </button>
          <button
            type="button"
            onClick={() => setWaModalOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] text-sm font-semibold text-white transition active:scale-[0.97] hover:bg-[#1fba58]"
          >
            <RiWhatsappLine className="h-4 w-4" />
            WA
          </button>
          {onViewDetails ? (
            <button
              type="button"
              onClick={() => onViewDetails(lead._id)}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 transition active:scale-[0.97] hover:bg-slate-200"
            >
              <RiEyeLine className="h-4 w-4" />
              View
            </button>
          ) : (
            <Link
              href={`/leads/${lead._id}`}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700"
            >
              <RiEyeLine className="h-4 w-4" />
              View
            </Link>
          )}
        </div>

        {/* FOOTER HINT */}
        {showActions && !isContacted ? (
          <div className={cn(
            "border-t px-4 py-2 text-[11px]",
            lead.status === "not_interested" || lead.status === "closed_lost"
              ? "border-red-100 bg-red-100/40 text-red-400"
              : "border-slate-100 bg-slate-50 text-slate-400"
          )}>
            Tap <span className="font-semibold text-emerald-600">Call</span> or{" "}
            <span className="font-semibold text-[#25D366]">WA</span> to log contact
          </div>
        ) : null}
      </div>

      {/* Call update modal */}
      <CallUpdateModal
        lead={lead}
        open={callModalOpen}
        onClose={() => setCallModalOpen(false)}
        onSaved={async () => {
          const userName = currentUser?.name ?? "Team member";
          const userId = currentUser?.id ?? "";
          await markContacted(lead._id, "call", userName, userId);
          await refreshLeadLists();
        }}
      />

      {/* WA update modal — rendered via portal to escape overflow:hidden parents */}
      {waModalOpen && typeof document !== "undefined" ? createPortal(
        <div className="fixed inset-0 overflow-y-auto" style={{zIndex:99999, background:"linear-gradient(160deg,#075E54 0%,#128C7E 60%,#0d7a6b 100%)"}}>
          <div className="min-h-full px-4 pb-8 pt-5 text-white">
            {/* Header */}
            <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-emerald-200/80">WhatsApp</p>
                <h2 className="mt-1 text-xl font-bold">{lead.name}</h2>
                <p className="mt-0.5 text-sm text-white/50">{lead.phone}</p>
              </div>
              <button
                type="button"
                onClick={() => setWaModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/20 transition"
              >
                <RiCloseLine className="h-5 w-5" />
              </button>
            </div>

            <div className="mx-auto mt-5 max-w-lg space-y-3">
              {/* Open WhatsApp button */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[54px] items-center justify-center gap-2.5 rounded-2xl bg-[#25D366] px-5 py-3.5 text-[15px] font-bold text-white shadow-[0_12px_32px_rgba(37,211,102,0.4)] hover:bg-[#1fba58] transition active:scale-[0.97]"
              >
                <RiWhatsappLine className="h-5 w-5" />
                Open WhatsApp
              </a>

              {/* Outcome card */}
              <div className="rounded-3xl bg-white p-4 text-slate-950 shadow-2xl">
                <p className="mb-3 text-[13px] font-bold text-slate-700">What happened on WhatsApp?</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Message Sent",     sub: "Sent the pitch message",     outcome: "no_answer"            },
                    { label: "Interested",        sub: "They replied positively",    outcome: "connected_interested" },
                    { label: "Not Interested",    sub: "They declined or blocked",   outcome: "not_interested"       },
                    { label: "No Reply",          sub: "No response yet",            outcome: "no_answer"            },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={async () => {
                        // 1. Mark contacted (logs the whatsapp action)
                        await handleWhatsApp();
                        // 2. Update lead status based on outcome via calllog API
                        await apiFetch(`/leads/${lead._id}/calllog`, {
                          method: "POST",
                          body: JSON.stringify({
                            outcome: opt.outcome,
                            connected: opt.outcome !== "no_answer",
                            notes: `WhatsApp: ${opt.label}`,
                            duration: "",
                            via: "whatsapp",
                          }),
                        });
                        await refreshLeadLists();
                        setWaModalOpen(false);
                      }}
                      className="rounded-2xl bg-slate-50 px-3 py-3 text-left ring-1 ring-slate-200 hover:bg-[#25D366]/10 hover:ring-[#25D366]/40 transition active:scale-[0.97]"
                    >
                      <p className="text-sm font-semibold text-slate-800">{opt.label}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{opt.sub}</p>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await handleWhatsApp();
                    setWaModalOpen(false);
                  }}
                  className="mt-3 w-full rounded-2xl bg-[#25D366] py-3 text-sm font-bold text-white hover:bg-[#1fba58] transition active:scale-[0.97]"
                >
                  Mark as Contacted & Close
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      ) : null}

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
  const [callModalOpen, setCallModalOpen] = useState(false);

  async function handleWhatsApp() {
    const userName = currentUser?.name ?? "Team member";
    const userId = currentUser?.id ?? "";
    await markContacted(lead._id, "whatsapp", userName, userId);
    await mutate((key) => typeof key === "string" && key.startsWith("/leads"));
  }

  function handleCallClick(e: React.MouseEvent) {
    e.preventDefault();
    window.location.href = `tel:${lead.phone}`;
    setCallModalOpen(true);
  }

  const whatsappUrl = getWhatsAppUrl(lead);
  const lastContact = getLastContactInfo(lead);

  return (
    <>
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
            {lastContact ? (
              <p className="mt-2 text-sm font-semibold">
                {lastContact.action === "whatsapped" ? (
                  <span className="inline-flex items-center gap-1 text-[#1a9e4a]"><RiWhatsappLine className="h-4 w-4" />WA</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald-600"><RiPhoneLine className="h-4 w-4" />Called</span>
                )}&nbsp;·&nbsp;{lastContact.by ?? "Team member"}&nbsp;·&nbsp;{formatReadableDateTime(lastContact.at)}
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-400">Never contacted</p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCallClick}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-semibold text-white"
              >
                <RiPhoneLine className="h-4 w-4" />
                Call
              </button>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleWhatsApp}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-semibold text-white"
              >
                <RiWhatsappLine className="h-4 w-4" />
                WA
              </a>
            </div>
            {onViewDetails ? (
              <button
                type="button"
                onClick={() => onViewDetails(lead._id)}
                className="mt-2 w-full text-center text-sm font-semibold text-slate-500 underline underline-offset-4"
              >
                View Details
              </button>
            ) : (
              <Link
                href={`/leads/${lead._id}`}
                className="mt-2 block text-center text-sm font-semibold text-slate-500 underline underline-offset-4"
              >
                View Details
              </Link>
            )}
          </div>
        </div>
      </div>

      <CallUpdateModal
        lead={lead}
        open={callModalOpen}
        onClose={() => setCallModalOpen(false)}
        onSaved={async () => {
          await mutate((key) => typeof key === "string" && key.startsWith("/leads"));
        }}
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
                    <RiWhatsappLine className="h-2.5 w-2.5" />
                    WA
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    <RiPhoneLine className="h-2.5 w-2.5" />
                    Call
                  </span>
                )}
              </div>
              <p className="shrink-0 text-[11px] text-slate-400">{formatReadableDateTime(log.calledAt)}</p>
            </div>
            <p className="mt-1 text-sm text-slate-600">{log.notes || "No notes"}</p>
            <div className="mt-1 flex flex-wrap gap-2 text-xs">
              <span className={log.connected ? "font-semibold text-emerald-600" : "text-slate-400"}>
                {log.connected ? "Connected" : "Not connected"}
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
