"use client";

import { useRouter } from "next/navigation";
import { QuotationBuilder } from "@/components/quotation-builder";
import type { QuotationData } from "@/components/quotation-builder";

export default function NewQuotationPage() {
  const router = useRouter();

  function handleSaved(q: QuotationData) {
    if (q._id) {
      router.replace(`/admin/quotations/${q._id}`);
    }
  }

  return <QuotationBuilder onSaved={handleSaved} />;
}
