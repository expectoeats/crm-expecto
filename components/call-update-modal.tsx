"use client";

import { useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, PhoneCall, Save, Sparkles, X } from "lucide-react";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/http";
import type { LeadRecord } from "@/components/lead-utils";

const outcomeOptions = [
  {
    value: "deal_done",
    label: "Deal done",
    helper: "Client agreed. Mark this as won.",
    connected: true,
    needsFollowUp: false,
  },
  {
    value: "connected_interested",
    label: "Interested",
    helper: "Good conversation. Keep this warm.",
    connected: true,
    needsFollowUp: true,
  },
  {
    value: "callback_requested",
    label: "Reminder / callback",
    helper: "They asked you to call later.",
    connected: true,
    needsFollowUp: true,
  },
  {
    value: "proposal_sent",
    label: "Proposal sent",
    helper: "Pitch landed. Proposal is the next step.",
    connected: true,
    needsFollowUp: true,
  },
  {
    value: "no_answer",
    label: "Call not received",
    helper: "No response. Try again later.",
    connected: false,
    needsFollowUp: true,
  },
  {
    value: "busy",
    label: "Busy",
    helper: "They were unavailable but reachable.",
    connected: true,
    needsFollowUp: true,
  },
  {
    value: "wrong_number",
    label: "Wrong number",
    helper: "Bad contact. Remove from active chase.",
    connected: false,
    needsFollowUp: false,
  },
  {
    value: "not_interested",
    label: "Not interested",
    helper: "Close this politely and move on.",
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
  const [saving, setSaving] = useState(false);
  const selectedOutcome = useMemo(() => outcomeOptions.find((option) => option.value === outcome) ?? outcomeOptions[0], [outcome]);

  async function saveCallUpdate() {
    setSaving(true);
    try {
      const response = await apiFetch<{ lead: LeadRecord }>(`/leads/${lead._id}/calllog`, {
        method: "POST",
        body: JSON.stringify({
          outcome,
          connected: selectedOutcome.connected,
          notes,
          duration,
          followUpDate: selectedOutcome.needsFollowUp ? followUpDate : "",
          followUpNote: selectedOutcome.needsFollowUp ? followUpNote || selectedOutcome.helper : "",
        }),
      });

      setNotes("");
      setDuration("");
      setFollowUpNote("");
      setFollowUpDate(defaultFollowUpDate());
      await onSaved?.(response.data?.lead ?? lead);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950">
      <div className="min-h-full bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_35%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] px-4 py-5 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200">Call update</p>
            <h2 className="mt-2 text-2xl font-semibold">{lead.name}</h2>
            <p className="mt-1 text-sm text-slate-300">{lead.phone}</p>
          </div>
          <button onClick={onClose} className="rounded-2xl bg-white/10 p-3 text-white ring-1 ring-white/15">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mx-auto mt-6 grid max-w-3xl gap-4">
          <a
            href={`tel:${lead.phone}`}
            className="inline-flex min-h-[58px] items-center justify-center gap-2 rounded-3xl bg-emerald-500 px-5 py-4 text-base font-bold text-white shadow-[0_20px_50px_rgba(16,185,129,0.28)]"
          >
            <PhoneCall className="h-5 w-5" />
            Call again
          </a>

          <div className="rounded-[2rem] bg-white p-4 text-slate-950 shadow-2xl">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <p className="text-sm font-semibold">What happened on the call?</p>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {outcomeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setOutcome(option.value)}
                  className={`rounded-2xl p-3 text-left ring-1 transition ${
                    outcome === option.value ? "bg-slate-950 text-white ring-slate-950" : "bg-slate-50 text-slate-700 ring-slate-200"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {outcome === option.value ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : null}
                    {option.label}
                  </span>
                  <span className={`mt-1 block text-xs ${outcome === option.value ? "text-slate-300" : "text-slate-500"}`}>{option.helper}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-4 text-slate-950 shadow-2xl">
            <div className="grid gap-3 sm:grid-cols-2">
              <Select value={duration} onChange={(event) => setDuration(event.target.value)}>
                <option value="">Call duration</option>
                <option value="<1 min">Under 1 min</option>
                <option value="1-3 min">1-3 min</option>
                <option value="3-7 min">3-7 min</option>
                <option value="7+ min">7+ min</option>
              </Select>
              {selectedOutcome.needsFollowUp ? (
                <Input type="datetime-local" value={followUpDate} onChange={(event) => setFollowUpDate(event.target.value)} />
              ) : null}
            </div>
            {selectedOutcome.needsFollowUp ? (
              <div className="mt-3 rounded-2xl bg-orange-50 p-3 text-sm text-orange-800 ring-1 ring-orange-200">
                <CalendarClock className="mr-2 inline h-4 w-4" />
                This will also create/update the reminder for this lead.
              </div>
            ) : null}
            <Textarea className="mt-3" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Quick notes: objection, budget, decision maker, next promise..." />
            {selectedOutcome.needsFollowUp ? (
              <Input className="mt-3" value={followUpNote} onChange={(event) => setFollowUpNote(event.target.value)} placeholder="Reminder note, e.g. send pricing before calling" />
            ) : null}
            <Button className="mt-4 w-full" onClick={saveCallUpdate} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save call update"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
