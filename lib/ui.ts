export function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

export const statusStyles: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 ring-blue-200",
  called: "bg-purple-100 text-purple-800 ring-purple-200",
  interested: "bg-amber-100 text-amber-800 ring-amber-200",
  callback: "bg-orange-100 text-orange-800 ring-orange-200",
  proposal_sent: "bg-teal-100 text-teal-800 ring-teal-200",
  closed_won: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  closed_lost: "bg-red-100 text-red-800 ring-red-200",
  not_interested: "bg-slate-100 text-slate-700 ring-slate-200",
};

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

