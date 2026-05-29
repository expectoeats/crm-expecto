"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import useSWR from "swr";
import { LogOut, House, ListChecks } from "lucide-react";
import { Button } from "@/components/ui";
import { apiFetch } from "@/lib/http";
import { cn } from "@/lib/ui";
import { BrandMark } from "@/components/brand-mark";

const navItems = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/leads", label: "Leads", icon: ListChecks },
];

const fetcher = async () => (await apiFetch<{ user: { name: string; role: string } }>("/auth/me")).data?.user;

export function EmployeeShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useSWR("employee-me", fetcher);

  async function handleLogout() {
    await apiFetch("/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/82 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <BrandMark size="sm" />
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">Expecto CRM</p>
            <p className="text-lg font-semibold text-slate-950">Hi, {user?.name ?? "..."}</p>
          </div>
          <Button variant="secondary" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-5 pb-28">{children}</div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t border-slate-200 bg-white/96 px-3 py-2 backdrop-blur">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition",
                active ? "bg-slate-950 text-white" : "text-slate-600"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
