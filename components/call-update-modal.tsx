"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  RiCalendarScheduleLine,
  RiCheckboxCircleLine,
  RiPhoneLine,
  RiSaveLine,
  RiCloseLine,
  RiCheckDoubleLine,
  RiHandCoinLine,
  RiBarChartLine,
  RiThumbDownLine,
  RiPhoneLine as RiPhoneOffLine,
  RiTimeLine,
  RiAlertLine,
  RiEditLine as RiEdit3Line,
} from "react-icons/ri";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/http";
import type { LeadRecord } from "@/components/lead-utils";

const outcomeOptions = [
  {
    value: "deal_done",
    label: "Deal Done",
    helper: "Client agreed. Mark this as won.",
    icon: <RiCheckDoubleLine className="h-4 w-4" />,
    connected: true,
    needsFollowUp: false,
  },
  {
    value: "connected_interested",
    label: "Interested",
    helper: "Good conversation. Keep this warm.",
    icon: <RiCheckboxCircleLine className="h-4 w-4" />,
    connected: true,
    needsFollowUp: true,
  },
  {
    value: "price_negotiation",
    label: "Price Negotiation",
    helper: "They want to discuss pricing further.",
    icon: <RiHandCoinLine className="h-4 w-4" />,
    connected: true,
    needsFollowUp: true,
  },
  {
    value: "callback_requested",
    label: "Callback Requested",
    helper: "They asked you to call later.",
    icon: <RiCalendarScheduleLine className="h-4 w-4" />,
    connected: true,
    needsFollowUp: true,
  },
  {
    value: "proposal_sent",
    label: "Proposal Sent",
    helper: "Pitch landed. Proposal is the next step.",
    icon: <RiBarChartLine className="h-4 w-4" />,
    connected: true,
    needsFollowUp: true,
  },
  {
    value: "no_answer",
    label: "Call Not Received",
    helper: "No response. Try again later.",
    icon: <RiPhoneOffLine className="h-4 w-4" />,
    connected: false,
    needsFollowUp: true,
  },
  {
    value: "busy",
    label: "Busy",
    helper: "They were unavailable but reachable.",
    icon: <RiTimeLine className="h-4 w-4" />,
    connected: true,
    needsFollowUp: true,
  },
  {
    value: "wrong_number",
    label: "Wrong Number",
    helper: "Bad contact. Remove from active chase.",
    icon: <RiAlertLine className="h-4 w-4" />,
    connected: false,
    needsFollowUp: false,
  },
  {
    value: "not_interested",
    label: "Not Interested",
    helper: "Close this politely and move on.",
    icon: <RiThumbDownLine className="h-4 w-4" />,
    connected: true,
    needsFollowUp: false,
  },
] as const;

function defaultFollowUpDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function CallUpdateModal({
  lead,
  open,
  onClose,
  onSaved,
}: {
  lead: LeadRecord;
  open: boolean;
  onClose: () => void;
  onSaved?: (lead: LeadRecord) => void | Promise<void>;
}) {
  const [outcome, setOutcome] = useState<(typeof outcomeOptions)[number]["value"]>("connected_interested");
  const [notes, setNotes] = useState("");
  const [duration, setDuration] = useState("");
  const [followUpDate, setFollowUpDate] = useState(defaultFollowUpDate);
  const [followUpNote, setFollowUpNote] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedOutcome = useMemo(
    () => outcomeOptions.find((o) => o.value === outcome) ?? outcomeOptions[0],
    [outcome]
  );

  async function saveCallUpdate() {
    setSaving(true);
    try {
      const response = await apiFetch<{ lead: LeadRecord }>(`/leads/${lead._id}/calllog`, {
        method: "POST",
        body: JSON.stringify({
          outcome,
          connected: selectedOutcome.connected,
          notes: manualNote.trim() ? `${notes}\n\n[Manual note]: ${manualNote.trim()}` : notes,
          duration,
          followUpDate: selectedOutcome.needsFollowUp ? followUpDate : "",
          followUpNote: selectedOutcome.needsFollowUp ? followUpNote || selectedOutcome.helper : "",
        }),
      });

      setNotes("");
      setDuration("");
      setFollowUpNote("");
      setManualNote("");
      setFollowUpDate(defaultFollowUpDate());
      await onSaved?.(response.data?.lead ?? lead);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 overflow-y-auto bg-slate-950" style={{zIndex:99999}}>
      <div className="min-h-full bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_35%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] px-4 py-5 text-white">

        {/* Header */}
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">Call Update</p>
            <h2 className="mt-1.5 text-2xl font-bold">{lead.name}</h2>
            <p className="mt-0.5 text-sm text-slate-400">{lead.phone}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-2xl bg-white/10 p-3 text-white ring-1 ring-white/15 hover:bg-white/20 transition"
          >
            <RiCloseLine className="h-5 w-5" />
          </button>
        </div>

        <div className="mx-auto mt-6 grid max-w-3xl gap-4">

          {/* Call again button */}
          <a
            href={`tel:${lead.phone}`}
            className="inline-flex min-h-[58px] items-center justify-center gap-2 rounded-3xl bg-emerald-500 px-5 py-4 text-base font-bold text-white shadow-[0_20px_50px_rgba(16,185,129,0.28)] hover:bg-emerald-600 transition active:scale-[0.97]"
          >
            <RiPhoneLine className="h-5 w-5" />
            Call Again
          </a>

          {/* Outcome picker */}
          <div className="rounded-[2rem] bg-white p-5 text-slate-950 shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <RiBarChartLine className="h-5 w-5 text-amber-500" />
              <p className="text-sm font-bold text-slate-800">What happened on the call?</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {outcomeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setOutcome(option.value)}
                  className={`rounded-2xl p-3.5 text-left ring-1 transition ${
                    outcome === option.value
                      ? "bg-slate-950 text-white ring-slate-950"
                      : "bg-slate-50 text-slate-700 ring-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <span className={outcome === option.value ? "text-emerald-400" : "text-slate-400"}>
                      {option.icon}
                    </span>
                    {option.label}
                  </span>
                  <span className={`mt-1 block text-xs leading-relaxed ${outcome === option.value ? "text-slate-400" : "text-slate-500"}`}>
                    {option.helper}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="rounded-[2rem] bg-white p-5 text-slate-950 shadow-2xl space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Select value={duration} onChange={(e) => setDuration(e.target.value)}>
                <option value="">Call duration</option>
                <option value="<1 min">Under 1 min</option>
                <option value="1-3 min">1–3 min</option>
                <option value="3-7 min">3–7 min</option>
                <option value="7+ min">7+ min</option>
              </Select>
              {selectedOutcome.needsFollowUp ? (
                <Input
                  type="datetime-local"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                />
              ) : null}
            </div>

            {selectedOutcome.needsFollowUp ? (
              <div className="rounded-2xl bg-orange-50 p-3 text-sm text-orange-800 ring-1 ring-orange-200 flex items-start gap-2">
                <RiCalendarScheduleLine className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                <span>This will also create / update the follow-up reminder for this lead.</span>
              </div>
            ) : null}

            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Quick notes: objection, budget, decision maker, next promise…"
            />

            {selectedOutcome.needsFollowUp ? (
              <Input
                value={followUpNote}
                onChange={(e) => setFollowUpNote(e.target.value)}
                placeholder="Reminder note, e.g. send pricing before calling"
              />
            ) : null}
          </div>

          {/* Manual / custom note */}
          <div className="rounded-[2rem] bg-white p-5 text-slate-950 shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <RiEdit3Line className="h-5 w-5 text-violet-500" />
              <p className="text-sm font-bold text-slate-800">Add a custom note</p>
            </div>
            <Textarea
              value={manualNote}
              onChange={(e) => setManualNote(e.target.value)}
              placeholder="Write anything else you want to remember about this call…"
              className="min-h-[90px]"
            />
          </div>

          {/* Save */}
          <Button
            className="w-full min-h-[54px] rounded-3xl text-base font-bold"
            onClick={saveCallUpdate}
            disabled={saving}
          >
            <RiSaveLine className="h-5 w-5" />
            {saving ? "Saving…" : "Save Call Update"}
          </Button>

          {/* Bottom spacing */}
          <div className="h-6" />
        </div>
      </div>
    </div>,
    document.body
  );
}
