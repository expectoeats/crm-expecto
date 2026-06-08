"use client";

import { Badge } from "@/components/ui";
import { leadQualityStyles, statusConfig, websiteStatusLabels } from "@/lib/ui";

export function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status];
  if (cfg) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${cfg.className}`}>
        {cfg.emoji} {cfg.label}
      </span>
    );
  }
  return <Badge className="bg-slate-100 text-slate-700 ring-slate-200">{status.replaceAll("_", " ")}</Badge>;
}

export function LeadQualityBadge({ quality }: { quality: string }) {
  const styles: Record<string, { className: string; label: string }> = {
    hot:  { className: "bg-red-100 text-red-800 ring-red-200",     label: "🔥 HOT"  },
    warm: { className: "bg-amber-100 text-amber-800 ring-amber-200", label: "☀️ WARM" },
    cold: { className: "bg-sky-100 text-sky-800 ring-sky-200",      label: "❄️ COLD" },
  };
  const cfg = styles[quality];
  return (
    <Badge className={cfg?.className ?? "bg-slate-100 text-slate-700 ring-slate-200"}>
      {cfg?.label ?? quality.toUpperCase()}
    </Badge>
  );
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
