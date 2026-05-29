"use client";

import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/ui";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass-panel rounded-3xl p-4 sm:p-6", className)} {...props} />;
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{eyebrow}</p> : null}
        <h2 className="mt-1 text-lg font-semibold text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Badge({
  className,
  children,
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset", className)}>
      {children}
    </span>
  );
}

const buttonStyles = {
  primary: "bg-slate-950 text-white hover:bg-slate-800",
  secondary: "bg-white text-slate-950 ring-1 ring-slate-200 hover:bg-slate-50",
  accent: "bg-orange-500 text-white hover:bg-orange-600",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
} as const;

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonStyles }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition active:scale-[0.98]",
        buttonStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-200/60",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-200/60",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/60",
        className
      )}
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="glass-panel animate-pulse rounded-3xl p-4">
      <div className="h-4 w-24 rounded-full bg-slate-200" />
      <div className="mt-4 h-5 w-3/4 rounded-full bg-slate-200" />
      <div className="mt-2 h-4 w-full rounded-full bg-slate-200" />
      <div className="mt-2 h-4 w-5/6 rounded-full bg-slate-200" />
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="text-center">
      <p className="text-base font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </Card>
  );
}
