"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import type { ReactNode } from "react";
import useSWR from "swr";
import { KeyRound, LogOut, House, ListChecks, X } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { apiFetch } from "@/lib/http";
import { cn } from "@/lib/ui";
import { BrandMark } from "@/components/brand-mark";
import { InstallAppButton } from "@/components/install-app-button";

const navItems = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/leads", label: "Leads", icon: ListChecks },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const fetcher = async () => (await apiFetch<{ user: { name: string; role: string } }>("/auth/me")).data?.user;

export function EmployeeShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useSWR("employee-me", fetcher);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  async function handleLogout() {
    await apiFetch("/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New password and confirm password do not match");
      return;
    }

    setPasswordLoading(true);

    try {
      const response = await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordMessage(response.message ?? "Password updated successfully");
    } catch (changePasswordError) {
      setPasswordError(changePasswordError instanceof Error ? changePasswordError.message : "Unable to update password");
    } finally {
      setPasswordLoading(false);
    }
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
          <div className="flex items-center gap-2">
            <InstallAppButton compact />
            <Button variant="secondary" onClick={() => setShowPasswordModal(true)}>
              <KeyRound className="h-4 w-4" />
            </Button>
            <Button variant="secondary" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-5 pb-28">{children}</div>

      {showPasswordModal ? (
        <div className="fixed inset-0 z-40 flex items-end bg-slate-950/40 sm:items-center sm:justify-center">
          <div className="w-full rounded-t-[28px] bg-white p-4 shadow-2xl sm:max-w-md sm:rounded-[28px]">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Change password</h2>
                <p className="mt-1 text-sm text-slate-600">Current password daal kar naya password set karein.</p>
              </div>
              <Button variant="ghost" onClick={() => setShowPasswordModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form className="mt-4 space-y-3" onSubmit={handleChangePassword}>
              <Input
                type="password"
                placeholder="Current password"
                value={passwordForm.currentPassword}
                onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                required
              />
              <Input
                type="password"
                placeholder="New password"
                value={passwordForm.newPassword}
                onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                required
              />
              <Input
                type="password"
                placeholder="Confirm new password"
                value={passwordForm.confirmPassword}
                onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                required
              />
              {passwordError ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{passwordError}</p> : null}
              {passwordMessage ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{passwordMessage}</p> : null}
              <Button className="w-full" type="submit" disabled={passwordLoading}>
                {passwordLoading ? "Updating..." : "Update password"}
              </Button>
            </form>
          </div>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t border-slate-200 bg-white/96 px-3 py-2 backdrop-blur">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition",
                active ? "bg-slate-100 text-slate-950 ring-1 ring-slate-200" : "text-slate-600"
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
