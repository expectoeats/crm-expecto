"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import {
  CalendarDays, Check, Copy, Edit2, ExternalLink, MessageCircle,
  PhoneCall, Save, Star, X, MapPin, Globe, Hash,
} from "lucide-react";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { NicheBadge, WebsiteStatusBadge } from "@/components/badges";
import { apiFetch } from "@/lib/http";
import { formatReadableDate, formatReadableDateTime } from "@/lib/time";
import { ALL_STATUSES, statusConfig, cn } from "@/lib/ui";
import type { LeadRecord } from "@/components/lead-utils";

const fetcher = async (path: string) =>
  (await apiFetch<{ lead: LeadRecord }>(path)).data?.lead ?? null;

function getWhatsAppUrl(lead: LeadRecord) {
  const number = (lead.whatsapp || lead.phone).replace(/\D/g, "");
  const message = lead.pitchMessage
    ? encodeURIComponent(lead.pitchMessage)
    : encodeURIComponent(`Namaste! ${lead.name} wale hain aap? Main aapke business ke baare mein baat karna chahta tha.`);
  return `https://wa.me/${number}?text=${message}`;
}

export function LeadDrawer({
  leadId,
  onClose,
  onUpdated,
}: {
  leadId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const { data: lead, mutate } = useSWR(
    leadId ? `/leads/${leadId}` : null,
    fetcher
  );

  const [editingPitch, setEditingPitch] = useState(false);
  const [pitchText, setPitchText] = useState("");
  const [pitchCopied, setPitchCopied] = useState(false);
  const [status, setStatus] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lead) {
      setStatus(lead.status);
      setPitchText(lead.pitchMessage ?? "");
      setFollowUpDate(
        lead.followUpDate
          ? new Date(lead.followUpDate).toISOString().slice(0, 10)
          : ""
      );
    }
  }, [lead]);

  // Close on ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    if (leadId) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [leadId]);

  async function saveStatus() {
    if (!lead) return;
    setSavingStatus(true);
    try {
      await apiFetch(`/leads/${lead._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await mutate();
      onUpdated?.();
    } finally {
      setSavingStatus(false);
    }
  }

  async function saveFollowUp() {
    if (!lead) return;
    setSavingFollowUp(true);
    try {
      await apiFetch(`/leads/${lead._id}/followup`, {
        method: "PATCH",
        body: JSON.stringify({ followUpDate, followUpNote: "" }),
      });
      await mutate();
      onUpdated?.();
    } finally {
      setSavingFollowUp(false);
    }
  }

  async function savePitch() {
    if (!lead) return;
    await apiFetch(`/leads/${lead._id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ pitchMessage: pitchText }),
    });
    setEditingPitch(false);
    await mutate();
  }

  async function copyPitch() {
    if (!lead?.pitchMessage) return;
    await navigator.clipboard.writeText(lead.pitchMessage);
    setPitchCopied(true);
    setTimeout(() => setPitchCopied(false), 2000);
  }

  if (!leadId) return null;

  const contactHistory = (lead as (LeadRecord & { contact_history?: Array<{ _id: string; action: string; by_name: string; at: string; note: string }> }) | null)?.contact_history ?? [];
  const whatsappUrl = lead ? getWhatsAppUrl(lead) : "#";
  const cfg = status ? statusConfig[status] : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col bg-white shadow-2xl"
        style={{ animation: "slideInRight 0.22s cubic-bezier(0.22,1,0.36,1)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="min-w-0 flex-1">
            {lead ? (
              <>
                <p className="truncate text-lg font-bold text-slate-950">{lead.name}</p>
                <p className="truncate text-sm text-slate-500">{lead.city ?? ""}</p>
              </>
            ) : (
              <div className="space-y-2">
                <div className="h-5 w-48 animate-pulse rounded-full bg-slate-200" />
                <div className="h-3 w-32 animate-pulse rounded-full bg-slate-200" />
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {!lead ? (
            <div className="space-y-4 p-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">

              {/* SECTION A — Lead Info */}
              <div className="space-y-3 p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">Lead Info</p>

                <div className="flex flex-wrap gap-2">
                  <NicheBadge niche={lead.niche} />
                  <WebsiteStatusBadge websiteStatus={lead.websiteStatus ?? "no_website"} />
                  {lead.rating != null ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {lead.rating}
                      {lead.reviewCount != null ? ` (${lead.reviewCount})` : ""}
                    </span>
                  ) : null}
                  {lead.score != null ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-200">
                      <Hash className="h-3 w-3" />
                      Score {lead.score}
                    </span>
                  ) : null}
                </div>

                <div className="space-y-2 rounded-2xl bg-slate-50 p-3">
                  <InfoRow icon={<PhoneCall className="h-3.5 w-3.5" />} label={lead.phone} />
                  {lead.city ? <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label={lead.city} /> : null}
                  {lead.websiteUrl ? (
                    <a href={lead.websiteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-blue-600 hover:underline">
                      <Globe className="h-3.5 w-3.5" />
                      {lead.websiteUrl}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                </div>

                {/* Quick action buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`tel:${lead.phone}`}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-semibold text-white active:scale-[0.97]"
                  >
                    <PhoneCall className="h-4 w-4" />
                    Call
                  </a>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-semibold text-white active:scale-[0.97]"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </a>
                </div>
              </div>

              {/* SECTION B — Pitch Message */}
              {(lead.pitchMessage || editingPitch) ? (
                <div className="space-y-3 p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">Pitch Message</p>
                    <div className="flex gap-2">
                      {!editingPitch ? (
                        <>
                          <button
                            onClick={copyPitch}
                            className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                          >
                            {pitchCopied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                            {pitchCopied ? "Copied" : "Copy"}
                          </button>
                          <button
                            onClick={() => { setEditingPitch(true); setPitchText(lead.pitchMessage ?? ""); }}
                            className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                          >
                            <Edit2 className="h-3 w-3" />
                            Edit
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingPitch(false)}
                            className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={savePitch}
                            className="flex items-center gap-1 rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white"
                          >
                            <Save className="h-3 w-3" />
                            Save
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {editingPitch ? (
                    <Textarea
                      value={pitchText}
                      onChange={(e) => setPitchText(e.target.value)}
                      className="min-h-[120px] text-sm"
                    />
                  ) : (
                    <div className="rounded-2xl bg-blue-50 p-3 ring-1 ring-blue-100">
                      <p className="text-sm leading-relaxed text-blue-900">{lead.pitchMessage}</p>
                    </div>
                  )}
                </div>
              ) : null}

              {/* SECTION C — Contact History */}
              <div className="space-y-3 p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">Contact History</p>

                {contactHistory.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 py-4 text-center text-sm text-slate-400">
                    No contact history yet
                  </p>
                ) : (
                  <div className="relative space-y-0">
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />
                    {[...contactHistory].reverse().map((entry) => (
                      <div key={entry._id} className="relative flex gap-3 pb-4 last:pb-0">
                        <div className={cn(
                          "relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-white",
                          entry.action === "whatsapped" ? "bg-[#25D366]" : "bg-emerald-500"
                        )} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900">{entry.by_name}</span>
                              <span className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                entry.action === "whatsapped"
                                  ? "bg-[#25D366]/10 text-[#1a9e4a]"
                                  : "bg-emerald-50 text-emerald-700"
                              )}>
                                {entry.action === "whatsapped" ? <MessageCircle className="h-2.5 w-2.5" /> : <PhoneCall className="h-2.5 w-2.5" />}
                                {entry.action === "whatsapped" ? "WhatsApp" : "Called"}
                              </span>
                            </div>
                            <span className="shrink-0 text-[11px] text-slate-400">{formatReadableDateTime(entry.at)}</span>
                          </div>
                          {entry.note ? (
                            <p className="mt-1 text-sm text-slate-600">"{entry.note}"</p>
                          ) : (
                            <p className="mt-1 text-xs text-slate-400 italic">No note added</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {/* Lead added entry */}
                    <div className="relative flex gap-3 pb-0">
                      <div className="relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full bg-slate-300 ring-2 ring-white" />
                      <div>
                        <p className="text-xs font-semibold text-slate-500">Lead Added</p>
                        <p className="text-[11px] text-slate-400">{formatReadableDateTime(lead.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION D — Follow Up */}
              <div className="space-y-3 p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">Follow Up Scheduler</p>
                <div className="rounded-2xl bg-slate-50 p-3">
                  {lead.followUpDate ? (
                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <CalendarDays className="h-4 w-4 text-orange-500" />
                      Follow up on: {formatReadableDate(lead.followUpDate)}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400">No follow-up scheduled</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={saveFollowUp} disabled={savingFollowUp} className="shrink-0">
                    {savingFollowUp ? "…" : "Set"}
                  </Button>
                </div>
              </div>

              {/* SECTION E — Status Changer */}
              <div className="space-y-3 p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">Change Status</p>
                {cfg ? (
                  <div className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ring-1", cfg.className)}>
                    <span>{cfg.emoji}</span>
                    {cfg.label}
                  </div>
                ) : null}
                <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                  {ALL_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </Select>
                <Button onClick={saveStatus} disabled={savingStatus} className="w-full">
                  {savingStatus ? "Saving..." : "Save Status"}
                </Button>
              </div>

            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

function InfoRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-600">
      <span className="text-slate-400">{icon}</span>
      {label}
    </div>
  );
}
