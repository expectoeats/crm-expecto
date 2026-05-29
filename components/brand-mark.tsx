import Image from "next/image";
import { cn } from "@/lib/ui";

type BrandMarkProps = {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
  textClassName?: string;
};

const sizeMap = {
  sm: "h-10 w-10",
  md: "h-12 w-12",
  lg: "h-16 w-16",
} as const;

export function BrandMark({ size = "md", showText = false, className, textClassName }: BrandMarkProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("relative overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-white/10", sizeMap[size])}>
        <Image src="/img/logo.png" alt="Expecto logo" fill className="object-cover" priority />
      </div>
      {showText ? (
        <div className={cn("leading-tight", textClassName)}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">Expecto CRM</p>
          <p className="text-lg font-semibold text-slate-950">CRM suite</p>
        </div>
      ) : null}
    </div>
  );
}
