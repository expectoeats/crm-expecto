"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import useSWR from "swr";
import { LayoutDashboard, LogOut, Users, PlusCircle, ListChecks } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { apiFetch } from "@/lib/http";
import { cn } from "@/lib/ui";
import { BrandMark } from "@/components/brand-mark";
import { InstallAppButton } from "@/components/install-app-button";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/leads", label: "Leads", icon: ListChecks },
  { href: "/admin/leads/new", label: "Add Lead", icon: PlusCircle },
  { href: "/admin/employees", label: "Employees", icon: Users },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const fetcher = async () => (await apiFetch<{ user: { name: string; role: string } }>("/auth/me")).data?.user;

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useSWR("admin-me", fetcher);

  async function handleLogout() {
    await apiFetch("/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200/70 bg-white/88 px-5 py-6 backdrop-blur xl:flex xl:flex-col">
        <BrandMark showText className="mb-6" />
        <div className="rounded-[1.75rem] bg-slate-950 px-4 py-4 text-white shadow-[0_24px_50px_rgba(15,23,42,0.18)]">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/55">Admin Console</p>
          <h1 className="mt-2 text-xl font-semibold">Control center</h1>
          <p className="mt-2 text-sm leading-6 text-white/70">Track leads, assign work, and keep sales movement visible.</p>
        </div>

        <nav className="mt-8 space-y-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                  active ? "bg-slate-100 text-slate-950 ring-1 ring-slate-200" : "text-slate-700 hover:bg-slate-100"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <Card className="mt-auto border-slate-200/80 bg-white/95">
          <p className="text-sm font-semibold text-slate-950">Signed in as</p>
          <p className="mt-1 text-sm text-slate-600">{user?.name ?? "Loading..."}</p>
          <div className="mt-4">
            <InstallAppButton />
          </div>
          <Button className="mt-4 w-full" variant="secondary" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </Card>
      </aside>

      <main className="min-h-screen xl:pl-72">
        <div className="border-b border-slate-200/70 bg-white/78 px-4 py-4 backdrop-blur xl:hidden">
          <div className="flex items-center justify-between">
            <BrandMark size="sm" />
            <div className="flex items-center gap-2">
              <InstallAppButton compact />
              <Button variant="secondary" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="px-4 py-5 pb-28 xl:px-8">{children}</div>

        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white/96 px-2 py-2 backdrop-blur xl:hidden">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[11px] font-semibold transition",
                  active ? "bg-slate-100 text-slate-950 ring-1 ring-slate-200" : "text-slate-500"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
