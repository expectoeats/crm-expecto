"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button, Card, Input } from "@/components/ui";
import { apiFetch } from "@/lib/http";
import { BrandMark } from "@/components/brand-mark";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
          </form>
        </Card>
      </div>
    </div>
  );
}
