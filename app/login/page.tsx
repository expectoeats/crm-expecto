"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, X } from "lucide-react";
import { Button, Card, Input } from "@/components/ui";
import { apiFetch } from "@/lib/http";
import { BrandMark } from "@/components/brand-mark";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await apiFetch<{ user: { role: "admin" | "employee" } }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const role = response.data?.user.role;
      router.replace(role === "admin" ? "/admin/dashboard" : "/dashboard");
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setForgotLoading(true);
    setForgotMessage("");
    setForgotError("");

    try {
      const response = await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: forgotEmail }),
      });
      setForgotMessage(response.message ?? "Request sent to admin.");
    } catch (forgotPasswordError) {
      setForgotError(forgotPasswordError instanceof Error ? forgotPasswordError.message : "Unable to send request");
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.14),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.11),_transparent_24%)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex items-center justify-center">
          <BrandMark size="lg" />
        </div>

        <Card className="space-y-5 border-slate-200/80 bg-white/92 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Expecto CRM</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-600">Manage leads, follow-ups, and team performance from one place.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@agency.com" required />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
              <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" required />
            </div>

            {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

            <Button type="submit" className="h-12 w-full" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" className="h-11 w-full" onClick={() => {
              setForgotEmail(email);
              setForgotMessage("");
              setForgotError("");
              setShowForgotPassword(true);
            }}>
              <KeyRound className="h-4 w-4" />
              Forgot password
            </Button>
          </form>
        </Card>
      </div>

      {showForgotPassword ? (
        <div className="fixed inset-0 z-40 flex items-end bg-slate-950/40 sm:items-center sm:justify-center">
          <div className="w-full rounded-t-[28px] bg-white p-4 shadow-2xl sm:max-w-md sm:rounded-[28px]">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Forgot password</h2>
                <p className="mt-1 text-sm text-slate-600">Admin ko reset request bhej di jayegi.</p>
              </div>
              <Button variant="ghost" onClick={() => setShowForgotPassword(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form className="mt-4 space-y-3" onSubmit={handleForgotPassword}>
              <Input type="email" placeholder="Employee email" value={forgotEmail} onChange={(event) => setForgotEmail(event.target.value)} required />
              {forgotError ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{forgotError}</p> : null}
              {forgotMessage ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{forgotMessage}</p> : null}
              <Button className="w-full" type="submit" disabled={forgotLoading}>
                {forgotLoading ? "Sending..." : "Send request"}
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
