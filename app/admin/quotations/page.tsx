"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  RiAddLine, RiSearchLine, RiCloseLine, RiFileList3Line,
  RiFileCopyLine, RiDeleteBin6Line, RiEyeLine, RiEditLine,
  RiCheckboxCircleLine, RiTimeLine, RiDraftLine, RiSendPlaneLine,
} from "react-icons/ri";
import { Button, EmptyState, Input, SkeletonCard } from "@/components/ui";
import { apiFetch } from "@/lib/http";
import { cn } from "@/lib/ui";

type Quotation = {
  _id: string;
  quotationNumber: string;
  clientName: string;
  clientCompany: string;
  clientPhone: string;
  projectType: string;
  grandTotal: number;
  status: "draft" | "sent" | "accepted" | "rejected";
  createdAt: string;
  createdBy?: { name?: string };
};

type QuotationsResponse = {
  quotations: Quotation[];
  pagination: { page: number; pages: number; total: number };
};

const statusConfig: Record<string, { label: string; cls: string }> = {
  draft:    { label: "Draft",    cls: "bg-slate-100 text-slate-600 ring-slate-200" },
  sent:     { label: "Sent",     cls: "bg-blue-100 text-blue-700 ring-blue-200"   },
  accepted: { label: "Accepted", cls: "bg-emerald-100 text-emerald-700 ring-emerald-200" },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-700 ring-red-200"       },
};

const statusIcons = {
  draft:    <RiDraftLine className="h-3 w-3" />,
  sent:     <RiSendPlaneLine className="h-3 w-3" />,
  accepted: <RiCheckboxCircleLine className="h-3 w-3" />,
  rejected: <RiCloseLine className="h-3 w-3" />,
};

const fetcher = async (url: string) =>
  (await apiFetch<QuotationsResponse>(url)).data ?? { quotations: [], pagination: { page: 1, pages: 1, total: 0 } };

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function QuotationsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);

  const key = `/quotations?page=${page}&limit=20&status=${statusFilter}&search=${encodeURIComponent(debouncedSearch)}`;
  const { data, isLoading, mutate } = useSWR(key, fetcher, { revalidateOnFocus: false });

  const quotations = data?.quotations ?? [];
  const pagination = data?.pagination;

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
    setTimeout(() => setDebouncedSearch(v), 300);
  }

  async function handleDuplicate(id: string) {
    setDuplicating(id);
    try {
      const res = await apiFetch<{ quotation: Quotation }>(`/quotations/${id}/duplicate`, { method: "POST" });
      await mutate();
      if (res.data?.quotation?._id) {
        window.location.href = `/admin/quotations/${res.data.quotation._id}`;
      }
    } finally {
      setDuplicating(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await apiFetch(`/quotations/${id}`, { method: "DELETE" });
      await mutate();
    } finally {
      setDeleting(null);
    }
  }

  const statFilters = [
    { key: "",         label: "All" },
    { key: "draft",    label: "Draft" },
    { key: "sent",     label: "Sent" },
    { key: "accepted", label: "Accepted" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Manage</p>
          <h1 className="text-xl font-bold text-slate-950">Quotations</h1>
        </div>
        <Link href="/admin/quotations/new">
          <Button className="h-10 gap-2 px-4">
            <RiAddLine className="h-4 w-4" />
            New Quotation
          </Button>
        </Link>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {statFilters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => { setStatusFilter(f.key); setPage(1); }}
            className={cn(
              "shrink-0 rounded-2xl px-4 py-2 text-xs font-bold transition",
              statusFilter === f.key
                ? "bg-slate-950 text-white shadow-sm"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <RiSearchLine className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by name, phone, or quotation number…"
          className="pl-11"
        />
        {search ? (
          <button
            type="button"
            onClick={() => { setSearch(""); setDebouncedSearch(""); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <RiCloseLine className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* Count */}
      {!isLoading && (
        <p className="text-xs text-slate-400 px-1">
          {pagination?.total ?? 0} quotation{(pagination?.total ?? 0) !== 1 ? "s" : ""}
        </p>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : quotations.length === 0 ? (
        <EmptyState
          title="No quotations yet"
          description="Create your first quotation to get started."
          action={
            <Link href="/admin/quotations/new">
              <Button><RiAddLine className="h-4 w-4" />Create Quotation</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {quotations.map((q) => {
            const sc = statusConfig[q.status] ?? statusConfig.draft;
            const si = statusIcons[q.status] ?? statusIcons.draft;
            return (
              <div key={q._id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm">
                {/* Status accent */}
                <div className={cn(
                  "h-1 w-full",
                  q.status === "accepted" ? "bg-emerald-400"
                    : q.status === "sent" ? "bg-blue-400"
                    : q.status === "rejected" ? "bg-red-400"
                    : "bg-slate-200"
                )} />
                <div className="p-4 space-y-3">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{q.quotationNumber}</p>
                      <p className="mt-0.5 truncate text-[15px] font-bold text-slate-950">
                        {q.clientName || q.clientCompany || "—"}
                      </p>
                      {q.clientPhone ? <p className="text-xs text-slate-500">{q.clientPhone}</p> : null}
                    </div>
                    <span className={cn("inline-flex items-center gap-1 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset", sc.cls)}>
                      {si}
                      {sc.label}
                    </span>
                  </div>

                  {/* Project + Amount */}
                  <div className="flex items-center justify-between">
                    {q.projectType ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-200">
                        <RiFileList3Line className="h-3 w-3" />
                        {q.projectType}
                      </span>
                    ) : <span />}
                    <span className="text-lg font-bold text-slate-950">{formatCurrency(q.grandTotal)}</span>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <RiTimeLine className="h-3 w-3" />
                      {formatDate(q.createdAt)}
                    </span>
                    {q.createdBy?.name ? <span>By {q.createdBy.name}</span> : null}
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-100">
                    <Link
                      href={`/admin/quotations/${q._id}`}
                      className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-xl bg-violet-600 text-xs font-semibold text-white transition hover:bg-violet-700"
                    >
                      <RiEyeLine className="h-3.5 w-3.5" />
                      View
                    </Link>
                    <Link
                      href={`/admin/quotations/${q._id}?edit=1`}
                      className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                    >
                      <RiEditLine className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(q._id)}
                      disabled={duplicating === q._id}
                      className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
                    >
                      <RiFileCopyLine className="h-3.5 w-3.5" />
                      {duplicating === q._id ? "…" : "Copy"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(q._id)}
                      disabled={deleting === q._id}
                      className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-xl bg-red-50 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      <RiDeleteBin6Line className="h-3.5 w-3.5" />
                      {deleting === q._id ? "…" : "Del"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 ? (
        <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-40"
          >
            ← Prev
          </button>
          <p className="text-sm font-bold text-slate-950">{page} / {pagination.pages}</p>
          <button
            type="button"
            disabled={page >= pagination.pages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      ) : null}
    </div>
  );
}
