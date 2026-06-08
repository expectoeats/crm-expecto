"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, MessageCircle, PhoneCall, X } from "lucide-react";
import { apiFetch } from "@/lib/http";

const QUICK_CHIPS = [
  { label: "Not picked up", note: "Not picked up" },
  { label: "Will call back", note: "Will call back" },
  { label: "Interested ✅", note: "Interested, wants to know more" },
  { label: "Not interested ❌", note: "Not interested" },
];

export function QuickNoteToast({
  leadId,
  leadName,
  via,
  historyEntryId,
  onClose,
  onSaved,
}: {
  leadId: string;
  leadName: string;
  via: "call" | "whatsapp";
  historyEntryId?: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpDays, setFollowUpDays] = useState("1");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input after 100ms so it doesn't conflict with the tap
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  async function saveNote() {
    if (!note.trim()) { onClose(); return; }
    setSaving(true);
    try {
      if (historyEntryId) {
        await apiFetch(`/leads/${leadId}/note`, {
          method: "PATCH",
          body: JSON.stringify({ history_entry_id: historyEntryId, note: note.trim() }),
        });
      }
      if (showFollowUp) {
        const d = new Date();
        d.setDate(d.getDate() + parseInt(followUpDays, 10));
        await apiFetch(`/leads/${leadId}/followup`, {
          method: "PATCH",
          body: JSON.stringify({ followUpDate: d.toISOString(), followUpNote: note.trim() }),
        });
      }
      onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function selectChip(chipNote: string) {
    setNote(chipNote);
    if (chipNote.toLowerCase().includes("call back") || chipNote.toLowerCase().includes("follow")) {
      setShowFollowUp(true);
    }
  }

  return (
    <div
      className="fixed bottom-24 right-4 z-[60] w-[calc(100vw-2rem)] max-w-sm rounded-2xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.18)] ring-1 ring-slate-200"
      style={{ animation: "slideUpToast 0.2s ease-out" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-2xl bg-slate-950 px-4 py-3">
        <div className="flex items-center gap-2 text-white">
          {via === "whatsapp" ? <MessageCircle className="h-4 w-4 text-[#25D366]" /> : <PhoneCall className="h-4 w-4 text-emerald-400" />}
          <span className="text-sm font-semibold">Add a quick note</span>
          <span className="text-xs text-white/50">· {leadName}</span>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 text-white/60 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 p-4">
        {/* Quick chips */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => selectChip(chip.note)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                note === chip.note
                  ? "bg-slate-950 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Custom note input */}
        <input
          ref={inputRef}
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && saveNote()}
          placeholder="Type a note..."
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
        />

        {/* Follow-up toggle */}
        <button
          type="button"
          onClick={() => setShowFollowUp((v) => !v)}
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
            showFollowUp ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600"
          }`}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Follow up in...
        </button>

        {showFollowUp ? (
          <div className="flex items-center gap-2 rounded-xl bg-orange-50 p-3 ring-1 ring-orange-100">
            <CalendarDays className="h-4 w-4 text-orange-500" />
            <span className="text-sm text-orange-800">Follow up in</span>
            <select
              value={followUpDays}
              onChange={(e) => setFollowUpDays(e.target.value)}
              className="rounded-lg border border-orange-200 bg-white px-2 py-1 text-sm"
            >
              {["1", "2", "3", "5", "7", "14", "30"].map((d) => (
                <option key={d} value={d}>{d} day{d !== "1" ? "s" : ""}</option>
              ))}
            </select>
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-600"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={saveNote}
            disabled={saving}
            className="flex-1 rounded-xl bg-slate-950 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Note"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUpToast {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
