"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Suspense } from "react";
import { SkeletonCard } from "@/components/ui";
import { apiFetch } from "@/lib/http";
import { QuotationBuilder } from "@/components/quotation-builder";
import { QuotationPreview } from "@/components/quotation-preview";
import type { QuotationData } from "@/lib/quotation-types";
import { PAYMENT } from "@/lib/quotation-defaults";

const fetcher = async (path: string) =>
  (await apiFetch<{ quotation: QuotationData }>(path)).data?.quotation ?? null;

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function QuotationPageInner({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const isEdit = searchParams.get("edit") === "1";

  const { data: quotation, isLoading, mutate } = useSWR(
    id ? `/quotations/${id}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-500">Quotation not found.</p>
      </div>
    );
  }

  // Normalize dates from DB (ISO strings)
  const normalized: QuotationData = {
    ...quotation,
    date: quotation.date ? new Date(quotation.date as unknown as string).toISOString().slice(0, 10) : "",
    validTill: quotation.validTill ? new Date(quotation.validTill as unknown as string).toISOString().slice(0, 10) : "",
  };

  if (isEdit) {
    return <QuotationBuilder initial={normalized} onSaved={() => mutate()} />;
  }

  // View / Preview mode
  const upiDeepLink = (amount: number) =>
    `upi://pay?pa=${PAYMENT.upiId}&pn=${encodeURIComponent(PAYMENT.accountName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Quotation ${quotation.quotationNumber ?? ""} - ${quotation.clientName}`)}`;

  const waPhone = PAYMENT.mobile.replace(/\D/g, "");

  const getWaMsg = () =>
    encodeURIComponent(
      `Hello ${quotation.clientName || "there"},\n\nPlease find your quotation *${quotation.quotationNumber ?? ""}*.\n\nProject: ${quotation.projectType || "Custom"}\nTotal: ${fmt(quotation.grandTotal)}\n\nFor queries, feel free to reach out!`
    );

  const getMailtoLink = () => {
    const sub = encodeURIComponent(`Quotation ${quotation.quotationNumber ?? ""} — Expecto Digital`);
    const body = encodeURIComponent(`Dear ${quotation.clientName || "Sir/Madam"},\n\nPlease find your quotation attached.\n\nAmount: ${fmt(quotation.grandTotal)}\n\nRegards,\nExpecto Digital`);
    return `mailto:${quotation.clientEmail}?subject=${sub}&body=${body}`;
  };

  return (
    <QuotationPreview
      q={normalized}
      onBack={() => window.history.back()}
      onSave={async () => {
        await apiFetch(`/quotations/${id}`, { method: "PATCH", body: JSON.stringify({ status: "sent" }) });
        await mutate();
      }}
      saving={false}
      upiDeepLink={upiDeepLink}
      waMsg={getWaMsg()}
      waPhone={waPhone}
      mailtoLink={getMailtoLink()}
    />
  );
}

export default function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<div className="space-y-3 p-4"><SkeletonCard /><SkeletonCard /></div>}>
      <QuotationPageInner id={id} />
    </Suspense>
  );
}
