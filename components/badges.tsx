"use client";

import {
  CheckCircle, Flame, Globe, MessageCircle, Phone,
  PhoneCall, RefreshCw, Send, Star, ThumbsDown, X,
  Zap, Circle, Calendar, Clock,
} from "lucide-react";
import { Badge } from "@/components/ui";
import { leadQualityStyles, statusConfig, websiteStatusLabels, cn } from "@/lib/ui";

// Icon map for each status — no emojis
const statusIcons: Record<string, React.ReactNode> = {
  new:            <Circle className="h-3 w-3" />,
  reached_out:    <Phone className="h-3 w-3" />,
  in_talks:       <MessageCircle className="h-3 w-3" />,
  interested:     <Flame className="h-3 w-3" />,
  converted:      <CheckCircle className="h-3 w-3" />,
  not_interested: <X className="h-3 w-3" />,
  follow_up:      <Calendar className="h-3 w-3" />,
  called:         <PhoneCall className="h-3 w-3" />,
  callback:       <RefreshCw className="h-3 w-3" />,
  proposal_sent:  <Send className="h-3 w-3" />,
  closed_won:     <Zap className="h-3 w-3" />,
  closed_lost:    <ThumbsDown className="h-3 w-3" />,
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
  hot:  <Flame className="h-3 w-3" />,
  warm: <Star  className="h-3 w-3 fill-current" />,
  cold: <Clock className="h-3 w-3" />,
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
      <Globe className="h-3 w-3" />
      {websiteStatusLabels[websiteStatus] ?? websiteStatus}
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
