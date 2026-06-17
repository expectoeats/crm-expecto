"use client";

import {
  RiFireLine,
  RiStarFill,
  RiSnowflakeLine,
  RiCircleLine,
  RiPhoneLine,
  RiMessageLine,
  RiCheckboxCircleLine,
  RiThumbDownLine,
  RiCalendarLine,
  RiRefreshLine,
  RiSendPlaneLine,
  RiFlashlightLine,
  RiGlobeLine,
  RiTimeLine,
} from "react-icons/ri";
import { Badge } from "@/components/ui";
import { leadQualityStyles, statusConfig, websiteStatusLabels, cn } from "@/lib/ui";

const statusIcons: Record<string, React.ReactNode> = {
  new:            <RiCircleLine className="h-3 w-3" />,
  reached_out:    <RiPhoneLine className="h-3 w-3" />,
  in_talks:       <RiMessageLine className="h-3 w-3" />,
  interested:     <RiFireLine className="h-3 w-3" />,
  converted:      <RiCheckboxCircleLine className="h-3 w-3" />,
  not_interested: <RiThumbDownLine className="h-3 w-3" />,
  follow_up:      <RiCalendarLine className="h-3 w-3" />,
  called:         <RiPhoneLine className="h-3 w-3" />,
  callback:       <RiRefreshLine className="h-3 w-3" />,
  proposal_sent:  <RiSendPlaneLine className="h-3 w-3" />,
  closed_won:     <RiFlashlightLine className="h-3 w-3" />,
  closed_lost:    <RiThumbDownLine className="h-3 w-3" />,
};

export function StatusBadge({ status }: { status: string }) {
  const cfg  = statusConfig[status];
  const icon = statusIcons[status];
  if (!cfg) {
    return (
      <Badge className="bg-slate-100 text-slate-600 ring-slate-200">
        {status.replaceAll("_", " ")}
      </Badge>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
        cfg.className
      )}
    >
      {icon}
      {cfg.label}
    </span>
  );
}

const qualityIcons: Record<string, React.ReactNode> = {
  hot:  <RiFireLine className="h-3 w-3" />,
  warm: <RiStarFill className="h-3 w-3" />,
  cold: <RiSnowflakeLine className="h-3 w-3" />,
};

const qualityLabels: Record<string, string> = {
  hot:  "Hot",
  warm: "Warm",
  cold: "Cold",
};

export function LeadQualityBadge({ quality }: { quality: string }) {
  const cls  = leadQualityStyles[quality] ?? "bg-slate-100 text-slate-600 ring-slate-200";
  const icon = qualityIcons[quality];
  const lbl  = qualityLabels[quality] ?? quality.toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
        cls
      )}
    >
      {icon}
      {lbl}
    </span>
  );
}

export function WebsiteStatusBadge({ websiteStatus }: { websiteStatus: string }) {
  const cls =
    websiteStatus === "no_website"
      ? "bg-slate-100 text-slate-600 ring-slate-200"
      : websiteStatus === "website_is_bad"
        ? "bg-orange-100 text-orange-700 ring-orange-200"
        : "bg-emerald-100 text-emerald-700 ring-emerald-200";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset", cls)}>
      <RiGlobeLine className="h-3 w-3" />
      {websiteStatusLabels[websiteStatus] ?? websiteStatus}
    </span>
  );
}

export function TierBadge({ tier, label }: { tier?: string; label?: string }) {
  if (!tier) return null;
  const styles: Record<string, string> = {
    hot:  "bg-red-100 text-red-700 ring-red-300",
    warm: "bg-amber-100 text-amber-700 ring-amber-300",
    cold: "bg-slate-100 text-slate-500 ring-slate-200",
  };
  const icons: Record<string, React.ReactNode> = {
    hot:  <RiFireLine className="h-3 w-3" />,
    warm: <RiStarFill className="h-3 w-3" />,
    cold: <RiSnowflakeLine className="h-3 w-3" />,
  };
  const cls  = styles[tier] ?? "bg-slate-100 text-slate-500 ring-slate-200";
  const icon = icons[tier];
  const text = label ?? (tier === "hot" ? "Hot" : tier === "warm" ? "Warm" : "Cold");
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset", cls)}>
      {icon}
      {text}
    </span>
  );
}

export function NicheBadge({ niche }: { niche: string }) {
  const palette = [
    "bg-blue-100 text-blue-700 ring-blue-200",
    "bg-violet-100 text-violet-700 ring-violet-200",
    "bg-emerald-100 text-emerald-700 ring-emerald-200",
    "bg-orange-100 text-orange-700 ring-orange-200",
    "bg-rose-100 text-rose-700 ring-rose-200",
  ];
  const hash = niche.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset", palette[hash % palette.length])}>
      {niche}
    </span>
  );
}
