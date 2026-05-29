"use client";

import { Badge } from "@/components/ui";
import { leadQualityStyles, statusStyles, websiteStatusLabels } from "@/lib/ui";

export function StatusBadge({ status }: { status: string }) {
  return <Badge className={statusStyles[status] ?? "bg-slate-100 text-slate-700 ring-slate-200"}>{status.replaceAll("_", " ")}</Badge>;
}

export function LeadQualityBadge({ quality }: { quality: string }) {
  return <Badge className={leadQualityStyles[quality] ?? "bg-slate-100 text-slate-700 ring-slate-200"}>{quality.toUpperCase()}</Badge>;
}

export function WebsiteStatusBadge({ websiteStatus }: { websiteStatus: string }) {
  const className =
    websiteStatus === "no_website"
      ? "bg-slate-100 text-slate-700 ring-slate-200"
      : websiteStatus === "website_is_bad"
        ? "bg-orange-100 text-orange-800 ring-orange-200"
        : "bg-emerald-100 text-emerald-800 ring-emerald-200";

  return <Badge className={className}>{websiteStatusLabels[websiteStatus] ?? websiteStatus}</Badge>;
}

export function NicheBadge({ niche }: { niche: string }) {
  const palette = [
    "bg-blue-100 text-blue-800 ring-blue-200",
    "bg-violet-100 text-violet-800 ring-violet-200",
    "bg-emerald-100 text-emerald-800 ring-emerald-200",
    "bg-orange-100 text-orange-800 ring-orange-200",
    "bg-rose-100 text-rose-800 ring-rose-200",
  ];
  const hash = niche.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return <Badge className={palette[hash % palette.length]}>{niche}</Badge>;
}

