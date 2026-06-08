export function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

// New enhanced status system
export const statusConfig: Record<string, { label: string; emoji: string; className: string }> = {
  new:            { label: "New",           emoji: "🔵", className: "bg-slate-100 text-slate-700 ring-slate-200" },
  reached_out:    { label: "Reached Out",   emoji: "📞", className: "bg-blue-100 text-blue-800 ring-blue-200" },
  in_talks:       { label: "In Talks",      emoji: "💬", className: "bg-yellow-100 text-yellow-800 ring-yellow-200" },
  interested:     { label: "Interested 🔥", emoji: "🔥", className: "bg-orange-100 text-orange-800 ring-orange-200" },
  converted:      { label: "Converted ✅",  emoji: "✅", className: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
  not_interested: { label: "Not Interested","emoji": "❌", className: "bg-red-100 text-red-800 ring-red-200" },
  follow_up:      { label: "Follow Up 📅",  emoji: "📅", className: "bg-purple-100 text-purple-800 ring-purple-200" },
  // Legacy statuses — keep for backward compat
  called:         { label: "Called",        emoji: "📞", className: "bg-blue-100 text-blue-800 ring-blue-200" },
  callback:       { label: "Callback",      emoji: "🔄", className: "bg-orange-100 text-orange-800 ring-orange-200" },
  proposal_sent:  { label: "Proposal Sent", emoji: "📋", className: "bg-teal-100 text-teal-800 ring-teal-200" },
  closed_won:     { label: "Closed Won",    emoji: "🏆", className: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
  closed_lost:    { label: "Closed Lost",   emoji: "💔", className: "bg-red-100 text-red-800 ring-red-200" },
};

export const statusStyles: Record<string, string> = Object.fromEntries(
  Object.entries(statusConfig).map(([k, v]) => [k, v.className])
);

export const statusLabel = (status: string) => statusConfig[status]?.label ?? status.replaceAll("_", " ");
export const statusEmoji = (status: string) => statusConfig[status]?.emoji ?? "•";

export const ACTIVE_STATUSES = ["new", "follow_up"];
export const CONTACTED_STATUSES = [
  "reached_out", "in_talks", "interested", "converted",
  "not_interested", "called", "callback", "proposal_sent",
  "closed_won", "closed_lost",
];

export const ALL_STATUSES = [
  { value: "new",            label: "New" },
  { value: "reached_out",    label: "Reached Out" },
  { value: "in_talks",       label: "In Talks" },
  { value: "interested",     label: "Interested 🔥" },
  { value: "follow_up",      label: "Follow Up 📅" },
  { value: "converted",      label: "Converted ✅" },
  { value: "not_interested", label: "Not Interested" },
];

export const leadQualityStyles: Record<string, string> = {
  hot: "bg-red-100 text-red-800 ring-red-200",
  warm: "bg-amber-100 text-amber-800 ring-amber-200",
  cold: "bg-sky-100 text-sky-800 ring-sky-200",
};

export const websiteStatusLabels: Record<string, string> = {
  no_website: "No Website",
  has_website: "Has Website",
  website_is_bad: "Website Is Bad",
};
